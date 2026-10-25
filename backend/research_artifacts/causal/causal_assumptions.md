# Causal Identification Assumptions & Structural Specification
**Domain:** Satellite Conjunction Assessment & Maneuver Commitment  
**Framework:** Structural Causal Model (SCM) & Astrodynamic DAG

## 1. Causal Graph & Physical Relationships
- **Orbital State ($a, e, i$) $\to$ Relative Kinematics ($\mathbf{r}, \mathbf{v}$):** Established by Two-Body Astrodynamics and Hill-Clohessy-Wiltshire equations.
- **Sensor Noise & Space Weather $\to$ Covariance Matrices:** Established by Kalman filter tracking uncertainty dynamics.
- **Covariance + Hard Body Radius $\to$ PoC:** Evaluated by Foster / NASA 2D/3D collision integral over covariance ellipsoids.
- **$\Delta V_{req} \to$ Feasibility Flag & Fuel Margin:** Hard physical constraint $\Delta V_{req} \le \Delta V_{max}$.
- **Utilities $\to$ Supervised Decision:** Decision label generated balancing risk cost and maneuver cost.

## 2. Structural Counterfactual Propagation
Physical interventions are propagated through structural kinematics:
$$\Delta v_{req}^{cf} = \Delta v_{req}^{fact} \cdot \left(\frac{t_{TCA}^{fact}}{t_{TCA}^{cf}}\right)$$
$$\text{fuel\_margin}^{cf} = \frac{\Delta v_{max} - \Delta v_{req}^{cf}}{\Delta v_{max}}$$

## 3. Identification & Unconfoundedness
Because `commit_decision` is a supervised simulation target rather than an experimental trial allocation, counterfactual reasoning requires physical structural models rather than naive regression on observational labels.
