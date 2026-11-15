"""KEPLER: Lunar Landing Intelligence & Horizon Decision Studio - FastAPI Main Application."""

import logging
from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager

from app.api.routes import router
from app.scientific.spice_service import ensure_kernels_loaded, unload_kernels
from app.scientific.terrain import terrain_engine
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("kepler")


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """Startup and shutdown lifecycle manager for NASA datasets and kernels."""
    logger.info("Initializing KEPLER Scientific Engine...")
    try:
        ensure_kernels_loaded()
        logger.info("NASA NAIF SPICE kernels loaded.")
    except (RuntimeError, OSError, ValueError) as e:
        logger.error(f"Failed to load SPICE kernels: {e}")

    try:
        terrain_engine.load()
        if terrain_engine.is_real_data_active:
            logger.info("NASA LRO LOLA DEM memory-mapping active.")
        else:
            logger.info("Using high-fidelity validated lunar topography model.")
    except (RuntimeError, OSError, ValueError) as e:
        logger.warning(f"Error loading LOLA DEM: {e}")

    yield

    logger.info("Shutting down KEPLER Scientific Engine...")
    try:
        unload_kernels()
    except (RuntimeError, OSError) as e:
        logger.warning(f"Error clearing kernels: {e}")


app = FastAPI(
    title="KEPLER API",
    description=(
        "Lunar Landing Intelligence & Horizon Decision Studio. "
        "NASA Space Apps Challenge 2026. "
        "Provides high-precision terrain-aware solar illumination, "
        "direct-to-Earth communication windows, and HORIZON REPLAY synchronized site comparisons."
    ),
    version="1.0.0",
    lifespan=lifespan,
)

# CORS security configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "*",
    ],
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)

# Mount REST API
app.include_router(router)


@app.get("/")
def root_status() -> JSONResponse:
    """Root status endpoint providing links to documentation."""
    return JSONResponse(
        content={
            "product": "KEPLER",
            "full_name": "Lunar Landing Intelligence & Horizon Decision Studio",
            "tagline": "See the horizon. Understand the opportunity. Make the decision.",
            "challenge": "NASA Space Apps Challenge 2026 — Lunar Landing Site Navigator",
            "documentation": "/docs",
            "status": "online",
            "lola_dem_active": terrain_engine.is_real_data_active,
        }
    )
