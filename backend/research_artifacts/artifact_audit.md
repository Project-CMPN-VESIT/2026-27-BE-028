# Artifact Discovery & Verification Audit Report
**Project:** Research-Grade Causal + XAI + Neuro-Symbolic Analysis Framework for Satellite Collision Avoidance  
**Date:** 2026-09-01  
**Author:** Research Engineering Agent (Antigravity CLI / VS Code)

---

## 1. Executive Summary & Resource Inventory

A complete, recursive inspection of the `resources/` evidence repository was performed. All 6 trained model checkpoints, the 60,000-row conjunction dataset, 5 reference Jupyter notebooks, and 3 technical documentation/presentation PDFs were audited, loaded, and verified through real programmatic execution.

### Complete Artifact Inventory

| File Name | File Type | Size (Bytes) | SHA-256 Checksum | Verification Status |
|---|---|---|---|---|
| `capstone_final_merged_dataset.csv` | Dataset | 48,224,983 | `d721f57a7637d562ebe97a1b6ba3f6fd2aeafc1328aac7558e350fd75f1bc620` | **VERIFIED** |
| `final_physics_regularized_gru.pth` | PyTorch Checkpoint | 685,679 | `fc2d4bc8b2c85ace5b0c3a2dd2e9cc08ea360f86bc5401cc1e83d4b309803881` | **VERIFIED** |
| `NeuroSymbolic_LSTM_final.pt.zip` | PyTorch Archive | 902,318 | `2338fa26ab6372e69569d49c2f07710561a1bb88a3ae968880e6125aebf26df5` | **VERIFIED** |
| `satellite_tcn_modelt4.pt.zip` | PyTorch Archive | 285,175 | `c265077e01ecb8a2f9cad0bd4f33efd1c3c49dd443e435e1632d3a4490f0608c` | **VERIFIED** |
| `causal_transformer_physics.pt.zip` | PyTorch Archive | 1,136,549 | `ad608b2d04da505a96749e919da1fbee9326863eb3d4718fe0682f0f3ce4ff99` | **VERIFIED** |
| `patchtst_model.pt.zip` | PyTorch Archive | 7,208,121 | `587d4913405496e2e95a17f5999374720660463c607b77cd0131f22590c57828` | **VERIFIED** |
| `xgboost_model.pt.zip` | PyTorch Archive | 753,041 | `c1ffc048fd6ebc8b75e3bcb97aefe03a4ec410d397e6cf7a130cde77b6dbbc84` | **VERIFIED** |
| `causal_forest_explainer_gru.pkl` | Pickle Artifact | 155,922,062 | `a78fc1e185b55e84255cd76df23683ee80e8534a2e14de1ccb92d3274d386408` | **VERIFIED** |
| `Capstone_GRU_Model.ipynb` | Jupyter Notebook | 187,922 | `39eb4bab8fb831cb637a5a7e66f8a0035de158a04aa5e445d9f41b88d69ec1b4` | **VERIFIED** |
| `LSTM_Model_Symbolic_Riddhi_Symbolic (1).ipynb` | Jupyter Notebook | 491,746 | `34ae2234dbfbf58c35f6c8c5b294f73b222c8285c66103a0efa3285dd4e3b4e4` | **VERIFIED** |
| `Copy_of_TCN_NeuroSymbolic_Final_Training_new_test5.ipynb` | Jupyter Notebook | 224,288 | `36c3c6f4cba8b77e71914612b2a975d5e9d52fb88d8a45ce5261db0674adf5f5` | **VERIFIED** |
| `Transformer_Encoder.ipynb` | Jupyter Notebook | 378,690 | `38726d97746e53277d3f0b8cd825693b3d929e739eb0a2840ef63c01720e03e6` | **VERIFIED** |
| `patchtest.ipynb` | Jupyter Notebook | 136,374 | `97e072b7d45c63e3a18bcff4575c97592f9ccfdac01c2e7faea692da98711282` | **VERIFIED** |
| `Synopsis Capstone Project.pdf` | Documentation PDF | 810,664 | `6f0d11eac1f63475fcfaca782bd8eff51bc8210a27c1f49aace3dcb4d1b00c6b` | **VERIFIED** |
| `Xgboost- updated Symbolic layer.pdf` | Technical Report PDF | 329,110 | `cd329105409ca7d07019477bc204e556e6658c675a94980898dc4b177c02378c` | **VERIFIED** |
| `Group_28_Capstone_project (1).pdf` | Presentation PDF | 11,223,632 | `90879cd7497d77b68fdf1b3acf70a06a79f91f8c547ec4d78e70fe5d5a55b476` | **VERIFIED** |

---

## 2. Dataset Audit & Temporal Structure

- **Dataset File:** `resources/capstone_final_merged_dataset.csv`
- **Total Rows:** 60,000
- **Total Columns:** 48
- **Total Conjunction Events:** 3,000 unique `event_id`s
- **Rows per Event:** Exactly 20 observations per event (uniform across all 3,000 events, 0 discrepancies).
- **Time Index Range:** `t = 0` to `t = 19` (20 sequential timesteps per event).
- **Missing Values:** Exactly 0 missing values across all 60,000 rows and 48 columns.
- **Duplicate Rows:** 0 duplicate rows.
- **Target Distribution (`commit_decision`):**
  - Class 0 (`WAIT`): 38,476 (64.13%)
  - Class 1 (`COMMIT`): 21,524 (35.87%)
- **Orbit Regimes:** LEO (20,380 rows), GEO (19,840 rows), MEO (19,780 rows).

### Event-Level Separation Rule
Because the dataset is structured as 20 consecutive observations per event, **random row splitting is strictly prohibited**. Event-level grouping (`GroupShuffleSplit` / `GroupKFold` on `event_id`) must be enforced across all train/validation/test partitions to prevent temporal data leakage.

---

## 3. Model Discovery & Verification

All 6 models were loaded directly from their authoritative checkpoints and validated with real forward-pass inference on actual event sequences:

### 1. GRU (`final_physics_regularized_gru.pth`)
- **Input Dimension:** `(batch, 20, 33)`
- **Architecture:** 2-layer unidirectional GRU ($d_{hidden}=128$, dropout=0.3) $\rightarrow$ LayerNorm(128) $\rightarrow$ Linear(128, 64) $\rightarrow$ ReLU $\rightarrow$ Dropout(0.3) $\rightarrow$ Linear(64, 2).
- **Output:** `(batch, 20, 2)` per-timestep logits $[logit_{WAIT}, logit_{COMMIT}]$.
- **Status:** **VERIFIED** (real inference test passed).

### 2. LSTM (`NeuroSymbolic_LSTM_final.pt.zip`)
- **Input Dimension:** `(batch, 20, 33)`
- **Architecture:** 2-layer unidirectional LSTM ($d_{hidden}=128$, dropout=0.3) $\rightarrow$ LayerNorm(128) $\rightarrow$ Linear(128, 64) $\rightarrow$ ReLU $\rightarrow$ Dropout(0.3) $\rightarrow$ Linear(64, 2).
- **Metadata:** Checkpoint stores `input_size=33`, `hidden_size=128`, `num_layers=2`, `feature_columns` (33), `symbolic_columns` (8), `optimal_lambda=0.5`.
- **Output:** `(batch, 20, 2)` per-timestep logits.
- **Status:** **VERIFIED** (real inference test passed).

### 3. TCN (`satellite_tcn_modelt4.pt.zip`)
- **Input Dimension:** `(batch, 20, 33)`
- **Architecture:** Temporal Convolutional Network with 4 causal dilated residual blocks:
  - Block 0: $33 \rightarrow 32$, dilation $d=1$, kernel $k=3$
  - Block 1: $32 \rightarrow 64$, dilation $d=2$, kernel $k=3$
  - Block 2: $64 \rightarrow 64$, dilation $d=4$, kernel $k=3$
  - Block 3: $64 \rightarrow 32$, dilation $d=8$, kernel $k=3$
  - Head: Conv1d(32, 2, kernel=1)
- **Output:** `(batch, 20, 2)` per-timestep logits.
- **Status:** **VERIFIED** (real inference test passed).

### 4. Transformer (`causal_transformer_physics.pt.zip`)
- **Input Dimension:** `(batch, 20, 33)`
- **Architecture:** SatelliteCausalTransformer: Linear(33, 128) + PositionalEncoding $\rightarrow$ 2-layer TransformerEncoder ($d_{model}=128$, $n_{head}=4$, $d_{ff}=256$, dropout=0.3, strictly causal subsequent mask) $\rightarrow$ LayerNorm(128) $\rightarrow$ Linear(128, 64) $\rightarrow$ ReLU $\rightarrow$ Dropout(0.3) $\rightarrow$ Linear(64, 2).
- **Output:** `(batch, 20, 2)` per-timestep logits.
- **Status:** **VERIFIED** (real inference test passed).

### 5. PatchTST (`patchtst_model.pt.zip`)
- **Input Dimension:** `(batch, 20, 44)` (**Distinct 44-feature representation with stored StandardScaler**)
- **Architecture:** Unfolds time dimension into patches ($patch\_len=5, stride=2 \rightarrow 8\text{ patches}$) $\rightarrow$ Linear(5, 128) projection + Channel Embedding ($1 \times 44 \times 1 \times 128$) $\rightarrow$ 3-layer TransformerEncoder ($d_{model}=128, n_{head}=4, d_{ff}=2048, norm\_first=True$) $\rightarrow$ LayerNorm(128) $\rightarrow$ Final patch slice $\rightarrow$ Linear($44 \times 128 = 5632, 2$).
- **Output:** `(batch, 2)` event-level logits.
- **Preprocessing:** Uses checkpoint-embedded `StandardScaler` fitted on 44 features.
- **Status:** **VERIFIED** (real inference test passed).

### 6. XGBoost (`xgboost_model.pt.zip`)
- **Input Dimension:** `(N, 45)` (45 features = `time_index` + 44 PatchTST features including one-hot orbit types)
- **Architecture:** `XGBClassifier` (300 trees, `max_depth=5`, `learning_rate=0.05`, `colsample_bytree=0.8`).
- **Output:** `(N, 2)` probabilities $[P(WAIT), P(COMMIT)]$.
- **Status:** **VERIFIED** (real inference test passed).

---

## 4. Existing Symbolic / Physics Layer & Provenance

The existing symbolic/physics shield has been identified across notebooks and technical documentation. Its exact mathematical provenance has been audited against the real dataset:

### Provenance Audit

1. **`feasibility_flag` (Type A — Hard Physical Constraint):**
   - **Exact Formula:** `feasibility_flag = (deltav_required <= max_delta_v).astype(int)`
   - **Empirical Check:** Matches 60,000 / 60,000 rows (100.00% exact match).
   - **Action:** If `feasibility_flag == 0` (`deltav_required > max_delta_v`), any model `COMMIT` decision is strictly overridden to `WAIT`.

2. **`time_to_TCA` (Type A — Hard Temporal / Physical Constraint):**
   - **Condition:** `tca_passed = (time_to_TCA <= 0)`.
   - **Action:** If `time_to_TCA <= 0`, maneuver cannot be executed retroactively; override `COMMIT` to `WAIT`.

3. **`maneuver_window_remaining` (Type A — Hard Operational Constraint):**
   - **Condition:** `maneuver_window_expired = (maneuver_window_remaining <= 0)`.
   - **Action:** If `maneuver_window_remaining <= 0`, operational preparation time has expired; override `COMMIT` to `WAIT`.

4. **`fuel_margin`, `deltav_required`, `max_delta_v` (Type A/B — Physical & State Variables):**
   - Fully documented kinematics and spacecraft subsystem properties.

5. **`cost_of_acting`, `cost_of_waiting` (Type B — Empirical Simulation Formulation):**
   - Quantified trade-off between propellant expenditure and collision risk evolution.

6. **`commit_decision` (Type C — Supervised Policy Target):**
   - Target label for training; **NOT** randomized experimental treatment.

---

## 5. Causal Identification & Intervention Evidence

1. **Absence of Randomized Interventions:**
   The dataset does not contain randomized experimental ACT/WAIT assignments or post-maneuver divergent counterfactual trajectories for the same event.
2. **Identification Strategy:**
   - **Causal Question:** Given conjunction state at timestep $t$, what is the effect of an intervention (e.g., advancing maneuver timing or adjusting $\Delta V$) on downstream risk and feasibility?
   - **Structural Causal Model (SCM):** Must be constructed using physical equations relating relative kinematics, covariance evolution, time-to-TCA, and $\Delta V$.
   - **Synthetic SCM Benchmark:** A controlled synthetic benchmark with known ground-truth causal graph and structural equations must be executed first to validate identification, refutation, and counterfactual recovery before analyzing the satellite dataset.

---

## 6. Verification Status Matrix

| Component | Status | Evidence / Authority |
|---|---|---|
| Dataset Schema & Integrity | **VERIFIED** | 60,000 rows, 48 cols, 3000 events, 0 nulls, 20 steps/event |
| GRU Checkpoint & Loading | **VERIFIED** | `final_physics_regularized_gru.pth`, real inference pass `(1, 20, 2)` |
| LSTM Checkpoint & Loading | **VERIFIED** | `NeuroSymbolic_LSTM_final.pt.zip`, real inference pass `(1, 20, 2)` |
| TCN Checkpoint & Loading | **VERIFIED** | `satellite_tcn_modelt4.pt.zip`, real inference pass `(1, 20, 2)` |
| Transformer Checkpoint & Loading | **VERIFIED** | `causal_transformer_physics.pt.zip`, real inference pass `(1, 20, 2)` |
| PatchTST Checkpoint & Loading | **VERIFIED** | `patchtst_model.pt.zip`, 44 features + scaler, real inference `(1, 2)` |
| XGBoost Checkpoint & Loading | **VERIFIED** | `xgboost_model.pt.zip`, 45 features, real inference pass `(20, 2)` |
| Feasibility Flag Provenance | **VERIFIED** | $\Delta V_{req} \le \Delta V_{max}$ (100% exact match across dataset) |
| TCA Expiration Rule | **VERIFIED** | $t_{TCA} \le 0 \implies WAIT$ |
| Maneuver Window Rule | **VERIFIED** | $W_{rem} \le 0 \implies WAIT$ |
| Neural Feature Count (GRU/LSTM/TCN/Trans) | **VERIFIED** | 33 features |
| PatchTST Feature Count | **VERIFIED** | 44 features |
| XGBoost Feature Count | **VERIFIED** | 45 features |
| Observational Nature of `commit_decision` | **VERIFIED** | Supervised label, requires explicit structural SCM for counterfactuals |

**Overall Discovery Status: COMPLETE & READY FOR IMPLEMENTATION.**
