"""
Data processor for satellite conjunction dataset.

This module handles reading, parsing, and validating the satellite conjunction
dataset from CSV files.
"""

import pandas as pd
from typing import List, Optional
from pathlib import Path
import logging

from app.models.schema import (
    ConjunctionEvent,
    RelativePosition,
    CovarianceMatrix
)

logger = logging.getLogger(__name__)


class DataProcessor:
    """
    Processes satellite conjunction data from CSV files.

    Handles loading, parsing, validation, and conversion of raw dataset
    into structured ConjunctionEvent objects.
    """

    def __init__(self, dataset_path: str):
        """
        Initialize data processor.

        Args:
            dataset_path: Path to the CSV dataset file
        """
        self.dataset_path = Path(dataset_path)
        self.data: Optional[pd.DataFrame] = None

    def load_dataset(self) -> pd.DataFrame:
        """
        Load the conjunction dataset from CSV.

        Returns:
            DataFrame containing all conjunction events

        Raises:
            FileNotFoundError: If dataset file doesn't exist
            ValueError: If dataset has invalid format
        """
        if not self.dataset_path.exists():
            raise FileNotFoundError(f"Dataset not found at {self.dataset_path}")

        try:
            self.data = pd.read_csv(self.dataset_path)
            logger.info(f"Loaded dataset with {len(self.data)} rows")
            return self.data
        except Exception as e:
            logger.error(f"Error loading dataset: {e}")
            raise ValueError(f"Failed to load dataset: {e}")

    def validate_dataset(self) -> bool:
        """
        Validate that dataset contains required columns.

        Returns:
            True if valid, raises ValueError otherwise
        """
        required_columns = [
            'Event_ID',
            'Primary_Object_ID',
            'Secondary_Object_ID',
            'Observation_Time',
            'Time_to_TCA_hours',
            'Relative_Position_X_m',
            'Relative_Position_Y_m',
            'Relative_Position_Z_m',
            'Relative_Velocity_km_s',
            'Miss_Distance_m',
            'Covariance_X_m',
            'Covariance_Y_m',
            'Covariance_Z_m',
            'Probability_of_Collision',
            'Hard_Body_Radius_m',
            'Delta_V_required_m_s'
        ]

        if self.data is None:
            raise ValueError("Dataset not loaded. Call load_dataset() first.")

        missing_columns = set(required_columns) - set(self.data.columns)
        if missing_columns:
            raise ValueError(f"Missing required columns: {missing_columns}")

        logger.info("Dataset validation successful")
        return True

    def parse_row(self, row: pd.Series) -> ConjunctionEvent:
        """
        Parse a single CSV row into a ConjunctionEvent object.

        Args:
            row: Pandas series representing one row of data

        Returns:
            ConjunctionEvent object with validated data
        """
        # Parse relative position
        relative_position = RelativePosition(
            x=float(row['Relative_Position_X_m']),
            y=float(row['Relative_Position_Y_m']),
            z=float(row['Relative_Position_Z_m'])
        )

        # Parse covariance matrix (diagonal elements)
        covariance = CovarianceMatrix(
            x=float(row['Covariance_X_m']),
            y=float(row['Covariance_Y_m']),
            z=float(row['Covariance_Z_m'])
        )

        # Create conjunction event
        event = ConjunctionEvent(
            event_id=int(row['Event_ID']),
            primary_object_id=int(row['Primary_Object_ID']),
            secondary_object_id=int(row['Secondary_Object_ID']),
            observation_time=str(row['Observation_Time']),
            time_to_tca=float(row['Time_to_TCA_hours']),
            relative_position=relative_position,
            relative_velocity=float(row['Relative_Velocity_km_s']),
            miss_distance=float(row['Miss_Distance_m']),
            covariance=covariance,
            probability_of_collision=float(row['Probability_of_Collision']),
            hard_body_radius=float(row['Hard_Body_Radius_m']),
            delta_v_required=float(row['Delta_V_required_m_s'])
        )

        return event

    def get_event_by_id(self, event_id: int) -> Optional[ConjunctionEvent]:
        """
        Retrieve a specific event by ID.

        Args:
            event_id: Event identifier

        Returns:
            ConjunctionEvent if found, None otherwise
        """
        if self.data is None:
            self.load_dataset()
            self.validate_dataset()

        event_rows = self.data[self.data['Event_ID'] == event_id]

        if event_rows.empty:
            logger.warning(f"Event {event_id} not found")
            return None

        # Return the most recent observation for this event
        latest_row = event_rows.iloc[-1]
        return self.parse_row(latest_row)

    def get_all_events_for_id(self, event_id: int) -> List[ConjunctionEvent]:
        """
        Get all observations (time series) for a specific event.

        Args:
            event_id: Event identifier

        Returns:
            List of ConjunctionEvent objects sorted by observation time
        """
        if self.data is None:
            self.load_dataset()
            self.validate_dataset()

        event_rows = self.data[self.data['Event_ID'] == event_id]

        if event_rows.empty:
            return []

        # Sort by time to TCA (descending = earliest observations first)
        event_rows = event_rows.sort_values('Time_to_TCA_hours', ascending=False)

        events = [self.parse_row(row) for _, row in event_rows.iterrows()]
        return events

    def get_all_events(self) -> List[ConjunctionEvent]:
        """
        Get all events from the dataset.

        Returns:
            List of all ConjunctionEvent objects
        """
        if self.data is None:
            self.load_dataset()
            self.validate_dataset()

        events = [self.parse_row(row) for _, row in self.data.iterrows()]
        return events

    def get_unique_event_ids(self) -> List[int]:
        """
        Get list of unique event IDs in dataset.

        Returns:
            Sorted list of unique event identifiers
        """
        if self.data is None:
            self.load_dataset()
            self.validate_dataset()

        return sorted(self.data['Event_ID'].unique().tolist())

    def get_dataset_statistics(self) -> dict:
        """
        Compute summary statistics for the dataset.

        Returns:
            Dictionary with dataset statistics
        """
        if self.data is None:
            self.load_dataset()
            self.validate_dataset()

        stats = {
            'total_observations': len(self.data),
            'unique_events': self.data['Event_ID'].nunique(),
            'unique_primary_objects': self.data['Primary_Object_ID'].nunique(),
            'unique_secondary_objects': self.data['Secondary_Object_ID'].nunique(),
            'pc_statistics': {
                'mean': float(self.data['Probability_of_Collision'].mean()),
                'max': float(self.data['Probability_of_Collision'].max()),
                'min': float(self.data['Probability_of_Collision'].min()),
                'std': float(self.data['Probability_of_Collision'].std())
            },
            'time_to_tca_statistics': {
                'mean': float(self.data['Time_to_TCA_hours'].mean()),
                'max': float(self.data['Time_to_TCA_hours'].max()),
                'min': float(self.data['Time_to_TCA_hours'].min())
            },
            'delta_v_statistics': {
                'mean': float(self.data['Delta_V_required_m_s'].mean()),
                'max': float(self.data['Delta_V_required_m_s'].max()),
                'min': float(self.data['Delta_V_required_m_s'].min())
            }
        }

        return stats


# Singleton instance for global access
_processor_instance: Optional[DataProcessor] = None


def get_data_processor(dataset_path: str = "data/satellite_conjunction_dataset.csv") -> DataProcessor:
    """
    Get or create the global data processor instance.

    Args:
        dataset_path: Path to dataset (relative to backend root)

    Returns:
        DataProcessor instance
    """
    global _processor_instance

    if _processor_instance is None:
        _processor_instance = DataProcessor(dataset_path)
        _processor_instance.load_dataset()
        _processor_instance.validate_dataset()
        logger.info("Data processor initialized")

    return _processor_instance
