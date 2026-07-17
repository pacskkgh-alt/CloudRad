import os
import zipfile
import shutil
import pydicom
import requests
from fastapi import APIRouter, UploadFile, File, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
import models, database, auth

router = APIRouter(prefix="/api", tags=["Upload & Studies"])
ORTHANC_URL = os.getenv("ORTHANC_URL", "http://cloudrad_orthanc:8042")


@router.get("/studies")
def get_studies(
    db: Session = Depends(database.get_db),
    current_doctor: models.Doctor = Depends(auth.get_current_doctor),
):
    """Return all studies for the current doctor's clinic."""
    patients = (
        db.query(models.Patient)
        .filter(models.Patient.clinic_id == current_doctor.clinic_id)
        .all()
    )
    patient_ids = [p.id for p in patients]

    studies = (
        db.query(models.Study)
        .filter(models.Study.patient_id.in_(patient_ids))
        .order_by(models.Study.created_at.desc())
        .all()
    )

    results = []
    for study in studies:
        patient = study.patient
        results.append({
            "id": study.id,
            "patient_name": patient.full_name if patient else "Unknown",
            "patient_id_number": patient.patient_id_number if patient else "N/A",
            "modality": study.modality,
            "series_count": study.series_count,
            "instances_count": study.instances_count,
            "orthanc_study_uuid": study.orthanc_study_uuid,
            "study_date": str(study.study_date) if study.study_date else None,
            "created_at": str(study.created_at) if study.created_at else None,
            "has_report": study.report is not None,
        })
    return results


@router.post("/upload")
async def upload_dicom_zip(
    file: UploadFile = File(...),
    db: Session = Depends(database.get_db),
    current_doctor: models.Doctor = Depends(auth.get_current_doctor),
):
    if not file.filename.endswith(".zip"):
        raise HTTPException(status_code=400, detail="Only ZIP files are supported for bulk upload")

    temp_dir = f"/tmp/{file.filename}"
    os.makedirs(temp_dir, exist_ok=True)
    zip_path = os.path.join(temp_dir, file.filename)

    with open(zip_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    study_info = {
        "num_instances": 0,
        "series_uids": set(),
        "patient_id": None,
        "patient_name": None,
        "modality": None,
        "study_uid": None,
        "study_date": None,
    }

    try:
        with zipfile.ZipFile(zip_path, "r") as zip_ref:
            zip_ref.extractall(temp_dir)

        for root, _, files in os.walk(temp_dir):
            for filename in files:
                filepath = os.path.join(root, filename)
                if filename.endswith(".zip"):
                    continue
                try:
                    dcm = pydicom.dcmread(filepath, stop_before_pixels=True)
                    study_info["num_instances"] += 1

                    if not study_info["patient_id"]:
                        study_info["patient_id"] = str(getattr(dcm, "PatientID", "UNKNOWN"))
                        patient_name = getattr(dcm, "PatientName", "UNKNOWN")
                        study_info["patient_name"] = str(patient_name)
                        study_info["modality"] = str(getattr(dcm, "Modality", "UNKNOWN"))
                        study_info["study_uid"] = str(getattr(dcm, "StudyInstanceUID", "UNKNOWN"))
                        study_info["study_date"] = str(getattr(dcm, "StudyDate", ""))

                    study_info["series_uids"].add(str(getattr(dcm, "SeriesInstanceUID", "UNKNOWN")))

                    # Forward to Orthanc
                    with open(filepath, "rb") as dcm_file:
                        res = requests.post(
                            f"{ORTHANC_URL}/instances",
                            data=dcm_file.read(),
                            headers={"Content-Type": "application/dicom"},
                        )
                except Exception as e:
                    print(f"Failed to process {filename}: {e}")

        # Use the doctor's clinic
        clinic_id = current_doctor.clinic_id

        # Check and create Patient in DB
        patient = (
            db.query(models.Patient)
            .filter(models.Patient.patient_id_number == study_info["patient_id"])
            .first()
        )
        if not patient:
            if not clinic_id:
                clinic = db.query(models.Clinic).first()
                if not clinic:
                    clinic = models.Clinic(name="Default MVP Clinic")
                    db.add(clinic)
                    db.commit()
                    db.refresh(clinic)
                clinic_id = clinic.id

            patient = models.Patient(
                clinic_id=clinic_id,
                patient_id_number=study_info["patient_id"],
                full_name=study_info["patient_name"],
            )
            db.add(patient)
            db.commit()
            db.refresh(patient)

        # Check and create Study in DB
        study = (
            db.query(models.Study)
            .filter(models.Study.orthanc_study_uuid == study_info["study_uid"])
            .first()
        )
        if not study:
            study = models.Study(
                patient_id=patient.id,
                orthanc_study_uuid=study_info["study_uid"],
                modality=study_info["modality"],
                series_count=len(study_info["series_uids"]),
                instances_count=study_info["num_instances"],
            )
            db.add(study)
            db.commit()
            db.refresh(study)

    finally:
        shutil.rmtree(temp_dir, ignore_errors=True)

    return {"message": "Upload successful", "study_id": study.id}
