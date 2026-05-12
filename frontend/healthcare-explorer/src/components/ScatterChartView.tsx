import Plot from 'react-plotly.js';
import {
  FieldType,
  HealthField,
  HealthRecord,
  ShapeField,
  shapeFieldBinaryLabels,
} from '../types';

interface ScatterChartViewProps {
  data: HealthRecord[];
  xField: HealthField;
  yField: HealthField;
  xType: FieldType;
  yType: FieldType;
  xLabel: string;
  yLabel: string;
  showClusters: boolean;
  markerShape: ShapeField;
}

const clusterColors = ['#5b6cff', '#f97316', '#14b8a6', '#db2777', '#84cc16'];
const defaultColor = '#5b6cff';
const shapeSymbols: [string, string] = ['circle', 'square'];

interface TraceGroup {
  rows: HealthRecord[];
  name?: string;
  color: string;
  symbol: string;
  clusterLabel?: string;
  shapeLabel?: string;
}

export default function ScatterChartView({
  data,
  xField,
  yField,
  xType,
  yType,
  xLabel,
  yLabel,
  showClusters,
  markerShape,
}: ScatterChartViewProps) {
  const clusterIds = Array.from(
    new Set(
      data
        .map((row) => row.clusterId)
        .filter((clusterId): clusterId is number => typeof clusterId === 'number')
    )
  ).sort((a, b) => a - b);

  const shapeActive = markerShape !== 'none';
  const clusterActive = showClusters && clusterIds.length > 0;

  let groups: TraceGroup[] = [];

  if (!shapeActive && !clusterActive) {
    groups = [{ rows: data, color: defaultColor, symbol: shapeSymbols[0] }];
  } else if (clusterActive && !shapeActive) {
    groups = clusterIds.map((clusterId) => ({
      rows: data.filter((row) => row.clusterId === clusterId),
      name: `Cluster ${clusterId + 1}`,
      color: clusterColors[clusterId % clusterColors.length],
      symbol: shapeSymbols[0],
      clusterLabel: `Cluster ${clusterId + 1}`,
    }));
  } else if (!clusterActive && shapeActive) {
    const shapeKey = markerShape as Exclude<ShapeField, 'none'>;
    const labels = shapeFieldBinaryLabels[shapeKey];
    groups = [0, 1].map((binaryValue) => ({
      rows: data.filter((row) => Number(row[shapeKey]) === binaryValue),
      name: labels[binaryValue],
      color: defaultColor,
      symbol: shapeSymbols[binaryValue],
      shapeLabel: labels[binaryValue],
    }));
  } else {
    const shapeKey = markerShape as Exclude<ShapeField, 'none'>;
    const labels = shapeFieldBinaryLabels[shapeKey];
    clusterIds.forEach((clusterId) => {
      [0, 1].forEach((binaryValue) => {
        groups.push({
          rows: data.filter(
            (row) =>
              row.clusterId === clusterId && Number(row[shapeKey]) === binaryValue
          ),
          name: `Cluster ${clusterId + 1} — ${labels[binaryValue]}`,
          color: clusterColors[clusterId % clusterColors.length],
          symbol: shapeSymbols[binaryValue],
          clusterLabel: `Cluster ${clusterId + 1}`,
          shapeLabel: labels[binaryValue],
        });
      });
    });
  }

  const traces = groups
    .filter((group) => group.rows.length > 0)
    .map((group) => {
      const hoverLines = ['<b>Patient %{customdata[0]}</b>'];
      if (group.clusterLabel) hoverLines.push(`Cluster: ${group.clusterLabel}`);
      if (group.shapeLabel) hoverLines.push(`${markerShape.replace(/_/g, ' ')}: ${group.shapeLabel}`);
      hoverLines.push(`${xLabel}: %{x}`);
      hoverLines.push(`${yLabel}: %{y}<extra></extra>`);

      return {
        x: group.rows.map((row) => row[xField]),
        y: group.rows.map((row) => row[yField]),
        mode: 'markers',
        type: 'scatter',
        name: group.name,
        showlegend: group.name !== undefined,
        marker: {
          color: group.color,
          symbol: group.symbol,
          opacity: 0.84,
          size: 12,
          line: { width: 1.2, color: '#eef2ff' },
        },
        customdata: group.rows.map((row) => [row.Patient_ID]),
        hovertemplate: hoverLines.join('<br>'),
      };
    });

  return (
    <Plot
      data={traces}
      layout={{
        height: 600,
        autosize: true,
        margin: { l: 70, r: 30, t: 40, b: 120 },
        font: {
          family: 'Aptos, "Segoe UI", sans-serif',
          color: '#334155',
        },
        xaxis: {
          title: { text: xLabel, standoff: 12 },
          type: xType === 'numeric' ? 'linear' : 'category',
          tickangle: xType === 'numeric' ? 0 : -45,
          gridcolor: '#dbe4ff',
          zerolinecolor: '#c7d2fe',
          automargin: true,
        },
        yaxis: {
          title: { text: yLabel, standoff: 12 },
          type: yType === 'numeric' ? 'linear' : 'category',
          gridcolor: '#dbe4ff',
          zerolinecolor: '#c7d2fe',
          automargin: true,
        },
        plot_bgcolor: 'rgba(241, 245, 255, 0.86)',
        paper_bgcolor: 'rgba(0, 0, 0, 0)',
        hovermode: 'closest',
        legend: { orientation: 'h', y: -0.35, x: 0 },
      }}
      useResizeHandler
      style={{ width: '100%', height: '600px' }}
    />
  );
}
