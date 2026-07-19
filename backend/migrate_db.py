from database import engine
from sqlalchemy import text

def run_migration():
    with engine.connect() as conn:
        try:
            conn.execute(text("ALTER TABLE patients ADD COLUMN age VARCHAR(20);"))
            print("Added 'age' column to patients")
        except Exception as e:
            print("Patient alter error:", e)
            
        try:
            conn.execute(text("ALTER TABLE studies ADD COLUMN study_time VARCHAR(50);"))
            conn.execute(text("ALTER TABLE studies ADD COLUMN body_part VARCHAR(100);"))
            conn.execute(text("ALTER TABLE studies ADD COLUMN institution_name VARCHAR(255);"))
            print("Added new columns to studies")
        except Exception as e:
            print("Study alter error:", e)

        try:
            conn.execute(text("ALTER TABLE doctors ADD COLUMN is_active BOOLEAN DEFAULT TRUE NOT NULL;"))
            print("Added 'is_active' column to doctors")
        except Exception as e:
            print("Doctor alter error:", e)
        conn.commit()

if __name__ == "__main__":
    run_migration()
