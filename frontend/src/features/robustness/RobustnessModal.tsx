import React, { useState } from "react";
import { CandidateSite, RobustnessResult } from "../../types";
import { fetchLandingRobustness } from "../../services/api";

interface RobustnessModalProps {
  site: CandidateSite | null;
  onClose: () => void;
}

export const RobustnessModal: React.FC<RobustnessModalProps> = ({ site, onClose }) => {
  if (!site) return null;

  const [semiMajorKm, setSemiMajorKm] = useState<number>(1.0);
  const [semiMinorKm, setSemiMinorKm] = useState<number>(0.5);
  const [orientationAzimuthDeg, setOrientationAzimuthDeg] = useState<number>(45);
  const [gridSize, setGridSize] = useState<number>(5);

  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<RobustnessResult | null>(null);

  const handleCompute = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchLandingRobustness({
        center_lat: site.latitude_deg,
        center_lon: site.longitude_deg,
        semi_major_km: semiMajorKm,
        semi_minor_km: semiMinorKm,
        orientation_azimuth_deg: orientationAzimuthDeg,
        sample_grid_size: gridSize,
      });
      setResult(data);
    } catch (err: any) {
      setError(err.message || "Failed to calculate dispersion robustness");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xl flex items-center justify-center p-4">
      <div className="rounded-2xl border border-white/10 max-w-4xl w-full max-h-[90vh] overflow-y-auto flex flex-col shadow-2xl font-mono text-xs bg-neutral-950">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-white/10 bg-neutral-950">
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-[10px] font-mono font-bold text-neutral-400 uppercase tracking-wider">
                DISPERSION ANALYSIS
              </span>
            </div>
            <h2 className="text-sm font-bold text-white uppercase tracking-wider mt-0.5">
              Landing Ellipse Robustness &amp; Spatial Sensitivity
            </h2>
            <span className="text-neutral-400 text-[11px]">
              Target: {site.name} ({site.latitude_deg.toFixed(2)}°S, {site.longitude_deg.toFixed(2)}°E)
            </span>
          </div>
          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-white px-3 py-1.5 rounded-lg border border-white/15 hover:bg-white/10 transition text-xs font-mono font-medium cursor-pointer"
          >
            <span>CLOSE</span>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5 flex-1">
          {/* Parameter Inputs */}
          <div className="bg-neutral-900/60 border border-white/10 rounded-xl p-4 grid grid-cols-1 md:grid-cols-5 gap-3 items-end">
            <div>
              <label className="text-neutral-400 block mb-1">Semi-Major (km):</label>
              <input
                type="number"
                step="0.1"
                min="0.2"
                max="5.0"
                value={semiMajorKm}
                onChange={(e) => setSemiMajorKm(Number(e.target.value))}
                className="w-full bg-black border border-white/15 text-white rounded-lg px-2.5 py-1.5 focus:border-white focus:outline-none"
              />
            </div>

            <div>
              <label className="text-neutral-400 block mb-1">Semi-Minor (km):</label>
              <input
                type="number"
                step="0.1"
                min="0.1"
                max="3.0"
                value={semiMinorKm}
                onChange={(e) => setSemiMinorKm(Number(e.target.value))}
                className="w-full bg-black border border-white/15 text-white rounded-lg px-2.5 py-1.5 focus:border-white focus:outline-none"
              />
            </div>

            <div>
              <label className="text-neutral-400 block mb-1">Azimuth (°):</label>
              <input
                type="number"
                step="5"
                min="0"
                max="360"
                value={orientationAzimuthDeg}
                onChange={(e) => setOrientationAzimuthDeg(Number(e.target.value))}
                className="w-full bg-black border border-white/15 text-white rounded-lg px-2.5 py-1.5 focus:border-white focus:outline-none"
              />
            </div>

            <div>
              <label className="text-neutral-400 block mb-1">Grid Density:</label>
              <select
                value={gridSize}
                onChange={(e) => setGridSize(Number(e.target.value))}
                className="w-full bg-black border border-white/15 text-white rounded-lg px-2.5 py-1.5 focus:border-white focus:outline-none cursor-pointer"
              >
                <option value={3} className="bg-black text-white">3x3 (Fast)</option>
                <option value={5} className="bg-black text-white">5x5 (Standard)</option>
                <option value={7} className="bg-black text-white">7x7 (Detailed)</option>
              </select>
            </div>

            <button
              onClick={handleCompute}
              disabled={loading}
              className="py-2 px-4 rounded-full bg-white text-black font-semibold text-xs tracking-wider uppercase transition-all hover:bg-neutral-200 disabled:opacity-50 cursor-pointer shadow-sm"
            >
              {loading ? <span>Analyzing...</span> : <span>Run Spatial</span>}
            </button>
          </div>

          {error && (
            <div className="bg-neutral-900 border border-white/20 text-neutral-300 p-3 rounded-xl text-xs flex items-center space-x-2">
              <span className="font-bold text-white font-mono">[ALERT]</span>
              <span>{error}</span>
            </div>
          )}

          {/* Results Summary */}
          {result && (
            <div className="space-y-5">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="bg-neutral-900/80 border border-white/10 rounded-xl p-4">
                  <span className="text-neutral-400 text-[10px] uppercase block">Illumination Range</span>
                  <div className="text-lg font-bold text-white mt-1">
                    {result.spatial_sensitivity.min_illumination_pct.toFixed(1)}% &ndash; {result.spatial_sensitivity.max_illumination_pct.toFixed(1)}%
                  </div>
                  <span className="text-[10px] text-neutral-400">
                    Mean: {result.spatial_sensitivity.mean_illumination_pct.toFixed(1)}%
                  </span>
                </div>

                <div className="bg-neutral-900/80 border border-white/10 rounded-xl p-4">
                  <span className="text-neutral-400 text-[10px] uppercase block">Earth Comm Visibility</span>
                  <div className="text-lg font-bold text-white mt-1">
                    {result.spatial_sensitivity.min_earth_visibility_pct.toFixed(1)}% &ndash; {result.spatial_sensitivity.max_earth_visibility_pct.toFixed(1)}%
                  </div>
                  <span className="text-[10px] text-neutral-400">
                    Mean: {result.spatial_sensitivity.mean_earth_visibility_pct.toFixed(1)}%
                  </span>
                </div>

                <div className="bg-neutral-900/80 border border-white/10 rounded-xl p-4">
                  <span className="text-neutral-400 text-[10px] uppercase block">Terrain Relief Delta</span>
                  <div className="text-lg font-bold text-white mt-1">
                    &Delta; {result.spatial_sensitivity.elevation_range_m.toFixed(0)} m
                  </div>
                  <span className="text-[10px] text-neutral-400">
                    Height gradient across ellipse
                  </span>
                </div>

                <div className="bg-neutral-900/80 border border-white/10 rounded-xl p-4">
                  <span className="text-neutral-400 text-[10px] uppercase block">Sampled Grid Nodes</span>
                  <div className="text-lg font-bold text-white mt-1">
                    {result.ellipse.total_sampled_points} nodes
                  </div>
                  <span className="text-[10px] text-neutral-400">
                    LOLA 240m DEM resolution
                  </span>
                </div>
              </div>

              {/* 2D Ellipse Scatter Grid Visualization */}
              <div className="bg-neutral-900/50 border border-white/10 rounded-2xl p-6 flex flex-col items-center">
                <span className="text-xs uppercase text-neutral-300 font-semibold mb-4 tracking-wider">
                  Dispersion Ellipse Spatial Sampling Map (u, v in km)
                </span>
                <svg viewBox="-150 -150 300 300" className="w-72 h-72 bg-black rounded-full border border-white/15 shadow-2xl">
                  {/* Grid axes */}
                  <line x1="-140" y1="0" x2="140" y2="0" stroke="#333333" strokeDasharray="3 3" />
                  <line x1="0" y1="-140" x2="0" y2="140" stroke="#333333" strokeDasharray="3 3" />

                  {/* Ellipse Outline */}
                  <ellipse
                    cx="0"
                    cy="0"
                    rx={semiMajorKm * 90}
                    ry={semiMinorKm * 90}
                    transform={`rotate(${orientationAzimuthDeg})`}
                    fill="none"
                    stroke="#ffffff"
                    strokeWidth="1.5"
                    strokeDasharray="4 4"
                  />

                  {/* Sampled Points */}
                  {result.samples.map((s, idx) => {
                    const cx = s.u_km * 90;
                    const cy = -s.v_km * 90;
                    // Monochrome brightness scale
                    const color =
                      s.illumination_percentage > 70
                        ? "#ffffff"
                        : s.illumination_percentage > 50
                        ? "#a3a3a3"
                        : "#525252";

                    return (
                      <g key={idx}>
                        <circle cx={cx} cy={cy} r="4" fill={color} />
                      </g>
                    );
                  })}

                  {/* Target Center */}
                  <circle cx="0" cy="0" r="5" fill="#ffffff" stroke="#000000" strokeWidth="1.5" />
                </svg>

                <div className="flex items-center space-x-5 mt-4 text-[11px] text-neutral-400">
                  <div className="flex items-center space-x-1.5">
                    <span className="w-2.5 h-2.5 bg-white rounded-full"></span>
                    <span>&gt;70% Sun</span>
                  </div>
                  <div className="flex items-center space-x-1.5">
                    <span className="w-2.5 h-2.5 bg-neutral-400 rounded-full"></span>
                    <span>50-70% Sun</span>
                  </div>
                  <div className="flex items-center space-x-1.5">
                    <span className="w-2.5 h-2.5 bg-neutral-600 rounded-full"></span>
                    <span>&lt;50% Sun</span>
                  </div>
                </div>
              </div>

              {/* Scientific Disclaimer */}
              <div className="bg-black border border-white/10 p-4 rounded-xl text-[11px] text-neutral-400 leading-relaxed">
                {result.scientific_disclaimer}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

