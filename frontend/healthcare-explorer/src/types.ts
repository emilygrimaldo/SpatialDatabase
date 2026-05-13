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

export type RegressionField =
  | 'Age'
  | 'BMI'
  | 'Blood_Pressure_Systolic'
  | 'Blood_Pressure_Diastolic'
  | 'Cholesterol'
  | 'Glucose_Level'
  | 'Smoking'
  | 'Alcohol_Intake'
  | 'Physical_Activity'
  | 'Family_History'
  | 'Heart_Disease'
  | 'Diabetes'
  | 'Stroke';

export const fieldMetadata: Record<HealthField, FieldMeta> = {
  Gender: { label: 'Gender', type: 'categorical' },
  Age: { label: 'Age', type: 'numeric' },
  BMI: { label: 'BMI', type: 'numeric' },
  Cholesterol: { label: 'Cholesterol', type: 'numeric' },
  Glucose_Level: { label: 'Glucose Level', type: 'numeric' },
  Blood_Pressure_Systolic: { label: 'Systolic Blood Pressure', type: 'numeric' },
};

export const regressionFieldMetadata: Record<RegressionField, FieldMeta> = {
  Age: { label: 'Age', type: 'numeric' },
  BMI: { label: 'BMI', type: 'numeric' },
  Blood_Pressure_Systolic: { label: 'Systolic Blood Pressure', type: 'numeric' },
  Blood_Pressure_Diastolic: { label: 'Diastolic Blood Pressure', type: 'numeric' },
  Cholesterol: { label: 'Cholesterol', type: 'numeric' },
  Glucose_Level: { label: 'Glucose Level', type: 'numeric' },
  Smoking: { label: 'Smoking', type: 'binary' },
  Alcohol_Intake: { label: 'Alcohol Intake', type: 'binary' },
  Physical_Activity: { label: 'Physical Activity', type: 'binary' },
  Family_History: { label: 'Family History', type: 'binary' },
  Heart_Disease: { label: 'Heart Disease', type: 'binary' },
  Diabetes: { label: 'Diabetes', type: 'binary' },
  Stroke: { label: 'Stroke', type: 'binary' },
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

export const regressionTargetOptions: RegressionField[] = [
  'BMI',
  'Blood_Pressure_Systolic',
  'Blood_Pressure_Diastolic',
  'Cholesterol',
  'Glucose_Level',
  'Heart_Disease',
  'Diabetes',
  'Stroke',
];

export const regressionPredictorOptions: RegressionField[] = [
  'Age',
  'BMI',
  'Blood_Pressure_Systolic',
  'Blood_Pressure_Diastolic',
  'Cholesterol',
  'Glucose_Level',
  'Smoking',
  'Alcohol_Intake',
  'Physical_Activity',
  'Family_History',
  'Heart_Disease',
  'Diabetes',
  'Stroke',
];

export const chartTypes = ['scatterplot', 'heatmap'] as const;
export type ChartType = (typeof chartTypes)[number];

export const shapeFields = [
  'none',
  'Smoking',
  'Alcohol_Intake',
  'Heart_Disease',
  'Diabetes',
  'Stroke',
] as const;
export type ShapeField = (typeof shapeFields)[number];

export const shapeFieldLabels: Record<ShapeField, string> = {
  none: 'None',
  Smoking: 'Smoking',
  Alcohol_Intake: 'Alcohol Intake',
  Heart_Disease: 'Heart Disease',
  Diabetes: 'Diabetes',
  Stroke: 'Stroke',
};

export const shapeFieldBinaryLabels: Record<Exclude<ShapeField, 'none'>, [string, string]> = {
  Smoking: ['Non-smoker', 'Smoker'],
  Alcohol_Intake: ['No alcohol', 'Alcohol'],
  Heart_Disease: ['No heart disease', 'Heart disease'],
  Diabetes: ['No diabetes', 'Diabetes'],
  Stroke: ['No stroke', 'Stroke'],
};

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
  clusterId?: number | null;
  clusterDistance?: number | null;
  regressionPredictedValue?: number | null;
  regressionActualValue?: number | null;
  regressionResidual?: number | null;
}
