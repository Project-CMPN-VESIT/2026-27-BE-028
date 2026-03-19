const { useState, useEffect, useRef } = React;

// API Base URL
const API_BASE = 'http://localhost:8000/api';

// Simple metrics card component
const MetricCard = ({ label, value, unit = '' }) => (
  React.createElement('div', { className: 'card p-4 mb-3' },
    React.createElement('div', { className: 'metric-label' }, label),
    React.createElement('div', { className: 'metric-value' },
      typeof value === 'number' ? (value < 0.001 && value > 0 ? value.toExponential(2) : value.toFixed(4)) : value,
      unit ? ` ${unit}` : ''
    )
  )
);

// Decision badge
const DecisionBadge = ({ decision }) => {
  const statusClass = {
    'WAIT': 'status-wait',
    'COMMIT': 'status-commit',
    'FORCE_COMMIT': 'status-force'
  }[decision] || 'status-wait';

  return React.createElement('div', { className: `status ${statusClass}` },
    React.createElement('strong', null, decision),
    decision === 'FORCE_COMMIT' ? ' - IMMEDIATE ACTION REQUIRED' : ''
  );
};

// Chart component
const CollisionProbabilityChart = ({ data }) => {
  const canvasRef = useRef(null);
  const chartRef = useRef(null);

  useEffect(() => {
    if (!canvasRef.current || !data || data.length === 0) return;

    const ctx = canvasRef.current.getContext('2d');

    if (chartRef.current) {
      chartRef.current.destroy();
    }

    chartRef.current = new Chart(ctx, {
      type: 'line',
      data: {
        labels: data.map(d => `${d.time.toFixed(1)}h`),
        datasets: [{
          label: 'Collision Probability',
          data: data.map(d => d.pc > 0 ? (d.pc < 1e-6 ? 1e-6 : d.pc) : 0),
          borderColor: '#ef4444',
          backgroundColor: 'rgba(239, 68, 68, 0.1)',
          tension: 0.4,
          pointRadius: 2
        }]
      },
      options: {
        responsive: true,
        plugins: { legend: { display: true } },
        scales: {
          y: { title: { display: true, text: 'Collision Probability' }, type: 'logarithmic', beginAtZero: false }
        }
      }
    });

    return () => {
      if (chartRef.current) {
        chartRef.current.destroy();
      }
    };
  }, [data]);

  return React.createElement('canvas', { ref: canvasRef });
};

// Main Dashboard
const Dashboard = () => {
  const [events, setEvents] = useState([]);
  const [selectedEventId, setSelectedEventId] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState(null);

  // Load events on mount
  useEffect(() => {
    const loadEvents = async () => {
      try {
        const response = await fetch(`${API_BASE}/events`);
        if (!response.ok) throw new Error('Failed to load events');
        const data = await response.json();
        setEvents(data);
        if (data.length > 0) setSelectedEventId(data[0]);
      } catch (err) {
        setError('Failed to load events: ' + err.message);
      }
    };

    const loadStats = async () => {
      try {
        const response = await fetch(`${API_BASE}/dataset/stats`);
        if (!response.ok) throw new Error('Failed to load stats');
        const data = await response.json();
        setStats(data);
      } catch (err) {
        console.log('Stats loading error:', err);
      }
    };

    loadEvents();
    loadStats();
  }, []);

  // Run simulation
  const handleRunSimulation = async () => {
    if (!selectedEventId) {
      setError('Please select an event');
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch(`${API_BASE}/evaluate/${selectedEventId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Evaluation failed');
      }

      const data = await response.json();
      setResult(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return React.createElement('div', { className: 'p-6 max-w-7xl mx-auto' },
    // Header
    React.createElement('div', { className: 'mb-6' },
      React.createElement('h1', { className: 'text-3xl font-bold text-gray-900 mb-2' },
        'Satellite Collision Avoidance AI System'
      ),
      React.createElement('p', { className: 'text-gray-600' },
        'AI-based decision system for optimal collision avoidance maneuver timing under uncertainty'
      )
    ),

    // Dataset info
    stats && React.createElement('div', { className: 'card p-4 mb-6 bg-blue-50 border-blue-200' },
      React.createElement('p', { className: 'text-sm text-blue-900' },
        `Dataset: ${stats.total_observations} observations | ${stats.unique_events} unique events`
      )
    ),

    // Controls
    React.createElement('div', { className: 'card p-4 mb-6' },
      React.createElement('div', { className: 'mb-3' },
        React.createElement('label', { className: 'block text-sm font-medium text-gray-700 mb-2' }, 'Select Event ID:'),
        React.createElement('select', {
          value: selectedEventId || '',
          onChange: (e) => setSelectedEventId(parseInt(e.target.value)),
          className: 'w-full md:w-64 px-3 py-2 border border-gray-300 rounded-md'
        },
          React.createElement('option', { value: '' }, 'Choose an event...'),
          events.map(id => React.createElement('option', { key: id, value: id }, `Event ${id}`))
        )
      ),
      React.createElement('button', {
        onClick: handleRunSimulation,
        disabled: loading || !selectedEventId,
        className: `button-primary ${loading ? 'loading' : ''}`
      }, loading ? 'Running Simulation...' : 'Run Simulation')
    ),

    // Error display
    error && React.createElement('div', { className: 'error' }, error),

    // Results
    result && React.createElement('div', { className: 'grid grid-cols-1 md:grid-cols-2 gap-6' },
      // Left column
      React.createElement('div', null,
        // Decision
        React.createElement('div', { className: 'card p-4 mb-4' },
          React.createElement('h2', { className: 'text-lg font-semibold mb-3' }, 'Decision'),
          DecisionBadge({ decision: result.decision }),
          React.createElement('p', { className: 'text-sm text-gray-600 mt-2' },
            `Confidence: ${(result.confidence * 100).toFixed(1)}%`
          )
        ),

        // Event Info
        React.createElement('div', { className: 'card p-4 mb-4' },
          React.createElement('h3', { className: 'font-semibold mb-3' }, 'Event Information'),
          MetricCard({ label: 'Event ID', value: result.event_id }),
          MetricCard({ label: 'Time to TCA', value: result.time_to_tca, unit: 'hours' }),
          MetricCard({ label: 'Miss Distance', value: result.miss_distance, unit: 'meters' })
        ),

        // Risk Assessment
        React.createElement('div', { className: 'card p-4 mb-4' },
          React.createElement('h3', { className: 'font-semibold mb-3' }, 'Risk Assessment'),
          MetricCard({ label: 'Collision Probability', value: result.probability_of_collision }),
          React.createElement('div', { className: 'metric-label mt-2' }, `Risk Level: ${result.safety.risk_level}`),
          result.safety.force_action_required && React.createElement('div', { className: 'text-red-600 text-sm mt-2' },
            '⚠️ Force action required'
          )
        )
      ),

      // Right column
      React.createElement('div', null,
        // Cost Analysis
        React.createElement('div', { className: 'card p-4 mb-4' },
          React.createElement('h3', { className: 'font-semibold mb-3' }, 'Cost Analysis'),
          MetricCard({ label: 'Acting Cost', value: result.costs.total_act_cost, unit: 'units' }),
          MetricCard({ label: 'Waiting Cost', value: result.costs.total_wait_cost, unit: 'units' }),
          MetricCard({ label: 'Cost Difference', value: result.costs.cost_difference, unit: 'units' })
        ),

        // Uncertainty
        React.createElement('div', { className: 'card p-4 mb-4' },
          React.createElement('h3', { className: 'font-semibold mb-3' }, 'Uncertainty'),
          MetricCard({ label: 'Current', value: result.uncertainty.current_uncertainty }),
          MetricCard({ label: 'Projected', value: result.uncertainty.projected_uncertainty })
        ),

        // Feasibility
        React.createElement('div', { className: 'card p-4 mb-4' },
          React.createElement('h3', { className: 'font-semibold mb-3' }, 'Feasibility'),
          MetricCard({ label: 'Current ΔV', value: result.feasibility.current_delta_v, unit: 'm/s' }),
          MetricCard({ label: 'Projected ΔV', value: result.feasibility.projected_delta_v, unit: 'm/s' }),
          MetricCard({ label: 'Index', value: result.feasibility.feasibility_index })
        )
      )
    ),

    // Chart
    result && result.simulation && React.createElement('div', { className: 'card p-4 mt-6' },
      React.createElement('h2', { className: 'text-lg font-semibold mb-4' }, 'Collision Probability Trend'),
      React.createElement('div', { style: { position: 'relative', height: '300px' } },
        React.createElement(CollisionProbabilityChart, { data: result.simulation.collision_probability_trend })
      )
    ),

    // Explanation
    result && React.createElement('div', { className: 'card p-4 mt-6' },
      React.createElement('h2', { className: 'text-lg font-semibold mb-2' }, 'Decision Explanation'),
      React.createElement('p', { className: 'text-gray-700' }, result.explanation),
      React.createElement('p', { className: 'text-gray-600 text-sm mt-3' },
        'Causal Analysis: ' + result.causal_analysis.explanation_text
      )
    ),

    // Recommended action time
    result && result.recommended_action_time && React.createElement('div', { className: 'card p-4 mt-6 bg-yellow-50 border-yellow-200' },
      React.createElement('p', { className: 'text-yellow-900' },
        `Recommended re-evaluation in ${result.recommended_action_time.toFixed(1)} hours`
      )
    )
  );
};

// Render app
ReactDOM.render(
  React.createElement(Dashboard),
  document.getElementById('root')
);
