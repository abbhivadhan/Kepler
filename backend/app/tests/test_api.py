"""Automated API integration tests for LUNAR ATLAS REST endpoints."""

from app.main import app
from fastapi.testclient import TestClient

client = TestClient(app)


def test_root_endpoint():
    """Verify root endpoint responds with product identity."""
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert data["product"] == "KEPLER"
    assert data["status"] == "online"


def test_health_endpoint():
    """Verify health endpoint reports SPICE and LOLA DEM status."""
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "operational"
    assert "provenance" in data


def test_list_sites_endpoint():
    """Verify Artemis candidate landing sites catalog."""
    response = client.get("/api/sites")
    assert response.status_code == 200
    sites = response.json()
    assert len(sites) >= 7
    site_ids = [s["id"] for s in sites]
    assert "SHACKLETON_RIM" in site_ids
    assert "MALAPERT_MASSIF" in site_ids
    assert "CONNECTING_RIDGE" in site_ids


def test_site_detail_endpoint():
    """Verify individual site details and measured elevation."""
    response = client.get("/api/sites/SHACKLETON_RIM")
    assert response.status_code == 200
    data = response.json()
    assert data["id"] == "SHACKLETON_RIM"
    assert "measured_lola_elevation_m" in data


def test_geometry_endpoint():
    """Verify instantaneous topocentric celestial geometry."""
    payload = {
        "latitude_deg": -89.68,
        "longitude_deg": 129.0,
        "utc_time": "2026-10-15T00:00:00",
        "observer_height_m": 2.0,
    }
    response = client.post("/api/geometry", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert "sun" in data
    assert "earth" in data
    assert "azimuth_deg" in data["sun"]
    assert "elevation_deg" in data["sun"]
    assert "provenance" in data


def test_horizon_endpoint():
    """Verify 360-degree local terrain skyline profile calculation."""
    payload = {
        "latitude_deg": -89.68,
        "longitude_deg": 129.0,
        "observer_height_m": 2.0,
        "azimuth_step_deg": 2.0,
    }
    response = client.post("/api/horizon", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert len(data["skyline_profile"]) == 180
    assert "stats" in data
    assert "observer" in data


def test_illumination_timeline_endpoint():
    """Verify multi-day illumination and communication timeline analysis."""
    payload = {
        "latitude_deg": -89.68,
        "longitude_deg": 129.0,
        "start_time": "2026-10-15T00:00:00",
        "end_time": "2026-10-17T00:00:00",
        "step_minutes": 120,
        "observer_height_m": 2.0,
    }
    response = client.post("/api/illumination", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert "metrics" in data
    assert "events" in data
    assert "time_series" in data
    assert data["interval"]["total_duration_hours"] == 48.0
    assert "total_sun_hours" in data["metrics"]


def test_horizon_replay_comparison_endpoint():
    """Verify signature HORIZON REPLAY synchronized dual-site comparison."""
    payload = {
        "site_a_lat": -89.68,
        "site_a_lon": 129.0,
        "site_a_name": "Shackleton Rim",
        "site_a_start_time": "2026-10-15T00:00:00",
        "site_b_lat": -86.00,
        "site_b_lon": 2.70,
        "site_b_name": "Malapert Massif",
        "site_b_start_time": "2026-11-01T00:00:00",
        "duration_days": 3.0,
        "step_minutes": 120,
        "observer_height_m": 2.0,
    }
    response = client.post("/api/compare", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert "site_a" in data
    assert "site_b" in data
    assert "deltas" in data
    assert "synthesis" in data


def test_csv_export_endpoint():
    """Verify CSV decision brief generation."""
    payload = {
        "site_a_lat": -89.68,
        "site_a_lon": 129.0,
        "site_a_name": "Shackleton Rim",
        "site_a_start_time": "2026-10-15T00:00:00",
        "site_b_lat": -86.00,
        "site_b_lon": 2.70,
        "site_b_name": "Malapert Massif",
        "site_b_start_time": "2026-11-01T00:00:00",
        "duration_days": 2.0,
        "step_minutes": 180,
        "observer_height_m": 2.0,
    }
    response = client.post("/api/report/csv", json=payload)
    assert response.status_code == 200
    assert response.headers["content-type"].startswith("text/csv")
    csv_text = response.text
    assert "KEPLER" in csv_text
    assert "Shackleton Rim" in csv_text
    assert "Malapert Massif" in csv_text
