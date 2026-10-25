import pandas as pd
import numpy as np

from src.data.loader import load_raw_dataset, normalize_temporal_structure


df = normalize_temporal_structure(
    load_raw_dataset("resources/capstone_final_merged_dataset.csv")
)

timing_advances = [10.0, 30.0, 60.0]

print("\n" + "=" * 100)
print("TIMING MAPPING DIAGNOSTIC")
print("=" * 100)

events = df["event_id"].unique()

for event_id in events[:20]:

    event_df = (
        df[df["event_id"] == event_id]
        .sort_values("normalized_step")
        .copy()
    )

    factual = event_df.iloc[-1]

    factual_time = float(factual["time_to_TCA"])

    print("\n" + "-" * 100)
    print("EVENT:", event_id)
    print("Current time_to_TCA:", factual_time)

    for advance in timing_advances:

        target_time = factual_time + advance

        event_df["time_difference"] = abs(
            event_df["time_to_TCA"] - target_time
        )

        closest = event_df.loc[event_df["time_difference"].idxmin()]

        difference = abs(
            float(closest["time_to_TCA"]) - target_time
        )

        print(
            f"\nAdvance +{advance:.0f}h"
        )

        print(
            f"  target time       = {target_time:.4f}"
        )

        print(
            f"  closest timestep  = {int(closest['normalized_step'])}"
        )

        print(
            f"  actual time       = {float(closest['time_to_TCA']):.4f}"
        )

        print(
            f"  difference        = {difference:.4f} h"
        )

        print(
            f"  distance          = {float(closest['relative_distance']):.4f}"
        )

        print(
            f"  deltav_required   = {float(closest['deltav_required']):.8f}"
        )

        print(
            f"  stored PoC        = {float(closest['poc']):.10e}"
        )

        print(
            f"  sigma_r           = {float(closest['sigma_r']):.4f}"
        )

        print(
            f"  sigma_t           = {float(closest['sigma_t']):.4f}"
        )

        print(
            f"  sigma_n           = {float(closest['sigma_n']):.4f}"
        )

print("\n" + "=" * 100)
print("DONE")
print("=" * 100)