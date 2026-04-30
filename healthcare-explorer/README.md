# Healthcare Data Explorer

A simple React + Vite dashboard for comparing healthcare variables using scatterplots and heatmaps.

## Features
- One-page interactive app with no backend
- Choose X and Y variables from a curated healthcare subset
- Toggle between scatterplot and heatmap visualizations
- Built with React, TypeScript, and Plotly.js
- Sample dataset included so it works immediately

## Getting Started

1. Open a terminal in `healthcare-explorer`
2. Install dependencies:

```bash
npm install
```

3. Start the app locally:

```bash
npm run dev
```

4. Open the local URL shown in the terminal (usually `http://localhost:5173`).

## Sample Dataset
The project uses a built-in sample dataset in `src/data/sampleData.ts`.

To update the sample dataset:
- replace the contents of `src/data/sampleData.ts`
- keep the exported records matching the `HealthRecord` shape in `src/types.ts`

## Project Structure
- `src/App.tsx` — main page layout and state management
- `src/components/ControlPanel.tsx` — sidebar filters and reset button
- `src/components/ChartView.tsx` — chart switcher
- `src/components/ScatterChartView.tsx` — scatterplot rendering
- `src/components/HeatmapView.tsx` — heatmap rendering
- `src/utils/chartUtils.ts` — type detection, binning, and heatmap matrix generation
- `src/data/sampleData.ts` — built-in sample healthcare dataset

## Notes
- Default view is `scatterplot` with `Gender` on X and `BMI` on Y
- The app is intentionally minimal and responsive
- No routing, login, backend, or file upload is included for V1
