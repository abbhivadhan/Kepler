import React from "react";
import { SkylinePoint, CelestialTargetTelemetry, SkylineProfileData } from "../../types";

interface PolarPlotProps {
  skylinePoints?: SkylinePoint[];
  skyline?: SkylineProfileData;
  sunTelemetry?: CelestialTargetTelemetry;
  sun?: CelestialTargetTelemetry;
  earthTelemetry?: CelestialTargetTelemetry;
  earth?: CelestialTargetTelemetry;
  siteName?: string;
  size?: number;
}

export const PolarPlot: React.FC<PolarPlotProps> = ({
  skylinePoints: rawSkylinePoints,
  skyline,
  sunTelemetry: propSunTelemetry,
  sun,
  earthTelemetry: propEarthTelemetry,
  earth,
  siteName,
  size = 320,
}) => {
  const points = rawSkylinePoints || skyline?.skyline_profile || [];
  const sunTelemetry = propSunTelemetry || sun;
  const earthTelemetry = propEarthTelemetry || earth;

  const center = size / 2;
  const maxRadius = center - 28; // Padding for azimuth labels

  // Max elevation shown on radar dial is 12 degrees (lunar polar low-horizon regime)
  const maxElevationDeg = 10.0;
  const minElevationDeg = -1.0;
  const elevationSpan = maxElevationDeg - minElevationDeg;

  // Convert (azimuth_deg, elevation_deg) to SVG (x, y)
  const project = (azimuthDeg: number, elevationDeg: number): [number, number] => {
    // Clockwise from North (0° top, 90° right, 180° bottom, 270° left)
    const angleRad = ((azimuthDeg - 90.0) * Math.PI) / 180.0;
    // Normalized radius: center is +10°, outer rim is -1°
    const clampedEl = Math.max(minElevationDeg, Math.min(maxElevationDeg, elevationDeg));
    const rFraction = 1.0 - (clampedEl - minElevationDeg) / elevationSpan;
    const r = rFraction * maxRadius;

    const x = center + r * Math.cos(angleRad);
    const y = center + r * Math.sin(angleRad);
    return [x, y];
  };

  // Build SVG polygon path for 360-degree local terrain skyline
  const skylinePolygonPoints = points
    .map((pt) => {
      const [x, y] = project(pt.azimuth_deg, pt.elevation_deg);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");

  // Project Sun and Earth
  const sunCoords = sunTelemetry ? project(sunTelemetry.azimuth_deg, sunTelemetry.elevation_deg) : null;
  const earthCoords = earthTelemetry ? project(earthTelemetry.azimuth_deg, earthTelemetry.elevation_deg) : null;

  return (
    <div className="flex flex-col items-center">
      {siteName && (
        <div className="text-center text-xs font-mono text-neutral-300 font-semibold mb-2">
          {siteName}
        </div>
      )}
      <div className="relative select-none" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="overflow-visible font-mono text-[10px]">
          <defs>
            <radialGradient id="radarGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#171717" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#000000" stopOpacity="0.95" />
            </radialGradient>
          </defs>

          {/* Background disc */}
          <circle cx={center} cy={center} r={maxRadius} fill="url(#radarGlow)" stroke="#ffffff" strokeWidth="1.2" strokeOpacity="0.2" />

          {/* Concentric elevation rings */}
          {[0, 2, 4, 6, 8, 10].map((el) => {
            const rFraction = 1.0 - (el - minElevationDeg) / elevationSpan;
            const r = rFraction * maxRadius;
            return (
              <g key={el}>
                <circle
                  cx={center}
                  cy={center}
                  r={r}
                  fill="none"
                  stroke={el === 0 ? "#ffffff" : "#404040"}
                  strokeDasharray={el === 0 ? "none" : "2 3"}
                  strokeWidth={el === 0 ? "1.2" : "0.75"}
                  strokeOpacity={el === 0 ? "0.6" : "0.5"}
                />
                <text
                  x={center + 3}
                  y={center - r + 9}
                  fill={el === 0 ? "#ffffff" : "#737373"}
                  fontSize="8"
                  fontWeight={el === 0 ? "bold" : "normal"}
                >
                  +{el}°
                </text>
              </g>
            );
          })}

          {/* Crosshair Azimuth Axes */}
          <line x1={center} y1={center - maxRadius} x2={center} y2={center + maxRadius} stroke="#404040" strokeWidth="1" strokeOpacity="0.5" />
          <line x1={center - maxRadius} y1={center} x2={center + maxRadius} y2={center} stroke="#404040" strokeWidth="1" strokeOpacity="0.5" />
          <line
            x1={center - maxRadius * 0.707}
            y1={center - maxRadius * 0.707}
            x2={center + maxRadius * 0.707}
            y2={center + maxRadius * 0.707}
            stroke="#262626"
            strokeWidth="0.5"
            strokeDasharray="2 4"
          />
          <line
            x1={center - maxRadius * 0.707}
            y1={center + maxRadius * 0.707}
            x2={center + maxRadius * 0.707}
            y2={center - maxRadius * 0.707}
            stroke="#262626"
            strokeWidth="0.5"
            strokeDasharray="2 4"
          />

          {/* Compass Cardinal Labels */}
          <text x={center} y={center - maxRadius - 8} fill="#ffffff" textAnchor="middle" fontWeight="bold">
            N (000°)
          </text>
          <text x={center + maxRadius + 14} y={center + 4} fill="#a3a3a3" textAnchor="middle">
            E (090°)
          </text>
          <text x={center} y={center + maxRadius + 16} fill="#a3a3a3" textAnchor="middle">
            S (180°)
          </text>
          <text x={center - maxRadius - 14} y={center + 4} fill="#a3a3a3" textAnchor="middle">
            W (270°)
          </text>

          {/* LOLA Terrain Skyline Obstruction Area */}
          {skylinePolygonPoints && (
            <polygon
              points={skylinePolygonPoints}
              fill="rgba(255, 255, 255, 0.08)"
              stroke="#ffffff"
              strokeWidth="1.2"
              strokeOpacity="0.75"
            />
          )}

          {/* Sun Target Position Marker */}
          {sunCoords && (
            <g>
              {/* Sightline ray from center */}
              <line
                x1={center}
                y1={center}
                x2={sunCoords[0]}
                y2={sunCoords[1]}
                stroke="#ffffff"
                strokeWidth="1"
                strokeDasharray="3 2"
                opacity="0.5"
              />
              <circle
                cx={sunCoords[0]}
                cy={sunCoords[1]}
                r="6"
                fill={sunTelemetry?.state === "VISIBLE" ? "#ffffff" : "#525252"}
                stroke="#ffffff"
                strokeWidth="1.5"
              />
              <text
                x={sunCoords[0] + 10}
                y={sunCoords[1] - 4}
                fill="#ffffff"
                fontWeight="bold"
                fontSize="9"
              >
                SUN ({sunTelemetry?.elevation_deg.toFixed(1)}°)
              </text>
            </g>
          )}

          {/* Earth Target Position Marker */}
          {earthCoords && (
            <g>
              <line
                x1={center}
                y1={center}
                x2={earthCoords[0]}
                y2={earthCoords[1]}
                stroke="#a3a3a3"
                strokeWidth="1"
                strokeDasharray="3 2"
                opacity="0.5"
              />
              <circle
                cx={earthCoords[0]}
                cy={earthCoords[1]}
                r="6"
                fill={earthTelemetry?.state === "VISIBLE" ? "#a3a3a3" : "#404040"}
                stroke="#ffffff"
                strokeWidth="1.2"
              />
              <text
                x={earthCoords[0] + 10}
                y={earthCoords[1] + 12}
                fill="#d4d4d4"
                fontWeight="bold"
                fontSize="9"
              >
                EARTH ({earthTelemetry?.elevation_deg.toFixed(1)}°)
              </text>
            </g>
          )}
        </svg>
      </div>

      <div className="flex items-center space-x-5 mt-2.5 text-[11px] font-mono">
        <div className="flex items-center space-x-1.5">
          <span className="w-3 h-0.5 bg-white inline-block" />
          <span className="text-neutral-400">LOLA Terrain Skyline</span>
        </div>
        <div className="flex items-center space-x-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-white inline-block" />
          <span className="text-neutral-400">Sun Position</span>
        </div>
        <div className="flex items-center space-x-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-neutral-400 inline-block" />
          <span className="text-neutral-400">Earth (LOS)</span>
        </div>
      </div>
    </div>
  );
};
