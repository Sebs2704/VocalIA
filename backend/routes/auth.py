from fastapi import APIRouter, HTTPException, Header, status
from pydantic import BaseModel, EmailStr
from datetime import datetime, timedelta
from typing import Optional
import uuid, secrets
from database import users_col, resets_col, posts_col, notifs_col
from auth_utils import hash_password, verify_password, create_access_token
from config import settings

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
    try:
        user = await users_col.find_one({"email": data.email})
    except Exception:
        raise HTTPException(status_code=503, detail="Error de conexión con la base de datos. Intenta de nuevo.")
    if not user or not verify_password(data.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Credenciales incorrectas")
    token = create_access_token({"sub": user["_id"]})
    return {
        "token":       token,
        "user_id":     user["_id"],
        "username":    user["username"],
        "sex":         user["sex"],
        "photo":       user.get("photo"),
        "bio":         user.get("bio", ""),
        "voice_range": user.get("voice_range"),
    }


class UpdateProfileRequest(BaseModel):
    username: Optional[str] = None
    photo: Optional[str] = None  # URL or base64
    bio: Optional[str] = None
    voice_range: Optional[dict] = None      # {min_freq, max_freq, base_freq, min_note, max_note, base_note}
    remove_voice_range: bool = False        # True → clear voice_range from profile


@router.put("/profile")
async def update_profile(data: UpdateProfileRequest, authorization: Optional[str] = Header(None)):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="No autenticado")
    from jose import jwt, JWTError
    try:
        token = authorization.split(" ", 1)[1]
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        uid = payload.get("sub")
    except JWTError:
        raise HTTPException(status_code=401, detail="Token inválido")

    update: dict = {}
    if data.username is not None:
        if len(data.username.strip()) < 2:
            raise HTTPException(status_code=400, detail="El nombre debe tener al menos 2 caracteres")
        update["username"] = data.username.strip()
    if data.photo is not None:
        update["photo"] = data.photo
        await posts_col.update_many({"user_id": uid}, {"$set": {"user_photo": data.photo}})
        await notifs_col.update_many({"from_user_id": uid}, {"$set": {"from_photo": data.photo}})
    if data.bio is not None:
        update["bio"] = data.bio[:200]
    if data.remove_voice_range:
        update["voice_range"] = None
    elif data.voice_range is not None:
        update["voice_range"] = data.voice_range

    if not update:
        raise HTTPException(status_code=400, detail="Nada que actualizar")

    await users_col.update_one({"_id": uid}, {"$set": update})
    updated = await users_col.find_one({"_id": uid}, {"password_hash": 0})
    return {
        "user_id":     updated["_id"],
        "username":    updated.get("username", ""),
        "photo":       updated.get("photo"),
        "bio":         updated.get("bio", ""),
        "voice_range": updated.get("voice_range"),
    }


# ── Restablecer contraseña ────────────────────────────────────────────────────
class ForgotPasswordRequest(BaseModel):
    email: EmailStr

class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str


@router.post("/forgot-password")
async def forgot_password(data: ForgotPasswordRequest):
    user = await users_col.find_one({"email": data.email})
    # Respuesta genérica para no revelar si el email existe
    if not user:
        return {"message": "Si el correo está registrado, recibirás un enlace."}

    token = secrets.token_urlsafe(32)
    expires_at = datetime.utcnow() + timedelta(hours=1)

    # Invalida tokens anteriores del mismo usuario
    await resets_col.delete_many({"user_id": user["_id"]})
    await resets_col.insert_one({
        "_id":        token,
        "user_id":    user["_id"],
        "email":      user["email"],
        "expires_at": expires_at,
        "used":       False,
        "created_at": datetime.utcnow(),
    })

    reset_url = f"{settings.FRONTEND_URL}?action=reset&token={token}"

    from email_utils import send_email, reset_password_html
    html = reset_password_html(user.get("username", "usuario"), reset_url)
    try:
        await send_email(user["email"], "Restablece tu contraseña — VocalIA", html)
    except Exception as e:
        import traceback
        print(f"EMAIL ERROR: {type(e).__name__}: {e}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Error al enviar el correo: {type(e).__name__}: {e}")

    return {"message": "Si el correo está registrado, recibirás un enlace."}


@router.post("/reset-password")
async def reset_password(data: ResetPasswordRequest):
    if len(data.new_password) < 6:
        raise HTTPException(status_code=400, detail="La contraseña debe tener al menos 6 caracteres")

    reset_doc = await resets_col.find_one({"_id": data.token})
    if not reset_doc:
        raise HTTPException(status_code=400, detail="Enlace inválido o ya utilizado")
    if reset_doc.get("used"):
        raise HTTPException(status_code=400, detail="Este enlace ya fue utilizado")
    if reset_doc["expires_at"] < datetime.utcnow():
        raise HTTPException(status_code=400, detail="El enlace ha expirado. Solicita uno nuevo")

    new_hash = hash_password(data.new_password)
    await users_col.update_one({"_id": reset_doc["user_id"]}, {"$set": {"password_hash": new_hash}})
    await resets_col.update_one({"_id": data.token}, {"$set": {"used": True}})

    return {"message": "Contraseña actualizada correctamente"}
