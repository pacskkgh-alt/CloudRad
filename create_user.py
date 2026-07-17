import database, models, auth

db = database.SessionLocal()
try:
    doc = db.query(models.Doctor).filter(models.Doctor.email == "admin@cloudrad.com").first()
    if not doc:
        pwd = auth.get_password_hash("admin123")
        doc = models.Doctor(email="admin@cloudrad.com", full_name="Dr. Admin", hashed_password=pwd, clinic_id="clinic-1")
        db.add(doc)
        db.commit()
        print("Created user admin@cloudrad.com with password admin123")
    else:
        print("User already exists")
finally:
    db.close()
