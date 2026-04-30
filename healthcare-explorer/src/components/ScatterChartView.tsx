import Plot from 'react-plotly.js';
import { FieldType, HealthField, HealthRecord } from '../types';

interface ScatterChartViewProps {
  data: HealthRecord[];
  xField: HealthField;
  yField: HealthField;
  xType: FieldType;
  yType: FieldType;
}

export default function ScatterChartView({
  data,
  xField,
  yField,
  xType,
  yType,
}: ScatterChartViewProps) {
  const xValues = data.map((row) => row[xField]);
  const yValues = data.map((row) => row[yField]);
  const customData = data.map((row) => [row.Patient_ID, row[xField], row[yField]]);

  return (
    <Plot
      data={[
        {
          x: xValues,
          y: yValues,
          mode: 'markers',
          type: 'scatter',
          marker: {
            color: '#5b6cff',
            opacity: 0.82,
            size: 12,
            line: { width: 1.2, color: '#eef2ff' },
          },
          customdata: customData,
          hovertemplate:
            '<b>Patient %{customdata[0]}</b><br>' +
            `${xField}: %{x}<br>${yField}: %{y}<extra></extra>`,
        },
      ]}
      layout={{
        autosize: true,
        margin: { l: 60, r: 30, t: 40, b: 60 },
        font: {
          family: 'Aptos, "Segoe UI", sans-serif',
          color: '#334155',
        },
        xaxis: {
          title: xField.replace(/_/g, ' '),
          type: xType === 'numeric' ? 'linear' : 'category',
          tickangle: xType === 'numeric' ? 0 : -45,
          gridcolor: '#dbe4ff',
          zerolinecolor: '#c7d2fe',
        },
        yaxis: {
          title: yField.replace(/_/g, ' '),
          type: yType === 'numeric' ? 'linear' : 'category',
          gridcolor: '#dbe4ff',
          zerolinecolor: '#c7d2fe',
        },
        plot_bgcolor: 'rgba(241, 245, 255, 0.86)',
        paper_bgcolor: 'rgba(0, 0, 0, 0)',
        hovermode: 'closest',
      }}
      useResizeHandler
      style={{ width: '100%', height: '100%' }}
    />
  );
}
