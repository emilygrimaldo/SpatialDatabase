import { useMemo, useState } from 'react';
import { ChartControls, InsightPresets, InsightPreset } from './components/ControlPanel';
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

const insightPresets: InsightPreset[] = [
  {
    label: 'Weight and blood sugar',
    description: 'See how BMI lines up with glucose patterns.',
    chartType: 'scatterplot',
    xField: 'BMI',
    yField: 'Glucose_Level',
  },
  {
    label: 'Age and blood pressure',
    description: 'Explore whether systolic pressure shifts across age.',
    chartType: 'scatterplot',
    xField: 'Age',
    yField: 'Blood_Pressure_Systolic',
  },
  {
    label: 'Gender and cholesterol',
    description: 'Compare cholesterol ranges across genders.',
    chartType: 'heatmap',
    xField: 'Gender',
    yField: 'Cholesterol',
  },
];

function App() {
  const [chartType, setChartType] = useState<ChartType>(DEFAULT_CHART_TYPE);
  const [xField, setXField] = useState<HealthField>(DEFAULT_X_AXIS);
  const [yField, setYField] = useState<HealthField>(DEFAULT_Y_AXIS);
  const [smokingOnly, setSmokingOnly] = useState(false);
  const [alcoholIntakeOnly, setAlcoholIntakeOnly] = useState(false);

  const filteredData = useMemo(() => {
    return sampleData.filter((row) => {
      if (smokingOnly && row.Smoking !== 1) {
        return false;
      }

      if (alcoholIntakeOnly && row.Alcohol_Intake !== 1) {
        return false;
      }

      return true;
    });
  }, [smokingOnly, alcoholIntakeOnly]);

  const note = useMemo(() => {
    if (chartType === 'scatterplot') {
      return 'Scatterplots are useful for spotting patterns between two health markers, like BMI and glucose or age and blood pressure.';
    }
    return 'Heatmaps make it easier to read clusters, category differences, and dense pockets of similar health readings.';
  }, [chartType]);

  const wellnessStats = useMemo(() => {
    const totalRecords = filteredData.length;
    const average = (values: number[]) => {
      if (values.length === 0) {
        return '0.0';
      }

      return (values.reduce((sum, value) => sum + value, 0) / values.length).toFixed(1);
    };
    const physicallyActiveShare = Math.round(
      totalRecords === 0
        ? 0
        : (filteredData.filter((row) => row.Physical_Activity === 1).length / totalRecords) * 100,
    );

    return [
      {
        value: average(filteredData.map((row) => row.BMI)),
        label: 'Average BMI',
        description: 'A quick view into body composition trends across the sample.',
      },
      {
        value: average(filteredData.map((row) => row.Glucose_Level)),
        label: 'Average glucose',
        description: 'Helpful when you want to compare metabolic markers side by side.',
      },
      {
        value: `${physicallyActiveShare}%`,
        label: 'Marked active',
        description: 'A fast snapshot of how often physical activity appears in the data.',
      },
      {
        value: String(filteredData.length),
        label: 'Matching records',
        description: 'How many records match the selected habit filters.',
      },
    ];
  }, [filteredData]);

  const resetDefaults = () => {
    setChartType(DEFAULT_CHART_TYPE);
    setXField(DEFAULT_X_AXIS);
    setYField(DEFAULT_Y_AXIS);
    setSmokingOnly(false);
    setAlcoholIntakeOnly(false);
  };

  const applyPreset = (preset: InsightPreset) => {
    setChartType(preset.chartType);
    setXField(preset.xField);
    setYField(preset.yField);
  };

  return (
    <div className="appShell">
      <aside className="sidebar card">
        <div className="panelHeading">
          <p className="eyebrow">Personal wellness explorer</p>
          <h1>Healthcare Data Explorer</h1>
          <p className="subtitle">
            Get insights on what your habits mean by exploring how weight, blood pressure,
            cholesterol, and glucose relate to each other.
          </p>
        </div>

        <section className="wellnessCard">
          <div className="wellnessIntro">
            <p className="sectionLabel">For Health-Curious Users</p>
            <h3>Start with everyday wellness questions.</h3>
            <p>
              Use the explorer to understand patterns in heart health, metabolic markers, and
              lifestyle-linked measurements without digging through spreadsheets.
            </p>
          </div>

          <div className="statGrid">
            {wellnessStats.map((stat) => (
              <article key={stat.label} className="statTile">
                <p className="statValue">{stat.value}</p>
                <h4>{stat.label}</h4>
                <p>{stat.description}</p>
              </article>
            ))}
          </div>
        </section>

        <div className="noteCard">
          <h3>How to use these views</h3>
          <p>{note}</p>
          <ul>
            <li>Pair age with blood pressure when you want a heart-health focused view.</li>
            <li>Compare BMI, cholesterol, and glucose to explore lifestyle-linked patterns.</li>
            <li>These charts are for pattern-finding and discussion, not medical diagnosis.</li>
          </ul>
        </div>
      </aside>

      <main className="content card">
        <div className="chartHeader">
          <div>
            <p className="sectionLabel">Current view</p>
            <h2>{`${chartType === 'scatterplot' ? 'Scatterplot' : 'Heatmap'} - ${fieldMetadata[xField].label} vs ${fieldMetadata[yField].label}`}</h2>
            <p className="chartSubtitle">
              A focused look at how these two health signals move together across the sample.
            </p>
          </div>
        </div>

        <ChartControls
          chartType={chartType}
          xField={xField}
          yField={yField}
          smokingOnly={smokingOnly}
          alcoholIntakeOnly={alcoholIntakeOnly}
          onChartTypeChange={setChartType}
          onXFieldChange={setXField}
          onYFieldChange={setYField}
          onSmokingOnlyChange={setSmokingOnly}
          onAlcoholIntakeOnlyChange={setAlcoholIntakeOnly}
          onReset={resetDefaults}
          chartTypes={chartTypes}
          xOptions={supportedXOptions}
          yOptions={supportedYOptions}
          fieldMetadata={fieldMetadata}
        />

        <ChartView
          data={filteredData}
          xField={xField}
          yField={yField}
          chartType={chartType}
          fieldMetadata={fieldMetadata}
        />

        <InsightPresets presets={insightPresets} onApplyPreset={applyPreset} />
      </main>
    </div>
  );
}

export default App;
