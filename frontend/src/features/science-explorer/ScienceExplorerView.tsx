import React, { useState } from "react";

export const ScienceExplorerView: React.FC = () => {
  // Interactive demonstrator state
  const [obsDistanceKm, setObsDistanceKm] = useState<number>(30);
  const [obsHeightM, setObsHeightM] = useState<number>(1500);
  const [sunElevationDeg, setSunElevationDeg] = useState<number>(1.2);
  const [mastHeightM, setMastHeightM] = useState<number>(2.0);

  // Topocentric obstacle elevation angle with lunar curvature
  // theta = arctan((h_obs - h_mast - d^2 / (2R)) / d)
  const R_MOON_M = 1737400;
  const d_m = obsDistanceKm * 1000;
  const curvatureDropM = (d_m * d_m) / (2 * R_MOON_M);
  const netElevationM = obsHeightM - mastHeightM - curvatureDropM;
  const obstacleSubtendedDeg = (Math.atan2(netElevationM, d_m) * 180) / Math.PI;
  const isObstructed = sunElevationDeg < obstacleSubtendedDeg;

  return (
    <div className="flex-1 flex flex-col p-6 space-y-6 overflow-y-auto max-w-[1600px] mx-auto w-full bg-black text-neutral-200 font-sans">
      {/* Hero Explainer Header */}
      <div className="rounded-2xl p-6 border border-white/10 bg-neutral-950 shadow-2xl">
        <div className="flex items-center space-x-3 mb-2">
          <span className="text-xs font-mono font-semibold uppercase px-2.5 py-0.5 rounded-full bg-neutral-900 border border-white/10 text-neutral-300">
            Astrophysics & Topography
          </span>
          <h1 className="text-xl font-bold font-mono tracking-wider text-white uppercase">
            SCIENCE EXPLORER &mdash; Lunar Polar Ephemeris Physics
          </h1>
        </div>
        <p className="text-xs text-neutral-400 font-mono">
          Physical principles governing extreme grazing lighting, Earth libration comms, and the mathematical failure of spherical approximations.
        </p>
      </div>

      {/* Interactive Physics Sandbox: The Low-Grazing Sun & The Ridge Raycaster */}
      <div className="rounded-2xl p-6 border border-white/10 bg-neutral-950 shadow-2xl">
        <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-5">
          <div>
            <span className="text-[10px] font-mono font-bold text-neutral-400 uppercase tracking-wider block">
              RAYCAST SIMULATION ENGINE
            </span>
            <h2 className="text-sm font-bold font-mono uppercase tracking-wider text-white">
              Ridge Shadow Raycasting & Lunar Curvature
            </h2>
          </div>
          <span className="text-xs font-mono text-white bg-neutral-900 px-3 py-1 rounded-full border border-white/15">
            LOLA Topographic Profile
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          {/* Controls (5 cols) */}
          <div className="lg:col-span-5 space-y-4 font-mono text-xs">
            <div className="p-4 rounded-xl bg-neutral-900/60 border border-white/10">
              <div className="flex justify-between text-neutral-300 mb-1.5">
                <span className="text-neutral-400">Solar Elevation Angle:</span>
                <span className="text-white font-bold">{sunElevationDeg.toFixed(2)}°</span>
              </div>
              <input
                type="range"
                min={-1.5}
                max={2.5}
                step={0.05}
                value={sunElevationDeg}
                onChange={(e) => setSunElevationDeg(Number(e.target.value))}
                className="w-full accent-white bg-neutral-900 border border-white/20 h-2 rounded cursor-pointer"
              />
              <span className="text-[10px] text-neutral-500 block mt-1.5">
                Moon's small 1.54° axial tilt confines polar sun to ±1.54° above/below horizon.
              </span>
            </div>

            <div className="p-4 rounded-xl bg-neutral-900/60 border border-white/10">
              <div className="flex justify-between text-neutral-300 mb-1.5">
                <span className="text-neutral-400">Terrain Obstacle Distance:</span>
                <span className="text-white font-bold">{obsDistanceKm.toFixed(1)} km</span>
              </div>
              <input
                type="range"
                min={5}
                max={100}
                step={1}
                value={obsDistanceKm}
                onChange={(e) => setObsDistanceKm(Number(e.target.value))}
                className="w-full accent-white bg-neutral-900 border border-white/20 h-2 rounded cursor-pointer"
              />
            </div>

            <div className="p-4 rounded-xl bg-neutral-900/60 border border-white/10">
              <div className="flex justify-between text-neutral-300 mb-1.5">
                <span className="text-neutral-400">Obstacle Relief Height (above ground):</span>
                <span className="text-white font-bold">{obsHeightM} m</span>
              </div>
              <input
                type="range"
                min={100}
                max={4000}
                step={50}
                value={obsHeightM}
                onChange={(e) => setObsHeightM(Number(e.target.value))}
                className="w-full accent-white bg-neutral-900 border border-white/20 h-2 rounded cursor-pointer"
              />
            </div>

            <div className="p-4 rounded-xl bg-neutral-900/60 border border-white/10">
              <div className="flex justify-between text-neutral-300 mb-1.5">
                <span className="text-neutral-400">Lander Solar Mast Height:</span>
                <span className="text-white font-bold">{mastHeightM.toFixed(1)} m</span>
              </div>
              <input
                type="range"
                min={1.0}
                max={15.0}
                step={0.5}
                value={mastHeightM}
                onChange={(e) => setMastHeightM(Number(e.target.value))}
                className="w-full accent-white bg-neutral-900 border border-white/20 h-2 rounded cursor-pointer"
              />
            </div>
          </div>

          {/* Real-time Raycast Visualization Canvas (7 cols) */}
          <div className="lg:col-span-7 bg-black border border-white/15 rounded-xl p-5 flex flex-col items-center justify-center min-h-[260px] font-mono shadow-2xl">
            <svg viewBox="0 0 500 200" className="w-full h-48 overflow-visible">
              <defs>
                <linearGradient id="spaceVoid" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#050505" />
                  <stop offset="100%" stopColor="#000000" />
                </linearGradient>
              </defs>
              <rect x="0" y="0" width="500" height="200" fill="url(#spaceVoid)" rx="8" />

              {/* Moon surface curve */}
              <path
                d="M 20 180 Q 250 170 480 180"
                fill="none"
                stroke="#525252"
                strokeWidth="2.5"
              />
              <text x="30" y="195" fill="#737373" fontSize="10">Lunar Surface (Curvature R = 1,737.4 km)</text>

              {/* Lander Mast */}
              <line x1="80" y1="174" x2="80" y2={174 - (mastHeightM * 2)} stroke="#ffffff" strokeWidth="3" />
              <circle cx="80" cy={174 - (mastHeightM * 2)} r="4" fill="#ffffff" />
              <text x="50" y="165" fill="#ffffff" fontSize="9" fontWeight="bold">Lander ({mastHeightM}m)</text>

              {/* Terrain Ridge */}
              <polygon
                points={`320,174 350,${174 - Math.min(110, (obsHeightM / 4000) * 110)} 380,174`}
                fill="#171717"
                stroke="#a3a3a3"
                strokeWidth="1.5"
                strokeOpacity="0.8"
              />
              <text x="350" y={174 - Math.min(110, (obsHeightM / 4000) * 110) - 8} fill="#e5e5e5" fontSize="9" textAnchor="middle" fontWeight="bold">
                Ridge (+{obsHeightM}m)
              </text>

              {/* Sun Ray */}
              {(() => {
                const angleRad = (sunElevationDeg * Math.PI) / 180;
                const slope = -Math.tan(angleRad);
                const landerY = 174 - (mastHeightM * 2);
                const rayStartX = 480;
                const rayStartY = landerY + (480 - 80) * slope;

                return (
                  <>
                    <line
                      x1={rayStartX}
                      y1={rayStartY}
                      x2="80"
                      y2={landerY}
                      stroke={isObstructed ? "#737373" : "#ffffff"}
                      strokeWidth="2.5"
                      strokeDasharray={isObstructed ? "4 4" : undefined}
                      opacity={0.9}
                    />
                    <circle cx={rayStartX} cy={rayStartY} r="8" fill="#ffffff" stroke="#737373" strokeWidth="2" />
                    <text x={rayStartX - 20} y={rayStartY - 14} fill="#ffffff" fontSize="10" fontWeight="bold">
                      Sun ({sunElevationDeg.toFixed(2)}°)
                    </text>
                  </>
                );
              })()}
            </svg>

            {/* Diagnostic readout */}
            <div className="w-full mt-3 pt-3 border-t border-white/10 grid grid-cols-3 gap-2.5 text-center text-xs">
              <div className="bg-neutral-900/80 border border-white/10 p-2.5 rounded-lg">
                <span className="text-neutral-400 block text-[10px] uppercase">Ridge Skyline Angle</span>
                <span className="text-white font-bold">{obstacleSubtendedDeg.toFixed(3)}°</span>
              </div>
              <div className="bg-neutral-900/80 border border-white/10 p-2.5 rounded-lg">
                <span className="text-neutral-400 block text-[10px] uppercase">Curvature Drop</span>
                <span className="text-white font-bold">-{curvatureDropM.toFixed(1)} m</span>
              </div>
              <div className={`p-2.5 rounded-lg font-bold flex flex-col justify-center ${
                isObstructed
                  ? "bg-neutral-900 text-neutral-300 border border-white/20"
                  : "bg-white text-black border border-white"
              }`}>
                <span className="block text-[10px] uppercase">{isObstructed ? "SHADOW BLOCKED" : "DIRECT SUNLIGHT"}</span>
                <span className="text-xs">{isObstructed ? "ARRAY OCCLUDED" : "ARRAY GENERATING"}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 3 Physical Deep-Dive Guides */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 font-mono text-xs">
        {/* Card 1: The Geometry of Peaks of Eternal Light */}
        <div className="rounded-2xl p-6 border border-white/10 bg-neutral-950 flex flex-col shadow-xl">
          <div className="mb-3">
            <span className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block mb-1">
              ORBITAL TILT DYNAMICS
            </span>
            <h3 className="font-bold text-sm text-white uppercase tracking-wide">
              1. 1.54° Axial Tilt & Peaks of Eternal Light
            </h3>
          </div>
          <p className="text-neutral-300 leading-relaxed mb-3">
            Unlike Earth whose <span className="text-white font-bold">23.44°</span> tilt creates drastic seasons, the Moon’s rotational axis is nearly perpendicular to the ecliptic plane at just <span className="text-white font-bold">1.54°</span>.
          </p>
          <p className="text-neutral-400 leading-relaxed mb-4">
            At the South Pole (89°S–90°S), the Sun never climbs into the sky. It perpetually skims within ~1.5° of the horizon, casting shadows extending <span className="text-white font-bold">50 to 120 km</span>.
          </p>
          <div className="mt-auto bg-black p-4 rounded-xl border border-white/10 text-[11px] text-neutral-300">
            <span className="text-white font-bold block mb-1 uppercase tracking-wider">Mission Consequence:</span>
            Crater floors become <span className="text-neutral-100 font-semibold">Permanently Shadowed Regions (PSRs)</span> frozen below 40 Kelvin, while elevated ridges become <span className="text-white font-semibold">Peaks of Eternal Light (PELs)</span> illuminated &gt;80% of the year.
          </div>
        </div>

        {/* Card 2: Earth Libration Comms */}
        <div className="rounded-2xl p-6 border border-white/10 bg-neutral-950 flex flex-col shadow-xl">
          <div className="mb-3">
            <span className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block mb-1">
              COMMUNICATIONS VISIBILITY
            </span>
            <h3 className="font-bold text-sm text-white uppercase tracking-wide">
              2. Earth Libration & 14-Day Comm Cycle
            </h3>
          </div>
          <p className="text-neutral-300 leading-relaxed mb-3">
            Although the Moon is tidally locked to Earth, orbital eccentricity (<span className="text-white font-bold">e = 0.0549</span>) and orbital inclination cause apparent librations of <span className="text-white font-bold">±8.1° in longitude</span> and <span className="text-white font-bold">±6.7° in latitude</span>.
          </p>
          <p className="text-neutral-400 leading-relaxed mb-4">
            To an observer at the South Pole, Earth does not rise and set daily. Instead, it wobbles in a subtle closed loop hovering between <span className="text-white font-bold">-2° and +8°</span> elevation on a <span className="text-white font-bold">27.3-day</span> sidereal cycle.
          </p>
          <div className="mt-auto bg-black p-4 rounded-xl border border-white/10 text-[11px] text-neutral-300">
            <span className="text-white font-bold block mb-1 uppercase tracking-wider">Mission Consequence:</span>
            Direct-to-Earth (DTE) communication is governed by terrain clearance. A ridge just 2° above the horizon can occult Earth for up to 14 consecutive days during the lower half of the libration cycle.
          </div>
        </div>

        {/* Card 3: The Spherical Horizon Fallacy */}
        <div className="rounded-2xl p-6 border border-white/10 bg-neutral-950 flex flex-col shadow-xl">
          <div className="mb-3">
            <span className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block mb-1">
              TOPOGRAPHY VS APPROXIMATION
            </span>
            <h3 className="font-bold text-sm text-white uppercase tracking-wide">
              3. The Spherical Moon Fallacy
            </h3>
          </div>
          <p className="text-neutral-300 leading-relaxed mb-3">
            Conventional web tools calculate visibility by assuming a smooth, spherical Moon with an idealized <span className="text-neutral-400 font-bold">0.0° horizon</span>.
          </p>
          <p className="text-neutral-400 leading-relaxed mb-4">
            Because polar relief features reach up to <span className="text-white font-bold">4,000 meters</span> high and subtend angles of <span className="text-white font-bold">+2° to +8°</span>, the spherical model gives completely fictitious results—predicting perpetual sunlight where real terrain creates weeks of blackouts.
          </p>
          <div className="mt-auto bg-black p-4 rounded-xl border border-white/10 text-[11px] text-neutral-300">
            <span className="text-white font-bold block mb-1 uppercase tracking-wider">Scientific Integrity:</span>
            KEPLER computes exact 360° raycasts across genuine NASA LRO LOLA DEM elevation grids with curvature correction, ensuring every mission window reflects physical reality.
          </div>
        </div>
      </div>
    </div>
  );
};
