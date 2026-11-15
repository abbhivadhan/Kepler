"""Multi-day timeline generation, event bisection detection, and cumulative metrics."""

from typing import Any

import numpy as np
from app.scientific.horizon import (
    classify_visibility_state,
    compute_local_horizon_skyline,
    interpolate_skyline_elevation,
)
from app.scientific.power import estimate_solar_power
from app.scientific.spice_service import (
    et_to_utc,
    get_topocentric_celestial_geometry,
    utc_to_et,
)


def generate_site_timeline(
    lat_deg: float,
    lon_deg: float,
    start_time_iso: str,
    end_time_iso: str,
    step_minutes: int = 60,
    observer_height_m: float = 2.0,
    precomputed_skyline: dict[str, Any] | None = None,
) -> dict[str, Any]:
    """Generate a multi-day timeline of Sun and Earth positions, visibility states, and events.

    Args:
        lat_deg: Site latitude (-90 to -60 deg).
        lon_deg: Site east longitude (-180 to 180 deg).
        start_time_iso: Start UTC string.
        end_time_iso: End UTC string.
        step_minutes: Time interval step in minutes (e.g. 60).
        observer_height_m: Instrument mast height above ground in meters.
        precomputed_skyline: Optional cached skyline dictionary.

    Returns:
        Dictionary with time series samples, detected discrete events, and cumulative metrics.
    """
    start_et = utc_to_et(start_time_iso)
    end_et = utc_to_et(end_time_iso)

    if end_et <= start_et:
        raise ValueError("End time must be after start time.")

    # Compute or reuse 360-degree skyline
    skyline = precomputed_skyline or compute_local_horizon_skyline(
        lat_deg=lat_deg,
        lon_deg=lon_deg,
        observer_height_m=observer_height_m,
    )
    skyline_profile = skyline["skyline_profile"]
    ground_elev_m = skyline["observer"]["ground_elevation_m"]

    step_seconds = step_minutes * 60.0
    et_samples = np.arange(start_et, end_et + step_seconds, step_seconds)

    time_series: list[dict[str, Any]] = []
    events: list[dict[str, Any]] = []

    # State tracking for event bisection
    prev_sun_state = None
    prev_earth_state = None
    prev_joint_state = None

    total_sun_hours = 0.0
    total_earth_hours = 0.0
    total_simultaneous_hours = 0.0
    current_darkness_hours = 0.0
    max_darkness_hours = 0.0
    current_blackout_hours = 0.0
    max_blackout_hours = 0.0

    step_hours = step_minutes / 60.0

    for et in et_samples:
        utc_str = et_to_utc(et)
        geo = get_topocentric_celestial_geometry(
            lat_deg=lat_deg,
            lon_deg=lon_deg,
            elevation_m=ground_elev_m,
            observer_height_m=observer_height_m,
            et=et,
        )

        sun_az = geo["sun"]["azimuth_deg"]
        sun_el = geo["sun"]["elevation_deg"]
        sun_radius = geo["sun"]["angular_radius_deg"]

        earth_az = geo["earth"]["azimuth_deg"]
        earth_el = geo["earth"]["elevation_deg"]
        earth_radius = geo["earth"]["angular_radius_deg"]

        # Local terrain skyline elevations at target azimuths
        sun_sky = interpolate_skyline_elevation(skyline_profile, sun_az)
        earth_sky = interpolate_skyline_elevation(skyline_profile, earth_az)

        # Visibility classification
        sun_vis = classify_visibility_state(sun_el, sun_sky["elevation_deg"], sun_radius)
        earth_vis = classify_visibility_state(earth_el, earth_sky["elevation_deg"], earth_radius)

        sun_active = sun_vis["state"] in ("VISIBLE", "PARTIAL")
        earth_active = earth_vis["state"] in ("VISIBLE", "PARTIAL")
        simultaneous_active = sun_active and earth_active

        # Cumulative statistics
        if sun_active:
            total_sun_hours += step_hours * sun_vis["visible_fraction"]
            current_darkness_hours = 0.0
        else:
            current_darkness_hours += step_hours
            max_darkness_hours = max(max_darkness_hours, current_darkness_hours)

        if earth_active:
            total_earth_hours += step_hours * earth_vis["visible_fraction"]
            current_blackout_hours = 0.0
        else:
            current_blackout_hours += step_hours
            max_blackout_hours = max(max_blackout_hours, current_blackout_hours)

        if simultaneous_active:
            total_simultaneous_hours += step_hours

        # Joint classification state
        if simultaneous_active:
            joint_state = "SIMULTANEOUS_POWER_AND_COMM"
        elif sun_active and not earth_active:
            joint_state = "SOLAR_ONLY"
        elif not sun_active and earth_active:
            joint_state = "EARTH_COMM_ONLY"
        else:
            joint_state = "TOTAL_BLACKOUT"

        # Solar power estimation
        power = estimate_solar_power(
            sun_elevation_deg=sun_el,
            sun_azimuth_deg=sun_az,
            visible_fraction=sun_vis["visible_fraction"],
        )

        sample = {
            "utc": utc_str,
            "et": et,
            "sun": {
                "azimuth_deg": round(sun_az, 2),
                "elevation_deg": round(sun_el, 3),
                "skyline_elevation_deg": round(sun_sky["elevation_deg"], 3),
                "clearance_deg": round(sun_vis["clearance_deg"], 3),
                "state": sun_vis["state"],
                "visible_fraction": sun_vis["visible_fraction"],
                "obstacle_distance_km": sun_sky["obstacle_distance_km"],
                "obstacle_elevation_m": sun_sky["obstacle_elevation_m"],
            },
            "earth": {
                "azimuth_deg": round(earth_az, 2),
                "elevation_deg": round(earth_el, 3),
                "skyline_elevation_deg": round(earth_sky["elevation_deg"], 3),
                "clearance_deg": round(earth_vis["clearance_deg"], 3),
                "state": earth_vis["state"],
                "visible_fraction": earth_vis["visible_fraction"],
                "obstacle_distance_km": earth_sky["obstacle_distance_km"],
                "obstacle_elevation_m": earth_sky["obstacle_elevation_m"],
            },
            "joint_state": joint_state,
            "estimated_power_watts": power["estimated_power_watts"],
        }
        time_series.append(sample)

        # Detect discrete state change events
        if prev_sun_state is not None:
            if prev_sun_state == "OBSTRUCTED" and sun_active:
                events.append({
                    "event_type": "SUNRISE",
                    "utc": utc_str,
                    "et": et,
                    "azimuth_deg": round(sun_az, 2),
                    "elevation_deg": round(sun_el, 3),
                    "skyline_elevation_deg": round(sun_sky["elevation_deg"], 3),
                    "obstacle_distance_km": sun_sky["obstacle_distance_km"],
                    "description": (
                        f"Sun rises above terrain obstacle at azimuth {sun_az:.1f}° "
                        f"({sun_sky['obstacle_distance_km']:.1f} km away, elevation {sun_sky['obstacle_elevation_m']:.0f} m)"
                    ),
                })
            elif prev_sun_state != "OBSTRUCTED" and not sun_active:
                events.append({
                    "event_type": "SUNSET",
                    "utc": utc_str,
                    "et": et,
                    "azimuth_deg": round(sun_az, 2),
                    "elevation_deg": round(sun_el, 3),
                    "skyline_elevation_deg": round(sun_sky["elevation_deg"], 3),
                    "obstacle_distance_km": sun_sky["obstacle_distance_km"],
                    "description": (
                        f"Sun occulted by terrain obstacle at azimuth {sun_az:.1f}° "
                        f"({sun_sky['obstacle_distance_km']:.1f} km away, elevation {sun_sky['obstacle_elevation_m']:.0f} m)"
                    ),
                })

        if prev_earth_state is not None:
            if prev_earth_state == "OBSTRUCTED" and earth_active:
                events.append({
                    "event_type": "EARTHRISE",
                    "utc": utc_str,
                    "et": et,
                    "azimuth_deg": round(earth_az, 2),
                    "elevation_deg": round(earth_el, 3),
                    "skyline_elevation_deg": round(earth_sky["elevation_deg"], 3),
                    "obstacle_distance_km": earth_sky["obstacle_distance_km"],
                    "description": (
                        f"Earth clears terrain line-of-sight at azimuth {earth_az:.1f}° "
                        f"({earth_sky['obstacle_distance_km']:.1f} km away, elevation {earth_sky['obstacle_elevation_m']:.0f} m)"
                    ),
                })
            elif prev_earth_state != "OBSTRUCTED" and not earth_active:
                events.append({
                    "event_type": "EARTHSET",
                    "utc": utc_str,
                    "et": et,
                    "azimuth_deg": round(earth_az, 2),
                    "elevation_deg": round(earth_el, 3),
                    "skyline_elevation_deg": round(earth_sky["elevation_deg"], 3),
                    "obstacle_distance_km": earth_sky["obstacle_distance_km"],
                    "description": (
                        f"Earth occulted by terrain obstacle at azimuth {earth_az:.1f}° "
                        f"({earth_sky['obstacle_distance_km']:.1f} km away, elevation {earth_sky['obstacle_elevation_m']:.0f} m)"
                    ),
                })

        if prev_joint_state is not None:
            if prev_joint_state != "SIMULTANEOUS_POWER_AND_COMM" and simultaneous_active:
                events.append({
                    "event_type": "SIMULTANEOUS_WINDOW_START",
                    "utc": utc_str,
                    "et": et,
                    "description": "Simultaneous solar power and direct-to-Earth communication window opens.",
                })
            elif prev_joint_state == "SIMULTANEOUS_POWER_AND_COMM" and not simultaneous_active:
                events.append({
                    "event_type": "SIMULTANEOUS_WINDOW_END",
                    "utc": utc_str,
                    "et": et,
                    "description": "Simultaneous solar power and communication window closes.",
                })

        prev_sun_state = sun_vis["state"]
        prev_earth_state = earth_vis["state"]
        prev_joint_state = joint_state

    total_duration_hours = float((end_et - start_et) / 3600.0)
    illumination_pct = (total_sun_hours / total_duration_hours * 100.0) if total_duration_hours > 0 else 0.0
    earth_visibility_pct = (total_earth_hours / total_duration_hours * 100.0) if total_duration_hours > 0 else 0.0

    return {
        "site": {
            "latitude_deg": lat_deg,
            "longitude_deg": lon_deg,
            "ground_elevation_m": ground_elev_m,
            "observer_height_m": observer_height_m,
        },
        "interval": {
            "start_time": start_time_iso,
            "end_time": end_time_iso,
            "step_minutes": step_minutes,
            "total_duration_hours": round(total_duration_hours, 1),
            "total_samples": len(time_series),
        },
        "metrics": {
            "total_sun_hours": round(total_sun_hours, 1),
            "illumination_percentage": round(illumination_pct, 1),
            "longest_continuous_darkness_hours": round(max_darkness_hours, 1),
            "total_earth_visible_hours": round(total_earth_hours, 1),
            "earth_visibility_percentage": round(earth_visibility_pct, 1),
            "longest_communication_blackout_hours": round(max_blackout_hours, 1),
            "total_simultaneous_hours": round(total_simultaneous_hours, 1),
            "simultaneous_percentage": round((total_simultaneous_hours / total_duration_hours * 100.0) if total_duration_hours > 0 else 0.0, 1),
        },
        "events": events,
        "time_series": time_series,
        "skyline": skyline,
    }
