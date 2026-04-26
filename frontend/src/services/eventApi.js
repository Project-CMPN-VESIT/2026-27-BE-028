import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

const eventApi = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  },
  timeout: 30000
});

export const getEvents = async () => {
  const response = await eventApi.get('/events');
  return response.data;
};

export const getEventById = async (id) => {
  const response = await eventApi.get(`/events/${id}`);
  return response.data;
};

export const getDecisionOutput = async (eventId) => {
  const response = await eventApi.post(`/evaluate/${eventId}`);
  return response.data;
};

export default {
  getEvents,
  getEventById,
  getDecisionOutput
};