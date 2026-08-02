"""Centralized configuration for all CloudRad API modules."""
import os

# --- Orthanc PACS ---
ORTHANC_URL = os.getenv("ORTHANC_URL", "http://cloudrad_orthanc:8042")
ORTHANC_USER = os.getenv("ORTHANC_USER", "cloudrad_pacs")
ORTHANC_PASSWORD = os.getenv("ORTHANC_PASSWORD", "CloudR4d_P4cs_Secur3!")

# --- Upload Limits ---
MAX_UPLOAD_SIZE = 2000 * 1024 * 1024  # 2000 MB (2 GB)
MAX_FILES = 100_000
MAX_FIELDS = 100_000
