import React, { useState } from "react";
import { AudienceMode, CandidateSite } from "../../types";
import { SpaceBackground3D } from "../../components/3d/SpaceBackground3D";

interface LandingViewProps {
  onNavigate: (mode: AudienceMode) => void;
  onSelectSite?: (site: CandidateSite, targetMode?: AudienceMode) => void;
  candidateSites?: CandidateSite[];
}

export const LandingView: React.FC<LandingViewProps> = ({
  onNavigate,
  onSelectSite,
  candidateSites = [],
}) => {
  const [selectedSiteId, setSelectedSiteId] = useState<string>(
    candidateSites[0]?.id || "SHACKLETON_RIM"
  );

  const activeSite =
    candidateSites.find((s) => s.id === selectedSiteId) ||
    candidateSites[0] || {
      id: "SHACKLETON_RIM",
      name: "Shackleton Connecting Ridge",
      latitude_deg: -89.9,
      longitude_deg: 0.0,
      nominal_elevation_m: 1250,
      features:
        "Artemis III high-priority landing site with high solar illumination on ridge crest.",
    };

  const handleScrollToExplore = () => {
    const section = document.getElementById("explore-section");
    if (section) {
      section.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <div className="relative min-h-screen w-full bg-black text-white font-sans selection:bg-white selection:text-black overflow-y-auto">
      {/* 3D Deep Space Canvas: Clear NASA Moon on the Right with Realistic, Balanced Lighting */}
      <SpaceBackground3D />

      {/* Screen 1: Minimalist Hero (Name, Subtitle, Actions, & Fixed Photorealistic Moon in Space) */}
      <section className="relative z-10 min-h-[calc(100vh-56px)] flex flex-col justify-center items-start px-6 sm:px-12 lg:px-20 py-16 select-none max-w-[1700px] mx-auto w-full">
        {/* Soft Left Contrast Vignette ensuring 100% text readability against 3D space */}
        <div className="absolute inset-y-0 left-0 w-full lg:w-3/5 bg-gradient-to-r from-black via-black/80 to-transparent pointer-events-none z-0" />

        {/* Hero Title & Value Proposition (Left side, unhindered by the 3D Moon on the Right) */}
        <div className="space-y-6 max-w-2xl text-left relative z-10">
          <h1 className="text-7xl sm:text-9xl lg:text-[10rem] font-black tracking-[0.2em] text-white uppercase leading-none drop-shadow-2xl">
            KEPLER
          </h1>
          <p className="text-xs sm:text-sm font-medium tracking-[0.35em] text-neutral-400 uppercase">
            Lunar Landing & Horizon Decision Studio
          </p>

          {/* Primary Action Buttons */}
          <div className="flex flex-wrap items-center gap-4 pt-4">
            <button
              onClick={() => onNavigate("MISSION_CONTROL")}
              className="px-8 py-3.5 rounded-full bg-white text-black font-semibold text-xs tracking-widest uppercase transition-all hover:bg-neutral-200 hover:scale-105 active:scale-95 cursor-pointer shadow-[0_4px_30px_rgba(255,255,255,0.2)]"
            >
              Enter Mission Control
            </button>

            <button
              onClick={handleScrollToExplore}
              className="px-7 py-3.5 rounded-full bg-neutral-900/90 border border-white/20 text-neutral-200 hover:text-white hover:border-white/40 hover:bg-neutral-800 font-medium text-xs tracking-widest uppercase transition-all active:scale-95 cursor-pointer"
            >
              Explore Mission Data
            </button>
          </div>
        </div>
      </section>

      {/* Screen 2: Deeper Technical Information with Solid Pure Black Backdrop for 100% Readability */}
      <section
        id="explore-section"
        className="relative z-20 bg-black border-t border-white/[0.08] px-6 sm:px-12 lg:px-20 py-20 w-full space-y-20 pb-48"
      >
        <div className="max-w-[1600px] mx-auto w-full space-y-20">
          {/* Real NASA Telemetry & Scientific Ground Truth */}
          <div className="space-y-6">
            <div className="border-b border-white/[0.08] pb-4">
              <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white uppercase">
                Physical Lunar Reality
              </h2>
              <p className="text-xs text-neutral-400 mt-1">
                Topocentric raycasts through NASA LRO LOLA 240m digital elevation grids with sub-arcsecond SPICE ephemerides
              </p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-6 rounded-2xl bg-neutral-950 border border-white/[0.08] hover:border-white/20 transition-all shadow-lg">
                <span className="text-[11px] text-neutral-400 uppercase tracking-wider block font-medium">
                  Topography Grid
                </span>
                <span className="text-3xl font-bold text-white font-mono mt-1 block">
                  240 m
                </span>
                <span className="text-xs text-neutral-500 mt-1 block">
                  NASA LRO LOLA Elevation Model
                </span>
              </div>

              <div className="p-6 rounded-2xl bg-neutral-950 border border-white/[0.08] hover:border-white/20 transition-all shadow-lg">
                <span className="text-[11px] text-neutral-400 uppercase tracking-wider block font-medium">
                  Solar Grazing Angle
                </span>
                <span className="text-3xl font-bold text-white font-mono mt-1 block">
                  1.54°
                </span>
                <span className="text-xs text-neutral-500 mt-1 block">
                  Axial Tilt Solstice Limit
                </span>
              </div>

              <div className="p-6 rounded-2xl bg-neutral-950 border border-white/[0.08] hover:border-white/20 transition-all shadow-lg">
                <span className="text-[11px] text-neutral-400 uppercase tracking-wider block font-medium">
                  PEL Solar Illumination
                </span>
                <span className="text-3xl font-bold text-white font-mono mt-1 block">
                  92.1%
                </span>
                <span className="text-xs text-neutral-500 mt-1 block">
                  Peak of Light Ridge (Malapert)
                </span>
              </div>

              <div className="p-6 rounded-2xl bg-neutral-950 border border-white/[0.08] hover:border-white/20 transition-all shadow-lg">
                <span className="text-[11px] text-neutral-400 uppercase tracking-wider block font-medium">
                  Earth Comm Libration
                </span>
                <span className="text-3xl font-bold text-white font-mono mt-1 block">
                  27.3 d
                </span>
                <span className="text-xs text-neutral-500 mt-1 block">
                  Sidereal Orbital Wobble
                </span>
              </div>
            </div>
          </div>

          {/* Candidate Landing Site Dossiers */}
          <div className="space-y-6">
            <div className="border-b border-white/[0.08] pb-4">
              <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white uppercase">
                Candidate Target Dossiers
              </h2>
              <p className="text-xs text-neutral-400 mt-1">
                Official Artemis III candidate locations evaluated for cryogenic survival and Earth visibility
              </p>
            </div>

            {/* Site Selector Tabs */}
            <div className="flex flex-wrap gap-2">
              {candidateSites.map((site) => {
                const isSelected = site.id === activeSite.id;
                return (
                  <button
                    key={site.id}
                    onClick={() => setSelectedSiteId(site.id)}
                    className={`px-4 py-2 rounded-xl text-xs font-medium tracking-wide transition-all cursor-pointer ${
                      isSelected
                        ? "bg-white text-black font-semibold shadow-md"
                        : "bg-neutral-900 text-neutral-400 hover:text-white hover:bg-neutral-800 border border-white/[0.06]"
                    }`}
                  >
                    {site.name}
                  </button>
                );
              })}
            </div>

            {/* Active Site Detailed Dossier Card */}
            <div className="p-8 rounded-3xl bg-neutral-950 border border-white/10 space-y-6 shadow-xl">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
                <div className="lg:col-span-7 space-y-4">
                  <span className="text-xs font-mono text-neutral-400 uppercase tracking-wider block">
                    Artemis Candidate Dossier
                  </span>
                  <h3 className="text-2xl sm:text-4xl font-bold text-white">
                    {activeSite.name}
                  </h3>
                  <p className="text-sm text-neutral-300 leading-relaxed max-w-xl">
                    {activeSite.features}
                  </p>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2">
                    <div className="p-4 rounded-xl bg-neutral-900 border border-white/[0.06]">
                      <span className="text-[10px] text-neutral-400 uppercase block font-medium">Latitude</span>
                      <span className="text-sm font-bold text-white font-mono mt-0.5 block">
                        {activeSite.latitude_deg.toFixed(2)}°S
                      </span>
                    </div>

                    <div className="p-4 rounded-xl bg-neutral-900 border border-white/[0.06]">
                      <span className="text-[10px] text-neutral-400 uppercase block font-medium">Longitude</span>
                      <span className="text-sm font-bold text-white font-mono mt-0.5 block">
                        {activeSite.longitude_deg.toFixed(2)}°E
                      </span>
                    </div>

                    <div className="p-4 rounded-xl bg-neutral-900 border border-white/[0.06]">
                      <span className="text-[10px] text-neutral-400 uppercase block font-medium">Nominal Elevation</span>
                      <span className="text-sm font-bold text-white font-mono mt-0.5 block">
                        +{activeSite.nominal_elevation_m.toLocaleString()} m
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-3 pt-3">
                    <button
                      onClick={() => {
                        if (onSelectSite) onSelectSite(activeSite, "MISSION_CONTROL");
                        else onNavigate("MISSION_CONTROL");
                      }}
                      className="px-6 py-2.5 rounded-xl bg-white text-black font-semibold text-xs tracking-wider uppercase transition-all hover:bg-neutral-200 cursor-pointer shadow-sm"
                    >
                      Analyze Telemetry
                    </button>

                    <button
                      onClick={() => {
                        if (onSelectSite) onSelectSite(activeSite, "HORIZON_REPLAY");
                        else onNavigate("HORIZON_REPLAY");
                      }}
                      className="px-6 py-2.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-white border border-white/15 font-semibold text-xs tracking-wider uppercase transition-all cursor-pointer"
                    >
                      Compare in Replay
                    </button>
                  </div>
                </div>

                {/* Physical Parameters Card */}
                <div className="lg:col-span-5 p-6 rounded-2xl bg-neutral-900 border border-white/[0.08] space-y-3 font-mono text-xs">
                  <div className="flex items-center justify-between border-b border-white/[0.06] pb-2 text-neutral-300 font-sans">
                    <span className="font-semibold uppercase tracking-wider text-xs">
                      Topocentric Frame Parameters
                    </span>
                    <span className="text-[10px] text-neutral-400 font-mono">
                      IAU MOON_ME
                    </span>
                  </div>

                  <div className="flex justify-between text-neutral-300">
                    <span className="text-neutral-400">Curvature Correction:</span>
                    <span className="text-white">&delta; = d&sup2; / (2R_moon)</span>
                  </div>

                  <div className="flex justify-between text-neutral-300">
                    <span className="text-neutral-400">Ridge Horizon Step:</span>
                    <span className="text-white">1.0° azimuth (360 samples)</span>
                  </div>

                  <div className="flex justify-between text-neutral-300">
                    <span className="text-neutral-400">Raycast Horizon Radius:</span>
                    <span className="text-white">120 km radial</span>
                  </div>

                  <div className="flex justify-between text-neutral-300">
                    <span className="text-neutral-400">Solar Array Physics:</span>
                    <span className="text-white">2.5m² Triple-Junction GaAs</span>
                  </div>

                  <p className="font-sans text-[11px] text-neutral-400 pt-2 border-t border-white/[0.06] leading-relaxed">
                    Real NASA LOLA DEM elevation grids determine whether solar panels generate power or battery reserves deplete during polar shadow transit.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Operational Modalities (Clean 4-Grid Architecture) */}
          <div className="space-y-6">
            <div className="border-b border-white/[0.08] pb-4">
              <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white uppercase">
                Mission Suites
              </h2>
              <p className="text-xs text-neutral-400 mt-1">
                Select an operational suite to conduct link margin analyses or comparative simulations
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Suite 1: Mission Control */}
              <div
                onClick={() => onNavigate("MISSION_CONTROL")}
                className="p-8 rounded-3xl bg-neutral-950 border border-white/[0.08] hover:border-white/20 transition-all cursor-pointer flex flex-col justify-between group shadow-lg"
              >
                <div className="space-y-3">
                  <span className="text-xs text-neutral-400 group-hover:text-white transition-colors block font-medium">
                    Flight Telemetry &rarr;
                  </span>
                  <h3 className="text-2xl font-bold text-white transition-colors">
                    Mission Control Telemetry
                  </h3>
                  <p className="text-xs text-neutral-400 leading-relaxed">
                    Engineering console with real-time 3D lander illumination studio, polar horizon skyline radar, instantaneous cursor inspector, GaAs solar array power curves (W), and landing dispersion ellipse modeling.
                  </p>
                </div>
                <div className="mt-6 pt-4 border-t border-white/[0.06] flex flex-wrap gap-2 text-[11px] text-neutral-400 font-mono">
                  <span className="bg-neutral-900 px-2.5 py-1 rounded-lg">3D Surface Studio</span>
                  <span className="bg-neutral-900 px-2.5 py-1 rounded-lg">Polar Skyline Radar</span>
                  <span className="bg-neutral-900 px-2.5 py-1 rounded-lg">GaAs Power Modeling</span>
                </div>
              </div>

              {/* Suite 2: Horizon Replay */}
              <div
                onClick={() => onNavigate("HORIZON_REPLAY")}
                className="p-8 rounded-3xl bg-neutral-950 border border-white/[0.08] hover:border-white/20 transition-all cursor-pointer flex flex-col justify-between group shadow-lg"
              >
                <div className="space-y-3">
                  <span className="text-xs text-neutral-400 group-hover:text-white transition-colors block font-medium">
                    Temporal Simulation &rarr;
                  </span>
                  <h3 className="text-2xl font-bold text-white transition-colors">
                    Horizon Replay Synchronized Comparison
                  </h3>
                  <p className="text-xs text-neutral-400 leading-relaxed">
                    Dual-site temporal simulation engine scrubbing hours and days across two candidate landing locations simultaneously. Features bisection threshold event detection and quantitative illumination deltas.
                  </p>
                </div>
                <div className="mt-6 pt-4 border-t border-white/[0.06] flex flex-wrap gap-2 text-[11px] text-neutral-400 font-mono">
                  <span className="bg-neutral-900 px-2.5 py-1 rounded-lg">Dual Viewports</span>
                  <span className="bg-neutral-900 px-2.5 py-1 rounded-lg">Bisection Ingress/Egress</span>
                  <span className="bg-neutral-900 px-2.5 py-1 rounded-lg">Site Deltas</span>
                </div>
              </div>

              {/* Suite 3: 3D Lunar Visualizer */}
              <div
                onClick={() => onNavigate("LUNAR_EXPERIENCE")}
                className="p-8 rounded-3xl bg-neutral-950 border border-white/[0.08] hover:border-white/20 transition-all cursor-pointer flex flex-col justify-between group shadow-lg"
              >
                <div className="space-y-3">
                  <span className="text-xs text-neutral-400 group-hover:text-white transition-colors block font-medium">
                    Planetary Globe &rarr;
                  </span>
                  <h3 className="text-2xl font-bold text-white transition-colors">
                    Lunar South Pole 3D Visualizer
                  </h3>
                  <p className="text-xs text-neutral-400 leading-relaxed">
                    Interactive 3D WebGL South Pole globe incorporating low-angle grazing solar vectors corresponding to the Moon’s 1.54° axial tilt. Inspect Artemis target dossiers and launch detailed telemetry.
                  </p>
                </div>
                <div className="mt-6 pt-4 border-t border-white/[0.06] flex flex-wrap gap-2 text-[11px] text-neutral-400 font-mono">
                  <span className="bg-neutral-900 px-2.5 py-1 rounded-lg">3D WebGL Globe</span>
                  <span className="bg-neutral-900 px-2.5 py-1 rounded-lg">Grazing Sun Vectors</span>
                  <span className="bg-neutral-900 px-2.5 py-1 rounded-lg">Target Markers</span>
                </div>
              </div>

              {/* Suite 4: Science Explorer */}
              <div
                onClick={() => onNavigate("SCIENCE_EXPLORER")}
                className="p-8 rounded-3xl bg-neutral-950 border border-white/[0.08] hover:border-white/20 transition-all cursor-pointer flex flex-col justify-between group shadow-lg"
              >
                <div className="space-y-3">
                  <span className="text-xs text-neutral-400 group-hover:text-white transition-colors block font-medium">
                    Physical Principles &rarr;
                  </span>
                  <h3 className="text-2xl font-bold text-white transition-colors">
                    Science & Polar Physics Explorer
                  </h3>
                  <p className="text-xs text-neutral-400 leading-relaxed">
                    Interactive ridge shadow raycasting sandbox demonstrating how topographic relief up to 4,000m casts 120km shadows. Explains the physics of Peaks of Eternal Light (PELs) and the failure of 0° spherical models.
                  </p>
                </div>
                <div className="mt-6 pt-4 border-t border-white/[0.06] flex flex-wrap gap-2 text-[11px] text-neutral-400 font-mono">
                  <span className="bg-neutral-900 px-2.5 py-1 rounded-lg">Ridge Raycasting</span>
                  <span className="bg-neutral-900 px-2.5 py-1 rounded-lg">Curvature Drop</span>
                  <span className="bg-neutral-900 px-2.5 py-1 rounded-lg">Libration Cycles</span>
                </div>
              </div>
            </div>
          </div>

          {/* Scientific Trade Study: Physical Reality vs Flat Models */}
          <div className="space-y-6">
            <div className="border-b border-white/[0.08] pb-4">
              <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white uppercase">
                Scientific Trade Study
              </h2>
              <p className="text-xs text-neutral-400 mt-1">
                Topographic raycasting versus idealized flat spherical approximations
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="p-8 rounded-3xl bg-neutral-950 border border-white/[0.08] space-y-3 shadow-lg">
                <span className="text-neutral-400 font-bold uppercase tracking-wider text-xs block">
                  Idealized Flat Spherical Model (Mathematical Failure)
                </span>
                <ul className="space-y-2.5 text-neutral-300 leading-relaxed">
                  <li className="flex items-start space-x-2">
                    <span className="text-neutral-500 font-bold">•</span>
                    <span>Assumes smooth spherical Moon with idealized 0.0° horizon.</span>
                  </li>
                  <li className="flex items-start space-x-2">
                    <span className="text-neutral-500 font-bold">•</span>
                    <span>Ignores polar crater ridges up to 4,000m high subtending +2° to +8° on the horizon.</span>
                  </li>
                  <li className="flex items-start space-x-2">
                    <span className="text-neutral-500 font-bold">•</span>
                    <span>Falsely predicts continuous sunlight where real topography produces 14-day blackouts.</span>
                  </li>
                  <li className="flex items-start space-x-2">
                    <span className="text-neutral-500 font-bold">•</span>
                    <span>Risks complete mission failure from unexpected cryogenic battery exhaustion.</span>
                  </li>
                </ul>
              </div>

              <div className="p-8 rounded-3xl bg-neutral-900 border border-white/20 space-y-3 shadow-lg">
                <span className="text-white font-bold uppercase tracking-wider text-xs block">
                  Kepler Physical Engine (NASA LOLA 240m Ground Truth)
                </span>
                <ul className="space-y-2.5 text-neutral-200 leading-relaxed">
                  <li className="flex items-start space-x-2">
                    <span className="text-white font-bold">•</span>
                    <span>Genuine 360° raycasting through NASA LRO LOLA 240m digital elevation grids.</span>
                  </li>
                  <li className="flex items-start space-x-2">
                    <span className="text-white font-bold">•</span>
                    <span>Quadratic lunar curvature correction at distance d: &delta; = d&sup2; / (2R_moon).</span>
                  </li>
                  <li className="flex items-start space-x-2">
                    <span className="text-white font-bold">•</span>
                    <span>NASA NAIF SPICE N0067 ephemeris engine with JPL DE421 + PCK00010 kernels.</span>
                  </li>
                  <li className="flex items-start space-x-2">
                    <span className="text-white font-bold">•</span>
                    <span>Validated against high-resolution LROC NAC imagery and polar shadow maps.</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
