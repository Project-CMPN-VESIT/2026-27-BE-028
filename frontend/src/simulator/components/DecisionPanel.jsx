import styles from '../styles/DecisionPanel.module.css';

const modelLabels = {
  lstm: 'LSTM',
  tcn: 'TCN',
  xgboost: 'XGB'
};

const featureIndex = {
  deltaVRequired: 14,
  fuelRemaining: 15
};

const modelOrder = ['lstm', 'tcn', 'xgboost'];

const caseOrder = [
  { key: 'case1', label: 'Case 1 (Neural)' },
  { key: 'case2', label: 'Case 2 (Neuro-symbolic)' },
  { key: 'case3', label: 'Case 3 (Masked Safe)' }
];

function decisionTone(action) {
  if (action === 'COMMIT' || action === 1) {
    return styles.commit;
  }
  return styles.wait;
}

function decisionLabel(decision) {
  return Number(decision) === 1 ? 'COMMIT' : 'WAIT';
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
  const commit = Number(decision) === 1;
  const confidence = clamp01(probCommit);
  const expectedDeltaV = commit ? baseDeltaV : baseDeltaV * confidence;

  return {
    fuel: Math.max(0, baseFuel - expectedDeltaV),
    deltaV: expectedDeltaV,
    confidence
  };
}

function DecisionPanel({ result, sequence, currentStep, loading, scenarioInfo, notice, error }) {
  const timesteps = result?.sequence?.timesteps ?? [];
  const finalDecision = result?.final_recommendation?.decision;
  const confidence = Number(result?.final_recommendation?.confidence);
  const activeStep = timesteps[currentStep] ?? null;
  const activeSequenceRow = Array.isArray(sequence?.[currentStep]) ? sequence[currentStep] : [];
  const baseDeltaV = numberOrZero(result?.delta_v_forecast ?? activeSequenceRow[featureIndex.deltaVRequired]);
  const baseFuel = numberOrZero(activeSequenceRow[featureIndex.fuelRemaining]);
  const isInfeasible = activeStep?.feasibility_flag === 0;

  return (
    <section>
      <div className={styles.decisionBadge}>Backend Decision Output</div>

      {loading && <p className={styles.infoText}>Running model inference...</p>}
      {error && <p className={styles.errorText}>{error}</p>}
      {notice && <p className={styles.infoText}>{notice}</p>}

      {!loading && !result && <p className={styles.infoText}>Load WAIT or COMMIT scenario to view real backend output.</p>}

      {result && (
        <p className={styles.infoText}>
          Fuel here represents remaining delta-v budget from the dataset, not propellant mass in kg.
        </p>
      )}

      {result && (
        <div className={styles.finalCard}>
          <div className={styles.caseTitle}>Final Recommendation</div>
          <div className={styles.metricRow}>
            <span>Current Step</span>
            <span className={styles.cyan}>{currentStep}</span>
          </div>
          <div className={styles.metricRow}>
            <span>Decision</span>
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
              <span className={styles.cyan}>#{scenarioInfo.source.event_id} @ {scenarioInfo.source.start_index}</span>
            </div>
          )}
          <div className={styles.metricRow}>
            <span>Feasibility</span>
            <span className={isInfeasible ? styles.orange : styles.green}>{isInfeasible ? 'INFEASIBLE' : 'FEASIBLE'}</span>
          </div>
          {isInfeasible && <p className={styles.warningText}>Current scenario step is infeasible under symbolic constraints.</p>}
        </div>
      )}

      <div className={styles.matrixGrid}>
        {modelOrder.map((modelKey) => {
          const modelValue = activeStep?.models?.[modelKey] ?? {};
          const case1Decision = Number(modelValue?.case1?.decision ?? 0);
          const case3Decision = Number(modelValue?.case3?.decision ?? 0);
          const changedByMask = case1Decision !== case3Decision;
          const override = Boolean(modelValue?.case3?.override);

          return caseOrder.map((caseInfo) => {
            const caseData = modelValue?.[caseInfo.key] ?? {};
            const caseDecision = Number(caseData?.decision ?? 0);
            const probCommit = Number(caseData?.prob_commit ?? 0);
            const forecast = forecastFromDecision(caseDecision, probCommit, baseFuel, baseDeltaV);

            return (
              <article
                key={`${modelKey}-${caseInfo.key}`}
                className={`${styles.modelCard} ${override && caseInfo.key === 'case3' ? styles.overrideCard : ''} ${changedByMask && caseInfo.key === 'case3' ? styles.changedCard : ''}`}
              >
                <div className={styles.modelTitle}>{modelLabels[modelKey]} · {caseInfo.label}</div>
                <div className={styles.metricRow}>
                  <span>Decision</span>
                  <span className={`${styles.actionBadge} ${decisionTone(caseDecision)}`}>{decisionLabel(caseDecision)}</span>
                </div>
                <div className={styles.metricRow}>
                  <span>Commit Prob</span>
                  <span className={styles.cyan}>{formatMetric(forecast.confidence * 100, 1)}%</span>
                </div>
                <div className={styles.metricRow}>
                  <span>Forecast Delta-V</span>
                  <span className={styles.cyan}>{formatMetric(forecast.deltaV)} m/s</span>
                </div>
                <div className={styles.metricRow}>
                  <span>Remaining Fuel Budget</span>
                  <span className={styles.green}>{formatMetric(forecast.fuel)} m/s</span>
                </div>
                <div className={styles.metricRow}>
                  <span>Override</span>
                  <span className={override && caseInfo.key === 'case3' ? styles.red : styles.green}>
                    {override && caseInfo.key === 'case3' ? 'YES' : 'NO'}
                  </span>
                </div>
                {changedByMask && caseInfo.key === 'case3' && (
                  <p className={styles.warningText}>Case1 != Case3 (mask changed decision).</p>
                )}
              </article>
            );
          });
        })}
      </div>
    </section>
  );
}

export default DecisionPanel;
