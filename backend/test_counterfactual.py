import copy
import pandas as pd

from src.data.loader import load_raw_dataset, normalize_temporal_structure
from src.counterfactual import CounterfactualGenerator

df = normalize_temporal_structure(
    load_raw_dataset("resources/capstone_final_merged_dataset.csv")
)

event_ids = sorted(df["event_id"].unique())[:5]
generator = CounterfactualGenerator()

print(f"EVENTS_TESTED: {event_ids}")

for event_id in event_ids:
    event_df = df[df["event_id"] == event_id].sort_values("normalized_step").copy()
    original_event_df = event_df.copy(deep=True)

    factual_row = event_df.iloc[-1].to_dict()
    original_factual_row = copy.deepcopy(factual_row)

    print(f"\nEVENT {event_id}")

    try:
        results = generator.generate_event_counterfactuals(
            event_df,
            timing_advances=[10.0, 30.0, 60.0],
            dv_scalings=[]
        )

        assert len(results) == 3

        for result in results:
            cf = result["counterfactual"]
            delta_t = result["delta_t_adv"]

            distance_key = "distance" if "distance" in factual_row else "relative_distance"

            factual_distance = float(factual_row[distance_key])
            counterfactual_distance = float(cf["distance"])

            factual_distance_unchanged = factual_distance == counterfactual_distance

            factual_sigma_unchanged = all(
                float(factual_row[key]) == float(original_factual_row[key])
                for key in ["sigma_r", "sigma_t", "sigma_n"]
            )

            original_dataframe_unchanged = event_df.equals(original_event_df)

            required_fields_present = all(
                key in result
                for key in [
                    "counterfactual_admissible",
                    "factual_admissible",
                    "uncertainty_source",
                    "exact_original_uncertainty_replay",
                    "physics_validation"
                ]
            )

            assert required_fields_present
            assert "poc" in cf
            assert factual_distance_unchanged
            assert factual_sigma_unchanged
            assert original_dataframe_unchanged

            assert result["uncertainty_source"] == "FACTUAL_SIGMA_STATE_HELD_FIXED"
            assert result["exact_original_uncertainty_replay"] is False
            assert isinstance(result["physics_validation"], dict)

            print({
                "delta_t_adv": delta_t,
                "success": True,
                "factual_poc": float(factual_row["poc"]),
                "counterfactual_poc": float(cf["poc"]),
                "factual_distance_unchanged": factual_distance_unchanged,
                "factual_sigma_unchanged": factual_sigma_unchanged,
                "scenario_type": result["scenario_type"],
                "uncertainty_source": result["uncertainty_source"],
                "exact_original_uncertainty_replay": result["exact_original_uncertainty_replay"],
                "factual_admissible": result["factual_admissible"],
                "counterfactual_admissible": result["counterfactual_admissible"],
                "physics_result": result["physics_validation"],
                "original_data_unchanged": original_dataframe_unchanged
            })

    except Exception as error:
        print({
            "success": False,
            "error_type": type(error).__name__,
            "error": str(error)
        })
