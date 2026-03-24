from fastapi import APIRouter, Request, HTTPException
import jwt
from app.config import JWT_SECRET_KEY

router = APIRouter()

def get_current_user(request: Request):
    token = request.cookies.get("auth_token")
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = jwt.decode(token, JWT_SECRET_KEY, algorithms=["HS256"])
        return payload.get("user")
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

@router.get("/me")
async def get_me(request: Request):
    """
    Endpoint to fetch the currently authenticated user's information.
    Required cookie: auth_token
    """
    user = get_current_user(request)
    return {"user": user}
