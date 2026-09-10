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
    is_active = Column(Boolean, default=True, server_default="true")
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
    age = Column(String(20), nullable=True)
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
    study_instance_uid = Column(String(255), nullable=True)
    modality = Column(String(50), nullable=False)
    series_count = Column(Integer, default=1, server_default="1")
    instances_count = Column(Integer, default=0, server_default="0")
    study_date = Column(DateTime(timezone=True), nullable=True)
    study_time = Column(String(50), nullable=True)
    body_part = Column(String(100), nullable=True)
    institution_name = Column(String(255), nullable=True)
    
    # Teleradiology & Workflow fields
    priority = Column(String(50), default="routine", server_default="routine")
    workflow_status = Column(String(50), default="unassigned", server_default="unassigned")
    assigned_doctor_id = Column(String(36), ForeignKey("doctors.id", ondelete="SET NULL"), nullable=True)
    sla_deadline = Column(DateTime(timezone=True), nullable=True)
    clinical_history = Column(Text, nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())

    patient = relationship("Patient", back_populates="studies")
    shared_links = relationship("SharedLink", back_populates="study", cascade="all, delete-orphan")
    report = relationship("Report", back_populates="study", uselist=False, cascade="all, delete-orphan")
    assigned_doctor = relationship("Doctor", foreign_keys=[assigned_doctor_id])


class SharedLink(Base):
    __tablename__ = "shared_links"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()), server_default=func.gen_random_uuid())
    study_id = Column(String(36), ForeignKey("studies.id", ondelete="CASCADE"))
    created_by_doctor = Column(String(36), ForeignKey("doctors.id", ondelete="SET NULL"), nullable=True)
    token = Column(String(255), unique=True, nullable=False)
    passcode_hash = Column(Text, nullable=True)
    allows_download = Column(Boolean, default=True, server_default="true")
    is_anonymized = Column(Boolean, default=False, server_default="false")
    views_count = Column(Integer, default=0, server_default="0")
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


class SecondOpinionRequest(Base):
    __tablename__ = "second_opinion_requests"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()), server_default=func.gen_random_uuid())
    study_id = Column(String(36), ForeignKey("studies.id", ondelete="CASCADE"), nullable=False)
    patient_id = Column(String(36), ForeignKey("patients.id", ondelete="CASCADE"), nullable=True)
    target_doctor_id = Column(String(36), ForeignKey("doctors.id", ondelete="CASCADE"), nullable=False)
    status = Column(String(50), default="PENDING", server_default="PENDING")  # PENDING, ACCEPTED, COMPLETED
    patient_notes = Column(Text, nullable=True)
    doctor_opinion = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    resolved_at = Column(DateTime(timezone=True), nullable=True)

    study = relationship("Study")
    patient = relationship("Patient")
    target_doctor = relationship("Doctor", foreign_keys=[target_doctor_id])


class TeleradOrder(Base):
    __tablename__ = "telerad_orders"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()), server_default=func.gen_random_uuid())
    study_id = Column(String(36), ForeignKey("studies.id", ondelete="CASCADE"), nullable=False)
    sender_clinic_id = Column(String(36), ForeignKey("clinics.id", ondelete="CASCADE"), nullable=False)
    target_clinic_id = Column(String(36), ForeignKey("clinics.id", ondelete="CASCADE"), nullable=False)
    assigned_radiologist_id = Column(String(36), ForeignKey("doctors.id", ondelete="SET NULL"), nullable=True)
    priority = Column(String(50), default="ROUTINE", server_default="ROUTINE")  # ROUTINE, URGENT_STAT
    clinical_notes = Column(Text, nullable=True)
    status = Column(String(50), default="DISPATCHED", server_default="DISPATCHED")  # DISPATCHED, IN_READING, COMPLETED, REJECTED
    sla_deadline = Column(DateTime(timezone=True), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    study = relationship("Study")
    sender_clinic = relationship("Clinic", foreign_keys=[sender_clinic_id])
    target_clinic = relationship("Clinic", foreign_keys=[target_clinic_id])
    assigned_radiologist = relationship("Doctor", foreign_keys=[assigned_radiologist_id])


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()), server_default=func.gen_random_uuid())
    doctor_id = Column(String(36), ForeignKey("doctors.id", ondelete="SET NULL"), nullable=True)
    clinic_id = Column(String(36), ForeignKey("clinics.id", ondelete="SET NULL"), nullable=True)
    action = Column(String(100), nullable=False)  # e.g., "VIEW_STUDY", "GENERATE_REPORT", "SHARE_LINK", "DISPATCH_TELERAD"
    resource_type = Column(String(50), nullable=False)  # e.g., "Study", "Report", "Patient"
    resource_id = Column(String(255), nullable=True)
    details = Column(Text, nullable=True)
    ip_address = Column(String(45), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    doctor = relationship("Doctor")
    clinic = relationship("Clinic")
