# KEPLER — Lunar Landing & Horizon Decision Studio

> **High-Fidelity Topocentric Illumination, Terrain Occlusion & Mission Architecture Synthesis for the Lunar South Pole**

---

## 1. Overview

**KEPLER** is an aerospace-grade mission decision support platform designed to address the unique physical and geometric challenges of landing and operating at the **Lunar South Pole** (Artemis III target candidates).

Due to the Moon sub-solar grazing angle (axial tilt is only 1.54 degrees), the Sun skims along the polar horizon at grazing angles (0 to 2.5 degrees), casting colossal mountain shadows that stretch tens of kilometers across the regolith. Standard spherical approximations fail dramatically in rugged polar terrain, introducing critical blind spots in solar power availability and direct-to-Earth (DTE) communication links.

KEPLER resolves the **Spherical Moon Fallacy** by coupling:
- **NASA JPL NAIF SPICE N0067** planetary ephemeris kernels (DE421) and body orientation constants (PCK00010) in the MOON_ME (Mean Earth/Polar Axis) reference frame.
- **NASA LRO LOLA 240m Digital Elevation Models (DEM)** polar stereographic grid.
- **Spherical lunar curvature raycasting** (R = 1,737.4 km, delta_h = d^2 / (2R)) across 360 degrees of topocentric azimuth.

---

## 2. Key Capabilities & Features

### 1. Mission Control Studio
- **Topocentric Telemetry & Real-Time KPIs**: Sun elevation vs. skyline clearance, Earth visibility angle, estimated solar array power (Watts), and joint operating state classification (POWER+COMM, POWER_ONLY, COMM_ONLY, SHADOW_BLACKOUT).
- **Interactive 3D Spacecraft Studio**: Multi-part PBR 3D models with switchable spacecraft (Artemis Starship HLS, Apollo Lunar Module, Lunar Satellite), dynamic solar vector tracking, and a steerable high-gain Earth communications dish.
- **Precision Polar Radar Dial**: 360 degree azimuth dial with concentric elevation rings (+0 deg to +10 deg) rendering the authentic LOLA terrain skyline obstruction silhouette and celestial tracks.
- **Synchronized Time Series & Mission Scrubber**: Time-series telemetry charts (Sun, Earth, Power) with play/pause playback and time scrub controls.

### 2. Horizon Replay & Comparative Analysis
- **Side-by-Side Dual Viewports**: Comparative head-to-head analysis evaluating two candidate landing sites simultaneously (e.g., *Shackleton Connecting Ridge* vs. *Malapert Massif*).
- **Synchronized Playback Controls**: Variable replay speeds (1x, 5x, 10x, 30x).
- **Jump-to-Event Ribbons**: One-click navigation to critical mission events (Sunrise, Comm Loss, Maximum Shadow, Peak Power Window).
- **Comparative Metric Deltas**: Quantifies relative advantages in illumination %, DTE comm coverage, and maximum continuous darkness.

### 3. Science Explorer & Raycast Sandbox
- **Live Curvature Raycast Sandbox**: Interactive sliders for obstacle distance (0-50 km), obstacle height (0-3000 m), observer mast height (1-10 m), and solar grazing elevation with a live SVG raycast schematic.
- **Deep-Dive Science Modules**:
  1. *1.54 deg Axial Tilt & Eternal Twilight*
  2. *27.3-Day Earth Libration Cycle*
  3. *The Spherical Moon Fallacy*

### 4. Lunar Experience 3D Visualizer
- **Interactive NASA Lunar Globe**: 3D spherical mesh textured with NASA LROC surface imagery and LOLA bump displacement.
- **Smooth Inertial Physics**: Mouse-drag rotation with velocity inertia and mouse-wheel zoom directly into polar crater basins.
- **Site Markers**: Geographically accurate 3D target pins with quick-action telemetry inspection.

### 5. Dedicated Decision Tools
- **Landing Dispersion Ellipse Robustness**: Monte Carlo spatial sensitivity analysis across 3-sigma landing ellipses, identifying shadow-trap risks and comm blackout vulnerabilities.
- **Tactical Decision Brief**: Executive synthesis briefing calculating figures of merit (FOM), battery capacity sizing (kWh for nominal 150W hotel load), print-ready formatting, and one-click timestamped CSV export.
- **Data Provenance Modal**: Real-time documentation of NAIF SPICE kernels, LOLA DEM specifications, and mathematical formulas.

---

## 3. Getting Started

### Backend Setup
```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python -m pytest
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

### Frontend Setup
```bash
cd frontend
npm install
npm run build
npm run dev
```

---

## 4. Candidate Landing Sites

KEPLER includes built-in coordinates and elevation profiles for Artemis III high-priority sites:
- **Shackleton Connecting Ridge** (-89.90 deg, 0.00 deg, 1,250 m AMSL)
- **Malapert Massif Summit** (-84.90 deg, 12.90 deg, 5,000 m AMSL)
- **de Gerlache Connecting Ridge** (-89.44 deg, -137.31 deg, 1,850 m AMSL)
- **Haworth Crater Rim Crest** (-87.40 deg, -5.10 deg, -300 m AMSL)
- **de Gerlache Rim Plateau** (-88.50 deg, -88.30 deg, 620 m AMSL)
- **Amundsen Rim Promontory** (-84.50 deg, 82.80 deg, -1,100 m AMSL)

---

## 5. Data Credits
- **NASA JPL NAIF SPICE**: Planetary ephemeris kernels (DE421, PCK00010, naif0012.tls).
- **NASA LRO LOLA Science Team**: Lunar Orbiter Laser Altimeter 240m polar stereographic DEM.
- **NASA Scientific Visualization Studio (SVS 4720)**: CGI Moon Kit 4K surface and displacement textures.
