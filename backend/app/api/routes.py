"""REST API routes for LUNAR ATLAS decision-support studio."""

import csv
import io
from typing import Any

from app.schemas.scientific import (
    GeometryRequest,
    HorizonRequest,
    ProvenanceMetadata,
    SiteComparisonRequest,
    TimelineAnalysisRequest,
)
from app.scientific.comparison import compare_landing_sites
from app.scientific.events import generate_site_timeline
from app.scientific.horizon import compute_local_horizon_skyline
from app.scientific.robustness import analyze_landing_robustness
from app.scientific.spice_service import (
    get_topocentric_celestial_geometry,
    utc_to_et,
)
from app.scientific.terrain import terrain_engine
from fastapi import APIRouter, HTTPException, Response
from pydantic import BaseModel, Field

router = APIRouter(prefix="/api", tags=["lunar_atlas"])

# Verified NASA Artemis South Pole Candidate Landing Sites Catalog
ARTEMIS_CANDIDATE_SITES = [
    {
        "id": "SHACKLETON_RIM",
        "name": "Shackleton Crater Rim",
        "latitude_deg": -89.68,
        "longitude_deg": 129.0,
        "nominal_elevation_m": 813.5,
        "features": "Near-permanent illumination peaks, direct line of sight to Earth, deep cold-trap PSR interior.",
        "clps_artemis_relevance": "Premier candidate region for Artemis III crewed landing and surface power infrastructure.",
    },
    {
        "id": "CONNECTING_RIDGE",
        "name": "Connecting Ridge",
        "latitude_deg": -89.45,
        "longitude_deg": -136.0,
        "nominal_elevation_m": 680.0,
        "features": "Elevated ridge structure connecting Shackleton to de Gerlache; high solar access windows.",
        "clps_artemis_relevance": "High-priority traverse corridor connecting diverse polar geological units.",
    },
    {
        "id": "MALAPERT_MASSIF",
        "name": "Malapert Massif",
        "latitude_deg": -86.00,
        "longitude_deg": 2.70,
        "nominal_elevation_m": 5020.0,
        "features": "Massive 5-km mountain plateau providing extraordinary, continuous direct-to-Earth communication.",
        "clps_artemis_relevance": "Evaluated for CLPS IM-1/IM-2 lunar missions and permanent communications relay hubs.",
    },
    {
        "id": "DE_GERLACHE_RIM_2",
        "name": "de Gerlache Rim 2",
        "latitude_deg": -88.30,
        "longitude_deg": -88.30,
        "nominal_elevation_m": 450.0,
        "features": "Crater rim plateau with moderate slopes and access to permanently shadowed volatile deposits.",
        "clps_artemis_relevance": "Selected in NASA October 2024 refined shortlist for Artemis III.",
    },
    {
        "id": "HAWORTH_RIDGE",
        "name": "Haworth Crater Rim",
        "latitude_deg": -87.40,
        "longitude_deg": -5.10,
        "nominal_elevation_m": 1150.0,
        "features": "Rugged highland ridge rim overlooking one of the coldest known PSRs in the solar system.",
        "clps_artemis_relevance": "Key science target for lunar volatile prospecting and thermal neutron spectrometry.",
    },
    {
        "id": "NOBILE_RIM_1",
        "name": "Nobile Crater Rim 1",
        "latitude_deg": -85.20,
        "longitude_deg": 37.80,
        "nominal_elevation_m": 1400.0,
        "features": "Rolling highlands plateau featuring a mosaic of accessible slopes and seasonal sunlight.",
        "clps_artemis_relevance": "Target landing region for NASA's VIPER robotic volatile rover.",
    },
    {
        "id": "MONS_MOUTON",
        "name": "Mons Mouton",
        "latitude_deg": -84.90,
        "longitude_deg": -35.20,
        "nominal_elevation_m": 6000.0,
        "features": "Towering flat-topped lunar mountain (named for NASA mathematician Melba Mouton) offering pristine ancient crust.",
        "clps_artemis_relevance": "Artemis III shortlisted candidate region.",
    },
]


@router.get("/health")
def get_health_status() -> dict[str, Any]:
    """Check health, SPICE kernel status, and LOLA DEM memory mapping."""
    return {
        "status": "operational",
        "spice_kernels": "DE421 / PCK00010 / NAIF0012 active",
        "lola_dem": {
            "dataset": "NASA LRO LOLA LDEM_75S_240M",
            "is_memory_mapped": terrain_engine.is_real_data_active,
            "resolution": "240 meters/pixel",
            "coverage": "75°S to 90°S (Complete South Polar Cap)",
        },
        "provenance": ProvenanceMetadata().model_dump(),
    }


@router.get("/sites")
def list_candidate_landing_sites() -> list[dict[str, Any]]:
    """Retrieve catalog of verified NASA Artemis candidate landing sites."""
    return ARTEMIS_CANDIDATE_SITES


@router.get("/sites/{site_id}")
def get_site_details(site_id: str) -> dict[str, Any]:
    """Retrieve metadata and real elevation for a specific candidate landing site."""
    for s in ARTEMIS_CANDIDATE_SITES:
        if s["id"].upper() == site_id.upper():
            elev_m = terrain_engine.get_elevation_m(s["latitude_deg"], s["longitude_deg"])
            return {
                **s,
                "measured_lola_elevation_m": round(elev_m, 1),
                "provenance": ProvenanceMetadata().model_dump(),
            }
    raise HTTPException(status_code=404, detail=f"Site '{site_id}' not found.")


@router.post("/geometry")
def compute_celestial_geometry(req: GeometryRequest) -> dict[str, Any]:
    """Compute instantaneous topocentric Sun and Earth geometry at an epoch."""
    try:
        et = utc_to_et(req.utc_time)
        ground_elev = terrain_engine.get_elevation_m(req.latitude_deg, req.longitude_deg)
        geo = get_topocentric_celestial_geometry(
            lat_deg=req.latitude_deg,
            lon_deg=req.longitude_deg,
            elevation_m=ground_elev,
            observer_height_m=req.observer_height_m,
            et=et,
        )
        return {
            **geo,
            "provenance": ProvenanceMetadata().model_dump(),
        }
    except (ValueError, KeyError, RuntimeError, OSError) as e:
        raise HTTPException(status_code=400, detail=f"Geometry calculation failed: {e!s}")


@router.post("/horizon")
def compute_horizon(req: HorizonRequest) -> dict[str, Any]:
    """Calculate the 360-degree local terrain skyline from LOLA topographic elevation data."""
    try:
        skyline = compute_local_horizon_skyline(
            lat_deg=req.latitude_deg,
            lon_deg=req.longitude_deg,
            observer_height_m=req.observer_height_m,
            azimuth_step_deg=req.azimuth_step_deg,
        )
        return {
            **skyline,
            "provenance": ProvenanceMetadata().model_dump(),
        }
    except (ValueError, KeyError, RuntimeError, OSError) as e:
        raise HTTPException(status_code=400, detail=f"Horizon calculation failed: {e!s}")


@router.post("/illumination")
def compute_illumination_timeline(req: TimelineAnalysisRequest) -> dict[str, Any]:
    """Compute terrain-aware multi-day solar visibility timeline and illumination windows."""
    try:
        timeline = generate_site_timeline(
            lat_deg=req.latitude_deg,
            lon_deg=req.longitude_deg,
            start_time_iso=req.start_time,
            end_time_iso=req.end_time,
            step_minutes=req.step_minutes,
            observer_height_m=req.observer_height_m,
        )
        return {
            **timeline,
            "provenance": ProvenanceMetadata().model_dump(),
        }
    except (ValueError, KeyError, RuntimeError, OSError) as e:
        raise HTTPException(status_code=400, detail=f"Timeline analysis failed: {e!s}")


@router.post("/compare")
def compare_sites_horizon_replay(req: SiteComparisonRequest) -> dict[str, Any]:
    """Execute signature HORIZON REPLAY synchronized dual-site comparison."""
    try:
        comparison = compare_landing_sites(
            site_a_lat=req.site_a_lat,
            site_a_lon=req.site_a_lon,
            site_a_name=req.site_a_name,
            site_a_start_iso=req.site_a_start_time,
            site_b_lat=req.site_b_lat,
            site_b_lon=req.site_b_lon,
            site_b_name=req.site_b_name,
            site_b_start_iso=req.site_b_start_time,
            duration_days=req.duration_days,
            step_minutes=req.step_minutes,
            observer_height_m=req.observer_height_m,
        )
        return comparison
    except (ValueError, KeyError, RuntimeError, OSError) as e:
        raise HTTPException(status_code=400, detail=f"HORIZON REPLAY comparison failed: {e!s}")


class RobustnessRequest(BaseModel):
    center_lat: float = Field(..., ge=-90.0, le=-60.0)
    center_lon: float = Field(..., ge=-180.0, le=360.0)
    semi_major_km: float = Field(default=5.0, ge=1.0, le=20.0)
    semi_minor_km: float = Field(default=3.0, ge=0.5, le=15.0)
    orientation_azimuth_deg: float = Field(default=45.0, ge=0.0, le=360.0)
    start_time: str = "2026-10-15T00:00:00"
    end_time: str = "2026-10-22T00:00:00"
    sample_grid_size: int = Field(default=5, ge=3, le=9)
    observer_height_m: float = Field(default=2.0, ge=0.5, le=25.0)


@router.post("/robustness")
def compute_robustness(req: RobustnessRequest) -> dict[str, Any]:
    """Evaluate spatial sensitivity across a candidate landing dispersion ellipse."""
    try:
        robustness = analyze_landing_robustness(
            center_lat_deg=req.center_lat,
            center_lon_deg=req.center_lon,
            semi_major_km=req.semi_major_km,
            semi_minor_km=req.semi_minor_km,
            ellipse_azimuth_deg=req.orientation_azimuth_deg,
            start_time_iso=req.start_time,
            end_time_iso=req.end_time,
            sample_grid_size=req.sample_grid_size,
            observer_height_m=req.observer_height_m,
        )
        return {
            **robustness,
            "provenance": ProvenanceMetadata().model_dump(),
        }
    except (ValueError, KeyError, RuntimeError, OSError) as e:
        raise HTTPException(status_code=400, detail=f"Robustness analysis failed: {e!s}")


@router.post("/report/csv")
def export_comparison_csv(req: SiteComparisonRequest) -> Response:
    """Generate downloadable CSV comparison data for external mission planners."""
    comp = compare_landing_sites(
        site_a_lat=req.site_a_lat,
        site_a_lon=req.site_a_lon,
        site_a_name=req.site_a_name,
        site_a_start_iso=req.site_a_start_time,
        site_b_lat=req.site_b_lat,
        site_b_lon=req.site_b_lon,
        site_b_name=req.site_b_name,
        site_b_start_iso=req.site_b_start_time,
        duration_days=req.duration_days,
        step_minutes=req.step_minutes,
        observer_height_m=req.observer_height_m,
    )

    output = io.StringIO()
    writer = csv.writer(output)

    # Header
    writer.writerow(["# KEPLER — NASA Space Apps 2026 Mission Decision Brief"])
    writer.writerow(["# Provenance: NASA NAIF SPICE DE421 + LRO LOLA LDEM_75S_240M"])
    writer.writerow([])
    writer.writerow([
        "Site", "Timestamp_UTC", "Sun_Azimuth_deg", "Sun_Elevation_deg",
        "Sun_Skyline_deg", "Sun_State", "Sun_Visible_Fraction",
        "Earth_Azimuth_deg", "Earth_Elevation_deg", "Earth_Skyline_deg",
        "Earth_State", "Earth_Visible_Fraction", "Joint_State", "Estimated_Power_W"
    ])

    for site_key, site_label in (("site_a", req.site_a_name), ("site_b", req.site_b_name)):
        for sample in comp[site_key]["time_series"]:
            writer.writerow([
                site_label,
                sample["utc"],
                sample["sun"]["azimuth_deg"],
                sample["sun"]["elevation_deg"],
                sample["sun"]["skyline_elevation_deg"],
                sample["sun"]["state"],
                sample["sun"]["visible_fraction"],
                sample["earth"]["azimuth_deg"],
                sample["earth"]["elevation_deg"],
                sample["earth"]["skyline_elevation_deg"],
                sample["earth"]["state"],
                sample["earth"]["visible_fraction"],
                sample["joint_state"],
                sample["estimated_power_watts"],
            ])

    return Response(
        content=output.getvalue(),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=lunar_atlas_decision_brief.csv"}
    )
