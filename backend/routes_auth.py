import os
from datetime import timedelta

import httpx
from fastapi import APIRouter, Depends, HTTPException, Request, Response

from core import (
    COOKIE_OPTS, db, now, now_iso, new_id, hash_password, verify_password,
    create_access_token, create_refresh_token, decode_token, get_current_user,
)
from models import RegisterIn, LoginIn, GoogleSessionIn, User

router = APIRouter(prefix="/auth", tags=["auth"])

MAX_ATTEMPTS = 5
LOCKOUT = timedelta(minutes=15)
EMERGENT_SESSION_URL = "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data"


def _set_jwt_cookies(response: Response, user: dict):
    response.set_cookie("access_token", create_access_token(user["user_id"], user["email"]), max_age=900, **COOKIE_OPTS)
    response.set_cookie("refresh_token", create_refresh_token(user["user_id"]), max_age=604800, **COOKIE_OPTS)


def _public(user: dict) -> User:
    return User(**{k: v for k, v in user.items() if k not in ("_id", "password_hash")})


@router.post("/register", response_model=User)
async def register(body: RegisterIn, response: Response):
    email = body.email.strip().lower()
    if await db.users.find_one({"email": email}):
        raise HTTPException(status_code=400, detail="An account with this email already exists.")
    user = {
        "user_id": new_id("user_"), "email": email, "name": body.name.strip(),
        "password_hash": hash_password(body.password), "picture": None,
        "auth_provider": "password", "created_at": now_iso(),
    }
    await db.users.insert_one(user)
    _set_jwt_cookies(response, user)
    return _public(user)


@router.post("/login", response_model=User)
async def login(body: LoginIn, request: Request, response: Response):
    email = body.email.strip().lower()
    identifier = f"{request.client.host if request.client else 'unknown'}:{email}"
    attempt = await db.login_attempts.find_one({"identifier": identifier}, {"_id": 0})
    if attempt and attempt.get("count", 0) >= MAX_ATTEMPTS and attempt.get("locked_until", "") > now_iso():
        raise HTTPException(status_code=429, detail="Too many attempts. Please try again in 15 minutes.")
    user = await db.users.find_one({"email": email})
    if not user or not user.get("password_hash") or not verify_password(body.password, user["password_hash"]):
        expired = attempt and attempt.get("count", 0) >= MAX_ATTEMPTS
        count = 1 if expired else (attempt or {}).get("count", 0) + 1
        locked_until = (now() + LOCKOUT).isoformat() if count >= MAX_ATTEMPTS else ""
        await db.login_attempts.update_one(
            {"identifier": identifier},
            {"$set": {"count": count, "locked_until": locked_until}},
            upsert=True,
        )
        raise HTTPException(status_code=401, detail="Invalid email or password.")
    await db.login_attempts.delete_one({"identifier": identifier})
    _set_jwt_cookies(response, user)
    return _public(user)


@router.post("/refresh")
async def refresh(request: Request, response: Response):
    token = request.cookies.get("refresh_token")
    user_id = decode_token(token, "refresh") if token else None
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid refresh token")
    user = await db.users.find_one({"user_id": user_id}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    response.set_cookie("access_token", create_access_token(user_id, user["email"]), max_age=900, **COOKIE_OPTS)
    return {"ok": True}


@router.post("/google/session", response_model=User)
async def google_session(body: GoogleSessionIn, response: Response):
    async with httpx.AsyncClient(timeout=15) as http:
        res = await http.get(EMERGENT_SESSION_URL, headers={"X-Session-ID": body.session_id})
    if res.status_code != 200:
        raise HTTPException(status_code=401, detail="Google sign-in could not be verified.")
    data = res.json()
    email = data["email"].strip().lower()
    user = await db.users.find_one({"email": email}, {"_id": 0})
    if user:
        await db.users.update_one({"email": email}, {"$set": {"picture": data.get("picture")}})
        user["picture"] = data.get("picture")
    else:
        user = {
            "user_id": new_id("user_"), "email": email, "name": data.get("name") or email.split("@")[0],
            "picture": data.get("picture"), "auth_provider": "google", "created_at": now_iso(),
        }
        await db.users.insert_one(dict(user))
    await db.user_sessions.insert_one({
        "user_id": user["user_id"], "session_token": data["session_token"],
        "expires_at": now() + timedelta(days=7), "created_at": now(),
    })
    response.set_cookie("session_token", data["session_token"], max_age=604800, **COOKIE_OPTS)
    return _public(user)


@router.get("/me", response_model=User)
async def me(user: dict = Depends(get_current_user)):
    return _public(user)


@router.post("/logout")
async def logout(request: Request, response: Response):
    token = request.cookies.get("session_token")
    if token:
        await db.user_sessions.delete_one({"session_token": token})
    for name in ("access_token", "refresh_token", "session_token"):
        response.delete_cookie(name, path="/", secure=True, samesite="none")
    return {"ok": True}


async def seed_demo_user():
    email = os.environ["ADMIN_EMAIL"].lower()
    password = os.environ["ADMIN_PASSWORD"]
    existing = await db.users.find_one({"email": email})
    if existing is None:
        await db.users.insert_one({
            "user_id": new_id("user_"), "email": email, "name": "Demo Thinker",
            "password_hash": hash_password(password), "picture": None,
            "auth_provider": "password", "role": "admin", "created_at": now_iso(),
        })
    elif not existing.get("password_hash") or not verify_password(password, existing["password_hash"]):
        await db.users.update_one({"email": email}, {"$set": {"password_hash": hash_password(password)}})
