import sqlite3
import os

db_path = os.path.join(os.path.dirname(__file__), "backend", "cloudrad.db")

if not os.path.exists(db_path):
    print("DB not found")
    exit(1)

conn = sqlite3.connect(db_path)
cursor = conn.cursor()

columns_to_add = [
    ("priority", "VARCHAR(50) DEFAULT 'routine'"),
    ("workflow_status", "VARCHAR(50) DEFAULT 'unassigned'"),
    ("assigned_doctor_id", "VARCHAR(36)"),
    ("sla_deadline", "DATETIME"),
    ("clinical_history", "TEXT")
]

for col_name, col_type in columns_to_add:
    try:
        cursor.execute(f"ALTER TABLE studies ADD COLUMN {col_name} {col_type}")
        print(f"Added column {col_name} successfully.")
    except sqlite3.OperationalError as e:
        if "duplicate column name" in str(e).lower():
            print(f"Column {col_name} already exists.")
        else:
            print(f"Error adding {col_name}: {e}")

conn.commit()
conn.close()
print("Migration completed.")
