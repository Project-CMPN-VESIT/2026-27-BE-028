/**
 * ExplanationPanel Component
 * 
 * Floating overlay with current event and scenario information
 */

const ExplanationPanel = ({ event = null, scenario = null }) => {
  const defaultEvent = {
    title: 'CONJUNCTION EVENT DETECTED',
    subtitle: 'High-Risk Approach - 45 minutes to closest approach',
    description: 'Satellite conjunction with space debris detected. System recommends immediate burn maneuver.',
    tags: ['CRITICAL', 'IMMINENT']
  };

  const defaultScenario = {
    satellite: 'ISS (International Space Station)',
    threat: 'Debris Fragment',
    riskLevel: 'HIGH',
    timeToClose: '45 min'
  };

  const currentEvent = event || defaultEvent;
  const currentScenario = scenario || defaultScenario;
  const tcaMinutes = currentScenario.tca_minutes ?? currentScenario.timeToClose ?? 45;
  const collisionProbability = currentScenario.collision_probability ?? 0.034;
  const riskLevel = currentScenario.risk_level ?? currentScenario.riskLevel ?? 'HIGH';

  return (
    <>
      {/* Event Label (Floating in 3D view) */}
      <div id="eventLabel" className="event-label">
        <div className="event-title-big">{currentEvent.title}</div>
        <div className="event-subtitle">{currentEvent.subtitle}</div>
      </div>

      {/* Explanation Box */}
      <div id="explanationBox" className="explanation-box">
        <div className="explain-title">CURRENT EVENT</div>
        <div className="explain-text">
          {currentEvent.description}
        </div>

        {/* Scenario Information */}
        <div className="scenario-row">
          <div className="scenario-card">
            <div className="sc-label">ASSET</div>
            <div className="sc-item">{currentScenario.satellite}</div>
          </div>
          <div className="scenario-card">
            <div className="sc-label">THREAT</div>
            <div className="sc-item">{currentScenario.threat}</div>
          </div>
        </div>

        <div className="scenario-row">
          <div className="scenario-card">
            <div className="sc-label">RISK</div>
            <div className="sc-item">{riskLevel}</div>
          </div>
          <div className="scenario-card">
            <div className="sc-label">TIME TO CA</div>
            <div className="sc-item">{tcaMinutes} min</div>
          </div>
        </div>

        {/* Tags */}
        <div className="tag-row">
          {currentEvent.tags && currentEvent.tags.map((tag, idx) => {
            let tagClass = 'warn';
            if (tag === 'CRITICAL') tagClass = 'critical';
            if (tag === 'OK') tagClass = 'ok';
            return (
              <span key={idx} className={`tag ${tagClass}`}>
                {tag}
              </span>
            );
          })}
        </div>
        <div className="explain-text" style={{ marginTop: '10px' }}>
          Live PoC: <span className="explain-highlight">{(collisionProbability * 100).toFixed(2)}%</span>
        </div>
      </div>
    </>
  );
};

export default ExplanationPanel;
