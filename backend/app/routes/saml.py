from fastapi import APIRouter, Request, Response
from fastapi.responses import RedirectResponse, HTMLResponse
import urllib.parse
from app.config import FRONTEND_URL
import logging

logger = logging.getLogger("thaid-auth")
router = APIRouter()

# In-Memory SAML Session Store (สำหรับใช้ระหว่างรอผู้ใช้สแกน QR)
saml_sessions = {}

@router.get("/login")
async def saml_login(request: Request):
    """
    รับ SAMLRequest จาก FortiGate
    แล้ว Redirect ผู้ใช้ไปที่หน้าจอ QR Code (Frontend)
    """
    saml_request = request.query_params.get("SAMLRequest")
    relay_state = request.query_params.get("RelayState", "")
    
    if not saml_request:
        logger.error("Missing SAMLRequest in query parameters")
        return HTMLResponse("<h1>Error: Missing SAMLRequest</h1>", status_code=400)
    
    # ส่งต่อ SAMLRequest และ RelayState ไปยัง Frontend 
    # เพื่อให้ Frontend แนบค่าเหล่านี้มาตอนสร้าง QR Session
    redirect_url = f"{FRONTEND_URL}/?saml_request={urllib.parse.quote(saml_request)}&relay_state={urllib.parse.quote(relay_state)}"
    return RedirectResponse(url=redirect_url)
