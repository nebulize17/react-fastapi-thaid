from fastapi import FastAPI
from starlette.middleware.sessions import SessionMiddleware
from starlette.middleware.cors import CORSMiddleware
from uvicorn.middleware.proxy_headers import ProxyHeadersMiddleware
import os
from dotenv import load_dotenv
from fastapi import FastAPI

from app.routes import auth, users

load_dotenv()

app = FastAPI(title="ThaID Auth API")

# Standard proxy headers middleware
app.add_middleware(ProxyHeadersMiddleware, trusted_hosts="*")

# Custom fix for cases where X-Forwarded-Proto might be missing but we know we're on HTTPS
class ForceSchemeMiddleware:
    def __init__(self, app):
        self.app = app

    async def __call__(self, scope, receive, send):
        if scope["type"] == "http":
            callback_url = os.getenv("THAID_CALLBACK_ENDPOINT", "")
            # Force HTTPS if the callback endpoint is HTTPS
            if callback_url.startswith("https://"):
                scope["scheme"] = "https"
        return await self.app(scope, receive, send)

# We need session middleware for Authlib's OAuth implementation
# ตั้งค่าให้รองรับการทำงานผ่าน Proxy HTTPS (เปิด https_only เฉพาะเมื่อ callback เป็น https)
callback_url = os.getenv("THAID_CALLBACK_ENDPOINT", "")
app.add_middleware(
    SessionMiddleware, 
    secret_key=os.getenv("JWT_SECRET_KEY", "super-secret"),
    session_cookie="thaid_session",
    same_site="lax",
    https_only=True if callback_url.startswith("https://") else False
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[os.getenv("FRONTEND_URL", "http://localhost:5173")],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(users.router, prefix="/api/users", tags=["users"])

# เพิ่ม Middleware ครอบทุกอย่าง (ชั้นนอกสุด) ไว้เปลี่ยน request scheme เป็น https ให้ถูกต้อง
app.add_middleware(ForceSchemeMiddleware)

@app.get("/")
def root():
    return {"message": "ThaID Auth API is running"}
