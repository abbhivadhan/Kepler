import React from "react";
import { CelestialTargetTelemetry } from "../../types";

interface StatusBarProps {
  currentUtc: string;
  sunTelemetry?: CelestialTargetTelemetry;
  earthTelemetry?: CelestialTargetTelemetry;
  observerHeightM: number;
  onObserverHeightChange: (height: number) => void;
  siteName: string;
  groundElevationM: number;
}

export const StatusBar: React.FC<StatusBarProps> = ({
  currentUtc,
  sunTelemetry,
  earthTelemetry,
  observerHeightM,
  onObserverHeightChange,
  siteName,
  groundElevationM,
}) => {
  return (
    <div className="border-t border-white/10 bg-black px-4 py-2 flex flex-wrap items-center justify-between gap-3 text-xs font-mono text-neutral-400 select-none">
      {/* Current Site & Time */}
      <div className="flex items-center space-x-4">
        <div className="flex items-center space-x-1.5 text-neutral-200 font-semibold">
          <span className="text-neutral-400 font-bold uppercase text-[10px] tracking-wider">UTC</span>
          <span>{currentUtc || "2026-10-15T00:00:00 UTC"}</span>
        </div>

        <div className="flex items-center space-x-1.5 border-l border-white/10 pl-4 text-neutral-300">
          <span className="text-white font-semibold">{siteName}</span>
          <span className="text-[10px] text-neutral-400 font-mono">
            ({groundElevationM >= 0 ? `+${groundElevationM.toFixed(0)}` : groundElevationM.toFixed(0)}m MSL)
          </span>
        </div>
      </div>

      {/* Target Telemetry Readings */}
      <div className="flex items-center space-x-4">
        {sunTelemetry && (
          <div className="flex items-center space-x-2">
            <span className="text-white font-bold">SUN:</span>
            <span className="text-neutral-300">
              Az {sunTelemetry.azimuth_deg.toFixed(1)}° / El {sunTelemetry.elevation_deg.toFixed(2)}°
            </span>
            <span
              className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${
                sunTelemetry.state === "VISIBLE"
                  ? "bg-white text-black font-semibold border border-white"
                  : sunTelemetry.state === "PARTIAL"
                  ? "bg-neutral-800 text-white border border-white/20"
                  : "bg-neutral-900 text-neutral-400 border border-white/10"
              }`}
            >
              {sunTelemetry.state || "SHADOW"}
            </span>
          </div>
        )}

        {earthTelemetry && (
          <div className="flex items-center space-x-2 border-l border-white/10 pl-4">
            <span className="text-white font-bold">EARTH:</span>
            <span className="text-neutral-300">
              Az {earthTelemetry.azimuth_deg.toFixed(1)}° / El {earthTelemetry.elevation_deg.toFixed(2)}°
            </span>
            <span
              className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${
                earthTelemetry.state === "VISIBLE"
                  ? "bg-white text-black font-semibold border border-white"
                  : earthTelemetry.state === "PARTIAL"
                  ? "bg-neutral-800 text-white border border-white/20"
                  : "bg-neutral-900 text-neutral-400 border border-white/10"
              }`}
            >
              {earthTelemetry.state === "VISIBLE" ? "LOS CLEAR" : earthTelemetry.state === "PARTIAL" ? "GRAZING" : "BLOCKED"}
            </span>
          </div>
        )}
      </div>

      {/* Observer Height Configurator */}
      <div className="flex items-center space-x-2">
        <span className="text-neutral-400">Observer Mast (h_obs):</span>
        <div className="flex items-center rounded border border-white/10 bg-neutral-950 overflow-hidden p-0.5">
          {[1.5, 2.0, 5.0, 10.0].map((h) => (
            <button
              key={h}
              onClick={() => onObserverHeightChange(h)}
              className={`px-2 py-0.5 text-[11px] font-mono rounded transition-all cursor-pointer ${
                observerHeightM === h
                  ? "bg-white text-black font-semibold"
                  : "text-neutral-400 hover:text-white"
              }`}
            >
              {h}m
            </button>
          ))}
        </div>

        <div className="flex items-center space-x-1 pl-2 text-neutral-500" title="Valid IAU_MOON DE421 Frame">
          <span className="hidden xl:inline text-[10px] font-bold text-neutral-400 border border-white/15 px-1 py-0.5 rounded">DE421</span>
        </div>
      </div>
    </div>
  );
};
