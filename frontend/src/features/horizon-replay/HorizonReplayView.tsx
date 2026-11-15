import React, { useState, useEffect, useRef } from "react";
import {
  CandidateSite,
  ComparisonResult,
  HorizonEvent,
  TimelineSample,
} from "../../types";
import { PolarPlot } from "../../components/3d/PolarPlot";
import { SpacecraftViewer3D } from "../../components/3d/SpacecraftViewer3D";
import {
  fetchCandidateSites,
  fetchHorizonReplayComparison,
} from "../../services/api";

interface HorizonReplayViewProps {
  sites?: CandidateSite[];
  comparisonData?: ComparisonResult | null;
  isLoading?: boolean;
  onRunComparison?: (params: {
    site_a_id: string;
    site_a_start: string;
    site_b_id: string;
    site_b_start: string;
    duration_days: number;
    step_minutes: number;
  }) => void;
  observerHeightM?: number;
}

export const HorizonReplayView: React.FC<HorizonReplayViewProps> = ({
  sites: propSites,
  comparisonData: propComparisonData,
  isLoading: propIsLoading,
  onRunComparison: propOnRunComparison,
  observerHeightM = 2.0,
}) => {
  const [internalSites, setInternalSites] = useState<CandidateSite[]>([]);
  const [internalCompData, setInternalCompData] = useState<ComparisonResult | null>(null);
  const [internalLoading, setInternalLoading] = useState<boolean>(false);

  const sites = propSites && propSites.length > 0 ? propSites : internalSites;
  const comparisonData = propComparisonData !== undefined ? propComparisonData : internalCompData;
  const isLoading = propIsLoading !== undefined ? propIsLoading : internalLoading;

  // Configurable Site & Date State
  const [siteAId, setSiteAId] = useState<string>("SHACKLETON_RIM");
  const [siteBId, setSiteBId] = useState<string>("MALAPERT_MASSIF");
  const [siteAStart, setSiteAStart] = useState<string>("2026-10-15T00:00:00");
  const [siteBStart, setSiteBStart] = useState<string>("2026-11-01T00:00:00");
  const [durationDays, setDurationDays] = useState<number>(14);

  // Replay Animation & Playback State
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);
  const [selectedEvent, setSelectedEvent] = useState<HorizonEvent | null>(null);
  const [viewModeA, setViewModeA] = useState<"3D" | "RADAR">("3D");
  const [viewModeB, setViewModeB] = useState<"3D" | "RADAR">("3D");

  useEffect(() => {
    if (!propSites || propSites.length === 0) {
      fetchCandidateSites().then((data) => {
        setInternalSites(data);
        if (data.length >= 2) {
          setSiteAId(data[0].id);
          setSiteBId(data[1].id);
        }
      });
    }
  }, [propSites]);

  const samplesA = comparisonData?.site_a.time_series || [];
  const samplesB = comparisonData?.site_b.time_series || [];
  const totalSamples = Math.min(samplesA.length, samplesB.length);

  const currentSampleA: TimelineSample | undefined = samplesA[currentIndex];
  const currentSampleB: TimelineSample | undefined = samplesB[currentIndex];

  // Playback timer loop
  const timerRef = useRef<any>(null);

  useEffect(() => {
    if (isPlaying && totalSamples > 1) {
      timerRef.current = setInterval(() => {
        setCurrentIndex((prev) => {
          if (prev >= totalSamples - 1) {
            setIsPlaying(false);
            return prev;
          }
          return prev + 1;
        });
      }, 500 / playbackSpeed);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isPlaying, totalSamples, playbackSpeed]);

  const handleSeek = (idx: number) => {
    setCurrentIndex(Math.max(0, Math.min(totalSamples - 1, idx)));
  };

  const handleJumpToEvent = (evt: HorizonEvent) => {
    setSelectedEvent(evt);
    // Find closest index matching event et
    if (samplesA.length > 0) {
      let closestIdx = 0;
      let minDiff = Infinity;
      samplesA.forEach((s, idx) => {
        const diff = Math.abs(s.et - evt.et);
        if (diff < minDiff) {
          minDiff = diff;
          closestIdx = idx;
        }
      });
      handleSeek(closestIdx);
    }
  };

  const triggerCompare = async () => {
    if (propOnRunComparison) {
      propOnRunComparison({
        site_a_id: siteAId,
        site_a_start: siteAStart,
        site_b_id: siteBId,
        site_b_start: siteBStart,
        duration_days: durationDays,
        step_minutes: 60,
      });
    } else {
      const siteA = sites.find((s) => s.id === siteAId) || sites[0];
      const siteB = sites.find((s) => s.id === siteBId) || (sites.length > 1 ? sites[1] : sites[0]);
      if (!siteA || !siteB) return;

      setInternalLoading(true);
      try {
        const data = await fetchHorizonReplayComparison({
          site_a_lat: siteA.latitude_deg,
          site_a_lon: siteA.longitude_deg,
          site_a_name: siteA.name,
          site_a_start_time: siteAStart,
          site_b_lat: siteB.latitude_deg,
          site_b_lon: siteB.longitude_deg,
          site_b_name: siteB.name,
          site_b_start_time: siteBStart,
          duration_days: durationDays,
          step_minutes: 60,
          observer_height_m: observerHeightM,
        });
        setInternalCompData(data);
      } catch (err) {
        console.error("Comparison error:", err);
      } finally {
        setInternalLoading(false);
      }
    }
    setCurrentIndex(0);
    setIsPlaying(false);
  };

  useEffect(() => {
    if (!comparisonData && sites.length >= 2 && !isLoading) {
      triggerCompare();
    }
  }, [sites]);

  return (
    <div className="flex-1 flex flex-col p-4 space-y-6 overflow-y-auto max-w-[1920px] mx-auto w-full bg-black text-slate-100 font-sans">
      {/* Top Comparison Controls Header */}
      <div className="glass-panel hud-corner rounded-2xl p-5 border border-white/10 bg-neutral-950">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-xs font-mono font-semibold uppercase px-2.5 py-0.5 rounded-full bg-neutral-900 border border-white/10 text-neutral-300">
                Synchronized Studio
              </span>
              <h2 className="text-lg font-bold text-white tracking-wide">
                HORIZON REPLAY &mdash; Comparative Ephemeris Studio
              </h2>
            </div>
            <p className="text-xs text-neutral-400 mt-1">
              Simulate, scrub, and contrast local terrain horizon skylines across independent landing sites and calendar epochs.
            </p>
          </div>

          <button
            onClick={triggerCompare}
            disabled={isLoading}
            className="px-6 py-2.5 rounded-full bg-white text-black font-semibold text-xs tracking-wider uppercase transition-all hover:bg-neutral-200 disabled:opacity-50 cursor-pointer shadow-sm"
          >
            {isLoading ? "Running Ephemeris..." : "Execute Comparison"}
          </button>
        </div>

        {/* Site and Epoch Selectors */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-4 border-t border-white/10 text-xs">
          {/* Site A Config */}
          <div className="p-4 rounded-xl bg-neutral-900/60 border border-white/10">
            <div className="flex items-center space-x-2 text-white font-semibold mb-2.5">
              <span className="w-2 h-2 rounded-full bg-white" />
              <span>PRIMARY CANDIDATE (SITE A)</span>
            </div>
            <div className="space-y-2.5">
              <div>
                <label className="text-[11px] text-neutral-400 block mb-1">Landing Location</label>
                <select
                  value={siteAId}
                  onChange={(e) => setSiteAId(e.target.value)}
                  className="w-full bg-black border border-white/20 rounded p-2 text-white font-mono text-xs focus:border-white outline-none cursor-pointer"
                >
                  {sites.map((s) => (
                    <option key={s.id} value={s.id} className="bg-black text-white">
                      {s.name} ({s.latitude_deg.toFixed(1)}°S, {s.longitude_deg.toFixed(1)}°E)
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-[11px] text-neutral-400 block mb-1">Mission Epoch (UTC)</label>
                <input
                  type="text"
                  value={siteAStart}
                  onChange={(e) => setSiteAStart(e.target.value)}
                  className="w-full bg-black border border-white/20 rounded p-2 text-white font-mono text-xs focus:border-white outline-none"
                />
              </div>
            </div>
          </div>

          {/* Site B Config */}
          <div className="p-4 rounded-xl bg-neutral-900/60 border border-white/10">
            <div className="flex items-center space-x-2 text-neutral-300 font-semibold mb-2.5">
              <span className="w-2 h-2 rounded-full bg-neutral-400" />
              <span>CONTRAST CANDIDATE (SITE B)</span>
            </div>
            <div className="space-y-2.5">
              <div>
                <label className="text-[11px] text-neutral-400 block mb-1">Landing Location</label>
                <select
                  value={siteBId}
                  onChange={(e) => setSiteBId(e.target.value)}
                  className="w-full bg-black border border-white/20 rounded p-2 text-white font-mono text-xs focus:border-white outline-none cursor-pointer"
                >
                  {sites.map((s) => (
                    <option key={s.id} value={s.id} className="bg-black text-white">
                      {s.name} ({s.latitude_deg.toFixed(1)}°S, {s.longitude_deg.toFixed(1)}°E)
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-[11px] text-neutral-400 block mb-1">Mission Epoch (UTC)</label>
                <input
                  type="text"
                  value={siteBStart}
                  onChange={(e) => setSiteBStart(e.target.value)}
                  className="w-full bg-black border border-white/20 rounded p-2 text-white font-mono text-xs focus:border-white outline-none"
                />
              </div>
            </div>
          </div>

          {/* Duration & Interval */}
          <div className="p-4 rounded-xl bg-neutral-900/60 border border-white/10 flex flex-col justify-between">
            <div>
              <span className="text-white font-semibold block mb-2 tracking-wide">MISSION WINDOW</span>
              <label className="text-[11px] text-neutral-400 block mb-1">
                Duration: <strong className="text-white font-mono">{durationDays} Earth Days</strong>
              </label>
              <input
                type="range"
                min="1"
                max="30"
                value={durationDays}
                onChange={(e) => setDurationDays(Number(e.target.value))}
                className="w-full accent-white cursor-pointer h-2 bg-neutral-900 border border-white/20 rounded"
              />
            </div>
            <div className="text-[11px] text-neutral-400 pt-2 border-t border-white/10 flex items-center justify-between font-mono">
              <span>Observer Mast:</span>
              <span className="text-white font-bold">{observerHeightM.toFixed(1)} m</span>
            </div>
          </div>
        </div>
      </div>

      {/* Dual Synchronized Horizon Canvases */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Site A Canvas */}
        <div className="rounded-2xl p-5 border border-white/10 bg-neutral-950 flex flex-col shadow-2xl">
          <div className="flex items-center justify-between pb-3 border-b border-white/10">
            <div>
              <span className="text-[10px] font-mono font-bold text-neutral-400 uppercase tracking-wider">
                VIEWPORT A (PRIMARY CANDIDATE)
              </span>
              <h3 className="text-sm font-bold text-white tracking-wide">
                {comparisonData?.site_a.name || "Site A"}
              </h3>
            </div>
            <div className="flex items-center space-x-2">
              {/* 3D vs Radar toggle */}
              <div className="flex items-center space-x-1 bg-black p-1 rounded-lg border border-white/15 text-[11px] font-mono">
                <button
                  onClick={() => setViewModeA("3D")}
                  className={`px-3 py-1 rounded transition flex items-center space-x-1 cursor-pointer ${
                    viewModeA === "3D" ? "bg-white text-black font-semibold text-xs" : "text-neutral-400 hover:text-white"
                  }`}
                  title="3D Spacecraft View"
                >
                  <span>3D</span>
                </button>
                <button
                  onClick={() => setViewModeA("RADAR")}
                  className={`px-3 py-1 rounded transition flex items-center space-x-1 cursor-pointer ${
                    viewModeA === "RADAR" ? "bg-white text-black font-semibold text-xs" : "text-neutral-400 hover:text-white"
                  }`}
                  title="2D Polar Skyline Radar"
                >
                  <span>Radar</span>
                </button>
              </div>

              {currentSampleA && (
                <span className="text-[11px] font-mono px-2.5 py-1 rounded-md border border-white/20 uppercase font-semibold bg-neutral-900 text-white">
                  {currentSampleA.joint_state.replace(/_/g, " ")}
                </span>
              )}
            </div>
          </div>

          <div className="py-2 flex justify-center min-h-[340px]">
            {comparisonData ? (
              viewModeA === "3D" ? (
                <div className="w-full h-80 rounded-xl overflow-hidden border border-white/10 bg-black">
                  <SpacecraftViewer3D
                    sunTelemetry={currentSampleA?.sun}
                    earthTelemetry={currentSampleA?.earth}
                    skyline={comparisonData.site_a.skyline}
                    siteName={comparisonData.site_a.name}
                    isNight={currentSampleA?.sun.state !== "VISIBLE"}
                  />
                </div>
              ) : (
                <PolarPlot
                  skylinePoints={comparisonData.site_a.skyline.skyline_profile}
                  sunTelemetry={currentSampleA?.sun}
                  earthTelemetry={currentSampleA?.earth}
                  siteName={comparisonData.site_a.name}
                  size={320}
                />
              )
            ) : (
              <div className="h-64 flex items-center justify-center text-xs text-neutral-500 font-mono">
                Execute comparison to render 360° terrain skyline...
              </div>
            )}
          </div>

          {/* Telemetry Strip A */}
          {currentSampleA && (
            <div className="grid grid-cols-3 gap-2.5 p-3.5 rounded-xl bg-neutral-900/60 border border-white/10 text-xs font-mono">
              <div className="p-2.5 rounded-lg bg-black border border-white/5">
                <span className="text-[10px] text-neutral-500 block uppercase">Sun El / Clear</span>
                <span className="text-white font-bold text-sm">
                  {currentSampleA.sun.elevation_deg.toFixed(2)}°
                </span>
                <span className="text-[10px] text-neutral-400 ml-1">
                  ({(currentSampleA.sun.clearance_deg ?? 0) >= 0 ? `+${(currentSampleA.sun.clearance_deg ?? 0).toFixed(1)}` : (currentSampleA.sun.clearance_deg ?? 0).toFixed(1)}°)
                </span>
              </div>
              <div className="p-2.5 rounded-lg bg-black border border-white/5">
                <span className="text-[10px] text-neutral-500 block uppercase">Earth El / Clear</span>
                <span className="text-white font-bold text-sm">
                  {currentSampleA.earth.elevation_deg.toFixed(2)}°
                </span>
                <span className="text-[10px] text-neutral-400 ml-1">
                  ({(currentSampleA.earth.clearance_deg ?? 0) >= 0 ? `+${(currentSampleA.earth.clearance_deg ?? 0).toFixed(1)}` : (currentSampleA.earth.clearance_deg ?? 0).toFixed(1)}°)
                </span>
              </div>
              <div className="p-2.5 rounded-lg bg-black border border-white/5">
                <span className="text-[10px] text-neutral-500 block uppercase">Est. Solar Power</span>
                <span className="text-white font-bold text-sm">
                  {currentSampleA.estimated_power_watts.toFixed(0)} W
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Site B Canvas */}
        <div className="rounded-2xl p-5 border border-white/10 bg-neutral-950 flex flex-col shadow-2xl">
          <div className="flex items-center justify-between pb-3 border-b border-white/10">
            <div>
              <span className="text-[10px] font-mono font-bold text-neutral-400 uppercase tracking-wider">
                VIEWPORT B (CONTRAST CANDIDATE)
              </span>
              <h3 className="text-sm font-bold text-white tracking-wide">
                {comparisonData?.site_b.name || "Site B"}
              </h3>
            </div>
            <div className="flex items-center space-x-2">
              {/* 3D vs Radar toggle */}
              <div className="flex items-center space-x-1 bg-black p-1 rounded-lg border border-white/15 text-[11px] font-mono">
                <button
                  onClick={() => setViewModeB("3D")}
                  className={`px-3 py-1 rounded transition flex items-center space-x-1 cursor-pointer ${
                    viewModeB === "3D" ? "bg-white text-black font-semibold text-xs" : "text-neutral-400 hover:text-white"
                  }`}
                  title="3D Spacecraft View"
                >
                  <span>3D</span>
                </button>
                <button
                  onClick={() => setViewModeB("RADAR")}
                  className={`px-3 py-1 rounded transition flex items-center space-x-1 cursor-pointer ${
                    viewModeB === "RADAR" ? "bg-white text-black font-semibold text-xs" : "text-neutral-400 hover:text-white"
                  }`}
                  title="2D Polar Skyline Radar"
                >
                  <span>Radar</span>
                </button>
              </div>

              {currentSampleB && (
                <span className="text-[11px] font-mono px-2.5 py-1 rounded-md border border-white/20 uppercase font-semibold bg-neutral-900 text-white">
                  {currentSampleB.joint_state.replace(/_/g, " ")}
                </span>
              )}
            </div>
          </div>

          <div className="py-2 flex justify-center min-h-[340px]">
            {comparisonData ? (
              viewModeB === "3D" ? (
                <div className="w-full h-80 rounded-xl overflow-hidden border border-white/10 bg-black">
                  <SpacecraftViewer3D
                    sunTelemetry={currentSampleB?.sun}
                    earthTelemetry={currentSampleB?.earth}
                    skyline={comparisonData.site_b.skyline}
                    siteName={comparisonData.site_b.name}
                    isNight={currentSampleB?.sun.state !== "VISIBLE"}
                  />
                </div>
              ) : (
                <PolarPlot
                  skylinePoints={comparisonData.site_b.skyline.skyline_profile}
                  sunTelemetry={currentSampleB?.sun}
                  earthTelemetry={currentSampleB?.earth}
                  siteName={comparisonData.site_b.name}
                  size={320}
                />
              )
            ) : (
              <div className="h-64 flex items-center justify-center text-xs text-neutral-500 font-mono">
                Execute comparison to render 360° terrain skyline...
              </div>
            )}
          </div>

          {/* Telemetry Strip B */}
          {currentSampleB && (
            <div className="grid grid-cols-3 gap-2.5 p-3.5 rounded-xl bg-neutral-900/60 border border-white/10 text-xs font-mono">
              <div className="p-2.5 rounded-lg bg-black border border-white/5">
                <span className="text-[10px] text-neutral-500 block uppercase">Sun El / Clear</span>
                <span className="text-white font-bold text-sm">
                  {currentSampleB.sun.elevation_deg.toFixed(2)}°
                </span>
                <span className="text-[10px] text-neutral-400 ml-1">
                  ({(currentSampleB.sun.clearance_deg ?? 0) >= 0 ? `+${(currentSampleA?.sun.clearance_deg ?? 0).toFixed(1)}` : (currentSampleB.sun.clearance_deg ?? 0).toFixed(1)}°)
                </span>
              </div>
              <div className="p-2.5 rounded-lg bg-black border border-white/5">
                <span className="text-[10px] text-neutral-500 block uppercase">Earth El / Clear</span>
                <span className="text-white font-bold text-sm">
                  {currentSampleB.earth.elevation_deg.toFixed(2)}°
                </span>
                <span className="text-[10px] text-neutral-400 ml-1">
                  ({(currentSampleB.earth.clearance_deg ?? 0) >= 0 ? `+${(currentSampleB.earth.clearance_deg ?? 0).toFixed(1)}` : (currentSampleB.earth.clearance_deg ?? 0).toFixed(1)}°)
                </span>
              </div>
              <div className="p-2.5 rounded-lg bg-black border border-white/5">
                <span className="text-[10px] text-neutral-500 block uppercase">Est. Solar Power</span>
                <span className="text-white font-bold text-sm">
                  {currentSampleB.estimated_power_watts.toFixed(0)} W
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Synchronized Replay Timeline Player */}
      {comparisonData && totalSamples > 0 && (
        <div className="rounded-2xl p-5 border border-white/10 bg-neutral-950 space-y-4 shadow-2xl">
          <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-white/10">
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setIsPlaying(!isPlaying)}
                className="px-4 h-9 rounded-xl bg-white text-black font-semibold text-xs tracking-wider uppercase transition-all hover:bg-neutral-200 cursor-pointer shadow-sm"
                title={isPlaying ? "Pause simulation" : "Play simulation"}
              >
                <span>{isPlaying ? "PAUSE" : "PLAY"}</span>
              </button>

              <button
                onClick={() => handleSeek(0)}
                className="px-3 h-9 rounded-xl bg-neutral-900 hover:bg-neutral-800 border border-white/15 text-white transition-colors text-xs font-mono font-semibold cursor-pointer"
                title="Restart simulation"
              >
                <span>RESET</span>
              </button>

              <button
                onClick={() => handleSeek(currentIndex - 1)}
                className="px-3 h-9 rounded-xl bg-neutral-900 hover:bg-neutral-800 border border-white/15 text-white transition-colors text-xs font-mono font-semibold cursor-pointer"
                title="Step -1 hr"
              >
                <span>-1H</span>
              </button>

              <button
                onClick={() => handleSeek(currentIndex + 1)}
                className="px-3 h-9 rounded-xl bg-neutral-900 hover:bg-neutral-800 border border-white/15 text-white transition-colors text-xs font-mono font-semibold cursor-pointer"
                title="Step +1 hr"
              >
                <span>+1H</span>
              </button>

              <div className="flex items-center space-x-1 border-l border-white/10 pl-3">
                {[1, 5, 20].map((spd) => (
                  <button
                    key={spd}
                    onClick={() => setPlaybackSpeed(spd)}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-mono transition-colors cursor-pointer ${
                      playbackSpeed === spd
                        ? "bg-white text-black font-bold"
                        : "bg-neutral-900 text-neutral-400 hover:text-white border border-white/10"
                    }`}
                  >
                    {spd}x
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center space-x-3 text-xs font-mono">
              <span className="text-neutral-500 uppercase">Frame:</span>
              <span className="text-white font-bold">{currentIndex + 1} / {totalSamples}</span>
              <span className="text-neutral-500 uppercase border-l border-white/10 pl-3">Site A UTC:</span>
              <span className="text-white font-bold">{currentSampleA?.utc}</span>
            </div>
          </div>

          {/* Interactive Scrub Slider */}
          <div className="space-y-1.5">
            <input
              type="range"
              min="0"
              max={totalSamples - 1}
              value={currentIndex}
              onChange={(e) => handleSeek(Number(e.target.value))}
              className="w-full accent-white cursor-pointer h-2 bg-neutral-900 border border-white/20 rounded-lg appearance-none"
            />
            <div className="flex justify-between text-[10px] font-mono text-neutral-400">
              <span>{samplesA[0]?.utc}</span>
              <span className="text-neutral-300 font-bold">T+{(currentIndex).toFixed(0)} Hours Elapsed ({((currentIndex / (totalSamples - 1 || 1)) * 100).toFixed(0)}%)</span>
              <span>{samplesA[samplesA.length - 1]?.utc}</span>
            </div>
          </div>

          {/* Detected Events Ribbons */}
          <div className="pt-2">
            <span className="text-[11px] font-mono text-neutral-400 block mb-2 font-semibold tracking-wider uppercase">
              Critical Visibility Events (Jump & Explain):
            </span>
            <div className="flex flex-wrap gap-2">
              {comparisonData.site_a.events.slice(0, 8).map((evt, idx) => (
                <button
                  key={`evt-a-${idx}`}
                  onClick={() => handleJumpToEvent(evt)}
                  className="px-3 py-1.5 rounded-xl text-[11px] font-mono flex items-center space-x-1.5 border border-white/15 bg-neutral-900 hover:bg-neutral-800 text-white transition-all cursor-pointer shadow-sm"
                >
                  <span className="font-bold text-white">A:</span>
                  <span>{evt.event_type}</span>
                  <span className="text-[9px] text-neutral-400">({evt.utc.slice(11, 16)} UTC)</span>
                </button>
              ))}

              {comparisonData.site_b.events.slice(0, 8).map((evt, idx) => (
                <button
                  key={`evt-b-${idx}`}
                  onClick={() => handleJumpToEvent(evt)}
                  className="px-3 py-1.5 rounded-xl text-[11px] font-mono flex items-center space-x-1.5 border border-white/15 bg-neutral-900 hover:bg-neutral-800 text-neutral-300 transition-all cursor-pointer shadow-sm"
                >
                  <span className="font-bold text-neutral-400">B:</span>
                  <span>{evt.event_type}</span>
                  <span className="text-[9px] text-neutral-400">({evt.utc.slice(11, 16)} UTC)</span>
                </button>
              ))}
            </div>

            {/* Selected Event Causality Banner */}
            {selectedEvent && (
              <div className="mt-3 p-4 rounded-xl bg-neutral-900 border border-white/15 flex items-start space-x-2.5 text-xs">
                <div>
                  <span className="text-white font-bold uppercase tracking-wider">{selectedEvent.event_type} Event: </span>
                  <span className="text-neutral-300">{selectedEvent.description}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Comparative Decision Synthesis Card */}
      {comparisonData && (
        <div className="rounded-2xl p-5 border border-white/10 bg-neutral-950 space-y-4 shadow-2xl">
          <div className="flex items-center space-x-2 pb-2 border-b border-white/10">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">
              QUANTITATIVE SITE COMPARISON DELTAS (SITE A vs SITE B)
            </h3>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
            <div className="p-4 rounded-xl bg-neutral-900/60 border border-white/10">
              <span className="text-[10px] text-neutral-500 block uppercase">Total Sunlight Delta</span>
              <span className="text-lg font-bold text-white">
                {comparisonData.deltas.illumination_hours_a_minus_b >= 0 ? `+${comparisonData.deltas.illumination_hours_a_minus_b}` : comparisonData.deltas.illumination_hours_a_minus_b} hrs
              </span>
              <span className="text-[10px] text-neutral-400 block mt-0.5">Favoring {comparisonData.deltas.illumination_hours_a_minus_b >= 0 ? "Site A" : "Site B"}</span>
            </div>

            <div className="p-4 rounded-xl bg-neutral-900/60 border border-white/10">
              <span className="text-[10px] text-neutral-500 block uppercase">Longest Darkness Delta</span>
              <span className="text-lg font-bold text-white">
                {comparisonData.deltas.longest_darkness_hours_a_minus_b <= 0 ? `${comparisonData.deltas.longest_darkness_hours_a_minus_b}` : `+${comparisonData.deltas.longest_darkness_hours_a_minus_b}`} hrs
              </span>
              <span className="text-[10px] text-neutral-400 block mt-0.5">Shorter is better</span>
            </div>

            <div className="p-4 rounded-xl bg-neutral-900/60 border border-white/10">
              <span className="text-[10px] text-neutral-500 block uppercase">Direct Earth Comm Delta</span>
              <span className="text-lg font-bold text-white">
                {comparisonData.deltas.earth_visible_hours_a_minus_b >= 0 ? `+${comparisonData.deltas.earth_visible_hours_a_minus_b}` : comparisonData.deltas.earth_visible_hours_a_minus_b} hrs
              </span>
              <span className="text-[10px] text-neutral-400 block mt-0.5">DTE Line-of-sight window</span>
            </div>

            <div className="p-4 rounded-xl bg-neutral-900/60 border border-white/10">
              <span className="text-[10px] text-neutral-500 block uppercase">Simultaneous Access</span>
              <span className="text-lg font-bold text-white">
                {comparisonData.deltas.simultaneous_hours_a_minus_b >= 0 ? `+${comparisonData.deltas.simultaneous_hours_a_minus_b}` : comparisonData.deltas.simultaneous_hours_a_minus_b} hrs
              </span>
              <span className="text-[10px] text-neutral-400 block mt-0.5">Dual power & telemetry</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            <div className="p-4 rounded-xl bg-neutral-900/80 border border-white/10 text-xs">
              <span className="text-white font-bold block mb-2 tracking-wide uppercase">Key Advantages: {comparisonData.site_a.name}</span>
              <ul className="list-disc list-inside text-neutral-300 space-y-1">
                {comparisonData.synthesis.advantages_site_a.map((adv, idx) => (
                  <li key={idx} className="leading-relaxed">{adv}</li>
                ))}
              </ul>
            </div>

            <div className="p-4 rounded-xl bg-neutral-900/80 border border-white/10 text-xs">
              <span className="text-white font-bold block mb-2 tracking-wide uppercase">Key Advantages: {comparisonData.site_b.name}</span>
              <ul className="list-disc list-inside text-neutral-300 space-y-1">
                {comparisonData.synthesis.advantages_site_b.map((adv, idx) => (
                  <li key={idx} className="leading-relaxed">{adv}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

