import logging
import os
from contextlib import closing

import pandas as pd
import psycopg2
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

logger = logging.getLogger(__name__)

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_origin_regex=r"http://(localhost|127\.0\.0\.1):517[0-9]",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

DB_CONFIG = {
    "host": os.getenv("DB_HOST", "localhost"),
    "database": os.getenv("DB_NAME", "healthcare"),
    "user": os.getenv("DB_USER", "postgres"),
    "password": os.getenv("DB_PASSWORD", "ott3r"),
    "port": int(os.getenv("DB_PORT", "5432")),
    "connect_timeout": 5,
}


def get_connection():
    return psycopg2.connect(**DB_CONFIG)


@app.get("/")
def root():
    return {
        "service": "healthcare explorer backend",
        "patients_endpoint": "/patients",
        "database_health_endpoint": "/health/db",
    }


@app.get("/health/db")
def database_health():
    try:
        with closing(get_connection()) as conn:
            with conn.cursor() as cursor:
                cursor.execute("SELECT current_database(), current_user;")
                database_name, database_user = cursor.fetchone()
                cursor.execute("SELECT COUNT(*) FROM patient;")
                patient_count = cursor.fetchone()[0]

        return {
            "ok": True,
            "database": database_name,
            "user": database_user,
            "patient_count": patient_count,
        }
    except Exception as exc:
        logger.exception("Database health check failed")
        raise HTTPException(
            status_code=500,
            detail=f"Database health check failed: {type(exc).__name__}: {exc}",
        ) from exc
    
@app.get("/patients")
def get_patients():
    query = """
    SELECT
      patient_id AS "Patient_ID",
      age AS "Age",
      gender AS "Gender",
      bmi AS "BMI",
      blood_pressure_systolic AS "Blood_Pressure_Systolic",
      blood_pressure_diastolic AS "Blood_Pressure_Diastolic",
      cholesterol AS "Cholesterol",
      glucose_level AS "Glucose_Level",
      smoking AS "Smoking",
      alcohol_intake AS "Alcohol_Intake",
      physical_activity AS "Physical_Activity",
      family_history AS "Family_History",
      heart_disease AS "Heart_Disease",
      diabetes AS "Diabetes",
      stroke AS "Stroke"
    FROM patient;"""

    try:
        with closing(get_connection()) as conn:
            df = pd.read_sql_query(query, conn)
    except Exception as exc:
        logger.exception("Failed to load patients")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to load patients: {type(exc).__name__}: {exc}",
        ) from exc

    records = df.to_dict(orient="records")
    logger.info("Loaded %s patient records", len(records))
    return records


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="127.0.0.1", port=8000)
