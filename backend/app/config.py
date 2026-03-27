import os
from dotenv import load_dotenv

load_dotenv()

THAID_CLIENT_ID = os.getenv("THAID_CLIENT_ID", "")
THAID_CLIENT_SECRET = os.getenv("THAID_CLIENT_SECRET", "")
THAID_API_KEY = os.getenv("THAID_API_KEY", "")
THAID_CALLBACK_ENDPOINT = os.getenv("THAID_CALLBACK_ENDPOINT", "")
JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", "secret-key")
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")
THAID_WELL_KNOWN_URL = 'https://imauthsbx.bora.dopa.go.th/.well-known/openid-configuration'
APP_PORT = int(os.getenv("PORT", "8000"))
