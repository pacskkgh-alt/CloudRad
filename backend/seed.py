import os
import pydicom
from pydicom.dataset import Dataset, FileDataset, FileMetaDataset
from pydicom.uid import ImplicitVRLittleEndian, generate_uid
import datetime
import requests
from sqlalchemy.orm import Session
from passlib.context import CryptContext

import database
import models

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def create_dummy_dicom(filename="dummy.dcm"):
    # File meta info data elements
    file_meta = FileMetaDataset()
    file_meta.MediaStorageSOPClassUID = '1.2.840.10008.5.1.4.1.1.2' # CT Image Storage
    file_meta.MediaStorageSOPInstanceUID = generate_uid()
    file_meta.TransferSyntaxUID = ImplicitVRLittleEndian

    # Main data elements
    ds = FileDataset(filename, {}, file_meta=file_meta, preamble=b"\0" * 128)

    ds.PatientName = "Test^Patient"
    ds.PatientID = "PT-10001"
    ds.PatientBirthDate = "19800101"
    ds.PatientSex = "M"

    # Study information
    ds.StudyInstanceUID = generate_uid()
    ds.SeriesInstanceUID = generate_uid()
    ds.SOPInstanceUID = file_meta.MediaStorageSOPInstanceUID
    ds.SOPClassUID = file_meta.MediaStorageSOPClassUID
    ds.StudyDate = datetime.datetime.now().strftime('%Y%m%d')
    ds.SeriesDate = datetime.datetime.now().strftime('%Y%m%d')
    ds.StudyTime = datetime.datetime.now().strftime('%H%M%S')
    ds.Modality = "CT"
    ds.is_little_endian = True
    ds.is_implicit_VR = True

    ds.save_as(filename)
    print(f"Created synthetic DICOM file: {filename}")
    return filename

def seed_database():
    print("Seeding database...")
    db = next(database.get_db())
    
    # 1. Ensure a Clinic exists
    clinic = db.query(models.Clinic).first()
    if not clinic:
        clinic = models.Clinic(name="CloudRad Main Hospital", address="123 Cloud Ave", phone_call="+1-555-0100")
        db.add(clinic)
        db.commit()
        db.refresh(clinic)
        print("Created dummy Clinic.")

    # 2. Add Test Doctor
    doctor = db.query(models.Doctor).filter(models.Doctor.email == "test_doctor@cloudrad.com").first()
    if not doctor:
        doctor = models.Doctor(
            clinic_id=clinic.id,
            full_name="Dr. Test User",
            email="test_doctor@cloudrad.com",
            password_hash=pwd_context.hash("pass123")
        )
        db.add(doctor)
        db.commit()
        db.refresh(doctor)
        print("Created dummy Doctor: test_doctor@cloudrad.com / pass123")

    # 3. Create Patient & DICOM File via Upload Flow
    dcm_file = create_dummy_dicom()
    
    # Normally we would zip it and send to the upload endpoint during E2E test.
    # But since this is a direct seed script, we will just emulate Orthanc injection & DB creation.
    
    ORTHANC_URL = os.getenv("ORTHANC_URL", "http://localhost:8042")
    try:
        with open(dcm_file, "rb") as f:
            res = requests.post(f"{ORTHANC_URL}/instances", data=f.read(), headers={"Content-Type": "application/dicom"})
            if res.status_code == 200:
                print("Uploaded dummy DICOM to Orthanc successfully.")
            else:
                print("Failed to upload to Orthanc (Check if Orthanc is running).")
    except Exception as e:
        print(f"Could not connect to Orthanc to upload Seed DICOM: {e}")

    # Register the corresponding DB Patient & Study to match the DICOM
    patient = db.query(models.Patient).filter(models.Patient.patient_id_number == "PT-10001").first()
    if not patient:
        patient = models.Patient(
            clinic_id=clinic.id,
            patient_id_number="PT-10001",
            full_name="Test Patient",
            gender="M"
        )
        db.add(patient)
        db.commit()
        db.refresh(patient)
        print("Created dummy Patient PT-10001.")

    # In a real scenario, extracting tags like api_upload.py, but here we just read the file we generated
    ds = pydicom.dcmread(dcm_file)
    study = db.query(models.Study).filter(models.Study.orthanc_study_uuid == str(ds.StudyInstanceUID)).first()
    if not study:
        study = models.Study(
            patient_id=patient.id,
            orthanc_study_uuid=str(ds.StudyInstanceUID),
            modality=ds.Modality,
            series_count=1,
            instances_count=1
        )
        db.add(study)
        db.commit()
        print(f"Created Study record for dummy DICOM.")

    if os.path.exists(dcm_file):
        os.remove(dcm_file)

    print("Seed data completed successfully!")

if __name__ == "__main__":
    seed_database()
