import React, { useState, useEffect } from "react";
import {
  CandidateSite,
  SiteTimelineResult,
  TimelineSample,
} from "../../types";
import {
  fetchCandidateSites,
  fetchIlluminationTimeline,
} from "../../services/api";
import { PolarPlot } from "../../components/3d/PolarPlot";
import { SpacecraftViewer3D } from "../../components/3d/SpacecraftViewer3D";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
} from "recharts";

interface MissionControlViewProps {
  onOpenRobustness: (site: CandidateSite) => void;
  onOpenDecisionBrief: (site: CandidateSite, timeline: SiteTimelineResult) => void;
  activeSite?: CandidateSite | null;
  onSelectSite?: (site: CandidateSite) => void;
  onTimelineGenerated?: (site: CandidateSite, timeline: SiteTimelineResult) => void;
}

export const MissionControlView: React.FC<MissionControlViewProps> = ({
  onOpenRobustness,
  onOpenDecisionBrief,
  activeSite,
  onSelectSite,
  onTimelineGenerated,
}) => {
  const [sites, setSites] = useState<CandidateSite[]>([]);
  const [selectedSiteId, setSelectedSiteId] = useState<string>(activeSite?.id || "SHACKLETON_RIM");
  const [startTime, setStartTime] = useState<string>("2026-10-01T00:00:00");
  const [endTime, setEndTime] = useState<string>("2026-10-14T00:00:00");
  const [stepMinutes, setStepMinutes] = useState<number>(60);
  const [observerHeight, setObserverHeight] = useState<number>(2.0);

  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [timelineData, setTimelineData] = useState<SiteTimelineResult | null>(null);

  const [scrubIndex, setScrubIndex] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [displayMode, setDisplayMode] = useState<"3D_SPACECRAFT" | "POLAR_RADAR">("3D_SPACECRAFT");

  // Keep selectedSiteId in sync if activeSite changes externally
  useEffect(() => {
    if (activeSite && activeSite.id !== selectedSiteId) {
      setSelectedSiteId(activeSite.id);
    }
  }, [activeSite?.id]);

  useEffect(() => {
    fetchCandidateSites()
      .then((data) => {
        setSites(data);
        if (data.length > 0 && !selectedSiteId) {
          const initSite = activeSite || data[0];
          setSelectedSiteId(initSite.id);
          if (onSelectSite && !activeSite) onSelectSite(initSite);
        }
      })
      .catch((err) => setError("Failed to load candidate sites: " + err.message));
  }, []);

  const handleCompute = async () => {
    const site = sites.find((s) => s.id === selectedSiteId);
    if (!site) return;

    setLoading(true);
    setError(null);
    try {
      const data = await fetchIlluminationTimeline({
        latitude_deg: site.latitude_deg,
        longitude_deg: site.longitude_deg,
        start_time: startTime,
        end_time: endTime,
        step_minutes: stepMinutes,
        observer_height_m: observerHeight,
      });
      setTimelineData(data);
      if (onTimelineGenerated && site) {
        onTimelineGenerated(site, data);
      }
      setScrubIndex(0);
    } catch (err: any) {
      setError(err.message || "Computation failed");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (sites.length > 0) {
      handleCompute();
    }
  }, [selectedSiteId]);

  // Playback timer
  useEffect(() => {
    let interval: any = null;
    if (isPlaying && timelineData && timelineData.time_series.length > 0) {
      interval = setInterval(() => {
        setScrubIndex((prev) => {
          if (prev >= timelineData.time_series.length - 1) {
            setIsPlaying(false);
            return 0;
          }
          return prev + 1;
        });
      }, 100);
    }
    return () => clearInterval(interval);
  }, [isPlaying, timelineData]);

  const currentSample: TimelineSample | null =
    timelineData && timelineData.time_series[scrubIndex]
      ? timelineData.time_series[scrubIndex]
      : null;

  const currentSite = sites.find((s) => s.id === selectedSiteId);

  // Prepare chart data
  const chartData = timelineData?.time_series.map((s, idx) => ({
    idx,
    time: s.utc.substring(5, 16).replace("T", " "),
    sunEl: Number(s.sun.elevation_deg.toFixed(2)),
    sunSkyline: Number((s.sun.skyline_elevation_deg ?? 0).toFixed(2)),
    sunClearance: Number((s.sun.clearance_deg ?? 0).toFixed(2)),
    earthEl: Number(s.earth.elevation_deg.toFixed(2)),
    earthSkyline: Number((s.earth.skyline_elevation_deg ?? 0).toFixed(2)),
    power: Number(s.estimated_power_watts.toFixed(1)),
    sunVisible: s.sun.state === "VISIBLE" ? 1 : 0,
    earthVisible: s.earth.state === "VISIBLE" ? 1 : 0,
  }));

  return (
    <div className="flex-1 flex flex-col p-4 sm:p-6 space-y-4 overflow-y-auto max-w-[1920px] mx-auto w-full bg-black text-slate-100 font-sans">
      {/* Control Bar */}
      <div className="rounded-2xl p-4 shadow-xl flex flex-wrap items-center gap-4 text-xs font-mono bg-neutral-950 border border-white/10">
        <div className="flex items-center space-x-2">
          <span className="text-neutral-400 uppercase tracking-wider font-semibold">Candidate Target:</span>
          <select
            value={selectedSiteId}
            onChange={(e) => {
              const id = e.target.value;
              setSelectedSiteId(id);
              const site = sites.find((s) => s.id === id);
              if (site && onSelectSite) {
                onSelectSite(site);
              }
            }}
            className="bg-black border border-white/20 text-white rounded px-3 py-1.5 focus:border-white focus:outline-none font-semibold cursor-pointer"
          >
            {sites.map((site) => (
              <option key={site.id} value={site.id}>
                {site.name} ({site.latitude_deg.toFixed(2)}°, {site.longitude_deg.toFixed(2)}°)
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center space-x-2">
          <span className="text-neutral-400 uppercase tracking-wider font-semibold">UTC Start:</span>
          <input
            type="text"
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
            placeholder="YYYY-MM-DDTHH:MM:SS"
            className="bg-black border border-white/20 text-white rounded px-2.5 py-1.5 w-44 focus:border-white focus:outline-none"
          />
        </div>

        <div className="flex items-center space-x-2">
          <span className="text-neutral-400 uppercase tracking-wider font-semibold">UTC End:</span>
          <input
            type="text"
            value={endTime}
            onChange={(e) => setEndTime(e.target.value)}
            placeholder="YYYY-MM-DDTHH:MM:SS"
            className="bg-black border border-white/20 text-white rounded px-2.5 py-1.5 w-44 focus:border-white focus:outline-none"
          />
        </div>

        <div className="flex items-center space-x-2">
          <span className="text-neutral-400 uppercase tracking-wider font-semibold">Step:</span>
          <select
            value={stepMinutes}
            onChange={(e) => setStepMinutes(Number(e.target.value))}
            className="bg-black border border-white/20 text-white rounded px-2.5 py-1.5 focus:border-white focus:outline-none cursor-pointer"
          >
            <option value={15}>15 min</option>
            <option value={30}>30 min</option>
            <option value={60}>1 hour</option>
            <option value={120}>2 hours</option>
          </select>
        </div>

        <div className="flex items-center space-x-2">
          <span className="text-neutral-400 uppercase tracking-wider font-semibold">Mast (m):</span>
          <input
            type="number"
            step="0.5"
            min="0.5"
            max="15"
            value={observerHeight}
            onChange={(e) => setObserverHeight(Number(e.target.value))}
            className="bg-black border border-white/20 text-white font-bold rounded px-2.5 py-1.5 w-16 focus:border-white focus:outline-none"
          />
        </div>

        <button
          onClick={handleCompute}
          disabled={loading}
          className="ml-auto px-6 py-2.5 rounded-full bg-white text-black font-semibold text-xs tracking-wider uppercase transition-all hover:bg-neutral-200 disabled:opacity-50 cursor-pointer shadow-sm"
        >
          {loading ? (
            <span>Computing Ephemeris...</span>
          ) : (
            <span>Execute Telemetry</span>
          )}
        </button>
      </div>

      {error && (
        <div className="bg-neutral-900 border border-white/20 text-neutral-200 p-3.5 rounded-xl text-xs flex items-center space-x-2.5 font-mono">
          <span className="font-bold text-white font-mono">[ALERT]</span>
          <span>{error}</span>
        </div>
      )}

      {/* KPI Stat Cards: High-Contrast Monochromatic Analytics */}
      {timelineData && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <div className="rounded-2xl p-4 bg-neutral-950 border border-white/[0.08] hover:border-white/20 transition-all">
            <div className="flex items-center justify-between text-neutral-400 text-xs">
              <span className="font-semibold tracking-wide uppercase text-[11px]">Solar Illumination</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-neutral-900 text-neutral-300 border border-white/10 font-medium">Solar</span>
            </div>
            <div className="text-2xl font-bold text-white font-mono mt-1.5">
              {timelineData.metrics.illumination_percentage.toFixed(1)}%
            </div>
            <div className="text-[11px] text-neutral-400 font-mono mt-0.5">
              {timelineData.metrics.total_sun_hours.toFixed(1)}h of {timelineData.interval.total_duration_hours.toFixed(1)}h span
            </div>
          </div>

          <div className="rounded-2xl p-4 bg-neutral-950 border border-white/[0.08] hover:border-white/20 transition-all">
            <div className="flex items-center justify-between text-neutral-400 text-xs">
              <span className="font-semibold tracking-wide uppercase text-[11px]">Max Darkness</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-neutral-900 text-neutral-300 border border-white/10 font-medium">Shadow</span>
            </div>
            <div className="text-2xl font-bold text-white font-mono mt-1.5">
              {timelineData.metrics.longest_continuous_darkness_hours.toFixed(1)}h
            </div>
            <div className="text-[11px] text-neutral-400 font-mono mt-0.5">
              Continuous battery drawdown span
            </div>
          </div>

          <div className="rounded-2xl p-4 bg-neutral-950 border border-white/[0.08] hover:border-white/20 transition-all">
            <div className="flex items-center justify-between text-neutral-400 text-xs">
              <span className="font-semibold tracking-wide uppercase text-[11px]">Earth DTE Visibility</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-neutral-900 text-neutral-300 border border-white/10 font-medium">DTE Link</span>
            </div>
            <div className="text-2xl font-bold text-white font-mono mt-1.5">
              {timelineData.metrics.earth_visibility_percentage.toFixed(1)}%
            </div>
            <div className="text-[11px] text-neutral-400 font-mono mt-0.5">
              {timelineData.metrics.total_earth_visible_hours.toFixed(1)}h direct-to-Earth
            </div>
          </div>

          <div className="rounded-2xl p-4 bg-neutral-950 border border-white/[0.08] hover:border-white/20 transition-all">
            <div className="flex items-center justify-between text-neutral-400 text-xs">
              <span className="font-semibold tracking-wide uppercase text-[11px]">Max Comm Blackout</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-neutral-900 text-neutral-300 border border-white/10 font-medium">Occlusion</span>
            </div>
            <div className="text-2xl font-bold text-white font-mono mt-1.5">
              {timelineData.metrics.longest_communication_blackout_hours.toFixed(1)}h
            </div>
            <div className="text-[11px] text-neutral-400 font-mono mt-0.5">
              Longest lunar terrain occlusion
            </div>
          </div>

          <div className="rounded-2xl p-4 bg-neutral-950 border border-white/[0.08] hover:border-white/20 transition-all">
            <div className="flex items-center justify-between text-neutral-400 text-xs">
              <span className="font-semibold tracking-wide uppercase text-[11px]">Simultaneous Ops</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-neutral-900 text-neutral-300 border border-white/10 font-medium">Dual Link</span>
            </div>
            <div className="text-2xl font-bold text-white font-mono mt-1.5">
              {timelineData.metrics.simultaneous_percentage.toFixed(1)}%
            </div>
            <div className="text-[11px] text-neutral-400 font-mono mt-0.5">
              {timelineData.metrics.total_simultaneous_hours.toFixed(1)}h dual operations
            </div>
          </div>
        </div>
      )}

      {/* Main Workspace Grid: 3D Spacecraft Studio & Telemetry Readouts */}
      {timelineData && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Left Column: 3D Spacecraft & Topocentric Horizon Studio (7 cols) */}
          <div className="lg:col-span-7 glass-panel hud-corner rounded-xl p-4 flex flex-col border border-white/10 shadow-2xl">
            <div className="flex flex-wrap items-center justify-between mb-3 border-b border-white/10 pb-2.5 gap-2">
              <div className="flex items-center space-x-2">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
                  {displayMode === "3D_SPACECRAFT"
                    ? "3D Lunar Surface & Spacecraft Studio"
                    : "Topocentric Horizon Radar Profile"}
                </h3>
              </div>

              {/* View Switcher Toggle */}
              <div className="flex items-center space-x-1 bg-black p-1 rounded-lg border border-white/10">
                <button
                  onClick={() => setDisplayMode("3D_SPACECRAFT")}
                  className={`px-3 py-1 rounded text-xs transition font-semibold flex items-center space-x-1.5 cursor-pointer ${
                    displayMode === "3D_SPACECRAFT"
                      ? "bg-white text-black font-semibold shadow-sm"
                      : "text-neutral-400 hover:text-white"
                  }`}
                  title="Interactive 3D Spacecraft and Surface Lighting"
                >
                  <span>3D Spacecraft</span>
                </button>
                <button
                  onClick={() => setDisplayMode("POLAR_RADAR")}
                  className={`px-3 py-1 rounded text-xs transition font-semibold flex items-center space-x-1.5 cursor-pointer ${
                    displayMode === "POLAR_RADAR"
                      ? "bg-white text-black font-semibold shadow-sm"
                      : "text-neutral-400 hover:text-white"
                  }`}
                  title="2D Polar Skyline Radar Plot"
                >
                  <span>Polar Radar</span>
                </button>
              </div>
            </div>

            <div className="flex-1 flex items-center justify-center min-h-[460px]">
              {displayMode === "3D_SPACECRAFT" ? (
                <SpacecraftViewer3D
                  sunTelemetry={currentSample?.sun}
                  earthTelemetry={currentSample?.earth}
                  skyline={timelineData.skyline}
                  siteName={currentSite?.name}
                  isNight={currentSample?.sun.state !== "VISIBLE"}
                />
              ) : (
                <PolarPlot
                  skyline={timelineData.skyline}
                  sun={currentSample?.sun}
                  earth={currentSample?.earth}
                  siteName={currentSite?.name}
                  size={400}
                />
              )}
            </div>

            {/* Scrub Slider Bar: Clean Monochromatic Scrubbing */}
            <div className="mt-4 pt-3 border-t border-white/10 font-mono">
              <div className="flex items-center justify-between text-xs text-neutral-300 mb-2">
                <div className="flex items-center space-x-3">
                  <button
                    onClick={() => setIsPlaying(!isPlaying)}
                    className="bg-neutral-900 hover:bg-neutral-800 border border-white/20 text-white px-3 py-1 rounded text-xs font-semibold flex items-center space-x-1.5 transition-all cursor-pointer shadow-sm"
                  >
                    {isPlaying ? <span>PAUSE</span> : <span>PLAY TIMELINE</span>}
                  </button>
                  <span className="text-white font-bold">{currentSample?.utc}</span>
                </div>
                <span className="text-neutral-400">
                  Sample {scrubIndex + 1} / {timelineData.time_series.length}
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={timelineData.time_series.length - 1}
                value={scrubIndex}
                onChange={(e) => {
                  setIsPlaying(false);
                  setScrubIndex(Number(e.target.value));
                }}
                className="w-full accent-white bg-neutral-900 h-2 rounded cursor-pointer border border-white/10"
              />
            </div>
          </div>

          {/* Right Column: Instant Telemetry & Link Budgets (5 cols) */}
          <div className="lg:col-span-5 flex flex-col space-y-4">
            {/* Live Point Telemetry Inspector */}
            <div className="glass-panel hud-corner rounded-xl p-4 font-mono border border-white/10 shadow-2xl">
              <div className="flex items-center justify-between mb-3 border-b border-white/10 pb-2">
                <span className="text-xs uppercase tracking-wider text-neutral-300 font-bold flex items-center space-x-1.5">
                  <span>Instantaneous Telemetry at Cursor</span>
                </span>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                    currentSample?.joint_state === "SIMULTANEOUS_POWER_AND_COMM"
                      ? "bg-white text-black font-semibold"
                      : "bg-neutral-900 text-neutral-300 border border-white/15"
                  }`}
                >
                  {currentSample?.joint_state.replace(/_/g, " ")}
                </span>
              </div>

              {/* Sun Telemetry Table */}
              <div className="bg-black border border-white/10 rounded-lg p-3.5 mb-3">
                <div className="flex items-center justify-between text-xs text-white font-bold mb-2">
                  <span className="tracking-wider uppercase">Solar Generation & Position</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${
                    currentSample?.sun.state === "VISIBLE" ? "bg-neutral-800 text-white border border-white/20" : "bg-neutral-950 text-neutral-400 border border-white/10"
                  }`}>
                    {currentSample?.sun.state}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-y-1.5 text-xs">
                  <div className="text-neutral-400">Sun Elevation:</div>
                  <div className="text-white text-right font-bold">{currentSample?.sun.elevation_deg.toFixed(3)}°</div>

                  <div className="text-neutral-400">Sun Azimuth:</div>
                  <div className="text-white text-right">{currentSample?.sun.azimuth_deg.toFixed(3)}°</div>

                  <div className="text-neutral-400">Skyline Elevation:</div>
                  <div className="text-white text-right">{currentSample?.sun.skyline_elevation_deg?.toFixed(3)}°</div>

                  <div className="text-neutral-400">Horizon Clearance Margin:</div>
                  <div className={`text-right font-bold ${
                    (currentSample?.sun.clearance_deg ?? 0) >= 0 ? "text-white" : "text-neutral-400"
                  }`}>
                    {(currentSample?.sun.clearance_deg ?? 0) >= 0 ? "+" : ""}
                    {currentSample?.sun.clearance_deg?.toFixed(3)}°
                  </div>

                  <div className="text-neutral-400">Blocking Ridge Distance:</div>
                  <div className="text-neutral-300 text-right">
                    {currentSample?.sun.obstacle_distance_km ? `${currentSample.sun.obstacle_distance_km.toFixed(2)} km` : "None"}
                  </div>

                  <div className="text-neutral-400">Array Power (2.5m² GaAs):</div>
                  <div className="text-white text-right font-black text-sm">
                    {currentSample?.estimated_power_watts.toFixed(1)} W
                  </div>
                </div>
              </div>

              {/* Earth Telemetry Table */}
              <div className="bg-black border border-white/10 rounded-lg p-3.5">
                <div className="flex items-center justify-between text-xs text-white font-bold mb-2">
                  <span className="tracking-wider uppercase">Earth DTE Communications</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${
                    currentSample?.earth.state === "VISIBLE" ? "bg-neutral-800 text-white border border-white/20" : "bg-neutral-950 text-neutral-400 border border-white/10"
                  }`}>
                    {currentSample?.earth.state}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-y-1.5 text-xs">
                  <div className="text-neutral-400">Earth Elevation:</div>
                  <div className="text-white text-right font-bold">{currentSample?.earth.elevation_deg.toFixed(3)}°</div>

                  <div className="text-neutral-400">Earth Azimuth:</div>
                  <div className="text-white text-right">{currentSample?.earth.azimuth_deg.toFixed(3)}°</div>

                  <div className="text-neutral-400">Skyline Elevation:</div>
                  <div className="text-white text-right">{currentSample?.earth.skyline_elevation_deg?.toFixed(3)}°</div>

                  <div className="text-neutral-400">Clearance Margin:</div>
                  <div className={`text-right font-bold ${
                    (currentSample?.earth.clearance_deg ?? 0) >= 0 ? "text-white" : "text-neutral-400"
                  }`}>
                    {(currentSample?.earth.clearance_deg ?? 0) >= 0 ? "+" : ""}
                    {currentSample?.earth.clearance_deg?.toFixed(3)}°
                  </div>

                  <div className="text-neutral-400">Blocking Ridge Distance:</div>
                  <div className="text-neutral-300 text-right">
                    {currentSample?.earth.obstacle_distance_km ? `${currentSample.earth.obstacle_distance_km.toFixed(2)} km` : "None"}
                  </div>
                </div>
              </div>
            </div>

            {/* Decision Analysis Actions */}
            <div className="glass-panel hud-corner rounded-xl p-4 font-mono flex flex-col space-y-2.5 border border-white/10 shadow-2xl">
              <span className="text-xs uppercase tracking-wider text-neutral-400 font-bold">
                Decision Support Tools
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <button
                  onClick={() => currentSite && onOpenRobustness(currentSite)}
                  className="bg-neutral-900 hover:bg-neutral-800 border border-white/15 text-white text-xs py-2.5 px-3.5 rounded-xl flex items-center justify-between transition-all font-semibold cursor-pointer shadow-sm"
                >
                  <span>Dispersion Ellipse</span>
                  <span className="text-white font-bold ml-1">&rarr;</span>
                </button>
                <button
                  onClick={() => currentSite && timelineData && onOpenDecisionBrief(currentSite, timelineData)}
                  className="bg-neutral-900 hover:bg-neutral-800 border border-white/15 text-white text-xs py-2.5 px-3.5 rounded-xl flex items-center justify-between transition-all font-semibold cursor-pointer shadow-sm"
                >
                  <span>Decision Brief & CSV</span>
                  <span className="text-white font-bold ml-1">&rarr;</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Time Series Charts in Deep OLED Black */}
      {timelineData && (
        <div className="glass-panel hud-corner rounded-xl p-4 font-mono border border-white/10 shadow-2xl">
          <div className="flex items-center justify-between mb-3 border-b border-white/10 pb-2">
            <div className="flex items-center space-x-2">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                Full Ephemeris & Power Timeline Profile
              </h3>
            </div>
            <div className="flex items-center space-x-4 text-xs font-semibold">
              <span className="flex items-center space-x-1.5 text-white">
                <span className="w-2.5 h-2.5 bg-white rounded-full inline-block"></span>
                <span>Sun Elevation</span>
              </span>
              <span className="flex items-center space-x-1.5 text-neutral-400">
                <span className="w-2.5 h-2.5 bg-neutral-400 rounded-full inline-block"></span>
                <span>Earth Elevation</span>
              </span>
              <span className="flex items-center space-x-1.5 text-neutral-500">
                <span className="w-2.5 h-2.5 bg-neutral-600 rounded-full inline-block"></span>
                <span>Array Power (W)</span>
              </span>
            </div>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                <XAxis
                  dataKey="time"
                  stroke="#404040"
                  tick={{ fontSize: 10, fill: "#a3a3a3" }}
                  interval={Math.max(1, Math.floor((chartData?.length || 1) / 10))}
                />
                <YAxis
                  yAxisId="left"
                  stroke="#404040"
                  tick={{ fontSize: 10, fill: "#a3a3a3" }}
                  domain={[-10, 15]}
                  label={{ value: "Elevation (°)", angle: -90, position: "insideLeft", fill: "#a3a3a3", fontSize: 10 }}
                />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  stroke="#404040"
                  tick={{ fontSize: 10, fill: "#737373" }}
                  domain={[0, 1000]}
                  label={{ value: "Power (W)", angle: 90, position: "insideRight", fill: "#737373", fontSize: 10 }}
                />
                <Tooltip
                  contentStyle={{ backgroundColor: "#0a0a0a", borderColor: "#262626", fontSize: "11px", borderRadius: "8px", color: "#ffffff" }}
                />
                <ReferenceLine y={0} yAxisId="left" stroke="#262626" strokeDasharray="3 3" />
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="sunEl"
                  name="Sun Elevation"
                  stroke="#ffffff"
                  dot={false}
                  strokeWidth={2}
                />
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="earthEl"
                  name="Earth Elevation"
                  stroke="#a3a3a3"
                  dot={false}
                  strokeWidth={1.5}
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="power"
                  name="Array Power (W)"
                  stroke="#525252"
                  dot={false}
                  strokeWidth={2}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Scientific Provenance Section */}
      {timelineData && (
        <div className="glass-panel hud-corner rounded-xl p-4 font-mono text-xs border border-white/10 shadow-2xl">
          <div className="flex items-center space-x-2 text-slate-200 mb-2 font-bold tracking-wider">
            <span>SCIENTIFIC PROVENANCE & CALCULATION STANDARDS</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 text-slate-400">
            <div>
              <span className="text-slate-500 block text-[10px] uppercase">SPICE Ephemeris Kernels:</span>
              <span className="text-slate-200 font-semibold">
                {timelineData.provenance.spice_kernel_version} (DE421 + PCK00010)
              </span>
            </div>
            <div>
              <span className="text-slate-500 block text-[10px] uppercase">Topography DEM:</span>
              <span className="text-slate-200 font-semibold">
                {timelineData.provenance.dem_source} ({timelineData.provenance.dem_spatial_resolution_m}m/pix)
              </span>
            </div>
            <div>
              <span className="text-slate-500 block text-[10px] uppercase">Reference Frame:</span>
              <span className="text-slate-200 font-semibold">
                {timelineData.provenance.coordinate_system} (Curvature drop corrected)
              </span>
            </div>
            <div>
              <span className="text-slate-500 block text-[10px] uppercase">Calculated Method:</span>
              <span className="text-slate-200 font-semibold">
                {timelineData.provenance.calculation_method}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
