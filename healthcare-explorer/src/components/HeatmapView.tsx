import Plot from 'react-plotly.js';
import { FieldType, HealthField, HealthRecord } from '../types';
import { buildHeatmapData } from '../utils/chartUtils';

interface HeatmapViewProps {
  data: HealthRecord[];
  xField: HealthField;
  yField: HealthField;
  xType: FieldType;
  yType: FieldType;
}

export default function HeatmapView({ data, xField, yField, xType, yType }: HeatmapViewProps) {
  const heatmap = buildHeatmapData(data, xField, yField, xType, yType);

  return (
    <Plot
      data={[
        {
          z: heatmap.zMatrix,
          x: heatmap.xLabels,
          y: heatmap.yLabels,
          type: 'heatmap',
          colorscale: [
            [0, '#eef2ff'],
            [0.35, '#c4b5fd'],
            [0.65, '#7dd3fc'],
            [1, '#312e81'],
          ],
          reversescale: false,
          colorbar: {
            title: 'Count',
            thickness: 15,
            outlinewidth: 0,
          },
          hovertemplate: `${xField.replace(/_/g, ' ')}: %{x}<br>${yField.replace(/_/g, ' ')}: %{y}<br>Count: %{z}<extra></extra>`,
        },
      ]}
      layout={{
        autosize: true,
        margin: { l: 90, r: 30, t: 40, b: 100 },
        font: {
          family: 'Aptos, "Segoe UI", sans-serif',
          color: '#334155',
        },
        xaxis: {
          title: xField.replace(/_/g, ' '),
          tickangle: -45,
          gridcolor: '#dbe4ff',
        },
        yaxis: {
          title: yField.replace(/_/g, ' '),
          gridcolor: '#dbe4ff',
        },
        plot_bgcolor: 'rgba(241, 245, 255, 0.86)',
        paper_bgcolor: 'rgba(0, 0, 0, 0)',
      }}
      useResizeHandler
      style={{ width: '100%', height: '100%' }}
    />
  );
}
