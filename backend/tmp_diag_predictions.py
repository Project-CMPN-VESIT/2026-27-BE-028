import random
import sys
from importlib.util import module_from_spec, spec_from_file_location
from pathlib import Path

import torch

backend_dir = Path(r"C:\Users\bhoom\capstone\CapstoneProject-Group-28\backend")
sys.path.insert(0, str(backend_dir))

spec = spec_from_file_location("inference_app", backend_dir / "app.py")
if spec is None or spec.loader is None:
    raise RuntimeError("Could not load backend app.py for diagnostics")

inference_app = module_from_spec(spec)
spec.loader.exec_module(inference_app)

from symbolic_layer import apply_feasibility_mask, build_feasibility_mask  # noqa: E402

n = 200
same12 = 0
same23 = 0
same13 = 0
mask_all_true = 0

for _ in range(n):
    sequence = random.choice(inference_app.sequences)
    x = torch.tensor(sequence, dtype=torch.float32).unsqueeze(0)

    with torch.no_grad():
        logits1 = inference_app.model_case1(x)
        logits2 = inference_app.model_case2(x)

        step1 = int(torch.argmax(logits1, dim=-1).item())
        step2 = int(torch.argmax(logits2, dim=-1).item())

        mask = build_feasibility_mask(x, inference_app.FEATURE_IDX)
        masked_probs = apply_feasibility_mask(logits2, mask)
        step3 = int(torch.argmax(masked_probs, dim=-1).item())

    if step1 == step2:
        same12 += 1
    if step2 == step3:
        same23 += 1
    if step1 == step3:
        same13 += 1
    if bool(mask.all()):
        mask_all_true += 1

print({
    "n": n,
    "same12": same12,
    "same23": same23,
    "same13": same13,
    "mask_all_true": mask_all_true,
})
