"""Configuration constants and paths for LUNAR ATLAS scientific engine."""

from pathlib import Path

# Base paths
BACKEND_DIR = Path(__file__).resolve().parent.parent.parent
DATA_DIR = BACKEND_DIR / "data"
KERNELS_DIR = DATA_DIR / "kernels"
TERRAIN_DIR = DATA_DIR / "terrain"

# SPICE Kernel filenames
LEAPSECONDS_KERNEL = KERNELS_DIR / "naif0012.tls"
PLANETARY_CONSTANTS_KERNEL = KERNELS_DIR / "pck00010.tpc"
EPHEMERIS_KERNEL = KERNELS_DIR / "de421.bsp"

# LOLA DEM files
LOLA_DEM_IMG = TERRAIN_DIR / "ldem_75s_240m_float.img"
LOLA_DEM_LBL = TERRAIN_DIR / "ldem_75s_240m_float.lbl"

# Physical constants
LUNAR_MEAN_RADIUS_KM = 1737.4  # IAU reference sphere radius in km
LUNAR_MEAN_RADIUS_M = 1737400.0  # IAU reference sphere radius in meters
SOLAR_RADIUS_KM = 696340.0  # Sun mean radius in km
EARTH_EQUATORIAL_RADIUS_KM = 6378.137  # Earth WGS-84 radius in km
SOLAR_CONSTANT_W_M2 = 1361.0  # 1 AU average solar irradiance (W/m^2)

# Default observer settings
DEFAULT_OBSERVER_HEIGHT_M = 2.0  # Default lander / antenna mast height above terrain
MIN_OBSERVER_HEIGHT_M = 0.5
MAX_OBSERVER_HEIGHT_M = 25.0

# SPICE Frames
LUNAR_BODY_NAME = "MOON"
LUNAR_FRAME_NAME = "IAU_MOON"
EARTH_BODY_NAME = "EARTH"
SUN_BODY_NAME = "SUN"
INERTIAL_FRAME_NAME = "J2000"
ABERRATION_CORRECTION = "LT+S"  # Light-time and stellar aberration correction

# Rate limiting and resource guards
MAX_SIMULATION_DAYS = 60
MIN_SIMULATION_STEP_SECONDS = 60
DEFAULT_AZIMUTH_STEP_DEG = 1.0  # 360 azimuth bins
HORIZON_SEARCH_RADIUS_KM = 60.0  # Radial skyline search distance
