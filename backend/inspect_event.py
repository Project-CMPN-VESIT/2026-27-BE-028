import pandas as pd

from src.data.loader import load_raw_dataset, normalize_temporal_structure


# Load dataset
df = normalize_temporal_structure(
    load_raw_dataset("resources/capstone_final_merged_dataset.csv")
)

event_id = 5819

event_df = (
    df[df["event_id"] == event_id]
    .sort_values("normalized_step")
    .copy()
)

print("\n" + "=" * 110)
print(f"TEMPORAL INSPECTION FOR EVENT {event_id}")
print("=" * 110)

columns = [
    "normalized_step",
    "time_to_TCA",
    "relative_distance",
    "relative_speed",
    "relative_closing_rate",
    "sigma_r",
    "sigma_t",
    "sigma_n",
    "combined_covariance_magnitude",
    "poc",
    "deltav_required",
    "maneuver_window_remaining",
    "fuel_margin",
    "feasibility_flag",
]

# Only show columns that actually exist
available_columns = [c for c in columns if c in event_df.columns]

print("\n")
print(
    event_df[available_columns].to_string(
        index=False,
        float_format=lambda x: f"{x:.8f}"
    )
)

print("\n" + "=" * 110)
print("CHANGE BETWEEN CONSECUTIVE TIMESTEPS")
print("=" * 110)

check_columns = [
    "time_to_TCA",
    "relative_distance",
    "relative_speed",
    "relative_closing_rate",
    "sigma_r",
    "sigma_t",
    "sigma_n",
    "combined_covariance_magnitude",
    "poc",
    "deltav_required",
    "maneuver_window_remaining",
    "fuel_margin",
]

for col in check_columns:

    if col not in event_df.columns:
        continue

    values = event_df[col]

    print(f"\n{col}")
    print("-" * 50)

    for i in range(1, len(values)):
        previous = values.iloc[i - 1]
        current = values.iloc[i]

        try:
            change = current - previous
            print(
                f"step {event_df['normalized_step'].iloc[i-1]} "
                f"-> {event_df['normalized_step'].iloc[i]} : "
                f"{previous:.8f} -> {current:.8f} "
                f"(change = {change:+.8f})"
            )
        except:
            print(
                f"step {event_df['normalized_step'].iloc[i-1]} "
                f"-> {event_df['normalized_step'].iloc[i]} : "
                f"{previous} -> {current}"
            )

print("\n" + "=" * 110)
print("SUMMARY")
print("=" * 110)

for col in check_columns:

    if col not in event_df.columns:
        continue

    print(
        f"{col:35s} "
        f"min={event_df[col].min():.8f} "
        f"max={event_df[col].max():.8f} "
        f"first={event_df[col].iloc[0]:.8f} "
        f"last={event_df[col].iloc[-1]:.8f}"
    )

print("\nDone.")