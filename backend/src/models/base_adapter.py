from abc import ABC, abstractmethod
import torch
import numpy as np
import pandas as pd
from typing import Dict, List, Tuple, Any, Optional

class ResearchModelAdapter(ABC):
    """
    Common Research Model Adapter Interface.
    Enforces unified prediction, probability, feature metadata, and XAI abstraction across all models.
    """
    def __init__(self, model_name: str, config: dict):
        self.model_name = model_name
        self.config = config
        self.model = None
        self.scaler = None
        self.feature_names: List[str] = []
        self.is_loaded = False
        self.device = config.get("project", {}).get("device", "cpu")

    @abstractmethod
    def load(self, checkpoint_path: Optional[str] = None) -> None:
        """Loads model weights and metadata from checkpoint."""
        pass

    @abstractmethod
    def validate(self) -> bool:
        """Runs a synthetic inference pass to validate input/output interfaces."""
        pass

    @abstractmethod
    def preprocess(self, data: Any) -> Any:
        """Applies model-specific feature selection and scaling."""
        pass

    @abstractmethod
    def predict(self, x: Any, threshold: Optional[float] = None) -> np.ndarray:
        """Returns binary predictions (0=WAIT, 1=COMMIT)."""
        pass

    @abstractmethod
    def predict_proba(self, x: Any) -> np.ndarray:
        """Returns probability distribution over classes [P(WAIT), P(COMMIT)]."""
        pass

    def get_feature_names(self) -> List[str]:
        return self.feature_names

    def get_metadata(self) -> Dict[str, Any]:
        return {
            "model_name": self.model_name,
            "is_loaded": self.is_loaded,
            "feature_count": len(self.feature_names),
            "features": self.feature_names,
            "device": self.device
        }
