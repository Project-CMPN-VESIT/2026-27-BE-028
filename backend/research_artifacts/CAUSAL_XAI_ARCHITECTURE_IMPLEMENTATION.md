# Physics-Informed Neuro-Symbolic Causal-XAI Architecture for Satellite Conjunction Assessment

---

## 1. Executive Summary & Architectural Overview

In Space Situational Awareness (SSA), automated Conjunction Assessment Risk Analysis (CARA) requires high statistical classification performance paired with deterministic physical safety guarantees, auditable explanations, and counterfactual decision support. Purely data-driven machine learning models often learn non-causal statistical shortcuts, misinterpret post-encounter telemetry, and lack physical boundary awareness.

To solve these critical failure modes, this project implements a **Physics-Informed Neuro-Symbolic Causal-XAI Pipeline**. The architecture integrates:
1. **Six Frozen Predictive Checkpoints:** Spanning recurrent (GRU, LSTM), temporal convolutional (TCN), attention-based (Transformer, PatchTST), and tree-based (XGBoost) models;
2. **Axiomatic Explainable AI (XAI):** 500-step Gauss-Legendre Integrated Gradients and TreeSHAP with guaranteed mathematical completeness ($0.2656\%$ error);
3. **Structural Astrodynamic Causal Engine:** An orbital mechanics Directed Acyclic Graph (DAG) with Double Machine Learning (DML) for heterogeneous causal estimation across orbital regimes;
4. **Structural Causal Model (SCM):** Pearl's 3-step abduction-action-prediction framework simulating observation lead-time advances and thruster impulse interventions;
5. **Neuro-Symbolic Astrodynamic Safety Shield:** A deterministic verification layer enforcing physical invariants ($t_{\text{TCA}} > 0$, $\Delta V \le 0.05\text{ m/s}$, $F_{\text{margin}} \ge 0$) and separating raw ML predictions from physical actionability states (`ACTIONABLE` vs. `INVALID_CLOSED`).

```
┌─────────────────────────────────────────────────────────────────────────┐
│                       ORBITAL TELEMETRY INGESTION                       │
│        60,000 State Vectors  •  3,000 Events (20 Steps / Event)         │
│          Event-Level Temporal Split (80% Train / 10% Val / 10% Test)    │
└────────────────────────────────────┬────────────────────────────────────┘
                                     │
                                     ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                   1. SIX FROZEN PREDICTIVE FOUNDATIONS                  │
│        GRU  •  LSTM  •  TCN  •  Transformer  •  PatchTST  •  XGBoost     │
│                     ──► Multi-Model Predictive Consensus                │
└────────────────────────────────────┬────────────────────────────────────┘
                                     │
                                     ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                    2. EXPLAINABLE AI (XAI) ENGINE                       │
│        Integrated Gradients (Gauss-Legendre, N=500, Error: 0.2656%)     │
│        TreeSHAP (660 Feature Splits)  •  Temporal Saliency Maps         │
└────────────────────────────────────┬────────────────────────────────────┘
                                     │
                                     ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                3. STRUCTURAL ASTRODYNAMIC CAUSAL ENGINE                 │
│        Orbital Mechanics DAG  •  Double ML / Causal Forest (CATE)       │
│        Falsification Refutations: Placebo, Confounders, Subsetting      │
└────────────────────────────────────┬────────────────────────────────────┘
                                     │
                                     ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                4. STRUCTURAL COUNTERFACTUAL ENGINE (SCM)                │
│        TEMPORAL_SHIFT (+10s/+30s/+60s Lead Time, ΔV ∝ 1/t)              │
│        OPERATIONAL_INTERVENTION (+25% Thrust Boost, Fuel Margin Model)  │
└────────────────────────────────────┬────────────────────────────────────┘
                                     │
                                     ▼
┌─────────────────────────────────────────────────────────────────────────┐
│               5. NEURO-SYMBOLIC ASTRODYNAMIC SAFETY SHIELD              │
│        NASA Foster PoC Integral (τ = 10⁻⁴)  •  Time-to-TCA Boundary     │
│        Impulse Bounds (ΔV ≤ 0.05 m/s)  •  Propellant Non-Negativity     │
└────────────────────────────────────┬────────────────────────────────────┘
                                     │
                                     ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                    6. AUDITABLE OPERATIONAL DECISION                    │
│                                                                         │
│         [ COMMIT ]              [ WAIT ]          [ INVALID_CLOSED ]    │
│      Execute Maneuver       Continue Tracking       Encounter Passed    │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Telemetry Ingestion, Dimensionality & Representation Routing

### 2.1 Conjunction Event Contract
- **Total State Vectors ($N$):** $60,000$ rows.
- **Conjunction Events ($E$):** $3,000$ distinct orbital encounters.
- **Temporal Depth ($T$):** $20$ consecutive tracking timesteps per encounter.
- **Physical Features ($D$):** $33$ orbital features per timestep (Cartesian coordinates $\mathbf{r}, \mathbf{v}$, relative miss distance $r_{\text{rel}}$, relative closing velocity $v_{\text{rel}}$, 3D covariance matrix elements $\Sigma_{ij}$, hard body radius $R_{\text{HBR}}$, atmospheric drag level, solar flux index $F_{10.7}$, and sensor noise).

### 2.2 Event-Level Temporal Splitting
To eliminate cross-temporal data leakage, dataset splitting is strictly enforced at the **event level**:
- **Training Set:** 2,400 events ($48,000$ rows / $80\%$)
- **Validation Set:** 300 events ($6,000$ rows / $10\%$)
- **Test Set:** 300 events ($6,000$ rows / $10\%$)

### 2.3 Representation Routing Across Model Paradigms
```
                   ┌──────────────────────────────────────┐
                   │   Raw Conjunction Telemetry Matrix   │
                   └──────────────────┬───────────────────┘
                                      │
        ┌─────────────────────────────┼─────────────────────────────┐
        ▼                             ▼                             ▼
[ Tensor: (N, 20, 33) ]      [ Tensor: (N, 20, 33) ]       [ Vector: (N, 660) ]
StandardScaler Applied       Native InstanceNorm           Unrolled Flattened
        │                             │                             │
        ▼                             ▼                             ▼
GRU / LSTM / TCN / Transformer      PatchTST                      XGBoost
```

---

## 3. What Was Used & How: Deep-Dive by Module

### 3.1 Frozen Predictive Foundation Layer

#### Models Implemented:
1. **GRU (`src/models/neural.py`):** 2-layer Recurrent Neural Network with hidden dimension $h=128$, dropout $=0.2$. Captures sequential orbital dynamics.
2. **LSTM (`src/models/neural.py`):** 2-layer Long Short-Term Memory network with separate cell and hidden state vectors. Preserves tracking uncertainty history across timesteps.
3. **TCN (`src/models/neural.py`):** Temporal Convolutional Network with exponentially dilated 1D causal convolutions ($d \in \{1, 2, 4, 8\}$) and residual connections.
4. **Transformer (`src/models/neural.py`):** Multi-head self-attention ($n_{\text{head}}=4$, $d_{\text{model}}=64$, feedforward dimension $=128$) capturing non-local temporal interactions.
5. **PatchTST (`src/models/patchtst_wrapper.py`):** Channel-independent temporal sequence patcher extracting sub-series patches ($P=4$, stride $=2$) with instance normalization.
6. **XGBoost (`src/models/xgboost_wrapper.py`):** Gradient-boosted decision tree ensemble ($300$ estimators, maximum depth $=6$, learning rate $=0.05$) trained over flattened $660$-dimensional vectors.

#### Preprocessing & Inference Protocol:
- **Standardization:** Neural models (GRU, LSTM, TCN, Transformer) require normalization via a pre-fitted `StandardScaler` ($\mu, \sigma$ fitted strictly on the training set).
- **Instance Normalization:** PatchTST bypasses standard scaling, applying internal reversible instance normalization per patch.
- **Tabular Flattening:** XGBoost processes raw unscaled flattened arrays $(x_1^{(t=1)}, \dots, x_{33}^{(t=20)})$.

---

### 3.2 Axiomatic Explainable AI (XAI) Engine

#### What Was Used:
- **Integrated Gradients with Gauss-Legendre Quadrature (`src/xai/integrated_gradients.py`):** Differentiable path-integral attribution method satisfying axiomatic completeness and implementation invariance.
- **TreeSHAP (`src/xai/shap_explainer.py`):** Exact game-theoretic Shapley feature attribution for tree ensembles.

#### Mathematical Formulation & Gauss-Legendre Quadrature:
Standard Integrated Gradients computes the path integral from baseline $x'$ to input $x$:
$$\text{IG}_i(x) = (x_i - x'_i) \times \int_{0}^{1} \frac{\partial F(x' + \alpha(x - x'))}{\partial x_i} \, d\alpha$$

Standard Riemann sum approximations exhibit high truncation errors at low step counts. We implement $N$-point **Gauss-Legendre Quadrature**:
$$\text{IG}_i(x) \approx (x_i - x'_i) \times \sum_{k=1}^N w_k \frac{\partial F\left(x' + \frac{z_k + 1}{2}(x - x')\right)}{\partial x_i}$$
where $z_k$ are the roots of the Legendre polynomial $P_N(z)$ and $w_k$ are the quadrature weights.

#### Quadrature Completeness Verification:
The Axiom of Completeness mandates that the sum of attributions equals the total logit change:
$$\sum_{i=1}^D \text{IG}_i(x) = F(x) - F(x')$$

**Convergence Audit Across Quadrature Steps ($N$):**

| Steps ($N$) | Mean Absolute Completeness Error | Theoretical Logit $\Delta F(x)$ | Relative Completeness Error ($\%$) | Verification Status |
| :---: | :---: | :---: | :---: | :--- |
| $N = 20$ | $0.0812$ | $4.9345$ | $1.6457\%$ | Approximated |
| $N = 50$ | $0.0727$ | $4.9345$ | $1.4732\%$ | Sub-optimal |
| $N = 100$ | $0.0858$ | $4.9345$ | $1.7396\%$ | Intermediate |
| $N = 200$ | $0.0470$ | $4.9345$ | $0.9525\%$ | Tight |
| $\mathbf{N = 500}$ | $\mathbf{0.0131}$ | $\mathbf{4.9345}$ | $\mathbf{0.2656\%}$ | **Production Verified ($< 0.3\%$)** |

---

### 3.3 Astrodynamic Structural Causal Engine

#### What Was Used:
- **Evidence-Based Causal DAG (`src/causal/graph.py`):** Directed Acyclic Graph grounded in Keplerian orbit dynamics, covariance propagation, and the NASA Foster 2D/3D collision integral.
- **Double Machine Learning (DML) / Causal Forest (`src/causal/estimators.py`):** Neyman-orthogonal score estimation isolating true physical treatment effects ($\text{do}(\Delta V)$) from high-dimensional observational confounders (atmospheric drag, solar flux $F_{10.7}$, sensor noise).

#### Astrodynamic DAG Structure:
```
[Semi-Major Axis (a)] ──► [Relative Miss Distance (r_rel)] ──► [Collision PoC]
[Eccentricity (e)]    ──►                                       ▲
[Inclination (i)]     ──► [Relative Closing Rate]               │
                                                                 │
[Atmospheric Drag]    ──► [Positional Covariance (Σ)] ───────────┘
[Solar Activity F10.7]──►                                       │
[Sensor Noise]        ──►                                       ▼
                                                          [Required Impulse (ΔV)]
                                                                │
                                                                ▼
                                                          [Propellant Margin]
                                                                │
                                                                ▼
                                                          [Commit Action]
```

#### Heterogeneous CATE Estimation:
Using Double Machine Learning with cross-fitting:
$$Y - \hat{g}(X) = \tau(X) \cdot (T - \hat{m}(X)) + \varepsilon$$
- **Low Earth Orbit (LEO):** $\tau = \mathbf{-0.1802} \text{ (m/s)}^{-1}$ (High orbital velocity $v \approx 7.5\text{ km/s}$, highest maneuver sensitivity).
- **Medium Earth Orbit (MEO):** $\tau = \mathbf{-0.1214} \text{ (m/s)}^{-1}$.
- **Geostationary Orbit (GEO):** $\tau = \mathbf{-0.0805} \text{ (m/s)}^{-1}$ (Low relative speeds, wider required maneuver horizons).

---

### 3.4 Structural SCM & Counterfactual Reasoning Engine

#### What Was Used:
- **Pearl's Structural Causal Model (`src/counterfactual/structural_scm.py`):** Implements **Abduction $\to$ Action $\to$ Prediction**:
  1. *Abduction:* Estimate exogenous background terms $U = (U_r, U_v, U_{\Sigma})$ given factual encounter telemetry $(X=x, Y=y)$.
  2. *Action:* Apply physical $\text{do}(\cdot)$ operator.
  3. *Prediction:* Forward-propagate modified states through structural astrodynamic equations.

#### Implemented Intervention Scenarios:
1. **`TEMPORAL_SHIFT` (Observation Lead-Time Advance):**
   Simulates earlier decision lead time: $\text{do}(t_{\text{TCA}} \to t_{\text{TCA}} + \Delta t)$ for $\Delta t \in \{10, 30, 60\}\text{ s}$. Governed by the **astrodynamic inverse-time law**:
   $$\Delta V_{\text{req}}(t + \Delta t) = \Delta V_{\text{req}}(t) \cdot \left(\frac{t_{\text{TCA}}}{t_{\text{TCA}} + \Delta t}\right)$$
   *Result:* Advancing maneuver decision by $+30\text{ s}$ reduces required impulse by **$\sim 99\%$** ($0.01655\text{ m/s} \to 1.53 \times 10^{-7}\text{ m/s}$).

2. **`OPERATIONAL_INTERVENTION` (Thruster Impulse Scaling):**
   Simulates boosted thruster output: $\text{do}(\Delta V \to 1.25 \times \Delta V)$. Computes the structural propellant margin trade-off:
   $$F_{\text{margin, cf}} = F_{\text{margin, fact}} - \left(\frac{\Delta V_{\text{cf}} - \Delta V_{\text{fact}}}{\Delta V_{\text{capacity}}}\right)$$

---

### 3.5 Neuro-Symbolic Safety Shield & Decision Logic

#### What Was Used:
- **Symbolic Verification Shield (`src/pipeline/event_analyzer.py`):** Deterministic orbital safety filter acting as a post-prediction verification gate.

#### Operational State Separation:
- **`INVALID_CLOSED`:** Non-actionable encounters where $t_{\text{TCA}} \le 0$ (encounter has already passed) or $W_{\text{rem}} = t_{\text{TCA}} - \Delta t_{\text{lead}} \le 0$ (maneuver window expired).
- **`ACTIONABLE`:** Valid active encounters ($t_{\text{TCA}} > 0$) requiring operational maneuver decisions.

#### Decision Invariants:
$$\text{Decision} = \begin{cases}
\mathbf{INVALID\_CLOSED} & \text{if } t_{\text{TCA}} \le 0 \;\lor\; W_{\text{rem}} \le 0 \\
\mathbf{WAIT} & \text{if } \text{PoC} < 10^{-4} \;\lor\; \text{ML Consensus} = 0 \\
\mathbf{COMMIT} & \text{if } \text{PoC} \ge 10^{-4} \;\land\; \Delta V_{\text{req}} \le 0.05\text{ m/s} \;\land\; F_{\text{margin}} \ge 0 \\
\mathbf{INVALID\_CLOSED} & \text{if } \Delta V_{\text{req}} > 0.05\text{ m/s} \;\lor\; F_{\text{margin}} < 0
\end{cases}$$

---

## 4. Verification & Test Suite Details (17/17 Tests Passing)

The test suite is structured across 5 dedicated modules in `tests/`. All 17 unit and integration tests execute cleanly with zero failures (`pytest -q` $\to$ $100\%$ pass rate):

```
tests/test_models.py       ......                                        [ 35%]
tests/test_data.py         ....                                          [ 58%]
tests/test_causal.py       ...                                           [ 76%]
tests/test_physics.py      ...                                           [ 94%]
tests/test_pipeline.py     .                                             [100%]
============================== 17 passed in 4.51s ==============================
```

### 4.1 Detailed Test Catalog

| Test ID | File | Test Function | Purpose & Invariant Verified | Status |
| :---: | :--- | :--- | :--- | :---: |
| **T01** | `test_models.py` | `test_model_loading_and_inference[gru]` | Verifies GRU checkpoint loads, standardizes $(20, 33)$ inputs, and emits $(1, 20, 2)$ valid probabilities. | **PASS** |
| **T02** | `test_models.py` | `test_model_loading_and_inference[lstm]` | Verifies LSTM checkpoint loads, recovers `StandardScaler`, and outputs valid sequential predictions. | **PASS** |
| **T03** | `test_models.py` | `test_model_loading_and_inference[tcn]` | Verifies TCN dilated causal 1D conv layers execute without shape mismatches. | **PASS** |
| **T04** | `test_models.py` | `test_model_loading_and_inference[transformer]` | Verifies Transformer multi-head self-attention forward pass and softmax scaling. | **PASS** |
| **T05** | `test_models.py` | `test_model_loading_and_inference[patchtst]` | Verifies PatchTST patch extraction and instance normalization over 33 channels. | **PASS** |
| **T06** | `test_models.py` | `test_model_loading_and_inference[xgboost]` | Verifies XGBoost 660-feature tabular model loading and prediction accuracy. | **PASS** |
| **T07** | `test_data.py` | `test_dataset_loading_and_schema` | Validates dataset contract: exactly $60,000$ rows, $48$ schema columns, and $0$ null values. | **PASS** |
| **T08** | `test_data.py` | `test_temporal_normalization` | Verifies every event contains exactly $20$ timesteps normalized from step $0$ to $19$. | **PASS** |
| **T09** | `test_data.py` | `test_event_level_splitting_and_no_leakage` | Confirms zero event overlap between Train ($2400$), Val ($300$), and Test ($300$) splits. | **PASS** |
| **T10** | `test_data.py` | `test_sequence_dataset_generation` | Verifies PyTorch `SequenceDataset` generates $(20, 33)$ tensor batches correctly. | **PASS** |
| **T11** | `test_causal.py` | `test_causal_graph_structure` | Asserts graph is a valid acyclic DAG (`nx.is_directed_acyclic_graph == True`) containing all key orbital nodes. | **PASS** |
| **T12** | `test_causal.py` | `test_synthetic_scm_benchmark` | Benchmarks causal effect recovery, placebo refutation, and random common cause robustness. | **PASS** |
| **T13** | `test_causal.py` | `test_real_causal_identification` | Verifies DML / Causal Forest estimation on real satellite telemetry. | **PASS** |
| **T14** | `test_physics.py` | `test_physics_shield_guarantee` | Asserts that infeasible $\Delta V > \Delta V_{\text{max}}$ deterministically overrides raw ML `COMMIT` to `WAIT`/`INVALID`. | **PASS** |
| **T15** | `test_physics.py` | `test_tca_passed_override` | Asserts that expired encounters ($t_{\text{TCA}} \le 0$) deterministically override `COMMIT` to `INVALID_CLOSED`. | **PASS** |
| **T16** | `test_physics.py` | `test_counterfactual_validation` | Validates physical admissibility filter on counterfactual trajectory dictionaries. | **PASS** |
| **T17** | `test_pipeline.py` | `test_event_analyzer_end_to_end` | Validates end-to-end integration across all 6 models, XAI saliency, causal CATE, SCM paths, and shield decision. | **PASS** |

---

## 5. Quantitative Empirical Results

### 5.1 Multi-Model Predictive & Shielded Performance

| Model Architecture | Raw Accuracy | Raw ROC-AUC | Raw PR-AUC | Shielded Accuracy | Shielded Precision | Operational F1-Score |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| **GRU** | $80.73\%$ | $0.8396$ | $0.7776$ | $82.11\%$ | $87.84\%$ | $\mathbf{0.7048}$ |
| **LSTM** | $70.10\%$ | $0.8382$ | $0.7554$ | $71.29\%$ | $95.83\%$ | $\mathbf{0.3556}$ |
| **TCN** | $76.26\%$ | $0.7621$ | $0.6884$ | $79.20\%$ | $72.45\%$ | $\mathbf{0.7061}$ |
| **Transformer** | $70.90\%$ | $0.7187$ | $0.5588$ | $72.33\%$ | $64.05\%$ | $\mathbf{0.5869}$ |
| **PatchTST** | $98.22\%$ | $0.9963$ | $0.9877$ | $96.89\%$ | $100.0\%$ | $\mathbf{0.9340}$ |
| **XGBoost** | $\mathbf{99.73\%}$ | $\mathbf{0.9999}$ | $\mathbf{0.9999}$ | $\mathbf{99.28\%}$ | $\mathbf{99.60\%}$ | $\mathbf{0.9899}$ |

### 5.2 Causal-XAI Consistency Matrix

| Physical Feature | Mean XAI Attribution ($\bar{\phi}$) | Causal ATE ($\tau$) | Empirical $p$-value | Consistency Classification | Operational Meaning |
| :--- | :---: | :---: | :---: | :--- | :--- |
| **Relative Miss Distance ($r_{\text{rel}}$)** | $0.9516$ | $+2.40 \times 10^{-6}$ | $< 10^{-130}$ | **Predictive + Causal Agreement** | Direct geometric risk driver. |
| **Closing Rate ($v_{\text{rel}}$)** | $0.4398$ | $-0.0227$ | $< 10^{-294}$ | **Predictive + Causal Agreement** | Modulates encounter severity. |
| **Propellant Fuel Margin** | $0.4163$ | $-0.1405$ | $< 10^{-84}$ | **Predictive + Causal Agreement** | Resource feasibility bound. |
| **Required Impulse ($\Delta V_{\text{req}}$)** | $0.0000$ (Neural) | $+0.1171$ | $< 10^{-110}$ | **Predictive Confounded** | Under-weighted by RNNs; critical in SCM. |
| **Time to TCA ($t_{\text{TCA}}$)** | $0.0000$ (Neural) | $+0.0003$ | $< 10^{-5}$ | **Predictive Confounded** | Statistical shortcut; root causal driver. |

---

## 6. Astrodynamic Case Studies: Physical Grounding Verification

### Case 1: Stale / Passed Encounter (Event 1)
- **State Vector:** $t_{\text{TCA}} = -52.07\text{ s}$ (Encounter has already passed).
- **Raw Model Prediction:** Predicts $\text{WAIT}$ ($0$).
- **Safety Shield Interception:** Identifies $t_{\text{TCA}} \le 0$.
- **Output:** 
  $$\mathbf{operational\_status} = \text{"INVALID\_CLOSED"}$$
  $$\mathbf{final\_decision} = \text{"INVALID\_CLOSED"}$$
  $$\mathbf{safety\_reason} = \text{"TCA\_PASSED\_OR\_WINDOW\_EXPIRED"}$$

### Case 2: Active High-Risk Conjunction (Event 2551)
- **State Vector:** $t_{\text{TCA}} = +0.00028\text{ s} \approx \text{Active}$, $r_{\text{rel}} = 12.4\text{ m}$, $\text{PoC} = 3.8 \times 10^{-3} \ge 10^{-4}$.
- **Raw Model Prediction:** Multi-model consensus predicts $\text{COMMIT}$ ($1$).
- **Physics Verification:** $\Delta V_{\text{req}} = 0.01655\text{ m/s} \le 0.05\text{ m/s}$, $F_{\text{margin}} = 0.76 \ge 0$.
- **Output:**
  $$\mathbf{operational\_status} = \text{"ACTIONABLE"}$$
  $$\mathbf{final\_decision} = \text{"COMMIT"}$$
  $$\mathbf{counterfactual\_benefit} = \text{"Advancing decision by +30s reduces impulse demand by 99%"}$$

---

## 7. Publication Figures Directory (300 DPI)

| Figure ID | File Path | Description |
| :--- | :--- | :--- |
| **Fig 1** | `research_artifacts/figures/fig1_six_model_roc_pr_curves.png` | Six-Model ROC & PR Curves across test events |
| **Fig 2** | `research_artifacts/figures/fig2_model_agreement_heatmap.png` | Representation-Aware Model Agreement Heatmap |
| **Fig 3** | `research_artifacts/figures/fig3_temporal_xai_saliency.png` | Temporal Saliency Heatmaps across 20 tracking timesteps |
| **Fig 4** | `research_artifacts/figures/fig4_top_feature_importance.png` | Top Feature Attributions across 6 model architectures |
| **Fig 5** | `research_artifacts/figures/fig5_xai_stability_faithfulness.png` | Explanation Faithfulness & Perturbation Stability Curves |
| **Fig 6** | `research_artifacts/figures/fig6_causal_dag.png` | Astrodynamic Structural Causal DAG (Circular Nodes) |
| **Fig 7** | `research_artifacts/figures/fig7_causal_dose_response.png` | Causal Dose-Response Curve with 95% Confidence Band |
| **Fig 8** | `research_artifacts/figures/fig8_heterogeneous_cate_dist.png` | Heterogeneous CATE Distributions by Orbital Regime (LEO/MEO/GEO) |
| **Fig 9** | `research_artifacts/figures/fig9_counterfactual_trajectories.png` | Non-Overlapping Counterfactual Trajectories (Timing & Thrust Scaling) |
| **Fig 10** | `research_artifacts/figures/fig10_causal_xai_consistency.png` | Causal Effect (ATE) vs. Model-Specific XAI Attribution Matrix |
| **Fig 11** | `research_artifacts/figures/fig11_counterfactual_physics_admissibility.png` | Operational Actionability & Physics Admissibility Distribution |
| **Fig 12** | `research_artifacts/figures/fig12_factual_vs_counterfactual_decisions.png` | Feasible Commitment Rate Comparison |
| **Fig 13** | `research_artifacts/figures/fig13_event_case_study.png` | End-to-End Case Study Timeline & Safety Shield Verification |

---

## 8. Directory Structure & Execution Commands

```
├── configs/
│   └── config.yaml                     # IG quadrature steps N=500, DAG topology, safety bounds
├── src/
│   ├── models/                         # Checkpoint loaders and model adapters
│   │   ├── base.py                     # Unified model protocol
│   │   ├── neural.py                   # GRU, LSTM, TCN, Transformer PyTorch adapters
│   │   ├── patchtst_wrapper.py         # PatchTST sequence patcher wrapper
│   │   └── xgboost_wrapper.py          # XGBoost 660-feature tabular loader
│   ├── xai/                            # Explainability engine
│   │   ├── integrated_gradients.py     # 500-step Gauss-Legendre quadrature IG
│   │   └── shap_explainer.py           # TreeSHAP explainer
│   ├── causal/                         # Structural causal engine
│   │   ├── graph.py                    # Astrodynamic DAG construction
│   │   └── estimators.py               # DML, Causal Forest, and refutation suite
│   ├── counterfactual/                 # Structural SCM simulator
│   │   └── structural_scm.py           # Pearl SCM abduction-action-prediction
│   ├── pipeline/                       # End-to-end orchestration
│   │   ├── event_analyzer.py           # Single-event analyzer with neuro-symbolic shield
│   │   └── runner.py                   # Full pipeline runner & artifact generator
│   ├── reporting/                      # Publication visualizer
│   │   └── visualizer.py               # 13 high-resolution figures (300 DPI)
│   └── validation/                     # Metric evaluation & agreement
│       ├── metrics.py                  # ROC, PR, ECE, shielded metrics
│       └── agreement.py                # Representation-aware model consensus
├── tests/                              # Automated test suite (17/17 passing)
│   ├── test_models.py                  # T01-T06: Model loading & inference
│   ├── test_data.py                    # T07-T10: Data contracts & zero-leakage splits
│   ├── test_causal.py                  # T11-T13: DAG, DML, and refutation tests
│   ├── test_physics.py                 # T14-T16: Safety shield guarantees & SCM admissibility
│   └── test_pipeline.py                # T17: End-to-end pipeline integration
└── research_artifacts/                 # Generated publication CSVs, JSONs, and PNGs
```

### Execution Commands:

1. **Run Automated Test Suite:**
   ```bash
   python -m pytest -q
   # Expected: 17 passed in ~4.5s (100% pass rate)
   ```

2. **Run Full Pipeline & Regenerate All Artifacts:**
   ```bash
   python -m src.pipeline.runner
   # Executes 6-model inference, XAI, DML CATE, SCM counterfactuals, and generates all figures in research_artifacts/
   ```
