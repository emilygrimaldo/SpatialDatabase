import matplotlib.pyplot as plt
import pandas as pd
import psycopg2

conn = psycopg2.connect(
    host="localhost",
    database="healthcare",
    user="postgres",
    password="your own pass",
    port = 5432
)
query = """
SELECT 
  patient_id,
  smoking,
  alcohol_intake,
  bmi,
  physical_activity,
  heart_disease
FROM patient;"""