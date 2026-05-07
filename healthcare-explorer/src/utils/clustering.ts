import { HealthField, HealthRecord } from '../types';

const iterations = 20;

function normalize(value: number, min: number, max: number) {
  if (min === max) {
    return 0;
  }

  return (value - min) / (max - min);
}

function distance(a: [number, number], b: [number, number]) {
  const xDistance = a[0] - b[0];
  const yDistance = a[1] - b[1];
  return xDistance * xDistance + yDistance * yDistance;
}

export function withKMeansClusters(
  data: HealthRecord[],
  xField: HealthField,
  yField: HealthField,
  clusterCount: number
) {
  if (data.length === 0) {
    return data;
  }

  const xValues = data.map((row) => Number(row[xField]));
  const yValues = data.map((row) => Number(row[yField]));
  const xMin = Math.min(...xValues);
  const xMax = Math.max(...xValues);
  const yMin = Math.min(...yValues);
  const yMax = Math.max(...yValues);
  const points = data.map<[number, number]>((row) => [
    normalize(Number(row[xField]), xMin, xMax),
    normalize(Number(row[yField]), yMin, yMax),
  ]);
  const k = Math.min(Math.max(1, clusterCount), data.length);
  let centroids = points.slice(0, k);
  let assignments = points.map(() => 0);

  for (let iteration = 0; iteration < iterations; iteration += 1) {
    assignments = points.map((point) => {
      let closestCluster = 0;
      let closestDistance = Number.POSITIVE_INFINITY;

      centroids.forEach((centroid, index) => {
        const currentDistance = distance(point, centroid);
        if (currentDistance < closestDistance) {
          closestDistance = currentDistance;
          closestCluster = index;
        }
      });

      return closestCluster;
    });

    centroids = centroids.map((centroid, clusterId) => {
      const clusterPoints = points.filter((_, index) => assignments[index] === clusterId);

      if (clusterPoints.length === 0) {
        return centroid;
      }

      const total = clusterPoints.reduce<[number, number]>(
        (sum, point) => [sum[0] + point[0], sum[1] + point[1]],
        [0, 0]
      );

      return [total[0] / clusterPoints.length, total[1] / clusterPoints.length];
    });
  }

  return data.map((row, index) => ({
    ...row,
    clusterId: assignments[index],
  }));
}
