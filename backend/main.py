import os
import logging
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from database import engine, Base
import models
import api_upload, api_reports, api_links, api_auth, api_admin, api_upload_chunked
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware

logger = logging.getLogger(__name__)

# Create all tables in the database
models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="CloudRad API", version="1.0.0", description="CloudRad MVP Backend")

from ratelimit import limiter
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
app.add_middleware(SlowAPIMiddleware)

# CORS — use CORS_ORIGINS env var in production
_raw_origins = os.getenv("CORS_ORIGINS", "*")
if _raw_origins.strip() == "*":
    cors_origins = ["*"]
else:
    cors_origins = [o.strip() for o in _raw_origins.split(",") if o.strip()]
    # Always ensure the Vercel frontend is allowed
    vercel_url = os.getenv("FRONTEND_URL", "")
    if vercel_url and vercel_url not in cors_origins:
        cors_origins.append(vercel_url)

logger.info(f"CORS origins configured: {cors_origins}")
app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_origin_regex=r"https://.*\.vercel\.app|http://localhost:\d+|http://127\.0\.0\.1:\d+",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

import api_upload, api_reports, api_links, api_auth, api_admin, api_upload_chunked, api_dicomweb, api_consultations, api_telerad

# Routers
app.include_router(api_auth.router)
app.include_router(api_upload.router)
app.include_router(api_reports.router)
app.include_router(api_links.router)
app.include_router(api_admin.router)
app.include_router(api_upload_chunked.router)
app.include_router(api_dicomweb.router)
app.include_router(api_consultations.router)
app.include_router(api_telerad.router)

# Global exception handler
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled error on {request.method} {request.url}: {str(exc)}")
    return JSONResponse(
        status_code=500,
        content={"detail": "An internal server error occurred. Please contact support."},
    )


@app.get("/")
def read_root():
    return {"message": "Welcome to CloudRad API."}


@app.get("/health")
def health_check():
    return {"status": "healthy"}
