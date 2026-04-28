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
          colorscale: 'Blues',
          reversescale: false,
          colorbar: { title: 'Count', thickness: 15 },
          hovertemplate: `${xField.replace(/_/g, ' ')}: %{x}<br>${yField.replace(/_/g, ' ')}: %{y}<br>Count: %{z}<extra></extra>`,
        },
      ]}
      layout={{
        autosize: true,
        margin: { l: 90, r: 30, t: 40, b: 100 },
        xaxis: {
          title: xField.replace(/_/g, ' '),
          tickangle: -45,
        },
        yaxis: {
          title: yField.replace(/_/g, ' '),
        },
        plot_bgcolor: '#f8fafc',
        paper_bgcolor: '#ffffff',
      }}
      useResizeHandler
      style={{ width: '100%', height: '100%' }}
    />
  );
}
