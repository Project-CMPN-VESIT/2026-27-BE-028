/**
 * API Service for Satellite Collision Avoidance System
 *
 * Handles all communication with the FastAPI backend.
 */

import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000, // 30 seconds
});

/**
 * Get list of all available event IDs from dataset
 * @returns {Promise<number[]>} Array of event IDs
 */
export const getEventList = async () => {
  try {
    const response = await api.get('/events');
    return response.data;
  } catch (error) {
    console.error('Error fetching event list:', error);
    throw error;
  }
};

/**
 * Get specific event by ID from dataset
 * @param {number} eventId - Event ID to fetch
 * @returns {Promise<object>} Event data
 */
export const getEventById = async (eventId) => {
  try {
    const response = await api.get(`/events/${eventId}`);
    return response.data;
  } catch (error) {
    console.error(`Error fetching event ${eventId}:`, error);
    throw error;
  }
};

/**
 * Make collision avoidance decision for an event
 * @param {object} eventData - Complete event data with parameters
 * @param {number} fuelAvailable - Available fuel in m/s (optional)
 * @returns {Promise<object>} Decision analysis results
 */
export const getDecision = async (eventData, fuelAvailable = 50.0) => {
  try {
    const payload = {
      event: eventData,
      fuel_available: fuelAvailable,
    };

    const response = await api.post('/decision', payload);
    return response.data;
  } catch (error) {
    console.error('Error getting decision:', error);
    if (error.response) {
      // Server responded with error
      throw new Error(error.response.data.detail || 'Failed to get decision');
    } else if (error.request) {
      // Request made but no response
      throw new Error('No response from server. Is the backend running?');
    } else {
      // Something else went wrong
      throw new Error('Failed to make request');
    }
  }
};

/**
 * Evaluate event from dataset by ID
 * @param {number} eventId - Event ID
 * @param {number} fuelAvailable - Available fuel in m/s
 * @returns {Promise<object>} Decision analysis results
 */
export const evaluateEvent = async (eventId, fuelAvailable = 50.0) => {
  try {
    const response = await api.post(`/evaluate/${eventId}`, null, {
      params: { fuel_available: fuelAvailable }
    });
    return response.data;
  } catch (error) {
    console.error(`Error evaluating event ${eventId}:`, error);
    throw error;
  }
};

/**
 * Get dataset statistics
 * @returns {Promise<object>} Dataset statistics
 */
export const getDatasetStats = async () => {
  try {
    const response = await api.get('/dataset/stats');
    return response.data;
  } catch (error) {
    console.error('Error fetching dataset stats:', error);
    throw error;
  }
};

/**
 * Health check endpoint
 * @returns {Promise<object>} Health status
 */
export const healthCheck = async () => {
  try {
    const response = await api.get('/health');
    return response.data;
  } catch (error) {
    console.error('Health check failed:', error);
    throw error;
  }
};

export default {
  getEventList,
  getEventById,
  getDecision,
  evaluateEvent,
  getDatasetStats,
  healthCheck,
};
