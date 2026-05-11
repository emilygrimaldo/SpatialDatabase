import { FieldType, HealthField, HealthRecord } from '../types';

const defaultBinCount = 6;

export function isNumericField(type: FieldType) {
  return type === 'numeric';
}

export function isCategoricalField(type: FieldType) {
  return type === 'categorical' || type === 'binary';
}

export function normalizeValue(value: unknown) {
  if (typeof value === 'number') return value;
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    if (!Number.isNaN(parsed)) return parsed;
  }
  return value;
}

export function getCategoryLabels(data: HealthRecord[], key: HealthField) {
  const labels = Array.from(
    new Set(data.map((item) => String(item[key]).trim()))
  );
  return labels.sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
}

export function buildNumericBins(values: number[], bins = defaultBinCount) {
  const min = Math.min(...values);
  const max = Math.max(...values);
  if (min === max) {
    return [{ label: `${min.toFixed(1)}`, min, max }];
  }

  const span = max - min;
  const step = span / bins;
  const bucketDefs = [];
  for (let index = 0; index < bins; index += 1) {
    const bucketMin = min + index * step;
    const bucketMax = index === bins - 1 ? max : min + (index + 1) * step;
    const label = `${bucketMin.toFixed(1)}–${bucketMax.toFixed(1)}`;
    bucketDefs.push({ label, min: bucketMin, max: bucketMax });
  }
  return bucketDefs;
}

export function bucketIndex(value: number, buckets: Array<{ min: number; max: number }>) {
  for (let index = 0; index < buckets.length; index += 1) {
    if (index === buckets.length - 1) {
      if (value >= buckets[index].min && value <= buckets[index].max) return index;
    } else if (value >= buckets[index].min && value < buckets[index].max) {
      return index;
    }
  }
  return 0;
}

export interface HeatmapData {
  xLabels: string[];
  yLabels: string[];
  zMatrix: number[][];
  xLabel: string;
  yLabel: string;
}

export function buildHeatmapData(
  data: HealthRecord[],
  xKey: HealthField,
  yKey: HealthField,
  xType: FieldType,
  yType: FieldType
): HeatmapData {
  const xLabel = xKey.replace(/_/g, ' ');
  const yLabel = yKey.replace(/_/g, ' ');
  const xCategories = getCategoryLabels(data, xKey);
  const yCategories = getCategoryLabels(data, yKey);

  const xIsNumeric = isNumericField(xType);
  const yIsNumeric = isNumericField(yType);

  if (!xIsNumeric && !yIsNumeric) {
    const xLabels = xCategories;
    const yLabels = yCategories;
    const zMatrix = yLabels.map(() => xLabels.map(() => 0));

    data.forEach((item) => {
      const xIndex = xLabels.indexOf(String(item[xKey]));
      const yIndex = yLabels.indexOf(String(item[yKey]));
      if (xIndex >= 0 && yIndex >= 0) {
        zMatrix[yIndex][xIndex] += 1;
      }
    });

    return { xLabels, yLabels, zMatrix, xLabel, yLabel };
  }

  if (xIsNumeric && yIsNumeric) {
    const xValues = data.map((item) => Number(item[xKey]));
    const yValues = data.map((item) => Number(item[yKey]));
    const xBins = buildNumericBins(xValues);
    const yBins = buildNumericBins(yValues);
    const xLabels = xBins.map((bucket) => bucket.label);
    const yLabels = yBins.map((bucket) => bucket.label);
    const zMatrix = yLabels.map(() => xLabels.map(() => 0));

    data.forEach((item) => {
      const xIndex = bucketIndex(Number(item[xKey]), xBins);
      const yIndex = bucketIndex(Number(item[yKey]), yBins);
      zMatrix[yIndex][xIndex] += 1;
    });

    return { xLabels, yLabels, zMatrix, xLabel, yLabel };
  }

  const xLabels = xIsNumeric ? buildNumericBins(data.map((item) => Number(item[xKey]))).map((b) => b.label) : xCategories;
  const yLabels = yIsNumeric ? buildNumericBins(data.map((item) => Number(item[yKey]))).map((b) => b.label) : yCategories;
  const zMatrix = yLabels.map(() => xLabels.map(() => 0));

  data.forEach((item) => {
    const xIndex = xIsNumeric
      ? bucketIndex(Number(item[xKey]), buildNumericBins(data.map((value) => Number(value[xKey]))))
      : xLabels.indexOf(String(item[xKey]));
    const yIndex = yIsNumeric
      ? bucketIndex(Number(item[yKey]), buildNumericBins(data.map((value) => Number(value[yKey]))))
      : yLabels.indexOf(String(item[yKey]));

    if (xIndex >= 0 && yIndex >= 0) {
      zMatrix[yIndex][xIndex] += 1;
    }
  });

  return { xLabels, yLabels, zMatrix, xLabel, yLabel };
}
