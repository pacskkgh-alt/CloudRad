"""Centralized configuration for all CloudRad API modules."""
import os

# --- Orthanc PACS ---
ORTHANC_URL = os.getenv("ORTHANC_URL", "http://cloudrad_orthanc:8042")

_orthanc_user = os.getenv("ORTHANC_USER")
_orthanc_password = os.getenv("ORTHANC_PASSWORD")

if not _orthanc_user or not _orthanc_password:
    raise EnvironmentError(
        "ORTHANC_USER and ORTHANC_PASSWORD must be set as environment variables. "
        "Do NOT hardcode PACS credentials in source code."
    )

ORTHANC_USER: str = _orthanc_user
ORTHANC_PASSWORD: str = _orthanc_password

# --- Upload Limits ---
MAX_UPLOAD_SIZE = 2000 * 1024 * 1024  # 2000 MB (2 GB)
MAX_FILES = 100_000
MAX_FIELDS = 100_000
