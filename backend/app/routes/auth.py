from fastapi import APIRouter, Request, Response
from fastapi.responses import RedirectResponse, HTMLResponse, JSONResponse
from authlib.integrations.starlette_client import OAuth
from app.config import (
    THAID_CLIENT_ID,
    THAID_CLIENT_SECRET,
    THAID_WELL_KNOWN_URL,
    FRONTEND_URL,
    JWT_SECRET_KEY,
    THAID_API_KEY,
    THAID_CALLBACK_ENDPOINT,
    CPPM_HOST,
    CPPM_CLIENT_ID,
    CPPM_CLIENT_SECRET,
    CPPM_LOGIN_URL,
    FORTIGATE_IP,
    FORTIGATE_AUTH_PORT,
    FORTIGATE_AUTH_PATH,
    QR_SESSION_TTL_SECONDS,
)
import jwt
import uuid
import time
import json
import logging
import httpx
from datetime import datetime, timedelta, timezone
from urllib.parse import urlencode, quote

logger = logging.getLogger("thaid-auth")

router = APIRouter()
oauth = OAuth()

# ถ้ามี API Key จะส่งไปใน header ของ request ด้วยเผื่อ DTAM Gateway หรือ BORA ต้องการ
client_kwargs = {
    'scope': 'openid pid title title_en given_name_en family_name_en name name_en',
    'token_endpoint_auth_method': 'client_secret_post'
}
if THAID_API_KEY:
    client_kwargs['headers'] = {'x-api-key': THAID_API_KEY}

oauth.register(
    name='thaid',
    server_metadata_url=THAID_WELL_KNOWN_URL,
    client_id=THAID_CLIENT_ID,
    client_secret=THAID_CLIENT_SECRET,
    client_kwargs=client_kwargs
)

# ============================================================
# Helper: JWT Token
# ============================================================
def create_jwt_token(data: dict):
    """Generate an internal JWT for session management."""
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(hours=2)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, JWT_SECRET_KEY, algorithm="HS256")


# ============================================================
# Helper: Build ThaiD Authorization URL (for QR Code)
# ============================================================
def build_thaid_auth_url(state_payload: dict) -> str:
    """
    สร้าง ThaiD OAuth2 Authorization URL สำหรับ QR Code
    ใช้ v1 ตามมาตรฐาน BORA/DTAM Production
    state จะเก็บ session_id และ captive portal parameters
    """
    callback_uri = THAID_CALLBACK_ENDPOINT or ""
    # Scope ที่รองรับโดย ThaiD (ตาม Official Sample ของ BORA)
    scope = "openid pid name name_en given_name_en family_name_en title title_en"
    state = quote(json.dumps(state_payload, ensure_ascii=False))

    # ใช้ v1 ตาม BORA/DTAM Production (standalone_portal.html และ main.py เดิม)
    base_url = "https://imauth.bora.dopa.go.th/api/v1/oauth2/auth"
    params = {
        "response_type": "code",
        "client_id": THAID_CLIENT_ID,
        "redirect_uri": callback_uri,
        "scope": scope,
        "state": state,
    }
    return f"{base_url}?{urlencode(params, quote_via=quote)}"


# ============================================================
# Helper: ClearPass Guest Account
# ============================================================
async def create_cppm_user(pid: str):
    """Create a guest account in Aruba ClearPass using the PID as username."""
    if not CPPM_HOST or not CPPM_CLIENT_ID:
        logger.warning("ClearPass configuration missing. Skipping user creation.")
        return False

    try:
        async with httpx.AsyncClient(verify=False) as client:
            token_url = f"https://{CPPM_HOST}/api/oauth"
            token_data = {
                "grant_type": "client_credentials",
                "client_id": CPPM_CLIENT_ID,
                "client_secret": CPPM_CLIENT_SECRET
            }
            token_res = await client.post(token_url, data=token_data)
            token_res.raise_for_status()
            access_token = token_res.json().get("access_token")

            user_url = f"https://{CPPM_HOST}/api/guest"
            user_payload = {
                "enabled": True,
                "username": pid,
                "password": pid,
                "visitor_name": f"ThaiD User {pid}",
                "expire_after": 480,
                "role_id": 2
            }
            headers = {"Authorization": f"Bearer {access_token}"}
            user_res = await client.post(user_url, json=user_payload, headers=headers)

            if user_res.status_code in [201, 200, 409]:
                logger.info(f"ClearPass user {pid} created or already exists.")
                return True
            else:
                logger.error(f"ClearPass User Creation Failed: {user_res.text}")
                return False
    except Exception as e:
        logger.error(f"Error connecting to ClearPass: {str(e)}")
        return False


# ============================================================
# Helper: Cleanup expired QR sessions
# ============================================================
def cleanup_expired_sessions(qr_sessions: dict):
    """ลบ session ที่หมดอายุแล้ว"""
    now = time.time()
    expired_keys = [
        k for k, v in qr_sessions.items()
        if now - v.get("created_at", 0) > QR_SESSION_TTL_SECONDS + 60
    ]
    for k in expired_keys:
        del qr_sessions[k]


# ============================================================
# ENDPOINT: GET /api/auth/qr-session
# สร้าง QR Session และ return URL สำหรับสร้าง QR Code
# ============================================================
@router.get("/qr-session")
async def create_qr_session(
    request: Request,
    mac: str = None,
    ip: str = None,
    url: str = None,
    magic: str = None,
    fw_ip: str = None,
):
    """
    สร้าง QR Session ใหม่
    - รับ Captive Portal parameters จาก FortiGate
    - Return session_id และ ThaiD Authorization URL สำหรับสร้าง QR Code
    """
    qr_sessions = request.app.state.qr_sessions
    cleanup_expired_sessions(qr_sessions)

    session_id = str(uuid.uuid4())
    now = time.time()

    # Captive portal params จาก FortiGate query string
    # FortiGate ส่ง: ?magic=XXXX&type=fw&user=&ip=CLIENT_IP&mac=CLIENT_MAC&url=ORIGINAL_URL
    effective_fw_ip = fw_ip or FORTIGATE_IP

    # State payload ที่จะส่งไปกับ ThaiD OAuth และจะกลับมาใน callback
    state_payload = {
        "sid": session_id,          # QR Session ID
        "mac": mac or "",
        "ip": ip or "",
        "url": url or "",
        "magic": magic or "",
        "fw_ip": effective_fw_ip,
    }

    # บันทึก session
    qr_sessions[session_id] = {
        "status": "pending",
        "mac": mac or "",
        "ip": ip or "",
        "original_url": url or "",
        "magic": magic or "",
        "fw_ip": effective_fw_ip,
        "user_info": None,
        "created_at": now,
    }

    # สร้าง ThaiD URL สำหรับ QR Code
    thaid_url = build_thaid_auth_url(state_payload)

    expires_in = QR_SESSION_TTL_SECONDS
    return JSONResponse({
        "session_id": session_id,
        "thaid_url": thaid_url,         # URL นี้นำไปสร้าง QR Code
        "expires_in": expires_in,        # วินาที
        "fw_ip": effective_fw_ip,
    })


# ============================================================
# ENDPOINT: GET /api/auth/qr-status/{session_id}
# Frontend Polling เช็คสถานะว่า User scan QR แล้วหรือยัง
# ============================================================
@router.get("/qr-status/{session_id}")
async def get_qr_status(session_id: str, request: Request):
    """
    ให้ Frontend poll สถานะของ QR Session
    - pending: รอ user สแกน QR
    - success: ยืนยันตัวตนสำเร็จ พร้อม magic token และ fw_ip
    - expired: QR หมดอายุ
    - error: เกิดข้อผิดพลาด
    """
    qr_sessions = request.app.state.qr_sessions
    session = qr_sessions.get(session_id)

    if not session:
        return JSONResponse({"status": "expired"}, status_code=404)

    # ตรวจสอบว่า session หมดอายุหรือยัง
    elapsed = time.time() - session.get("created_at", 0)
    if elapsed > QR_SESSION_TTL_SECONDS and session["status"] == "pending":
        session["status"] = "expired"
        return JSONResponse({"status": "expired"})

    response_data = {
        "status": session["status"],
        "elapsed": int(elapsed),
        "expires_in": max(0, QR_SESSION_TTL_SECONDS - int(elapsed)),
    }

    if session["status"] == "success":
        response_data.update({
            "magic": session.get("magic", ""),
            "fw_ip": session.get("fw_ip", FORTIGATE_IP),
            "fw_port": FORTIGATE_AUTH_PORT,
            "fw_path": FORTIGATE_AUTH_PATH,
            "user_info": session.get("user_info"),
        })

    return JSONResponse(response_data)


# ============================================================
# ENDPOINT: GET /api/auth/login
# เส้นทางเดิมสำหรับ redirect-based login (ยังใช้ได้อยู่)
# ============================================================
@router.get("/login")
async def login(request: Request, mac: str = None, ip: str = None, url: str = None, magic: str = None, fw_ip: str = None):
    """Initiate the ThaID OAuth2 Login Flow. Supports Captive Portal parameters."""
    if mac: request.session['guest_mac'] = mac
    if ip: request.session['guest_ip'] = ip
    if url: request.session['original_url'] = url
    if magic: request.session['fortigate_magic'] = magic
    if fw_ip: request.session['fortigate_ip'] = fw_ip

    redirect_uri = THAID_CALLBACK_ENDPOINT if THAID_CALLBACK_ENDPOINT else str(request.url_for('auth_callback'))

    if THAID_CALLBACK_ENDPOINT and THAID_CALLBACK_ENDPOINT.startswith("https://"):
        redirect_uri = redirect_uri.replace("http://", "https://", 1)

    logger.info(f"Initiating login with redirect_uri: {redirect_uri}")
    return await oauth.thaid.authorize_redirect(request, redirect_uri)


# ============================================================
# ENDPOINT: GET /api/auth/callback
# ThaiD จะ Redirect กลับมาที่นี่หลัง User สแกน QR
# ============================================================
@router.get("/callback")
async def auth_callback(request: Request, response: Response):
    """
    Handle the callback after successful ThaID login.
    รองรับทั้ง QR Flow (state มี session_id) และ redirect flow (session)
    """
    try:
        redirect_uri = THAID_CALLBACK_ENDPOINT if THAID_CALLBACK_ENDPOINT else str(request.url_for('auth_callback'))
        if redirect_uri.startswith("http://") and "dtam.moph.go.th" in redirect_uri:
            redirect_uri = redirect_uri.replace("http://", "https://", 1)

        token = await oauth.thaid.authorize_access_token(request)
        user_info = token.get('userinfo')

        if not user_info:
            logger.error("No userinfo found in token.")
            # พยายามดึง state เพื่อ redirect กลับหน้า portal พร้อม error
            raw_state = request.query_params.get("state", "")
            try:
                state_data = json.loads(raw_state)
                session_id = state_data.get("sid")
                if session_id:
                    qr_sessions = request.app.state.qr_sessions
                    if session_id in qr_sessions:
                        qr_sessions[session_id]["status"] = "error"
            except Exception:
                pass
            return RedirectResponse(url=f"{FRONTEND_URL}/?error=no_userinfo")

    except Exception as e:
        print(f"Auth Callback Error: {str(e)}")
        import traceback
        traceback.print_exc()
        return RedirectResponse(url=f"{FRONTEND_URL}/?error=callback_failed&detail={str(e)}")

    # ============================================================
    # ตรวจสอบว่ามาจาก QR Flow (state มี "sid") หรือ redirect flow
    # ============================================================
    raw_state = request.query_params.get("state", "")
    qr_session_id = None
    captive_data = {}

    if raw_state:
        try:
            state_data = json.loads(raw_state)
            qr_session_id = state_data.get("sid")
            captive_data = {
                "mac": state_data.get("mac", ""),
                "ip": state_data.get("ip", ""),
                "original_url": state_data.get("url", ""),
                "magic": state_data.get("magic", ""),
                "fw_ip": state_data.get("fw_ip", FORTIGATE_IP),
            }
        except (json.JSONDecodeError, Exception) as e:
            logger.warning(f"Could not parse state: {e}")

    # Fallback: ดึงจาก session (redirect flow เดิม)
    if not captive_data.get("magic"):
        captive_data = {
            "mac": request.session.get('guest_mac', ""),
            "ip": request.session.get('guest_ip', ""),
            "original_url": request.session.get('original_url', ""),
            "magic": request.session.get('fortigate_magic', ""),
            "fw_ip": request.session.get('fortigate_ip', FORTIGATE_IP),
        }

    pid = user_info.get('pid') or user_info.get('sub', '')
    logger.info(f"ThaiD Callback success! PID: {pid}")

    # สร้าง JWT session token
    jwt_token = create_jwt_token({"user": user_info})

    # สร้าง ClearPass user (optional)
    await create_cppm_user(pid)

    # ============================================================
    # QR Flow: อัปเดต Session Store → Frontend Polling จะเจอ
    # ============================================================
    if qr_session_id:
        qr_sessions = request.app.state.qr_sessions
        if qr_session_id in qr_sessions:
            qr_sessions[qr_session_id].update({
                "status": "success",
                "user_info": user_info,
                "magic": captive_data.get("magic", qr_sessions[qr_session_id].get("magic", "")),
                "fw_ip": captive_data.get("fw_ip", qr_sessions[qr_session_id].get("fw_ip", FORTIGATE_IP)),
            })
            logger.info(f"QR Session {qr_session_id} updated to success for {pid}")

        # ส่งหน้า HTML ให้ Mobile แสดงว่า "สแกนสำเร็จ กลับไปดูหน้าจอหลัก"
        html_content = f"""<!DOCTYPE html>
<html lang="th">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>ยืนยันตัวตนสำเร็จ</title>
  <link href="https://fonts.googleapis.com/css2?family=Sarabun:wght@400;600;700&display=swap" rel="stylesheet">
  <style>
    * {{ box-sizing: border-box; margin: 0; padding: 0; font-family: 'Sarabun', sans-serif; }}
    body {{
      min-height: 100vh;
      background: linear-gradient(135deg, #0F3A6C 0%, #1a5a9a 100%);
      display: flex; align-items: center; justify-content: center; padding: 20px;
    }}
    .card {{
      background: white; border-radius: 20px; padding: 40px 32px;
      text-align: center; max-width: 360px; width: 100%;
      box-shadow: 0 20px 60px rgba(0,0,0,0.3);
    }}
    .icon {{
      width: 80px; height: 80px; background: #dcfce7;
      border-radius: 50%; display: flex; align-items: center;
      justify-content: center; margin: 0 auto 20px;
    }}
    .icon svg {{ width: 40px; height: 40px; color: #16a34a; }}
    h1 {{ color: #0F3A6C; font-size: 24px; font-weight: 700; margin-bottom: 12px; }}
    p {{ color: #6b7280; font-size: 16px; line-height: 1.6; }}
    .name {{ color: #0F3A6C; font-weight: 700; font-size: 18px; margin: 16px 0 4px; }}
    .pid {{ color: #4b5563; font-size: 14px; font-family: monospace; }}
    .note {{
      margin-top: 24px; padding: 14px; background: #eff6ff;
      border-radius: 10px; border-left: 4px solid #3b82f6;
      color: #1e40af; font-size: 14px; text-align: left;
    }}
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">
      <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
        <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" stroke="#16a34a"/>
      </svg>
    </div>
    <h1>✅ ยืนยันตัวตนสำเร็จ</h1>
    <p>ระบบได้รับข้อมูลของท่านเรียบร้อยแล้ว</p>
    <div class="name">{user_info.get('title', '')} {user_info.get('name', pid)}</div>
    <div class="pid">เลขบัตร: {'X'*10 + pid[-3:] if len(pid) >= 3 else pid}</div>
    <div class="note">
      📱 กรุณากลับไปดูหน้าจอคอมพิวเตอร์หรืออุปกรณ์ที่ต้องการเชื่อมต่ออินเทอร์เน็ต
      ระบบจะเชื่อมต่อโดยอัตโนมัติ
    </div>
  </div>
</body>
</html>"""
        res = HTMLResponse(content=html_content)
        res.set_cookie(key="auth_token", value=jwt_token, httponly=True, samesite="lax", max_age=7200)
        return res

    # ============================================================
    # Redirect Flow เดิม: FortiGate magic หรือ ClearPass
    # ============================================================
    fortigate_magic = captive_data.get("magic")
    fortigate_ip = captive_data.get("fw_ip", FORTIGATE_IP)
    original_url = captive_data.get("original_url")

    if fortigate_magic and fortigate_ip:
        logger.info(f"FortiGate redirect handover for {pid}")
        html_content = f"""<html>
<head><title>กำลังเชื่อมต่อ...</title></head>
<body onload="document.forms[0].submit()">
    <form method="POST" action="https://{fortigate_ip}:{FORTIGATE_AUTH_PORT}{FORTIGATE_AUTH_PATH}">
        <input type="hidden" name="magic" value="{fortigate_magic}">
        <input type="hidden" name="username" value="{pid}">
        <input type="hidden" name="answer" value="1">
    </form>
    <div style="text-align:center;margin-top:50px;font-family:Sarabun,sans-serif;">
        <h2>ยืนยันตัวตนสำเร็จ</h2>
        <p>กำลังเชื่อมต่ออินเทอร์เน็ต กรุณารอสักครู่...</p>
    </div>
</body>
</html>"""
        res = HTMLResponse(content=html_content)
    else:
        cppm_success = bool(CPPM_LOGIN_URL)
        if cppm_success and CPPM_LOGIN_URL:
            target_url = f"{CPPM_LOGIN_URL}?user={pid}&password={pid}&submit=Login"
        else:
            target_url = original_url if original_url else f"{FRONTEND_URL}/dashboard"
        res = RedirectResponse(url=target_url)

    res.set_cookie(key="auth_token", value=jwt_token, httponly=True, samesite="lax", max_age=7200)
    return res


# ============================================================
# ENDPOINT: POST /api/auth/logout
# ============================================================
@router.post("/logout")
async def logout(response: Response):
    """Clear the auth cookie and logout the user."""
    res = RedirectResponse(url=f"{FRONTEND_URL}/")
    res.delete_cookie("auth_token")
    return res
