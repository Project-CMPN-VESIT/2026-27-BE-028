const FEATURE_INDEX = {
  distance: 6,
  poc: 12,
  deltaV: 14,
  fuel: 15
};

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

export function createInitialSeries() {
  return {
    labels: [],
    poc: [],
    fuel: [],
    distance: [],
    activeIndex: 0
  };
}

export function buildSeriesFromSequence(sequence, currentStep = 0) {
  if (!Array.isArray(sequence) || sequence.length === 0) {
    return createInitialSeries();
  }

  const labels = sequence.map((_, index) => `t${index}`);
  const poc = sequence.map((row) => clamp(Number(row[FEATURE_INDEX.poc] ?? 0), 0, 1));
  const fuel = sequence.map((row) => Math.max(0, Number(row[FEATURE_INDEX.fuel] ?? 0)));
  const distance = sequence.map((row) => Math.max(0, Number(row[FEATURE_INDEX.distance] ?? 0)));

  return {
    labels,
    poc,
    fuel,
    distance,
    activeIndex: clamp(currentStep, 0, Math.max(0, sequence.length - 1))
  };
}
