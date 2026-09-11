"""
tests/test_auth.py — Unit tests for auth.py

Run with:
    cd backend
    pytest tests/ -v
"""
import os
import pytest
from datetime import timedelta
from jose import JWTError

# Ensure secret is set before importing auth
os.environ.setdefault("JWT_SECRET", "test-secret-for-unit-tests-only-not-production")
os.environ.setdefault("ENV", "development")

import auth


# ─── Password Helpers ────────────────────────────────────────────────────────
class TestPasswordHelpers:
    def test_hash_produces_non_empty_string(self):
        hashed = auth.hash_password("my_password")
        assert hashed and isinstance(hashed, str)

    def test_verify_correct_password(self):
        hashed = auth.hash_password("secret123")
        assert auth.verify_password("secret123", hashed) is True

    def test_verify_wrong_password(self):
        hashed = auth.hash_password("secret123")
        assert auth.verify_password("wrong_pass", hashed) is False

    def test_different_inputs_produce_different_hashes(self):
        h1 = auth.hash_password("pass1")
        h2 = auth.hash_password("pass2")
        assert h1 != h2

    def test_same_input_produces_different_hashes_bcrypt_salt(self):
        # bcrypt generates random salt — same input → different hash
        h1 = auth.hash_password("same_pass")
        h2 = auth.hash_password("same_pass")
        assert h1 != h2  # different salts
        assert auth.verify_password("same_pass", h1)
        assert auth.verify_password("same_pass", h2)


# ─── Access Tokens ────────────────────────────────────────────────────────────
class TestAccessTokens:
    def test_create_and_decode_access_token(self):
        token = auth.create_access_token(data={"sub": "doctor-123"})
        payload = auth.decode_token(token)
        assert payload["sub"] == "doctor-123"
        assert payload["type"] == "access"

    def test_expired_access_token_raises(self):
        token = auth.create_access_token(
            data={"sub": "doctor-123"},
            expires_delta=timedelta(seconds=-1),
        )
        with pytest.raises(JWTError):
            auth.decode_token(token)

    def test_tampered_token_raises(self):
        token = auth.create_access_token(data={"sub": "doctor-123"})
        tampered = token[:-5] + "XXXXX"
        with pytest.raises(JWTError):
            auth.decode_token(tampered)


# ─── Refresh Tokens ────────────────────────────────────────────────────────────
class TestRefreshTokens:
    def test_create_and_decode_refresh_token(self):
        token = auth.create_refresh_token(data={"sub": "doctor-456"})
        payload = auth.decode_token(token)
        assert payload["sub"] == "doctor-456"
        assert payload["type"] == "refresh"

    def test_refresh_token_has_longer_expiry_than_access(self):
        import time
        access  = auth.create_access_token(data={"sub": "doc"})
        refresh = auth.create_refresh_token(data={"sub": "doc"})

        access_payload  = auth.decode_token(access)
        refresh_payload = auth.decode_token(refresh)

        assert refresh_payload["exp"] > access_payload["exp"]

    def test_access_and_refresh_types_differ(self):
        access  = auth.create_access_token(data={"sub": "doc"})
        refresh = auth.create_refresh_token(data={"sub": "doc"})
        assert auth.decode_token(access)["type"]  == "access"
        assert auth.decode_token(refresh)["type"] == "refresh"


# ─── Role Constants ────────────────────────────────────────────────────────────
class TestRoleConstants:
    def test_role_constants_defined(self):
        assert auth.ROLE_SUPER_ADMIN  == "admin"
        assert auth.ROLE_CLINIC_ADMIN == "clinic_admin"
        assert auth.ROLE_DOCTOR       == "doctor"
        assert auth.ROLE_TECH         == "technician"
        assert auth.ROLE_RECEPTION    == "reception"
        assert auth.ROLE_STAFF        == "user"
