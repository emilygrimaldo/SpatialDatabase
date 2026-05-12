import hashlib
import json
import logging
import math
import os
from contextlib import closing
from typing import Optional

import psycopg2
from fastapi import FastAPI, HTTPException, Query
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

CLUSTER_FEATURES = [
    ("age", "Age"),
    ("bmi", "BMI"),
    ("blood_pressure_systolic", "Blood_Pressure_Systolic"),
    ("cholesterol", "Cholesterol"),
    ("glucose_level", "Glucose_Level"),
]
CLUSTER_FEATURE_FIELDS = [field_name for _, field_name in CLUSTER_FEATURES]
MAX_CLUSTER_ITERATIONS = 50

REGRESSION_FIELDS = {
    "Age": {"column": "age", "kind": "numeric"},
    "BMI": {"column": "bmi", "kind": "numeric"},
    "Blood_Pressure_Systolic": {
        "column": "blood_pressure_systolic",
        "kind": "numeric",
    },
    "Blood_Pressure_Diastolic": {
        "column": "blood_pressure_diastolic",
        "kind": "numeric",
    },
    "Cholesterol": {"column": "cholesterol", "kind": "numeric"},
    "Glucose_Level": {"column": "glucose_level", "kind": "numeric"},
    "Smoking": {"column": "smoking", "kind": "binary"},
    "Alcohol_Intake": {"column": "alcohol_intake", "kind": "binary"},
    "Physical_Activity": {"column": "physical_activity", "kind": "binary"},
    "Family_History": {"column": "family_history", "kind": "binary"},
    "Heart_Disease": {"column": "heart_disease", "kind": "binary"},
    "Diabetes": {"column": "diabetes", "kind": "binary"},
    "Stroke": {"column": "stroke", "kind": "binary"},
}
DEFAULT_REGRESSION_TARGET = "Diabetes"
DEFAULT_REGRESSION_PREDICTORS = [
    "Age",
    "BMI",
    "Blood_Pressure_Systolic",
    "Cholesterol",
    "Glucose_Level",
    "Smoking",
    "Alcohol_Intake",
    "Physical_Activity",
    "Family_History",
]
REGRESSION_RIDGE_LAMBDA = 0.000001


def get_connection():
    return psycopg2.connect(**DB_CONFIG)


def ensure_cluster_tables(conn):
    with conn.cursor() as cursor:
        cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS cluster_runs (
                cluster_run_id SERIAL PRIMARY KEY,
                cluster_count INTEGER NOT NULL CHECK (cluster_count > 0),
                feature_fields TEXT[] NOT NULL,
                source_row_count INTEGER NOT NULL,
                source_signature TEXT NOT NULL,
                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                UNIQUE (cluster_count, feature_fields, source_signature)
            );

            CREATE TABLE IF NOT EXISTS patient_clusters (
                patient_id INTEGER NOT NULL,
                cluster_run_id INTEGER NOT NULL REFERENCES cluster_runs(cluster_run_id)
                    ON DELETE CASCADE,
                cluster_id INTEGER NOT NULL,
                distance_to_centroid DOUBLE PRECISION,
                PRIMARY KEY (patient_id, cluster_run_id)
            );

            CREATE INDEX IF NOT EXISTS idx_patient_clusters_run
                ON patient_clusters(cluster_run_id, cluster_id);
            """
        )
    conn.commit()


def ensure_regression_tables(conn):
    with conn.cursor() as cursor:
        cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS regression_runs (
                regression_run_id SERIAL PRIMARY KEY,
                target_field TEXT NOT NULL,
                predictor_fields TEXT[] NOT NULL,
                model_type TEXT NOT NULL,
                source_row_count INTEGER NOT NULL,
                source_signature TEXT NOT NULL,
                intercept DOUBLE PRECISION NOT NULL,
                coefficients_json JSONB NOT NULL,
                feature_stats_json JSONB NOT NULL,
                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                UNIQUE (
                    target_field,
                    predictor_fields,
                    model_type,
                    source_signature
                )
            );

            CREATE TABLE IF NOT EXISTS patient_regression_predictions (
                patient_id INTEGER NOT NULL,
                regression_run_id INTEGER NOT NULL
                    REFERENCES regression_runs(regression_run_id)
                    ON DELETE CASCADE,
                predicted_value DOUBLE PRECISION NOT NULL,
                actual_value DOUBLE PRECISION NOT NULL,
                residual DOUBLE PRECISION NOT NULL,
                PRIMARY KEY (patient_id, regression_run_id)
            );

            CREATE INDEX IF NOT EXISTS idx_patient_regression_predictions_run
                ON patient_regression_predictions(regression_run_id, patient_id);
            """
        )
    conn.commit()


def to_finite_number(value):
    try:
        number_value = float(value)
    except (TypeError, ValueError):
        return None

    return number_value if math.isfinite(number_value) else None


def normalize(value, minimum, maximum):
    if minimum == maximum:
        return 0

    return (value - minimum) / (maximum - minimum)


def squared_distance(point, centroid):
    return sum((value - centroid[index]) ** 2 for index, value in enumerate(point))


def mean_point(points):
    return [
        sum(point[index] for point in points) / len(points)
        for index in range(len(points[0]))
    ]


def closest_centroid(point, centroids):
    return min(
        range(len(centroids)),
        key=lambda index: squared_distance(point, centroids[index]),
    )


def farthest_point_from_centroids(points, centroids):
    return max(
        points,
        key=lambda point: min(
            squared_distance(point, centroid) for centroid in centroids
        ),
    )


def initialize_centroids(points, cluster_count):
    center = mean_point(points)
    first_centroid = min(points, key=lambda point: squared_distance(point, center))
    centroids = [first_centroid]

    while len(centroids) < cluster_count:
        centroids.append(farthest_point_from_centroids(points, centroids))

    return centroids


def fetch_cluster_source_rows(conn):
    columns = ", ".join(column for column, _ in CLUSTER_FEATURES)
    required_columns = " AND ".join(
        [f"{column} IS NOT NULL" for column, _ in CLUSTER_FEATURES]
    )
    query = f"""
        SELECT patient_id, {columns}
        FROM patient
        WHERE patient_id IS NOT NULL
          AND {required_columns}
        ORDER BY patient_id;
    """

    rows = []
    with conn.cursor() as cursor:
        cursor.execute(query)
        for db_row in cursor.fetchall():
            patient_id = db_row[0]
            values = [to_finite_number(value) for value in db_row[1:]]
            if all(value is not None for value in values):
                rows.append((patient_id, values))

    return rows


def cluster_source_signature(rows):
    digest = hashlib.sha256()

    for patient_id, values in rows:
        digest.update(str(patient_id).encode("utf-8"))
        for value in values:
            digest.update(f":{value:.12g}".encode("utf-8"))
        digest.update(b";")

    return digest.hexdigest()


def run_kmeans(rows, cluster_count):
    feature_ranges = []
    for feature_index in range(len(CLUSTER_FEATURES)):
        values = [row_values[feature_index] for _, row_values in rows]
        feature_ranges.append({"min": min(values), "max": max(values)})

    varying_feature_indexes = [
        index
        for index, feature_range in enumerate(feature_ranges)
        if feature_range["min"] != feature_range["max"]
    ]

    if not varying_feature_indexes:
        return [(patient_id, 0, 0.0) for patient_id, _ in rows]

    points = [
        [
            normalize(values[index], feature_ranges[index]["min"], feature_ranges[index]["max"])
            for index in varying_feature_indexes
        ]
        for _, values in rows
    ]
    k = min(max(1, cluster_count), len(points))
    centroids = initialize_centroids(points, k)
    assignments = [-1 for _ in points]

    for _ in range(MAX_CLUSTER_ITERATIONS):
        next_assignments = [closest_centroid(point, centroids) for point in points]
        unchanged = next_assignments == assignments
        assignments = next_assignments

        centroids = [
            mean_point(
                [
                    point
                    for point_index, point in enumerate(points)
                    if assignments[point_index] == cluster_id
                ]
            )
            if any(assignment == cluster_id for assignment in assignments)
            else farthest_point_from_centroids(points, centroids)
            for cluster_id in range(k)
        ]

        if unchanged:
            break

    return [
        (
            rows[index][0],
            assignments[index],
            math.sqrt(squared_distance(points[index], centroids[assignments[index]])),
        )
        for index in range(len(rows))
    ]


def find_existing_cluster_run(conn, cluster_count, source_signature, source_row_count):
    with conn.cursor() as cursor:
        cursor.execute(
            """
            SELECT cluster_run_id
            FROM cluster_runs
            WHERE cluster_count = %s
              AND feature_fields = %s::text[]
              AND source_signature = %s
              AND source_row_count = %s
              AND (
                SELECT COUNT(*)
                FROM patient_clusters
                WHERE patient_clusters.cluster_run_id = cluster_runs.cluster_run_id
              ) = %s
            ORDER BY created_at DESC
            LIMIT 1;
            """,
            (
                cluster_count,
                CLUSTER_FEATURE_FIELDS,
                source_signature,
                source_row_count,
                source_row_count,
            ),
        )
        row = cursor.fetchone()

    return row[0] if row else None


def save_cluster_run(conn, cluster_count, source_signature, source_row_count, clusters):
    with conn.cursor() as cursor:
        cursor.execute(
            """
            INSERT INTO cluster_runs (
                cluster_count,
                feature_fields,
                source_row_count,
                source_signature
            )
            VALUES (%s, %s, %s, %s)
            RETURNING cluster_run_id;
            """,
            (
                cluster_count,
                CLUSTER_FEATURE_FIELDS,
                source_row_count,
                source_signature,
            ),
        )
        cluster_run_id = cursor.fetchone()[0]

        cursor.executemany(
            """
            INSERT INTO patient_clusters (
                patient_id,
                cluster_run_id,
                cluster_id,
                distance_to_centroid
            )
            VALUES (%s, %s, %s, %s);
            """,
            [
                (patient_id, cluster_run_id, cluster_id, distance_to_centroid)
                for patient_id, cluster_id, distance_to_centroid in clusters
            ],
        )

    conn.commit()
    return cluster_run_id


def get_or_create_cluster_run(conn, cluster_count):
    ensure_cluster_tables(conn)
    rows = fetch_cluster_source_rows(conn)

    if not rows:
        return None

    source_signature = cluster_source_signature(rows)
    existing_cluster_run_id = find_existing_cluster_run(
        conn,
        cluster_count,
        source_signature,
        len(rows),
    )

    if existing_cluster_run_id is not None:
        return existing_cluster_run_id

    clusters = run_kmeans(rows, cluster_count)
    return save_cluster_run(conn, cluster_count, source_signature, len(rows), clusters)


def canonical_regression_predictors(target_field, predictor_fields):
    ordered_fields = list(REGRESSION_FIELDS.keys())
    cleaned_predictors = []

    for field in ordered_fields:
        if field == target_field:
            continue

        if field in predictor_fields:
            cleaned_predictors.append(field)

    return cleaned_predictors


def parse_regression_request(regression_target, regression_predictors):
    if not regression_target:
        return None

    if regression_target not in REGRESSION_FIELDS:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported regression target: {regression_target}",
        )

    if regression_predictors:
        predictor_fields = [
            field.strip()
            for field in regression_predictors.split(",")
            if field.strip()
        ]
    else:
        predictor_fields = DEFAULT_REGRESSION_PREDICTORS

    unsupported_predictors = [
        field for field in predictor_fields if field not in REGRESSION_FIELDS
    ]
    if unsupported_predictors:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported regression predictors: {', '.join(unsupported_predictors)}",
        )

    predictor_fields = canonical_regression_predictors(
        regression_target,
        predictor_fields,
    )

    if not predictor_fields:
        raise HTTPException(
            status_code=400,
            detail="Choose at least one predictor that is different from the target.",
        )

    return regression_target, predictor_fields


def regression_model_type(target_field):
    if REGRESSION_FIELDS[target_field]["kind"] == "binary":
        return "linear_probability_ridge"

    return "linear_ridge"


def fetch_regression_source_rows(conn, target_field, predictor_fields):
    selected_fields = [target_field, *predictor_fields]
    columns = [
        REGRESSION_FIELDS[field]["column"]
        for field in selected_fields
    ]
    column_sql = ", ".join(columns)
    required_columns = " AND ".join([f"{column} IS NOT NULL" for column in columns])
    query = f"""
        SELECT patient_id, {column_sql}
        FROM patient
        WHERE patient_id IS NOT NULL
          AND {required_columns}
        ORDER BY patient_id;
    """

    rows = []
    with conn.cursor() as cursor:
        cursor.execute(query)
        for db_row in cursor.fetchall():
            patient_id = db_row[0]
            target_value = to_finite_number(db_row[1])
            predictor_values = [to_finite_number(value) for value in db_row[2:]]

            if target_value is None or any(value is None for value in predictor_values):
                continue

            rows.append((patient_id, target_value, predictor_values))

    return rows


def regression_source_signature(rows):
    digest = hashlib.sha256()

    for patient_id, target_value, predictor_values in rows:
        digest.update(str(patient_id).encode("utf-8"))
        digest.update(f":{target_value:.12g}".encode("utf-8"))
        for value in predictor_values:
            digest.update(f":{value:.12g}".encode("utf-8"))
        digest.update(b";")

    return digest.hexdigest()


def predictor_stats(rows, predictor_count):
    stats = []

    for predictor_index in range(predictor_count):
        values = [row[2][predictor_index] for row in rows]
        mean_value = sum(values) / len(values)
        variance = sum((value - mean_value) ** 2 for value in values) / len(values)
        scale = math.sqrt(variance)
        stats.append(
            {
                "mean": mean_value,
                "scale": scale if scale > 0 else 1.0,
            }
        )

    return stats


def build_regression_matrix(rows, stats):
    matrix = []

    for _, _, predictor_values in rows:
        matrix.append(
            [
                (value - stats[index]["mean"]) / stats[index]["scale"]
                for index, value in enumerate(predictor_values)
            ]
        )

    return matrix


def solve_linear_system(matrix, vector):
    size = len(vector)
    augmented = [
        [*matrix[row_index], vector[row_index]]
        for row_index in range(size)
    ]

    for column_index in range(size):
        pivot_index = max(
            range(column_index, size),
            key=lambda row_index: abs(augmented[row_index][column_index]),
        )

        if abs(augmented[pivot_index][column_index]) < 1e-12:
            continue

        if pivot_index != column_index:
            augmented[column_index], augmented[pivot_index] = (
                augmented[pivot_index],
                augmented[column_index],
            )

        pivot = augmented[column_index][column_index]
        for value_index in range(column_index, size + 1):
            augmented[column_index][value_index] /= pivot

        for row_index in range(size):
            if row_index == column_index:
                continue

            factor = augmented[row_index][column_index]
            if factor == 0:
                continue

            for value_index in range(column_index, size + 1):
                augmented[row_index][value_index] -= (
                    factor * augmented[column_index][value_index]
                )

    return [augmented[row_index][size] for row_index in range(size)]


def fit_regression_model(rows, target_field, predictor_fields):
    stats = predictor_stats(rows, len(predictor_fields))
    matrix = build_regression_matrix(rows, stats)
    targets = [target_value for _, target_value, _ in rows]
    size = len(predictor_fields) + 1
    xtx = [[0.0 for _ in range(size)] for _ in range(size)]
    xty = [0.0 for _ in range(size)]

    for row_index, predictors in enumerate(matrix):
        features = [1.0, *predictors]
        for feature_index, feature_value in enumerate(features):
            xty[feature_index] += feature_value * targets[row_index]
            for other_index, other_value in enumerate(features):
                xtx[feature_index][other_index] += feature_value * other_value

    for index in range(1, size):
        xtx[index][index] += REGRESSION_RIDGE_LAMBDA

    coefficients = solve_linear_system(xtx, xty)
    intercept = coefficients[0]
    predictor_coefficients = coefficients[1:]
    is_binary_target = REGRESSION_FIELDS[target_field]["kind"] == "binary"
    predictions = []

    for row_index, predictors in enumerate(matrix):
        raw_prediction = intercept + sum(
            predictor_coefficients[index] * predictors[index]
            for index in range(len(predictors))
        )
        predicted_value = (
            min(max(raw_prediction, 0.0), 1.0)
            if is_binary_target
            else raw_prediction
        )
        actual_value = targets[row_index]
        predictions.append(
            (
                rows[row_index][0],
                predicted_value,
                actual_value,
                actual_value - predicted_value,
            )
        )

    coefficients_by_field = {
        field: predictor_coefficients[index]
        for index, field in enumerate(predictor_fields)
    }
    stats_by_field = {
        field: stats[index]
        for index, field in enumerate(predictor_fields)
    }

    return {
        "intercept": intercept,
        "coefficients": coefficients_by_field,
        "feature_stats": stats_by_field,
        "predictions": predictions,
    }


def find_existing_regression_run(
    conn,
    target_field,
    predictor_fields,
    model_type,
    source_signature,
    source_row_count,
):
    with conn.cursor() as cursor:
        cursor.execute(
            """
            SELECT regression_run_id
            FROM regression_runs
            WHERE target_field = %s
              AND predictor_fields = %s::text[]
              AND model_type = %s
              AND source_signature = %s
              AND source_row_count = %s
              AND (
                SELECT COUNT(*)
                FROM patient_regression_predictions
                WHERE patient_regression_predictions.regression_run_id =
                    regression_runs.regression_run_id
              ) = %s
            ORDER BY created_at DESC
            LIMIT 1;
            """,
            (
                target_field,
                predictor_fields,
                model_type,
                source_signature,
                source_row_count,
                source_row_count,
            ),
        )
        row = cursor.fetchone()

    return row[0] if row else None


def save_regression_run(
    conn,
    target_field,
    predictor_fields,
    model_type,
    source_signature,
    source_row_count,
    model,
):
    with conn.cursor() as cursor:
        cursor.execute(
            """
            INSERT INTO regression_runs (
                target_field,
                predictor_fields,
                model_type,
                source_row_count,
                source_signature,
                intercept,
                coefficients_json,
                feature_stats_json
            )
            VALUES (%s, %s, %s, %s, %s, %s, %s::jsonb, %s::jsonb)
            RETURNING regression_run_id;
            """,
            (
                target_field,
                predictor_fields,
                model_type,
                source_row_count,
                source_signature,
                model["intercept"],
                json.dumps(model["coefficients"]),
                json.dumps(model["feature_stats"]),
            ),
        )
        regression_run_id = cursor.fetchone()[0]

        cursor.executemany(
            """
            INSERT INTO patient_regression_predictions (
                patient_id,
                regression_run_id,
                predicted_value,
                actual_value,
                residual
            )
            VALUES (%s, %s, %s, %s, %s);
            """,
            [
                (
                    patient_id,
                    regression_run_id,
                    predicted_value,
                    actual_value,
                    residual,
                )
                for patient_id, predicted_value, actual_value, residual
                in model["predictions"]
            ],
        )

    conn.commit()
    return regression_run_id


def get_or_create_regression_run(conn, target_field, predictor_fields):
    ensure_regression_tables(conn)
    rows = fetch_regression_source_rows(conn, target_field, predictor_fields)

    if not rows:
        return None

    source_signature = regression_source_signature(rows)
    model_type = regression_model_type(target_field)
    existing_regression_run_id = find_existing_regression_run(
        conn,
        target_field,
        predictor_fields,
        model_type,
        source_signature,
        len(rows),
    )

    if existing_regression_run_id is not None:
        return existing_regression_run_id

    model = fit_regression_model(rows, target_field, predictor_fields)
    return save_regression_run(
        conn,
        target_field,
        predictor_fields,
        model_type,
        source_signature,
        len(rows),
        model,
    )


def fetch_patient_records(conn, cluster_run_id, regression_run_id):
    query = """
    SELECT
      p.patient_id AS "Patient_ID",
      p.age AS "Age",
      p.gender AS "Gender",
      p.bmi AS "BMI",
      p.blood_pressure_systolic AS "Blood_Pressure_Systolic",
      p.blood_pressure_diastolic AS "Blood_Pressure_Diastolic",
      p.cholesterol AS "Cholesterol",
      p.glucose_level AS "Glucose_Level",
      p.smoking AS "Smoking",
      p.alcohol_intake AS "Alcohol_Intake",
      p.physical_activity AS "Physical_Activity",
      p.family_history AS "Family_History",
      p.heart_disease AS "Heart_Disease",
      p.diabetes AS "Diabetes",
      p.stroke AS "Stroke",
      pc.cluster_id AS "clusterId",
      pc.distance_to_centroid AS "clusterDistance",
      prp.predicted_value AS "regressionPredictedValue",
      prp.actual_value AS "regressionActualValue",
      prp.residual AS "regressionResidual"
    FROM patient p
    LEFT JOIN patient_clusters pc
      ON pc.patient_id = p.patient_id
     AND pc.cluster_run_id = %s
    LEFT JOIN patient_regression_predictions prp
      ON prp.patient_id = p.patient_id
     AND prp.regression_run_id = %s
    ORDER BY p.patient_id;
    """

    with conn.cursor() as cursor:
        cursor.execute(query, (cluster_run_id or -1, regression_run_id or -1))
        columns = [column[0] for column in cursor.description]
        return [dict(zip(columns, row)) for row in cursor.fetchall()]


@app.get("/")
def root():
    return {
        "service": "healthcare explorer backend",
        "patients_endpoint": "/patients?cluster_count=3",
        "database_health_endpoint": "/health/db",
        "cluster_features": CLUSTER_FEATURE_FIELDS,
        "regression_target_default": DEFAULT_REGRESSION_TARGET,
        "regression_predictors_default": DEFAULT_REGRESSION_PREDICTORS,
        "regression_fields": list(REGRESSION_FIELDS.keys()),
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
def get_patients(
    cluster_count: int = Query(3, ge=1, le=10),
    regression_target: Optional[str] = Query(None),
    regression_predictors: Optional[str] = Query(None),
):
    try:
        regression_request = parse_regression_request(
            regression_target,
            regression_predictors,
        )

        with closing(get_connection()) as conn:
            cluster_run_id = get_or_create_cluster_run(conn, cluster_count)
            regression_run_id = None

            if regression_request is not None:
                target_field, predictor_fields = regression_request
                regression_run_id = get_or_create_regression_run(
                    conn,
                    target_field,
                    predictor_fields,
                )

            records = fetch_patient_records(conn, cluster_run_id, regression_run_id)
    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("Failed to load patients")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to load patients: {type(exc).__name__}: {exc}",
        ) from exc

    logger.info(
        "Loaded %s patient records with %s clusters and regression=%s",
        len(records),
        cluster_count,
        regression_target or "off",
    )
    return records


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="127.0.0.1", port=8000)
