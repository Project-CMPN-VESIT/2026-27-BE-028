import json
import networkx as nx
from typing import Dict, List, Any, Tuple

def build_satellite_causal_graph() -> nx.DiGraph:
    """
    Constructs an evidence-based Directed Acyclic Graph (DAG) for satellite collision avoidance.
    Edges are established strictly from physical orbital mechanics, covariance propagation,
    and the verified data-generating relationships.
    """
    G = nx.DiGraph()
    
    # 1. Orbital & Celestial Geometry -> Relative Kinematics
    G.add_edge("semi_major_axis", "relative_distance", reason="Orbital geometry defines encounter trajectory")
    G.add_edge("eccentricity", "relative_distance", reason="Orbital geometry defines encounter trajectory")
    G.add_edge("inclination", "relative_closing_rate", reason="Inclination difference determines encounter geometry")
    G.add_edge("relative_distance", "relative_closing_rate", reason="Kinematic rate of change")
    
    # 2. Tracking & Environmental Disturbance -> Covariance Magnitudes
    G.add_edge("measurement_noise", "combined_covariance_magnitude", reason="Sensor noise inflates positional uncertainty")
    G.add_edge("tracking_reliability_index", "combined_covariance_magnitude", reason="Tracking quality bounds covariance growth")
    G.add_edge("solar_activity", "combined_covariance_magnitude", reason="Atmospheric drag disturbance induces orbital error")
    G.add_edge("drag_level", "combined_covariance_magnitude", reason="Atmospheric drag disturbance induces orbital error")
    
    # 3. Covariance + Hard Body Radius + Relative Distance -> Probability of Collision (PoC)
    G.add_edge("combined_covariance_magnitude", "poc", reason="Foster / NASA 2D/3D collision integral over covariance ellipsoid")
    G.add_edge("relative_distance", "poc", reason="Distance to conjunction center directly scales collision probability")
    G.add_edge("hard_body_radius", "poc", reason="Combined hard-body sphere collision cross-section")
    
    # 4. Relative Kinematics + TCA -> Required Delta-V
    G.add_edge("relative_distance", "deltav_required", reason="Required impulsive delta-V scales with miss distance deficit")
    G.add_edge("relative_closing_rate", "deltav_required", reason="Encounter velocity dictates required orbital impulse")
    G.add_edge("time_to_TCA", "deltav_required", reason="Delta-V required scales inversely with lead time before TCA: delta_r = delta_v * delta_t")
    
    # 5. Delta-V Required + Propulsion Limits -> Feasibility & Fuel Margin
    G.add_edge("deltav_required", "feasibility_flag", reason="Hard physical law: feasibility_flag = 1 iff deltav_required <= max_delta_v")
    G.add_edge("max_delta_v", "feasibility_flag", reason="Spacecraft thruster velocity capacity limit")
    G.add_edge("deltav_required", "fuel_margin", reason="Fuel margin depletes with required delta-V")
    G.add_edge("fuel_remaining", "fuel_margin", reason="Available propellant mass bounds remaining margin")
    
    # 6. Timing & Windows -> Maneuver Window Remaining
    G.add_edge("time_to_TCA", "maneuver_window_remaining", reason="Maneuver window strictly bounded by time remaining to TCA")
    
    # 7. PoC + Risk + Costs -> Decision Utilities
    G.add_edge("poc", "cost_of_waiting", reason="Risk cost of waiting is a monotonic function of collision probability")
    G.add_edge("time_to_TCA", "cost_of_waiting", reason="Waiting cost increases as decision horizon shrinks")
    G.add_edge("deltav_required", "cost_of_acting", reason="Act cost scales with fuel depletion and propellant expenditure")
    
    # 8. Feasibility + Utility Costs -> Supervised Commit Decision
    G.add_edge("cost_of_waiting", "commit_decision", reason="Commit triggered when waiting risk exceeds maneuver cost")
    G.add_edge("cost_of_acting", "commit_decision", reason="Commit triggered when waiting risk exceeds maneuver cost")
    G.add_edge("feasibility_flag", "commit_decision", reason="Hard constraint: Infeasible state forces WAIT")

    return G

def export_causal_graph(G: nx.DiGraph, output_prefix: str = "research_artifacts/causal/causal_graph"):
    # 1. Export JSON
    data = {
        "nodes": list(G.nodes()),
        "edges": [{"source": u, "target": v, "justification": d.get("reason", "")} for u, v, d in G.edges(data=True)],
        "is_dag": nx.is_directed_acyclic_graph(G)
    }
    with open(f"{output_prefix}.json", "w") as f:
        json.dump(data, f, indent=2)

    # 2. Export GraphML
    nx.write_graphml(G, f"{output_prefix}.graphml")

    # 3. Export DOT
    try:
        from networkx.drawing.nx_pydot import write_dot
        write_dot(G, f"{output_prefix}.dot")
    except Exception:
        # direct DOT serialization
        with open(f"{output_prefix}.dot", "w") as f:
            f.write("digraph CausalGraph {\n")
            for u, v in G.edges():
                f.write(f'  "{u}" -> "{v}";\n')
            f.write("}\n")
