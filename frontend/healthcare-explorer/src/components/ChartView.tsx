import { ChartType, FieldMeta, FieldType, HealthField, HealthRecord, ShapeField } from '../types';
import ScatterChartView from './ScatterChartView';
import HeatmapView from './HeatmapView';

interface ChartViewProps {
  data: HealthRecord[];
  xField: HealthField;
  yField: HealthField;
  chartType: ChartType;
  fieldMetadata: Record<HealthField, FieldMeta>;
  showClusters: boolean;
  showRegression: boolean;
  regressionTargetLabel: string;
  markerShape: ShapeField;
}

export default function ChartView({
  data,
  xField,
  yField,
  chartType,
  fieldMetadata,
  showClusters,
  showRegression,
  regressionTargetLabel,
  markerShape,
}: ChartViewProps) {
  const xType: FieldType = fieldMetadata[xField].type;
  const yType: FieldType = fieldMetadata[yField].type;
  const xLabel = fieldMetadata[xField].label;
  const yLabel = fieldMetadata[yField].label;

  return (
    <div className="chartContainer">
      {chartType === 'scatterplot' ? (
        <ScatterChartView
          data={data}
          xField={xField}
          yField={yField}
          xType={xType}
          yType={yType}
          xLabel={xLabel}
          yLabel={yLabel}
          showClusters={showClusters}
          showRegression={showRegression}
          regressionTargetLabel={regressionTargetLabel}
          markerShape={markerShape}
        />
      ) : (
        <HeatmapView
          data={data}
          xField={xField}
          yField={yField}
          xType={xType}
          yType={yType}
          xLabel={xLabel}
          yLabel={yLabel}
        />
      )}
    </div>
  );
}
