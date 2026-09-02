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
    legend: { display: false }
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

function ChartsPanel({ chartSeries, result }) {
  const comparison = result?.comparison;
  const comparisonLabels = Array.isArray(comparison?.t) ? comparison.t.map((t) => `t${t}`) : [];
  const modelProb = comparison?.prob_commit || {};

  const pocData = {
    labels: comparisonLabels.length ? comparisonLabels : chartSeries.labels,
    datasets: [
      {
        label: 'LSTM',
        data: Array.isArray(modelProb.lstm) ? modelProb.lstm : [],
        borderColor: '#35ccff',
        backgroundColor: 'rgba(53, 204, 255, 0.07)',
        pointRadius: 0,
        borderWidth: 2,
        tension: 0.35
      },
      {
        label: 'TCN',
        data: Array.isArray(modelProb.tcn) ? modelProb.tcn : [],
        borderColor: '#ffbf4a',
        backgroundColor: 'rgba(255, 191, 74, 0.07)',
        pointRadius: 0,
        borderWidth: 2,
        tension: 0.35
      },
      {
        label: 'XGB',
        data: Array.isArray(modelProb.xgboost) ? modelProb.xgboost : [],
        borderColor: '#52ffa8',
        backgroundColor: 'rgba(82, 255, 168, 0.07)',
        pointRadius: 0,
        borderWidth: 2,
        tension: 0.35
      }
    ]
  };

  const fuelData = {
    labels: chartSeries.labels,
    datasets: [
      {
        data: chartSeries.fuel,
        borderColor: '#35ccff',
        backgroundColor: 'rgba(53, 204, 255, 0.13)',
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
        borderColor: '#52ffa8',
        backgroundColor: 'rgba(82, 255, 168, 0.11)',
        fill: true,
        pointRadius: 0,
        borderWidth: 2,
        tension: 0.35
      },
      {
        data: Array(chartSeries.labels.length).fill(25),
        borderColor: 'rgba(255, 129, 71, 0.52)',
        pointRadius: 0,
        borderDash: [6, 4],
        borderWidth: 1
      }
    ]
  };

  return (
    <section className={styles.chartsPanel}>
      <article className={styles.chartCard}>
        <h3>Probability of Collision vs Time</h3>
        <div className={styles.chartBody}>
          <Line data={pocData} options={baseOptions} />
        </div>
      </article>

      <article className={styles.chartCard}>
        <h3>Fuel (Delta-V) Consumption vs Time</h3>
        <div className={styles.chartBody}>
          <Line data={fuelData} options={baseOptions} />
        </div>
      </article>

      <article className={styles.chartCard}>
        <h3>Miss Distance vs Time</h3>
        <div className={styles.chartBody}>
          <Line data={distanceData} options={baseOptions} />
        </div>
      </article>
    </section>
  );
}

export default ChartsPanel;
