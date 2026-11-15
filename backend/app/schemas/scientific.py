"""Strict Pydantic request and response schemas for LUNAR ATLAS scientific API."""

from pydantic import BaseModel, Field, field_validator


class ProvenanceMetadata(BaseModel):
    """Scientific data provenance and method tracking."""
    spice_kernel_version: str = "de421.bsp, pck00010.tpc, naif0012.tls"
    ephemeris_source: str = "NASA/JPL Planetary Ephemeris DE421"
    dem_source: str = "NASA LRO LOLA PDS Geosciences Node (LDEM_75S_240M)"
    dem_spatial_resolution_m: float = 240.0
    observer_height_m: float = 2.0
    coordinate_system: str = "IAU_MOON (Mean Earth/Polar Axis)"
    calculation_method: str = "Radial Raycasting Skyline Sweep + SPICE Topocentric Vector Projection"
    limitations: str = "Geometric line-of-sight clearance only; does not model RF link budget."


class SiteDefinition(BaseModel):
    """Lunar candidate landing site definition."""
    id: str
    name: str
    latitude_deg: float = Field(..., ge=-90.0, le=-60.0, description="South polar latitude [-90, -60]")
    longitude_deg: float = Field(..., ge=-180.0, le=360.0, description="East longitude")
    nominal_elevation_m: float
    description: str


class HorizonRequest(BaseModel):
    """Request schema for local terrain horizon calculation."""
    latitude_deg: float = Field(..., ge=-90.0, le=-60.0, description="Latitude in South Polar region")
    longitude_deg: float = Field(..., ge=-180.0, le=360.0, description="East longitude [-180, 180]")
    observer_height_m: float = Field(default=2.0, ge=0.5, le=25.0, description="Observer height above ground (m)")
    azimuth_step_deg: float = Field(default=1.0, ge=0.25, le=5.0, description="Azimuth ray step resolution (deg)")

    @field_validator("longitude_deg")
    @classmethod
    def normalize_longitude(cls, v: float) -> float:
        return (v + 180.0) % 360.0 - 180.0


class GeometryRequest(BaseModel):
    """Request schema for instantaneous celestial geometry at an epoch."""
    latitude_deg: float = Field(..., ge=-90.0, le=-60.0)
    longitude_deg: float = Field(..., ge=-180.0, le=360.0)
    utc_time: str = Field(..., description="ISO-8601 UTC timestamp, e.g. 2026-10-15T00:00:00")
    observer_height_m: float = Field(default=2.0, ge=0.5, le=25.0)

    @field_validator("longitude_deg")
    @classmethod
    def normalize_longitude(cls, v: float) -> float:
        return (v + 180.0) % 360.0 - 180.0


class TimelineAnalysisRequest(BaseModel):
    """Request schema for multi-day illumination and communication timeline."""
    latitude_deg: float = Field(..., ge=-90.0, le=-60.0)
    longitude_deg: float = Field(..., ge=-180.0, le=360.0)
    start_time: str = Field(..., description="Start UTC ISO string")
    end_time: str = Field(..., description="End UTC ISO string")
    step_minutes: int = Field(default=60, ge=10, le=1440, description="Time step in minutes")
    observer_height_m: float = Field(default=2.0, ge=0.5, le=25.0)


class SiteComparisonRequest(BaseModel):
    """Request schema for HORIZON REPLAY synchronized comparison."""
    site_a_lat: float = Field(..., ge=-90.0, le=-60.0)
    site_a_lon: float = Field(..., ge=-180.0, le=360.0)
    site_a_name: str = "Site A"
    site_a_start_time: str
    
    site_b_lat: float = Field(..., ge=-90.0, le=-60.0)
    site_b_lon: float = Field(..., ge=-180.0, le=360.0)
    site_b_name: str = "Site B"
    site_b_start_time: str

    duration_days: float = Field(default=14.0, ge=1.0, le=30.0)
    step_minutes: int = Field(default=60, ge=15, le=360)
    observer_height_m: float = Field(default=2.0, ge=0.5, le=25.0)
