/**
 * Charts Component
 *
 * Visualizes simulation results using Chart.js.
 * - Collision Probability over Time
 * - Uncertainty Evolution
 * - Maneuver Feasibility
 */

import { useEffect, useRef } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  LogarithmicScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { Line } from 'react-chartjs-2';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  LogarithmicScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

const Charts = ({ simulation }) => {
  if (!simulation) return null;

  // Chart.js common options with space theme
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: true,
    plugins: {
      legend: {
        labels: {
          color: '#22d3ee', // Cyan-400
          font: {
            family: 'Inter, system-ui, sans-serif',
            size: 12,
          }
        }
      },
      tooltip: {
        backgroundColor: 'rgba(17, 24, 39, 0.9)', // Gray-900 with opacity
        titleColor: '#22d3ee',
        bodyColor: '#e5e7eb',
        borderColor: '#22d3ee',
        borderWidth: 1,
      }
    },
    scales: {
      x: {
        grid: {
          color: 'rgba(34, 211, 238, 0.1)', // Cyan with opacity
        },
        ticks: {
          color: '#9ca3af', // Gray-400
        },
        title: {
          display: true,
          color: '#22d3ee',
          font: {
            weight: 'bold',
          }
        }
      },
      y: {
        grid: {
          color: 'rgba(34, 211, 238, 0.1)',
        },
        ticks: {
          color: '#9ca3af',
        },
        title: {
          display: true,
          color: '#22d3ee',
          font: {
            weight: 'bold',
          }
        }
      }
    }
  };

  // Collision Probability Chart Data
  const pcData = {
    labels: simulation.collision_probability_trend.map(d => d.time.toFixed(1)),
    datasets: [
      {
        label: 'Collision Probability',
        data: simulation.collision_probability_trend.map(d => d.pc),
        borderColor: '#ef4444', // Red-500
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        borderWidth: 2,
        tension: 0.4,
        fill: true,
        pointRadius: 2,
        pointHoverRadius: 5,
      }
    ]
  };

  const pcOptions = {
    ...chartOptions,
    scales: {
      ...chartOptions.scales,
      x: {
        ...chartOptions.scales.x,
        title: {
          ...chartOptions.scales.x.title,
          text: 'Time (hours)'
        }
      },
      y: {
        ...chartOptions.scales.y,
        type: 'logarithmic',
        title: {
          ...chartOptions.scales.y.title,
          text: 'Collision Probability'
        }
      }
    },
    plugins: {
      ...chartOptions.plugins,
      title: {
        display: true,
        text: 'Collision Probability Over Time',
        color: '#22d3ee',
        font: {
          size: 16,
          weight: 'bold'
        }
      }
    }
  };

  // Uncertainty Chart Data
  const uncertaintyData = {
    labels: simulation.uncertainty_trend.map(d => d.time.toFixed(1)),
    datasets: [
      {
        label: 'Uncertainty',
        data: simulation.uncertainty_trend.map(d => d.uncertainty),
        borderColor: '#3b82f6', // Blue-500
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        borderWidth: 2,
        tension: 0.4,
        fill: true,
        pointRadius: 2,
        pointHoverRadius: 5,
      }
    ]
  };

  const uncertaintyOptions = {
    ...chartOptions,
    scales: {
      ...chartOptions.scales,
      x: {
        ...chartOptions.scales.x,
        title: {
          ...chartOptions.scales.x.title,
          text: 'Time (hours)'
        }
      },
      y: {
        ...chartOptions.scales.y,
        title: {
          ...chartOptions.scales.y.title,
          text: 'Uncertainty Level'
        }
      }
    },
    plugins: {
      ...chartOptions.plugins,
      title: {
        display: true,
        text: 'Uncertainty Evolution',
        color: '#22d3ee',
        font: {
          size: 16,
          weight: 'bold'
        }
      }
    }
  };

  // Feasibility Chart Data
  const feasibilityData = {
    labels: simulation.maneuver_feasibility.map(d => d.time.toFixed(1)),
    datasets: [
      {
        label: 'Maneuver Feasibility',
        data: simulation.maneuver_feasibility.map(d => d.feasibility),
        borderColor: '#10b981', // Green-500
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        borderWidth: 2,
        tension: 0.4,
        fill: true,
        pointRadius: 2,
        pointHoverRadius: 5,
      }
    ]
  };

  const feasibilityOptions = {
    ...chartOptions,
    scales: {
      ...chartOptions.scales,
      x: {
        ...chartOptions.scales.x,
        title: {
          ...chartOptions.scales.x.title,
          text: 'Time (hours)'
        }
      },
      y: {
        ...chartOptions.scales.y,
        min: 0,
        max: 1,
        title: {
          ...chartOptions.scales.y.title,
          text: 'Feasibility (0-1)'
        }
      }
    },
    plugins: {
      ...chartOptions.plugins,
      title: {
        display: true,
        text: 'Maneuver Feasibility Over Time',
        color: '#22d3ee',
        font: {
          size: 16,
          weight: 'bold'
        }
      }
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-cyan-400 mb-4 flex items-center">
        <svg className="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
        Simulation Trends
      </h2>

      {/* Collision Probability Chart */}
      <div className="bg-gray-900/50 backdrop-blur-sm border border-cyan-500/30 rounded-lg p-6 shadow-lg">
        <div className="h-64">
          <Line data={pcData} options={pcOptions} />
        </div>
      </div>

      {/* Uncertainty Chart */}
      <div className="bg-gray-900/50 backdrop-blur-sm border border-cyan-500/30 rounded-lg p-6 shadow-lg">
        <div className="h-64">
          <Line data={uncertaintyData} options={uncertaintyOptions} />
        </div>
      </div>

      {/* Feasibility Chart */}
      <div className="bg-gray-900/50 backdrop-blur-sm border border-cyan-500/30 rounded-lg p-6 shadow-lg">
        <div className="h-64">
          <Line data={feasibilityData} options={feasibilityOptions} />
        </div>
      </div>
    </div>
  );
};

export default Charts;
