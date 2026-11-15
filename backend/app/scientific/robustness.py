"""Landing robustness and spatial dispersion sensitivity analysis."""

from typing import Any

import numpy as np
from app.scientific.coordinates import geodesic_step
from app.scientific.events import generate_site_timeline
from app.scientific.terrain import terrain_engine


def analyze_landing_robustness(
    center_lat_deg: float,
    center_lon_deg: float,
    semi_major_km: float = 5.0,
    semi_minor_km: float = 3.0,
    ellipse_azimuth_deg: float = 45.0,
    start_time_iso: str = "2026-10-15T00:00:00",
    end_time_iso: str = "2026-10-22T00:00:00",
    sample_grid_size: int = 5,  # 5x5 spatial grid
    observer_height_m: float = 2.0,
) -> dict[str, Any]:
    """Analyze spatial sensitivity across a candidate landing dispersion ellipse.

    Evaluates spatial variation in solar illumination, Earth visibility, and terrain slope.

    Args:
        center_lat_deg: Nominal landing site latitude.
        center_lon_deg: Nominal landing site longitude.
        semi_major_km: Landing ellipse semi-major axis (km).
        semi_minor_km: Landing ellipse semi-minor axis (km).
        ellipse_azimuth_deg: Orientation azimuth of major axis (degrees from North).
        start_time_iso: Simulation start UTC.
        end_time_iso: Simulation end UTC.
        sample_grid_size: Dimension of spatial sampling grid (e.g. 5x5).
        observer_height_m: Instrument height above local ground.

    Returns:
        Spatial grid of points with localized illumination, visibility metrics, and warnings.
    """
    # Sample points inside the ellipse in local (u, v) coordinates
    u_vals = np.linspace(-semi_major_km, semi_major_km, sample_grid_size)
    v_vals = np.linspace(-semi_minor_km, semi_minor_km, sample_grid_size)

    # Rotation matrix by ellipse azimuth
    theta_rad = np.radians(ellipse_azimuth_deg)
    cos_t, sin_t = np.cos(theta_rad), np.sin(theta_rad)

    samples: list[dict[str, Any]] = []
    illum_list = []
    earth_list = []
    elev_list = []

    center_elev = terrain_engine.get_elevation_m(center_lat_deg, center_lon_deg)

    for u in u_vals:
        for v in v_vals:
            # Check ellipse boundary: (u/a)^2 + (v/b)^2 <= 1.0
            norm_dist_sq = (u / semi_major_km) ** 2 + (v / semi_minor_km) ** 2
            if norm_dist_sq > 1.0:
                continue

            # Rotate to (East, North) displacement in km
            d_east = u * sin_t + v * cos_t
            d_north = u * cos_t - v * sin_t
            r_dist = float(np.sqrt(d_east**2 + d_north**2))
            bearing = float(np.degrees(np.arctan2(d_east, d_north))) % 360.0

            # Compute point lat/lon using geodesic step from center
            p_lat, p_lon = geodesic_step(center_lat_deg, center_lon_deg, bearing, r_dist)
            p_elev = terrain_engine.get_elevation_m(p_lat, p_lon)

            # Evaluate short sample timeline (6-hour steps for fast spatial scan)
            tl = generate_site_timeline(
                lat_deg=p_lat,
                lon_deg=p_lon,
                start_time_iso=start_time_iso,
                end_time_iso=end_time_iso,
                step_minutes=360,
                observer_height_m=observer_height_m,
            )

            metrics = tl["metrics"]
            illum_pct = metrics["illumination_percentage"]
            earth_pct = metrics["earth_visibility_percentage"]

            samples.append({
                "u_km": round(float(u), 2),
                "v_km": round(float(v), 2),
                "latitude_deg": round(p_lat, 4),
                "longitude_deg": round(p_lon, 4),
                "elevation_m": round(p_elev, 1),
                "delta_elevation_from_center_m": round(p_elev - center_elev, 1),
                "illumination_percentage": round(illum_pct, 1),
                "earth_visibility_percentage": round(earth_pct, 1),
                "longest_darkness_hours": metrics["longest_continuous_darkness_hours"],
            })

            illum_list.append(illum_pct)
            earth_list.append(earth_pct)
            elev_list.append(p_elev)

    return {
        "ellipse": {
            "center_lat_deg": center_lat_deg,
            "center_lon_deg": center_lon_deg,
            "semi_major_km": semi_major_km,
            "semi_minor_km": semi_minor_km,
            "orientation_azimuth_deg": ellipse_azimuth_deg,
            "total_sampled_points": len(samples),
        },
        "spatial_sensitivity": {
            "min_illumination_pct": round(float(np.min(illum_list)), 1),
            "max_illumination_pct": round(float(np.max(illum_list)), 1),
            "mean_illumination_pct": round(float(np.mean(illum_list)), 1),
            "min_earth_visibility_pct": round(float(np.min(earth_list)), 1),
            "max_earth_visibility_pct": round(float(np.max(earth_list)), 1),
            "mean_earth_visibility_pct": round(float(np.mean(earth_list)), 1),
            "elevation_range_m": round(float(np.max(elev_list) - np.min(elev_list)), 1),
        },
        "samples": samples,
        "scientific_disclaimer": (
            "NOTICE: Spatial variation reflects uniform geometric sampling across the landing dispersion ellipse. "
            "It does NOT represent a spacecraft touchdown probability distribution without navigational guidance modeling."
        ),
    }
