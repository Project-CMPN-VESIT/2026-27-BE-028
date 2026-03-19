"""
API routes for collision avoidance decision system.
"""

from fastapi import APIRouter, HTTPException, Query
from typing import Optional
import logging

from app.models.schema import (
    DecisionOutput,
    DecisionRequest,
    ConjunctionEvent,
    HealthResponse
)
from app.services.decision_engine import get_decision_engine
from app.services.data_processor import get_data_processor
from app.utils import constants
from datetime import datetime

logger = logging.getLogger(__name__)

router = APIRouter()


@router.post("/decision", response_model=DecisionOutput)
async def make_decision(request: DecisionRequest):
    """
    Make collision avoidance decision for a conjunction event.

    This is the main API endpoint that orchestrates the entire
    AI decision-making pipeline.

    Args:
        request: DecisionRequest with event data and parameters

    Returns:
        DecisionOutput with complete analysis and recommendation

    Raises:
        HTTPException: If decision-making fails
    """
    try:
        logger.info(f"Received decision request for event {request.event.event_id}")

        # Get decision engine
        engine = get_decision_engine()

        # Make decision
        decision_output = engine.make_decision(
            event=request.event,
            fuel_available=request.fuel_available or constants.MAX_FUEL_CAPACITY
        )

        logger.info(
            f"Decision made for event {request.event.event_id}: "
            f"{decision_output.decision.value}"
        )

        return decision_output

    except Exception as e:
        logger.error(f"Error making decision: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Decision-making failed: {str(e)}"
        )


@router.get("/events/{event_id}", response_model=ConjunctionEvent)
async def get_event(event_id: int):
    """
    Retrieve a specific conjunction event from the dataset.

    Args:
        event_id: Event identifier

    Returns:
        ConjunctionEvent data

    Raises:
        HTTPException: If event not found
    """
    try:
        processor = get_data_processor()
        event = processor.get_event_by_id(event_id)

        if event is None:
            raise HTTPException(
                status_code=404,
                detail=f"Event {event_id} not found"
            )

        return event

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error retrieving event: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Failed to retrieve event: {str(e)}"
        )


@router.get("/events", response_model=list[int])
async def list_events():
    """
    List all available event IDs in the dataset.

    Returns:
        List of event IDs
    """
    try:
        processor = get_data_processor()
        event_ids = processor.get_unique_event_ids()
        return event_ids

    except Exception as e:
        logger.error(f"Error listing events: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Failed to list events: {str(e)}"
        )


@router.get("/dataset/stats")
async def get_dataset_statistics():
    """
    Get summary statistics for the dataset.

    Returns:
        Dictionary with dataset statistics
    """
    try:
        processor = get_data_processor()
        stats = processor.get_dataset_statistics()
        return stats

    except Exception as e:
        logger.error(f"Error computing statistics: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Failed to compute statistics: {str(e)}"
        )


@router.post("/evaluate/{event_id}", response_model=DecisionOutput)
async def evaluate_event_by_id(
    event_id: int,
    fuel_available: Optional[float] = Query(
        default=constants.MAX_FUEL_CAPACITY,
        description="Available fuel for maneuver (m/s)"
    )
):
    """
    Evaluate a specific event from the dataset by ID.

    Convenience endpoint that fetches event from dataset and evaluates it.

    Args:
        event_id: Event identifier
        fuel_available: Available fuel capacity

    Returns:
        DecisionOutput with complete analysis

    Raises:
        HTTPException: If event not found or evaluation fails
    """
    try:
        # Fetch event
        processor = get_data_processor()
        event = processor.get_event_by_id(event_id)

        if event is None:
            raise HTTPException(
                status_code=404,
                detail=f"Event {event_id} not found in dataset"
            )

        # Create request
        request = DecisionRequest(
            event=event,
            fuel_available=fuel_available
        )

        # Make decision
        engine = get_decision_engine()
        decision_output = engine.make_decision(
            event=event,
            fuel_available=fuel_available
        )

        return decision_output

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error evaluating event: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Evaluation failed: {str(e)}"
        )


@router.get("/health", response_model=HealthResponse)
async def health_check():
    """
    Health check endpoint.

    Returns:
        Health status information
    """
    return HealthResponse(
        status="healthy",
        version="1.0.0",
        timestamp=datetime.now().isoformat()
    )


@router.get("/")
async def root():
    """
    Root endpoint with API information.

    Returns:
        API information and usage guide
    """
    return {
        "name": "Satellite Collision Avoidance AI Decision System",
        "version": "1.0.0",
        "description": "AI-based decision system for optimal collision avoidance maneuver timing",
        "endpoints": {
            "POST /decision": "Make decision for a conjunction event",
            "POST /evaluate/{event_id}": "Evaluate event from dataset by ID",
            "GET /events": "List all available events",
            "GET /events/{event_id}": "Get specific event details",
            "GET /dataset/stats": "Get dataset statistics",
            "GET /health": "Health check"
        },
        "documentation": "/docs",
        "research": "Capstone Project - AI-based Collision Avoidance Decision System"
    }
