import os
from dotenv import load_dotenv

load_dotenv()

THAID_CLIENT_ID = os.getenv("THAID_CLIENT_ID", "")
THAID_CLIENT_SECRET = os.getenv("THAID_CLIENT_SECRET", "")
THAID_API_KEY = os.getenv("THAID_API_KEY", "")
THAID_CALLBACK_ENDPOINT = os.getenv("THAID_CALLBACK_ENDPOINT", "")
JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", "secret-key")
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")
THAID_WELL_KNOWN_URL = 'https://imauth.bora.dopa.go.th/.well-known/openid-configuration'
APP_PORT = int(os.getenv("PORT", "8000"))

# ClearPass Settings
CPPM_HOST = os.getenv("CLEARPASS_HOST", "")
CPPM_CLIENT_ID = os.getenv("CLEARPASS_CLIENT_ID", "")
CPPM_CLIENT_SECRET = os.getenv("CLEARPASS_CLIENT_SECRET", "")
CPPM_LOGIN_URL = os.getenv("CLEARPASS_LOGIN_URL", "")

# FortiGate Captive Portal Settings
FORTIGATE_IP = os.getenv("FORTIGATE_IP", "192.168.254.253")
FORTIGATE_AUTH_PORT = int(os.getenv("FORTIGATE_AUTH_PORT", "1000"))
FORTIGATE_AUTH_PATH = os.getenv("FORTIGATE_AUTH_PATH", "/fgtauth")

# FortiGate REST API Settings
FORTIGATE_API_TOKEN = os.getenv("FORTIGATE_API_TOKEN", "")
FORTIGATE_AUTH_SERVER = os.getenv("FORTIGATE_AUTH_SERVER", "local")

# QR Session Settings
QR_SESSION_TTL_SECONDS = int(os.getenv("QR_SESSION_TTL_SECONDS", "300"))
