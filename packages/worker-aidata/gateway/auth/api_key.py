from fastapi import Header, HTTPException
from config.settings import get_settings


async def verify_api_key(x_api_key: str = Header(alias="X-API-Key", default="")):
    s = get_settings()
    if not s.api_key:
        return
    if x_api_key != s.api_key:
        raise HTTPException(401, detail="Invalid API Key")
