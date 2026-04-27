## Healthcare Spatial Database Project

## Overview

This project explores how age and lifestyle factors influence health outcomes using a PostgreSQL database.
We created a lifestyle score based on smoking, alcohol intake, and physical activity, and used it to analyze disease risk.

## What We Did
1. Built a PostgreSQL database with patient data
2. Wrote SQL queries to analyze age, lifestyle, and disease rates
3. Created a lifestyle score to represent health behavior
4. Grouped data into age groups and lifestyle levels
5. Generated visualizations to show patterns

## Results
TBD

## Setup
1. Create a new database named healthcare
2. Run this to create the patient table

CREATE TABLE patient ( 
patient_id INT, 
age INT, 
gender TEXT, 
bmi FLOAT, 
blood_pressure_systolic INT, 
blood_pressure_diastolic INT, 
cholesterol INT, 
glucose_level INT, 
smoking INT, 
alcohol_intake INT, 
physical_activity INT, 
family_history INT, 
heart_disease INT, 
diabetes INT, 
stroke INT 
);

3. Import the healthcare dataset csv into the patient table
   
https://www.kaggle.com/datasets/rafi003/healthcare-disease-prediction-dataset

## Team Roles
1. Database and SQL/ Risk Heatmap
2. Gender + Behavior Heatmap 
3. Clustering
4. Co-occurrence Map
