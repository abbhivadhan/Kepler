export type AudienceMode = "LANDING" | "MISSION_CONTROL" | "HORIZON_REPLAY" | "SCIENCE_EXPLORER" | "LUNAR_EXPERIENCE";

export interface CandidateSite {
  id: string;
  name: string;
  latitude_deg: float;
  longitude_deg: float;
  nominal_elevation_m: float;
  features: string;
  clps_artemis_relevance: string;
}

export type float = number;

export interface CelestialTargetTelemetry {
  azimuth_deg: number;
  elevation_deg: number;
  distance_km?: number;
  angular_radius_deg?: number;
  skyline_elevation_deg?: number;
  clearance_deg?: number;
  state?: "VISIBLE" | "PARTIAL" | "OBSTRUCTED";
  visible_fraction?: number;
  obstacle_distance_km?: number;
  obstacle_elevation_m?: number;
}

export interface SkylinePoint {
  azimuth_deg: number;
  elevation_deg: number;
  obstacle_distance_km: number;
  obstacle_elevation_m: number;
}

export interface SkylineProfileData {
  observer: {
    latitude_deg: number;
    longitude_deg: number;
    ground_elevation_m: number;
    observer_height_m: number;
    eye_elevation_m: number;
  };
  stats: {
    min_elevation_deg: number;
    max_elevation_deg: number;
    mean_elevation_deg: number;
  };
  skyline_profile: SkylinePoint[];
  provenance: ProvenanceData;
}

export interface TimelineSample {
  utc: string;
  et: number;
  sun: CelestialTargetTelemetry;
  earth: CelestialTargetTelemetry;
  joint_state: "SIMULTANEOUS_POWER_AND_COMM" | "SOLAR_ONLY" | "EARTH_COMM_ONLY" | "TOTAL_BLACKOUT";
  estimated_power_watts: number;
}

export interface HorizonEvent {
  event_type: "SUNRISE" | "SUNSET" | "EARTHRISE" | "EARTHSET" | "SIMULTANEOUS_WINDOW_START" | "SIMULTANEOUS_WINDOW_END";
  utc: string;
  et: number;
  azimuth_deg?: number;
  elevation_deg?: number;
  skyline_elevation_deg?: number;
  obstacle_distance_km?: number;
  description: string;
}

export interface TimelineMetrics {
  total_sun_hours: number;
  illumination_percentage: number;
  longest_continuous_darkness_hours: number;
  total_earth_visible_hours: number;
  earth_visibility_percentage: number;
  longest_communication_blackout_hours: number;
  total_simultaneous_hours: number;
  simultaneous_percentage: number;
}

export interface SiteTimelineResult {
  site: {
    latitude_deg: number;
    longitude_deg: number;
    ground_elevation_m: number;
    observer_height_m: number;
  };
  interval: {
    start_time: string;
    end_time: string;
    step_minutes: number;
    total_duration_hours: number;
    total_samples: number;
  };
  metrics: TimelineMetrics;
  events: HorizonEvent[];
  time_series: TimelineSample[];
  skyline: SkylineProfileData;
  provenance: ProvenanceData;
}

export interface ProvenanceData {
  spice_kernel_version: string;
  ephemeris_source: string;
  dem_source: string;
  dem_spatial_resolution_m: number;
  observer_height_m: number;
  coordinate_system: string;
  calculation_method: string;
  limitations: string;
}

export interface SiteComparisonData {
  name: string;
  latitude_deg: number;
  longitude_deg: number;
  start_time: string;
  end_time: string;
  metrics: TimelineMetrics;
  events: HorizonEvent[];
  skyline: SkylineProfileData;
  time_series: TimelineSample[];
}

export interface ComparisonResult {
  comparison_metadata: {
    duration_days: number;
    step_minutes: number;
    observer_height_m: number;
    provenance: Record<string, string>;
  };
  site_a: SiteComparisonData;
  site_b: SiteComparisonData;
  deltas: {
    illumination_hours_a_minus_b: number;
    longest_darkness_hours_a_minus_b: number;
    earth_visible_hours_a_minus_b: number;
    longest_blackout_hours_a_minus_b: number;
    simultaneous_hours_a_minus_b: number;
  };
  synthesis: {
    advantages_site_a: string[];
    advantages_site_b: string[];
  };
}

export interface RobustnessSample {
  u_km: number;
  v_km: number;
  latitude_deg: number;
  longitude_deg: number;
  elevation_m: number;
  delta_elevation_from_center_m: number;
  illumination_percentage: number;
  earth_visibility_percentage: number;
  longest_darkness_hours: number;
}

export interface RobustnessResult {
  ellipse: {
    center_lat_deg: number;
    center_lon_deg: number;
    semi_major_km: number;
    semi_minor_km: number;
    orientation_azimuth_deg: number;
    total_sampled_points: number;
  };
  spatial_sensitivity: {
    min_illumination_pct: number;
    max_illumination_pct: number;
    mean_illumination_pct: number;
    min_earth_visibility_pct: number;
    max_earth_visibility_pct: number;
    mean_earth_visibility_pct: number;
    elevation_range_m: number;
  };
  samples: RobustnessSample[];
  scientific_disclaimer: string;
}
