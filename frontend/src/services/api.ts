import {
  CandidateSite,
  SkylineProfileData,
  SiteTimelineResult,
  ComparisonResult,
  RobustnessResult,
  CelestialTargetTelemetry,
} from "../types";

const BASE_URL = "/api";

export async function fetchHealth(): Promise<{ status: string; lola_dem: any; provenance: any }> {
  const res = await fetch(`${BASE_URL}/health`);
  if (!res.ok) throw new Error("Backend service unreachable");
  return res.json();
}

export async function fetchCandidateSites(): Promise<CandidateSite[]> {
  const res = await fetch(`${BASE_URL}/sites`);
  if (!res.ok) throw new Error("Failed to load candidate sites catalog");
  return res.json();
}

export async function fetchCelestialGeometry(params: {
  latitude_deg: number;
  longitude_deg: number;
  utc_time: string;
  observer_height_m?: number;
}): Promise<{ sun: CelestialTargetTelemetry; earth: CelestialTargetTelemetry; lunar_orientation: any }> {
  const res = await fetch(`${BASE_URL}/geometry`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });
  if (!res.ok) throw new Error("Failed to calculate celestial geometry");
  return res.json();
}

export async function fetchHorizonSkyline(params: {
  latitude_deg: number;
  longitude_deg: number;
  observer_height_m?: number;
  azimuth_step_deg?: number;
}): Promise<SkylineProfileData> {
  const res = await fetch(`${BASE_URL}/horizon`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });
  if (!res.ok) throw new Error("Failed to calculate terrain skyline");
  return res.json();
}

export async function fetchIlluminationTimeline(params: {
  latitude_deg: number;
  longitude_deg: number;
  start_time: string;
  end_time: string;
  step_minutes?: number;
  observer_height_m?: number;
}): Promise<SiteTimelineResult> {
  const res = await fetch(`${BASE_URL}/illumination`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });
  if (!res.ok) throw new Error("Failed to calculate illumination timeline");
  return res.json();
}

export async function fetchHorizonReplayComparison(params: {
  site_a_lat: number;
  site_a_lon: number;
  site_a_name: string;
  site_a_start_time: string;
  site_b_lat: number;
  site_b_lon: number;
  site_b_name: string;
  site_b_start_time: string;
  duration_days?: number;
  step_minutes?: number;
  observer_height_m?: number;
}): Promise<ComparisonResult> {
  const res = await fetch(`${BASE_URL}/compare`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });
  if (!res.ok) throw new Error("Failed to execute HORIZON REPLAY comparison");
  return res.json();
}

export async function fetchLandingRobustness(params: {
  center_lat: number;
  center_lon: number;
  semi_major_km?: number;
  semi_minor_km?: number;
  orientation_azimuth_deg?: number;
  start_time?: string;
  end_time?: string;
  sample_grid_size?: number;
  observer_height_m?: number;
}): Promise<RobustnessResult> {
  const res = await fetch(`${BASE_URL}/robustness`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });
  if (!res.ok) throw new Error("Failed to compute landing robustness");
  return res.json();
}

export async function downloadDecisionBriefCsv(params: {
  site_a_lat: number;
  site_a_lon: number;
  site_a_name: string;
  site_a_start_time: string;
  site_b_lat: number;
  site_b_lon: number;
  site_b_name: string;
  site_b_start_time: string;
  duration_days?: number;
  step_minutes?: number;
  observer_height_m?: number;
}): Promise<void> {
  const res = await fetch(`${BASE_URL}/report/csv`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });
  if (!res.ok) throw new Error("Failed to generate CSV report");
  const blob = await res.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "kepler_decision_brief.csv";
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(url);
  document.body.removeChild(a);
}
