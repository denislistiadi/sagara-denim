"""Skema kesehatan aplikasi."""

from pydantic import BaseModel


class HealthResponse(BaseModel):
    """Status aplikasi dan koneksi database."""

    status: str
    database: str
    app: str
    version: str


class LivenessResponse(BaseModel):
    """Status proses aplikasi tanpa menyentuh database."""

    status: str
    app: str
    version: str
