"""
Example: Using the Satellite Collision Avoidance AI System API

This script demonstrates how to interact with the API programmatically.
"""

import requests
import json
from typing import Dict, Any


# Configuration
API_BASE_URL = "http://localhost:8000/api"


def get_dataset_stats() -> Dict[str, Any]:
    """Get summary statistics for the dataset."""
    response = requests.get(f"{API_BASE_URL}/dataset/stats")
    response.raise_for_status()
    return response.json()


def list_events() -> list:
    """Get list of all available event IDs."""
    response = requests.get(f"{API_BASE_URL}/events")
    response.raise_for_status()
    return response.json()


def get_event(event_id: int) -> Dict[str, Any]:
    """Get a specific event from the dataset."""
    response = requests.get(f"{API_BASE_URL}/events/{event_id}")
    response.raise_for_status()
    return response.json()


def evaluate_event(event_id: int, fuel_available: float = 50.0) -> Dict[str, Any]:
    """
    Evaluate a specific event from the dataset.

    Args:
        event_id: Event identifier
        fuel_available: Available fuel for maneuver (m/s)

    Returns:
        Complete decision analysis
    """
    url = f"{API_BASE_URL}/evaluate/{event_id}"
    params = {"fuel_available": fuel_available}

    response = requests.post(url, params=params)
    response.raise_for_status()
    return response.json()


def make_decision_custom(event_data: Dict[str, Any], fuel_available: float = 50.0) -> Dict[str, Any]:
    """
    Make decision for custom event data.

    Args:
        event_data: Event parameters as dictionary
        fuel_available: Available fuel (m/s)

    Returns:
        Complete decision analysis
    """
    request_data = {
        "event": event_data,
        "fuel_available": fuel_available
    }

    response = requests.post(
        f"{API_BASE_URL}/decision",
        json=request_data
    )
    response.raise_for_status()
    return response.json()


def print_decision_summary(result: Dict[str, Any]):
    """Print a formatted summary of the decision."""
    print("=" * 80)
    print("COLLISION AVOIDANCE DECISION ANALYSIS")
    print("=" * 80)

    print(f"\nEvent ID: {result['event_id']}")
    print(f"Primary Object: {result['primary_object_id']}")
    print(f"Secondary Object: {result['secondary_object_id']}")
    print(f"Observation Time: {result['observation_time']}")
    print(f"Time to TCA: {result['time_to_tca']:.2f} hours")

    print(f"\n{'DECISION':^80}")
    print(f"{'=' * 80}")
    print(f"Recommendation: {result['decision']}")
    print(f"Confidence: {result['confidence'] * 100:.1f}%")
    print(f"\nExplanation:")
    print(f"  {result['explanation']}")

    print(f"\n{'COST ANALYSIS':^80}")
    print(f"{'=' * 80}")
    costs = result['costs']
    print(f"Cost to Act Now:  {costs['total_act_cost']:>10.2f}")
    print(f"Cost to Wait:     {costs['total_wait_cost']:>10.2f}")
    print(f"Difference:       {costs['cost_difference']:>10.2f}")
    print(f"  (Positive = Should Act, Negative = Should Wait)")

    print(f"\n{'RISK METRICS':^80}")
    print(f"{'=' * 80}")
    print(f"Collision Probability: {result['probability_of_collision']:.2e}")
    print(f"Miss Distance: {result['miss_distance']:.2f} m")
    print(f"Risk Level: {result['safety']['risk_level']}")

    print(f"\n{'FEASIBILITY':^80}")
    print(f"{'=' * 80}")
    feas = result['feasibility']
    print(f"Current Delta-V Required: {feas['current_delta_v']:.3f} m/s")
    print(f"Fuel Available: {feas['fuel_available']:.3f} m/s")
    print(f"Feasibility Index: {feas['feasibility_index']:.2f} (0-1)")
    if feas['time_to_no_return']:
        print(f"Time to No-Return: {feas['time_to_no_return']:.1f} hours")

    print(f"\n{'UNCERTAINTY':^80}")
    print(f"{'=' * 80}")
    unc = result['uncertainty']
    print(f"Current Uncertainty: {unc['current_uncertainty']:.2f}")
    print(f"Projected Uncertainty: {unc['projected_uncertainty']:.2f}")
    print(f"Position Uncertainty (3σ): {unc['position_uncertainty']:.2f} m")

    print(f"\n{'SAFETY ASSESSMENT':^80}")
    print(f"{'=' * 80}")
    safety = result['safety']
    print(f"Critical Risk: {safety['is_critical_risk']}")
    print(f"Time Critical: {safety['is_time_critical']}")
    print(f"No Return Point: {safety['no_return_point_reached']}")
    print(f"Force Action Required: {safety['force_action_required']}")

    if safety['safety_violations']:
        print(f"\nSafety Violations:")
        for violation in safety['safety_violations']:
            print(f"  ⚠ {violation}")

    print(f"\n{'CAUSAL ANALYSIS':^80}")
    print(f"{'=' * 80}")
    causal = result['causal_analysis']
    print(f"Risk Delta: {causal['risk_delta']:.2f}%")
    print(f"Fuel Delta: {causal['fuel_delta']:.3f} m/s")
    print(f"\n{causal['explanation_text']}")

    print("\n" + "=" * 80)


# ==============================================================================
# EXAMPLE USAGE
# ==============================================================================

def example_1_evaluate_dataset_event():
    """Example 1: Evaluate an event from the dataset."""
    print("\n" + "=" * 80)
    print("EXAMPLE 1: Evaluate Event from Dataset")
    print("=" * 80)

    # Get dataset statistics
    print("\nDataset Statistics:")
    stats = get_dataset_stats()
    print(f"  Total Observations: {stats['total_observations']}")
    print(f"  Unique Events: {stats['unique_events']}")

    # List events
    events = list_events()
    print(f"\nAvailable Events: {events[:5]}... (showing first 5)")

    # Evaluate first event
    event_id = 1
    print(f"\nEvaluating Event {event_id}...")
    result = evaluate_event(event_id, fuel_available=50.0)

    print_decision_summary(result)


def example_2_custom_event():
    """Example 2: Evaluate a custom event."""
    print("\n" + "=" * 80)
    print("EXAMPLE 2: Evaluate Custom Event")
    print("=" * 80)

    # Define custom event
    custom_event = {
        "event_id": 999,
        "primary_object_id": 12345,
        "secondary_object_id": 67890,
        "observation_time": "2026-03-20 10:00",
        "time_to_tca": 12.0,  # 12 hours until TCA
        "relative_position": {
            "x": 500.0,
            "y": -300.0,
            "z": 200.0
        },
        "relative_velocity": 11.5,
        "miss_distance": 800.0,  # 800m miss distance
        "covariance": {
            "x": 50.0,
            "y": 50.0,
            "z": 50.0
        },
        "probability_of_collision": 0.0001,  # 1e-4 (critical!)
        "hard_body_radius": 10.0,
        "delta_v_required": 0.05
    }

    print("\nCustom Event Parameters:")
    print(json.dumps(custom_event, indent=2))

    print("\nMaking decision...")
    result = make_decision_custom(custom_event, fuel_available=50.0)

    print_decision_summary(result)


def example_3_batch_analysis():
    """Example 3: Batch analyze multiple events."""
    print("\n" + "=" * 80)
    print("EXAMPLE 3: Batch Analysis")
    print("=" * 80)

    event_ids = [1, 2, 3]  # Analyze first 3 events
    results = []

    print(f"\nAnalyzing {len(event_ids)} events...\n")

    for event_id in event_ids:
        result = evaluate_event(event_id)
        results.append(result)

        print(f"Event {event_id}: {result['decision']} "
              f"(Confidence: {result['confidence']*100:.1f}%, "
              f"Pc: {result['probability_of_collision']:.2e})")

    # Summary
    print(f"\n{'SUMMARY':^80}")
    print("=" * 80)
    decisions = [r['decision'] for r in results]
    print(f"WAIT: {decisions.count('WAIT')}")
    print(f"COMMIT: {decisions.count('COMMIT')}")
    print(f"FORCE_COMMIT: {decisions.count('FORCE_COMMIT')}")

    avg_confidence = sum(r['confidence'] for r in results) / len(results)
    print(f"\nAverage Confidence: {avg_confidence * 100:.1f}%")


if __name__ == "__main__":
    print("\nSatellite Collision Avoidance AI System - API Examples")
    print("=" * 80)
    print("\nMake sure the backend server is running:")
    print("  cd backend")
    print("  python main.py")
    print("\n" + "=" * 80)

    try:
        # Run examples
        example_1_evaluate_dataset_event()

        input("\nPress Enter to continue to Example 2...")
        example_2_custom_event()

        input("\nPress Enter to continue to Example 3...")
        example_3_batch_analysis()

        print("\n" + "=" * 80)
        print("Examples completed successfully!")
        print("=" * 80)

    except requests.exceptions.ConnectionError:
        print("\n❌ ERROR: Cannot connect to API server.")
        print("Please make sure the backend is running:")
        print("  cd backend")
        print("  python main.py")

    except Exception as e:
        print(f"\n❌ ERROR: {e}")
        import traceback
        traceback.print_exc()
