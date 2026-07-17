import uuid
from sqlalchemy import Column, String, Text, Integer, Boolean, Date, DateTime, ForeignKey, UniqueConstraint
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base

class Clinic(Base):
    __tablename__ = "clinics"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()), server_default=func.gen_random_uuid())
    name = Column(String(255), nullable=False)
    logo_url = Column(Text, nullable=True)
    address = Column(Text, nullable=True)
    phone_call = Column(String(20), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    doctors = relationship("Doctor", back_populates="clinic", cascade="all, delete-orphan")
    patients = relationship("Patient", back_populates="clinic", cascade="all, delete-orphan")


class Doctor(Base):
    __tablename__ = "doctors"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()), server_default=func.gen_random_uuid())
    clinic_id = Column(String(36), ForeignKey("clinics.id", ondelete="CASCADE"))
    full_name = Column(String(255), nullable=False)
    email = Column(String(255), unique=True, nullable=False)
    password_hash = Column(Text, nullable=False)
    signature_url = Column(Text, nullable=True)
    role = Column(String(50), default="doctor", server_default="doctor")
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    clinic = relationship("Clinic", back_populates="doctors")
    shared_links = relationship("SharedLink", back_populates="doctor")
    reports = relationship("Report", back_populates="doctor")


class Patient(Base):
    __tablename__ = "patients"
    __table_args__ = (UniqueConstraint("clinic_id", "patient_id_number", name="unique_patient_per_clinic"),)

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()), server_default=func.gen_random_uuid())
    clinic_id = Column(String(36), ForeignKey("clinics.id", ondelete="CASCADE"))
    patient_id_number = Column(String(100), nullable=False)
    full_name = Column(String(255), nullable=False)
    birth_date = Column(Date, nullable=True)
    gender = Column(String(10), nullable=True)
    phone = Column(String(20), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    clinic = relationship("Clinic", back_populates="patients")
    studies = relationship("Study", back_populates="patient", cascade="all, delete-orphan")


class Study(Base):
    __tablename__ = "studies"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()), server_default=func.gen_random_uuid())
    patient_id = Column(String(36), ForeignKey("patients.id", ondelete="CASCADE"))
    orthanc_study_uuid = Column(String(255), nullable=False, unique=True)
    modality = Column(String(50), nullable=False)
    series_count = Column(Integer, default=1, server_default="1")
    instances_count = Column(Integer, default=0, server_default="0")
    study_date = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    patient = relationship("Patient", back_populates="studies")
    shared_links = relationship("SharedLink", back_populates="study", cascade="all, delete-orphan")
    report = relationship("Report", back_populates="study", uselist=False, cascade="all, delete-orphan")


class SharedLink(Base):
    __tablename__ = "shared_links"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()), server_default=func.gen_random_uuid())
    study_id = Column(String(36), ForeignKey("studies.id", ondelete="CASCADE"))
    created_by_doctor = Column(String(36), ForeignKey("doctors.id", ondelete="SET NULL"), nullable=True)
    token = Column(String(255), unique=True, nullable=False)
    passcode_hash = Column(Text, nullable=True)
    allows_download = Column(Boolean, default=True, server_default="true")
    is_anonymized = Column(Boolean, default=False, server_default="false")
    expires_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    study = relationship("Study", back_populates="shared_links")
    doctor = relationship("Doctor", back_populates="shared_links")


class Report(Base):
    __tablename__ = "reports"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()), server_default=func.gen_random_uuid())
    study_id = Column(String(36), ForeignKey("studies.id", ondelete="CASCADE"), unique=True)
    doctor_id = Column(String(36), ForeignKey("doctors.id", ondelete="SET NULL"), nullable=True)
    report_content = Column(Text, nullable=False)
    is_finalized = Column(Boolean, default=False, server_default="false")
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    study = relationship("Study", back_populates="report")
    doctor = relationship("Doctor", back_populates="reports")
