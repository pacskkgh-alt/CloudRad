import os
import shutil
import zipfile
import uuid
import logging
from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, UploadFile, File, Form, Depends, HTTPException, Request
from sqlalchemy.orm import Session
import pydicom
import requests
from io import BytesIO

import models
import database
import auth
from pydantic import BaseModel
from api_config import ORTHANC_URL, ORTHANC_USER, ORTHANC_PASSWORD, MAX_UPLOAD_SIZE

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api", tags=["Chunked Upload & Share"])

def clean_patient_name(name_obj) -> str:
    if not name_obj:
        return "Unknown"
    # pydicom PersonName can be converted to str easily
    return str(name_obj).replace('^', ' ').strip()


@router.post("/upload-chunk")
async def upload_chunk(
    request: Request,
    chunk: UploadFile = File(...),
    chunkIndex: int = Form(...),
    totalChunks: int = Form(...),
    uploadId: str = Form(...),
    db: Session = Depends(database.get_db),
    current_doctor: models.Doctor = Depends(auth.get_current_doctor),
):
    """
    Accepts a file chunk. Once all chunks are received, reassembles and processes the DICOM data.
    """
    # Enforce basic payload limit per request header if available
    content_length = request.headers.get("content-length")
    if content_length and int(content_length) > MAX_UPLOAD_SIZE:
        raise HTTPException(status_code=413, detail="Payload Too Large")

    tmp_dir = f"/tmp/{uploadId}"
    os.makedirs(tmp_dir, exist_ok=True)
    
    chunk_path = os.path.join(tmp_dir, f"chunk_{chunkIndex}")
    
    with open(chunk_path, "wb") as f:
        shutil.copyfileobj(chunk.file, f)
        
    if chunkIndex == totalChunks - 1:
        # Validate all chunks exist before assembly
        missing = [i for i in range(totalChunks) if not os.path.exists(os.path.join(tmp_dir, f"chunk_{i}"))]
        if missing:
            shutil.rmtree(tmp_dir, ignore_errors=True)
            raise HTTPException(status_code=400, detail=f"Missing chunks: {missing}")

        # All chunks received, assemble
        assembled_zip_path = os.path.join(tmp_dir, "combined.zip")
        with open(assembled_zip_path, "wb") as out_file:
            for i in range(totalChunks):
                part_path = os.path.join(tmp_dir, f"chunk_{i}")
                with open(part_path, "rb") as in_file:
                    shutil.copyfileobj(in_file, out_file)
                os.remove(part_path)
                
        # Now process the ZIP containing DICOM files
        study_info = {
            "num_instances": 0,
            "series_uids": set(),
            "patient_id": None,
            "patient_name": "Unknown",
            "modality": "UNKNOWN",
            "study_uid": None,
            "study_date": None,
            "study_time": None,
            "patient_age": None,
            "patient_sex": "O",
            "body_part": None,
            "institution_name": None
        }
        
        extracted_dir = os.path.join(tmp_dir, "extracted")
        os.makedirs(extracted_dir, exist_ok=True)
        
        try:
            with zipfile.ZipFile(assembled_zip_path, "r") as zip_ref:
                zip_ref.extractall(extracted_dir)
            
            for root, _, files in os.walk(extracted_dir):
                for file_name in files:
                    file_path = os.path.join(root, file_name)
                    # Try to process as DICOM
                    try:
                        dcm = pydicom.dcmread(file_path, stop_before_pixels=False)
                        study_info["num_instances"] += 1
                        
                        if not study_info["patient_id"]:
                            study_info["patient_id"] = str(getattr(dcm, "PatientID", f"UN-{uuid.uuid4().hex[:6]}"))
                            study_info["patient_name"] = clean_patient_name(getattr(dcm, "PatientName", None))
                            study_info["modality"] = str(getattr(dcm, "Modality", "UNKNOWN"))
                            study_info["study_uid"] = str(getattr(dcm, "StudyInstanceUID", uuid.uuid4().hex))
                            
                            # Parse dates / age safely
                            study_date = getattr(dcm, "StudyDate", None)
                            if study_date:
                                # Keep raw string or format if needed
                                study_info["study_date"] = str(study_date)

                            study_time = getattr(dcm, "StudyTime", None)
                            if study_time:
                                study_info["study_time"] = str(study_time)

                            study_info["patient_age"] = str(getattr(dcm, "PatientAge", getattr(dcm, "PatientBirthDate", "")))
                            study_info["patient_sex"] = str(getattr(dcm, "PatientSex", "O"))
                            study_info["body_part"] = str(getattr(dcm, "BodyPartExamined", ""))
                            study_info["institution_name"] = str(getattr(dcm, "InstitutionName", ""))
                        study_info["series_uids"].add(str(getattr(dcm, "SeriesInstanceUID", "UNKNOWN")))
                        
                        # Forward to Orthanc
                        with open(file_path, "rb") as dicom_payload:
                            res = requests.post(
                                f"{ORTHANC_URL}/instances",
                                data=dicom_payload.read(),
                                headers={"Content-Type": "application/dicom"},
                                auth=requests.auth.HTTPBasicAuth(ORTHANC_USER, ORTHANC_PASSWORD),
                            )
                            if res.status_code >= 400:
                                logger.warning(f"Orthanc rejected instance {file_name}: {res.status_code}")
                                
                    except pydicom.errors.InvalidDicomError:
                        # Skip non-DICOM files safely
                        pass
                    except Exception as e:
                        logger.error(f"Error processing {file_name}: {str(e)}")

        except Exception as e:
            shutil.rmtree(tmp_dir, ignore_errors=True)
            raise HTTPException(status_code=500, detail="Failed to extract or process DICOM payload due to an internal error.")
            
        # Store metadata into the Database
        if not study_info["patient_id"]:
            shutil.rmtree(tmp_dir, ignore_errors=True)
            raise HTTPException(status_code=400, detail="No valid DICOM files found in payload.")
            
        clinic_id = current_doctor.clinic_id
        
        # Check / Create Patient
        patient = db.query(models.Patient).filter(
            models.Patient.patient_id_number == study_info["patient_id"],
            models.Patient.clinic_id == clinic_id
        ).first()
        
        if not patient:
            patient = models.Patient(
                clinic_id=clinic_id,
                patient_id_number=study_info["patient_id"],
                full_name=study_info["patient_name"],
                age=study_info["patient_age"],
                gender=study_info["patient_sex"]
            )
            db.add(patient)
            db.commit()
            db.refresh(patient)
            
        # Check / Create Study
        study = db.query(models.Study).filter(
            models.Study.orthanc_study_uuid == study_info["study_uid"]
        ).first()
        
        # We store StudyDate in DB (DateTime type) but we just have a string, models.py handles None or parsing.
        # Actually StudyDate in models.py is DateTime. For simplicity, we can pass None or convert.
        parsed_dt = None
        if study_info["study_date"] and len(study_info["study_date"]) == 8:
            try:
                parsed_dt = datetime.strptime(study_info["study_date"], "%Y%m%d")
            except Exception:
                pass

        if not study:
            study = models.Study(
                patient_id=patient.id,
                orthanc_study_uuid=study_info["study_uid"],
                modality=study_info["modality"],
                series_count=len(study_info["series_uids"]),
                instances_count=study_info["num_instances"],
                study_date=parsed_dt,
                study_time=study_info.get("study_time"),
                body_part=study_info.get("body_part"),
                institution_name=study_info.get("institution_name"),
            )
            db.add(study)
            db.commit()
            db.refresh(study)
            
        shutil.rmtree(tmp_dir, ignore_errors=True)
        return {
            "message": "Upload complete and processed.",
            "study_id": study.id,
            "patient_info": {
                "name": patient.full_name,
                "id": patient.patient_id_number,
                "age": patient.age,
                "sex": patient.gender
            },
            "study_details": {
                "modality": study.modality,
                "date": str(study.study_date),
                "instances": study.instances_count
            }
        }
        
    return {"message": f"Chunk {chunkIndex} received successfully."}


class GenerateShareLinkRequest(BaseModel):
    study_id: str
    expiry_days: int

@router.post("/generate-share-link")
def generate_share_link(
    req: GenerateShareLinkRequest,
    db: Session = Depends(database.get_db),
    current_doctor: models.Doctor = Depends(auth.get_current_doctor)
):
    """
    Generates a secure expiry token URL for a given study ID.
    """
    study = db.query(models.Study).filter(models.Study.id == req.study_id).first()
    if not study:
        raise HTTPException(status_code=404, detail="Study not found")

    # Ownership check: doctor must belong to the same clinic as the patient
    if study.patient and study.patient.clinic_id != current_doctor.clinic_id:
        if current_doctor.role != "admin":
            raise HTTPException(status_code=403, detail="ليس لديك صلاحية مشاركة هذه الدراسة")

    expiry_date = datetime.now(timezone.utc) + timedelta(days=req.expiry_days)
    token = uuid.uuid4().hex
    
    link = models.SharedLink(
        study_id=study.id,
        created_by_doctor=current_doctor.id,
        token=token,
        expires_at=expiry_date
    )
    db.add(link)
    db.commit()
    db.refresh(link)
    
    return {
        "status": "success",
        "token": link.token,
        "expiry_date": str(link.expires_at),
        "url": f"/view/{link.token}" # Represents the frontend link generated
    }
