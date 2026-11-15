"""Solar power estimation model based on incident geometry and terrain masking."""

from typing import Any

import numpy as np
from app.core.config import SOLAR_CONSTANT_W_M2


def estimate_solar_power(
    sun_elevation_deg: float,
    sun_azimuth_deg: float,
    visible_fraction: float,
    panel_area_m2: float = 2.0,
    cell_efficiency: float = 0.28,  # 28% triple-junction GaAs space solar cells
    panel_tilt_deg: float | None = None,  # Tilt from horizontal (90 = vertical array)
    panel_azimuth_deg: float | None = None,  # Facing azimuth
) -> dict[str, Any]:
    """Estimate electrical power output from a solar array at the lunar south pole.

    At the lunar south pole, solar panels are often mounted vertically (tilt ~90°)
    or actively track azimuth to capture low-horizon grazing sunlight.

    Args:
        sun_elevation_deg: Apparent topocentric Sun elevation (degrees).
        sun_azimuth_deg: Apparent topocentric Sun azimuth (degrees).
        visible_fraction: Unobstructed fraction of solar disk [0.0, 1.0].
        panel_area_m2: Total active solar array area in square meters.
        cell_efficiency: Solar cell photoelectric conversion efficiency.
        panel_tilt_deg: Array tilt from horizontal (default None = sun-tracking array).
        panel_azimuth_deg: Panel normal facing azimuth (default None = sun-tracking).

    Returns:
        Dictionary with irradiance, incidence angle, and estimated electrical power (Watts).
    """
    if visible_fraction <= 0.0 or sun_elevation_deg <= -0.5:
        return {
            "estimated_power_watts": 0.0,
            "effective_irradiance_w_m2": 0.0,
            "incidence_angle_deg": 90.0,
            "panel_area_m2": panel_area_m2,
            "cell_efficiency": cell_efficiency,
            "assumptions": "Zero power: Sun is below skyline or fully eclipsed by terrain.",
        }

    # Sun unit vector in topocentric (East, North, Up) coordinates
    el_rad = np.radians(sun_elevation_deg)
    az_rad = np.radians(sun_azimuth_deg)

    sun_vec = np.array([
        np.cos(el_rad) * np.sin(az_rad),  # East
        np.cos(el_rad) * np.cos(az_rad),  # North
        np.sin(el_rad),                    # Up
    ], dtype=np.float64)

    # Panel normal vector
    if panel_tilt_deg is None or panel_azimuth_deg is None:
        # Optimal 2-axis tracking array (faces directly toward Sun)
        cos_theta = 1.0
        incidence_angle_deg = 0.0
        tracking_mode = "Dual-axis Sun-tracking (normal incidence)"
    else:
        tilt_rad = np.radians(panel_tilt_deg)
        panel_az_rad = np.radians(panel_azimuth_deg)
        panel_normal = np.array([
            np.sin(tilt_rad) * np.sin(panel_az_rad),  # East
            np.sin(tilt_rad) * np.cos(panel_az_rad),  # North
            np.cos(tilt_rad),                         # Up
        ], dtype=np.float64)
        cos_theta = float(np.clip(np.dot(sun_vec, panel_normal), 0.0, 1.0))
        incidence_angle_deg = float(np.degrees(np.arccos(cos_theta)))
        tracking_mode = f"Fixed array (tilt {panel_tilt_deg}°, facing {panel_azimuth_deg}°)"

    # Effective irradiance accounting for terrain obstruction and incidence cosine
    effective_irradiance = SOLAR_CONSTANT_W_M2 * cos_theta * visible_fraction
    estimated_power = effective_irradiance * panel_area_m2 * cell_efficiency

    return {
        "estimated_power_watts": round(float(estimated_power), 2),
        "effective_irradiance_w_m2": round(float(effective_irradiance), 2),
        "incidence_angle_deg": round(incidence_angle_deg, 2),
        "tracking_mode": tracking_mode,
        "panel_area_m2": panel_area_m2,
        "cell_efficiency": cell_efficiency,
        "assumptions": (
            "Solar constant 1361 W/m²; airless lunar vacuum; "
            "GaAs triple-junction efficiency; geometric cosine loss."
        ),
    }
