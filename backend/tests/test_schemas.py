"""
tests/test_schemas.py — Unit tests for shared Pydantic schemas.
"""
import os
import pytest

os.environ.setdefault("JWT_SECRET", "test-secret-for-unit-tests-only-not-production")
os.environ.setdefault("ENV", "development")

from schemas import UserCreate, UserUpdate, ClinicCreate


class TestUserCreate:
    def test_valid_user_creation(self):
        u = UserCreate(full_name="د. أحمد", email="a@test.com", password="pass123", role="doctor")
        assert u.role == "doctor"
        assert u.email == "a@test.com"

    def test_default_role_is_user(self):
        u = UserCreate(full_name="مريم", email="m@test.com", password="pass")
        assert u.role == "user"

    def test_invalid_role_raises_validation_error(self):
        with pytest.raises(Exception):
            UserCreate(full_name="X", email="x@t.com", password="p", role="supervillain")

    def test_all_valid_roles(self):
        for role in ["admin", "clinic_admin", "doctor", "technician", "reception", "user"]:
            u = UserCreate(full_name="Test", email="t@t.com", password="p", role=role)
            assert u.role == role

    def test_clinic_id_optional(self):
        u = UserCreate(full_name="X", email="x@t.com", password="p")
        assert u.clinic_id is None


class TestUserUpdate:
    def test_empty_update_is_valid(self):
        u = UserUpdate()
        assert u.role is None
        assert u.clinic_id is None

    def test_valid_role_update(self):
        u = UserUpdate(role="doctor")
        assert u.role == "doctor"

    def test_invalid_role_update_raises(self):
        with pytest.raises(Exception):
            UserUpdate(role="hacker")


class TestClinicCreate:
    def test_minimal_clinic(self):
        c = ClinicCreate(name="مركز الشفاء")
        assert c.name == "مركز الشفاء"
        assert c.address is None

    def test_full_clinic(self):
        c = ClinicCreate(name="مركز الأمل", address="الرياض", phone_call="0501234567")
        assert c.phone_call == "0501234567"
