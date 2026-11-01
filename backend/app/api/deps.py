"""Dependency autentikasi dan otorisasi peran."""

from typing import Annotated
from uuid import UUID

from fastapi import Depends, HTTPException, Request, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.core.security import TokenError, decode_access_token
from app.db import get_session
from app.models import User, UserRole

settings = get_settings()

SessionDep = Annotated[AsyncSession, Depends(get_session)]


def credentials_exception() -> HTTPException:
    """Buat error 401 yang seragam."""

    return HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Sesi tidak valid atau sudah berakhir.",
        headers={"WWW-Authenticate": "Bearer"},
    )


async def get_current_user(request: Request, session: SessionDep) -> User:
    """Ambil pengguna dari cookie akses atau header Bearer."""

    token = request.cookies.get(settings.access_cookie_name)

    if not token:
        authorization = request.headers.get("Authorization", "")
        scheme, _, credentials = authorization.partition(" ")
        if scheme.lower() == "bearer" and credentials:
            token = credentials

    if not token:
        raise credentials_exception()

    try:
        payload = decode_access_token(token)
        user_id = UUID(payload["sub"])
    except (TokenError, KeyError, ValueError):
        raise credentials_exception() from None

    user = await session.get(User, user_id)
    if user is None or not user.is_active:
        raise credentials_exception()

    return user


CurrentUser = Annotated[User, Depends(get_current_user)]


def require_roles(*roles: UserRole):
    """Batasi endpoint ke peran tertentu."""

    async def guard(current_user: CurrentUser) -> User:
        if current_user.role not in roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Anda tidak memiliki akses ke sumber daya ini.",
            )
        return current_user

    return guard
