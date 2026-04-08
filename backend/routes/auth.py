from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, EmailStr
from datetime import datetime
import uuid
from database import users_col
from auth_utils import hash_password, verify_password, create_access_token

router = APIRouter()

class SignupRequest(BaseModel):
    username: str
    email: EmailStr
    password: str
    sex: str  # "masculino" | "femenino"

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

@router.post("/signup", status_code=201)
async def signup(data: SignupRequest):
    existing = await users_col.find_one({"email": data.email})
    if existing:
        raise HTTPException(status_code=400, detail="El email ya está registrado")

    user_id = "VIA-" + str(uuid.uuid4())[:8].upper()
    user_doc = {
        "_id": user_id,
        "username": data.username,
        "email": data.email,
        "password_hash": hash_password(data.password),
        "sex": data.sex,
        "created_at": datetime.utcnow(),
    }
    await users_col.insert_one(user_doc)
    token = create_access_token({"sub": user_id})
    return {"token": token, "user_id": user_id, "username": data.username}

@router.post("/login")
async def login(data: LoginRequest):
    user = await users_col.find_one({"email": data.email})
    if not user or not verify_password(data.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Credenciales incorrectas")
    token = create_access_token({"sub": user["_id"]})
    return {"token": token, "user_id": user["_id"], "username": user["username"]}
