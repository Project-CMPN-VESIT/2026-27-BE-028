import {
  CategoryScale,
  Chart as ChartJS,
  Filler,
  Legend,
  LineElement,
  LinearScale,
  PointElement,
  Tooltip
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import styles from '../styles/ChartsPanel.module.css';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend, Filler);

const baseOptions = {
  responsive: true,
  maintainAspectRatio: false,
  animation: {
    duration: 300,
    easing: 'easeOutQuad'
  },
  plugins: {
    legend: {
      display: true,
      position: 'top',
      labels: {
        color: '#94a3b8',
        boxWidth: 12,
        boxHeight: 8,
        font: { size: 10 }
      }
    }
  },
  scales: {
    x: {
      grid: { color: 'rgba(90, 140, 255, 0.1)', drawBorder: false },
      ticks: { color: '#6f8ab2', maxTicksLimit: 8 }
    },
    y: {
      grid: { color: 'rgba(90, 140, 255, 0.1)', drawBorder: false },
      ticks: { color: '#6f8ab2', maxTicksLimit: 5 }
    }
  }
};

const singleLineOptions = {
  ...baseOptions,
  plugins: {
    legend: { display: false }
  }
};

function ChartsPanel({ chartSeries, result }) {
  const comparison = result?.comparison;
  const comparisonLabels = Array.isArray(comparison?.t)
    ? comparison.t.map((t) => `t${t}`)
    : chartSeries.labels;
  const modelProb = comparison?.prob_commit || {};

  // Probability of Collision vs Time across all 6 models
  const pocData = {
    labels: comparisonLabels.length ? comparisonLabels : chartSeries.labels,
    datasets: [
      {
        label: 'LSTM',
        data: Array.isArray(modelProb.lstm) ? modelProb.lstm : [],
        borderColor: '#38bdf8',
        backgroundColor: 'rgba(56, 189, 248, 0.05)',
        pointRadius: 1,
        borderWidth: 2,
        tension: 0.3
      },
      {
        label: 'GRU',
        data: Array.isArray(modelProb.gru) ? modelProb.gru : [],
        borderColor: '#06b6d4',
        backgroundColor: 'rgba(6, 182, 212, 0.05)',
        pointRadius: 1,
        borderWidth: 2,
        tension: 0.3
      },
      {
        label: 'TCN',
        data: Array.isArray(modelProb.tcn) ? modelProb.tcn : [],
        borderColor: '#fbbf24',
        backgroundColor: 'rgba(251, 191, 36, 0.05)',
        pointRadius: 1,
        borderWidth: 2,
        tension: 0.3
      },
      {
        label: 'Transformer',
        data: Array.isArray(modelProb.transformer) ? modelProb.transformer : [],
        borderColor: '#a855f7',
        backgroundColor: 'rgba(168, 85, 247, 0.05)',
        pointRadius: 1,
        borderWidth: 2,
        tension: 0.3
      },
      {
        label: 'PatchTST',
        data: Array.isArray(modelProb.patchtst) ? modelProb.patchtst : [],
        borderColor: '#f472b6',
        backgroundColor: 'rgba(244, 114, 182, 0.05)',
        pointRadius: 1,
        borderWidth: 2,
        tension: 0.3
      },
      {
        label: 'XGBoost',
        data: Array.isArray(modelProb.xgboost) ? modelProb.xgboost : [],
        borderColor: '#10b981',
        backgroundColor: 'rgba(16, 185, 129, 0.05)',
        pointRadius: 1,
        borderWidth: 2,
        tension: 0.3
      }
    ]
  };

  const fuelData = {
    labels: chartSeries.labels,
    datasets: [
      {
        data: chartSeries.fuel,
        borderColor: '#38bdf8',
        backgroundColor: 'rgba(56, 189, 248, 0.13)',
        fill: true,
        pointRadius: 0,
        borderWidth: 2,
        tension: 0.35
      }
    ]
  };

  const distanceData = {
    labels: chartSeries.labels,
    datasets: [
      {
        data: chartSeries.distance,
        borderColor: '#10b981',
        backgroundColor: 'rgba(16, 185, 129, 0.11)',
        fill: true,
        pointRadius: 0,
        borderWidth: 2,
        tension: 0.35
      },
      {
        data: Array(chartSeries.labels.length).fill(25),
        borderColor: 'rgba(239, 68, 68, 0.52)',
        pointRadius: 0,
        borderDash: [6, 4],
        borderWidth: 1
      }
    ]
  };

  return (
    <section className={styles.chartsPanel}>
      <article className={styles.chartCard}>
        <h3>6-Model Collision Probability vs Time</h3>
        <div className={styles.chartBody}>
          <Line data={pocData} options={baseOptions} />
        </div>
      </article>

      <article className={styles.chartCard}>
        <h3>Fuel (Delta-V) Consumption vs Time</h3>
        <div className={styles.chartBody}>
          <Line data={fuelData} options={singleLineOptions} />
        </div>
      </article>

      <article className={styles.chartCard}>
        <h3>Miss Distance vs Time</h3>
        <div className={styles.chartBody}>
          <Line data={distanceData} options={singleLineOptions} />
        </div>
      </article>
    </section>
  );
}

export default ChartsPanel;
