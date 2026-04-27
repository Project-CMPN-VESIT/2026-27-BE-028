"""
AI-based Satellite Collision Avoidance Decision System
"""

__version__ = "1.0.0"

# Re-export FastAPI app for `uvicorn app:app --reload`.
# Prefer the root-level inference API (`backend/app.py`) when present,
# and fall back to package API (`app.main`) otherwise.
from importlib.util import module_from_spec, spec_from_file_location
from pathlib import Path

_root_app_path = Path(__file__).resolve().parent.parent / "app.py"

if _root_app_path.exists():
	_spec = spec_from_file_location("root_inference_app", _root_app_path)
	if _spec and _spec.loader:
		_module = module_from_spec(_spec)
		_spec.loader.exec_module(_module)
		app = _module.app
	else:
		from app.main import app
else:
	from app.main import app
