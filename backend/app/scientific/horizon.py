"""Terrain horizon skyline raycasting and geometric obstruction classifier."""

import logging
from typing import Any

import numpy as np
from app.core.config import (
    DEFAULT_AZIMUTH_STEP_DEG,
    DEFAULT_OBSERVER_HEIGHT_M,
    HORIZON_SEARCH_RADIUS_KM,
    LUNAR_MEAN_RADIUS_M,
)
from app.scientific.coordinates import geodesic_step
from app.scientific.terrain import terrain_engine

logger = logging.getLogger("lunar_atlas.horizon")


def compute_local_horizon_skyline(
    lat_deg: float,
    lon_deg: float,
    observer_height_m: float = DEFAULT_OBSERVER_HEIGHT_M,
    azimuth_step_deg: float = DEFAULT_AZIMUTH_STEP_DEG,
    max_distance_km: float = HORIZON_SEARCH_RADIUS_KM,
    radial_samples: int = 120,
) -> dict[str, Any]:
    """Calculate the 360-degree local terrain skyline from observer position using actual LOLA topography.

    Args:
        lat_deg: Observer latitude (-90 to +90).
        lon_deg: Observer east longitude (-180 to +180).
        observer_height_m: Instrument mast height above ground (m).
        azimuth_step_deg: Angular increment between azimuth rays (e.g. 1.0 deg).
        max_distance_km: Maximum radial search distance along lunar surface (km).
        radial_samples: Number of radial interpolation steps along each ray.

    Returns:
        Dictionary containing the 360-degree skyline elevation profile and obstacle details.
    """
    # Ground elevation at observer site
    ground_elevation_m = terrain_engine.get_elevation_m(lat_deg, lon_deg)
    observer_eye_m = ground_elevation_m + observer_height_m

    azimuth_angles = np.arange(0.0, 360.0, azimuth_step_deg)
    radial_distances_km = np.linspace(0.2, max_distance_km, radial_samples)

    skyline_profile: list[dict[str, float]] = []
    elevations: list[float] = []

    for az in azimuth_angles:
        az_float = float(az)
        max_obstruction_angle_deg = -90.0
        peak_distance_km = 0.0
        peak_elevation_m = 0.0

        for dist_km in radial_distances_km:
            dist_m = dist_km * 1000.0

            # Intermediate geographic position along bearing
            p_lat, p_lon = geodesic_step(lat_deg, lon_deg, az_float, dist_km)
            terrain_z_m = terrain_engine.get_elevation_m(p_lat, p_lon)

            # Lunar surface spherical curvature drop relative to local horizontal plane
            # drop = R - sqrt(R^2 - s^2) ~= s^2 / (2 * R)
            curvature_drop_m = (dist_m * dist_m) / (2.0 * LUNAR_MEAN_RADIUS_M)

            # Effective elevation above observer's local horizontal tangent plane
            delta_z_m = terrain_z_m - observer_eye_m - curvature_drop_m

            # Apparent elevation angle in degrees
            elevation_angle_deg = float(np.degrees(np.arctan(delta_z_m / dist_m)))

            if elevation_angle_deg > max_obstruction_angle_deg:
                max_obstruction_angle_deg = elevation_angle_deg
                peak_distance_km = float(dist_km)
                peak_elevation_m = float(terrain_z_m)

        skyline_profile.append({
            "azimuth_deg": round(az_float, 2),
            "elevation_deg": round(max_obstruction_angle_deg, 4),
            "obstacle_distance_km": round(peak_distance_km, 2),
            "obstacle_elevation_m": round(peak_elevation_m, 1),
        })
        elevations.append(max_obstruction_angle_deg)

    return {
        "observer": {
            "latitude_deg": lat_deg,
            "longitude_deg": lon_deg,
            "ground_elevation_m": round(ground_elevation_m, 2),
            "observer_height_m": observer_height_m,
            "eye_elevation_m": round(observer_eye_m, 2),
        },
        "search_parameters": {
            "azimuth_step_deg": azimuth_step_deg,
            "max_distance_km": max_distance_km,
            "radial_samples": radial_samples,
        },
        "stats": {
            "min_elevation_deg": round(float(np.min(elevations)), 4),
            "max_elevation_deg": round(float(np.max(elevations)), 4),
            "mean_elevation_deg": round(float(np.mean(elevations)), 4),
        },
        "skyline_profile": skyline_profile,
    }


def interpolate_skyline_elevation(
    skyline_profile: list[dict[str, float]], target_azimuth_deg: float
) -> dict[str, float]:
    """Interpolate the horizon skyline elevation and obstacle details at an exact target azimuth.

    Args:
        skyline_profile: List of skyline points from compute_local_horizon_skyline.
        target_azimuth_deg: Target azimuth [0, 360) degrees.

    Returns:
        Interpolated obstacle dictionary.
    """
    norm_az = target_azimuth_deg % 360.0
    n = len(skyline_profile)
    if n == 0:
        return {"elevation_deg": 0.0, "obstacle_distance_km": 0.0, "obstacle_elevation_m": 0.0}

    # Find the surrounding azimuth bins
    step = 360.0 / n
    idx0 = int(np.floor(norm_az / step)) % n
    idx1 = (idx0 + 1) % n

    az0 = skyline_profile[idx0]["azimuth_deg"]
    az1 = skyline_profile[idx1]["azimuth_deg"]
    if idx1 == 0:
        az1 += 360.0

    weight = (norm_az - az0) / (az1 - az0) if (az1 - az0) > 0 else 0.0
    weight = np.clip(weight, 0.0, 1.0)

    el0 = skyline_profile[idx0]["elevation_deg"]
    el1 = skyline_profile[idx1]["elevation_deg"]
    interpolated_el = el0 + weight * (el1 - el0)

    # Use the nearer peak obstacle
    peak = skyline_profile[idx0] if weight < 0.5 else skyline_profile[idx1]

    return {
        "elevation_deg": float(interpolated_el),
        "obstacle_distance_km": peak["obstacle_distance_km"],
        "obstacle_elevation_m": peak["obstacle_elevation_m"],
    }


def classify_visibility_state(
    target_elevation_deg: float,
    skyline_elevation_deg: float,
    angular_radius_deg: float,
) -> dict[str, Any]:
    """Classify the visibility state of a celestial body against the local terrain skyline.

    Accounts for the finite angular disk size of the Sun or Earth.

    Returns:
        Dictionary with visibility state ("VISIBLE", "PARTIAL", "OBSTRUCTED"),
        clearance margin (degrees), and visible area fraction [0.0, 1.0].
    """
    upper_limb = target_elevation_deg + angular_radius_deg
    lower_limb = target_elevation_deg - angular_radius_deg
    clearance_margin = target_elevation_deg - skyline_elevation_deg

    if lower_limb >= skyline_elevation_deg:
        return {
            "state": "VISIBLE",
            "clearance_deg": round(clearance_margin, 4),
            "visible_fraction": 1.0,
            "description": "Disk completely above local terrain skyline",
        }
    elif upper_limb <= skyline_elevation_deg:
        return {
            "state": "OBSTRUCTED",
            "clearance_deg": round(clearance_margin, 4),
            "visible_fraction": 0.0,
            "description": "Disk completely occulted by local terrain",
        }
    else:
        # Partial obstruction (grazing limb transition)
        visible_fraction = (upper_limb - skyline_elevation_deg) / (2.0 * angular_radius_deg)
        visible_fraction = float(np.clip(visible_fraction, 0.0, 1.0))
        return {
            "state": "PARTIAL",
            "clearance_deg": round(clearance_margin, 4),
            "visible_fraction": round(visible_fraction, 4),
            "description": "Disk partially clipped by terrain obstacle",
        }
