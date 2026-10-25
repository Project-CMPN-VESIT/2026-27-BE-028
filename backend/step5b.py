import pandas as pd

from src.data.loader import load_raw_dataset, normalize_temporal_structure
from src.counterfactual import CounterfactualGenerator


df = normalize_temporal_structure(
    load_raw_dataset("resources/capstone_final_merged_dataset.csv")
)

last = (
    df.sort_values("normalized_step")
    .groupby("event_id", as_index=False)
    .tail(1)
)

eligible = last[
    (last["time_to_TCA"] > 0) &
    (last["poc"] > 0)
].copy()

eligible["poc_level"] = pd.qcut(
    eligible["poc"],
    q=3,
    labels=["LOW", "MEDIUM", "HIGH"],
    duplicates="drop"
)

selected = (
    eligible.sort_values("poc")
    .groupby("poc_level", observed=True)
    .head(1)
)

generator = CounterfactualGenerator()

for _, row in selected.iterrows():

    event_id = row["event_id"]

    event_df = (
        df[df["event_id"] == event_id]
        .sort_values("normalized_step")
        .copy()
    )

    results = generator.generate_event_counterfactuals(
        event_df,
        timing_advances=[10.0, 30.0, 60.0],
        dv_scalings=[]
    )

    cf_pocs = {
        int(result["delta_t_adv"]): float(
            result["counterfactual"]["poc"]
        )
        for result in results
        if result.get("delta_t_adv") is not None
    }

    factual_poc = float(row["poc"])

    print("\n" + "=" * 60)
    print(f"EVENT ID: {event_id}")
    print(f"POC LEVEL: {row['poc_level']}")
    print(f"FACTUAL time_to_TCA: {float(row['time_to_TCA']):.6f}")
    print(f"FACTUAL PoC: {factual_poc:.8f}")
    print(f"CF PoC +10 sec: {cf_pocs.get(10)}")
    print(f"CF PoC +30 sec: {cf_pocs.get(30)}")
    print(f"CF PoC +60 sec: {cf_pocs.get(60)}")

    changed = any(
        abs(cf_pocs.get(delta, factual_poc) - factual_poc) > 1e-12
        for delta in [10, 30, 60]
    )

    print(f"PoC changes: {changed}")