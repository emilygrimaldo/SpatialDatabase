import { ChartType, FieldMeta, FieldType, HealthField, HealthRecord } from '../types';
import ScatterChartView from './ScatterChartView';
import HeatmapView from './HeatmapView';

interface ChartViewProps {
  data: HealthRecord[];
  xField: HealthField;
  yField: HealthField;
  chartType: ChartType;
  fieldMetadata: Record<HealthField, FieldMeta>;
}

export default function ChartView({
  data,
  xField,
  yField,
  chartType,
  fieldMetadata,
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
