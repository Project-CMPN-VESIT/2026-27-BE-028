import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import useEventStore from '../store/eventStore';
import DecisionPanel from '../components/DecisionPanel';
import './pages.css';

const Dashboard = () => {
  const { events, selectedEvent, selectedDecision, loadEvents, selectEvent, loading, error } = useEventStore();

  useEffect(() => {
    if (!events.length) {
      loadEvents();
    }
  }, [events.length, loadEvents]);

  const activeEvent = selectedEvent || events[0];

  return (
    <div className="page-shell dashboard-page">
      <header className="page-shell__header">
        <div>
          <p className="page-shell__eyebrow">Overview</p>
          <h1>Satellite Collision Avoidance AI System</h1>
          <p className="page-shell__subhead">Live event-driven maneuver dashboard</p>
        </div>
        <div className="page-shell__actions">
          <Link to="/events">All Events</Link>
          <Link to={`/events/${activeEvent?.id ?? 1}`}>Open Detail</Link>
        </div>
      </header>

      {error && <div className="page-shell__error">{error}</div>}

      <section className="dashboard-overview-grid">
        <article className="dashboard-card dashboard-card--hero">
          <span className="dashboard-card__label">Current Event</span>
          <h2>Event {activeEvent?.id ?? '—'}</h2>
          <p>{activeEvent?.risk_level ?? 'UNKNOWN'} risk conjunction in progress.</p>
          <div className="dashboard-card__metrics">
            <div><span>TCA</span><strong>{activeEvent?.tca_minutes ?? '--'} min</strong></div>
            <div><span>PoC</span><strong>{activeEvent ? `${(Number(activeEvent.collision_probability) * 100).toFixed(2)}%` : '--'}</strong></div>
            <div><span>Miss Dist</span><strong>{activeEvent?.miss_distance ?? '--'} km</strong></div>
          </div>
        </article>

        <article className="dashboard-card dashboard-card--list">
          <span className="dashboard-card__label">Quick Select</span>
          <div className="dashboard-mini-list">
            {events.slice(0, 4).map((event) => {
              const eventId = event.id ?? event;
              return (
                <button key={eventId} onClick={() => selectEvent(eventId)} className={selectedEvent?.id === eventId ? 'is-active' : ''}>
                  Event {eventId} · {event.risk_level ?? 'UNKNOWN'}
                </button>
              );
            })}
          </div>
        </article>
      </section>

      <section className="dashboard-overview-grid dashboard-overview-grid--lower">
        <article className="dashboard-card">
          <span className="dashboard-card__label">Quick Decision</span>
          <DecisionPanel decision={selectedDecision} />
        </article>
        <article className="dashboard-card dashboard-card--action">
          <span className="dashboard-card__label">Actions</span>
          <div className="dashboard-actions">
            <Link to="/simulation">Run Simulation</Link>
            <Link to="/analysis">Model Analysis</Link>
          </div>
          <p className="dashboard-card__note">{loading ? 'Syncing data from backend...' : 'Backend-backed event state is active.'}</p>
        </article>
      </section>
    </div>
  );
};

export default Dashboard;
