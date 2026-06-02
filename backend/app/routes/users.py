from fastapi import APIRouter, Request, HTTPException
import jwt
import httpx
import logging
import json
from pydantic import BaseModel
from typing import Optional
from app.config import (
    JWT_SECRET_KEY,
    CPPM_HOST,
    CPPM_CLIENT_ID,
    CPPM_CLIENT_SECRET
)

logger = logging.getLogger("thaid-auth")
router = APIRouter()

class GuestCreateRequest(BaseModel):
    username: str
    password: str
    visitor_name: str
    expire_after: int  # in minutes
    notes: Optional[str] = "Manually created guest user"

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

@router.post("/create-guest")
async def create_guest(req_data: GuestCreateRequest):
    """
    สร้าง Guest Account ใน ClearPass Policy Manager (CPPM) โดยตรง
    """
    if not CPPM_HOST or not CPPM_CLIENT_ID or not CPPM_CLIENT_SECRET:
        logger.error("ClearPass configuration missing on server.")
        raise HTTPException(status_code=500, detail="ระบบไม่ได้กำหนดค่าเชื่อมต่อ ClearPass Policy Manager กรุณาแจ้งผู้ดูแลระบบ")

    logger.info(f"Manually creating CPPM guest: '{req_data.username}', Name: '{req_data.visitor_name}'")

    try:
        async with httpx.AsyncClient(verify=False) as client:
            # 1. แลก Access Token ของ ClearPass API
            token_url = f"https://{CPPM_HOST}/api/oauth"
            token_data = {
                "grant_type": "client_credentials",
                "client_id": CPPM_CLIENT_ID,
                "client_secret": CPPM_CLIENT_SECRET
            }
            logger.info(f"Fetching ClearPass API Token from {token_url}")
            token_res = await client.post(token_url, data=token_data, timeout=10)
            
            if token_res.status_code != 200:
                logger.error(f"Failed to get ClearPass access token: {token_res.text}")
                raise HTTPException(status_code=500, detail="ไม่สามารถเชื่อมต่อระบบยืนยันสิทธิ์กับ ClearPass ได้ (Token Exchange Failed)")

            access_token = token_res.json().get("access_token")
            if not access_token:
                logger.error("No access_token found in ClearPass oauth response.")
                raise HTTPException(status_code=500, detail="ไม่สามารถเชื่อมต่อ ClearPass ได้ (Access Token Missing)")

            # 2. ส่งคำร้องสร้าง Guest User ใน ClearPass
            user_url = f"https://{CPPM_HOST}/api/guest"
            user_payload = {
                "enabled": True,
                "username": req_data.username.strip(),
                "password": req_data.password,
                "visitor_name": req_data.visitor_name.strip(),
                "notes": req_data.notes or "สร้างจากหน้าพอร์ทัลแอดมินด้วยผู้ใช้ทั่วไป",
                "expire_after": req_data.expire_after,  # หน่วยนาที
                "role_id": 2  # Guest Role ID ใน ClearPass
            }

            headers = {
                "Authorization": f"Bearer {access_token}",
                "Content-Type": "application/json"
            }

            logger.info(f"Sending Guest User payload to ClearPass Guest API: {user_url}")
            user_res = await client.post(user_url, json=user_payload, headers=headers, timeout=15)

            logger.info(f"ClearPass response status: {user_res.status_code}")
            
            if user_res.status_code == 201:
                logger.info(f"Successfully created guest user {req_data.username} in ClearPass.")
                return {"status": "success", "message": f"สร้างบัญชี {req_data.username} ใน ClearPass สำเร็จ"}
            elif user_res.status_code == 409:
                logger.warning(f"Guest user {req_data.username} already exists in ClearPass.")
                raise HTTPException(status_code=400, detail="ชื่อผู้ใช้งานนี้มีอยู่ในระบบแล้ว กรุณาใช้ชื่อผู้ใช้บริการอื่น")
            else:
                logger.error(f"ClearPass Guest creation failed: {user_res.text}")
                raise HTTPException(status_code=500, detail=f"เกิดข้อผิดพลาดจาก ClearPass API: {user_res.text}")

    except httpx.RequestError as e:
        logger.error(f"HTTP Connection error to ClearPass: {str(e)}")
        raise HTTPException(status_code=500, detail=f"ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ ClearPass ได้ชั่วคราว: {str(e)}")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Unexpected error creating CPPM user: {str(e)}")
        raise HTTPException(status_code=500, detail=f"เกิดข้อผิดพลาดที่คาดไม่ถึง: {str(e)}")


class GuestLoginRequest(BaseModel):
    username: str
    password: str

@router.post("/login-guest")
async def login_guest(req_data: GuestLoginRequest, request: Request):
    """
    ล็อกอินบัญชีเกสท์ชั่วคราว (Manual Guest)
    1. ตรวจสอบชื่อผู้ใช้งานและรหัสผ่านกับ ClearPass
    2. หากถูกต้อง จะยิง FortiGate REST API เพื่อเปิดสิทธิ์การใช้งานให้อินเทอร์เน็ตทันที
    """
    username = req_data.username.strip()
    password = req_data.password.strip()

    # ดึง IP ไคลเอนต์จริง
    client_ip = ""
    x_forwarded_for = request.headers.get("x-forwarded-for")
    if x_forwarded_for:
        client_ip = x_forwarded_for.split(",")[0].strip()
    else:
        client_ip = request.headers.get("x-real-ip") or (request.client.host if request.client else "")

    if not client_ip:
        raise HTTPException(status_code=400, detail="ไม่พบหมายเลข IP ของไคลเอนต์ ไม่สามารถเปิดสิทธิ์เน็ตได้")

    if not CPPM_HOST or not CPPM_CLIENT_ID or not CPPM_CLIENT_SECRET:
        raise HTTPException(status_code=500, detail="ระบบหลังบ้านไม่ได้ตั้งค่า ClearPass")

    try:
        async with httpx.AsyncClient(verify=False) as client:
            token_url = f"https://{CPPM_HOST}/api/oauth"
            
            # ดึง Access token ของระบบหลักก่อน
            token_data = {
                "grant_type": "client_credentials",
                "client_id": CPPM_CLIENT_ID,
                "client_secret": CPPM_CLIENT_SECRET
            }
            token_res = await client.post(token_url, data=token_data, timeout=10)
            if token_res.status_code != 200:
                raise HTTPException(status_code=500, detail="ไม่สามารถเชื่อมต่อ ClearPass API ได้")

            access_token = token_res.json().get("access_token")
            
            # ดึงข้อมูล Guest user เพื่อมาตรวจสอบ
            user_url = f"https://{CPPM_HOST}/api/guest/username/{username}"
            headers = {"Authorization": f"Bearer {access_token}"}
            user_res = await client.get(user_url, headers=headers, timeout=10)
            
            if user_res.status_code != 200:
                raise HTTPException(status_code=400, detail="ชื่อผู้ใช้งานหรือรหัสผ่านคูปองไม่ถูกต้อง")

            user_data = user_res.json()
            
            # ตรวจสอบความถูกต้องของรหัสผ่าน
            db_password = user_data.get("password") or user_data.get("cleartext_password")
            if not db_password or db_password != password:
                raise HTTPException(status_code=400, detail="รหัสผ่านคูปองไม่ถูกต้อง")

            # ตรวจสอบว่าบัญชีเปิดใช้งานอยู่หรือไม่ (enabled)
            if not user_data.get("enabled", True):
                raise HTTPException(status_code=400, detail="บัญชีผู้ใช้งานนี้ถูกระงับการใช้งานชั่วคราว")

            # 2. บัญชีถูกต้อง! ยิง FortiGate REST API เพื่อเปิดสิทธิ์การใช้งาน
            from app.routes.auth import authenticate_fortigate_api
            logger.info(f"Guest login success for '{username}', activating IP {client_ip} via FortiGate REST API")
            
            fw_success = await authenticate_fortigate_api(username, client_ip)
            if not fw_success:
                logger.warning(f"FortiGate API activation returned fail for IP {client_ip}")
            
            # ดึงข้อมูล visitor_name มาส่งให้ frontend บันทึก
            visitor_name = user_data.get("visitor_name", "ผู้ใช้งานชั่วคราว (Guest)")
            
            return {
                "status": "success",
                "username": username,
                "visitor_name": visitor_name,
                "client_ip": client_ip
            }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error authenticating guest: {str(e)}")
        raise HTTPException(status_code=500, detail=f"เกิดข้อผิดพลาดในการตรวจสอบบัญชีกับ ClearPass: {str(e)}")


