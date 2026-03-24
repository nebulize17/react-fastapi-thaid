from fastapi import FastAPI
from starlette.middleware.sessions import SessionMiddleware
from starlette.middleware.cors import CORSMiddleware
import os
from dotenv import load_dotenv

from app.routes import auth, users

load_dotenv()

app = FastAPI(title="ThaID Auth API")

# We need session middleware for Authlib's OAuth implementation
app.add_middleware(SessionMiddleware, secret_key=os.getenv("JWT_SECRET_KEY", "super-secret"))
app.add_middleware(
    CORSMiddleware,
    allow_origins=[os.getenv("FRONTEND_URL", "http://localhost:5173")],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(users.router, prefix="/api/users", tags=["users"])

@app.get("/")
def root():
    return {"message": "ThaID Auth API is running"}
