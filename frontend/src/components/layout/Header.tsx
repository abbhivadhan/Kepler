import React from "react";
import { AudienceMode } from "../../types";

interface HeaderProps {
  currentMode: AudienceMode;
  onSelectMode: (mode: AudienceMode) => void;
  onOpenDecisionBrief: () => void;
  onOpenRobustness: () => void;
  onOpenProvenance: () => void;
  isBackendHealthy: boolean;
  isLolaActive: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  currentMode,
  onSelectMode,
  onOpenDecisionBrief,
  onOpenRobustness,
  onOpenProvenance,
  isBackendHealthy,
  isLolaActive,
}) => {
  const navItems: { mode: AudienceMode; label: string }[] = [
    { mode: "LANDING", label: "Overview" },
    { mode: "MISSION_CONTROL", label: "Mission Control" },
    { mode: "HORIZON_REPLAY", label: "Horizon Replay" },
    { mode: "SCIENCE_EXPLORER", label: "Science Explorer" },
    { mode: "LUNAR_EXPERIENCE", label: "Lunar Experience" },
  ];

  return (
    <header className="border-b border-white/[0.06] bg-black/60 backdrop-blur-2xl sticky top-0 z-50 px-6 py-3 flex items-center justify-between gap-4 select-none">
      {/* Brand Identity: Ultra-Minimalist Monochrome */}
      <button
        onClick={() => onSelectMode("LANDING")}
        className="flex items-center space-x-2 text-left group cursor-pointer focus:outline-none"
        title="Return to Kepler Overview"
      >
        <span className="text-sm font-black tracking-[0.25em] text-white uppercase group-hover:text-neutral-300 transition-colors">
          KEPLER
        </span>
      </button>

      {/* Mode Switcher Tabs: Seamless Monochrome Navigation */}
      <nav className="flex items-center space-x-1 p-1 rounded-full border border-white/[0.08] bg-white/[0.02] backdrop-blur-md">
        {navItems.map((item) => {
          const isActive = currentMode === item.mode;
          return (
            <button
              key={item.mode}
              onClick={() => onSelectMode(item.mode)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-medium tracking-wide transition-all cursor-pointer ${
                isActive
                  ? "bg-white text-black font-semibold shadow-sm"
                  : "text-neutral-400 hover:text-white hover:bg-white/[0.04]"
              }`}
            >
              {item.label}
            </button>
          );
        })}
      </nav>

      {/* Decision Actions & Data Indicator */}
      <div className="flex items-center space-x-2.5">
        <button
          onClick={onOpenRobustness}
          className="px-3 py-1.5 rounded-lg border border-white/10 text-xs font-medium text-neutral-300 hover:text-white hover:border-white/20 hover:bg-white/[0.04] transition-all cursor-pointer"
          title="Analyze spatial sensitivity across landing dispersion ellipse"
        >
          Landing Robustness
        </button>

        <button
          onClick={onOpenDecisionBrief}
          className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white border border-white/15 transition-all text-xs font-medium cursor-pointer"
          title="Generate visual comparison briefing and export CSV"
        >
          Decision Brief
        </button>

        {/* Provenance Badge */}
        <button
          onClick={onOpenProvenance}
          className="flex items-center space-x-2 px-3 py-1.5 rounded-lg border border-white/10 bg-white/[0.02] hover:bg-white/[0.05] text-xs font-medium text-neutral-400 hover:text-white transition-all cursor-pointer"
          title="Inspect NASA SPICE & LOLA DEM data provenance"
        >
          <span>SPICE / LOLA</span>
          <span
            className={`w-1.5 h-1.5 rounded-full ${
              isBackendHealthy && isLolaActive
                ? "bg-white"
                : "bg-neutral-500"
            }`}
          />
        </button>
      </div>
    </header>
  );
};
