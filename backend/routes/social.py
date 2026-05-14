"""
Social feed: posts, follows, notifications.
"""
from fastapi import APIRouter, HTTPException, Header
from pydantic import BaseModel
from datetime import datetime
from typing import Optional
import uuid

from database import users_col, posts_col, follows_col, notifs_col, comments_col
from config import settings

router = APIRouter()


# ── Auth helper ───────────────────────────────────────────────────────────────
async def _require_user(authorization: Optional[str] = None) -> dict:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="No autenticado")
    from jose import jwt, JWTError
    try:
        token = authorization.split(" ", 1)[1]
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        uid = payload.get("sub")
        if not uid:
            raise HTTPException(status_code=401, detail="Token inválido")
        user = await users_col.find_one({"_id": uid})
        if not user:
            raise HTTPException(status_code=401, detail="Usuario no encontrado")
        return user
    except JWTError:
        raise HTTPException(status_code=401, detail="Token inválido")


def _user_public(user: dict) -> dict:
    return {
        "user_id":  user["_id"],
        "username": user.get("username", ""),
        "photo":    user.get("photo", None),
    }


# ── Posts ─────────────────────────────────────────────────────────────────────
class CreatePostRequest(BaseModel):
    content: str
    image_url: Optional[str] = None
    analysis_data: Optional[dict] = None
    post_type: str = "post"  # "post" | "analysis_share"


@router.post("/posts", status_code=201)
async def create_post(data: CreatePostRequest, authorization: Optional[str] = Header(None)):
    user = await _require_user(authorization)
    if not data.content.strip() and not data.analysis_data:
        raise HTTPException(status_code=400, detail="El post no puede estar vacío")

    post_id = str(uuid.uuid4())
    post = {
        "_id":           post_id,
        "user_id":       user["_id"],
        "username":      user.get("username", ""),
        "user_photo":    user.get("photo", None),
        "content":       data.content.strip(),
        "image_url":     data.image_url,
        "post_type":     data.post_type,
        "analysis_data": data.analysis_data,
        "likes":         [],
        "created_at":    datetime.utcnow(),
    }
    await posts_col.insert_one(post)

    # Notificar a los seguidores cuando el usuario publica
    followers = await follows_col.find({"following_id": user["_id"]}).to_list(length=500)
    for f in followers:
        notif = {
            "_id":           str(uuid.uuid4()),
            "user_id":       f["follower_id"],
            "type":          "new_post",
            "from_user_id":  user["_id"],
            "from_username": user.get("username", ""),
            "from_photo":    user.get("photo", None),
            "post_id":       post_id,
            "read":          False,
            "created_at":    datetime.utcnow(),
        }
        await notifs_col.insert_one(notif)

    return {"post_id": post_id, "message": "Post publicado"}


@router.get("/feed")
async def get_feed(authorization: Optional[str] = Header(None), skip: int = 0, limit: int = 20):
    user = await _require_user(authorization)
    # IDs de personas que sigo + yo mismo
    following = await follows_col.find({"follower_id": user["_id"]}).to_list(length=1000)
    visible_ids = [f["following_id"] for f in following] + [user["_id"]]

    cursor = posts_col.find(
        {"user_id": {"$in": visible_ids}}
    ).sort("created_at", -1).skip(skip).limit(limit)

    raw = await cursor.to_list(length=limit)
    result = []
    for p in raw:
        result.append({
            "post_id":       p["_id"],
            "user_id":       p["user_id"],
            "username":      p.get("username", ""),
            "user_photo":    p.get("user_photo"),
            "content":       p.get("content", ""),
            "image_url":     p.get("image_url"),
            "post_type":     p.get("post_type", "post"),
            "analysis_data": p.get("analysis_data"),
            "likes":         p.get("likes", []),
            "liked_by_me":   user["_id"] in p.get("likes", []),
            "created_at":    p["created_at"].isoformat() + "Z",
        })
    return {"posts": result, "total": len(result)}


@router.post("/posts/{post_id}/like")
async def toggle_like(post_id: str, authorization: Optional[str] = Header(None)):
    user = await _require_user(authorization)
    post = await posts_col.find_one({"_id": post_id})
    if not post:
        raise HTTPException(status_code=404, detail="Post no encontrado")
    likes = post.get("likes", [])
    if user["_id"] in likes:
        likes.remove(user["_id"])
        action = "unliked"
    else:
        likes.append(user["_id"])
        action = "liked"
    await posts_col.update_one({"_id": post_id}, {"$set": {"likes": likes}})

    # Notificar al autor del post cuando recibe un like (no para propios posts)
    if action == "liked" and post["user_id"] != user["_id"]:
        await notifs_col.insert_one({
            "_id":           str(uuid.uuid4()),
            "user_id":       post["user_id"],
            "type":          "like",
            "from_user_id":  user["_id"],
            "from_username": user.get("username", ""),
            "from_photo":    user.get("photo", None),
            "post_id":       post_id,
            "read":          False,
            "created_at":    datetime.utcnow(),
        })

    return {"action": action, "total_likes": len(likes)}


# ── Follows ───────────────────────────────────────────────────────────────────
@router.post("/follow/{target_id}", status_code=201)
async def follow_user(target_id: str, authorization: Optional[str] = Header(None)):
    user = await _require_user(authorization)
    if user["_id"] == target_id:
        raise HTTPException(status_code=400, detail="No puedes seguirte a ti mismo")
    target = await users_col.find_one({"_id": target_id})
    if not target:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")

    existing = await follows_col.find_one({"follower_id": user["_id"], "following_id": target_id})
    if existing:
        raise HTTPException(status_code=400, detail="Ya sigues a este usuario")

    await follows_col.insert_one({
        "_id":          str(uuid.uuid4()),
        "follower_id":  user["_id"],
        "following_id": target_id,
        "created_at":   datetime.utcnow(),
    })

    # Notificación al seguido
    await notifs_col.insert_one({
        "_id":           str(uuid.uuid4()),
        "user_id":       target_id,
        "type":          "follow",
        "from_user_id":  user["_id"],
        "from_username": user.get("username", ""),
        "from_photo":    user.get("photo", None),
        "post_id":       None,
        "read":          False,
        "created_at":    datetime.utcnow(),
    })
    return {"message": f"Ahora sigues a {target.get('username', '')}"}


@router.delete("/follow/{target_id}")
async def unfollow_user(target_id: str, authorization: Optional[str] = Header(None)):
    user = await _require_user(authorization)
    result = await follows_col.delete_one({"follower_id": user["_id"], "following_id": target_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="No seguías a este usuario")
    return {"message": "Dejaste de seguir al usuario"}


# ── Usuarios ──────────────────────────────────────────────────────────────────
@router.get("/users")
async def list_users(q: str = "", authorization: Optional[str] = Header(None)):
    user = await _require_user(authorization)
    query: dict = {}
    if q:
        query["username"] = {"$regex": q, "$options": "i"}

    cursor = users_col.find(query, {"password_hash": 0}).limit(30)
    all_users = await cursor.to_list(length=30)

    # IDs que ya sigo
    following = await follows_col.find({"follower_id": user["_id"]}).to_list(length=1000)
    following_ids = {f["following_id"] for f in following}

    result = []
    for u in all_users:
        if u["_id"] == user["_id"]:
            continue
        result.append({
            "user_id":     u["_id"],
            "username":    u.get("username", ""),
            "photo":       u.get("photo"),
            "is_following": u["_id"] in following_ids,
        })
    return {"users": result}


@router.get("/profile/{user_id}")
async def get_profile(user_id: str, authorization: Optional[str] = Header(None)):
    user = await _require_user(authorization)
    target = await users_col.find_one({"_id": user_id}, {"password_hash": 0})
    if not target:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")

    followers_count = await follows_col.count_documents({"following_id": user_id})
    following_count = await follows_col.count_documents({"follower_id": user_id})
    posts_count     = await posts_col.count_documents({"user_id": user_id})
    is_following    = bool(await follows_col.find_one({"follower_id": user["_id"], "following_id": user_id}))

    # Posts del usuario
    cursor = posts_col.find({"user_id": user_id}).sort("created_at", -1).limit(10)
    posts_raw = await cursor.to_list(length=10)
    posts = [{
        "post_id":       p["_id"],
        "content":       p.get("content", ""),
        "image_url":     p.get("image_url"),
        "post_type":     p.get("post_type", "post"),
        "analysis_data": p.get("analysis_data"),
        "likes":         len(p.get("likes", [])),
        "liked_by_me":   user["_id"] in p.get("likes", []),
        "created_at":    p["created_at"].isoformat() + "Z",
    } for p in posts_raw]

    return {
        "user_id":        target["_id"],
        "username":       target.get("username", ""),
        "photo":          target.get("photo"),
        "bio":            target.get("bio", ""),
        "voice_range":    target.get("voice_range"),
        "followers":      followers_count,
        "following":      following_count,
        "posts_count":    posts_count,
        "is_following":   is_following,
        "posts":          posts,
    }


# ── Notificaciones ────────────────────────────────────────────────────────────
@router.get("/notifications")
async def get_notifications(authorization: Optional[str] = Header(None)):
    user = await _require_user(authorization)
    cursor = notifs_col.find({"user_id": user["_id"]}).sort("created_at", -1).limit(30)
    raw = await cursor.to_list(length=30)
    result = []
    for n in raw:
        result.append({
            "notif_id":      n["_id"],
            "type":          n.get("type", ""),
            "from_username": n.get("from_username", ""),
            "from_photo":    n.get("from_photo"),
            "post_id":       n.get("post_id"),
            "read":          n.get("read", False),
            "created_at":    n["created_at"].isoformat() + "Z",
        })
    unread = sum(1 for n in result if not n["read"])
    return {"notifications": result, "unread": unread}


@router.post("/notifications/read-all")
async def mark_all_read(authorization: Optional[str] = Header(None)):
    user = await _require_user(authorization)
    await notifs_col.update_many({"user_id": user["_id"], "read": False}, {"$set": {"read": True}})
    return {"message": "Notificaciones marcadas como leídas"}


# ── Top canciones ─────────────────────────────────────────────────────────────
@router.get("/top-songs")
async def get_top_songs():
    from collections import Counter
    cursor = posts_col.find({"post_type": "analysis_share"})
    posts_raw = await cursor.to_list(length=None)
    song_counts: Counter = Counter()
    for post in posts_raw:
        analysis = post.get("analysis_data") or {}
        for song in (analysis.get("songs") or []):
            nombre = song.get("nombre", "")
            if nombre:
                song_counts[nombre] += 1
    top = song_counts.most_common(3)
    return {"top_songs": [{"nombre": nombre, "count": count} for nombre, count in top]}


# ── Recomendaciones de perfil ─────────────────────────────────────────────────
@router.get("/recommendations")
async def get_recommendations(authorization: Optional[str] = Header(None)):
    user = await _require_user(authorization)
    following = await follows_col.find({"follower_id": user["_id"]}).to_list(length=1000)
    excluded = {f["following_id"] for f in following}
    excluded.add(user["_id"])
    cursor = users_col.find({"_id": {"$nin": list(excluded)}}, {"password_hash": 0}).limit(5)
    candidates = await cursor.to_list(length=5)
    return {"recommendations": [{
        "user_id":      u["_id"],
        "username":     u.get("username", ""),
        "photo":        u.get("photo"),
        "is_following": False,
    } for u in candidates]}


# ── Comentarios ───────────────────────────────────────────────────────────────
class AddCommentRequest(BaseModel):
    content: str


@router.post("/posts/{post_id}/comments", status_code=201)
async def add_comment(
    post_id: str,
    data: AddCommentRequest,
    authorization: Optional[str] = Header(None),
):
    user = await _require_user(authorization)
    post = await posts_col.find_one({"_id": post_id})
    if not post:
        raise HTTPException(status_code=404, detail="Post no encontrado")
    if not data.content.strip():
        raise HTTPException(status_code=400, detail="El comentario no puede estar vacío")

    comment_id = str(uuid.uuid4())
    now = datetime.utcnow()
    comment = {
        "_id":        comment_id,
        "post_id":    post_id,
        "user_id":    user["_id"],
        "username":   user.get("username", ""),
        "user_photo": user.get("photo"),
        "content":    data.content.strip()[:300],
        "created_at": now,
    }
    await comments_col.insert_one(comment)

    # Notificar al autor del post (no para los propios posts)
    if post["user_id"] != user["_id"]:
        await notifs_col.insert_one({
            "_id":           str(uuid.uuid4()),
            "user_id":       post["user_id"],
            "type":          "comment",
            "from_user_id":  user["_id"],
            "from_username": user.get("username", ""),
            "from_photo":    user.get("photo"),
            "post_id":       post_id,
            "read":          False,
            "created_at":    now,
        })

    return {
        "comment_id": comment_id,
        "user_id":    user["_id"],
        "username":   user.get("username", ""),
        "user_photo": user.get("photo"),
        "content":    comment["content"],
        "created_at": now.isoformat() + "Z",
    }


@router.get("/posts/{post_id}/comments")
async def get_comments(post_id: str):
    cursor = comments_col.find({"post_id": post_id}).sort("created_at", 1).limit(30)
    raw = await cursor.to_list(length=30)
    return {"comments": [{
        "comment_id": c["_id"],
        "user_id":    c["user_id"],
        "username":   c.get("username", ""),
        "user_photo": c.get("user_photo"),
        "content":    c.get("content", ""),
        "created_at": c["created_at"].isoformat() + "Z",
    } for c in raw]}
