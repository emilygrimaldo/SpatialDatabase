import { useMemo, useState } from 'react';
import ControlPanel from './components/ControlPanel';
import ChartView from './components/ChartView';
import { sampleData } from './data/sampleData';
import {
  chartTypes,
  fieldMetadata,
  supportedXOptions,
  supportedYOptions,
  ChartType,
  HealthField,
} from './types';

const DEFAULT_CHART_TYPE: ChartType = 'scatterplot';
const DEFAULT_X_AXIS: HealthField = 'Gender';
const DEFAULT_Y_AXIS: HealthField = 'BMI';

function App() {
  const [chartType, setChartType] = useState<ChartType>(DEFAULT_CHART_TYPE);
  const [xField, setXField] = useState<HealthField>(DEFAULT_X_AXIS);
  const [yField, setYField] = useState<HealthField>(DEFAULT_Y_AXIS);

  const xType = fieldMetadata[xField].type;
  const yType = fieldMetadata[yField].type;

  const note = useMemo(() => {
    if (chartType === 'scatterplot') {
      return 'Scatterplot is best for numeric comparisons and categorical-vs-numeric comparison using category positions.';
    }
    return 'Heatmap is best for counts, categorical frequency comparisons, and binned density for numeric pairs.';
  }, [chartType]);

  const resetDefaults = () => {
    setChartType(DEFAULT_CHART_TYPE);
    setXField(DEFAULT_X_AXIS);
    setYField(DEFAULT_Y_AXIS);
  };

  return (
    <div className="appShell">
      <aside className="sidebar card">
        <div className="panelHeading">
          <h1>Healthcare Data Explorer</h1>
          <p className="subtitle">Choose X and Y variables to compare patient metrics.</p>
        </div>

        <ControlPanel
          chartType={chartType}
          xField={xField}
          yField={yField}
          onChartTypeChange={setChartType}
          onXFieldChange={setXField}
          onYFieldChange={setYField}
          onReset={resetDefaults}
          chartTypes={chartTypes}
          xOptions={supportedXOptions}
          yOptions={supportedYOptions}
          fieldMetadata={fieldMetadata}
        />

        <div className="noteCard">
          <h3>Chart guidance</h3>
          <p>{note}</p>
          <ul>
            <li>Use scatterplot for numerical relationships.</li>
            <li>Use heatmap to compare counts and density.</li>
            <li>Gender is categorical, so the scatterplot will place categories on one axis.</li>
          </ul>
        </div>
      </aside>

      <main className="content card">
        <div className="chartHeader">
          <div>
            <p className="sectionLabel">Current view</p>
            <h2>{`${chartType === 'scatterplot' ? 'Scatterplot' : 'Heatmap'} · ${xField} vs ${yField}`}</h2>
          </div>
        </div>

        <ChartView
          data={sampleData}
          xField={xField}
          yField={yField}
          chartType={chartType}
          fieldMetadata={fieldMetadata}
        />
      </main>
    </div>
  );
}

export default App;
