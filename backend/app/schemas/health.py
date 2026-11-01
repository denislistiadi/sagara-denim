"""Skema kesehatan aplikasi."""

from pydantic import BaseModel


class HealthResponse(BaseModel):
    """Status aplikasi dan koneksi database."""

    status: str
    database: str
    app: str
    version: str
