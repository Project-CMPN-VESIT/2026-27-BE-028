export const EARTH_RADIUS_KM = 6371;
export const GRAVITATIONAL_PARAMETER = 398600;

export const ORBIT_PRESETS = {
  iss: { a: 6771, ecc: 0.001, incl: 52, raan: 0 },
  elliptical: { a: 19913, ecc: 0.331, incl: 90, raan: 90 },
  molniya: { a: 26535, ecc: 0.703, incl: 63, raan: 85 },
  geo: { a: 42164, ecc: 0.0001, incl: 0, raan: 0 },
  custom: { a: 24642, ecc: 0.541, incl: 91, raan: 88 }
};

export const ORBIT_META = {
  iss: {
    title: 'Satellite Maneuver Simulator',
    subtitle: 'ISS · LEO · 52° INCLINATION'
  },
  elliptical: {
    title: 'Elliptical Orbit',
    subtitle: 'ELLIPTICAL · 90° INCLINATION'
  },
  molniya: {
    title: 'TLE-Based Satellite Insertion',
    subtitle: 'MOLNIYA · 63° INCLINATION'
  },
  geo: {
    title: 'GEO Transfer',
    subtitle: 'GEO · GEOSTATIONARY'
  },
  custom: {
    title: 'Custom Satellite Placement',
    subtitle: 'EARLY MANEUVER NODE PROTOTYPE'
  }
};

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const toRadians = (degrees) => (degrees * Math.PI) / 180;

export function deriveOrbitalParams(params) {
  const periAltitude = Math.max(180, Math.round(params.a * (1 - params.ecc) - EARTH_RADIUS_KM));
  const apoAltitude = Math.max(periAltitude, Math.round(params.a * (1 + params.ecc) - EARTH_RADIUS_KM));
  const period = 2 * Math.PI * Math.sqrt(Math.pow(params.a, 3) / GRAVITATIONAL_PARAMETER);

  return {
    ...params,
    period,
    peri: periAltitude,
    apo: apoAltitude
  };
}

export function getSatellitePosition(angle, params) {
  const nu = angle;
  const radius = (params.a * (1 - params.ecc * params.ecc)) / (1 + params.ecc * Math.cos(nu));
  const x0 = radius * Math.cos(nu);
  const y0 = radius * Math.sin(nu);

  const inclination = toRadians(params.incl);
  const rightAscension = toRadians(params.raan);

  const x1 = x0;
  const y1 = y0 * Math.cos(inclination);
  const z1 = y0 * Math.sin(inclination);

  const x2 = x1 * Math.cos(rightAscension) - y1 * Math.sin(rightAscension);
  const y2 = x1 * Math.sin(rightAscension) + y1 * Math.cos(rightAscension);
  const z2 = z1;

  return { x: x2, y: z2, z: y2, radius };
}

export function getOrbitPoints(params, segments = 256) {
  const points = [];
  for (let i = 0; i <= segments; i += 1) {
    const angle = (i / segments) * Math.PI * 2;
    const { x, y, z } = getSatellitePosition(angle, params);
    points.push([x, y, z]);
  }
  return points;
}

export function computeTelemetry(angle, params) {
  const { radius } = getSatellitePosition(angle, params);
  const altitudeKm = Math.max(0, radius - EARTH_RADIUS_KM);
  const velocityMs = Math.sqrt(GRAVITATIONAL_PARAMETER * (2 / radius - 1 / params.a)) * 1000;

  const normalizedRisk = clamp((params.ecc * 1.5 + Math.abs(params.incl - 50) / 200 + altitudeKm / 55000) * 0.55, 0.01, 0.95);
  const poc = clamp(0.01 + normalizedRisk * 0.11, 0.005, 0.12);

  return {
    altitudeKm,
    velocityMs,
    periKm: params.peri,
    apoKm: params.apo,
    inclinationDeg: params.incl,
    semiMajorAxisKm: params.a,
    eccentricity: params.ecc,
    periodSec: params.period,
    raanDeg: params.raan,
    poc
  };
}

export function applyBurnToOrbit(currentParams, burnType, thrustPct) {
  const thrust = clamp(thrustPct / 100, 0, 1);
  const deltaV = thrust * 0.1;
  const next = { ...currentParams };

  if (burnType === 'prograde') {
    next.a = Math.min(42164, next.a + deltaV * 500);
  } else if (burnType === 'retrograde') {
    next.a = Math.max(EARTH_RADIUS_KM + 200, next.a - deltaV * 500);
  } else if (burnType === 'left' || burnType === 'right') {
    next.raan = (next.raan + (burnType === 'left' ? -deltaV * 5 : deltaV * 5) + 360) % 360;
  } else if (burnType === 'radial_out') {
    next.ecc = clamp(next.ecc + deltaV * 0.1, 0, 0.9);
  } else if (burnType === 'radial_in') {
    next.ecc = clamp(next.ecc - deltaV * 0.05, 0, 0.9);
  }

  return deriveOrbitalParams(next);
}
