"""Lunar coordinate systems, topocentric frame transformations, and geodesics."""


import numpy as np
from app.core.config import LUNAR_MEAN_RADIUS_KM, LUNAR_MEAN_RADIUS_M


def lat_lon_to_cartesian_km(
    lat_deg: float, lon_deg: float, elevation_m: float = 0.0
) -> np.ndarray:
    """Convert planetocentric lat/lon and elevation to Moon-fixed IAU_MOON Cartesian (km).

    Args:
        lat_deg: Planetocentric latitude (-90 to +90 deg).
        lon_deg: East longitude (-180 to +180 deg or 0 to 360 deg).
        elevation_m: Height relative to reference sphere (1737.4 km) in meters.

    Returns:
        3D vector [X, Y, Z] in kilometers in IAU_MOON body-fixed frame.
    """
    phi = np.radians(lat_deg)
    lam = np.radians(lon_deg)
    radius_km = LUNAR_MEAN_RADIUS_KM + (elevation_m / 1000.0)

    x = radius_km * np.cos(phi) * np.cos(lam)
    y = radius_km * np.cos(phi) * np.sin(lam)
    z = radius_km * np.sin(phi)

    return np.array([x, y, z], dtype=np.float64)


def cartesian_to_lat_lon(pos_km: np.ndarray) -> tuple[float, float, float]:
    """Convert IAU_MOON Cartesian vector (km) to (lat_deg, lon_deg, elevation_m)."""
    x, y, z = pos_km
    r = np.sqrt(x * x + y * y + z * z)
    if r < 1e-6:
        return 0.0, 0.0, -LUNAR_MEAN_RADIUS_M

    lat_deg = float(np.degrees(np.arcsin(np.clip(z / r, -1.0, 1.0))))
    lon_deg = float(np.degrees(np.arctan2(y, x)))
    elevation_m = float((r - LUNAR_MEAN_RADIUS_KM) * 1000.0)

    return lat_deg, lon_deg, elevation_m


def compute_topocentric_basis(
    lat_deg: float, lon_deg: float
) -> tuple[np.ndarray, np.ndarray, np.ndarray]:
    """Compute local orthonormal basis {Up, North, East} in IAU_MOON frame.

    Args:
        lat_deg: Planetocentric latitude (-90 to +90 deg).
        lon_deg: East longitude in degrees.

    Returns:
        Tuple of (up_hat, north_hat, east_hat), each a unit vector in IAU_MOON.
    """
    phi = np.radians(lat_deg)
    lam = np.radians(lon_deg)

    # South pole singularity handling
    if np.isclose(lat_deg, -90.0, atol=1e-5):
        up = np.array([0.0, 0.0, -1.0], dtype=np.float64)
        east = np.array([-np.sin(lam), np.cos(lam), 0.0], dtype=np.float64)
        north = np.cross(up, east)
        north = north / np.linalg.norm(north)
        return up, north, east

    # North pole singularity handling
    if np.isclose(lat_deg, 90.0, atol=1e-5):
        up = np.array([0.0, 0.0, 1.0], dtype=np.float64)
        east = np.array([-np.sin(lam), np.cos(lam), 0.0], dtype=np.float64)
        north = np.cross(up, east)
        north = north / np.linalg.norm(north)
        return up, north, east

    # Standard topocentric horizontal frame (East-North-Up right-handed)
    up = np.array([
        np.cos(phi) * np.cos(lam),
        np.cos(phi) * np.sin(lam),
        np.sin(phi)
    ], dtype=np.float64)
    up = up / np.linalg.norm(up)

    east = np.array([
        -np.sin(lam),
        np.cos(lam),
        0.0
    ], dtype=np.float64)
    east = east / np.linalg.norm(east)

    north = np.cross(up, east)
    north = north / np.linalg.norm(north)

    return up, north, east


def project_to_topocentric(
    target_pos_km: np.ndarray,
    site_pos_km: np.ndarray,
    basis: tuple[np.ndarray, np.ndarray, np.ndarray]
) -> tuple[float, float, float]:
    """Project a target position in IAU_MOON into topocentric (azimuth, elevation, range).

    Args:
        target_pos_km: Target celestial body position vector in IAU_MOON (km).
        site_pos_km: Observer position vector in IAU_MOON (km).
        basis: Tuple of (up_hat, north_hat, east_hat).

    Returns:
        (azimuth_deg, elevation_deg, distance_km)
        - azimuth_deg: [0, 360) deg clockwise from North.
        - elevation_deg: [-90, +90] deg above local horizon.
        - distance_km: Range to target in km.
    """
    up, north, east = basis
    displacement = target_pos_km - site_pos_km
    distance_km = float(np.linalg.norm(displacement))

    if distance_km < 1e-9:
        return 0.0, 0.0, 0.0

    d_up = float(np.dot(displacement, up))
    d_north = float(np.dot(displacement, north))
    d_east = float(np.dot(displacement, east))

    # Elevation angle: arcsin(D_up / distance)
    sin_el = np.clip(d_up / distance_km, -1.0, 1.0)
    elevation_deg = float(np.degrees(np.arcsin(sin_el)))

    # Azimuth angle: atan2(D_east, D_north) mod 360
    azimuth_deg = float(np.degrees(np.arctan2(d_east, d_north))) % 360.0

    return azimuth_deg, elevation_deg, distance_km


def geodesic_step(
    lat_deg: float, lon_deg: float, azimuth_deg: float, distance_km: float
) -> tuple[float, float]:
    """Calculate destination coordinates on lunar reference sphere from starting point, bearing, and distance.

    Args:
        lat_deg: Initial latitude (-90 to +90 deg).
        lon_deg: Initial longitude (-180 to +180 deg).
        azimuth_deg: Bearing from North clockwise (0 to 360 deg).
        distance_km: Distance along sphere in km.

    Returns:
        (dest_lat_deg, dest_lon_deg)
    """
    sigma = distance_km / LUNAR_MEAN_RADIUS_KM  # Angular distance in radians
    phi1 = np.radians(lat_deg)
    lam1 = np.radians(lon_deg)
    theta = np.radians(azimuth_deg)

    sin_phi2 = np.sin(phi1) * np.cos(sigma) + np.cos(phi1) * np.sin(sigma) * np.cos(theta)
    sin_phi2 = np.clip(sin_phi2, -1.0, 1.0)
    phi2 = np.arcsin(sin_phi2)

    y = np.sin(theta) * np.sin(sigma) * np.cos(phi1)
    x = np.cos(sigma) - np.sin(phi1) * np.sin(phi2)
    lam2 = lam1 + np.arctan2(y, x)

    # Normalize longitude to [-180, 180]
    dest_lon_deg = float(np.degrees(lam2))
    dest_lon_deg = (dest_lon_deg + 180.0) % 360.0 - 180.0
    dest_lat_deg = float(np.degrees(phi2))

    return dest_lat_deg, dest_lon_deg
