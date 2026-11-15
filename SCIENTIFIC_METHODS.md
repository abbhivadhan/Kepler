# SCIENTIFIC METHODS & MATHEMATICAL MODELS

**Product:** LUNAR ATLAS — Lunar Landing Intelligence & Horizon Decision Studio  
**Target:** NASA Space Apps Challenge 2026 — Lunar Landing Site Navigator  
**Document Status:** Approved Baseline Specification  
**Version:** 1.0  

---

## 1. Topocentric Coordinate Geometry

Let $(\phi, \lambda, h)$ denote the observer's planetocentric latitude, east longitude, and elevation relative to the mean lunar reference sphere $R_{\text{ref}} = 1737.4\text{ km}$.
The observer position in the Moon-fixed Cartesian frame (`IAU_MOON`) is:

$$r = R_{\text{ref}} + h + h_{\text{obs}}$$

$$\mathbf{P}_{\text{obs}} = \begin{pmatrix} r \cos\phi \cos\lambda \\ r \cos\phi \sin\lambda \\ r \sin\phi \end{pmatrix}$$

where $h_{\text{obs}}$ is the configurable observer / mast height above local ground (default $2.0\text{ m}$).

### Topocentric Orthonormal Basis $\{\hat{\mathbf{e}}, \hat{\mathbf{n}}, \hat{\mathbf{u}}\}$

1. **Local Up Unit Vector:**
   $$\hat{\mathbf{u}} = \begin{pmatrix} \cos\phi \cos\lambda \\ \cos\phi \sin\lambda \\ \sin\phi \end{pmatrix}$$

2. **Local East Unit Vector:**
   $$\hat{\mathbf{e}} = \begin{pmatrix} -\sin\lambda \\ \cos\lambda \\ 0 \end{pmatrix}$$

3. **Local North Unit Vector:**
   $$\hat{\mathbf{n}} = \hat{\mathbf{u}} \times \hat{\mathbf{e}} = \begin{pmatrix} -\sin\phi \cos\lambda \\ -\sin\phi \sin\lambda \\ \cos\phi \end{pmatrix}$$

### Apparent Target Projection (Sun & Earth)

Let $\mathbf{P}_{\text{target}}(t)$ be the position vector of the target celestial body (Sun or Earth) in `IAU_MOON` at Ephemeris Time $t$, corrected for one-way light time and stellar aberration via SPICE (`LT+S`).

The topocentric displacement vector from the observer to the target is:
$$\mathbf{D}(t) = \mathbf{P}_{\text{target}}(t) - \mathbf{P}_{\text{obs}}$$
$$d = \|\mathbf{D}(t)\|$$

The topocentric components are:
$$D_u = \mathbf{D} \cdot \hat{\mathbf{u}}, \quad D_e = \mathbf{D} \cdot \hat{\mathbf{e}}, \quad D_n = \mathbf{D} \cdot \hat{\mathbf{n}}$$

The topocentric elevation angle $\theta_{\text{el}}$ and azimuth angle $\phi_{\text{az}}$ are:
$$\theta_{\text{el}} = \arcsin\left(\frac{D_u}{d}\right) \times \frac{180^\circ}{\pi}$$
$$\phi_{\text{az}} = \left(\text{atan2}(D_e, D_n) \times \frac{180^\circ}{\pi}\right) \pmod{360^\circ}$$

---

## 2. Apparent Angular Diameters & Disk Limb Geometry

Neither the Sun nor the Earth is an infinitesimal point source.
* **Sun Radius:** $R_{\odot} \approx 696,340\text{ km}$.
* **Earth Radius:** $R_{\oplus} \approx 6,378.137\text{ km}$.

The apparent semi-diameter $\alpha$ as seen from the lunar observer is:
$$\alpha = \arcsin\left(\frac{R_{\text{body}}}{d}\right)$$

* For the Sun: $\alpha_{\odot} \approx 0.267^\circ$ ($16.0\text{ arcmin}$, disk diameter $\sim 0.533^\circ$).
* For the Earth: $\alpha_{\oplus} \approx 0.95^\circ$ ($57.0\text{ arcmin}$, disk diameter $\sim 1.90^\circ$).

---

## 3. Local Terrain Horizon Skyline Calculation

To determine local horizon masking, radial profiles are sampled across $N_{\text{az}}$ azimuth bins (typically $360$ bins at $1^\circ$ resolution or $720$ bins at $0.5^\circ$ resolution).

For a given azimuth $\psi \in [0, 360^\circ)$:
1. Project a horizontal ray on the lunar surface starting at $(\phi, \lambda)$ along bearing $\psi$.
2. For distances $s_k = k \cdot \Delta s$ up to horizon search radius $S_{\text{max}}$ (typically $30\text{ km}$ to $50\text{ km}$):
   * Compute geographic coordinates $(\phi_k, \lambda_k)$ using spherical geodesics.
   * Interpolate surface elevation $z_k = \text{DEM}(\phi_k, \lambda_k)$ via bilinear interpolation.
   * Compute the elevation angle $\theta_k$ relative to the observer's horizontal tangent plane, accounting for lunar surface curvature:
     $$\Delta z_k = z_k - (h + h_{\text{obs}})$$
     $$\text{Curvature drop } \delta_k \approx \frac{s_k^2}{2 R_{\text{ref}}}$$
     $$\theta_k = \arctan\left(\frac{\Delta z_k - \delta_k}{s_k}\right)$$
3. The skyline elevation for azimuth $\psi$ is the maximum obscuring angle along the ray:
   $$\theta_{\text{sky}}(\psi) = \max_{k} \theta_k$$
   and we record the distance $s_{\text{obst}}$ and coordinates of the peak terrain obstacle.

---

## 4. Visibility State Classification

For any target body with center elevation $\theta_{\text{target}}$ and azimuth $\phi_{\text{target}}$:
Let $\theta_{\text{horizon}} = \theta_{\text{sky}}(\phi_{\text{target}})$.

### Solar Illumination States:
* **Fully Illuminated (Direct Sun):** $\theta_{\text{target}} - \alpha_{\odot} \ge \theta_{\text{horizon}}$. Entire solar disk is above terrain.
* **Partial Illumination (Penumbra / Grazing):** $\theta_{\text{target}} - \alpha_{\odot} < \theta_{\text{horizon}} < \theta_{\text{target}} + \alpha_{\odot}$. Solar disk is partially clipped by topography.
* **Terrain Obstructed (Umbra / Shadow):** $\theta_{\text{target}} + \alpha_{\odot} \le \theta_{\text{horizon}}$. Entire solar disk is occulted by terrain.

### Earth Visibility States:
* **Geometric Direct Line-of-Sight (LOS):** $\theta_{\text{target}} - \alpha_{\oplus} \ge \theta_{\text{horizon}}$. Earth disk completely clear of local terrain.
* **Partial Terrain Occultation:** $\theta_{\text{target}} - \alpha_{\oplus} < \theta_{\text{horizon}} < \theta_{\text{target}} + \alpha_{\oplus}$.
* **Terrain Obstructed:** $\theta_{\text{target}} + \alpha_{\oplus} \le \theta_{\text{horizon}}$. No geometric line of sight to Earth.

### Joint States:
1. **Optimal:** Sun Visible AND Earth Visible (Simultaneous power and direct communication).
2. **Solar Only:** Sun Visible, Earth Obstructed (Power available, direct DTE communication blocked).
3. **Earth Only:** Sun Obstructed, Earth Visible (Operating on battery storage, DTE communication active).
4. **Blackout / Survival:** Neither Sun nor Earth Visible (Critical resource preservation state).

---

## 5. Solar Energy Estimation Model

When an engineering profile is specified:
* **Solar Constant at 1 AU:** $S_0 \approx 1361\text{ W/m}^2$.
* **Effective Solar Irradiance:**
  $$I_{\text{eff}} = S_0 \cdot \max(0, \cos \beta) \cdot f_{\text{vis}}$$
  where:
  * $\beta$ is the angle of incidence between the Sun vector and the solar array surface normal $\hat{\mathbf{n}}_{\text{panel}}$.
  * $f_{\text{vis}} \in [0, 1]$ is the fraction of visible solar disk area unblocked by terrain ($0$ if fully eclipsed, $1$ if fully clear).
* **Estimated Instantaneous Electrical Power:**
  $$P_{\text{est}} = I_{\text{eff}} \cdot A_{\text{panel}} \cdot \eta_{\text{eff}}$$
  where:
  * $A_{\text{panel}}$ is the total active panel surface area ($\text{m}^2$).
  * $\eta_{\text{eff}}$ is the conversion efficiency (default $0.28$ or $28\%$ for space-grade triple-junction GaAs cells).
* **Note:** This is strictly an engineering estimate based on clear physical assumptions, clearly documented as such.

---

## 6. Visibility Event Detection

Timeline analysis detects discrete transition events:
* `SUNRISE`: Transition from terrain-obstructed to partially/fully illuminated.
* `SUNSET`: Transition from illuminated to terrain-obstructed.
* `EARTHRISE`: Direct line-of-sight clearing local topography.
* `EARTHSET`: Direct line-of-sight occulted by topography.
* `SIMULTANEOUS_START`: Onset of joint Sun and Earth visibility.
* `SIMULTANEOUS_END`: Termination of joint visibility.

Event timestamps are pinpointed using root-finding / zero-crossing bisection on the clearance margin:
$$\Delta\theta(t) = \theta_{\text{target}}(t) - \theta_{\text{horizon}}(\phi_{\text{target}}(t))$$
