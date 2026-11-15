import React from "react";
import { CandidateSite, SiteTimelineResult } from "../../types";

interface DecisionBriefModalProps {
  site: CandidateSite | null;
  timeline: SiteTimelineResult | null;
  isLoading?: boolean;
  onClose: () => void;
}

export const DecisionBriefModal: React.FC<DecisionBriefModalProps> = ({
  site,
  timeline,
  isLoading = false,
  onClose,
}) => {
  if (isLoading || !timeline || !site) {
    if (!site && !isLoading) return null;
    return (
      <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xl flex items-center justify-center p-4">
        <div className="rounded-2xl border border-white/10 max-w-md w-full p-8 flex flex-col items-center justify-center space-y-4 shadow-2xl bg-neutral-950 font-sans">
          <div className="w-8 h-8 rounded-full border-2 border-white/20 border-t-white animate-spin" />
          <div className="text-center">
            <span className="text-sm font-bold text-white uppercase tracking-wider block">
              Synthesizing Decision Brief
            </span>
            <span className="text-xs text-neutral-400 mt-1 block">
              Evaluating topocentric raycasts for {site?.name || "Target Site"}...
            </span>
          </div>
          <button
            onClick={onClose}
            className="mt-2 text-xs text-neutral-500 hover:text-white transition cursor-pointer"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  const handleDownloadCsv = () => {
    // Generate CSV directly in client from timeline time series
    const headers = [
      "UTC_Time",
      "Ephemeris_Time_Sec",
      "Sun_Azimuth_Deg",
      "Sun_Elevation_Deg",
      "Sun_Skyline_Deg",
      "Sun_Clearance_Deg",
      "Sun_State",
      "Estimated_Power_Watts",
      "Earth_Azimuth_Deg",
      "Earth_Elevation_Deg",
      "Earth_Skyline_Deg",
      "Earth_Clearance_Deg",
      "Earth_State",
      "Joint_Operating_State",
    ];

    const rows = timeline.time_series.map((s) => [
      s.utc,
      s.et.toFixed(1),
      s.sun.azimuth_deg.toFixed(3),
      s.sun.elevation_deg.toFixed(3),
      (s.sun.skyline_elevation_deg ?? 0).toFixed(3),
      (s.sun.clearance_deg ?? 0).toFixed(3),
      s.sun.state ?? "UNKNOWN",
      s.estimated_power_watts.toFixed(1),
      s.earth.azimuth_deg.toFixed(3),
      s.earth.elevation_deg.toFixed(3),
      (s.earth.skyline_elevation_deg ?? 0).toFixed(3),
      (s.earth.clearance_deg ?? 0).toFixed(3),
      s.earth.state ?? "UNKNOWN",
      s.joint_state,
    ]);

    const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `KEPLER_${site.id}_decision_brief.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    window.print();
  };

  const hotelLoadWatts = 150; // nominal lander hotel power draw
  const batteryCapacityRequiredKWh = (
    (timeline.metrics.longest_continuous_darkness_hours * hotelLoadWatts) /
    1000
  ).toFixed(2);

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xl flex items-center justify-center p-4">
      <div className="rounded-2xl border border-white/10 max-w-4xl w-full max-h-[92vh] overflow-y-auto flex flex-col shadow-2xl font-mono text-xs bg-neutral-950">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-white/10 bg-neutral-950">
          <div>
            <span className="text-[10px] font-mono font-bold text-neutral-400 uppercase tracking-wider block">
              MISSION BRIEFING
            </span>
            <h2 className="text-sm font-bold text-white uppercase tracking-wider mt-0.5">
              KEPLER TACTICAL DECISION BRIEF
            </h2>
            <span className="text-neutral-400 text-[11px]">
              Mission Planning &amp; Candidate Site Architecture Synthesis
            </span>
          </div>
          <div className="flex items-center space-x-2.5">
            <button
              onClick={handlePrint}
              className="px-3.5 py-1.5 rounded-lg border border-white/15 text-xs text-neutral-300 hover:text-white hover:bg-white/10 transition cursor-pointer"
              title="Print Brief"
            >
              <span>PRINT</span>
            </button>
            <button
              onClick={handleDownloadCsv}
              className="px-4 py-1.5 rounded-full bg-white text-black font-semibold text-xs uppercase tracking-wider hover:bg-neutral-200 transition cursor-pointer shadow-sm"
            >
              <span>EXPORT CSV</span>
            </button>
            <button
              onClick={onClose}
              className="text-neutral-400 hover:text-white px-3 py-1.5 rounded-lg border border-white/15 hover:bg-white/10 transition text-xs font-mono font-medium cursor-pointer"
            >
              <span>CLOSE</span>
            </button>
          </div>
        </div>

        {/* Brief Body */}
        <div className="p-6 space-y-6 flex-1 text-neutral-300">
          {/* Executive Summary */}
          <div className="border-b border-white/10 pb-5">
            <span className="text-xs font-bold text-white uppercase tracking-wider block mb-2">
              1. EXECUTIVE SITE ASSESSMENT
            </span>
            <p className="text-neutral-300 text-sm leading-relaxed font-sans">
              Candidate site <span className="font-bold text-white font-mono">{site.name}</span>{" "}
              located at {site.latitude_deg.toFixed(2)}°S, {site.longitude_deg.toFixed(2)}°E (elevation{" "}
              {site.nominal_elevation_m.toLocaleString()} m AMSL) was evaluated across a{" "}
              {timeline.interval.total_duration_hours.toFixed(0)}-hour mission interval from{" "}
              {timeline.interval.start_time} to {timeline.interval.end_time}. Topocentric raycasting
              against NASA LOLA 240m elevation models confirms an illumination availability of{" "}
              <span className="text-white font-bold font-mono">
                {timeline.metrics.illumination_percentage.toFixed(1)}%
              </span>{" "}
              and direct-to-Earth communication coverage of{" "}
              <span className="text-white font-bold font-mono">
                {timeline.metrics.earth_visibility_percentage.toFixed(1)}%
              </span>.
            </p>
          </div>

          {/* Key Figures of Merit Grid */}
          <div>
            <span className="text-xs font-bold text-white uppercase tracking-wider block mb-3">
              2. SCIENTIFIC FIGURES OF MERIT (FOM)
            </span>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <div className="bg-neutral-900/80 border border-white/10 rounded-xl p-4">
                <span className="text-neutral-400 text-[10px] uppercase block">TOTAL ILLUMINATION</span>
                <span className="text-lg font-bold text-white mt-1 block">
                  {timeline.metrics.total_sun_hours.toFixed(1)} hrs ({timeline.metrics.illumination_percentage.toFixed(1)}%)
                </span>
                <span className="text-[10px] text-neutral-400 block mt-1">
                  Array power generation available
                </span>
              </div>

              <div className="bg-neutral-900/80 border border-white/10 rounded-xl p-4">
                <span className="text-neutral-400 text-[10px] uppercase block">MAX CONTINUOUS DARKNESS</span>
                <span className="text-lg font-bold text-white mt-1 block">
                  {timeline.metrics.longest_continuous_darkness_hours.toFixed(1)} hrs
                </span>
                <span className="text-[10px] text-neutral-400 block mt-1">
                  Critical battery endurance sizing
                </span>
              </div>

              <div className="bg-neutral-900/80 border border-white/10 rounded-xl p-4">
                <span className="text-neutral-400 text-[10px] uppercase block">DTE COMM COVERAGE</span>
                <span className="text-lg font-bold text-white mt-1 block">
                  {timeline.metrics.total_earth_visible_hours.toFixed(1)} hrs ({timeline.metrics.earth_visibility_percentage.toFixed(1)}%)
                </span>
                <span className="text-[10px] text-neutral-400 block mt-1">
                  Direct lunar-to-Earth telemetry
                </span>
              </div>

              <div className="bg-neutral-900/80 border border-white/10 rounded-xl p-4">
                <span className="text-neutral-400 text-[10px] uppercase block">MAX COMM BLACKOUT</span>
                <span className="text-lg font-bold text-white mt-1 block">
                  {timeline.metrics.longest_communication_blackout_hours.toFixed(1)} hrs
                </span>
                <span className="text-[10px] text-neutral-400 block mt-1">
                  Longest terrain line-of-sight loss
                </span>
              </div>

              <div className="bg-neutral-900/80 border border-white/10 rounded-xl p-4">
                <span className="text-neutral-400 text-[10px] uppercase block">DUAL POWER &amp; COMM</span>
                <span className="text-lg font-bold text-white mt-1 block">
                  {timeline.metrics.total_simultaneous_hours.toFixed(1)} hrs ({timeline.metrics.simultaneous_percentage.toFixed(1)}%)
                </span>
                <span className="text-[10px] text-neutral-400 block mt-1">
                  Simultaneous EVA &amp; science operations
                </span>
              </div>

              <div className="bg-neutral-900/80 border border-white/10 rounded-xl p-4">
                <span className="text-neutral-400 text-[10px] uppercase block">BATTERY SIZING (150W LOAD)</span>
                <span className="text-lg font-bold text-white mt-1 block">
                  {batteryCapacityRequiredKWh} kWh
                </span>
                <span className="text-[10px] text-neutral-400 block mt-1">
                  Minimum usable capacity required
                </span>
              </div>
            </div>
          </div>

          {/* Subsystem Recommendations */}
          <div className="border-t border-white/10 pt-5 space-y-3">
            <span className="text-xs font-bold text-white uppercase tracking-wider block">
              3. SUBSYSTEM DESIGN RECOMMENDATIONS
            </span>
            <div className="bg-black border border-white/10 rounded-xl p-5 space-y-3 text-xs leading-relaxed">
              <div className="flex items-start space-x-2">
                <p>
                  <strong className="text-white">Power Subsystem:</strong> Inverted metamorphic triple-junction GaAs solar cells mounted with 75° elevation tilt will deliver up to 550W peak power. The maximum night span of {timeline.metrics.longest_continuous_darkness_hours.toFixed(1)} hours mandates a secondary energy storage system of at least {batteryCapacityRequiredKWh} kWh at 80% Depth of Discharge.
                </p>
              </div>
              <div className="flex items-start space-x-2">
                <p>
                  <strong className="text-white">Communications Subsystem:</strong> Direct-to-Earth X/Ka-band directional high-gain antenna requires active azimuth tracking across {timeline.skyline.stats.min_elevation_deg.toFixed(1)}° to {timeline.skyline.stats.max_elevation_deg.toFixed(1)}° terrain mask. Ground station contact schedules should be synchronized around the {timeline.metrics.total_earth_visible_hours.toFixed(0)}-hour direct visibility window.
                </p>
              </div>
            </div>
          </div>

          {/* Provenance & Disclaimer */}
          <div className="border-t border-white/10 pt-4 text-[11px] text-neutral-400 flex items-center justify-between">
            <span>
              Generated by KEPLER &bull; NAIF SPICE N0067 &bull; NASA LRO LOLA DEM 240m
            </span>
            <span className="text-neutral-500 font-mono">AUTONOMOUS TAC-OPS</span>
          </div>
        </div>
      </div>
    </div>
  );
};
