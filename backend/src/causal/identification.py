import numpy as np
import pandas as pd
from typing import Dict, List, Any, Tuple
import statsmodels.api as sm

def identify_and_estimate_satellite_effect(
    df: pd.DataFrame,
    treatment_col: str = "deltav_required",
    outcome_col: str = "poc",
    confounder_cols: List[str] = ["time_to_TCA", "relative_distance", "relative_closing_rate", "combined_covariance_magnitude"]
) -> Dict[str, Any]:
    """
    Identifies and estimates the structural causal effect on real satellite data.
    Estimates effect of delta-v requirement on collision probability, controlling for geometry and uncertainty.
    """
    available_confounders = [c for c in confounder_cols if c in df.columns]
    
    # 1. Regress outcome on treatment + adjustment set
    X_vars = sm.add_constant(df[[treatment_col] + available_confounders])
    y_var = df[outcome_col]
    
    # Account for panel autocorrelation when event_id is present (cluster-robust standard errors)
    has_event_clusters = "event_id" in df.columns and df["event_id"].nunique() > 1
    if has_event_clusters:
        model = sm.OLS(y_var, X_vars).fit(cov_type="cluster", cov_kwds={"groups": df["event_id"]})
        estimation_method = "Cluster-Robust OLS (Grouped by event_id)"
    else:
        model = sm.OLS(y_var, X_vars).fit(cov_type="HC1")
        estimation_method = "Heteroskedasticity-Robust OLS (HC1)"

    ate = float(model.params[treatment_col])
    se = float(model.bse[treatment_col])
    p_val = float(model.pvalues[treatment_col])
    ci = [float(model.conf_int().loc[treatment_col, 0]), float(model.conf_int().loc[treatment_col, 1])]
    
    # Refutation 1: Placebo treatment test
    df_placebo = df.copy()
    df_placebo[treatment_col] = np.random.permutation(df[treatment_col].values)
    if has_event_clusters:
        placebo_model = sm.OLS(df_placebo[outcome_col], sm.add_constant(df_placebo[[treatment_col] + available_confounders])).fit(
            cov_type="cluster", cov_kwds={"groups": df_placebo["event_id"]}
        )
    else:
        placebo_model = sm.OLS(df_placebo[outcome_col], sm.add_constant(df_placebo[[treatment_col] + available_confounders])).fit(cov_type="HC1")
    placebo_ate = float(placebo_model.params[treatment_col])
    placebo_p = float(placebo_model.pvalues[treatment_col])
    
    # Refutation 2: Random common cause
    df_rcc = df.copy()
    df_rcc["random_noise"] = np.random.normal(0, 1, size=len(df))
    if has_event_clusters:
        rcc_model = sm.OLS(df_rcc[outcome_col], sm.add_constant(df_rcc[[treatment_col] + available_confounders + ["random_noise"]])).fit(
            cov_type="cluster", cov_kwds={"groups": df_rcc["event_id"]}
        )
    else:
        rcc_model = sm.OLS(df_rcc[outcome_col], sm.add_constant(df_rcc[[treatment_col] + available_confounders + ["random_noise"]])).fit(cov_type="HC1")
    rcc_ate = float(rcc_model.params[treatment_col])
    rcc_diff = abs(rcc_ate - ate)

    is_robust = (rcc_diff < 0.05 * abs(ate) if ate != 0 else 0.01) and (placebo_p > 0.01 or abs(placebo_ate) < abs(ate))

    return {
        "treatment": treatment_col,
        "outcome": outcome_col,
        "adjustment_set": available_confounders,
        "estimation_method": estimation_method,
        "estimated_ate": ate,
        "std_error": se,
        "p_value": p_val,
        "ci_95": ci,
        "placebo_ate": placebo_ate,
        "placebo_p_value": placebo_p,
        "random_common_cause_ate": rcc_ate,
        "random_common_cause_diff": rcc_diff,
        "robustness_status": "ROBUST" if is_robust else "SENSITIVE"
    }

