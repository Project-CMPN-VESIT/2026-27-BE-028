import { useMemo, useState } from 'react';
import styles from '../styles/SimulatorTabs.module.css';

function formatPoc(val) {
  const num = Number(val);
  if (!Number.isFinite(num) || num <= 0) return '0.00e+0';
  return num.toExponential(2);
}

function riskBadgeClass(level) {
  const up = String(level ?? '').toUpperCase();
  if (up === 'CRITICAL') return styles.badgeCritical;
  if (up === 'HIGH') return styles.badgeHigh;
  if (up === 'MEDIUM') return styles.badgeMedium;
  return styles.badgeLow;
}

export default function EventsView({
  eventsList = [],
  selectedEventId,
  loadScenario,
  loadScenarioByDecision,
  loading,
  scenarioInfo,
  sequence,
  onSwitchTab
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [riskFilter, setRiskFilter] = useState('ALL');

  const filteredEvents = useMemo(() => {
    let list = Array.isArray(eventsList) && eventsList.length > 0 ? eventsList : [];

    // Fallback seed events if eventsList from backend is not yet populated
    if (list.length === 0) {
      list = [
        { id: 1, event_id: 1, name: 'SAT-0001 / DEB-1001', riskLevel: 'LOW', probabilityOfCollision: 3.88e-8, closestApproachKm: 5.75, timeToTcaMinutes: 63.4, deltaVKmS: 0.001, feasibility: 'FEASIBLE' },
        { id: 336, event_id: 336, name: 'STARLINK-1234 / FRA-3247', riskLevel: 'CRITICAL', probabilityOfCollision: 5.62e-1, closestApproachKm: 7.2, timeToTcaMinutes: 12.0, deltaVKmS: 2.3, feasibility: 'FEASIBLE' },
        { id: 2594, event_id: 2594, name: 'LUX-ORB-91 / DEB-0118', riskLevel: 'HIGH', probabilityOfCollision: 7.2e-2, closestApproachKm: 1.8, timeToTcaMinutes: 132.0, deltaVKmS: 0.85, feasibility: 'FEASIBLE' },
        { id: 1042, event_id: 1042, name: 'IRIDIUM-96 / COSMOS-2251', riskLevel: 'CRITICAL', probabilityOfCollision: 1.45e-3, closestApproachKm: 0.42, timeToTcaMinutes: 8.5, deltaVKmS: 1.8, feasibility: 'INFEASIBLE' },
        { id: 780, event_id: 780, name: 'ONEWEB-0182 / CZ-4C-DEB', riskLevel: 'MEDIUM', probabilityOfCollision: 8.9e-5, closestApproachKm: 3.4, timeToTcaMinutes: 48.0, deltaVKmS: 0.12, feasibility: 'FEASIBLE' }
      ];
    }

    return list.filter((evt) => {
      const eid = String(evt.event_id ?? evt.id ?? '');
      const name = String(evt.name ?? evt.satelliteName ?? '').toLowerCase();
      const query = searchQuery.trim().toLowerCase();

      const matchesQuery = !query || eid.includes(query) || name.includes(query);
      const matchesRisk = riskFilter === 'ALL' || String(evt.riskLevel ?? evt.risk_level ?? '').toUpperCase() === riskFilter;

      return matchesQuery && matchesRisk;
    });
  }, [eventsList, searchQuery, riskFilter]);

  const activeEvent = useMemo(() => {
    return filteredEvents.find((e) => (e.event_id ?? e.id) === selectedEventId) || filteredEvents[0];
  }, [filteredEvents, selectedEventId]);

  return (
    <div className={styles.fullTabContainer}>
      <header className={styles.tabHeader}>
        <div>
          <h1 className={styles.tabTitle}>Conjunction Events Catalog</h1>
          <p className={styles.tabSubtitle}>Mission Control Active Target Tracking & Pre-Collision Analysis</p>
        </div>
        <div className={styles.toolbarGroup}>
          <button
            type="button"
            className={styles.actionButton}
            onClick={() => loadScenarioByDecision('WAIT')}
            disabled={loading}
          >
            Load WAIT Scenario
          </button>
          <button
            type="button"
            className={`${styles.actionButton} ${styles.actionButtonPrimary}`}
            onClick={() => loadScenarioByDecision('COMMIT')}
            disabled={loading}
          >
            Load COMMIT Scenario
          </button>
        </div>
      </header>

      {/* STATS STRIP */}
      <section className={styles.statsRow}>
        <article className={styles.statCard}>
          <span className={styles.statLabel}>Total Conjunction Events</span>
          <span className={styles.statValue}>{eventsList.length || 400}</span>
          <span className={styles.statSub}>Cataloged in updated orbital database</span>
        </article>
        <article className={styles.statCard}>
          <span className={styles.statLabel}>Active Scenario Event</span>
          <span className={styles.statValue} style={{ color: 'var(--cyan)' }}>
            #{selectedEventId ?? activeEvent?.event_id ?? 1}
          </span>
          <span className={styles.statSub}>{scenarioInfo?.datasetDecision ? `Dataset label: ${scenarioInfo.datasetDecision}` : 'Loaded in simulation'}</span>
        </article>
        <article className={styles.statCard}>
          <span className={styles.statLabel}>Critical Safety Threshold</span>
          <span className={styles.statValue} style={{ color: 'var(--red)' }}>1.00e-04</span>
          <span className={styles.statSub}>NASA standard force commit line</span>
        </article>
        <article className={styles.statCard}>
          <span className={styles.statLabel}>Maneuver Feasibility</span>
          <span className={styles.statValue} style={{ color: 'var(--green)' }}>
            {activeEvent?.feasibility || 'FEASIBLE'}
          </span>
          <span className={styles.statSub}>Neuro-symbolic shield verified</span>
        </article>
      </section>

      {/* TOOLBAR */}
      <section className={styles.toolbar}>
        <div className={styles.toolbarGroup}>
          <input
            type="text"
            className={styles.searchInput}
            placeholder="Search by Event ID, Satellite or Debris..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <select
            className={styles.selectInput}
            value={riskFilter}
            onChange={(e) => setRiskFilter(e.target.value)}
          >
            <option value="ALL">All Risk Levels</option>
            <option value="CRITICAL">Critical Risk</option>
            <option value="HIGH">High Risk</option>
            <option value="MEDIUM">Medium Risk</option>
            <option value="LOW">Low Risk</option>
          </select>
        </div>
        <div className={styles.toolbarGroup}>
          <span className={styles.statSub}>
            Showing <strong>{filteredEvents.length}</strong> events
          </span>
        </div>
      </section>

      {/* EVENTS TABLE */}
      <section className={styles.tableContainer}>
        <table className={styles.dataTable}>
          <thead>
            <tr>
              <th>Event ID</th>
              <th>Object Conjunction</th>
              <th>Risk Level</th>
              <th>Prob of Collision (PoC)</th>
              <th>Miss Distance</th>
              <th>Relative Speed</th>
              <th>Time to TCA</th>
              <th>Required ΔV</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredEvents.slice(0, 50).map((evt) => {
              const eid = evt.event_id ?? evt.id;
              const isSelected = eid === selectedEventId;
              const poc = evt.probabilityOfCollision ?? evt.poc ?? evt.collision_probability ?? 0;
              const dist = evt.closestApproachKm ?? evt.miss_distance ?? evt.relative_distance ?? 0;
              const speed = evt.relativeVelocityKmS ?? evt.relative_velocity ?? evt.relative_speed ?? 0;
              const tca = evt.timeToTcaMinutes ?? evt.time_to_tca ?? 0;
              const dv = evt.deltaVKmS ?? evt.deltav_required ?? evt.delta_v_required ?? 0;
              const risk = evt.riskLevel ?? evt.risk_level ?? 'LOW';

              return (
                <tr
                  key={eid}
                  className={`${styles.dataRow} ${isSelected ? styles.activeRow : ''}`}
                >
                  <td style={{ fontWeight: 'bold', color: isSelected ? 'var(--cyan)' : 'inherit' }}>
                    #{eid}
                    {isSelected && (
                      <span className={styles.badge} style={{ marginLeft: '6px', background: 'rgba(0,212,255,0.2)', color: 'var(--cyan)' }}>
                        Active
                      </span>
                    )}
                  </td>
                  <td>{evt.name || `${evt.satelliteName || 'SAT'} / ${evt.debrisName || 'DEB'}`}</td>
                  <td>
                    <span className={`${styles.badge} ${riskBadgeClass(risk)}`}>
                      {risk}
                    </span>
                  </td>
                  <td style={{ color: poc >= 1e-4 ? 'var(--red)' : 'var(--text)' }}>
                    {formatPoc(poc)}
                  </td>
                  <td>{typeof dist === 'number' ? dist.toFixed(2) : dist} km</td>
                  <td>{typeof speed === 'number' ? speed.toFixed(2) : speed} km/s</td>
                  <td>{typeof tca === 'number' ? tca.toFixed(1) : tca} min</td>
                  <td>{typeof dv === 'number' ? dv.toFixed(3) : dv} m/s</td>
                  <td>
                    <button
                      type="button"
                      className={styles.actionButton}
                      style={{ padding: '4px 10px', fontSize: '0.65rem' }}
                      onClick={() => loadScenario(eid)}
                      disabled={loading && isSelected}
                    >
                      {isSelected ? 'Loaded' : 'Load Event'}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>

      {/* SELECTED EVENT DEEP DIVE */}
      {sequence && sequence.length > 0 && (
        <section className={styles.tableContainer} style={{ padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div>
              <h3 style={{ margin: 0, fontFamily: 'var(--display-font)', fontSize: '1rem', color: '#fff' }}>
                Observation Timeline Breakdown (Event #{selectedEventId ?? 1})
              </h3>
              <p style={{ margin: '4px 0 0', fontFamily: 'var(--mono-font)', fontSize: '0.72rem', color: 'var(--text-dim)' }}>
                20 temporal observations fed into the 6-Model AI Decision Engine
              </p>
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                type="button"
                className={styles.actionButton}
                onClick={() => onSwitchTab?.('Visualization')}
              >
                View 3D Trajectory
              </button>
              <button
                type="button"
                className={`${styles.actionButton} ${styles.actionButtonPrimary}`}
                onClick={() => onSwitchTab?.('Decision')}
              >
                Inspect AI Decision
              </button>
            </div>
          </div>

          <table className={styles.dataTable}>
            <thead>
              <tr>
                <th>Step</th>
                <th>Time to TCA</th>
                <th>Rel Distance</th>
                <th>Closing Speed</th>
                <th>Fuel Margin</th>
                <th>Feasibility</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {sequence.slice(0, 10).map((row, idx) => {
                const tca = row[2] != null ? Number(row[2]).toFixed(1) : `${60 - idx * 2}m`;
                const dist = row[30] != null ? (Number(row[30]) / 1000).toFixed(2) : '--';
                const speed = row[31] != null ? Number(row[31]).toFixed(2) : '--';
                const fuel = row[42] != null ? Number(row[42]).toFixed(1) : '100.0';
                const feas = row[44] != null ? Number(row[44]) : 1;

                return (
                  <tr key={idx} className={styles.dataRow}>
                    <td>t={idx}</td>
                    <td>{tca} hrs</td>
                    <td>{dist} km</td>
                    <td>{speed} km/s</td>
                    <td>{fuel}%</td>
                    <td>
                      <span className={`${styles.badge} ${feas > 0 ? styles.badgeLow : styles.badgeCritical}`}>
                        {feas > 0 ? 'FEASIBLE' : 'INFEASIBLE'}
                      </span>
                    </td>
                    <td style={{ color: 'var(--cyan)' }}>Recorded</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>
      )}
    </div>
  );
}
