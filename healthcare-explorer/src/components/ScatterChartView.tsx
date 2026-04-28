import Plot from 'react-plotly.js';
import { FieldType, HealthField, HealthRecord } from '../types';

interface ScatterChartViewProps {
  data: HealthRecord[];
  xField: HealthField;
  yField: HealthField;
  xType: FieldType;
  yType: FieldType;
}

export default function ScatterChartView({ data, xField, yField, xType, yType }: ScatterChartViewProps) {
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
            color: '#2563eb',
            opacity: 0.8,
            size: 11,
            line: { width: 1, color: '#ffffff' },
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
        xaxis: {
          title: xField.replace(/_/g, ' '),
          type: xType === 'numeric' ? 'linear' : 'category',
          tickangle: xType === 'numeric' ? 0 : -45,
        },
        yaxis: {
          title: yField.replace(/_/g, ' '),
          type: yType === 'numeric' ? 'linear' : 'category',
        },
        plot_bgcolor: '#f8fafc',
        paper_bgcolor: '#ffffff',
        hovermode: 'closest',
      }}
      useResizeHandler
      style={{ width: '100%', height: '100%' }}
    />
  );
}
