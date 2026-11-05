"""Zona waktu bisnis aplikasi.

WIB tidak memakai daylight saving sehingga offset tetap aman tanpa tzdata.
"""

from datetime import timedelta, timezone

WIB = timezone(timedelta(hours=7), name="WIB")
