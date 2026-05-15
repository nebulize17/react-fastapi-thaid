from fastapi import APIRouter, Request, Response
from fastapi.responses import RedirectResponse, HTMLResponse
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
    CPPM_LOGIN_URL
)
import jwt
import logging
import httpx
from datetime import datetime, timedelta, timezone

logger = logging.getLogger("thaid-auth")

router = APIRouter()
oauth = OAuth()

# ถ้ามี API Key จะส่งไปใน header ของ request ด้วยเผื่อ DTAM Gateway หรือ BORA ต้องการ
client_kwargs = {
    'scope': 'openid pid',
    'token_endpoint_auth_method': 'client_secret_post'
}
if THAID_API_KEY:
    # เพิ่ม API Key ลงใน headers เผื่อกรณีใช้ผ่าน DTAM API Gateway
    client_kwargs['headers'] = {'x-api-key': THAID_API_KEY}

# Configure the ThaID OAuth Client
oauth.register(
    name='thaid',
    server_metadata_url=THAID_WELL_KNOWN_URL,
    client_id=THAID_CLIENT_ID,
    client_secret=THAID_CLIENT_SECRET,
    client_kwargs=client_kwargs
)

def create_jwt_token(data: dict):
    """
    Generate an internal JWT for session management.
    """
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(hours=2)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, JWT_SECRET_KEY, algorithm="HS256")

async def create_cppm_user(pid: str):
    """
    Create a guest account in Aruba ClearPass using the PID as username.
    """
    if not CPPM_HOST or not CPPM_CLIENT_ID:
        logger.warning("ClearPass configuration missing. Skipping user creation.")
        return False

    try:
        async with httpx.AsyncClient(verify=False) as client:
            # 1. Get OAuth Token from ClearPass
            token_url = f"https://{CPPM_HOST}/api/oauth"
            token_data = {
                "grant_type": "client_credentials",
                "client_id": CPPM_CLIENT_ID,
                "client_secret": CPPM_CLIENT_SECRET
            }
            token_res = await client.post(token_url, data=token_data)
            token_res.raise_for_status()
            access_token = token_res.json().get("access_token")

            # 2. Create/Update Guest User
            # We use PID as both username and password for simplicity in this demo
            user_url = f"https://{CPPM_HOST}/api/guest"
            user_payload = {
                "enabled": True,
                "username": pid,
                "password": pid,
                "visitor_name": f"ThaiD User {pid}",
                "expire_after": 480, # 8 hours
                "role_id": 2 # Guest Role ID
            }
            headers = {"Authorization": f"Bearer {access_token}"}
            user_res = await client.post(user_url, json=user_payload, headers=headers)
            
            # If user already exists (409), we might want to update or just ignore
            if user_res.status_code in [201, 200, 409]:
                logger.info(f"ClearPass user {pid} created or already exists.")
                return True
            else:
                logger.error(f"ClearPass User Creation Failed: {user_res.text}")
                return False
    except Exception as e:
        logger.error(f"Error connecting to ClearPass: {str(e)}")
        return False

@router.get("/login")
async def login(request: Request, mac: str = None, ip: str = None, url: str = None, magic: str = None, fw_ip: str = None):
    """
    Initiate the ThaID OAuth2 Login Flow. Supports Captive Portal parameters.
    """
    # Store parameters in session to use after successful callback
    if mac: request.session['guest_mac'] = mac
    if ip: request.session['guest_ip'] = ip
    if url: request.session['original_url'] = url
    if magic: request.session['fortigate_magic'] = magic
    if fw_ip: request.session['fortigate_ip'] = fw_ip

    # ถ้ามีการกำหนด THAID_CALLBACK_ENDPOINT จาก DTAM ให้ใช้ค่านั้นเป็น redirect_uri หลัก
    redirect_uri = THAID_CALLBACK_ENDPOINT if THAID_CALLBACK_ENDPOINT else str(request.url_for('auth_callback'))
    
    # Force HTTPS for DTAM gateway if it's somehow getting http
    if THAID_CALLBACK_ENDPOINT and THAID_CALLBACK_ENDPOINT.startswith("https://"):
        redirect_uri = redirect_uri.replace("http://", "https://", 1)
        
    logger.info(f"Initiating login with redirect_uri: {redirect_uri}")
    return await oauth.thaid.authorize_redirect(request, redirect_uri)

@router.get("/callback")
async def auth_callback(request: Request, response: Response):
    """
    Handle the callback after successful or failed ThaID login.
    """
    try:
        # ดึง redirect_uri มาใช้ยืนยันอีกครั้ง (ต้องเหมือนกับตอนส่งไปตอนแรกเป๊ะ)
        redirect_uri = THAID_CALLBACK_ENDPOINT if THAID_CALLBACK_ENDPOINT else str(request.url_for('auth_callback'))
        if redirect_uri.startswith("http://") and "dtam.moph.go.th" in redirect_uri:
            redirect_uri = redirect_uri.replace("http://", "https://", 1)

        # Obtain the access token and user info from ThaID
        # ระบุ redirect_uri ลงไปตรงๆ เพื่อป้องกันปัญหา Gateway สลับ http/https
        token = await oauth.thaid.authorize_access_token(request)
        user_info = token.get('userinfo')
        
        if not user_info:
            logger.error("No userinfo found in token.")
            return RedirectResponse(url=f"{FRONTEND_URL}/?error=no_userinfo")

    except Exception as e:
        # พิมพ์ Error ลง Console เพื่อให้เช็คผ่าน Docker Logs ได้
        print(f"Auth Callback Error: {str(e)}")
        import traceback
        traceback.print_exc()
        return RedirectResponse(url=f"{FRONTEND_URL}/?error=callback_failed&detail={str(e)}")

    # Generate an internal JWT session token
    # We embed the whole user_info dictionary to be decoded later
    jwt_token = create_jwt_token({"user": user_info})
    
    # Retrieve Captive Portal parameters from session
    original_url = request.session.get('original_url')
    fortigate_magic = request.session.get('fortigate_magic')
    fortigate_ip = request.session.get('fortigate_ip')
    
    # Create ClearPass User (Optional)
    cppm_success = await create_cppm_user(user_info.get('pid'))
    
    # Check if this is a FortiGate authentication request
    if fortigate_magic and fortigate_ip:
        logger.info(f"FortiGate handover detected for {user_info.get('pid')}")
        # Return auto-submit form to FortiGate
        html_content = f"""
        <html>
        <head><title>Connecting to Wi-Fi...</title></head>
        <body onload="document.forms[0].submit()">
            <form method="POST" action="https://{fortigate_ip}:1000/fgtauth">
                <input type="hidden" name="magic" value="{fortigate_magic}">
                <input type="hidden" name="username" value="{user_info.get('pid')}">
                <input type="hidden" name="answer" value="1">
            </form>
            <div style="text-align:center; margin-top:50px; font-family: sans-serif;">
                <h2>ยืนยันตัวตนสำเร็จ</h2>
                <p>กำลังเชื่อมต่ออินเทอร์เน็ต กรุณารอสักครู่...</p>
            </div>
        </body>
        </html>
        """
        res = HTMLResponse(content=html_content)
    else:
        # Determine final redirect URL for non-FortiGate cases
        if cppm_success and CPPM_LOGIN_URL:
            target_url = f"{CPPM_LOGIN_URL}?user={user_info.get('pid')}&password={user_info.get('pid')}&submit=Login"
        else:
            target_url = original_url if original_url else f"{FRONTEND_URL}/dashboard"

        logger.info(f"Login success for {user_info.get('name')}. Redirecting to: {target_url}")
        res = RedirectResponse(url=target_url)
    
    # Store the JWT token securely in a HttpOnly cookie
    res.set_cookie(
        key="auth_token",
        value=jwt_token,
        httponly=True,
        samesite="lax",
        max_age=7200 # 2 hours
    )
    
    return res

@router.post("/logout")
async def logout(response: Response):
    """
    Clear the auth cookie and logout the user.
    """
    # Provide a simple JSON response or redirect; here we redirect to frontend home
    res = RedirectResponse(url=f"{FRONTEND_URL}/")
    res.delete_cookie("auth_token")
    return res
