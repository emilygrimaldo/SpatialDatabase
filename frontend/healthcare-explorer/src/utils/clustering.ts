import { HealthField, HealthRecord } from '../types';

const maxIterations = 50;

export const clusterFields: HealthField[] = [
  'Age',
  'BMI',
  'Blood_Pressure_Systolic',
  'Cholesterol',
  'Glucose_Level',
];

function normalize(value: number, min: number, max: number) {
  if (min === max) {
    return 0;
  }

  return (value - min) / (max - min);
}

function toFiniteNumber(value: unknown) {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : null;
}

function squaredDistance(a: number[], b: number[]) {
  return a.reduce((sum, value, index) => {
    const difference = value - b[index];
    return sum + difference * difference;
  }, 0);
}

function meanPoint(points: number[][]) {
  const totals = new Array(points[0].length).fill(0);

  points.forEach((point) => {
    point.forEach((value, index) => {
      totals[index] += value;
    });
  });

  return totals.map((total) => total / points.length);
}

function closestCentroid(point: number[], centroids: number[][]) {
  let closestCluster = 0;
  let closestDistance = Number.POSITIVE_INFINITY;

  centroids.forEach((centroid, index) => {
    const currentDistance = squaredDistance(point, centroid);
    if (currentDistance < closestDistance) {
      closestDistance = currentDistance;
      closestCluster = index;
    }
  });

  return closestCluster;
}

function farthestPointFromCentroids(points: number[][], centroids: number[][]) {
  let farthestIndex = 0;
  let farthestDistance = Number.NEGATIVE_INFINITY;

  points.forEach((point, index) => {
    const nearestDistance = Math.min(
      ...centroids.map((centroid) => squaredDistance(point, centroid))
    );

    if (nearestDistance > farthestDistance) {
      farthestDistance = nearestDistance;
      farthestIndex = index;
    }
  });

  return points[farthestIndex];
}

function initializeCentroids(points: number[][], clusterCount: number) {
  const center = meanPoint(points);
  const firstCentroid = points.reduce((best, point) =>
    squaredDistance(point, center) < squaredDistance(best, center) ? point : best
  );
  const centroids = [firstCentroid];

  while (centroids.length < clusterCount) {
    centroids.push(farthestPointFromCentroids(points, centroids));
  }

  return centroids;
}

export function withKMeansClusters(data: HealthRecord[], clusterCount: number) {
  if (data.length === 0) {
    return data;
  }

  const validRows = data
    .map((row, originalIndex) => {
      const values = clusterFields.map((field) => toFiniteNumber(row[field]));
      if (values.some((value) => value === null)) {
        return null;
      }

      return {
        row,
        originalIndex,
        values: values as number[],
      };
    })
    .filter((entry): entry is { row: HealthRecord; originalIndex: number; values: number[] } =>
      entry !== null
    );

  if (validRows.length === 0) {
    return data.map((row) => ({ ...row, clusterId: undefined }));
  }

  const featureRanges = clusterFields.map((_, fieldIndex) => {
    const values = validRows.map((entry) => entry.values[fieldIndex]);
    return {
      min: Math.min(...values),
      max: Math.max(...values),
    };
  });

  const varyingFeatureIndexes = featureRanges
    .map((range, index) => (range.min === range.max ? null : index))
    .filter((index): index is number => index !== null);

  if (varyingFeatureIndexes.length === 0) {
    return data.map((row, index) => ({
      ...row,
      clusterId: validRows.some((entry) => entry.originalIndex === index) ? 0 : undefined,
    }));
  }

  const points = validRows.map((entry) =>
    varyingFeatureIndexes.map((fieldIndex) =>
      normalize(
        entry.values[fieldIndex],
        featureRanges[fieldIndex].min,
        featureRanges[fieldIndex].max
      )
    )
  );
  const k = Math.min(Math.max(1, clusterCount), validRows.length);
  let centroids = initializeCentroids(points, k);
  let assignments = points.map(() => -1);

  for (let iteration = 0; iteration < maxIterations; iteration += 1) {
    const nextAssignments = points.map((point) => closestCentroid(point, centroids));
    const unchanged = nextAssignments.every(
      (assignment, index) => assignment === assignments[index]
    );
    assignments = nextAssignments;

    centroids = centroids.map((centroid, clusterId) => {
      const clusterPoints = points.filter((_, index) => assignments[index] === clusterId);

      if (clusterPoints.length === 0) {
        return farthestPointFromCentroids(points, centroids);
      }

      return meanPoint(clusterPoints);
    });

    if (unchanged) {
      break;
    }
  }

  const assignmentsByOriginalIndex = new Map<number, number>();
  validRows.forEach((entry, index) => {
    assignmentsByOriginalIndex.set(entry.originalIndex, assignments[index]);
  });

  return data.map((row, index) => {
    const clusterId = assignmentsByOriginalIndex.get(index);
    return {
      ...row,
      clusterId,
    };
  });
}
