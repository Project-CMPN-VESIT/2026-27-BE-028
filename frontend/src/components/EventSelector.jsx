/**
 * EventSelector Component
 *
 * Allows selection of events from the dataset and loads event data.
 */

import { useState, useEffect } from 'react';
import { getEventList, getEventById } from '../services/api';

const EventSelector = ({ onEventLoad, onError }) => {
  const [events, setEvents] = useState([]);
  const [selectedEventId, setSelectedEventId] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingList, setLoadingList] = useState(true);

  // Load event list on component mount
  useEffect(() => {
    loadEventList();
  }, []);

  const loadEventList = async () => {
    try {
      setLoadingList(true);
      const eventIds = await getEventList();
      setEvents(eventIds);
    } catch (error) {
      onError?.('Failed to load event list: ' + error.message);
    } finally {
      setLoadingList(false);
    }
  };

  const handleLoadEvent = async () => {
    if (!selectedEventId) {
      onError?.('Please select an event');
      return;
    }

    try {
      setLoading(true);
      const eventData = await getEventById(parseInt(selectedEventId));
      onEventLoad(eventData);
    } catch (error) {
      onError?.('Failed to load event: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-gray-900/50 backdrop-blur-sm border border-cyan-500/30 rounded-lg p-6 shadow-lg shadow-cyan-500/10">
      <h2 className="text-xl font-bold text-cyan-400 mb-4 flex items-center">
        <svg className="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        </svg>
        Quick Event Selector
      </h2>

      <p className="text-gray-400 text-sm mb-4">
        Select a conjunction event from the dataset to analyze
      </p>

      <div className="space-y-4">
        {/* Event Dropdown */}
        <div>
          <label htmlFor="event-select" className="block text-sm font-medium text-cyan-300 mb-2">
            Event ID
          </label>
          <select
            id="event-select"
            value={selectedEventId}
            onChange={(e) => setSelectedEventId(e.target.value)}
            disabled={loadingList}
            className="w-full px-4 py-2 bg-gray-800 border border-cyan-500/30 rounded-lg text-gray-100
                     focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent
                     disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <option value="">-- Select Event --</option>
            {events.map((eventId) => (
              <option key={eventId} value={eventId}>
                Event {eventId}
              </option>
            ))}
          </select>
        </div>

        {/* Load Button */}
        <button
          onClick={handleLoadEvent}
          disabled={loading || !selectedEventId}
          className="w-full px-6 py-3 bg-gradient-to-r from-cyan-600 to-blue-600 text-white font-semibold rounded-lg
                   hover:from-cyan-500 hover:to-blue-500 focus:outline-none focus:ring-2 focus:ring-cyan-500
                   disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:from-cyan-600 disabled:hover:to-blue-600
                   transition-all duration-200 shadow-lg shadow-cyan-500/20 hover:shadow-cyan-500/40"
        >
          {loading ? (
            <span className="flex items-center justify-center">
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Loading Event...
            </span>
          ) : (
            'Load Event Data'
          )}
        </button>

        {/* Info */}
        <div className="text-xs text-gray-500 flex items-center">
          <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
          </svg>
          {events.length} events available in dataset
        </div>
      </div>
    </div>
  );
};

export default EventSelector;
