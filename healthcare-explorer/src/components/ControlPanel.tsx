import { FieldType, HealthField, FieldMeta, ChartType } from '../types';

interface ControlPanelProps {
  chartType: ChartType;
  xField: HealthField;
  yField: HealthField;
  chartTypes: readonly ChartType[];
  xOptions: HealthField[];
  yOptions: HealthField[];
  fieldMetadata: Record<HealthField, FieldMeta>;
  onChartTypeChange: (value: ChartType) => void;
  onXFieldChange: (value: HealthField) => void;
  onYFieldChange: (value: HealthField) => void;
  onReset: () => void;
}

const labels: Record<ChartType, string> = {
  scatterplot: 'Scatterplot',
  heatmap: 'Heatmap',
};

export default function ControlPanel({
  chartType,
  xField,
  yField,
  chartTypes,
  xOptions,
  yOptions,
  fieldMetadata,
  onChartTypeChange,
  onXFieldChange,
  onYFieldChange,
  onReset,
}: ControlPanelProps) {
  return (
    <div className="panelSection">
      <div>
        <p className="controlLabel">Chart type</p>
        <div className="segmentControl">
          {chartTypes.map((option) => (
            <button
              key={option}
              type="button"
              className={option === chartType ? 'active' : ''}
              onClick={() => onChartTypeChange(option)}
            >
              {labels[option]}
            </button>
          ))}
        </div>
      </div>

      <div className="controlRow">
        <label>
          <p className="controlLabel">X axis</p>
          <select
            className="selectField"
            value={xField}
            onChange={(event) => onXFieldChange(event.target.value as HealthField)}
          >
            {xOptions.map((option) => (
              <option key={option} value={option}>
                {fieldMetadata[option].label}
              </option>
            ))}
          </select>
        </label>

        <label>
          <p className="controlLabel">Y axis</p>
          <select
            className="selectField"
            value={yField}
            onChange={(event) => onYFieldChange(event.target.value as HealthField)}
          >
            {yOptions.map((option) => (
              <option key={option} value={option}>
                {fieldMetadata[option].label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div>
        <button className="resetButton" type="button" onClick={onReset}>
          Reset defaults
        </button>
      </div>
    </div>
  );
}
