"""Pengecualian HTTP bersama untuk service perintah produksi."""

from fastapi import HTTPException, status


def not_found() -> HTTPException:
    """Buat error 404 untuk perintah produksi yang tidak ada."""

    return HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail="Perintah produksi tidak ditemukan.",
    )


def invalid_reference(message: str) -> HTTPException:
    """Buat error 422 untuk referensi yang tidak valid."""

    return HTTPException(
        status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
        detail=message,
    )


def conflict(message: str) -> HTTPException:
    """Buat error 409 untuk pelanggaran aturan state/konflik."""

    return HTTPException(
        status_code=status.HTTP_409_CONFLICT,
        detail=message,
    )


def normalize_text(value: str | None) -> str | None:
    """Bersihkan spasi; kembalikan None bila kosong."""

    if value is None:
        return None
    normalized = value.strip()
    return normalized or None
