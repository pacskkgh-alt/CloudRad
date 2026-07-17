import os
import io
import qrcode
import tempfile
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import Response
from sqlalchemy.orm import Session
from pydantic import BaseModel
import models, database, auth
from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas
from reportlab.lib.units import inch
from reportlab.lib.utils import simpleSplit

router = APIRouter(prefix="/api/reports", tags=["Reports"])


class ReportCreate(BaseModel):
    study_id: str
    report_content: str
    is_finalized: bool = False


@router.post("/")
def create_or_update_report(
    report_in: ReportCreate,
    db: Session = Depends(database.get_db),
    current_doctor: models.Doctor = Depends(auth.get_current_doctor),
):
    report = db.query(models.Report).filter(models.Report.study_id == report_in.study_id).first()
    if report:
        report.report_content = report_in.report_content
        report.is_finalized = report_in.is_finalized
        report.doctor_id = current_doctor.id
    else:
        report = models.Report(
            study_id=report_in.study_id,
            doctor_id=current_doctor.id,
            report_content=report_in.report_content,
            is_finalized=report_in.is_finalized,
        )
        db.add(report)
    db.commit()
    db.refresh(report)
    return {"message": "Report saved successfully", "id": report.id}


@router.get("/{study_id}")
def get_report(study_id: str, db: Session = Depends(database.get_db)):
    """Public endpoint — used by patient portal via share links."""
    report = db.query(models.Report).filter(models.Report.study_id == study_id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    return {
        "report_content": report.report_content,
        "is_finalized": report.is_finalized,
        "doctor_name": report.doctor.full_name if report.doctor else "N/A",
    }


@router.get("/{study_id}/pdf")
def download_pdf(study_id: str, token: str = None, db: Session = Depends(database.get_db)):
    study = db.query(models.Study).filter(models.Study.id == study_id).first()
    report = db.query(models.Report).filter(models.Report.study_id == study_id).first()

    if not study or not report:
        raise HTTPException(status_code=404, detail="Study or Report not found")

    patient = study.patient

    # Generate QR Code
    frontend_url = os.getenv("FRONTEND_URL", "http://localhost:5173")
    viewer_url = f"{frontend_url}/patient/{token}" if token else frontend_url
    qr = qrcode.QRCode(version=1, box_size=5, border=2)
    qr.add_data(viewer_url)
    qr.make(fit=True)
    img_qr = qr.make_image(fill_color="black", back_color="white")

    qr_io = io.BytesIO()
    img_qr.save(qr_io, format="PNG")
    qr_io.seek(0)

    with tempfile.NamedTemporaryFile(suffix=".png", delete=False) as tf:
        tf.write(qr_io.read())
        tf_path = tf.name

    # Generate PDF
    pdf_buffer = io.BytesIO()
    c = canvas.Canvas(pdf_buffer, pagesize=letter)
    width, height = letter

    c.setFont("Helvetica-Bold", 20)
    c.drawString(1 * inch, height - 1 * inch, "CloudRad Medical Report")

    c.setFont("Helvetica", 12)
    c.drawString(1 * inch, height - 1.5 * inch, f"Patient Name: {patient.full_name}")
    c.drawString(1 * inch, height - 1.8 * inch, f"Patient ID: {patient.patient_id_number}")
    c.drawString(1 * inch, height - 2.1 * inch, f"Modality: {study.modality}")
    c.drawString(1 * inch, height - 2.4 * inch, f"Date: {study.study_date or 'N/A'}")

    c.line(1 * inch, height - 2.6 * inch, width - 1 * inch, height - 2.6 * inch)

    c.setFont("Helvetica-Bold", 14)
    c.drawString(1 * inch, height - 3 * inch, "Findings & Impression:")

    c.setFont("Helvetica", 11)
    lines = simpleSplit(report.report_content, "Helvetica", 11, width - 2 * inch)
    y_text = height - 3.3 * inch
    for line in lines:
        c.drawString(1 * inch, y_text, line)
        y_text -= 0.2 * inch

    c.drawImage(tf_path, width - 2.5 * inch, 0.5 * inch, width=1.5 * inch, height=1.5 * inch)
    c.setFont("Helvetica-Oblique", 9)
    c.drawString(width - 2.6 * inch, 0.3 * inch, "Scan to view images & report")

    c.showPage()
    c.save()
    os.unlink(tf_path)

    pdf_buffer.seek(0)
    headers = {"Content-Disposition": f'attachment; filename="report_{study_id}.pdf"'}
    return Response(content=pdf_buffer.read(), media_type="application/pdf", headers=headers)
