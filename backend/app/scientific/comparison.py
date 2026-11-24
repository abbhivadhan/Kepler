"""Signature HORIZON REPLAY dual-site comparative simulation engine."""

from datetime import datetime, timedelta
from typing import Any

from app.scientific.events import generate_site_timeline
from app.scientific.horizon import compute_local_horizon_skyline


def compare_landing_sites(
    site_a_lat: float,
    site_a_lon: float,
    site_a_name: str,
    site_a_start_iso: str,
    site_b_lat: float,
    site_b_lon: float,
    site_b_name: str,
    site_b_start_iso: str,
    duration_days: float = 14.0,
    step_minutes: int = 60,
    observer_height_m: float = 2.0,
) -> dict[str, Any]:
    """Execute synchronized HORIZON REPLAY analysis comparing two candidate landing locations and dates.

    Args:
        site_a_lat: Site A latitude.
        site_a_lon: Site A longitude.
        site_a_name: Display label for Site A.
        site_a_start_iso: Simulation start UTC string for Site A.
        site_b_lat: Site B latitude.
        site_b_lon: Site B longitude.
        site_b_name: Display label for Site B.
        site_b_start_iso: Simulation start UTC string for Site B.
        duration_days: Analysis duration in Earth days (1 to 30 days).
        step_minutes: Timestep interval in minutes.
        observer_height_m: Observer mast height above ground in meters.

    Returns:
        Structured dual comparison object with synchronized frames, delta metrics, and key decisions.
    """
    # Calculate end times
    delta_duration = timedelta(days=duration_days)
    dt_a_start = datetime.fromisoformat(site_a_start_iso)
    dt_b_start = datetime.fromisoformat(site_b_start_iso)

    site_a_end_iso = (dt_a_start + delta_duration).strftime("%Y-%m-%dT%H:%M:%S")
    site_b_end_iso = (dt_b_start + delta_duration).strftime("%Y-%m-%dT%H:%M:%S")

    # Compute skylines
    skyline_a = compute_local_horizon_skyline(
        lat_deg=site_a_lat,
        lon_deg=site_a_lon,
        observer_height_m=observer_height_m,
    )
    skyline_b = compute_local_horizon_skyline(
        lat_deg=site_b_lat,
        lon_deg=site_b_lon,
        observer_height_m=observer_height_m,
    )

    # Generate timelines
    timeline_a = generate_site_timeline(
        lat_deg=site_a_lat,
        lon_deg=site_a_lon,
        start_time_iso=site_a_start_iso,
        end_time_iso=site_a_end_iso,
        step_minutes=step_minutes,
        observer_height_m=observer_height_m,
        precomputed_skyline=skyline_a,
    )

    timeline_b = generate_site_timeline(
        lat_deg=site_b_lat,
        lon_deg=site_b_lon,
        start_time_iso=site_b_start_iso,
        end_time_iso=site_b_end_iso,
        step_minutes=step_minutes,
        observer_height_m=observer_height_m,
        precomputed_skyline=skyline_b,
    )

    # Compute comparative delta metrics
    metrics_a = timeline_a["metrics"]
    metrics_b = timeline_b["metrics"]

    illumination_delta_hours = round(metrics_a["total_sun_hours"] - metrics_b["total_sun_hours"], 1)
    darkness_delta_hours = round(
        metrics_a["longest_continuous_darkness_hours"] - metrics_b["longest_continuous_darkness_hours"], 1
    )
    comm_delta_hours = round(metrics_a["total_earth_visible_hours"] - metrics_b["total_earth_visible_hours"], 1)
    blackout_delta_hours = round(
        metrics_a["longest_communication_blackout_hours"] - metrics_b["longest_communication_blackout_hours"], 1
    )
    simultaneous_delta_hours = round(metrics_a["total_simultaneous_hours"] - metrics_b["total_simultaneous_hours"], 1)

    # Executive recommendation synthesis based on quantitative scientific criteria
    advantages_a = []
    advantages_b = []

    if metrics_a["illumination_percentage"] > metrics_b["illumination_percentage"]:
        advantages_a.append(
            f"Higher solar illumination ({metrics_a['illumination_percentage']}% vs {metrics_b['illumination_percentage']}%)"
        )
    elif metrics_b["illumination_percentage"] > metrics_a["illumination_percentage"]:
        advantages_b.append(
            f"Higher solar illumination ({metrics_b['illumination_percentage']}% vs {metrics_a['illumination_percentage']}%)"
        )

    if metrics_a["longest_continuous_darkness_hours"] < metrics_b["longest_continuous_darkness_hours"]:
        advantages_a.append(
            f"Shorter continuous darkness ({metrics_a['longest_continuous_darkness_hours']}h vs {metrics_b['longest_continuous_darkness_hours']}h)"
        )
    elif metrics_b["longest_continuous_darkness_hours"] < metrics_a["longest_continuous_darkness_hours"]:
        advantages_b.append(
            f"Shorter continuous darkness ({metrics_b['longest_continuous_darkness_hours']}h vs {metrics_a['longest_continuous_darkness_hours']}h)"
        )

    if metrics_a["total_earth_visible_hours"] > metrics_b["total_earth_visible_hours"]:
        advantages_a.append(
            f"More direct Earth line-of-sight ({metrics_a['total_earth_visible_hours']}h vs {metrics_b['total_earth_visible_hours']}h)"
        )
    elif metrics_b["total_earth_visible_hours"] > metrics_a["total_earth_visible_hours"]:
        advantages_b.append(
            f"More direct Earth line-of-sight ({metrics_b['total_earth_visible_hours']}h vs {metrics_a['total_earth_visible_hours']}h)"
        )

    if metrics_a.get("longest_communication_blackout_hours", 0) < metrics_b.get("longest_communication_blackout_hours", 0):
        advantages_a.append(
            f"Shorter comm blackout ({metrics_a['longest_communication_blackout_hours']}h vs {metrics_b['longest_communication_blackout_hours']}h)"
        )
    elif metrics_b.get("longest_communication_blackout_hours", 0) < metrics_a.get("longest_communication_blackout_hours", 0):
        advantages_b.append(
            f"Shorter comm blackout ({metrics_b['longest_communication_blackout_hours']}h vs {metrics_a['longest_communication_blackout_hours']}h)"
        )

    # Geographic mission-support fallback if either site has fewer primary advantages
    if abs(site_a_lat) > abs(site_b_lat):
        advantages_a.append(f"Closer proximity to true lunar South Pole ({abs(site_a_lat):.2f}°S)")
    elif abs(site_b_lat) > abs(site_a_lat):
        advantages_b.append(f"Closer proximity to true lunar South Pole ({abs(site_b_lat):.2f}°S)")

    if not advantages_a:
        advantages_a.append("Alternative geographical solar approach corridor and diverse line-of-sight clearance")
    if not advantages_b:
        advantages_b.append("Alternative geographical azimuth trajectory and contingency landing corridor")

    return {
        "comparison_metadata": {
            "duration_days": duration_days,
            "step_minutes": step_minutes,
            "observer_height_m": observer_height_m,
            "provenance": {
                "spice_kernel": "de421.bsp, pck00010.tpc, naif0012.tls",
                "dem_source": "NASA LRO LOLA PDS Geosciences Node (LDEM_75S_240M)",
                "method": "Synchronized Dual Horizon Raycasting & Ephemeris Projection",
            },
        },
        "site_a": {
            "name": site_a_name,
            "latitude_deg": site_a_lat,
            "longitude_deg": site_a_lon,
            "start_time": site_a_start_iso,
            "end_time": site_a_end_iso,
            "metrics": metrics_a,
            "events": timeline_a["events"],
            "skyline": skyline_a,
            "time_series": timeline_a["time_series"],
        },
        "site_b": {
            "name": site_b_name,
            "latitude_deg": site_b_lat,
            "longitude_deg": site_b_lon,
            "start_time": site_b_start_iso,
            "end_time": site_b_end_iso,
            "metrics": metrics_b,
            "events": timeline_b["events"],
            "skyline": skyline_b,
            "time_series": timeline_b["time_series"],
        },
        "deltas": {
            "illumination_hours_a_minus_b": illumination_delta_hours,
            "longest_darkness_hours_a_minus_b": darkness_delta_hours,
            "earth_visible_hours_a_minus_b": comm_delta_hours,
            "longest_blackout_hours_a_minus_b": blackout_delta_hours,
            "simultaneous_hours_a_minus_b": simultaneous_delta_hours,
        },
        "synthesis": {
            "advantages_site_a": advantages_a,
            "advantages_site_b": advantages_b,
        },
    }
