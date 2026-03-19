/**
 * Dashboard Page
 *
 * Main page combining all components for the satellite collision avoidance system.
 */

import { useState } from 'react';
import EventSelector from '../components/EventSelector';
import SimulationForm from '../components/SimulationForm';
import DecisionResult from '../components/DecisionResult';
import Charts from '../components/Charts';
import { getDecision } from '../services/api';

const Dashboard = () => {
  const [eventData, setEventData] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleEventLoad = (data) => {
    setEventData(data);
    setError(null);
    // Clear previous results when loading new event
    setResult(null);
  };

  const handleSubmit = async (formData, fuelAvailable) => {
    try {
      setLoading(true);
      setError(null);

      const decision = await getDecision(formData, fuelAvailable);
      setResult(decision);

      // Scroll to results
      setTimeout(() => {
        document.getElementById('results-section')?.scrollIntoView({
          behavior: 'smooth',
          block: 'start'
        });
      }, 100);

    } catch (err) {
      setError(err.message || 'Failed to get decision. Please try again.');
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleError = (errorMessage) => {
    setError(errorMessage);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-blue-950">
      {/* Stars background effect */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="stars"></div>
        <div className="stars2"></div>
        <div className="stars3"></div>
      </div>

      {/* Main Content */}
      <div className="relative z-10">
        {/* Header */}
        <header className="bg-gray-950/80 backdrop-blur-sm border-b border-cyan-500/20 shadow-lg shadow-cyan-500/10">
          <div className="container mx-auto px-4 py-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-400 flex items-center">
                  <svg className="w-8 h-8 mr-3 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                  Satellite Collision Avoidance AI System
                </h1>
                <p className="text-gray-400 mt-1">
                  AI-based decision system for optimal maneuver timing under uncertainty
                </p>
              </div>
              <a
                href="http://localhost:8000/docs"
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 bg-cyan-600/20 hover:bg-cyan-600/30 border border-cyan-500 text-cyan-300 rounded-lg transition-all duration-200 flex items-center"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                API Docs
              </a>
            </div>
          </div>
        </header>

        {/* Error Alert */}
        {error && (
          <div className="container mx-auto px-4 py-4">
            <div className="bg-red-950/50 border border-red-500 rounded-lg p-4 flex items-start">
              <svg className="w-6 h-6 text-red-400 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div className="flex-1">
                <h3 className="text-red-300 font-semibold mb-1">Error</h3>
                <p className="text-red-200 text-sm">{error}</p>
              </div>
              <button
                onClick={() => setError(null)}
                className="text-red-400 hover:text-red-300 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        )}

        {/* Main Grid */}
        <div className="container mx-auto px-4 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {/* Left Column: Event Selector */}
            <div>
              <EventSelector
                onEventLoad={handleEventLoad}
                onError={handleError}
              />
            </div>

            {/* Right Column: Simulation Form */}
            <div>
              <SimulationForm
                eventData={eventData}
                onSubmit={handleSubmit}
                loading={loading}
              />
            </div>
          </div>

          {/* Loading State */}
          {loading && (
            <div className="bg-gray-900/50 backdrop-blur-sm border border-cyan-500/30 rounded-lg p-12 text-center shadow-lg">
              <div className="flex flex-col items-center">
                <svg className="animate-spin h-16 w-16 text-cyan-400 mb-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <h3 className="text-xl font-semibold text-cyan-400 mb-2">Analyzing Conjunction Event</h3>
                <p className="text-gray-400">Running orbital simulation and decision analysis...</p>
                <div className="mt-6 space-y-2 text-sm text-gray-500">
                  <div className="flex items-center justify-center">
                    <div className="w-2 h-2 bg-cyan-400 rounded-full mr-2 animate-pulse"></div>
                    <span>Propagating orbital states</span>
                  </div>
                  <div className="flex items-center justify-center">
                    <div className="w-2 h-2 bg-cyan-400 rounded-full mr-2 animate-pulse" style={{ animationDelay: '0.2s' }}></div>
                    <span>Computing cost functions</span>
                  </div>
                  <div className="flex items-center justify-center">
                    <div className="w-2 h-2 bg-cyan-400 rounded-full mr-2 animate-pulse" style={{ animationDelay: '0.4s' }}></div>
                    <span>Evaluating safety constraints</span>
                  </div>
                  <div className="flex items-center justify-center">
                    <div className="w-2 h-2 bg-cyan-400 rounded-full mr-2 animate-pulse" style={{ animationDelay: '0.6s' }}></div>
                    <span>Performing causal analysis</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Results Section */}
          {result && !loading && (
            <div id="results-section" className="space-y-8">
              <DecisionResult result={result} />
              <Charts simulation={result.simulation} />
            </div>
          )}

          {/* Empty State */}
          {!result && !loading && (
            <div className="bg-gray-900/30 backdrop-blur-sm border border-cyan-500/20 rounded-lg p-12 text-center">
              <svg className="w-24 h-24 text-cyan-400/30 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
              <h3 className="text-xl font-semibold text-gray-400 mb-2">Ready to Analyze</h3>
              <p className="text-gray-500">Select an event or enter parameters to start the analysis</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <footer className="bg-gray-950/80 backdrop-blur-sm border-t border-cyan-500/20 mt-12">
          <div className="container mx-auto px-4 py-6 text-center text-gray-400 text-sm">
            <p>AI-Based Satellite Collision Avoidance Decision System | Capstone Project 2026</p>
            <p className="mt-2">
              <a href="http://localhost:8000/docs" target="_blank" rel="noopener noreferrer" className="text-cyan-400 hover:text-cyan-300 transition-colors">
                API Documentation
              </a>
              {' | '}
              <a href="https://github.com" target="_blank" rel="noopener noreferrer" className="text-cyan-400 hover:text-cyan-300 transition-colors">
                GitHub
              </a>
            </p>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default Dashboard;
