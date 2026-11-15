# SCIENTIFIC VALIDATION & BENCHMARK SUITE

**Product:** LUNAR ATLAS — Lunar Landing Intelligence & Horizon Decision Studio  
**Target:** NASA Space Apps Challenge 2026 — Lunar Landing Site Navigator  
**Document Status:** Approved Baseline Specification  
**Version:** 1.0  

---

## 1. Validation Philosophy & Scope

Scientific accuracy is the foundational pillar of LUNAR ATLAS. Visual appeal alone does not constitute scientific correctness. Every physical quantity computed by the engine is subject to automated validation tests with documented numerical error tolerances.

We maintain a strict separation between:
1. **SPICE-derived ephemeris geometry** (astrometric truth).
2. **LOLA DEM terrain elevation & horizon masking** (topographic truth).
3. **Derived visibility & event detection** (computational state logic).
4. **Engineering estimates** (solar power generation potential).

---

## 2. Benchmark Comparisons Against JPL Horizons

To guarantee ephemeris fidelity, our test suite benchmarks the internal `SpiceyPy` calculation against published NASA/JPL Horizons ephemerides for test epochs (e.g. 2026-10-15 00:00:00 UTC at Shackleton Rim: $\phi = -89.68^\circ, \lambda = 129.0^\circ$):

| Parameter | Internal Engine Source | Reference Benchmark | Permissible Tolerance | Physical Rationale |
| :--- | :--- | :--- | :--- | :--- |
| **Ephemeris Time (ET)** | `sp.str2et(utc_str)` | NAIF Leapsecond Table | $\pm 0.001\text{ s}$ | Precision of LSK table |
| **Lunar Sub-Solar Latitude** | Moon pole vector $\cdot$ Sun vector | JPL Horizons Sub-Solar Point | $\pm 0.005^\circ$ ($\approx 18\text{ arcsec}$) | Planetary constants model ($pck00010$) |
| **Lunar Sub-Earth Latitude** | Moon pole vector $\cdot$ Earth vector | JPL Horizons Sub-Earth Point | $\pm 0.005^\circ$ ($\approx 18\text{ arcsec}$) | Libration modeling |
| **Topocentric Sun Elevation** | Local horizon frame projection | JPL Horizons Topocentric Apparent | $\pm 0.02^\circ$ ($\approx 1.2\text{ arcmin}$) | Light-time + aberration correction (`LT+S`) |
| **Topocentric Sun Azimuth** | Local horizon frame projection | JPL Horizons Topocentric Apparent | $\pm 0.05^\circ$ ($\approx 3\text{ arcmin}$) | Pole singularity sensitivity near $90^\circ\text{S}$ |
| **Topocentric Earth Elevation** | Local horizon frame projection | JPL Horizons Topocentric Apparent | $\pm 0.02^\circ$ ($\approx 1.2\text{ arcmin}$) | Topocentric displacement vector |
| **Topocentric Earth Azimuth** | Local horizon frame projection | JPL Horizons Topocentric Apparent | $\pm 0.05^\circ$ ($\approx 3\text{ arcmin}$) | Topocentric displacement vector |

---

## 3. Coordinate Transformation Verification

1. **Orthonormality of Local Frame:**
   For all test latitudes $\phi \in [-90^\circ, -80^\circ]$ and longitudes $\lambda \in [-180^\circ, +180^\circ]$:
   $$\|\hat{\mathbf{e}}\| = 1 \pm 10^{-7}, \quad \|\hat{\mathbf{n}}\| = 1 \pm 10^{-7}, \quad \|\hat{\mathbf{u}}\| = 1 \pm 10^{-7}$$
   $$\hat{\mathbf{e}} \cdot \hat{\mathbf{n}} = 0 \pm 10^{-7}, \quad \hat{\mathbf{e}} \cdot \hat{\mathbf{u}} = 0 \pm 10^{-7}, \quad \hat{\mathbf{n}} \cdot \hat{\mathbf{u}} = 0 \pm 10^{-7}$$
   $$\hat{\mathbf{e}} \times \hat{\mathbf{n}} = \hat{\mathbf{u}} \pm 10^{-7}$$

2. **Pole Singularity Guard:**
   At exact south pole ($\phi = -90.0^\circ$), meridian conventions are stabilized to prevent division-by-zero or NaN in $\text{atan2}$.

---

## 4. Terrain Horizon Algorithm Verification

1. **Analytic Synthetic Topography Test (Cone / Ring Crater):**
   * A synthetic crater of known radius $R_c = 10\text{ km}$ and rim height $H = 2000\text{ m}$ is evaluated from its center.
   * Analytical horizon elevation:
     $$\theta_{\text{expected}} = \arctan\left(\frac{H - \frac{R_c^2}{2 R_{\text{ref}}}}{R_c}\right) \approx \arctan\left(\frac{2000 - 28.78}{10000}\right) \approx 11.154^\circ$$
   * The raycaster must match the analytical result within $\pm 0.01^\circ$.

2. **Observer Height Sensitivity Test:**
   * Evaluating the horizon at $h_{\text{obs}} = 1.0\text{ m}$ vs $h_{\text{obs}} = 10.0\text{ m}$:
   * Skyline obstruction angles must monotonically decrease or remain equal with increasing observer height ($\theta_{\text{sky}}(h_{\text{obs}}=10\text{m}) \le \theta_{\text{sky}}(h_{\text{obs}}=1\text{m})$).

3. **Curvature Drop Verification:**
   * Curvature drop $\delta = s^2 / (2 R_{\text{ref}})$ must accurately suppress distant terrain beyond the geometric horizon.

---

## 5. Visibility Event Detection Edge Cases

1. **Grazing Disk Limb Transit:**
   * When the solar disk center passes within $\alpha_{\odot} = 0.267^\circ$ of the skyline peak, the engine must correctly transition through `PARTIAL_ILLUMINATION` before reaching `FULL_ILLUMINATION` or `TERRAIN_OBSTRUCTED`.
2. **Libration-Induced Grazing Earthset:**
   * Earth visibility must account for the $1.9^\circ$ apparent diameter of Earth, flagging partial occultation when the lower limb dips behind a ridge while the upper limb remains visible.
3. **Uninterrupted Darkness & Blackout Intervals:**
   * The sum of interval durations across the requested simulation window must strictly equal the total elapsed time ($T_{\text{illuminated}} + T_{\text{dark}} = T_{\text{total}}$).
