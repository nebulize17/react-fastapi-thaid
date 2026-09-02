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
import asyncio
import httpx
from datetime import datetime, timedelta, timezone
from urllib.parse import urlencode, quote

logger = logging.getLogger("thaid-auth")

router = APIRouter()
oauth = OAuth()

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
    สร้าง ThaiD OAuth2 Authorization URL สำหรับ QR Code และ Direct Login
    """
    params = {
        "response_type": "code",
        "client_id": THAID_CLIENT_ID,
        "redirect_uri": redirect_uri,
        "scope": "openid pid title title_en given_name_en family_name_en name name_en",
        "state": session_id
    }
    auth_endpoint = "https://imauth.bora.dopa.go.th/api/v2/oauth2/auth/"
    return f"{auth_endpoint}?{urlencode(params, quote_via=quote)}"


# ============================================================
# Helper: Pattern-based Deterministic Password Generator
# ============================================================
def generate_pattern_password(pid: str) -> str:
    """
    Generate a unique password for the user matching pattern: 3Th6ofvN
    """
    import hashlib
    import string
    h = hashlib.sha256(pid.encode('utf-8')).digest()
    digits = string.digits
    uppercase = string.ascii_uppercase
    lowercase = string.ascii_lowercase
    
    p0 = digits[h[0] % len(digits)]
    p1 = uppercase[h[1] % len(uppercase)]
    p2 = lowercase[h[2] % len(lowercase)]
    p3 = digits[h[3] % len(digits)]
    p4 = lowercase[h[4] % len(lowercase)]
    p5 = lowercase[h[5] % len(lowercase)]
    p6 = lowercase[h[6] % len(lowercase)]
    p7 = uppercase[h[7] % len(uppercase)]
    
    return f"{p0}{p1}{p2}{p3}{p4}{p5}{p6}{p7}"


# ============================================================
# Helper: ClearPass Guest Account
# ============================================================
async def sync_cppm_user(username: str, password: str, user_info: dict = None) -> bool:
    """
    สร้างหรืออัปเดตบัญชีใน Aruba ClearPass Guest DB จากข้อมูล ThaiD:
    - ค้นหาผ่าน /api/guest/username/{username} โดยตรง
    - ถ้าพบ: PATCH อัปเดตรหัสผ่าน, ชื่อ-นามสกุล, เปิดใช้งาน (enabled=True), และรีเซ็ตเวลาใช้งาน
    - ถ้าไม่พบ: POST สร้างบัญชีใหม่
    """
    if not CPPM_HOST or not CPPM_CLIENT_ID:
        logger.warning("ClearPass configuration missing. Skipping user sync.")
        return False

    user_info = user_info or {}
    pid = user_info.get("pid") or user_info.get("sub", "")
    thai_name = (user_info.get("name") or "").strip()
    english_name = (user_info.get("name_en") or "").strip()
    title_th = (user_info.get("title") or "").strip()
    
    if thai_name:
        full_thai_name = f"{title_th} {thai_name}".strip() if title_th and not thai_name.startswith(title_th) else thai_name
    else:
        full_thai_name = english_name or f"ThaiD User {username}"
    
    visitor_name = full_thai_name
    masked_pid = pid[:3] + "X" * (len(pid) - 6) + pid[-3:] if len(pid) >= 8 else ("X" * len(pid) if pid else "N/A")
    notes = f"ThaiD Authentication | PID: {masked_pid} | Name (TH): {full_thai_name} | Name (EN): {english_name} | Synced: {datetime.now(timezone.utc).isoformat()}"

    try:
        async with httpx.AsyncClient(verify=False) as client:
            token_url = f"https://{CPPM_HOST}/api/oauth"
            token_data = {
                "grant_type": "client_credentials",
                "client_id": CPPM_CLIENT_ID,
                "client_secret": CPPM_CLIENT_SECRET
            }
            token_res = await client.post(token_url, data=token_data, timeout=10)
            if token_res.status_code != 200:
                logger.error(f"ClearPass OAuth token failed: {token_res.text}")
                return False

            access_token = token_res.json().get("access_token")
            headers = {
                "Authorization": f"Bearer {access_token}",
                "Content-Type": "application/json"
            }

            user_url = f"https://{CPPM_HOST}/api/guest/username/{username}"
            user_res = await client.get(user_url, headers=headers, timeout=10)

            user_payload = {
                "enabled": True,
                "username": username,
                "password": password,
                "visitor_name": visitor_name,
                "notes": notes,
                "expire_after": 480,
                "role_id": 2
            }

            if user_res.status_code == 200:
                user_data = user_res.json()
                user_id = user_data.get("id")
                patch_url = f"https://{CPPM_HOST}/api/guest/{user_id}" if user_id else user_url
                patch_res = await client.patch(patch_url, json=user_payload, headers=headers, timeout=10)
                if patch_res.status_code in [200, 204]:
                    logger.info(f"Successfully updated ClearPass user '{username}' with new password & enabled=True")
                    return True
                else:
                    logger.error(f"Failed to patch ClearPass user '{username}': {patch_res.text}")
                    return False
            else:
                create_url = f"https://{CPPM_HOST}/api/guest"
                create_res = await client.post(create_url, json=user_payload, headers=headers, timeout=10)
                if create_res.status_code in [200, 201]:
                    logger.info(f"Successfully created new ClearPass user '{username}'")
                    return True
                elif create_res.status_code == 409:
                    patch_res = await client.patch(user_url, json=user_payload, headers=headers, timeout=10)
                    if patch_res.status_code in [200, 204]:
                        logger.info(f"Successfully patched ClearPass user '{username}' on 409 retry.")
                        return True
                logger.error(f"Failed to create ClearPass user '{username}': {create_res.text}")
                return False

    except Exception as e:
        logger.error(f"Exception connecting to ClearPass: {str(e)}")
        return False


# ============================================================
# Helper: FortiGate REST API Authentication
# ============================================================
async def authenticate_fortigate_api(username: str, client_ip: str):
    """
    Authenticate the user session directly on FortiGate via REST API.
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
    fw_username = username
    fw_server = FORTIGATE_AUTH_SERVER if FORTIGATE_AUTH_SERVER and FORTIGATE_AUTH_SERVER != "local" else "Clearpass-DTAM"

    payload = {
        "ip": client_ip,
        "username": fw_username,
        "server": fw_server
    }

    logger.info(f"Sending FortiGate REST API Auth for user '{fw_username}' to {url}")
    try:
        async with httpx.AsyncClient(verify=False) as client:
            res = await client.post(url, json=payload, headers=headers, timeout=10)
            logger.info(f"FortiGate REST API response status: {res.status_code}")
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
# Helper: FortiGate REST API De-authentication (Logout)
# ============================================================
async def deauthenticate_fortigate_api(client_ip: str):
    """
    De-authenticate user session on FortiGate via REST API.
    """
    if not FORTIGATE_API_TOKEN or FORTIGATE_API_TOKEN == "your_fortigate_api_token_here" or not FORTIGATE_API_TOKEN.strip():
        return False

    if not client_ip:
        return False

    url = f"https://{FORTIGATE_IP}/api/v2/monitor/user/firewall/deauth"
    headers = {
        "Authorization": f"Bearer {FORTIGATE_API_TOKEN}",
        "Content-Type": "application/json"
    }
    payload = {
        "ip": client_ip
    }

    try:
        async with httpx.AsyncClient(verify=False) as client:
            res = await client.post(url, json=payload, headers=headers, timeout=8)
            return res.status_code in [200, 201]
    except Exception as e:
        logger.error(f"Error calling FortiGate Deauth REST API: {str(e)}")
        return False

def cleanup_expired_sessions(qr_sessions: dict):
    now = time.time()
    expired_keys = [
        k for k, v in qr_sessions.items()
        if now - v.get("created_at", 0) > QR_SESSION_TTL_SECONDS + 60
    ]
    for k in expired_keys:
        del qr_sessions[k]


@router.get("/qr-session")
async def create_qr_session(
    request: Request,
    mac: str = None,
    ip: str = None,
    url: str = None,
    magic: str = None,
    fw_ip: str = None,
    auth_url: str = None,
    URL: str = None,
):
    qr_sessions = request.app.state.qr_sessions
    cleanup_expired_sessions(qr_sessions)
    session_id = str(uuid.uuid4())
    now = time.time()

    effective_fw_ip = FORTIGATE_IP
    target_url = URL or auth_url or url
    if target_url:
        try:
            from urllib.parse import urlparse
            parsed = urlparse(target_url)
            if parsed.hostname:
                effective_fw_ip = parsed.hostname
        except Exception:
            pass
    elif fw_ip:
        effective_fw_ip = fw_ip.split(":")[0]

    client_ip = ""
    if ip and not any(c.isalpha() for c in ip):
        client_ip = ip

    if not client_ip:
        x_forwarded_for = request.headers.get("x-forwarded-for")
        if x_forwarded_for:
            client_ip = x_forwarded_for.split(",")[0].strip()
        else:
            client_ip = request.headers.get("x-real-ip") or (request.client.host if request.client else "")

    qr_sessions[session_id] = {
        "status": "pending",
        "flow": "qr",
        "mac": mac or "",
        "ip": client_ip,
        "original_url": url or "",
        "magic": magic or "",
        "fw_ip": effective_fw_ip,
        "auth_url": target_url or "",
        "user_info": None,
        "created_at": now,
    }

    redirect_uri = THAID_CALLBACK_ENDPOINT if THAID_CALLBACK_ENDPOINT else str(request.url_for('auth_callback'))
    if redirect_uri.startswith("http://") and "dtam.moph.go.th" in redirect_uri:
        redirect_uri = redirect_uri.replace("http://", "https://", 1)

    thaid_url = build_thaid_auth_url(session_id, redirect_uri)
    return JSONResponse({
        "session_id": session_id,
        "thaid_url": thaid_url,
        "expires_in": QR_SESSION_TTL_SECONDS,
        "fw_ip": effective_fw_ip,
    })


@router.get("/qr-status/{session_id}")
async def get_qr_status(session_id: str, request: Request):
    qr_sessions = request.app.state.qr_sessions
    session = qr_sessions.get(session_id)
    if not session:
        return JSONResponse({"status": "expired"}, status_code=404)

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
            "auth_url": session.get("auth_url", ""),
            "fw_port": FORTIGATE_AUTH_PORT,
            "fw_path": FORTIGATE_AUTH_PATH,
            "username": session.get("username", ""),
            "password": session.get("password", ""),
            "user_info": session.get("user_info"),
            "original_url": session.get("original_url", ""),
        })

    return JSONResponse(response_data)


@router.get("/login")
async def login(
    request: Request,
    mac: str = None,
    ip: str = None,
    url: str = None,
    magic: str = None,
    fw_ip: str = None,
    auth_url: str = None,
    qr_session: str = None,
    URL: str = None,
):
    qr_sessions = request.app.state.qr_sessions
    cleanup_expired_sessions(qr_sessions)

    effective_fw_host = FORTIGATE_IP
    target_url = URL or auth_url
    if target_url:
        try:
            from urllib.parse import urlparse
            parsed = urlparse(target_url)
            if parsed.hostname and "api-gateway" not in parsed.hostname:
                effective_fw_host = parsed.hostname
        except Exception:
            pass
    elif fw_ip and "api-gateway" not in fw_ip:
        effective_fw_host = fw_ip.split(":")[0]

    real_ip = ""
    if ip and not any(c.isalpha() for c in ip):
        real_ip = ip

    if not real_ip:
        x_forwarded_for = request.headers.get("x-forwarded-for")
        if x_forwarded_for:
            real_ip = x_forwarded_for.split(",")[0].strip()
        else:
            real_ip = request.headers.get("x-real-ip") or (request.client.host if request.client else "")

    session_id = qr_session or str(uuid.uuid4())
    qr_sessions[session_id] = {
        "status": "pending",
        "flow": "qr" if qr_session else "redirect",
        "mac": mac or "",
        "ip": real_ip,
        "original_url": url or "",
        "magic": magic or "",
        "fw_ip": effective_fw_host,
        "auth_url": target_url or "",
        "user_info": None,
        "created_at": time.time(),
    }

    redirect_uri = THAID_CALLBACK_ENDPOINT if THAID_CALLBACK_ENDPOINT else str(request.url_for('auth_callback'))
    if redirect_uri.startswith("http://") and "dtam.moph.go.th" in redirect_uri:
        redirect_uri = redirect_uri.replace("http://", "https://", 1)

    thaid_url = build_thaid_auth_url(session_id, redirect_uri)
    return RedirectResponse(url=thaid_url)


@router.get("/callback")
async def auth_callback(request: Request, response: Response):
    code = request.query_params.get("code")
    state = request.query_params.get("state")

    if not state:
        logger.error("No state found in callback query parameters.")
        return RedirectResponse(url=f"{FRONTEND_URL}/?error=no_state")

    qr_sessions = request.app.state.qr_sessions
    sess = qr_sessions.get(state, {})
    flow = sess.get("flow", "redirect")

    redirect_uri = THAID_CALLBACK_ENDPOINT if THAID_CALLBACK_ENDPOINT else str(request.url_for('auth_callback'))
    if redirect_uri.startswith("http://") and "dtam.moph.go.th" in redirect_uri:
        redirect_uri = redirect_uri.replace("http://", "https://", 1)

    user_info = None

    try:
        async with httpx.AsyncClient(verify=False) as client:
            headers = {}
            if THAID_API_KEY:
                headers['x-api-key'] = THAID_API_KEY

            token_url = "https://imauth.bora.dopa.go.th/api/v2/oauth2/token/"
            token_data = {
                "grant_type": "authorization_code",
                "code": code,
                "redirect_uri": redirect_uri,
                "client_id": THAID_CLIENT_ID,
                "client_secret": THAID_CLIENT_SECRET
            }

            logger.info(f"Manual token exchange at {token_url} for state: {state}")
            token_res = await client.post(token_url, data=token_data, headers=headers, timeout=15)

            if token_res.status_code != 200:
                logger.error(f"Manual token exchange failed: {token_res.text}")
                if state in qr_sessions:
                    qr_sessions[state]["status"] = "error"
                return RedirectResponse(url=f"{FRONTEND_URL}/?error=token_exchange_failed&detail={token_res.text}")

            token_json = token_res.json()
            access_token = token_json.get("access_token")

            if not access_token:
                logger.error("No access_token found in token response.")
                if state in qr_sessions:
                    qr_sessions[state]["status"] = "error"
                return RedirectResponse(url=f"{FRONTEND_URL}/?error=no_access_token")

            userinfo_url = "https://imauth.bora.dopa.go.th/api/v2/oauth2/userinfo/"
            userinfo_headers = {"Authorization": f"Bearer {access_token}"}
            if THAID_API_KEY:
                userinfo_headers['x-api-key'] = THAID_API_KEY

            logger.info(f"Manual userinfo fetch at {userinfo_url}")
            userinfo_res = await client.get(userinfo_url, headers=userinfo_headers, timeout=15)

            if userinfo_res.status_code != 200:
                logger.error(f"Manual userinfo fetch failed: {userinfo_res.text}")
                if state in qr_sessions:
                    qr_sessions[state]["status"] = "error"
                return RedirectResponse(url=f"{FRONTEND_URL}/?error=userinfo_fetch_failed&detail={userinfo_res.text}")

            user_info = userinfo_res.json()

    except Exception as e:
        logger.error(f"Token exchange exception: {str(e)}")
        if state in qr_sessions:
            qr_sessions[state]["status"] = "error"
        return RedirectResponse(url=f"{FRONTEND_URL}/?error=manual_exchange_exception&detail={str(e)}")

    pid = user_info.get('pid') or user_info.get('sub', '')
    logger.info(f"ThaiD Callback success! PID: {pid}")

    import re
    given = (user_info.get("given_name_en") or "").strip()
    family = (user_info.get("family_name_en") or "").strip()
    clean_given = re.sub(r'[^a-zA-Z0-9]', '', given)
    clean_family = re.sub(r'[^a-zA-Z0-9]', '', family)

    if clean_given:
        username = (clean_given + clean_family[:2]).lower()
        logger.info(f"Calculated username '{username}' from English name: '{given} {family}'")
    else:
        username = pid
        logger.info(f"Missing given_name_en or family_name_en. Falling back to PID/sub as username: '{username}'")

    jwt_token = create_jwt_token({"user": user_info})
    password = generate_pattern_password(pid)

    if CPPM_HOST and CPPM_CLIENT_ID:
        cppm_ok = await sync_cppm_user(username, password, user_info)
        if not cppm_ok:
            logger.warning(f"ClearPass sync for '{username}' did not complete, proceeding with login flow.")
    else:
        logger.warning("ClearPass settings missing on server.")

    captive_data = {
        "mac": sess.get("mac") or request.session.get("guest_mac", ""),
        "ip": sess.get("ip") or request.session.get("guest_ip", ""),
        "original_url": sess.get("original_url") or request.session.get("original_url", ""),
        "magic": sess.get("magic") or request.session.get("fortigate_magic", ""),
        "fw_ip": sess.get("fw_ip") or request.session.get("fortigate_ip", FORTIGATE_IP),
        "auth_url": sess.get("auth_url") or request.session.get("auth_url", ""),
    }

    client_ip = captive_data.get("ip")
    if client_ip and FORTIGATE_API_TOKEN:
        logger.info(f"Authenticating session on FortiGate REST API for username '{username}' and IP '{client_ip}'")
        try:
            await authenticate_fortigate_api(username, client_ip)
        except Exception as api_err:
            logger.error(f"FortiGate API Auth error: {str(api_err)}")

    if flow == "qr":
        qr_session_id = state
        if qr_session_id in qr_sessions:
            qr_sessions[qr_session_id].update({
                "status": "success",
                "user_info": user_info,
                "username": username,
                "password": password,
                "magic": captive_data.get("magic", ""),
                "fw_ip": captive_data.get("fw_ip", FORTIGATE_IP),
                "auth_url": captive_data.get("auth_url", ""),
            })
            logger.info(f"QR Session {qr_session_id} updated to success for username '{username}'")

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
        return HTMLResponse(content=html_content)

    else:
        user_info_json = json.dumps(user_info, ensure_ascii=False)
        magic = captive_data.get("magic", "")
        ip = captive_data.get("ip", "")
        mac = captive_data.get("mac", "")
        fw_ip = captive_data.get("fw_ip", FORTIGATE_IP)
        original_url = captive_data.get("original_url", "")

        auth_action_url = captive_data.get("auth_url")
        if not auth_action_url or "api-gateway" in auth_action_url or not auth_action_url.endswith("/fgtauth"):
            clean_fw_host = (captive_data.get("fw_ip") or FORTIGATE_IP).split(":")[0]
            if "api-gateway" in clean_fw_host:
                clean_fw_host = FORTIGATE_IP.split(":")[0]
            if FORTIGATE_AUTH_PORT and str(FORTIGATE_AUTH_PORT) not in ["443", "80", "0"]:
                auth_action_url = f"https://{clean_fw_host}:{FORTIGATE_AUTH_PORT}{FORTIGATE_AUTH_PATH}"
            else:
                auth_action_url = f"https://{clean_fw_host}{FORTIGATE_AUTH_PATH}"

        masked_pid = pid[:3] + "X" * (len(pid) - 6) + pid[-3:] if len(pid) >= 8 else ("X" * len(pid) if pid else "N/A")
        thai_full_name = (user_info.get('title') or '') + ' ' + (user_info.get('name') or user_info.get('given_name_en') or pid)

        standard_html_content = f"""<!DOCTYPE html>
<html lang="th">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>เข้าสู่ระบบสำเร็จ</title>
  <link href="https://fonts.googleapis.com/css2?family=Sarabun:wght@400;600;700&display=swap" rel="stylesheet">
  <style>
    * {{ box-sizing: border-box; margin: 0; padding: 0; font-family: 'Sarabun', sans-serif; }}
    body {{
      min-height: 100vh;
      background: linear-gradient(135deg, #0F3A6C 0%, #1a5a9a 100%);
      display: flex; align-items: center; justify-content: center; padding: 20px;
    }}
    .card {{
      background: white; border-radius: 20px; padding: 36px 28px;
      text-align: center; max-width: 400px; width: 100%;
      box-shadow: 0 20px 60px rgba(0,0,0,0.3);
    }}
    .icon {{
      width: 70px; height: 70px; background: #dcfce7;
      border-radius: 50%; display: flex; align-items: center;
      justify-content: center; margin: 0 auto 16px;
    }}
    .icon svg {{ width: 36px; height: 36px; color: #16a34a; }}
    h1 {{ color: #0F3A6C; font-size: 22px; font-weight: 700; margin-bottom: 8px; }}
    p {{ color: #6b7280; font-size: 14px; line-height: 1.5; }}
    .user-box {{
      background: #f8fafc; border-radius: 12px; padding: 14px;
      margin: 20px 0; border: 1px solid #e2e8f0; text-align: left;
    }}
    .user-name {{ color: #0F3A6C; font-weight: 700; font-size: 16px; }}
    .user-pid {{ color: #64748b; font-size: 13px; font-family: monospace; margin-top: 4px; }}
    .submit-btn {{
      width: 100%; padding: 15px 20px;
      background: linear-gradient(135deg, #0F3A6C 0%, #1a5a9a 100%);
      color: #ffffff; border: none; border-radius: 12px;
      font-size: 16px; font-weight: 700; cursor: pointer;
      box-shadow: 0 8px 20px rgba(15, 58, 108, 0.25);
      transition: all 0.2s ease-in-out;
      display: flex; align-items: center; justify-content: center; gap: 8px;
    }}
    .submit-btn:hover {{
      transform: translateY(-2px);
      box-shadow: 0 10px 25px rgba(15, 58, 108, 0.35);
    }}
    .auto-note {{
      font-size: 12px; color: #94a3b8; margin-top: 14px;
    }}
  </style>
  <script>
    window.onload = function() {{
      try {{
        const captiveData = {{
          mac: {json.dumps(mac)},
          ip: {json.dumps(ip)},
          url: {json.dumps(original_url)},
          magic: {json.dumps(magic)},
          fw_ip: {json.dumps(fw_ip)},
          auth_url: {json.dumps(auth_action_url)}
        }};
        localStorage.setItem('captive_params', JSON.stringify(captiveData));

        const successData = {{
          user_info: {user_info_json},
          username: {json.dumps(username)},
          password: {json.dumps(password)},
          fw_ip: {json.dumps(fw_ip)},
          auth_url: {json.dumps(auth_action_url)},
          fw_port: "{FORTIGATE_AUTH_PORT}",
          fw_path: "{FORTIGATE_AUTH_PATH}"
        }};
        localStorage.setItem('thaid_success_data', JSON.stringify(successData));
      }} catch (err) {{
        console.error('Error in callback script:', err);
      }}

      // ทำ Auto-submit หลัง 600ms (เผื่อ iOS WebKit อนุญาต)
      const magicVal = {json.dumps(magic)};
      if (magicVal) {{
        setTimeout(function() {{
          const form = document.getElementById('auth_form');
          if (form) form.submit();
        }}, 600);
      }} else {{
        setTimeout(function() {{
          window.location.href = '/keepalive';
        }}, 800);
      }}
    }};
  </script>
</head>
<body>
  <div class="card">
    <div class="icon">
      <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
        <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" stroke="#16a34a"/>
      </svg>
    </div>
    <h1>ยืนยันตัวตนสำเร็จ</h1>
    <p>ระบบตรวจสอบสิทธิ์เรียบร้อยแล้ว</p>

    <div class="user-box">
      <div class="user-name">{thai_full_name}</div>
      <div class="user-pid">เลขบัตร: {masked_pid}</div>
    </div>

    <form id="auth_form" method="POST" action="{auth_action_url}">
      <input type="hidden" name="magic" value="{magic}" />
      <input type="hidden" name="username" value="{username}" />
      <input type="hidden" name="password" value="{password}" />
      <input type="hidden" name="4Tredir" value="https://api-gateway.dtam.moph.go.th/keepalive" />
      <input type="hidden" name="4TImroot" value="{magic}" />
      <input type="hidden" name="ft_un" value="{username}" />
      <input type="hidden" name="ft_pd" value="{password}" />
      
      <button type="submit" class="submit-btn" id="btn_connect">
        <span>🚀 แตะที่นี่เพื่อเข้าสู่อินเทอร์เน็ตทันที</span>
      </button>
    </form>

    <p class="auto-note">*(ระบบกำลังเชื่อมต่ออัตโนมัติ หรือแตะปุ่มด้านบนหากหน้าจอไม่เปลี่ยน)*</p>
    <a href="/keepalive" style="display:inline-block;margin-top:14px;color:#0F3A6C;font-size:13px;text-decoration:none;">ไปหน้าควบคุมการใช้งาน</a>
  </div>
</body>
</html>"""
        resp = HTMLResponse(content=standard_html_content)
        resp.set_cookie(
            key="auth_token",
            value=jwt_token,
            httponly=True,
            max_age=7200,
            samesite="lax",
            secure=False
        )
        return resp

@router.post("/logout")
async def logout(request: Request, response: Response):
    client_ip = ""
    x_forwarded_for = request.headers.get("x-forwarded-for")
    if x_forwarded_for:
        client_ip = x_forwarded_for.split(",")[0].strip()
    else:
        client_ip = request.headers.get("x-real-ip") or (request.client.host if request.client else "")

    if client_ip and FORTIGATE_API_TOKEN:
        logger.info(f"Triggering FortiGate background deauth for IP: {client_ip}")
        asyncio.create_task(deauthenticate_fortigate_api(client_ip))

    res = JSONResponse({"status": "success", "message": "Logged out successfully"})
    res.delete_cookie("auth_token")
    return res
