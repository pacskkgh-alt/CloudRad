import os
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from database import engine, Base
import models
import api_upload, api_reports, api_links, api_auth

# Create all tables in the database
models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="CloudRad API", version="1.0.0", description="CloudRad MVP Backend")

# CORS — use CORS_ORIGINS env var in production
cors_origins = os.getenv("CORS_ORIGINS", "*").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routers
app.include_router(api_auth.router)
app.include_router(api_upload.router)
app.include_router(api_reports.router)
app.include_router(api_links.router)


# Global exception handler
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    return JSONResponse(
        status_code=500,
        content={"detail": f"Internal server error: {str(exc)}"},
    )


@app.get("/")
def read_root():
    return {"message": "Welcome to CloudRad API."}


@app.get("/health")
def health_check():
    return {"status": "healthy"}
