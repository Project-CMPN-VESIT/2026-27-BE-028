import pandas as pd

from src.data.loader import load_raw_dataset, normalize_temporal_structure
from src.counterfactual import CounterfactualGenerator


df = normalize_temporal_structure(
    load_raw_dataset("resources/capstone_final_merged_dataset.csv")
)

event_id = 5819

event_df = (
    df[df["event_id"] == event_id]
    .sort_values("normalized_step")
    .copy()
)

factual = event_df.iloc[-1]

generator = CounterfactualGenerator()

results = generator.generate_event_counterfactuals(
    event_df,
    timing_advances=[10.0, 30.0, 60.0],
    dv_scalings=[]
)

print("\n" + "=" * 70)
print("DIAGNOSTIC FOR EVENT", event_id)
print("=" * 70)

print("\nFACTUAL:")
print("time_to_TCA =", factual["time_to_TCA"])
print("poc =", factual["poc"])

for col in [
    "relative_distance",
    "sigma_r",
    "sigma_t",
    "sigma_n",
    "combined_covariance_magnitude",
    "deltav_required",
]:
    if col in factual:
        print(col, "=", factual[col])

for result in results:

    cf = result["counterfactual"]

    print("\n" + "-" * 70)
    print("TIMING ADVANCE:", result["delta_t_adv"])

    for col in [
        "time_to_TCA",
        "poc",
        "relative_distance",
        "sigma_r",
        "sigma_t",
        "sigma_n",
        "combined_covariance_magnitude",
        "deltav_required",
        "maneuver_window_remaining",
        "fuel_margin",
        "feasibility_flag",
    ]:
        print(col, "=", cf.get(col))

    print("admissible =", result.get("admissible"))
    print("physics_reason =", result.get("physics_reason"))