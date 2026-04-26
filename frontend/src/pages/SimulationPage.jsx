import { useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import useEventStore from '../store/eventStore';
import EarthScene from '../components/EarthScene';
import ExplanationPanel from '../components/ExplanationPanel';
import DecisionPanel from '../components/DecisionPanel';
import ChartsPanel from '../components/ChartsPanel';
import TopBar from '../components/TopBar';
import BurnControls from '../components/BurnControls';
import TelemetryPanel from '../components/TelemetryPanel';
import '../components/SimulatorDashboard.css';
import './pages.css';

const SimulationPage = () => {
  const { id } = useParams();
  const {
    events,
    selectedEvent,
    selectedDecision,
    eventTimelineData,
    loadEvents,
    selectEvent,
    tickSimulation
  } = useEventStore();

  useEffect(() => {
    if (!events.length) {
      loadEvents();
    }
  }, [events.length, loadEvents]);

  useEffect(() => {
    if (id) {
      selectEvent(Number(id));
    } else if (!selectedEvent && events[0]) {
      selectEvent(events[0].id);
    }
  }, [id, events, selectedEvent, selectEvent]);

  useEffect(() => {
    const interval = setInterval(() => tickSimulation(), 1000);
    return () => clearInterval(interval);
  }, [tickSimulation]);

  return (
    <div className="page-shell simulation-page page-shell--full">
      <header className="page-shell__header page-shell__header--compact">
        <div>
          <p className="page-shell__eyebrow">Simulation</p>
          <h1>Orbit Visualization and Maneuver Simulation</h1>
        </div>
        <div className="page-shell__actions">
          <Link to="/dashboard">Dashboard</Link>
          <Link to="/events">Events</Link>
        </div>
      </header>

      <div className="simulator-dashboard simulation-stage simulation-stage--routed">
        <div className="simulator-canvas-container">
          <EarthScene event={selectedEvent} />
        </div>

        <div id="scanGrid" className="scan-grid"></div>

        <div id="ui" className="simulator-ui">
          <TopBar
            timeScale={50}
            onTimeScaleChange={() => {}}
            paused={false}
            onPauseToggle={() => {}}
            showTrajectory={true}
            onTrajectoryToggle={() => {}}
            showApoPeri={true}
            onApoPeriToggle={() => {}}
          />

          <BurnControls
            onBurn={() => {}}
            currentOrbit="elliptical"
            onOrbitChange={() => {}}
          />

          <div id="centerTop" className="center-overlay">
            <ExplanationPanel
              event={{
                title: `EVENT ${selectedEvent?.id ?? id ?? ''}`,
                subtitle: selectedEvent ? `${selectedEvent.risk_level} risk · ${selectedEvent.tca_minutes} minutes to TCA` : 'Select an event to begin',
                description: 'Live orbit simulation updated from event state.',
                tags: selectedEvent ? [selectedEvent.risk_level, 'LIVE', 'SIMULATION'] : ['LIVE']
              }}
              scenario={selectedEvent}
            />
          </div>

          <TelemetryPanel
            telemetry={selectedEvent}
            cameraMode="free"
            onCameraChange={() => {}}
          />

          <ChartsPanel timelineData={eventTimelineData} />

          <DecisionPanel decision={selectedDecision} />
        </div>
      </div>
    </div>
  );
};

export default SimulationPage;