import torch
import torch.nn as nn

NRP_IDX = 19


class SymbolicParams:
    def __init__(self):
        self.K = 0.8
        self.lambda_feas = 5.0
        self.lambda_cost = 0.5


def compute_true_delta_v(delta_v_base, steps, K):
    return delta_v_base.unsqueeze(1) * torch.exp(K * steps)


def build_feasibility_mask(X, feature_idx, params=None):
    feasible_idx = feature_idx.get('feasible')
    if feasible_idx is not None and feasible_idx < X.shape[-1]:
        return X[:, :, feasible_idx] >= 0.5

    # Fallback: if feasible is unavailable in the feature tensor, enforce NRP at index 19.
    steps = torch.arange(X.shape[1], device=X.device)
    return steps.unsqueeze(0) < NRP_IDX


def apply_feasibility_mask(logits, mask):
    mask = mask.bool()
    masked_logits = logits.clone()

    # For infeasible timesteps, force WAIT by suppressing COMMIT logit only.
    masked_logits[..., 1] = masked_logits[..., 1].masked_fill(~mask, float('-inf'))

    return torch.softmax(masked_logits, dim=-1)