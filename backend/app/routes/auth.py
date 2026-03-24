from fastapi import APIRouter, Request, Response
from fastapi.responses import RedirectResponse
from authlib.integrations.starlette_client import OAuth
from app.config import THAID_CLIENT_ID, THAID_CLIENT_SECRET, THAID_WELL_KNOWN_URL, FRONTEND_URL, JWT_SECRET_KEY
import jwt
from datetime import datetime, timedelta, timezone

router = APIRouter()
oauth = OAuth()

# Configure the ThaID OAuth Client
oauth.register(
    name='thaid',
    server_metadata_url=THAID_WELL_KNOWN_URL,
    client_id=THAID_CLIENT_ID,
    client_secret=THAID_CLIENT_SECRET,
    client_kwargs={
        'scope': 'openid pid address gender birthdate given_name middle_name family_name name given_name_en middle_name_en family_name_en name_en title title_en ial smartcard_code date_of_expiry date_of_issuance'
    }
)

def create_jwt_token(data: dict):
    """
    Generate an internal JWT for session management.
    """
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(hours=2)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, JWT_SECRET_KEY, algorithm="HS256")

@router.get("/login")
async def login(request: Request):
    """
    Initiate the ThaID OAuth2 Login Flow.
    """
    # Redirect back to the local backend /api/auth/callback
    redirect_uri = str(request.url_for('auth_callback'))
    return await oauth.thaid.authorize_redirect(request, redirect_uri)

@router.get("/callback")
async def auth_callback(request: Request, response: Response):
    """
    Handle the callback after successful or failed ThaID login.
    """
    # Obtain the access token and user info from ThaID
    token = await oauth.thaid.authorize_access_token(request)
    user_info = token.get('userinfo')
    
    if not user_info:
        return RedirectResponse(url=f"{FRONTEND_URL}/?error=no_userinfo")

    # Generate an internal JWT session token
    # We embed the whole user_info dictionary to be decoded later
    jwt_token = create_jwt_token({"user": user_info})
    
    # Redirect to the frontend Dashboard
    res = RedirectResponse(url=f"{FRONTEND_URL}/dashboard")
    
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
