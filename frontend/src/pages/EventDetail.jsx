import { useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip } from 'recharts';
import useEventStore from '../store/eventStore';
import './pages.css';

const EventDetail = () => {
  const { id } = useParams();
  const {
    selectedEvent,
    selectedDecision,
    eventTimelineData,
    simulationTime,
    loading,
    error,
    selectEvent,
    tickSimulation
  } = useEventStore();

  useEffect(() => {
    if (id) {
      selectEvent(Number(id));
    }
  }, [id, selectEvent]);

  useEffect(() => {
    const interval = setInterval(() => {
      tickSimulation();
    }, 1000);

    return () => clearInterval(interval);
  }, [tickSimulation]);

  if (loading && !selectedEvent) {
    return <div className="page-shell">Loading event details...</div>;
  }

  return (
    <div className="page-shell page-shell--detail">
      <header className="page-shell__header">
        <div>
          <p className="page-shell__eyebrow">Simulation Detail</p>
          <h1>Event {selectedEvent?.id ?? id}</h1>
        </div>
        <div className="page-shell__actions">
          <Link to="/events">Back to Events</Link>
          <Link to="/simulation">Open Simulation</Link>
        </div>
      </header>

      {error && <div className="page-shell__error">{error}</div>}

      <section className="detail-grid">
        <article className="detail-card">
          <span>Risk Level</span>
          <strong>{selectedEvent?.risk_level ?? 'UNKNOWN'}</strong>
        </article>
        <article className="detail-card">
          <span>TCA</span>
          <strong>{selectedEvent?.tca_minutes ?? '--'} min</strong>
        </article>
        <article className="detail-card">
          <span>Collision Probability</span>
          <strong>{selectedEvent ? `${(selectedEvent.collision_probability * 100).toFixed(2)}%` : '--'}</strong>
        </article>
        <article className="detail-card">
          <span>Miss Distance</span>
          <strong>{selectedEvent?.miss_distance ?? '--'} km</strong>
        </article>
      </section>

      <section className="detail-chart-card">
        <div className="detail-chart-card__header">
          <h2>Event Timeline</h2>
          <span>Live simulation updates every second</span>
        </div>
        <ResponsiveContainer width="100%" height={240}>
          <LineChart data={eventTimelineData}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.15)" />
            <XAxis dataKey="minute" tick={{ fill: '#cbd5e1', fontSize: 12 }} />
            <YAxis tick={{ fill: '#cbd5e1', fontSize: 12 }} />
            <Tooltip />
            <Line type="monotone" dataKey="collision_probability" stroke="#ff2d55" dot={false} />
            <Line type="monotone" dataKey="fuel_remaining" stroke="#00ff88" dot={false} />
            <Line type="monotone" dataKey="miss_distance" stroke="#00d9ff" dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </section>

      <section className="detail-decision-grid">
        <article className="detail-panel">
          <h2>Decision Output</h2>
          {selectedDecision ? (
            <div className="detail-metrics">
              <div><span>Decision</span><strong>{selectedDecision.decision}</strong></div>
              <div><span>Confidence</span><strong>{(selectedDecision.confidence * 100).toFixed(1)}%</strong></div>
              <div><span>Cost Act</span><strong>{selectedDecision.cost_act}</strong></div>
              <div><span>Cost Wait</span><strong>{selectedDecision.cost_wait}</strong></div>
            </div>
          ) : (
            <p>No decision output returned for this event.</p>
          )}
        </article>
        <article className="detail-panel">
          <h2>Current Snapshot</h2>
          <div className="detail-metrics">
            <div><span>Simulation Time</span><strong>{simulationTime}s</strong></div>
            <div><span>Relative Velocity</span><strong>{selectedEvent?.relative_velocity ?? '--'} km/s</strong></div>
            <div><span>History Points</span><strong>{eventTimelineData.length}</strong></div>
          </div>
        </article>
      </section>
    </div>
  );
};

export default EventDetail;