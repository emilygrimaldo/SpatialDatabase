import { useMemo, useState, useEffect } from 'react';
import { ChartControls, InsightPresets, InsightPreset } from './components/ControlPanel';
import ChartView from './components/ChartView';

import {
  chartTypes,
  fieldMetadata,
  regressionFieldMetadata,
  regressionPredictorOptions,
  regressionTargetOptions,
  supportedXOptions,
  supportedYOptions,
  ChartType,
  HealthField,
  HealthRecord,
  RegressionField,
  ShapeField,
} from './types';

const DEFAULT_CHART_TYPE: ChartType = 'scatterplot';
const DEFAULT_X_AXIS: HealthField = 'Gender';
const DEFAULT_Y_AXIS: HealthField = 'BMI';
const API_BASE_URL = 'http://localhost:8000';
const DEFAULT_REGRESSION_TARGET: RegressionField = 'Diabetes';
const DEFAULT_REGRESSION_PREDICTORS: RegressionField[] = [
  'Age',
  'BMI',
  'Blood_Pressure_Systolic',
  'Cholesterol',
  'Glucose_Level',
  'Smoking',
  'Alcohol_Intake',
  'Physical_Activity',
  'Family_History',
];

type LoadState = 'loading' | 'loaded' | 'error';

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
  const [showClusters, setShowClusters] = useState(false);
  const [clusterCount, setClusterCount] = useState(3);
  const [showRegression, setShowRegression] = useState(false);
  const [regressionTarget, setRegressionTarget] = useState<RegressionField>(
    DEFAULT_REGRESSION_TARGET
  );
  const [regressionPredictors, setRegressionPredictors] = useState<RegressionField[]>(
    DEFAULT_REGRESSION_PREDICTORS
  );
  const [markerShape, setMarkerShape] = useState<ShapeField>('none');
  const [data, setData] = useState<HealthRecord[]>([]);
  const [loadState, setLoadState] = useState<LoadState>('loading');
  const [loadError, setLoadError] = useState('');
  const [loadedClusterCount, setLoadedClusterCount] = useState(clusterCount);
  const [loadedRegressionKey, setLoadedRegressionKey] = useState('');
  const canCluster = chartType === 'scatterplot';
  const canRegression = chartType === 'scatterplot';
  const activeRegressionPredictors = useMemo(
    () => regressionPredictors.filter((field) => field !== regressionTarget),
    [regressionPredictors, regressionTarget]
  );
  const regressionRequestKey =
    showRegression && canRegression && activeRegressionPredictors.length > 0
      ? `${regressionTarget}|${activeRegressionPredictors.join(',')}`
      : '';

  useEffect(() => {
    let cancelled = false;

    setLoadState('loading');
    setLoadError('');

    const requestUrl = new URL(`${API_BASE_URL}/patients`);
    requestUrl.searchParams.set('cluster_count', String(clusterCount));

    if (regressionRequestKey !== '') {
      requestUrl.searchParams.set('regression_target', regressionTarget);
      requestUrl.searchParams.set('regression_predictors', activeRegressionPredictors.join(','));
    }

    fetch(requestUrl.toString())
      .then(async (response) => {
        if (!response.ok) {
          const body = await response.text();
          throw new Error(`GET /patients failed with ${response.status}: ${body}`);
        }

        return response.json();
      })
      .then((patients) => {
        if (cancelled) {
          return;
        }

        if (!Array.isArray(patients)) {
          throw new Error('GET /patients did not return a list of patient records.');
        }

        setData(patients);
        setLoadedClusterCount(clusterCount);
        setLoadedRegressionKey(regressionRequestKey);
        setLoadState('loaded');
        setLoadError('');
      })
      .catch((error: unknown) => {
        if (cancelled) {
          return;
        }

        const message = error instanceof Error ? error.message : String(error);
        setLoadState('error');
        setLoadError(message);
        console.error('Failed to load patients:', error);
      });

    return () => {
      cancelled = true;
    };
  }, [activeRegressionPredictors, clusterCount, regressionRequestKey, regressionTarget]);

  const filteredData = useMemo(() => {
    return data.filter((row) => {
      if (smokingOnly && row.Smoking !== 1) {
        return false;
      }

      if (alcoholIntakeOnly && row.Alcohol_Intake !== 1) {
        return false;
      }

      return true;
    });
  }, [data, smokingOnly, alcoholIntakeOnly]);

  const clusterDataReady = loadedClusterCount === clusterCount;
  const clusterIdsAvailable =
    clusterDataReady && filteredData.some((row) => typeof row.clusterId === 'number');
  const regressionDataReady = loadedRegressionKey === regressionRequestKey;
  const regressionValuesAvailable =
    regressionDataReady &&
    regressionRequestKey !== '' &&
    filteredData.some((row) => typeof row.regressionPredictedValue === 'number');

  const chartData = filteredData;

  const note = useMemo(() => {
    if (chartType === 'scatterplot') {
      return 'Scatterplots are useful for spotting patterns between two health markers, like BMI and glucose or age and blood pressure.';
    }
    return 'Heatmaps make it easier to read clusters, category differences, and dense pockets of similar health readings.';
  }, [chartType]);

  const dataStatusMessage = useMemo(() => {
    if (loadState === 'loading') {
      return `Loading patient records, ${clusterCount} saved clusters, and selected predictions from ${API_BASE_URL}/patients...`;
    }

    if (loadState === 'error') {
      return `Could not load patient records. ${loadError} Check ${API_BASE_URL}/health/db to test the database connection.`;
    }

    if (data.length === 0) {
      return `Connected to ${API_BASE_URL}/patients, but it returned 0 records. Check whether the patient table has rows.`;
    }

    if (filteredData.length === 0) {
      return 'Patient records loaded, but the current filters match 0 rows.';
    }

    if (showClusters && canCluster && !clusterIdsAvailable) {
      return 'Patient records loaded, but no saved cluster assignments are available for this selection yet.';
    }

    if (showRegression && canRegression && !regressionValuesAvailable) {
      return 'Patient records loaded, but no saved regression predictions are available for this selection yet.';
    }

    return '';
  }, [
    canCluster,
    canRegression,
    clusterIdsAvailable,
    data.length,
    filteredData.length,
    loadError,
    loadState,
    regressionValuesAvailable,
    showClusters,
    showRegression,
    clusterCount,
  ]);

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
    setShowClusters(false);
    setClusterCount(3);
    setShowRegression(false);
    setRegressionTarget(DEFAULT_REGRESSION_TARGET);
    setRegressionPredictors(DEFAULT_REGRESSION_PREDICTORS);
    setMarkerShape('none');
  };

  const applyPreset = (preset: InsightPreset) => {
    setChartType(preset.chartType);
    setXField(preset.xField);
    setYField(preset.yField);
  };

  const changeRegressionTarget = (target: RegressionField) => {
    setRegressionTarget(target);
    setRegressionPredictors((currentPredictors) =>
      currentPredictors.filter((field) => field !== target)
    );
  };

  const toggleRegressionPredictor = (field: RegressionField) => {
    if (field === regressionTarget) {
      return;
    }

    setRegressionPredictors((currentPredictors) => {
      if (currentPredictors.includes(field)) {
        return currentPredictors.filter((currentField) => currentField !== field);
      }

      return [...currentPredictors, field];
    });
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
          showClusters={showClusters}
          clusterCount={clusterCount}
          canCluster={canCluster}
          showRegression={showRegression}
          regressionTarget={regressionTarget}
          regressionPredictors={activeRegressionPredictors}
          canRegression={canRegression}
          markerShape={markerShape}
          canMarkerShape={chartType === 'scatterplot'}
          onChartTypeChange={setChartType}
          onXFieldChange={setXField}
          onYFieldChange={setYField}
          onSmokingOnlyChange={setSmokingOnly}
          onAlcoholIntakeOnlyChange={setAlcoholIntakeOnly}
          onShowClustersChange={setShowClusters}
          onClusterCountChange={setClusterCount}
          onShowRegressionChange={setShowRegression}
          onRegressionTargetChange={changeRegressionTarget}
          onRegressionPredictorToggle={toggleRegressionPredictor}
          onMarkerShapeChange={setMarkerShape}
          onReset={resetDefaults}
          chartTypes={chartTypes}
          xOptions={supportedXOptions}
          yOptions={supportedYOptions}
          fieldMetadata={fieldMetadata}
          regressionTargetOptions={regressionTargetOptions}
          regressionPredictorOptions={regressionPredictorOptions}
          regressionFieldMetadata={regressionFieldMetadata}
        />

        {dataStatusMessage !== '' && (
          <div className={`dataStatus ${loadState === 'error' ? 'dataStatusError' : ''}`}>
            {dataStatusMessage}
          </div>
        )}

        <ChartView
          data={chartData}
          xField={xField}
          yField={yField}
          chartType={chartType}
          fieldMetadata={fieldMetadata}
          showClusters={showClusters && canCluster && clusterIdsAvailable}
          showRegression={showRegression && canRegression && regressionValuesAvailable}
          regressionTargetLabel={regressionFieldMetadata[regressionTarget].label}
          markerShape={markerShape}
        />

        <InsightPresets presets={insightPresets} onApplyPreset={applyPreset} />
      </main>
    </div>
  );
}

export default App;
