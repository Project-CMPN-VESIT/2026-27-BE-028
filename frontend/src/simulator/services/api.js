import axios from 'axios';

const INFERENCE_BASE_URL = import.meta.env.VITE_INFERENCE_API_URL || 'http://127.0.0.1:8000';

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
