# PROJECT CONTEXT
# Satellite Collision-Avoidance Research Project

## 1. Workspace Resources

The `resources/` directory contains the authoritative project materials available to the agent.

It includes:

- approximately 60,000-row merged dataset,
- project synopsis,
- project PPT/presentation,
- six trained model checkpoints,
- PDFs containing previous Colab/model information,
- IPYNB files,
- technical/model-loading documentation.

The agent MUST inspect the actual files before implementation.

---

## 2. Six Supplied Models

The project contains:

### GRU

Checkpoint:

`final_physics_regularized_gru.pth`

Verified interface:

```text
input  = (batch, 20, 33)
output = (batch, 20, 2)
```

Verified architecture:

```text
33 features
→ 2-layer unidirectional GRU
→ hidden size 128
→ LayerNorm(128)
→ Linear(128 → 64)
→ ReLU
→ Dropout(0.30)
→ Linear(64 → 2)
```

---

### LSTM

Checkpoint:

`NeuroSymbolic_LSTM_final.pt.zip`

Verified:

```text
input_size = 33
hidden_size = 128
num_layers = 2
bidirectional = False
sequence_length = 20
output = (batch, 20, 2)
```

The checkpoint contains feature metadata and other training metadata.

Do NOT reconstruct this as bidirectional LSTM.

---

### TCN

Checkpoint:

`satellite_tcn_modelt4.pt.zip`

Verified:

```text
input features = 33

channels:
33 → 32 → 64 → 64 → 32

kernel size = 3

dilations:
1 → 2 → 4 → 8
```

The model uses causal convolution, BatchNorm, GELU, dropout and residual/skip connections.

Output:

```text
(batch, 20, 2)
```

---

### Transformer

Checkpoint:

`causal_transformer_physics.pt.zip`

Verified:

```text
input dimension = 33
d_model = 128
n_heads = 8
num_layers = 2
feedforward = 256
sequence_length = 20
```

Output:

```text
(batch, 20, 2)
```

The supplied architecture is intended to use causal attention so future timesteps cannot influence earlier timestep predictions.

---

### PatchTST

Checkpoint:

`patchtst_model.pt.zip`

IMPORTANT:

PatchTST is different from the other neural models.

The checkpoint contains:

* model_state_dict
* feature_cols
* sequence_length
* scaler

The checkpoint establishes a 44-feature representation.

Therefore:

DO NOT force PatchTST into the 33-feature representation.

Use its own `feature_cols` and scaler after inspecting the checkpoint.

Reconstruct the exact architecture from the checkpoint.

---

### XGBoost

Checkpoint:

`xgboost_model.pt.zip`

The checkpoint contains:

* xgboost_model
* feature_columns

It is a binary logistic classifier.

Its own `feature_columns` are authoritative for its feature representation.

XGBoost does not have the same temporal `(batch, 20, 2)` interface as the neural models.

For XAI use TreeSHAP.

---

## 3. Dataset

The dataset is approximately:

```text
60,000 rows
~3,000 events
20 timesteps/event
```

Temporal identifiers:

```text
event_id
time_index
```

The dataset must be inspected rather than assumed to exactly match these approximate statistics.

---

## 4. Established Neural Feature Representation

The established 33-feature neural representation is:

```text
last_observation_age
max_delta_v
satellite_mass
hard_body_radius
measurement_noise

rel_pos_x
rel_pos_y
rel_pos_z

rel_vel_x
rel_vel_y
rel_vel_z

sigma_r
sigma_t
sigma_n

obj_sigma_r
obj_sigma_t
obj_sigma_n

solar_activity
drag_level
max_thrust

eccentricity
inclination
semi_major_axis
perigee
apogee

relative_distance
relative_speed
relative_closing_rate

satellite_covariance_magnitude
object_covariance_magnitude
combined_covariance_magnitude

tracking_reliability_index
fuel_margin
```

However, the actual checkpoint metadata must be used as the final authority for each model.

PatchTST is an established exception with its 44-feature checkpoint representation.

---

## 5. Non-Neural / Symbolic Variables

Important variables include:

```text
feasibility_flag
time_to_TCA
fuel_remaining
deltav_required
maneuver_window_remaining
cost_of_acting
cost_of_waiting
poc
fuel_margin
max_delta_v
```

These must not automatically be treated as neural features.

Other dataset variables must also be inspected and classified from the actual schema.

---

## 6. Output Semantics

The established neural models output two class logits:

```text
class 0 = WAIT
class 1 = COMMIT
```

Convert logits to probabilities using softmax.

This mapping should still be verified against checkpoint/dataset metadata before final reporting.

XGBoost provides binary classification probabilities through its own interface.

---

## 7. Existing Symbolic / Physics Layer

The project already contains an existing symbolic/physics decision layer conceptually.

DO NOT create a second independent symbolic layer.

The new framework must audit, preserve, validate and integrate the existing layer.

The existing variables requiring provenance investigation include:

```text
feasibility_flag
fuel_margin
cost_of_acting
cost_of_waiting
commit_decision
poc
deltav_required
time_to_TCA
maneuver_window_remaining
max_delta_v
```

For each determine:

* source,
* equation,
* algorithm,
* threshold,
* units,
* physical/empirical/model-derived status.

If the source cannot be established, mark it unresolved.

Do not invent an equation from observed values.

---

## 8. Hard Constraints

A relationship may become a hard symbolic constraint ONLY when supported by:

* actual project implementation,
* supplied documentation,
* authoritative domain specification,
* or otherwise traceable physical definition.

Do not convert statistical relationships into hard constraints.

Do not convert learned model behavior into physics.

Do not create duplicate symbolic rules.

---

## 9. Causal Objective

The intended scientific question is:

> Given the conjunction state at timestep t, what is the difference between choosing ACT NOW and choosing WAIT, and what are the consequences for future physically meaningful outcomes?

Do not assume that `commit_decision` is a randomized treatment.

Determine whether actual treatment/intervention data exists.

If not, clearly distinguish structural counterfactual modeling from experimentally verified causal effects.

---

## 10. Scientific Separation

Maintain these distinctions:

```text
Prediction
    ≠
XAI
    ≠
Causal inference
    ≠
Counterfactual modeling
    ≠
Physics validation
```

The final pipeline connects them but does not conflate them.

---

## 11. Primary XAI Methods

Neural models:

```text
Integrated Gradients / Captum
```

XGBoost:

```text
TreeSHAP
```

XAI must target the actual selected model output.

---

## 12. Temporal Requirement

The dataset is temporal.

For an intervention at timestep `t`, only information available at `t` may define the factual intervention state.

Future observations must not leak into the decision state.

Counterfactual future trajectories require explicit structural mechanisms.

---

## 13. Final Research Pipeline

The intended final flow is:

```text
ACTUAL DATASET
      ↓
ACTUAL SIX TRAINED MODELS
      ↓
MODEL PREDICTIONS
      ↓
MODEL-FAITHFUL XAI
      ↓
CAUSAL IDENTIFICATION
      ↓
STRUCTURAL COUNTERFACTUAL
      ↓
EXISTING SYMBOLIC/PHYSICS VALIDATION
      ↓
AUDITABLE DECISION ANALYSIS
      ↓
RESEARCH ARTIFACTS + REPORTS
```

---

## 14. Evidence Rule

When anything is uncertain:

```text
inspect actual resource
        ↓
inspect actual checkpoint
        ↓
inspect actual dataset
        ↓
inspect existing implementation/documentation
        ↓
only then consider methodological assumptions
```

Never guess first.
