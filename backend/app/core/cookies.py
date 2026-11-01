"""Pengaturan cookie autentikasi."""

from datetime import UTC, datetime

from fastapi import Response

from app.config import get_settings

settings = get_settings()


def _max_age(expires_at: datetime) -> int:
    return max(0, int((expires_at - datetime.now(UTC)).total_seconds()))


def set_auth_cookies(
    response: Response,
    *,
    access_token: str,
    refresh_token: str,
    access_expires_at: datetime,
    refresh_expires_at: datetime,
) -> None:
    """Pasang cookie akses dan refresh sebagai httpOnly."""

    response.set_cookie(
        key=settings.access_cookie_name,
        value=access_token,
        max_age=_max_age(access_expires_at),
        expires=access_expires_at,
        path="/",
        httponly=True,
        secure=settings.cookie_secure,
        samesite=settings.cookie_samesite,
    )
    response.set_cookie(
        key=settings.refresh_cookie_name,
        value=refresh_token,
        max_age=_max_age(refresh_expires_at),
        expires=refresh_expires_at,
        path=f"{settings.api_prefix}/auth",
        httponly=True,
        secure=settings.cookie_secure,
        samesite=settings.cookie_samesite,
    )


def clear_auth_cookies(response: Response) -> None:
    """Hapus cookie akses dan refresh."""

    response.delete_cookie(
        key=settings.access_cookie_name,
        path="/",
        httponly=True,
        secure=settings.cookie_secure,
        samesite=settings.cookie_samesite,
    )
    response.delete_cookie(
        key=settings.refresh_cookie_name,
        path=f"{settings.api_prefix}/auth",
        httponly=True,
        secure=settings.cookie_secure,
        samesite=settings.cookie_samesite,
    )
