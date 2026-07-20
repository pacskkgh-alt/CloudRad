import os
import uuid
import zipfile
import shutil
import logging
import pydicom
import requests
from io import BytesIO
from datetime import datetime
from fastapi import APIRouter, UploadFile, File, Depends, HTTPException, Form, Request
from sqlalchemy.orm import Session
from typing import List
import models, database, auth

logger = logging.getLogger(__name__)
MAX_UPLOAD_SIZE = 500 * 1024 * 1024  # 500 MB

router = APIRouter(prefix="/api", tags=["Upload & Studies"])
ORTHANC_URL = os.getenv("ORTHANC_URL", "http://cloudrad_orthanc:8042")


@router.get("/studies")
def get_studies(
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(database.get_db),
    current_doctor: models.Doctor = Depends(auth.get_current_doctor),
):
    """Return studies based on role. Uses JOIN for efficiency."""
    query = (
        db.query(models.Study)
        .join(models.Patient, models.Study.patient_id == models.Patient.id)
    )

    if current_doctor.role != "admin":
        query = query.filter(models.Patient.clinic_id == current_doctor.clinic_id)

    studies = (
        query.order_by(models.Study.created_at.desc())
        .offset(skip)
        .limit(limit)
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


@router.delete("/studies/{study_id}")
def delete_study(
    study_id: str,
    db: Session = Depends(database.get_db),
    current_doctor: models.Doctor = Depends(auth.get_current_doctor),
):
    """Securely deletes a study from DB and Orthanc PACS."""
    study = db.query(models.Study).filter(models.Study.id == study_id).first()
    if not study:
        raise HTTPException(status_code=404, detail="Study not found")

    # Access control: Admin or Doctor belonging to the same clinic
    if current_doctor.role != "admin" and study.patient.clinic_id != current_doctor.clinic_id:
        raise HTTPException(status_code=403, detail="Not authorized to delete this study")

    # Attempt to purge from Orthanc PACS
    try:
        res = requests.delete(f"{ORTHANC_URL}/studies/{study.orthanc_study_uuid}")
        if res.status_code not in [200, 404]:
            logger.warning(f"Failed to delete study from Orthanc: {res.status_code}")
    except Exception as e:
        logger.warning(f"Orthanc connection failed during delete: {e}")

    # Delete from DB
    db.delete(study)
    db.commit()
    return {"message": "Study deleted successfully"}


@router.post("/upload")
async def upload_dicom_zip(
    request: Request,
    file: UploadFile = File(None),
    files: list[UploadFile] = File(None),
    anonymize: bool = Form(False),
    db: Session = Depends(database.get_db),
    current_doctor: models.Doctor = Depends(auth.get_current_doctor),
):
    content_length = request.headers.get("content-length")
    if content_length and int(content_length) > MAX_UPLOAD_SIZE:
        raise HTTPException(status_code=413, detail="Payload Too Large. Limit is 500MB.")

    if not file and not files:
        raise HTTPException(status_code=400, detail="No files provided")

    temp_uuid = uuid.uuid4().hex
    temp_dir = f"/tmp/upload_{temp_uuid}"
    os.makedirs(temp_dir, exist_ok=True)

    if file:
        if file.filename.endswith(".zip"):
            zip_path = os.path.join(temp_dir, file.filename)
            with open(zip_path, "wb") as buffer:
                shutil.copyfileobj(file.file, buffer)
            with zipfile.ZipFile(zip_path, "r") as zip_ref:
                zip_ref.extractall(temp_dir)
        else:
            safe_name = file.filename.replace("/", "_").replace("\\", "_")
            file_path = os.path.join(temp_dir, safe_name)
            with open(file_path, "wb") as buffer:
                shutil.copyfileobj(file.file, buffer)
                
    if files:
        for f in files:
            safe_name = f.filename.replace("/", "_").replace("\\", "_")
            file_path = os.path.join(temp_dir, safe_name)
            with open(file_path, "wb") as buffer:
                shutil.copyfileobj(f.file, buffer)

    study_info = {
        "num_instances": 0,
        "series_uids": set(),
        "patient_id": None,
        "patient_name": None,
        "modality": None,
        "study_uid": None,
        "study_date": None,
        "study_time": None,
        "patient_age": None,
        "patient_sex": None,
        "body_part": None,
        "institution": None,
        "orthanc_study_uuid": None,
    }

    try:
        for root, _, file_list in os.walk(temp_dir):
            for filename in file_list:
                filepath = os.path.join(root, filename)
                if filename.endswith(".zip"):
                    continue
                try:
                    dcm = pydicom.dcmread(filepath, stop_before_pixels=not anonymize)
                    study_info["num_instances"] += 1

                    if anonymize:
                        dcm.PatientName = "مريض مجهول الهوية"
                        dcm.PatientID = f"ANON-{temp_uuid[:8]}"
                        dcm.PatientBirthDate = ""
                        dcm.InstitutionName = "CloudRad (Secured)"

                    if not study_info["patient_id"]:
                        study_info["patient_id"] = str(getattr(dcm, "PatientID", "UNKNOWN"))
                        patient_name = getattr(dcm, "PatientName", "UNKNOWN")
                        study_info["patient_name"] = str(patient_name)
                        study_info["modality"] = str(getattr(dcm, "Modality", "UNKNOWN"))
                        study_info["study_uid"] = str(getattr(dcm, "StudyInstanceUID", "UNKNOWN"))
                        study_info["study_date"] = str(getattr(dcm, "StudyDate", ""))
                        study_info["study_time"] = str(getattr(dcm, "StudyTime", ""))
                        study_info["patient_age"] = str(getattr(dcm, "PatientAge", ""))
                        study_info["patient_sex"] = str(getattr(dcm, "PatientSex", ""))
                        study_info["body_part"] = str(getattr(dcm, "BodyPartExamined", ""))
                        study_info["institution"] = str(getattr(dcm, "InstitutionName", ""))

                    study_info["series_uids"].add(str(getattr(dcm, "SeriesInstanceUID", "UNKNOWN")))

                    # Forward to Orthanc
                    if anonymize:
                        out = BytesIO()
                        dcm.save_as(out)
                        data_to_send = out.getvalue()
                    else:
                        with open(filepath, "rb") as dcm_file:
                            data_to_send = dcm_file.read()

                    res = requests.post(
                        f"{ORTHANC_URL}/instances",
                        data=data_to_send,
                        headers={"Content-Type": "application/dicom"},
                        auth=requests.auth.HTTPBasicAuth("cloudrad_pacs", "CloudR4d_P4cs_Secur3!")
                    )
                    if res.status_code == 200:
                        try:
                            resp_json = res.json()
                            if "ParentStudy" in resp_json:
                                study_info["orthanc_study_uuid"] = resp_json["ParentStudy"]
                        except Exception:
                            pass
                except Exception as e:
                    logger.warning(f"Failed to process {filename}: {e}")

        # Use the doctor's clinic
        clinic_id = current_doctor.clinic_id

        if not study_info["patient_id"]:
            raise HTTPException(status_code=400, detail="No valid DICOM files found in payload.")

        # Check and create Patient in DB (filter by clinic_id too)
        patient = (
            db.query(models.Patient)
            .filter(
                models.Patient.patient_id_number == study_info["patient_id"],
                models.Patient.clinic_id == clinic_id,
            )
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
                age=study_info["patient_age"],
                gender=study_info["patient_sex"],
            )
            db.add(patient)
            db.commit()
            db.refresh(patient)

        # Check and create Study in DB
        actual_orthanc_uuid = study_info.get("orthanc_study_uuid") or study_info["study_uid"]
        
        parsed_study_date = None
        if study_info["study_date"] and len(study_info["study_date"]) == 8:
            try:
                parsed_study_date = datetime.strptime(study_info["study_date"], "%Y%m%d")
            except Exception:
                pass
                
        study = (
            db.query(models.Study)
            .filter(models.Study.orthanc_study_uuid == actual_orthanc_uuid)
            .first()
        )
        if not study:
            study = models.Study(
                patient_id=patient.id,
                orthanc_study_uuid=actual_orthanc_uuid,
                modality=study_info["modality"],
                series_count=len(study_info["series_uids"]),
                instances_count=study_info["num_instances"],
                study_date=parsed_study_date,
                study_time=study_info["study_time"],
                body_part=study_info["body_part"],
                institution_name=study_info["institution"],
            )
            db.add(study)
            db.commit()
            db.refresh(study)

    finally:
        shutil.rmtree(temp_dir, ignore_errors=True)
        logger.info(f"Cleaned up temporary directory: {temp_dir}")

    return {
        "message": "Upload successful", 
        "study_id": study.id,
        "metadata": {
            "patient_name": patient.full_name,
            "patient_id": patient.patient_id_number,
            "patient_age": patient.age,
            "patient_gender": patient.gender,
            "modality": study.modality,
            "study_date": study.study_date,
            "study_time": study.study_time,
            "body_part": study.body_part,
            "instances_count": study.instances_count,
            "institution_name": study.institution_name
        }
    }
