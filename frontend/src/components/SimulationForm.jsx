/**
 * SimulationForm Component
 *
 * Form for inputting or editing satellite conjunction event parameters.
 */

import { useState, useEffect } from 'react';

const SimulationForm = ({ eventData, onSubmit, loading }) => {
  const [formData, setFormData] = useState({
    event_id: 1,
    primary_object_id: 40579,
    secondary_object_id: 37467,
    observation_time: '2025-01-27 11:53',
    time_to_tca: 70.22,
    relative_position: { x: 1561.41, y: -615.73, z: 458.82 },
    relative_velocity: 12.21,
    miss_distance: 1740.01,
    covariance: { x: 86.91, y: 79.84, z: 87.28 },
    probability_of_collision: 0.00002432,
    hard_body_radius: 8.59,
    delta_v_required: 0.027,
  });

  const [fuelAvailable, setFuelAvailable] = useState(50.0);

  // Update form when event data is loaded
  useEffect(() => {
    if (eventData) {
      setFormData(eventData);
    }
  }, [eventData]);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: parseFloat(value) || value }));
  };

  const handleNestedChange = (parent, field, value) => {
    setFormData(prev => ({
      ...prev,
      [parent]: { ...prev[parent], [field]: parseFloat(value) }
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData, fuelAvailable);
  };

  return (
    <div className="bg-gray-900/50 backdrop-blur-sm border border-cyan-500/30 rounded-lg p-6 shadow-lg shadow-cyan-500/10">
      <h2 className="text-xl font-bold text-cyan-400 mb-4 flex items-center">
        <svg className="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
        </svg>
        Event Parameters
      </h2>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Info */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-cyan-300 mb-2">Event ID</label>
            <input
              type="number"
              value={formData.event_id}
              onChange={(e) => handleInputChange('event_id', e.target.value)}
              className="w-full px-3 py-2 bg-gray-800 border border-cyan-500/30 rounded-lg text-gray-100 text-sm
                       focus:outline-none focus:ring-2 focus:ring-cyan-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-cyan-300 mb-2">Primary Object ID</label>
            <input
              type="number"
              value={formData.primary_object_id}
              onChange={(e) => handleInputChange('primary_object_id', e.target.value)}
              className="w-full px-3 py-2 bg-gray-800 border border-cyan-500/30 rounded-lg text-gray-100 text-sm
                       focus:outline-none focus:ring-2 focus:ring-cyan-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-cyan-300 mb-2">Secondary Object ID</label>
            <input
              type="number"
              value={formData.secondary_object_id}
              onChange={(e) => handleInputChange('secondary_object_id', e.target.value)}
              className="w-full px-3 py-2 bg-gray-800 border border-cyan-500/30 rounded-lg text-gray-100 text-sm
                       focus:outline-none focus:ring-2 focus:ring-cyan-500"
            />
          </div>
        </div>

        {/* Time Parameters */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-cyan-300 mb-2">Observation Time</label>
            <input
              type="text"
              value={formData.observation_time}
              onChange={(e) => handleInputChange('observation_time', e.target.value)}
              className="w-full px-3 py-2 bg-gray-800 border border-cyan-500/30 rounded-lg text-gray-100 text-sm
                       focus:outline-none focus:ring-2 focus:ring-cyan-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-cyan-300 mb-2">Time to TCA (hours)</label>
            <input
              type="number"
              step="0.01"
              value={formData.time_to_tca}
              onChange={(e) => handleInputChange('time_to_tca', e.target.value)}
              className="w-full px-3 py-2 bg-gray-800 border border-cyan-500/30 rounded-lg text-gray-100 text-sm
                       focus:outline-none focus:ring-2 focus:ring-cyan-500"
            />
          </div>
        </div>

        {/* Relative Position */}
        <div>
          <h3 className="text-md font-semibold text-cyan-300 mb-3">Relative Position (meters)</h3>
          <div className="grid grid-cols-3 gap-4">
            {['x', 'y', 'z'].map((axis) => (
              <div key={axis}>
                <label className="block text-sm font-medium text-gray-400 mb-2">{axis.toUpperCase()}</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.relative_position[axis]}
                  onChange={(e) => handleNestedChange('relative_position', axis, e.target.value)}
                  className="w-full px-3 py-2 bg-gray-800 border border-cyan-500/30 rounded-lg text-gray-100 text-sm
                           focus:outline-none focus:ring-2 focus:ring-cyan-500"
                />
              </div>
            ))}
          </div>
        </div>

        {/* Covariance */}
        <div>
          <h3 className="text-md font-semibold text-cyan-300 mb-3">Covariance Matrix (meters)</h3>
          <div className="grid grid-cols-3 gap-4">
            {['x', 'y', 'z'].map((axis) => (
              <div key={axis}>
                <label className="block text-sm font-medium text-gray-400 mb-2">{axis.toUpperCase()}</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.covariance[axis]}
                  onChange={(e) => handleNestedChange('covariance', axis, e.target.value)}
                  className="w-full px-3 py-2 bg-gray-800 border border-cyan-500/30 rounded-lg text-gray-100 text-sm
                           focus:outline-none focus:ring-2 focus:ring-cyan-500"
                />
              </div>
            ))}
          </div>
        </div>

        {/* Other Parameters */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-cyan-300 mb-2">Relative Velocity (km/s)</label>
            <input
              type="number"
              step="0.001"
              value={formData.relative_velocity}
              onChange={(e) => handleInputChange('relative_velocity', e.target.value)}
              className="w-full px-3 py-2 bg-gray-800 border border-cyan-500/30 rounded-lg text-gray-100 text-sm
                       focus:outline-none focus:ring-2 focus:ring-cyan-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-cyan-300 mb-2">Miss Distance (m)</label>
            <input
              type="number"
              step="0.01"
              value={formData.miss_distance}
              onChange={(e) => handleInputChange('miss_distance', e.target.value)}
              className="w-full px-3 py-2 bg-gray-800 border border-cyan-500/30 rounded-lg text-gray-100 text-sm
                       focus:outline-none focus:ring-2 focus:ring-cyan-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-cyan-300 mb-2">Collision Probability</label>
            <input
              type="number"
              step="0.000001"
              value={formData.probability_of_collision}
              onChange={(e) => handleInputChange('probability_of_collision', e.target.value)}
              className="w-full px-3 py-2 bg-gray-800 border border-cyan-500/30 rounded-lg text-gray-100 text-sm
                       focus:outline-none focus:ring-2 focus:ring-cyan-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-cyan-300 mb-2">Hard Body Radius (m)</label>
            <input
              type="number"
              step="0.01"
              value={formData.hard_body_radius}
              onChange={(e) => handleInputChange('hard_body_radius', e.target.value)}
              className="w-full px-3 py-2 bg-gray-800 border border-cyan-500/30 rounded-lg text-gray-100 text-sm
                       focus:outline-none focus:ring-2 focus:ring-cyan-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-cyan-300 mb-2">Delta-V Required (m/s)</label>
            <input
              type="number"
              step="0.001"
              value={formData.delta_v_required}
              onChange={(e) => handleInputChange('delta_v_required', e.target.value)}
              className="w-full px-3 py-2 bg-gray-800 border border-cyan-500/30 rounded-lg text-gray-100 text-sm
                       focus:outline-none focus:ring-2 focus:ring-cyan-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-cyan-300 mb-2">Available Fuel (m/s)</label>
            <input
              type="number"
              step="0.1"
              value={fuelAvailable}
              onChange={(e) => setFuelAvailable(parseFloat(e.target.value))}
              className="w-full px-3 py-2 bg-gray-800 border border-cyan-500/30 rounded-lg text-gray-100 text-sm
                       focus:outline-none focus:ring-2 focus:ring-cyan-500"
            />
          </div>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={loading}
          className="w-full px-6 py-4 bg-gradient-to-r from-cyan-600 to-blue-600 text-white font-bold rounded-lg text-lg
                   hover:from-cyan-500 hover:to-blue-500 focus:outline-none focus:ring-2 focus:ring-cyan-500
                   disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:from-cyan-600 disabled:hover:to-blue-600
                   transition-all duration-200 shadow-lg shadow-cyan-500/20 hover:shadow-cyan-500/40"
        >
          {loading ? (
            <span className="flex items-center justify-center">
              <svg className="animate-spin -ml-1 mr-3 h-6 w-6 text-white" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Analyzing Conjunction...
            </span>
          ) : (
            <span className="flex items-center justify-center">
              <svg className="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              Run Simulation & Make Decision
            </span>
          )}
        </button>
      </form>
    </div>
  );
};

export default SimulationForm;
