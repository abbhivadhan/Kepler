# COMPETITOR GAP & ORIGINALITY ANALYSIS

**Product:** LUNAR ATLAS — Lunar Landing Intelligence & Horizon Decision Studio  
**Target:** NASA Space Apps Challenge — Lunar Landing Site Navigator  
**Document Status:** Phase 0 Baseline Research  
**Revision:** 1.0  

---

## 1. Executive Summary

Missions to the Moon’s south pole (including NASA Artemis III and Commercial Lunar Payload Services / CLPS missions) operate in a uniquely unforgiving terrain and illumination regime. Because the Moon’s rotational axis is tilted only $1.54^\circ$ relative to the ecliptic, the Sun skims the horizon at extreme grazing angles (rarely exceeding $1.5^\circ$ elevation), casting dynamic shadows tens of kilometers long across rugged crater walls and massifs. Simultaneously, the Earth hovers low along the local horizon ($0^\circ$ to $8^\circ$), subject to lunar libration cycles that cause periodic occultation behind elevated topography.

Several open-source and hackathon initiatives have addressed elements of this challenge. This document provides an objective analysis of existing implementations, identifies technical and experience gaps, defines LUNAR ATLAS’s distinct architectural identity, and specifies features we intentionally avoid.

---

## 2. Survey of Existing Implementations

| Project | Documented Approach | Strengths | Known Limitations & Gaps |
| :--- | :--- | :--- | :--- |
| **SYNEXIS** | Web dashboard querying NASA/JPL Horizons API for 24-hr UTC windows; uses LROC WAC texture map. | Clean 24-hr ephemeris timeline; displays apparent Sun/Earth azimuth & elevation. | **No DEM terrain horizon calculation.** Evaluates line-of-sight against an ideal spherical horizon ($0^\circ$). Because south-polar terrain variations exceed $3^\circ$ to $8^\circ$, spherical evaluations produce false illumination and communication windows. Single-site only. |
| **POLAR WINDOW** (PolarWindow) | Visualization interface tracking CLPS missions, Sun/Earth elevation tracks, and trajectory timelines. | Mission-centric framing; integrates candidate coordinates with operational context. | Lacks synchronized dual-site comparative simulation ("Horizon Replay"). Coarse terrain masking without interactive physical horizon skyline inspection. |
| **SIGHTLINE / LunarSight** | Polar coordinate radar plot ("Horizon Wheel") of Sun/Earth trajectories; 3D globe viewer. | Intuitive 2D azimuth/elevation dial representation; good educational orientation. | 3D environment decoupled from local lander vantage point. Conflates geometric visibility with operational radio communication without link margin disclaimers. |
| **Horizon Atlas** / Generic Lunar Visualizers | Three.js global Moon sphere with directional light vector; pre-rendered orbital video clips. | Visually attractive lunar globe rendering. | **Scientifically non-viable:** uses global sphere textures without micro-topography; directional light illuminates an idealized sphere rather than casting ray-traced shadows over LOLA DEM relief. |

---

## 3. Features Common Across Competing Implementations

1. **JPL Horizons Ephemeris Querying:** Extracting topocentric Sun and Earth azimuth/elevation tables for predefined coordinates.
2. **2D Azimuth/Elevation Polar Wheel:** Displaying Sun and Earth tracks on a $360^\circ$ circular polar plot with concentric elevation rings ($0^\circ, 30^\circ, 60^\circ, 90^\circ$).
3. **Single-Site Timeline:** A 24-hour or 14-day slider showing solar elevation above $0^\circ$ and Earth elevation above $0^\circ$.
4. **Global 3D Lunar Sphere:** A rotating textured sphere marking landing coordinates with pins.

---

## 4. Our Product's Intended Distinction (LUNAR ATLAS)

LUNAR ATLAS does not duplicate generic features. Its distinction is grounded in **scientific fidelity, comparative decision-making, and physical explainability**:

### A. HORIZON REPLAY (Signature Experience)
* **True Synchronized Dual-Site Comparison:** Side-by-side synchronized simulation of Site A (e.g., Shackleton Rim) vs. Site B (e.g., Malapert Massif), with independent date selection and locked or relative timelines.
* **Direct Cause-and-Effect Terrain Explanations:** When a sunrise, sunset, Earthrise, or Earthset event occurs, the system directly reveals the physical terrain feature responsible (e.g., *"Sun obstructed by Connecting Ridge at Azimuth 142.4°, elevation +2.18°, obscuring solar center by 0.62°"*).
* **Seamless Vantage Transition:** Instant transition from South Polar Orbital Overview to the Lander's Local Horizon Eye-Level ($h_{obs}$ configurable from 1.5 m to 10 m), viewing the actual computed LOLA skyline silhouette.

### B. One Scientific Engine, Three Audience Experiences
* **Mission Control:** Dense engineering decision support with raw floating-point precision, topocentric vectors, link-budget geometric bounds, uninterrupted darkness durations, and full NAIF/PDS provenance metadata.
* **Science Explorer:** Interactive plain-language breakdowns of polar lighting phenomena, libration geometry, permanently shadowed regions (PSRs), and skyline profiling.
* **Lunar Experience:** Fluid, ambient 3D exploratory experience with camera bookmarks, real-time lighting transitions, and guided lunar walk-throughs.

### C. Landing Robustness (Spatial Sensitivity)
* Beyond a single point coordinate, planners can analyze spatial sensitivity across a candidate landing dispersion ellipse (sampling points across the terrain to highlight localized shadow sinks, communication dropouts, and terrain sensitivity).

### D. Uncompromising Scientific Provenance
* Explicit separation of **NASA NAIF SPICE** ephemerides, **LRO LOLA DEM** topography, **derived geometric line-of-sight**, and **engineering estimates** (such as solar panel irradiance under incident angle losses).
* Clear distinction between geometric direct-to-Earth (DTE) visibility and validated operational radio communication link budgets.

---

## 5. Features Intentionally Avoided

To prevent feature inflation and maintain scientific integrity, LUNAR ATLAS deliberately excludes:

1. **Fabricated Radio Link Budgets:** We will not compute dBW signal-to-noise ratios or data-throughput claims without genuine transponder power, antenna patterns, and receiver G/T parameters. We strictly report **Geometric Line-of-Sight (LOS) with Terrain Clearance**.
2. **Fake Real-Time Rover Driving Simulators:** Driving physics or rover pathfinding unrelated to the south pole horizon/lighting challenge.
3. **Pre-rendered CGI Video Animations:** No video playback masquerading as scientific simulation; every vertex, vector, and event is computed dynamically from real datasets.
4. **Uncalibrated Global "Landing Probability" Heatmaps:** We will never label uniform spatial sampling of an ellipse as an empirical landing success probability.
5. **Bloated SaaS Authentication & Paywalls:** No user accounts, passwords, or cloud databases that add attack surface without delivering scientific value.
