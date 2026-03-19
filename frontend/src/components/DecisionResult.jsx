/**
 * DecisionResult Component
 *
 * Displays the AI decision analysis results with metrics and explanations.
 */

const DecisionResult = ({ result }) => {
  if (!result) return null;

  const getDecisionStyle = (decision) => {
    switch (decision) {
      case 'WAIT':
        return {
          bg: 'bg-gradient-to-r from-green-600 to-emerald-600',
          badge: 'bg-green-500/20 text-green-300 border-green-500',
        };
      case 'COMMIT':
        return {
          bg: 'bg-gradient-to-r from-orange-600 to-yellow-600',
          badge: 'bg-orange-500/20 text-orange-300 border-orange-500',
        };
      case 'FORCE_COMMIT':
        return {
          bg: 'bg-gradient-to-r from-red-600 to-pink-600',
          badge: 'bg-red-500/20 text-red-300 border-red-500',
        };
      default:
        return {
          bg: 'bg-gradient-to-r from-cyan-600 to-blue-600',
          badge: 'bg-cyan-500/20 text-cyan-300 border-cyan-500',
        };
    }
  };

  const style = getDecisionStyle(result.decision);

  return (
    <div className="space-y-6">
      {/* Decision Card */}
      <div className={`${style.bg} rounded-lg p-6 shadow-lg shadow-cyan-500/20 relative overflow-hidden`}>
        <div className="absolute top-4 right-4">
          <span className={`px-4 py-2 rounded-full text-sm font-bold border ${style.badge}`}>
            {result.decision}
          </span>
        </div>

        <h2 className="text-2xl font-bold text-white mb-2">AI Decision</h2>
        <p className="text-3xl font-bold text-white mb-4">{result.decision}</p>

        <div className="flex items-center mb-4">
          <span className="text-white font-semibold mr-2">Confidence:</span>
          <div className="flex-1 bg-white/20 rounded-full h-3 mr-4">
            <div
              className="bg-white h-3 rounded-full transition-all duration-500"
              style={{ width: `${result.confidence * 100}%` }}
            ></div>
          </div>
          <span className="text-white font-bold">{(result.confidence * 100).toFixed(1)}%</span>
        </div>

        <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
          <p className="text-white italic">{result.explanation}</p>
        </div>

        {result.recommended_action_time && (
          <div className="mt-4 text-white text-sm">
            ⏱ Recommended re-evaluation: <strong>{result.recommended_action_time.toFixed(1)} hours</strong>
          </div>
        )}
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Cost Analysis */}
        <div className="bg-gray-900/50 backdrop-blur-sm border border-cyan-500/30 rounded-lg p-5 shadow-lg">
          <h3 className="text-cyan-400 font-bold mb-3 flex items-center">
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Cost Analysis
          </h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-400">Act Cost:</span>
              <span className="text-white font-semibold">{result.costs.total_act_cost.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Wait Cost:</span>
              <span className="text-white font-semibold">{result.costs.total_wait_cost.toFixed(2)}</span>
            </div>
            <div className="flex justify-between border-t border-cyan-500/20 pt-2">
              <span className="text-cyan-300 font-semibold">Difference:</span>
              <span className={`font-bold ${result.costs.cost_difference > 0 ? 'text-orange-400' : 'text-green-400'}`}>
                {result.costs.cost_difference.toFixed(2)}
              </span>
            </div>
          </div>
        </div>

        {/* Risk Metrics */}
        <div className="bg-gray-900/50 backdrop-blur-sm border border-cyan-500/30 rounded-lg p-5 shadow-lg">
          <h3 className="text-cyan-400 font-bold mb-3 flex items-center">
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            Risk Assessment
          </h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-400">Pc:</span>
              <span className="text-white font-semibold">{result.probability_of_collision.toExponential(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Risk Level:</span>
              <span className={`font-bold ${
                result.safety.risk_level === 'CRITICAL' ? 'text-red-400' :
                result.safety.risk_level === 'HIGH' ? 'text-orange-400' :
                result.safety.risk_level === 'MEDIUM' ? 'text-yellow-400' :
                'text-green-400'
              }`}>
                {result.safety.risk_level}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Miss Distance:</span>
              <span className="text-white font-semibold">{result.miss_distance.toFixed(2)} m</span>
            </div>
          </div>
        </div>

        {/* Feasibility */}
        <div className="bg-gray-900/50 backdrop-blur-sm border border-cyan-500/30 rounded-lg p-5 shadow-lg">
          <h3 className="text-cyan-400 font-bold mb-3 flex items-center">
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Feasibility
          </h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-400">Current ΔV:</span>
              <span className="text-white font-semibold">{result.feasibility.current_delta_v.toFixed(3)} m/s</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Index:</span>
              <span className="text-white font-semibold">{result.feasibility.feasibility_index.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">No-Return:</span>
              <span className="text-white font-semibold">
                {result.feasibility.time_to_no_return ? `${result.feasibility.time_to_no_return.toFixed(1)}h` : 'N/A'}
              </span>
            </div>
          </div>
        </div>

        {/* Uncertainty */}
        <div className="bg-gray-900/50 backdrop-blur-sm border border-cyan-500/30 rounded-lg p-5 shadow-lg">
          <h3 className="text-cyan-400 font-bold mb-3 flex items-center">
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Uncertainty
          </h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-400">Current:</span>
              <span className="text-white font-semibold">{result.uncertainty.current_uncertainty.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Projected:</span>
              <span className="text-white font-semibold">{result.uncertainty.projected_uncertainty.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Position σ:</span>
              <span className="text-white font-semibold">{result.uncertainty.position_uncertainty.toFixed(2)} m</span>
            </div>
          </div>
        </div>
      </div>

      {/* Safety Assessment */}
      {(result.safety.force_action_required || result.safety.safety_violations?.length > 0) && (
        <div className="bg-red-950/30 border border-red-500/30 rounded-lg p-5 shadow-lg">
          <h3 className="text-red-400 font-bold mb-3 flex items-center">
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            Safety Assessment
          </h3>
          <div className="flex flex-wrap gap-2 mb-3">
            {result.safety.is_critical_risk && (
              <span className="px-3 py-1 bg-red-500/20 text-red-300 rounded-full text-xs font-semibold border border-red-500">
                ⚠ Critical Risk
              </span>
            )}
            {result.safety.is_time_critical && (
              <span className="px-3 py-1 bg-orange-500/20 text-orange-300 rounded-full text-xs font-semibold border border-orange-500">
                ⏱ Time Critical
              </span>
            )}
            {result.safety.no_return_point_reached && (
              <span className="px-3 py-1 bg-red-500/20 text-red-300 rounded-full text-xs font-semibold border border-red-500">
                🚨 No Return Point
              </span>
            )}
            {result.safety.force_action_required && (
              <span className="px-3 py-1 bg-red-500/20 text-red-300 rounded-full text-xs font-semibold border border-red-500">
                ⚡ Force Action Required
              </span>
            )}
          </div>
          {result.safety.safety_violations && result.safety.safety_violations.length > 0 && (
            <div className="bg-red-900/20 rounded p-3">
              <h4 className="text-red-300 font-semibold text-sm mb-2">Safety Violations:</h4>
              <ul className="list-disc list-inside text-red-200 text-sm space-y-1">
                {result.safety.safety_violations.map((violation, idx) => (
                  <li key={idx}>{violation}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Causal Analysis */}
      <div className="bg-blue-950/30 border border-blue-500/30 rounded-lg p-5 shadow-lg">
        <h3 className="text-blue-400 font-bold mb-3 flex items-center">
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
          Causal Analysis
        </h3>
        <p className="text-gray-300 text-sm mb-4">{result.causal_analysis.explanation_text}</p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-gray-900/50 rounded-lg p-4">
            <h4 className="text-cyan-300 font-semibold mb-2">Act Now Scenario</h4>
            <div className="space-y-1 text-sm text-gray-300">
              <div>Fuel: {result.causal_analysis.scenario_act_now.fuel_consumed.toFixed(3)} m/s</div>
              <div>Final Pc: {result.causal_analysis.scenario_act_now.final_pc.toExponential(2)}</div>
              <div>Feasibility: {result.causal_analysis.scenario_act_now.feasibility.toFixed(2)}</div>
            </div>
          </div>
          <div className="bg-gray-900/50 rounded-lg p-4">
            <h4 className="text-cyan-300 font-semibold mb-2">Wait Scenario</h4>
            <div className="space-y-1 text-sm text-gray-300">
              <div>Fuel: {result.causal_analysis.scenario_wait.fuel_consumed.toFixed(3)} m/s</div>
              <div>Final Pc: {result.causal_analysis.scenario_wait.final_pc.toExponential(2)}</div>
              <div>Feasibility: {result.causal_analysis.scenario_wait.feasibility.toFixed(2)}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DecisionResult;
