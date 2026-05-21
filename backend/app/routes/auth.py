from fastapi import APIRouter, Request, Response
from fastapi.responses import RedirectResponse, HTMLResponse, JSONResponse
from authlib.integrations.starlette_client import OAuth
import jwt
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
    FORTIGATE_API_TOKEN,
    FORTIGATE_AUTH_SERVER,
    QR_SESSION_TTL_SECONDS,
)

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
def build_thaid_auth_url(session_id: str, redirect_uri: str) -> str:
    """
    สร้าง ThaiD OAuth2 Authorization URL สำหรับ QR Code โดยตรง
    - state = session_id (เพื่อให้ ThaiD callback กลับมาพร้อม session_id นี้)
    - scope = openid pid (เสถียรและพอดีกับการใช้ตรวจสิทธิ์)
    """
    params = {
        "response_type": "code",
        "client_id": THAID_CLIENT_ID,
        "redirect_uri": redirect_uri,
        "scope": "openid pid",
        "state": session_id
    }
    auth_endpoint = "https://imauth.bora.dopa.go.th/api/v2/oauth2/auth/"
    return f"{auth_endpoint}?{urlencode(params, quote_via=quote)}"



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
# Helper: FortiGate REST API Authentication
# ============================================================
async def authenticate_fortigate_api(username: str, client_ip: str):
    """
    Authenticate the user session directly on FortiGate via REST API.
    Endpoint: POST /api/v2/monitor/user/firewall/auth
    """
    if not FORTIGATE_API_TOKEN or FORTIGATE_API_TOKEN == "your_fortigate_api_token_here" or not FORTIGATE_API_TOKEN.strip():
        logger.warning("FortiGate API Token missing or placeholder. Skipping REST API authentication.")
        return False

    if not client_ip:
        logger.warning("Client IP is missing. Cannot authenticate session via REST API.")
        return False

    url = f"https://{FORTIGATE_IP}/api/v2/monitor/user/firewall/auth"
    headers = {
        "Authorization": f"Bearer {FORTIGATE_API_TOKEN}",
        "Content-Type": "application/json"
    }
    payload = {
        "ip": client_ip,
        "username": username,
        "server": FORTIGATE_AUTH_SERVER or "local"
    }

    logger.info(f"Sending FortiGate REST API Auth for user '{username}' (IP: {client_ip}) to {url}")
    try:
        # Disable SSL verification since FortiGate might use self-signed certs in PoC
        async with httpx.AsyncClient(verify=False) as client:
            res = await client.post(url, json=payload, headers=headers, timeout=10)
            logger.info(f"FortiGate REST API response status: {res.status_code}")
            
            try:
                res_data = res.json()
                logger.info(f"FortiGate REST API response: {json.dumps(res_data)}")
            except Exception:
                logger.info(f"FortiGate REST API raw response: {res.text}")

            if res.status_code in [200, 201]:
                logger.info(f"Successfully authenticated session on FortiGate via REST API for user '{username}'")
                return True
            else:
                logger.error(f"FortiGate REST API Authentication Failed: {res.text}")
                return False
    except Exception as e:
        logger.error(f"Error calling FortiGate REST API: {str(e)}")
        return False
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
    # บันทึก session — เก็บ captive portal params ทั้งหมดไว้ใน store
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

    # สร้าง QR URL ตรงไปยัง BORA Production OAuth2 Endpoint
    redirect_uri = THAID_CALLBACK_ENDPOINT if THAID_CALLBACK_ENDPOINT else str(request.url_for('auth_callback'))
    if redirect_uri.startswith("http://") and "dtam.moph.go.th" in redirect_uri:
        redirect_uri = redirect_uri.replace("http://", "https://", 1)

    thaid_url = build_thaid_auth_url(session_id, redirect_uri)

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
            "username": session.get("username", ""),
            "user_info": session.get("user_info"),
        })

    return JSONResponse(response_data)


# ============================================================
# ENDPOINT: GET /api/auth/login
# เส้นทางเดิมสำหรับ redirect-based login (ยังใช้ได้อยู่)
# ============================================================
@router.get("/login")
async def login(
    request: Request,
    mac: str = None,
    ip: str = None,
    url: str = None,
    magic: str = None,
    fw_ip: str = None,
    qr_session: str = None,   # ← QR Flow: session_id จาก QR Code
):
    """Initiate the ThaID OAuth2 Login Flow. Supports Captive Portal parameters and QR session."""
    # เก็บ captive portal params ใน HTTP session
    if mac: request.session['guest_mac'] = mac
    if ip: request.session['guest_ip'] = ip
    if url: request.session['original_url'] = url
    if magic: request.session['fortigate_magic'] = magic
    if fw_ip: request.session['fortigate_ip'] = fw_ip

    # เก็บ QR session_id ไว้ใน HTTP session เพื่อดึงใน callback
    if qr_session:
        request.session['qr_session_id'] = qr_session
        logger.info(f"QR Login initiated for session: {qr_session}")

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
    รองรับทั้ง QR Flow (state มี session_id คีย์ตรงกับ qr_sessions) และ redirect flow (ใช้ session cookie)
    """
    code = request.query_params.get("code")
    state = request.query_params.get("state")

    if not state:
        logger.error("No state found in callback query parameters.")
        return RedirectResponse(url=f"{FRONTEND_URL}/?error=no_state")

    qr_sessions = request.app.state.qr_sessions
    is_qr_flow = state in qr_sessions

    user_info = None
    qr_session_id = None
    captive_data = {}

    # ดึง redirect_uri ตัวเดียวกันกับตอนส่งขอสิทธิ์
    redirect_uri = THAID_CALLBACK_ENDPOINT if THAID_CALLBACK_ENDPOINT else str(request.url_for('auth_callback'))
    if redirect_uri.startswith("http://") and "dtam.moph.go.th" in redirect_uri:
        redirect_uri = redirect_uri.replace("http://", "https://", 1)

    if is_qr_flow:
        # --- QR Flow: สแกนข้ามเครื่อง (มือถือ -> คอมพิวเตอร์) ---
        qr_session_id = state
        sess = qr_sessions[state]
        captive_data = {
            "mac": sess.get("mac", ""),
            "ip": sess.get("ip", ""),
            "original_url": sess.get("original_url", ""),
            "magic": sess.get("magic", ""),
            "fw_ip": sess.get("fw_ip", FORTIGATE_IP),
        }
        logger.info(f"Processing QR Flow callback for session: {qr_session_id}")

        try:
            async with httpx.AsyncClient(verify=False) as client:
                headers = {}
                if THAID_API_KEY:
                    headers['x-api-key'] = THAID_API_KEY

                # 1. แลก Authorization Code เป็น Access Token
                token_url = "https://imauth.bora.dopa.go.th/api/v2/oauth2/token/"
                token_data = {
                    "grant_type": "authorization_code",
                    "code": code,
                    "redirect_uri": redirect_uri,
                    "client_id": THAID_CLIENT_ID,
                    "client_secret": THAID_CLIENT_SECRET
                }

                logger.info(f"Manual token exchange at {token_url}")
                token_res = await client.post(token_url, data=token_data, headers=headers)

                if token_res.status_code != 200:
                    logger.error(f"Manual token exchange failed: {token_res.text}")
                    qr_sessions[state]["status"] = "error"
                    return RedirectResponse(url=f"{FRONTEND_URL}/?error=token_exchange_failed&detail={token_res.text}")

                token_json = token_res.json()
                access_token = token_json.get("access_token")

                if not access_token:
                    logger.error("No access_token found in token response.")
                    qr_sessions[state]["status"] = "error"
                    return RedirectResponse(url=f"{FRONTEND_URL}/?error=no_access_token")

                # 2. ดึงข้อมูล User Info ด้วย Access Token
                userinfo_url = "https://imauth.bora.dopa.go.th/api/v2/oauth2/userinfo/"
                userinfo_headers = {"Authorization": f"Bearer {access_token}"}
                if THAID_API_KEY:
                    userinfo_headers['x-api-key'] = THAID_API_KEY

                logger.info(f"Manual userinfo fetch at {userinfo_url}")
                userinfo_res = await client.get(userinfo_url, headers=userinfo_headers)

                if userinfo_res.status_code != 200:
                    logger.error(f"Manual userinfo fetch failed: {userinfo_res.text}")
                    qr_sessions[state]["status"] = "error"
                    return RedirectResponse(url=f"{FRONTEND_URL}/?error=userinfo_fetch_failed&detail={userinfo_res.text}")

                user_info = userinfo_res.json()

        except Exception as e:
            logger.error(f"Manual token exchange exception: {str(e)}")
            import traceback
            traceback.print_exc()
            qr_sessions[state]["status"] = "error"
            return RedirectResponse(url=f"{FRONTEND_URL}/?error=manual_exchange_exception&detail={str(e)}")

    else:
        # --- Standard Redirect Flow (กรณีสแกน/เข้าสู่ระบบด้วยอุปกรณ์เดียวกัน) ---
        logger.info("Processing standard Redirect Flow callback")
        try:
            token = await oauth.thaid.authorize_access_token(request)
            user_info = token.get('userinfo')

            if not user_info:
                logger.error("No userinfo found in token.")
                return RedirectResponse(url=f"{FRONTEND_URL}/?error=no_userinfo")

            # ดึงข้อมูลจาก session
            captive_data = {
                "mac": request.session.get('guest_mac', ""),
                "ip": request.session.get('guest_ip', ""),
                "original_url": request.session.get('original_url', ""),
                "magic": request.session.get('fortigate_magic', ""),
                "fw_ip": request.session.get('fortigate_ip', FORTIGATE_IP),
            }
        except Exception as e:
            logger.error(f"Authlib Callback Error: {str(e)}")
            import traceback
            traceback.print_exc()
            return RedirectResponse(url=f"{FRONTEND_URL}/?error=callback_failed&detail={str(e)}")

    pid = user_info.get('pid') or user_info.get('sub', '')
    logger.info(f"ThaiD Callback success! PID: {pid}")

    # Calculate custom username based on: English First Name + First 2 chars of English Last Name (lowercase)
    given = user_info.get("given_name_en", "")
    family = user_info.get("family_name_en", "")
    if given and family:
        username = (given.strip() + family.strip()[:2]).lower()
        logger.info(f"Calculated username '{username}' from English name: '{given} {family}'")
    else:
        username = pid
        logger.info(f"Missing given_name_en or family_name_en. Falling back to PID/sub as username: '{username}'")

    # สร้าง JWT session token
    jwt_token = create_jwt_token({"user": user_info})

    # สร้าง ClearPass user (optional)
    await create_cppm_user(username)

    # Trigger FortiGate REST API Session Authentication
    client_ip = captive_data.get("ip")
    if client_ip:
        logger.info(f"Triggering FortiGate REST API Auth for username '{username}' and IP '{client_ip}'")
        await authenticate_fortigate_api(username, client_ip)
    else:
        logger.warning(f"No client IP found for user '{username}'. Skipping FortiGate REST API Auth.")

    # ============================================================
    # QR Flow: อัปเดต Session Store → Frontend Polling จะเจอ
    # ============================================================
    if qr_session_id:
        qr_sessions = request.app.state.qr_sessions
        if qr_session_id in qr_sessions:
            qr_sessions[qr_session_id].update({
                "status": "success",
                "user_info": user_info,
                "username": username,
                "magic": captive_data.get("magic", qr_sessions[qr_session_id].get("magic", "")),
                "fw_ip": captive_data.get("fw_ip", qr_sessions[qr_session_id].get("fw_ip", FORTIGATE_IP)),
            })
            logger.info(f"QR Session {qr_session_id} updated to success for username '{username}'")

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
        logger.info(f"FortiGate redirect handover for {username}")
        html_content = f"""<html>
<head><title>กำลังเชื่อมต่อ...</title></head>
<body onload="document.forms[0].submit()">
    <form method="POST" action="https://{fortigate_ip}:{FORTIGATE_AUTH_PORT}{FORTIGATE_AUTH_PATH}">
        <input type="hidden" name="magic" value="{fortigate_magic}">
        <input type="hidden" name="username" value="{username}">
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
            target_url = f"{CPPM_LOGIN_URL}?user={username}&password={username}&submit=Login"
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
