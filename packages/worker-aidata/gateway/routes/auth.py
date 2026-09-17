"""认证路由 (MVP 版本)"""
import logging
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from database.session import get_db
from gateway.models.user import User
from gateway.auth.password_handler import hash_password, verify_password
from gateway.auth.jwt_handler import create_access_token, create_refresh_token
from gateway.auth.dependencies import verify_auth

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/auth", tags=["auth"])


class LoginRequest(BaseModel):
    username: str
    password: str


class RegisterRequest(BaseModel):
    username: str
    password: str
    email: str | None = None
    role: str = "user"


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


@router.post("/login", response_model=TokenResponse)
async def login(req: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == req.username).first()
    if not user or not verify_password(req.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="用户名或密码错误",
        )
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="账号已被禁用",
        )

    token_data = {
        "sub": str(user.id),
        "username": user.username,
        "role": user.role,
    }
    return TokenResponse(
        access_token=create_access_token(token_data),
        refresh_token=create_refresh_token(token_data),
    )


@router.post("/register", response_model=TokenResponse)
async def register(req: RegisterRequest, db: Session = Depends(get_db)):
    existing = db.query(User).filter(User.username == req.username).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="用户名已存在",
        )

    user = User(
        username=req.username,
        password_hash=hash_password(req.password),
        email=req.email,
        role=req.role,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    token_data = {
        "sub": str(user.id),
        "username": user.username,
        "role": user.role,
    }
    return TokenResponse(
        access_token=create_access_token(token_data),
        refresh_token=create_refresh_token(token_data),
    )


@router.get("/me")
async def me(user=Depends(verify_auth)):
    if user is None:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return user


@router.post("/logout")
async def logout(user=Depends(verify_auth)):
    return {"message": "Logged out successfully"}
