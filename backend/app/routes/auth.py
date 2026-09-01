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
    สร้าง ThaiD OAuth2 Authorization URL สำหรับ QR Code และ Direct Login
    - state = session_id (เพื่อให้ ThaiD callback กลับมาพร้อม session_id นี้)
    - scope = openid pid title title_en given_name_en family_name_en name name_en
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
    Generate a unique password for the user matching the pattern: 3Th6ofvN
    Pattern: Digit, Upper, Lower, Digit, Lower, Lower, Lower, Upper
    Deterministic based on SHA-256 of user's PID.
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
    - ถ้าไม่มีใน ClearPass: สร้างบัญชีใหม่พร้อมชื่อ-นามสกุล และรหัสผ่าน
    - ถ้ามีอยู่แล้ว: อัปเดตรหัสผ่าน, ชื่อ-นามสกุล, และเปิดสถานะ (enabled=True) ทันที
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
        if title_th and not thai_name.startswith(title_th):
            full_thai_name = f"{title_th} {thai_name}"
        else:
            full_thai_name = thai_name
    else:
        full_thai_name = english_name or f"ThaiD User {username}"
    
    visitor_name = full_thai_name
    
    # Mask PID for security (e.g. 1101500387514 -> 110XXXXXX7514)
    masked_pid = pid[:3] + "X" * (len(pid) - 6) + pid[-3:] if len(pid) >= 8 else ("X" * len(pid) if pid else "N/A")
    
    # Store full names and metadata in ClearPass notes and visitor_name fields
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

            # 1. ค้นหาผู้ใช้ใน ClearPass Guest DB
            search_url = f"https://{CPPM_HOST}/api/guest"
            filter_params = {"filter": json.dumps({"username": username})}
            search_res = await client.get(search_url, params=filter_params, headers=headers, timeout=10)

            existing_user_id = None
            if search_res.status_code == 200:
                try:
                    data = search_res.json()
                    items = data.get("_embedded", {}).get("items", [])
                    if items:
                        existing_user_id = items[0].get("id")
                except Exception:
                    pass

            # 2. ถ้าพบผู้ใช้เดิม -> PATCH อัปเดตรหัสผ่าน, ชื่อ-นามสกุล, และเปิดใช้งาน (enabled=True)
            if existing_user_id:
                patch_url = f"https://{CPPM_HOST}/api/guest/{existing_user_id}"
                patch_payload = {
                    "enabled": True,
                    "password": password,
                    "visitor_name": visitor_name,
                    "notes": notes,
                    "expire_after": 480,
                    "role_id": 2
                }
                patch_res = await client.patch(patch_url, json=patch_payload, headers=headers, timeout=10)
                if patch_res.status_code in [200, 204]:
                    logger.info(f"Successfully updated ClearPass user '{username}' (ID: {existing_user_id}, Name: {visitor_name})")
                    return True
                else:
                    logger.error(f"Failed to patch ClearPass user '{username}': {patch_res.text}")

            # 3. ถ้าไม่มีผู้ใช้เดิม -> POST สร้างบัญชีใหม่
            user_payload = {
                "enabled": True,
                "username": username,
                "password": password,
                "visitor_name": visitor_name,
                "notes": notes,
                "expire_after": 480,
                "role_id": 2
            }
            create_res = await client.post(search_url, json=user_payload, headers=headers, timeout=10)
            if create_res.status_code in [200, 201]:
                logger.info(f"Successfully created new ClearPass user '{username}' (Name: {visitor_name})")
                return True
            elif create_res.status_code == 409:
                # กรณีชน Conflict (มีอยู่แล้ว) ให้ค้นหา ID และ PATCH อีกครั้ง
                logger.info(f"ClearPass user '{username}' returned 409 Conflict. Retrying PATCH.")
                retry_res = await client.get(search_url, params=filter_params, headers=headers, timeout=10)
                if retry_res.status_code == 200:
                    items = retry_res.json().get("_embedded", {}).get("items", [])
                    if items:
                        uid = items[0].get("id")
                        await client.patch(f"https://{CPPM_HOST}/api/guest/{uid}", json=user_payload, headers=headers, timeout=10)
                        logger.info(f"Successfully patched ClearPass user '{username}' on retry.")
                        return True
                return True
            else:
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
    Endpoint: POST /api/v2/monitor/user/firewall/auth
    """
    if not FORTIGATE_API_TOKEN or FORTIGATE_API_TOKEN == "your_fortigate_api_token_here" or not FORTIGATE_API_TOKEN.strip():
        logger.warning("FortiGate API Token missing or placeholder. Skipping REST API authentication.")
        return False

    if not client_ip:
        logger.warning("Client IP is missing. Cannot authenticate session via REST API.")
        return False

    # ระบุ IP ภายในของ FortiGate สำหรับยิง REST API จากเซิร์ฟเวอร์ Backend (10.1.2.77 -> 10.1.2.254)
    api_host = os.getenv("FORTIGATE_API_HOST", "10.1.2.254")
    url = f"https://{api_host}/api/v2/monitor/user/firewall/auth"
    headers = {
        "Authorization": f"Bearer {FORTIGATE_API_TOKEN}",
        "Content-Type": "application/json"
    }
    fw_username = username
    fw_server = FORTIGATE_AUTH_SERVER or "Clearpass-ThaiD"

    payload = {
        "ip": client_ip,
        "username": fw_username,
        "server": fw_server
    }

    logger.info(f"Sending FortiGate REST API Auth for user '{fw_username}' (IP: {client_ip}) to {url}")
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
# Helper: FortiGate REST API De-authentication (Logout)
# ============================================================
async def deauthenticate_fortigate_api(client_ip: str):
    """
    De-authenticate user session on FortiGate via REST API.
    Endpoint: POST /api/v2/monitor/user/firewall/deauth
    """
    if not FORTIGATE_API_TOKEN or FORTIGATE_API_TOKEN == "your_fortigate_api_token_here" or not FORTIGATE_API_TOKEN.strip():
        logger.warning("FortiGate API Token missing or placeholder. Skipping REST API de-auth.")
        return False

    if not client_ip:
        logger.warning("Client IP is missing. Cannot de-authenticate session via REST API.")
        return False

    api_host = os.getenv("FORTIGATE_API_HOST", "10.1.2.254")
    url = f"https://{api_host}/api/v2/monitor/user/firewall/deauth"
    headers = {
        "Authorization": f"Bearer {FORTIGATE_API_TOKEN}",
        "Content-Type": "application/json"
    }
    payload = {
        "ip": client_ip
    }

    logger.info(f"Sending FortiGate REST API Deauth for IP '{client_ip}' to {url}")
    try:
        async with httpx.AsyncClient(verify=False) as client:
            res = await client.post(url, json=payload, headers=headers, timeout=8)
            logger.info(f"FortiGate REST API Deauth response status: {res.status_code}")
            try:
                res_data = res.json()
                logger.info(f"FortiGate REST API Deauth response: {json.dumps(res_data)}")
            except Exception:
                logger.info(f"FortiGate REST API Deauth raw response: {res.text}")

            return res.status_code in [200, 201]
    except Exception as e:
        logger.error(f"Error calling FortiGate Deauth REST API: {str(e)}")
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
    auth_url: str = None,
    URL: str = None,
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

    # Dynamic FortiGate Host resolution
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

    # Extract client real IP (ignore if it is a hostname like 'auth.dtam.moph.go.th')
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
            "auth_url": session.get("auth_url", ""),
            "fw_port": FORTIGATE_AUTH_PORT,
            "fw_path": FORTIGATE_AUTH_PATH,
            "username": session.get("username", ""),
            "password": session.get("password", ""),
            "user_info": session.get("user_info"),
            "original_url": session.get("original_url", ""),
        })

    return JSONResponse(response_data)


# ============================================================
# ENDPOINT: GET /api/auth/login
# เส้นทางเดิมสำหรับ redirect-based login (ยังใช้ได้อยู่)
# ============================================================
# ENDPOINT: GET /api/auth/login
# เส้นทางสำหรับ redirect-based login (รองรับทั้ง iOS/Android/PC)
# ============================================================
@router.get("/login")
async def login(
    request: Request,
    mac: str = None,
    ip: str = None,
    url: str = None,
    magic: str = None,
    fw_ip: str = None,
    auth_url: str = None,
    qr_session: str = None,   # ← QR Flow: session_id จาก QR Code
    URL: str = None,
):
    """Initiate the ThaID OAuth2 Login Flow. Supports Captive Portal parameters and QR session."""
    qr_sessions = request.app.state.qr_sessions
    cleanup_expired_sessions(qr_sessions)

    # Dynamic FortiGate Host resolution
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

    # Extract client real IP (ignore if it is a hostname like 'auth.dtam.moph.go.th')
    real_ip = ""
    if ip and not any(c.isalpha() for c in ip):
        real_ip = ip

    if not real_ip:
        x_forwarded_for = request.headers.get("x-forwarded-for")
        if x_forwarded_for:
            real_ip = x_forwarded_for.split(",")[0].strip()
        else:
            real_ip = request.headers.get("x-real-ip") or (request.client.host if request.client else "")

    # บันทึก session ลงใน In-Memory qr_sessions store ผูกกับ state UUID
    # ป้องกัน Session Cookie หายเมื่อ iOS สลับจาก CNA (Captive Network Assistant) -> ThaiD App -> Safari
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

    if qr_session:
        logger.info(f"QR Login initiated for session: {qr_session}")

    redirect_uri = THAID_CALLBACK_ENDPOINT if THAID_CALLBACK_ENDPOINT else str(request.url_for('auth_callback'))
    if redirect_uri.startswith("http://") and "dtam.moph.go.th" in redirect_uri:
        redirect_uri = redirect_uri.replace("http://", "https://", 1)

    thaid_url = build_thaid_auth_url(session_id, redirect_uri)
    logger.info(f"Initiating login for session: {session_id}, redirecting to: {thaid_url}")
    return RedirectResponse(url=thaid_url)


# ============================================================
# ENDPOINT: GET /api/auth/callback
# ThaiD จะ Redirect กลับมาที่นี่หลัง User สแกน QR / อนุมัติสิทธิ์
# ============================================================
@router.get("/callback")
async def auth_callback(request: Request, response: Response):
    """
    Handle the callback after successful ThaID login.
    รองรับทั้ง QR Flow และ redirect flow โดยไม่พึ่งพา Cookie บน iOS
    """
    code = request.query_params.get("code")
    state = request.query_params.get("state")

    if not state:
        logger.error("No state found in callback query parameters.")
        return RedirectResponse(url=f"{FRONTEND_URL}/?error=no_state")

    qr_sessions = request.app.state.qr_sessions
    sess = qr_sessions.get(state, {})
    flow = sess.get("flow", "redirect")

    # ดึง redirect_uri ตัวเดียวกันกับตอนส่งขอสิทธิ์
    redirect_uri = THAID_CALLBACK_ENDPOINT if THAID_CALLBACK_ENDPOINT else str(request.url_for('auth_callback'))
    if redirect_uri.startswith("http://") and "dtam.moph.go.th" in redirect_uri:
        redirect_uri = redirect_uri.replace("http://", "https://", 1)

    user_info = None

    # แลก Authorization Code เป็น Access Token และดึง UserInfo โดยตรงผ่าน REST API (ไม่พึ่งพา Session Cookie บน iOS)
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

            # ดึงข้อมูล User Info ด้วย Access Token
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
        import traceback
        traceback.print_exc()
        if state in qr_sessions:
            qr_sessions[state]["status"] = "error"
        return RedirectResponse(url=f"{FRONTEND_URL}/?error=manual_exchange_exception&detail={str(e)}")

    pid = user_info.get('pid') or user_info.get('sub', '')
    logger.info(f"ThaiD Callback success! PID: {pid}")

    # กำหนด Username ให้เป็นเลขบัตรประชาชน (PID) สำหรับบันทึกในระบบ Firewall & ClearPass
    username = pid
    logger.info(f"Using PID as username for Firewall & ClearPass: '{username}'")




    # สร้าง JWT session token
    jwt_token = create_jwt_token({"user": user_info})

    # กำหนด password เริ่มต้นตาม pattern 3Th6ofvN
    password = generate_pattern_password(pid)

    # ซิงก์บัญชีผู้ใช้ใน ClearPass Guest Database (สร้างใหม่พร้อมชื่อ-นามสกุล หรือ อัปเดตสถานะและรหัสผ่าน)
    if CPPM_HOST and CPPM_CLIENT_ID:
        cppm_ok = await sync_cppm_user(username, password, user_info)
        if not cppm_ok:
            logger.warning(f"ClearPass sync for '{username}' did not complete, proceeding with login flow.")
    else:
        logger.warning("ClearPass settings missing on server.")

    # ============================================================
    # ดึง Captive Portal Data จาก State Session (ไม่พึ่งพา Cookie บน iOS)
    captive_data = {
        "mac": sess.get("mac") or request.session.get("guest_mac", ""),
        "ip": sess.get("ip") or request.session.get("guest_ip", ""),
        "original_url": sess.get("original_url") or request.session.get("original_url", ""),
        "magic": sess.get("magic") or request.session.get("fortigate_magic", ""),
        "fw_ip": sess.get("fw_ip") or request.session.get("fortigate_ip", FORTIGATE_IP),
        "auth_url": sess.get("auth_url") or request.session.get("auth_url", ""),
    }

    # ยิง FortiGate REST API ในเบื้องหลังคู่ขนานเพื่อการันตีการเปิดสิทธิ์ 100%
    client_ip = captive_data.get("ip")
    if client_ip and FORTIGATE_API_TOKEN:
        logger.info(f"Triggering background FortiGate REST API Auth for username '{username}' and IP '{client_ip}'")
        asyncio.create_task(authenticate_fortigate_api(username, client_ip))

    # ============================================================
    # QR Flow vs Direct Flow Branching
    # ============================================================
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
        return HTMLResponse(content=html_content)

    else:
        # --- Standard Direct Flow (กรณี iOS / iPhone / Android บนเครื่องเดียวกัน) ---
        logger.info("Processing standard Direct Flow callback HTML generator")
        
        user_info_json = json.dumps(user_info, ensure_ascii=False)
        magic = captive_data.get("magic", "")
        ip = captive_data.get("ip", "")
        mac = captive_data.get("mac", "")
        fw_ip = captive_data.get("fw_ip", FORTIGATE_IP)
        original_url = captive_data.get("original_url", "")
        
        # Determine dynamic FortiGate POST action URL
        auth_action_url = captive_data.get("auth_url")
        if not auth_action_url or "api-gateway" in auth_action_url or not auth_action_url.endswith("/fgtauth"):
            clean_fw_host = (captive_data.get("fw_ip") or FORTIGATE_IP).split(":")[0]
            if "api-gateway" in clean_fw_host:
                clean_fw_host = FORTIGATE_IP.split(":")[0]
            if FORTIGATE_AUTH_PORT and str(FORTIGATE_AUTH_PORT) not in ["443", "80", "0"]:
                auth_action_url = f"https://{clean_fw_host}:{FORTIGATE_AUTH_PORT}{FORTIGATE_AUTH_PATH}"
            else:
                auth_action_url = f"https://{clean_fw_host}{FORTIGATE_AUTH_PATH}"

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
      background: white; border-radius: 20px; padding: 40px 32px;
      text-align: center; max-width: 380px; width: 100%;
      box-shadow: 0 20px 60px rgba(0,0,0,0.3);
    }}
    .spinner {{
      width: 50px; height: 50px; border: 5px solid #eff6ff;
      border-top-color: #0F3A6C; border-radius: 50%;
      animation: spin 1s infinite linear; margin: 0 auto 24px;
    }}
    @keyframes spin {{ 0% {{ transform: rotate(0deg); }} 100% {{ transform: rotate(360deg); }} }}
    h1 {{ color: #0F3A6C; font-size: 22px; font-weight: 700; margin-bottom: 12px; }}
    p {{ color: #6b7280; font-size: 15px; line-height: 1.6; }}
  </style>
  <script>
    window.onload = function() {{
      try {{
        // 1. บันทึกข้อมูล captive_params ลง localStorage
        const captiveData = {{
          mac: {json.dumps(mac)},
          ip: {json.dumps(ip)},
          url: {json.dumps(original_url)},
          magic: {json.dumps(magic)},
          fw_ip: {json.dumps(fw_ip)},
          auth_url: {json.dumps(auth_action_url)}
        }};
        localStorage.setItem('captive_params', JSON.stringify(captiveData));

        // 2. บันทึกข้อมูล thaid_success_data ลง localStorage
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

      // 3. ยิงคำขอยืนยันตัวตนไปยัง FortiGate (ใช้ทั้ง fetch no-cors และ form submit เพื่อรองรับทุกเบราว์เซอร์รวมถึง iOS Safari)
      const magicVal = {json.dumps(magic)};
      const authUrl = {json.dumps(auth_action_url)};
      const uVal = {json.dumps(username)};
      const pVal = {json.dumps(password)};

      if (magicVal && authUrl) {{
        // ส่งผ่าน fetch API (โหมด no-cors) ซึ่ง iOS Safari อนุญาตให้ส่งคำขอไปยังพอร์ต :1442
        try {{
          const postBody = new URLSearchParams();
          postBody.append('magic', magicVal);
          postBody.append('username', uVal);
          postBody.append('password', pVal);
          fetch(authUrl, {{
            method: 'POST',
            body: postBody,
            mode: 'no-cors'
          }}).catch(function(e) {{ console.log('fetch handled', e); }});
        }} catch(err) {{}}

        // ยิงผ่าน form submit เสริมอีกทางหนึ่ง
        try {{
          const form = document.getElementById('auth_form');
          if (form) form.submit();
        }} catch(e) {{}}
      }}

      // 4. นำทางหน้าต่างหลักไปยังหน้า Keepalive อัตโนมัติในอีก 1.5 วินาที
      setTimeout(function() {{
        window.location.href = '/keepalive';
      }}, 1800);
    }};
  </script>
</head>
<body>
  <!-- Iframe สำหรับรับการตอบกลับจาก FortiGate โดยไม่รบกวนหน้าต่างหลักของ iOS Safari -->
  <iframe id="auth_iframe" name="auth_iframe" style="display: none;"></iframe>

  <form id="auth_form" method="POST" action="{auth_action_url}" target="auth_iframe" style="display: none;">
    <input type="hidden" name="magic" value="{magic}" />
    <input type="hidden" name="username" value="{username}" />
    <input type="hidden" name="password" value="{password}" />
  </form>

  <div class="card">
    <div class="spinner"></div>
    <h1>กำลังเชื่อมต่ออินเทอร์เน็ต</h1>
    <p>ระบบตรวจสอบสิทธิ์สำเร็จแล้ว กำลังยืนยันตัวตนกับเครือข่าย...</p>
    <a href="/keepalive" style="display:inline-block;margin-top:20px;color:#0F3A6C;font-size:13px;text-decoration:none;">คลิกที่นี่หากหน้าจอไม่เปลี่ยนอัตโนมัติ</a>
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

# ENDPOINT: POST /api/auth/logout
# ============================================================
@router.post("/logout")
async def logout(request: Request, response: Response):
    """Clear the auth cookie and de-authenticate the session from FortiGate."""
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
