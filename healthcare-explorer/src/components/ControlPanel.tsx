import { HealthField, FieldMeta, ChartType } from '../types';

export interface InsightPreset {
  label: string;
  description: string;
  chartType: ChartType;
  xField: HealthField;
  yField: HealthField;
}

interface ChartControlsProps {
  chartType: ChartType;
  xField: HealthField;
  yField: HealthField;
  smokingOnly: boolean;
  alcoholIntakeOnly: boolean;
  chartTypes: readonly ChartType[];
  xOptions: HealthField[];
  yOptions: HealthField[];
  fieldMetadata: Record<HealthField, FieldMeta>;
  onChartTypeChange: (value: ChartType) => void;
  onXFieldChange: (value: HealthField) => void;
  onYFieldChange: (value: HealthField) => void;
  onSmokingOnlyChange: (value: boolean) => void;
  onAlcoholIntakeOnlyChange: (value: boolean) => void;
  onReset: () => void;
}

interface InsightPresetsProps {
  presets: InsightPreset[];
  onApplyPreset: (preset: InsightPreset) => void;
}

const labels: Record<ChartType, string> = {
  scatterplot: 'Scatterplot',
  heatmap: 'Heatmap',
};

export function ChartControls({
  chartType,
  xField,
  yField,
  smokingOnly,
  alcoholIntakeOnly,
  chartTypes,
  xOptions,
  yOptions,
  fieldMetadata,
  onChartTypeChange,
  onXFieldChange,
  onYFieldChange,
  onSmokingOnlyChange,
  onAlcoholIntakeOnlyChange,
  onReset,
}: ChartControlsProps) {
  return (
    <section className="panelSection controlSurface">
      <div className="controlSurfaceHeader">
        <div>
          <p className="controlLabel">Build your own comparison</p>
          <p className="controlPrompt">
            Get insights on what your habits mean by pairing two health signals below.
          </p>
        </div>

        <button className="resetButton" type="button" onClick={onReset}>
          Reset defaults
        </button>
      </div>

      <div className="inlineControlGrid">
        <div>
          <p className="controlLabel">Chart type</p>
          <div className="segmentControl">
            {chartTypes.map((option) => (
              <button
                key={option}
                type="button"
                className={option === chartType ? 'active' : ''}
                aria-pressed={option === chartType}
                onClick={() => onChartTypeChange(option)}
              >
                {labels[option]}
              </button>
            ))}
          </div>
        </div>

        <label>
          <p className="controlLabel">X axis</p>
          <p className="fieldHint">Choose the factor you want to start from.</p>
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
          <p className="fieldHint">Pick the outcome or measure you want to compare.</p>
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

      <div className="filterSection">
        <div>
          <p className="controlLabel">Habit filters</p>
          <p className="controlPrompt">
            Use checkboxes to focus the chart on people who report these habits.
          </p>
        </div>

        <div className="checkboxRow">
          <label className="checkboxCard">
            <input
              type="checkbox"
              checked={smokingOnly}
              onChange={(event) => onSmokingOnlyChange(event.target.checked)}
            />
            <div>
              <span>Smoker</span>
              <small>Only show records marked as smokers.</small>
            </div>
          </label>

          <label className="checkboxCard">
            <input
              type="checkbox"
              checked={alcoholIntakeOnly}
              onChange={(event) => onAlcoholIntakeOnlyChange(event.target.checked)}
            />
            <div>
              <span>Alcohol intake</span>
              <small>Only show records marked with alcohol intake.</small>
            </div>
          </label>
        </div>
      </div>
    </section>
  );
}

export function InsightPresets({ presets, onApplyPreset }: InsightPresetsProps) {
  return (
    <section className="presetSection presetSurface">
      <div>
        <p className="controlLabel">Try a health question</p>
        <p className="controlPrompt">
          Start with a guided comparison, then adjust the fields to match what matters to you.
        </p>
      </div>

      <div className="presetGrid">
        {presets.map((preset) => (
          <button
            key={preset.label}
            type="button"
            className="presetButton"
            onClick={() => onApplyPreset(preset)}
          >
            <span>{preset.label}</span>
            <small>{preset.description}</small>
          </button>
        ))}
      </div>
    </section>
  );
}
