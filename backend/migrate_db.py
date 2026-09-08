import models
from database import engine
from sqlalchemy import text

def run_migration():
    """
    Idempotent database migration script.
    Ensures that all tables and newly added columns
    exist in the database without failing or aborting if already present.
    """
    # 1. Create any missing tables (including second_opinion_requests, telerad_orders)
    try:
        models.Base.metadata.create_all(bind=engine)
        print("Migration: metadata.create_all completed successfully.")
    except Exception as e:
        print("Migration: create_all notice:", e)

    # 2. Idempotent column alterations
    migrations = [
        ("ALTER TABLE patients ADD COLUMN IF NOT EXISTS age VARCHAR(20);", "patients.age"),
        ("ALTER TABLE studies ADD COLUMN IF NOT EXISTS study_time VARCHAR(50);", "studies.study_time"),
        ("ALTER TABLE studies ADD COLUMN IF NOT EXISTS body_part VARCHAR(100);", "studies.body_part"),
        ("ALTER TABLE studies ADD COLUMN IF NOT EXISTS institution_name VARCHAR(255);", "studies.institution_name"),
        ("ALTER TABLE doctors ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE NOT NULL;", "doctors.is_active"),
    ]

    with engine.connect() as conn:
        for sql_statement, col_description in migrations:
            try:
                conn.execute(text(sql_statement))
                conn.commit()
                print(f"Migration: successfully ensured column '{col_description}' exists.")
            except Exception as e:
                print(f"Migration note for '{col_description}': {e}")

if __name__ == "__main__":
    run_migration()
