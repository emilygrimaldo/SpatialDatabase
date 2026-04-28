import matplotlib.pyplot as plt
import pandas as pd
import psycopg2

conn = psycopg2.connect(
    host="localhost",
    database="healthcare",
    user="postgres",
    password="your own password",
    port = 5432
)
query = """
SELECT 
  gender,
  age,
  smoking,
  alcohol_intake
FROM patient;
"""