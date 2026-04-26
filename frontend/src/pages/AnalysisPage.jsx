import { Link } from 'react-router-dom';
import useEventStore from '../store/eventStore';
import { useEffect } from 'react';
import './pages.css';

const AnalysisPage = () => {
  const { events, selectedEvent, loadEvents } = useEventStore();

  useEffect(() => {
    if (!events.length) {
      loadEvents();
    }
  }, [events.length, loadEvents]);

  return (
    <div className="page-shell analysis-page">
      <header className="page-shell__header">
        <div>
          <p className="page-shell__eyebrow">Historical Insight</p>
          <h1>Model Analysis</h1>
        </div>
        <div className="page-shell__actions">
          <Link to="/dashboard">Dashboard</Link>
          <Link to="/events">Events</Link>
        </div>
      </header>

      <section className="analysis-hero">
        <div className="analysis-hero__stat">
          <span>Total Events</span>
          <strong>{events.length}</strong>
        </div>
        <div className="analysis-hero__stat">
          <span>Selected Event</span>
          <strong>{selectedEvent?.id ?? 'None'}</strong>
        </div>
        <div className="analysis-hero__stat">
          <span>Risk Level</span>
          <strong>{selectedEvent?.risk_level ?? 'UNKNOWN'}</strong>
        </div>
      </section>

      <section className="analysis-grid">
        <article className="analysis-card">
          <h2>Historical Events</h2>
          <ul>
            {events.slice(0, 10).map((event) => (
              <li key={event.id}>Event {event.id} · {event.risk_level} · {event.tca_minutes} min</li>
            ))}
          </ul>
        </article>
        <article className="analysis-card">
          <h2>Model Insights</h2>
          <p>
            The event store can now drive all pages from the same selected conjunction event,
            enabling historical review, live simulation, and decision evaluation from one source of truth.
          </p>
        </article>
      </section>
    </div>
  );
};

export default AnalysisPage;