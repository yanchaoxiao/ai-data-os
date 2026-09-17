"""认证依赖注入 (MVP 版本)"""
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials, APIKeyHeader
from typing import Optional

bearer_scheme = HTTPBearer(auto_error=False)
api_key_scheme = APIKeyHeader(name="X-API-Key", auto_error=False)


async def verify_auth(
    bearer: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme),
    api_key: Optional[str] = Depends(api_key_scheme),
) -> Optional[dict]:
    """验证认证（支持 JWT Token 或 API Key）

    MVP 版本：返回简单 dict 而非 ORM User。
    """
    # 优先使用 Bearer Token
    if bearer:
        from gateway.auth.jwt_handler import verify_token, InvalidTokenError, TokenExpiredError
        token = bearer.credentials
        try:
            payload = verify_token(token, expected_type="access")
        except TokenExpiredError:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token has expired",
                headers={"WWW-Authenticate": "Bearer"},
            )
        except InvalidTokenError as e:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=str(e),
                headers={"WWW-Authenticate": "Bearer"},
            )

        return {
            "id": int(payload.get("sub", 0)),
            "username": payload.get("username", ""),
            "role": payload.get("role", "user"),
        }

    # 回退到 API Key
    if api_key:
        from config.settings import get_settings
        s = get_settings()
        if s.api_key and api_key != s.api_key:
            raise HTTPException(401, detail="Invalid API Key")
        return None

    # 都没有提供
    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Missing authentication credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )


async def verify_admin(
    bearer: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme),
    api_key: Optional[str] = Depends(api_key_scheme),
) -> dict:
    """Verify authentication and require role=admin."""
    user = await verify_auth(bearer=bearer, api_key=api_key)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="API Key not allowed for admin endpoints",
        )
    if user.get("role", "") != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required",
        )
    return user
