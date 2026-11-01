"""Endpoint autentikasi."""

from fastapi import APIRouter, HTTPException, Request, Response, status
from fastapi.responses import JSONResponse

from app.api.deps import CurrentUser, SessionDep
from app.config import get_settings
from app.core.cookies import clear_auth_cookies, set_auth_cookies
from app.schemas.auth import AuthSession, LoginRequest, MessageResponse
from app.schemas.user import UserRead
from app.services.auth import (
    RefreshTokenError,
    RefreshTokenReuseError,
    authenticate_user,
    issue_session,
    revoke_session,
    rotate_session,
)

router = APIRouter(prefix="/auth", tags=["Autentikasi"])
settings = get_settings()

INVALID_CREDENTIALS = "Email atau kata sandi salah."
INVALID_SESSION = "Sesi tidak valid. Silakan masuk kembali."


def _client_ip(request: Request) -> str | None:
    return request.client.host if request.client else None


def _session_response(issued) -> AuthSession:
    return AuthSession(
        user=UserRead.model_validate(issued.user),
        access_expires_at=issued.access_expires_at,
        refresh_expires_at=issued.refresh_expires_at,
    )


def _invalid_session_response() -> JSONResponse:
    response = JSONResponse(
        status_code=status.HTTP_401_UNAUTHORIZED,
        content={"detail": INVALID_SESSION},
    )
    clear_auth_cookies(response)
    return response


@router.post(
    "/login",
    response_model=AuthSession,
    summary="Masuk dan pasang cookie sesi",
)
async def login(
    payload: LoginRequest,
    request: Request,
    response: Response,
    session: SessionDep,
) -> AuthSession:
    """Verifikasi kredensial lalu terbitkan access dan refresh token."""

    user = await authenticate_user(session, payload.email, payload.password)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=INVALID_CREDENTIALS,
            headers={"WWW-Authenticate": "Bearer"},
        )

    issued = await issue_session(
        session,
        user,
        user_agent=request.headers.get("user-agent"),
        ip_address=_client_ip(request),
    )
    await session.commit()

    set_auth_cookies(
        response,
        access_token=issued.access_token,
        refresh_token=issued.refresh_token,
        access_expires_at=issued.access_expires_at,
        refresh_expires_at=issued.refresh_expires_at,
    )
    return _session_response(issued)


@router.post(
    "/refresh",
    response_model=AuthSession,
    summary="Putar refresh token dan perbarui sesi",
)
async def refresh(
    request: Request,
    response: Response,
    session: SessionDep,
) -> AuthSession | JSONResponse:
    """Cabut refresh token lama dan terbitkan sesi baru."""

    raw_token = request.cookies.get(settings.refresh_cookie_name)
    if not raw_token:
        return _invalid_session_response()

    try:
        issued = await rotate_session(
            session,
            raw_token,
            user_agent=request.headers.get("user-agent"),
            ip_address=_client_ip(request),
        )
    except RefreshTokenReuseError:
        # Revocation karena pemakaian ulang harus tetap tersimpan.
        await session.commit()
        return _invalid_session_response()
    except RefreshTokenError:
        await session.commit()
        return _invalid_session_response()

    await session.commit()

    set_auth_cookies(
        response,
        access_token=issued.access_token,
        refresh_token=issued.refresh_token,
        access_expires_at=issued.access_expires_at,
        refresh_expires_at=issued.refresh_expires_at,
    )
    return _session_response(issued)


@router.post(
    "/logout",
    response_model=MessageResponse,
    summary="Cabut sesi dan hapus cookie",
)
async def logout(
    request: Request,
    response: Response,
    session: SessionDep,
) -> MessageResponse:
    """Cabut refresh token aktif, jika ada, lalu bersihkan cookie."""

    raw_token = request.cookies.get(settings.refresh_cookie_name)
    if raw_token:
        await revoke_session(session, raw_token)
        await session.commit()

    clear_auth_cookies(response)
    return MessageResponse(message="Logout berhasil.")


@router.get(
    "/me",
    response_model=UserRead,
    summary="Ambil pengguna dari sesi aktif",
)
async def me(current_user: CurrentUser) -> UserRead:
    """Kembalikan profil pengguna yang sedang masuk."""

    return UserRead.model_validate(current_user)
