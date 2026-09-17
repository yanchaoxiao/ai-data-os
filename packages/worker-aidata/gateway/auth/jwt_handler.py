"""JWT Token 处理模块 - 生成和验证 JWT Token (MVP 版本，无 blacklist)"""
import uuid
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, Optional

from jose import JWTError, jwt
from jose.exceptions import ExpiredSignatureError

from config.settings import get_settings


class TokenError(Exception):
    pass


class InvalidTokenError(TokenError):
    pass


class TokenExpiredError(TokenError):
    pass


def _create_token(
    data: Dict[str, Any],
    expires_delta: Optional[timedelta],
    default_expire: timedelta,
    token_type: str
) -> str:
    settings = get_settings()
    to_encode = data.copy()

    now = datetime.now(timezone.utc)
    expire = now + expires_delta if expires_delta else now + default_expire

    to_encode.update({
        "type": token_type,
        "exp": expire,
        "iat": now,
        "jti": str(uuid.uuid4()),
    })

    return jwt.encode(
        to_encode, settings.jwt_secret_key, algorithm=settings.jwt_algorithm
    )


def create_access_token(
    data: Dict[str, Any], expires_delta: Optional[timedelta] = None
) -> str:
    settings = get_settings()
    return _create_token(
        data, expires_delta,
        timedelta(minutes=settings.access_token_expire_minutes),
        "access"
    )


def create_refresh_token(
    data: Dict[str, Any], expires_delta: Optional[timedelta] = None
) -> str:
    settings = get_settings()
    return _create_token(
        data, expires_delta,
        timedelta(days=settings.refresh_token_expire_days),
        "refresh"
    )


def decode_token(token: str) -> Dict[str, Any]:
    if not token:
        raise InvalidTokenError("Token is empty")
    try:
        settings = get_settings()
        payload = jwt.decode(
            token, settings.jwt_secret_key, algorithms=[settings.jwt_algorithm]
        )
        return payload
    except ExpiredSignatureError:
        raise TokenExpiredError("Token has expired")
    except JWTError as e:
        raise InvalidTokenError(f"Invalid token: {str(e)}")


def verify_token(token: str, expected_type: str = "access") -> Dict[str, Any]:
    payload = decode_token(token)

    token_type = payload.get("type")
    if token_type is None:
        raise InvalidTokenError("Token missing required 'type' field")
    if token_type != expected_type:
        raise InvalidTokenError(f"Invalid token type: expected {expected_type}, got {token_type}")

    return payload
