import styles from '../styles/DecisionPanel.module.css';

const modelLabels = {
  lstm: 'LSTM',
  gru: 'GRU',
  tcn: 'TCN',
  transformer: 'Transformer',
  patchtst: 'PatchTST',
  xgboost: 'XGBoost'
};

const modelOrder = ['lstm', 'gru', 'tcn', 'transformer', 'patchtst', 'xgboost'];

const featureIndex = {
  deltaVRequired: 15,
  fuelRemaining: 16
};

function decisionTone(action) {
  if (action === 'FORCE_COMMIT') {
    return styles.force;
  }
  if (action === 'COMMIT' || action === 1) {
    return styles.commit;
  }
  return styles.wait;
}

function decisionLabel(decision) {
  return Number(decision) === 1 || decision === 'COMMIT' ? 'COMMIT' : 'WAIT';
}

function numberOrZero(value) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
}

function formatMetric(value, digits = 3) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return '--';
  }
  return numeric.toFixed(digits);
}

function clamp01(value) {
  return Math.min(1, Math.max(0, Number(value) || 0));
}

function forecastFromDecision(decision, probCommit, baseFuel, baseDeltaV) {
  const commit = Number(decision) === 1 || decision === 'COMMIT';
  const confidence = clamp01(probCommit);
  const expectedDeltaV = commit ? baseDeltaV : baseDeltaV * confidence;

  return {
    fuel: Math.max(0, baseFuel - expectedDeltaV),
    deltaV: expectedDeltaV,
    confidence
  };
}

function formatProbability(value) {
  return Number(value).toExponential(2);
}

function getReasoningText(finalDecision, isInfeasible, confidence) {
  const decisionText = finalDecision === 'COMMIT' || finalDecision === 'FORCE_COMMIT'
    ? 'Collision probability exceeds threshold as TCA approaches.'
    : 'Risk remains contained within the current maneuver window.';

  const feasibilityText = isInfeasible
    ? 'Physical feasibility is constrained; symbolic safety shield is active.'
    : 'Orbital parameters satisfy physical feasibility constraints.';

  const confidenceText = Number.isFinite(confidence)
    ? `Consensus confidence is ${Math.round(confidence * 100)}%.`
    : '';

  return `${decisionText} ${feasibilityText} ${confidenceText}`;
}

function buildScenarioTags(finalDecision, isInfeasible, scenarioInfo, notice) {
  const tags = [];

  if (finalDecision === 'COMMIT' || finalDecision === 'FORCE_COMMIT') {
    tags.push({ label: 'PoC Threshold Exceeded', tone: 'critical' });
    tags.push({ label: 'Maneuver Required', tone: 'warn' });
  } else {
    tags.push({ label: 'Monitor Trend', tone: 'ok' });
    tags.push({ label: 'Safe State', tone: 'ok' });
  }

  if (isInfeasible) {
    tags.push({ label: 'Symbolic Shield Active', tone: 'critical' });
  }

  if (scenarioInfo?.datasetDecision) {
    tags.push({ label: `Dataset: ${scenarioInfo.datasetDecision}`, tone: 'ok' });
  }

  return tags.slice(0, 4);
}

function DecisionPanel({ result, sequence, currentStep, loading, scenarioInfo, notice, error }) {
  const timesteps = result?.timesteps ?? result?.sequence?.timesteps ?? result?.timesteps_sequence?.timesteps ?? [];
  const finalDecision = result?.final_recommendation?.decision ?? result?.decision;
  const confidence = Number(result?.final_recommendation?.confidence ?? result?.confidence);
  const activeStep = timesteps[currentStep] ?? null;
  const activeSequenceRow = Array.isArray(sequence?.[currentStep]) ? sequence[currentStep] : [];
  const baseDeltaV = numberOrZero(result?.delta_v_forecast ?? activeSequenceRow[featureIndex.deltaVRequired] ?? 1.25);
  const baseFuel = numberOrZero(result?.fuel_remaining ?? activeSequenceRow[featureIndex.fuelRemaining] ?? 100.0);
  const isInfeasible = activeStep?.feasibility_flag === 0;

  const reasoningText = result ? getReasoningText(finalDecision, isInfeasible, confidence) : '';
  const tags = buildScenarioTags(finalDecision, isInfeasible, scenarioInfo, notice);
  const conclusionText = finalDecision === 'COMMIT' || finalDecision === 'FORCE_COMMIT'
    ? 'Optimal strategy: COMMIT to maneuver before window expires.'
    : 'Optimal strategy: continue orbital observation and hold state.';
  const executionWindowText = isInfeasible ? '12 minutes' : '24 minutes';

  return (
    <section>
      <div className={styles.decisionBadge}>Decision Reasoning</div>

      {loading && <p className={styles.infoText}>Running 6-model inference...</p>}
      {error && <p className={styles.errorText}>{error}</p>}
      {notice && <p className={styles.infoText}>{notice}</p>}

      {!loading && !result && <p className={styles.infoText}>Load WAIT or COMMIT scenario to view real 6-model outputs.</p>}

      {result && (
        <div className={styles.finalCard}>
          <div className={styles.caseTitle}>Ensemble Recommendation</div>
          <div className={styles.metricRow}>
            <span>Timestep</span>
            <span className={styles.cyan}>t={currentStep}</span>
          </div>
          <div className={styles.metricRow}>
            <span>Final Decision</span>
            <span className={`${styles.actionBadge} ${decisionTone(finalDecision)}`}>{finalDecision}</span>
          </div>
          <div className={styles.metricRow}>
            <span>Dataset Label</span>
            <span className={`${styles.actionBadge} ${decisionTone(scenarioInfo?.datasetDecision)}`}>
              {scenarioInfo?.datasetDecision ?? '--'}
            </span>
          </div>
          <div className={styles.metricRow}>
            <span>Confidence</span>
            <span className={styles.green}>{Number.isFinite(confidence) ? `${(confidence * 100).toFixed(1)}%` : '--'}</span>
          </div>
          {scenarioInfo?.source?.event_id != null && (
            <div className={styles.metricRow}>
              <span>Dataset Event</span>
              <span className={styles.cyan}>#{scenarioInfo.source.event_id}</span>
            </div>
          )}
          <div className={styles.metricRow}>
            <span>Feasibility</span>
            <span className={isInfeasible ? styles.orange : styles.green}>{isInfeasible ? 'INFEASIBLE' : 'FEASIBLE'}</span>
          </div>
          {isInfeasible && <p className={styles.warningText}>Current step is infeasible; symbolic safety shield protects state.</p>}
        </div>
      )}

      {result && <p className={styles.reasoning}>{reasoningText}</p>}

      {result && (
        <>
          <div className={styles.caseTitle}>AI Conclusion</div>
          <p className={styles.reasoning}>
            {conclusionText} Estimated ΔV: {formatMetric(baseDeltaV)} m/s. Execution window: {executionWindowText}.
          </p>
          <div className={styles.tagRow}>
            {tags.map((tag) => (
              <div key={tag.label} className={`${styles.tag} ${styles[tag.tone]}`}>
                {tag.label}
              </div>
            ))}
          </div>
        </>
      )}

      {/* 6-MODEL REAL TIME OUTPUT MATRIX */}
      <div className={styles.caseTitle} style={{ marginTop: '16px', marginBottom: '8px' }}>
        6-Model Decision Matrix (Step {currentStep})
      </div>

      <div className={styles.matrixGrid}>
        {modelOrder.map((modelKey) => {
          const modelStep = activeStep?.models?.[modelKey] ?? {};
          const rawPred = modelStep?.raw ?? 'WAIT';
          const finalPred = modelStep?.final ?? decisionLabel(modelStep?.decision ?? 0);
          const probCommit = Number(modelStep?.prob_commit ?? 0);
          const isOverridden = Boolean(modelStep?.override);
          const overrideReason = modelStep?.reason ?? '';
          const forecast = forecastFromDecision(finalPred, probCommit, baseFuel, baseDeltaV);

          return (
            <article
              key={modelKey}
              className={`${styles.modelCard} ${isOverridden ? styles.overrideCard : ''}`}
            >
              <div className={styles.modelTitle}>
                {modelLabels[modelKey]}
                <span className={isOverridden ? styles.red : styles.cyan} style={{ float: 'right', fontSize: '10px' }}>
                  {isOverridden ? 'SHIELDED' : 'CLEAN'}
                </span>
              </div>

              <div className={styles.metricRow}>
                <span>Raw Model</span>
                <span className={rawPred === 'COMMIT' ? styles.orange : styles.cyan}>
                  {rawPred}
                </span>
              </div>

              <div className={styles.metricRow}>
                <span>P(Commit)</span>
                <span className={styles.cyan}>{(probCommit * 100).toFixed(1)}%</span>
              </div>

              <div className={styles.metricRow}>
                <span>Final Decision</span>
                <span className={`${styles.actionBadge} ${decisionTone(finalPred)}`}>
                  {finalPred}
                </span>
              </div>

              <div className={styles.metricRow}>
                <span>Delta-V</span>
                <span className={styles.cyan}>{formatMetric(forecast.deltaV)} m/s</span>
              </div>

              {isOverridden && (
                <p className={styles.warningText} style={{ marginTop: '4px', fontSize: '10px' }}>
                  Shield: {overrideReason}
                </p>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
}

export default DecisionPanel;
