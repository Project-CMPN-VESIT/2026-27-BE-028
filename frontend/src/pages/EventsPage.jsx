import { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import useEventStore from '../store/eventStore';
import './events.css';

const EventsPage = () => {
  const navigate = useNavigate();
  const { events, selectedEvent, loadEvents, selectEvent, loading, error } = useEventStore();

  useEffect(() => {
    if (!events.length) {
      loadEvents();
    }
  }, [events.length, loadEvents]);

  return (
    <div className="events-page">
      <header className="events-page__header">
        <div>
          <p className="events-page__eyebrow">Event Center</p>
          <h1>Conjunction Events</h1>
        </div>
        <Link to="/dashboard" className="events-page__link">Open Dashboard</Link>
      </header>

      {error && <div className="events-page__error">{error}</div>}

      <section className="events-page__summary">
        <div>
          <span>Events Loaded</span>
          <strong>{events.length}</strong>
        </div>
        <div>
          <span>Selected Event</span>
          <strong>{selectedEvent?.id ?? 'None'}</strong>
        </div>
        <div>
          <span>Status</span>
          <strong>{loading ? 'Loading' : 'Ready'}</strong>
        </div>
      </section>

      <section className="events-page__list">
        {events.map((event) => (
          <button
            key={event.id ?? event}
            className={`events-page__card ${selectedEvent?.id === (event.id ?? event) ? 'is-active' : ''}`}
            onClick={() => selectEvent(event.id ?? event)}
          >
            <div className="events-page__card-top">
              <span>Event {event.id ?? event}</span>
              <strong>{event.risk_level ?? 'UNKNOWN'}</strong>
            </div>
            <div className="events-page__card-grid">
              <span>TCA</span>
              <strong>{event.tca_minutes} min</strong>
              <span>PoC</span>
              <strong>{(Number(event.collision_probability) * 100).toFixed(2)}%</strong>
              <span>Miss</span>
              <strong>{event.miss_distance} km</strong>
              <span>Vel</span>
              <strong>{event.relative_velocity} km/s</strong>
            </div>
          </button>
        ))}
      </section>

      <footer className="events-page__footer">
        <button onClick={() => navigate(`/events/${selectedEvent?.id ?? events[0]?.id ?? 1}`)}>View Selected Details</button>
      </footer>
    </div>
  );
};

export default EventsPage;