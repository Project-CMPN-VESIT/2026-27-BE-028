import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  applyBurnToOrbit,
  computeTelemetry,
  deriveOrbitalParams,
  ORBIT_META,
  ORBIT_PRESETS
} from '../services/orbitMath';
import { buildSeriesFromSequence, createInitialSeries } from '../services/chartSeries';
import { getPrediction, getSample } from '../services/api';

const toDisplayNumber = (value, digits = 2) => Number(value.toFixed(digits));
export function useSimulation() {
  const [orbitKey, setOrbitKey] = useState('elliptical');
  const [orbitParams, setOrbitParams] = useState(() => deriveOrbitalParams(ORBIT_PRESETS.elliptical));

  const [paused, setPaused] = useState(false);
  const [timeScale, setTimeScale] = useState(50);
  const [showTrajectory, setShowTrajectory] = useState(true);
  const [showApoPeri, setShowApoPeri] = useState(true);
  const [camMode, setCamMode] = useState('free');
  const [thrustPct, setThrustPct] = useState(50);
  const [syncAge, setSyncAge] = useState(0);

  const [fuelRemaining, setFuelRemaining] = useState(36);
  const [telemetry, setTelemetry] = useState(() => computeTelemetry(0, orbitParams));
  const [sequence, setSequence] = useState([]);
  const [currentStep, setCurrentStep] = useState(0);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [selectedScenario, setSelectedScenario] = useState('');
  const [scenarioInfo, setScenarioInfo] = useState(null);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [chartSeries, setChartSeries] = useState(() => createInitialSeries());

  const angleRef = useRef(0);

  const updateAngle = useCallback((angle) => {
    angleRef.current = angle;
  }, []);

  useEffect(() => {
    setSyncAge(0);
    setOrbitParams(deriveOrbitalParams(ORBIT_PRESETS[orbitKey]));
    setFuelRemaining(36);
  }, [orbitKey]);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      const nextTelemetry = computeTelemetry(angleRef.current, orbitParams);
      setTelemetry(nextTelemetry);
    }, 250);

    return () => window.clearInterval(intervalId);
  }, [orbitParams]);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      if (!paused) {
        setSyncAge((current) => current + 1);
      }
    }, 1000);

    return () => window.clearInterval(intervalId);
  }, [paused]);

  useEffect(() => {
    if (paused || sequence.length <= 1) {
      return undefined;
    }

    const intervalId = window.setInterval(() => {
      setCurrentStep((step) => Math.min(step + 1, sequence.length - 1));
    }, 1000);

    return () => window.clearInterval(intervalId);
  }, [paused, sequence]);

  useEffect(() => {
    setChartSeries(buildSeriesFromSequence(sequence, currentStep));
  }, [sequence, currentStep]);

  const loadScenario = useCallback(async () => {
    setLoading(true);
    setError('');
    setNotice('');
    setSelectedScenario('');
    try {
      const sample = await getSample();
      const nextSequence = Array.isArray(sample?.sequence) ? sample.sequence : [];
      const nextStep = Number(sample?.current_step ?? 0);

      if (!nextSequence.length) {
        throw new Error('Backend returned an empty scenario sequence.');
      }

      setSequence(nextSequence);
      setCurrentStep(nextStep);
      setResult(null);
      setScenarioInfo({
        matchedDecision: sample?.matched_decision ?? null,
        datasetDecision: sample?.dataset_decision ?? null,
        source: sample?.source ?? null
      });
      setSyncAge(0);
    } catch (apiError) {
      setError(apiError?.message || 'Failed to load scenario from backend.');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadScenarioByDecision = useCallback(async (targetDecision) => {
    setLoading(true);
    setError('');
    setNotice('');
    setSelectedScenario(targetDecision);
    setResult(null);

    try {
      const sample = await getSample(targetDecision);
      const nextSequence = Array.isArray(sample?.sequence) ? sample.sequence : [];
      const nextStep = Number(sample?.current_step ?? 0);

      if (!nextSequence.length) {
        throw new Error(`Backend returned an empty ${targetDecision} scenario.`);
      }

      const prediction = await getPrediction(nextSequence, nextStep);
      const decision = prediction?.final_recommendation?.decision;
      if (decision !== targetDecision) {
        setNotice(`Dataset label is ${targetDecision}, but current model prediction is ${decision ?? 'UNKNOWN'}.`);
      }

      setSequence(nextSequence);
      setCurrentStep(nextStep);
      setResult(prediction);
      setScenarioInfo({
        matchedDecision: sample?.matched_decision ?? targetDecision,
        datasetDecision: sample?.dataset_decision ?? targetDecision,
        source: sample?.source ?? null
      });
      setSyncAge(0);
    } catch (apiError) {
      setError(apiError?.message || `Failed to load ${targetDecision} scenario from backend.`);
    } finally {
      setLoading(false);
    }
  }, []);

  const runAI = useCallback(async () => {
    if (!sequence.length) {
      setError('Load a scenario before running AI.');
      return;
    }

    setLoading(true);
    setError('');
    setNotice('');
    try {
      const prediction = await getPrediction(sequence, currentStep);
      setResult(prediction);

      const currentSequenceRow = Array.isArray(sequence[currentStep]) ? sequence[currentStep] : null;
      const nextFuel = Number(currentSequenceRow?.[16]);
      if (Number.isFinite(nextFuel)) {
        setFuelRemaining(nextFuel);
      }
    } catch (apiError) {
      setError(apiError?.message || 'Failed to run backend prediction.');
    } finally {
      setLoading(false);
    }
  }, [currentStep, sequence]);

  const applyBurn = useCallback(
    (burnType) => {
      setOrbitParams((currentParams) => applyBurnToOrbit(currentParams, burnType, thrustPct));
      setFuelRemaining((currentFuel) => Math.max(8, toDisplayNumber(currentFuel - thrustPct * 0.04, 1)));
      setSyncAge(0);
    },
    [thrustPct]
  );

  const eventMeta = useMemo(() => ORBIT_META[orbitKey], [orbitKey]);

  return {
    controls: {
      paused,
      timeScale,
      showTrajectory,
      showApoPeri,
      camMode,
      thrustPct,
      orbitKey
    },
    setPaused,
    setTimeScale,
    setShowTrajectory,
    setShowApoPeri,
    setCamMode,
    setThrustPct,
    setOrbitKey,
    applyBurn,
    loadScenario,
    runAI,
    loadScenarioByDecision,
    updateAngle,
    syncAge,
    orbitParams,
    telemetry,
    sequence,
    currentStep,
    result,
    loading,
    selectedScenario,
    scenarioInfo,
    notice,
    error,
    chartSeries,
    eventMeta,
    fuelRemaining,
    hasScenario: sequence.length > 0
  };
}
