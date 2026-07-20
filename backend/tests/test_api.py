"""Tests for API endpoints using FastAPI TestClient."""
import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

import pytest
from fastapi.testclient import TestClient
from unittest.mock import patch, MagicMock


@pytest.fixture
def client():
    """Create a TestClient with mocked database."""
    # Mock database engine creation to avoid needing a real PostgreSQL
    with patch("database.create_engine") as mock_engine, \
         patch("database.SessionLocal") as mock_session, \
         patch("models.Base.metadata.create_all"):
        mock_engine.return_value = MagicMock()
        from main import app
        return TestClient(app)


def test_root_endpoint(client):
    """GET / should return welcome message."""
    response = client.get("/")
    assert response.status_code == 200
    assert "message" in response.json()


def test_health_endpoint(client):
    """GET /health should return healthy status."""
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "healthy"


def test_login_without_body(client):
    """POST /api/auth/login without body should return 422."""
    response = client.post("/api/auth/login")
    assert response.status_code == 422


def test_studies_without_auth(client):
    """GET /api/studies without token should return 401."""
    response = client.get("/api/studies")
    assert response.status_code == 401


def test_admin_without_auth(client):
    """GET /api/admin/users without token should return 401."""
    response = client.get("/api/admin/users")
    assert response.status_code == 401
