"""NASA NAIF SPICE ephemeris calculations and celestial geometry service."""

import logging
from typing import Any

import numpy as np
import spiceypy as sp
from app.core.config import (
    ABERRATION_CORRECTION,
    EARTH_BODY_NAME,
    EARTH_EQUATORIAL_RADIUS_KM,
    EPHEMERIS_KERNEL,
    LEAPSECONDS_KERNEL,
    LUNAR_BODY_NAME,
    LUNAR_FRAME_NAME,
    PLANETARY_CONSTANTS_KERNEL,
    SOLAR_RADIUS_KM,
    SUN_BODY_NAME,
)
from app.scientific.coordinates import (
    cartesian_to_lat_lon,
    compute_topocentric_basis,
    lat_lon_to_cartesian_km,
    project_to_topocentric,
)

logger = logging.getLogger("lunar_atlas.spice")

_KERNELS_LOADED = False


def ensure_kernels_loaded() -> None:
    """Ensure standard SPICE kernels are loaded into the CSPICE kernel pool."""
    global _KERNELS_LOADED
    if _KERNELS_LOADED:
        return

    for kernel_path in (LEAPSECONDS_KERNEL, PLANETARY_CONSTANTS_KERNEL, EPHEMERIS_KERNEL):
        if not kernel_path.exists():
            raise FileNotFoundError(f"Required SPICE kernel missing: {kernel_path}")
        sp.furnsh(str(kernel_path))
        logger.info(f"Loaded SPICE kernel: {kernel_path.name}")

    _KERNELS_LOADED = True


def unload_kernels() -> None:
    """Clear all loaded kernels from the CSPICE kernel pool."""
    global _KERNELS_LOADED
    sp.kclear()
    _KERNELS_LOADED = False
    logger.info("Cleared CSPICE kernel pool.")


def utc_to_et(utc_str: str) -> float:
    """Convert UTC ISO-8601 string to Ephemeris Time (ET / TDB seconds past J2000)."""
    ensure_kernels_loaded()
    return float(sp.str2et(utc_str))


def et_to_utc(et: float, fmt: str = "ISOC") -> str:
    """Convert Ephemeris Time to ISO UTC string."""
    ensure_kernels_loaded()
    return str(sp.et2utc(et, fmt, 3))


def get_body_position_iau_moon(target_name: str, et: float) -> tuple[np.ndarray, float]:
    """Get position of target relative to Moon in Moon-fixed IAU_MOON frame.

    Args:
        target_name: "SUN" or "EARTH"
        et: Ephemeris Time seconds past J2000

    Returns:
        (position_km_3d, light_time_seconds)
    """
    ensure_kernels_loaded()
    state, lt = sp.spkezr(
        target_name, et, LUNAR_FRAME_NAME, ABERRATION_CORRECTION, LUNAR_BODY_NAME
    )
    return np.array(state[:3], dtype=np.float64), float(lt)


def get_sub_solar_point(et: float) -> tuple[float, float]:
    """Calculate sub-solar point coordinates (lat_deg, lon_deg) on the Moon."""
    sun_pos, _ = get_body_position_iau_moon(SUN_BODY_NAME, et)
    lat_deg, lon_deg, _ = cartesian_to_lat_lon(sun_pos)
    return lat_deg, lon_deg


def get_sub_earth_point(et: float) -> tuple[float, float]:
    """Calculate sub-Earth point coordinates (lat_deg, lon_deg) on the Moon (lunar libration)."""
    earth_pos, _ = get_body_position_iau_moon(EARTH_BODY_NAME, et)
    lat_deg, lon_deg, _ = cartesian_to_lat_lon(earth_pos)
    return lat_deg, lon_deg


def calculate_apparent_radius_deg(radius_km: float, distance_km: float) -> float:
    """Calculate apparent angular semi-diameter in degrees."""
    if distance_km <= radius_km:
        return 90.0
    return float(np.degrees(np.arcsin(radius_km / distance_km)))


def get_topocentric_celestial_geometry(
    lat_deg: float,
    lon_deg: float,
    elevation_m: float,
    observer_height_m: float,
    et: float,
) -> dict[str, Any]:
    """Calculate complete topocentric Sun and Earth geometry for a lunar site at epoch et.

    Args:
        lat_deg: Site latitude (-90 to +90)
        lon_deg: Site east longitude (-180 to +180)
        elevation_m: Ground elevation above 1737.4 km reference sphere (m)
        observer_height_m: Height of observer mast above local ground (m)
        et: Ephemeris Time

    Returns:
        Dictionary with Sun and Earth topocentric positions, distances, and angular sizes.
    """
    ensure_kernels_loaded()

    # Observer position in IAU_MOON Cartesian coordinates (km)
    total_elevation_m = elevation_m + observer_height_m
    site_pos_km = lat_lon_to_cartesian_km(lat_deg, lon_deg, total_elevation_m)
    basis = compute_topocentric_basis(lat_deg, lon_deg)

    # Celestial body positions in IAU_MOON (km)
    sun_pos_km, sun_lt = get_body_position_iau_moon(SUN_BODY_NAME, et)
    earth_pos_km, earth_lt = get_body_position_iau_moon(EARTH_BODY_NAME, et)

    # Topocentric projections
    sun_az, sun_el, sun_dist = project_to_topocentric(sun_pos_km, site_pos_km, basis)
    earth_az, earth_el, earth_dist = project_to_topocentric(earth_pos_km, site_pos_km, basis)

    # Apparent angular radii (degrees)
    sun_angular_radius = calculate_apparent_radius_deg(SOLAR_RADIUS_KM, sun_dist)
    earth_angular_radius = calculate_apparent_radius_deg(EARTH_EQUATORIAL_RADIUS_KM, earth_dist)

    # Sub-solar and sub-Earth points
    sub_solar_lat, sub_solar_lon = get_sub_solar_point(et)
    sub_earth_lat, sub_earth_lon = get_sub_earth_point(et)

    return {
        "et": et,
        "utc": et_to_utc(et),
        "site": {
            "latitude_deg": lat_deg,
            "longitude_deg": lon_deg,
            "ground_elevation_m": elevation_m,
            "observer_height_m": observer_height_m,
            "total_elevation_m": total_elevation_m,
        },
        "sun": {
            "azimuth_deg": sun_az,
            "elevation_deg": sun_el,
            "distance_km": sun_dist,
            "angular_radius_deg": sun_angular_radius,
            "light_time_seconds": sun_lt,
        },
        "earth": {
            "azimuth_deg": earth_az,
            "elevation_deg": earth_el,
            "distance_km": earth_dist,
            "angular_radius_deg": earth_angular_radius,
            "light_time_seconds": earth_lt,
        },
        "lunar_orientation": {
            "sub_solar_lat_deg": sub_solar_lat,
            "sub_solar_lon_deg": sub_solar_lon,
            "sub_earth_lat_deg": sub_earth_lat,
            "sub_earth_lon_deg": sub_earth_lon,
        },
    }
