import numpy as np
import pandas as pd
from typing import Dict, List, Any, Tuple
import statsmodels.api as sm

class SyntheticSCMBenchmark:
    """
    Controlled Synthetic Structural Causal Model (SCM) with known ground-truth equations.
    Used to validate causal identification, estimation, refutation, and counterfactual recovery
    BEFORE making causal claims on the real satellite dataset.

    Structural Equations:
      1. Confounder Z (tracking sensor noise): Z ~ Gamma(k=2.0, theta=1.0)
      2. Initial Miss Distance X: X = 50.0 + 10.0 * Z + Normal(0, 5)
      3. Treatment T (Delta-V maneuver impulse): T = 0.5 * Z + 0.05 * X + Normal(0, 1)
      4. True Outcome Y (Post-Maneuver Distance): Y = 100.0 + 4.5 * T + 2.0 * X - 3.0 * Z + Normal(0, 2)
      
    True Average Treatment Effect (ATE): dY/dT = 4.5000
    """
    def __init__(self, n_samples: int = 5000, seed: int = 42):
        self.n_samples = n_samples
        self.seed = seed
        self.true_ate = 4.5000

    def generate_data(self) -> pd.DataFrame:
        np.random.seed(self.seed)
        n = self.n_samples

        # Exogenous / Confounder
        u_z = np.random.gamma(shape=2.0, scale=1.0, size=n)
        z = u_z

        # State variable X
        u_x = np.random.normal(0, 5.0, size=n)
        x = 50.0 + 10.0 * z + u_x

        # Treatment T (Continuous Delta-V)
        u_t = np.random.normal(0, 1.0, size=n)
        t = 0.5 * z + 0.05 * x + u_t

        # Outcome Y
        u_y = np.random.normal(0, 2.0, size=n)
        y = 100.0 + self.true_ate * t + 2.0 * x - 3.0 * z + u_y

        df = pd.DataFrame({
            "Z_confounder": z,
            "X_state": x,
            "T_treatment": t,
            "Y_outcome": y,
            "U_y": u_y
        })
        return df

    def run_benchmark(self) -> Dict[str, Any]:
        """
        Executes identification and estimation on synthetic data, comparing estimated ATE with Ground Truth.
        Runs refutation tests.
        """
        df = self.generate_data()

        # 1. Naive OLS (without controlling for confounder Z) -> Confounded
        naive_model = sm.OLS(df["Y_outcome"], sm.add_constant(df[["T_treatment"]])).fit()
        naive_ate = float(naive_model.params["T_treatment"])

        # 2. Identified Backdoor Model (controlling for Z and X) -> Unconfounded
        correct_model = sm.OLS(df["Y_outcome"], sm.add_constant(df[["T_treatment", "Z_confounder", "X_state"]])).fit()
        est_ate = float(correct_model.params["T_treatment"])
        est_se = float(correct_model.bse["T_treatment"])
        ci_lower = float(correct_model.conf_int().loc["T_treatment", 0])
        ci_upper = float(correct_model.conf_int().loc["T_treatment", 1])

        ate_bias = abs(est_ate - self.true_ate)
        is_recovered = (ci_lower <= self.true_ate <= ci_upper) and (ate_bias < 0.05)

        # 3. Refutation 1: Placebo Treatment (replace T with random noise) -> Should be ~0
        df_placebo = df.copy()
        df_placebo["T_placebo"] = np.random.permutation(df["T_treatment"].values)
        placebo_model = sm.OLS(df_placebo["Y_outcome"], sm.add_constant(df_placebo[["T_placebo", "Z_confounder", "X_state"]])).fit()
        placebo_ate = float(placebo_model.params["T_placebo"])
        placebo_p = float(placebo_model.pvalues["T_placebo"])
        placebo_passed = (placebo_p > 0.05) or (abs(placebo_ate) < 0.1)

        # 4. Refutation 2: Random Common Cause (add random noise as confounder) -> ATE unchanged
        df_rcc = df.copy()
        df_rcc["W_random"] = np.random.normal(0, 1, size=len(df))
        rcc_model = sm.OLS(df_rcc["Y_outcome"], sm.add_constant(df_rcc[["T_treatment", "Z_confounder", "X_state", "W_random"]])).fit()
        rcc_ate = float(rcc_model.params["T_treatment"])
        rcc_diff = abs(rcc_ate - est_ate)
        rcc_passed = (rcc_diff < 0.05)

        # True CF outcome for factual state i with T_cf = T_i + 2.0: Y_cf = Y_i + 4.5 * 2.0 = Y_i + 9.0
        sample_row = df.iloc[0]
        t_fact = sample_row["T_treatment"]
        y_fact = sample_row["Y_outcome"]
        delta_t = 2.0
        t_cf = t_fact + delta_t
        true_y_cf = 100.0 + self.true_ate * t_cf + 2.0 * sample_row["X_state"] - 3.0 * sample_row["Z_confounder"] + sample_row["U_y"]
        predicted_y_cf = correct_model.predict([1.0, t_cf, sample_row["Z_confounder"], sample_row["X_state"]])[0] + (y_fact - correct_model.predict([1.0, t_fact, sample_row["Z_confounder"], sample_row["X_state"]])[0])
        cf_error = abs(predicted_y_cf - true_y_cf)
        max_allowed_cf_error = delta_t * (abs(ci_upper - ci_lower) / 2.0)
        cf_passed = (cf_error <= max_allowed_cf_error)

        status = "PASSED" if (is_recovered and placebo_passed and rcc_passed and cf_passed) else "FAILED"

        return {
            "status": status,
            "true_ate": self.true_ate,
            "estimated_ate": est_ate,
            "ate_bias": ate_bias,
            "ci_95": [ci_lower, ci_upper],
            "is_recovered": bool(is_recovered),
            "naive_confounded_ate": naive_ate,
            "placebo_ate": placebo_ate,
            "placebo_passed": bool(placebo_passed),
            "random_common_cause_diff": rcc_diff,
            "random_common_cause_passed": bool(rcc_passed),
            "counterfactual_error": float(cf_error),
            "counterfactual_passed": bool(cf_passed)
        }
