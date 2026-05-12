import hashlib
import logging
import math
import os
from contextlib import closing

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


def fetch_patient_records(conn, cluster_run_id):
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
      pc.distance_to_centroid AS "clusterDistance"
    FROM patient p
    LEFT JOIN patient_clusters pc
      ON pc.patient_id = p.patient_id
     AND pc.cluster_run_id = %s
    ORDER BY p.patient_id;
    """

    with conn.cursor() as cursor:
        cursor.execute(query, (cluster_run_id or -1,))
        columns = [column[0] for column in cursor.description]
        return [dict(zip(columns, row)) for row in cursor.fetchall()]


@app.get("/")
def root():
    return {
        "service": "healthcare explorer backend",
        "patients_endpoint": "/patients?cluster_count=3",
        "database_health_endpoint": "/health/db",
        "cluster_features": CLUSTER_FEATURE_FIELDS,
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
def get_patients(cluster_count: int = Query(3, ge=1, le=10)):
    try:
        with closing(get_connection()) as conn:
            cluster_run_id = get_or_create_cluster_run(conn, cluster_count)
            records = fetch_patient_records(conn, cluster_run_id)
    except Exception as exc:
        logger.exception("Failed to load patients")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to load patients: {type(exc).__name__}: {exc}",
        ) from exc

    logger.info("Loaded %s patient records with %s clusters", len(records), cluster_count)
    return records


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="127.0.0.1", port=8000)
