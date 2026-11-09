"""Context request yang dipakai bersama oleh log dan metrik."""

from __future__ import annotations

from dataclasses import dataclass


@dataclass(slots=True, frozen=True)
class RequestContext:
    """Ringkasan satu request tanpa data pribadi."""

    request_id: str
    method: str
    path: str
    route: str
    status_code: int
    duration_ms: float

    def as_log_extra(self) -> dict[str, str | int | float]:
        """Ubah context menjadi field tambahan untuk logger JSON."""

        return {
            "request_id": self.request_id,
            "method": self.method,
            "path": self.path,
            "route": self.route,
            "status_code": self.status_code,
            "duration_ms": self.duration_ms,
        }
