import axios from 'axios';

const stripTrailingSlash = (value) => String(value ?? '').replace(/\/$/, '');

const resolveBackendBaseUrl = () => {
  const explicitSimulatorUrl = import.meta.env.VITE_SIMULATOR_API_URL;
  if (explicitSimulatorUrl) {
    return stripTrailingSlash(explicitSimulatorUrl.replace(/\/api\/?$/, ''));
  }

  const sharedApiUrl = import.meta.env.VITE_API_URL;
  if (sharedApiUrl) {
    return stripTrailingSlash(sharedApiUrl.replace(/\/api\/?$/, ''));
  }

  return 'http://localhost:8000';
};

const INFERENCE_BASE_URL = resolveBackendBaseUrl();

const inferenceApi = axios.create({
  baseURL: INFERENCE_BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  },
  timeout: 30000
});

export async function getSample(decision) {
  const params = decision ? { decision } : undefined;
  const response = await inferenceApi.get('/sample', { params });
  return response.data;
}

export async function getPrediction(sequence, currentStep) {
  const response = await inferenceApi.post('/predict', {
    sequence,
    current_step: currentStep
  });
  return response.data;
}

export default {
  getSample,
  getPrediction
};
