"""
FastAPI main application for Satellite Collision Avoidance AI System.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
import logging
from pathlib import Path

from app.routes import decision
from app.services.data_processor import get_data_processor

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)

logger = logging.getLogger(__name__)

# Create FastAPI app
app = FastAPI(
    title="Satellite Collision Avoidance AI Decision System",
    description="""
    AI-based decision system for optimal satellite collision avoidance maneuver timing under uncertainty.

    This system combines:
    - Orbital simulation (Skyfield)
    - Uncertainty modeling
    - Cost-based decision theory
    - Safety constraint enforcement
    - Causal reasoning for explainability

    Research project demonstrating advanced AI decision-making for space operations.
    """,
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS middleware for frontend access
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify exact origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API routes
app.include_router(
    decision.router,
    prefix="/api",
    tags=["Decision System"]
)


@app.on_event("startup")
async def startup_event():
    """
    Initialize services on application startup.
    """
    logger.info("=" * 80)
    logger.info("Starting Satellite Collision Avoidance AI Decision System")
    logger.info("=" * 80)

    try:
        # Initialize data processor (loads dataset)
        processor = get_data_processor()
        logger.info("✓ Data processor initialized")

        # Log dataset info
        stats = processor.get_dataset_statistics()
        logger.info(f"✓ Dataset loaded: {stats['total_observations']} observations, "
                   f"{stats['unique_events']} unique events")

        logger.info("=" * 80)
        logger.info("System ready for decision-making!")
        logger.info("API documentation available at: http://localhost:8000/docs")
        logger.info("Frontend interface available at: http://localhost:8000/")
        logger.info("=" * 80)

    except Exception as e:
        logger.error(f"✗ Startup failed: {str(e)}", exc_info=True)
        raise


@app.on_event("shutdown")
async def shutdown_event():
    """
    Cleanup on application shutdown.
    """
    logger.info("Shutting down Satellite Collision Avoidance AI System")


@app.get("/")
async def serve_frontend():
    """
    Serve the frontend HTML page.
    """
    frontend_path = Path(__file__).parent.parent / "frontend" / "index.html"
    if frontend_path.exists():
        return FileResponse(frontend_path)
    else:
        return {
            "message": "Satellite Collision Avoidance AI System API",
            "docs": "/docs",
            "api": "/api"
        }


# Mount static files for frontend
try:
    frontend_dir = Path(__file__).parent.parent / "frontend"
    if frontend_dir.exists():
        app.mount("/static", StaticFiles(directory=str(frontend_dir)), name="static")
except Exception as e:
    logger.warning(f"Could not mount frontend static files: {e}")


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )
