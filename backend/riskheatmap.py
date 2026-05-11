import pandas as pd
import psycopg2
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials= True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def get_connection():
    return psycopg2.connect(
      host="localhost",
      database="healthcare",
      user="postgres",
      password="ott3r",
      port = 5432
)
    
@app.get("/patients")
def get_patients():
    conn = get_connection()

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

    df = pd.read_sql_query(query, conn)
    conn.close()
    return df.to_dict(orient="records")
