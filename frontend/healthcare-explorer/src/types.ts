export type FieldType = 'numeric' | 'categorical' | 'binary';

export interface FieldMeta {
  label: string;
  type: FieldType;
}

export type HealthField =
  | 'Gender'
  | 'Age'
  | 'BMI'
  | 'Cholesterol'
  | 'Glucose_Level'
  | 'Blood_Pressure_Systolic';

export const fieldMetadata: Record<HealthField, FieldMeta> = {
  Gender: { label: 'Gender', type: 'categorical' },
  Age: { label: 'Age', type: 'numeric' },
  BMI: { label: 'BMI', type: 'numeric' },
  Cholesterol: { label: 'Cholesterol', type: 'numeric' },
  Glucose_Level: { label: 'Glucose Level', type: 'numeric' },
  Blood_Pressure_Systolic: { label: 'Systolic Blood Pressure', type: 'numeric' },
};

export const supportedXOptions: HealthField[] = [
  'Gender',
  'Age',
  'BMI',
  'Cholesterol',
  'Glucose_Level',
];

export const supportedYOptions: HealthField[] = [
  'BMI',
  'Age',
  'Blood_Pressure_Systolic',
  'Cholesterol',
  'Glucose_Level',
];

export const chartTypes = ['scatterplot', 'heatmap'] as const;
export type ChartType = (typeof chartTypes)[number];

export interface HealthRecord {
  Patient_ID: number;
  Age: number;
  Gender: string;
  BMI: number;
  Blood_Pressure_Systolic: number;
  Blood_Pressure_Diastolic: number;
  Cholesterol: number;
  Glucose_Level: number;
  Smoking: number;
  Alcohol_Intake: number;
  Physical_Activity: number;
  Family_History: number;
  Heart_Disease: number;
  Diabetes: number;
  Stroke: number;
}
