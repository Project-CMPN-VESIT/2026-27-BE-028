#!/usr/bin/env python3
"""
Simple test script for Satellite Collision Avoidance AI System API.

This script demonstrates how to use the system programmatically.
"""

import requests
import json
from pprint import pprint

# API base URL
API_URL = "http://localhost:8000/api"

def test_health_check():
    """Test health check endpoint"""
    print("\n🔍 Testing Health Check...")
    response = requests.get(f"{API_URL}/health")
    print(f"Status: {response.status_code}")
    pprint(response.json())

def test_dataset_stats():
    """Get dataset statistics"""
    print("\n📊 Getting Dataset Statistics...")
    response = requests.get(f"{API_URL}/dataset/stats")
    print(f"Status: {response.status_code}")
    data = response.json()
    print(f"Total Observations: {data['total_observations']}")
    print(f"Unique Events: {data['unique_events']}")
    print(f"Collision Probability - Mean: {data['pc_statistics']['mean']:.2e}, Max: {data['pc_statistics']['max']:.2e}")

def test_list_events():
    """List available events"""
    print("\n📋 Listing Available Events...")
    response = requests.get(f"{API_URL}/events")
    print(f"Status: {response.status_code}")
    events = response.json()
    print(f"Total events: {len(events)}")
    print(f"First 10 events: {events[:10]}")
    return events[0] if events else None

def test_get_event(event_id):
    """Get specific event details"""
    print(f"\n🎯 Getting Event {event_id}...")
    response = requests.get(f"{API_URL}/events/{event_id}")
    print(f"Status: {response.status_code}")
    event = response.json()
    print(f"Event ID: {event['event_id']}")
    print(f"Time to TCA: {event['time_to_tca']:.2f} hours")
    print(f"Collision Probability: {event['probability_of_collision']:.2e}")
    print(f"Delta-V Required: {event['delta_v_required']:.6f} m/s")

def test_evaluate_event(event_id):
    """Evaluate an event and get decision"""
    print(f"\n⚡ Evaluating Event {event_id}...")
    response = requests.post(
        f"{API_URL}/evaluate/{event_id}",
        params={"fuel_available": 50.0}
    )
    print(f"Status: {response.status_code}")

    if response.status_code != 200:
        print(f"Error: {response.json()}")
        return None

    result = response.json()

    # Print key results
    print(f"\n✅ Decision: {result['decision']}")
    print(f"Confidence: {result['confidence']*100:.1f}%")

    print(f"\n💼 Costs:")
    print(f"  Acting Cost: {result['costs']['total_act_cost']:.4f}")
    print(f"  Waiting Cost: {result['costs']['total_wait_cost']:.4f}")
    print(f"  Difference: {result['costs']['cost_difference']:.4f}")

    print(f"\n⚠️  Safety:")
    print(f"  Risk Level: {result['safety']['risk_level']}")
    print(f"  Force Action Required: {result['safety']['force_action_required']}")
    print(f"  Critical Risk: {result['safety']['is_critical_risk']}")
    print(f"  Time Critical: {result['safety']['is_time_critical']}")

    print(f"\n📈 Uncertainty:")
    print(f"  Current: {result['uncertainty']['current_uncertainty']:.4f}")
    print(f"  Projected: {result['uncertainty']['projected_uncertainty']:.4f}")

    print(f"\n🛰️  Feasibility:")
    print(f"  Current ΔV: {result['feasibility']['current_delta_v']:.6f} m/s")
    print(f"  Index: {result['feasibility']['feasibility_index']:.4f}")

    print(f"\n📝 Explanation:")
    print(f"  {result['explanation']}")

    print(f"\n🧠 Causal Analysis:")
    print(f"  {result['causal_analysis']['explanation_text']}")

    return result

def main():
    """Run all tests"""
    print("=" * 70)
    print("Satellite Collision Avoidance AI System - API Test Suite")
    print("=" * 70)

    try:
        # Test health
        test_health_check()

        # Get dataset stats
        test_dataset_stats()

        # List events
        event_id = test_list_events()

        if event_id is None:
            print("\n❌ No events available in dataset")
            return

        # Get event details
        test_get_event(event_id)

        # Evaluate event
        result = test_evaluate_event(event_id)

        if result:
            print("\n" + "=" * 70)
            print("✅ All tests completed successfully!")
            print("=" * 70)

    except requests.exceptions.ConnectionError:
        print("\n❌ Connection Error: Could not connect to API")
        print("   Make sure the backend is running:")
        print("   cd backend && python -m uvicorn app.main:app --reload")
    except Exception as e:
        print(f"\n❌ Error: {e}")

if __name__ == "__main__":
    main()
