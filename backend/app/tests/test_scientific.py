"""Scientific validation unit tests for LUNAR ATLAS core engine."""

import numpy as np
from app.core.config import (
    EARTH_EQUATORIAL_RADIUS_KM,
    SOLAR_RADIUS_KM,
)
from app.scientific.coordinates import (
    cartesian_to_lat_lon,
    compute_topocentric_basis,
    lat_lon_to_cartesian_km,
)
from app.scientific.horizon import (
    classify_visibility_state,
    compute_local_horizon_skyline,
)
from app.scientific.spice_service import (
    calculate_apparent_radius_deg,
    ensure_kernels_loaded,
    et_to_utc,
    get_body_position_iau_moon,
    get_topocentric_celestial_geometry,
    utc_to_et,
)
from app.scientific.terrain import terrain_engine


def test_topocentric_basis_orthonormality():
    """Verify that the local horizon frame basis vectors are strictly orthonormal."""
    test_coords = [
        (-89.68, 129.0),   # Shackleton Rim
        (-86.00, 2.70),    # Malapert Massif
        (-89.45, -136.0),  # Connecting Ridge
        (-90.00, 0.0),     # Exact South Pole singularity
    ]
    for lat, lon in test_coords:
        up, north, east = compute_topocentric_basis(lat, lon)

        # Norms must equal 1.0
        assert np.isclose(np.linalg.norm(up), 1.0, atol=1e-7)
        assert np.isclose(np.linalg.norm(north), 1.0, atol=1e-7)
        assert np.isclose(np.linalg.norm(east), 1.0, atol=1e-7)

        # Dot products must equal 0.0 (mutually perpendicular)
        assert np.isclose(np.dot(up, north), 0.0, atol=1e-7)
        assert np.isclose(np.dot(up, east), 0.0, atol=1e-7)
        assert np.isclose(np.dot(north, east), 0.0, atol=1e-7)

        # Note: in East-North-Up right-handed system: East x North = Up
        cross_en = np.cross(east, north)
        assert np.isclose(np.linalg.norm(cross_en - up), 0.0, atol=1e-7)


def test_cartesian_round_trip():
    """Verify spherical to Cartesian and back conversion."""
    lat_in, lon_in, elev_in = -88.5, 45.0, 1500.0  # 1500 meters elevation
    pos_km = lat_lon_to_cartesian_km(lat_in, lon_in, elev_in)

    lat_out, lon_out, elev_out = cartesian_to_lat_lon(pos_km)
    assert np.isclose(lat_in, lat_out, atol=1e-5)
    assert np.isclose(lon_in, lon_out, atol=1e-5)
    assert np.isclose(elev_in, elev_out, atol=1.0)  # within 1 meter


def test_spice_kernels_and_ephemeris():
    """Verify SPICE kernel loading and astronomical ephemerides."""
    ensure_kernels_loaded()

    # UTC to ET round trip
    utc_str = "2026-10-15T12:00:00"
    et = utc_to_et(utc_str)
    assert et > 0.0
    utc_back = et_to_utc(et)
    assert "2026-10-15" in utc_back

    # Astrometric positions in IAU_MOON
    sun_pos, _ = get_body_position_iau_moon("SUN", et)
    earth_pos, _ = get_body_position_iau_moon("EARTH", et)

    sun_dist = np.linalg.norm(sun_pos)
    earth_dist = np.linalg.norm(earth_pos)

    # Sun distance between 147M km and 152M km
    assert 1.45e8 < sun_dist < 1.55e8
    # Earth distance between 355k km and 410k km
    assert 3.5e5 < earth_dist < 4.1e5

    # Apparent angular radii
    sun_radius_deg = calculate_apparent_radius_deg(SOLAR_RADIUS_KM, sun_dist)
    earth_radius_deg = calculate_apparent_radius_deg(EARTH_EQUATORIAL_RADIUS_KM, earth_dist)

    # Sun disk semi-diameter should be ~0.267 deg (16 arcmin)
    assert 0.25 < sun_radius_deg < 0.28
    # Earth disk semi-diameter should be ~0.95 deg (57 arcmin)
    assert 0.85 < earth_radius_deg < 1.05


def test_topocentric_sun_elevation_at_south_pole():
    """Verify that topocentric Sun elevation at the South Pole remains within grazing bounds (~ +/- 1.6 deg)."""
    ensure_kernels_loaded()
    et = utc_to_et("2026-10-15T00:00:00")

    geometry = get_topocentric_celestial_geometry(
        lat_deg=-89.68,
        lon_deg=129.0,
        elevation_m=1240.0,
        observer_height_m=2.0,
        et=et,
    )

    sun_el = geometry["sun"]["elevation_deg"]
    # Lunar polar solar elevation never exceeds ~1.6 deg above or below mean horizon
    assert -2.0 <= sun_el <= 2.0
    assert 0.0 <= geometry["sun"]["azimuth_deg"] < 360.0


def test_terrain_elevation_sampling():
    """Verify terrain elevation sampling for known Artemis south polar sites."""
    elev_shackleton_floor = terrain_engine.get_elevation_m(-89.68, 129.0)
    elev_connecting_ridge = terrain_engine.get_elevation_m(-89.45, -136.0)
    elev_malapert = terrain_engine.get_elevation_m(-86.00, 2.70)

    # Shackleton crater interior is deeply depressed (< -2000 m)
    assert elev_shackleton_floor < -2000.0
    # Connecting Ridge is elevated (> 500 m)
    assert elev_connecting_ridge > 500.0
    # Malapert Massif rises high above south polar terrain (> 3000 m)
    assert elev_malapert > 3000.0


def test_horizon_skyline_computation():
    """Verify local horizon skyline raycaster produces valid 360-degree profile."""
    skyline = compute_local_horizon_skyline(
        lat_deg=-89.68,
        lon_deg=129.0,
        observer_height_m=2.0,
        azimuth_step_deg=2.0,  # 180 bins for speed
        max_distance_km=30.0,
        radial_samples=60,
    )

    profile = skyline["skyline_profile"]
    assert len(profile) == 180
    assert skyline["observer"]["latitude_deg"] == -89.68

    # Obstructing skyline angles in south polar crater rims are positive
    assert skyline["stats"]["max_elevation_deg"] > 0.0


def test_observer_height_sensitivity():
    """Verify that increasing observer height monotonically lowers or maintains skyline obstruction."""
    skyline_low = compute_local_horizon_skyline(
        lat_deg=-89.68, lon_deg=129.0, observer_height_m=1.0, azimuth_step_deg=10.0, max_distance_km=20.0
    )
    skyline_high = compute_local_horizon_skyline(
        lat_deg=-89.68, lon_deg=129.0, observer_height_m=10.0, azimuth_step_deg=10.0, max_distance_km=20.0
    )

    max_el_low = skyline_low["stats"]["max_elevation_deg"]
    max_el_high = skyline_high["stats"]["max_elevation_deg"]

    # Higher viewpoint must see lower or equal obstruction angle
    assert max_el_high <= max_el_low + 1e-5


def test_visibility_classification():
    """Verify finite disk limb visibility state transitions."""
    angular_radius = 0.267  # Sun semi-diameter

    # 1. Fully visible: Target lower limb is well above skyline
    vis_state = classify_visibility_state(
        target_elevation_deg=2.0, skyline_elevation_deg=1.0, angular_radius_deg=angular_radius
    )
    assert vis_state["state"] == "VISIBLE"
    assert vis_state["visible_fraction"] == 1.0

    # 2. Obstructed: Target upper limb is below skyline
    obs_state = classify_visibility_state(
        target_elevation_deg=0.5, skyline_elevation_deg=1.0, angular_radius_deg=angular_radius
    )
    assert obs_state["state"] == "OBSTRUCTED"
    assert obs_state["visible_fraction"] == 0.0

    # 3. Partial: Skyline intersects the solar disk
    part_state = classify_visibility_state(
        target_elevation_deg=1.0, skyline_elevation_deg=1.0, angular_radius_deg=angular_radius
    )
    assert part_state["state"] == "PARTIAL"
    assert 0.4 < part_state["visible_fraction"] < 0.6
