import Plot from 'react-plotly.js';
import { buildHeatmapData } from '../utils/chartUtils';
import { FieldType, HealthField, HealthRecord } from '../types';

interface HeatmapViewProps {
  data: HealthRecord[];
  xField: HealthField;
  yField: HealthField;
  xType: FieldType;
  yType: FieldType;
  xLabel: string;
  yLabel: string;
}

export default function HeatmapView({
  data,
  xField,
  yField,
  xType,
  yType,
  xLabel,
  yLabel,
}: HeatmapViewProps) {
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
            title: { text: 'Count' },
            thickness: 15,
            outlinewidth: 0,
          },
          hovertemplate: `${xLabel}: %{x}<br>${yLabel}: %{y}<br>Count: %{z}<extra></extra>`,
        },
      ]}
      layout={{
        height: 600,
        autosize: true,
        margin: { l: 90, r: 30, t: 40, b: 100 },
        font: {
          family: 'Aptos, "Segoe UI", sans-serif',
          color: '#334155',
        },
        xaxis: {
          title: { text: xLabel, standoff: 12 },
          tickangle: -45,
          gridcolor: '#dbe4ff',
          automargin: true,
        },
        yaxis: {
          title: { text: yLabel, standoff: 12 },
          gridcolor: '#dbe4ff',
          automargin: true,
        },
        plot_bgcolor: 'rgba(241, 245, 255, 0.86)',
        paper_bgcolor: 'rgba(0, 0, 0, 0)',
      }}
      useResizeHandler
      style={{ width: '100%', height: '600px' }}
    />
  );
}
