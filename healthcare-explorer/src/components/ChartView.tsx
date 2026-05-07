import { ChartType, FieldMeta, FieldType, HealthField, HealthRecord } from '../types';
import ScatterChartView from './ScatterChartView';
import HeatmapView from './HeatmapView';

interface ChartViewProps {
  data: HealthRecord[];
  xField: HealthField;
  yField: HealthField;
  chartType: ChartType;
  fieldMetadata: Record<HealthField, FieldMeta>;
  showClusters: boolean;
}

export default function ChartView({
  data,
  xField,
  yField,
  chartType,
  fieldMetadata,
  showClusters,
}: ChartViewProps) {
  const xType: FieldType = fieldMetadata[xField].type;
  const yType: FieldType = fieldMetadata[yField].type;

  return (
    <div className="chartContainer">
      {chartType === 'scatterplot' ? (
        <ScatterChartView
          data={data}
          xField={xField}
          yField={yField}
          xType={xType}
          yType={yType}
          showClusters={showClusters}
        />
      ) : (
        <HeatmapView data={data} xField={xField} yField={yField} xType={xType} yType={yType} />
      )}
    </div>
  );
}
