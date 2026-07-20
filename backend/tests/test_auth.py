"""Tests for auth module — password hashing, JWT tokens, and RBAC."""
import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from datetime import timedelta, timezone, datetime


def test_hash_and_verify_password():
    """hash_password produces a bcrypt hash that verify_password accepts."""
    from auth import hash_password, verify_password

    plain = "TestP@ssword123"
    hashed = hash_password(plain)

    assert hashed != plain, "Hash should differ from plaintext"
    assert hashed.startswith("$2b$"), "Should be a bcrypt hash"
    assert verify_password(plain, hashed), "Correct password must verify"
    assert not verify_password("wrong", hashed), "Wrong password must fail"


def test_create_access_token_contains_sub():
    """create_access_token encodes 'sub' and 'exp' claims."""
    from auth import create_access_token, SECRET_KEY, ALGORITHM
    from jose import jwt

    token = create_access_token(data={"sub": "doctor-123"})
    payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])

    assert payload["sub"] == "doctor-123"
    assert "exp" in payload


def test_create_access_token_custom_expiry():
    """Custom expiry delta is respected."""
    from auth import create_access_token, SECRET_KEY, ALGORITHM
    from jose import jwt

    token = create_access_token(
        data={"sub": "doc-1"},
        expires_delta=timedelta(minutes=5),
    )
    payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    exp = datetime.fromtimestamp(payload["exp"], tz=timezone.utc)
    now = datetime.now(timezone.utc)

    # Token should expire within 6 minutes (5 + margin)
    assert (exp - now).total_seconds() < 360
    assert (exp - now).total_seconds() > 200


def test_check_role_returns_dependency():
    """check_role returns a callable dependency."""
    from auth import check_role

    dep = check_role(["admin"])
    assert callable(dep)
