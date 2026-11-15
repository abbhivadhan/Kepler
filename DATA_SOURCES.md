# SCIENTIFIC DATA SOURCES & PROVENANCE SPECIFICATION

**Product:** LUNAR ATLAS — Lunar Landing Intelligence & Horizon Decision Studio  
**Target:** NASA Space Apps Challenge 2026 — Lunar Landing Site Navigator  
**Document Status:** Approved Baseline Specification  
**Version:** 1.0  

---

## 1. NASA NAIF SPICE Ephemeris & Geometry

All celestial body positions, lunar orientations, and coordinate transformations are derived using the NASA Navigation and Ancillary Information Facility (NAIF) SPICE system via `SpiceyPy`.

### Kernels Inventory

| Kernel Type | Filename | Source / Archive | Version / Date Range | Purpose | Frame / Target Definitions |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **LSK** (Leapseconds) | `naif0012.tls` | NASA NAIF Generic Kernels | v12 (Valid through present & future leapseconds) | Time conversion between UTC string and Ephemeris Time (ET / TDB seconds past J2000) | N/A |
| **PCK** (Planetary Constants) | `pck00010.tpc` | NASA NAIF Generic Kernels | v10 | Physical constants, lunar reference radius ($R = 1737.4\text{ km}$), IAU orientation models | Lunar frame `IAU_MOON` |
| **SPK** (Ephemeris) | `de421.bsp` | NASA JPL Planetary Ephemeris | Coverage: 1900-01-01 to 2050-01-01 | High-precision ephemeris of the Sun, Earth, Moon, and Solar System Barycenter | Centers: `399` (Earth), `301` (Moon), `10` (Sun) |

### Coordinate Reference Systems & Conventions
* **Inertial Frame:** `J2000` (Earth Mean Equator and Equinox of J2000).
* **Moon-Fixed Frame:** `IAU_MOON` / `MOON_ME` (Mean Earth / Polar Axis frame), tied to the Moon's center of mass.
* **Topocentric Horizon Frame:** Local Topocentric Horizontal Frame at site $(\phi, \lambda, h)$:
  * **Up ($\hat{u}$):** Outward surface normal at planetocentric latitude $\phi$, longitude $\lambda$.
  * **North ($\hat{n}$):** Tangent vector pointing towards the lunar North Pole along the local meridian.
  * **East ($\hat{e}$):** Tangent vector pointing in the direction of increasing east longitude ($\hat{e} = \hat{n} \times \hat{u}$).
  * **Azimuth ($\phi_{\text{az}}$):** Measured in degrees from North ($0^\circ$) clockwise through East ($90^\circ$).
  * **Elevation ($\theta_{\text{el}}$):** Angle in degrees above the local horizontal tangent plane ($\hat{u} = 0$).

---

## 2. NASA LRO LOLA Topographic Data

Topographic elevation data for local horizon obstruction calculations is sourced from the Lunar Orbiter Laser Altimeter (LOLA) instrument aboard NASA's Lunar Reconnaissance Orbiter (LRO).

### Primary DEM Products

| Dataset Identifier | NASA PDS Node | Coverage | Spatial Resolution | Projection & Datum | Source Format |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **LOLA LDEM_80S_80M** | PDS Geosciences Node / GSFC PGDA | $80^\circ\text{S}$ to $90^\circ\text{S}$ (South Polar Region) | 80 meters/pixel (and 20m/pixel regional extracts) | Polar Stereographic, Center: $90^\circ\text{S}$, Longitude of projection: $0^\circ$, Reference Sphere: $1737.4\text{ km}$ | Cloud-Optimized GeoTIFF (COG) / Float32 |
| **Regional Candidate Site High-Res Grids** | USGS Astrogeology / QuickMap / LOLA RDR | $15\text{ km} \times 15\text{ km}$ bounding boxes around Artemis Candidate Sites | 20 meters/pixel to 60 meters/pixel | Polar Stereographic / Local Equidistant | GeoTIFF / NumPy Float32 Elevation Array |

### Candidate Landing Sites & Reference Coordinates

| Site ID | Region Name | Nominal Latitude ($\phi$) | Nominal Longitude ($\lambda$) | Elevation ($h$ relative to $1737.4\text{ km}$) | Terrain Feature Description |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `SHACKLETON_RIM` | Shackleton Crater Rim | $-89.68^\circ$ ($89.68^\circ\text{S}$) | $129.0^\circ\text{E}$ | $+1.24\text{ km}$ | High-elevation crater rim with near-permanent illumination peaks and deep interior cold traps. |
| `CONNECTING_RIDGE`| Connecting Ridge | $-89.45^\circ$ ($89.45^\circ\text{S}$) | $-136.0^\circ\text{W}$ ($224.0^\circ\text{E}$) | $+0.92\text{ km}$ | Elevated ridge connecting Shackleton with adjacent highlands; favorable solar visibility. |
| `MALAPERT_MASSIF` | Malapert Massif | $-86.00^\circ$ ($86.00^\circ\text{S}$) | $+2.70^\circ\text{E}$ | $+5.02\text{ km}$ | Massive topographic high block; exceptional direct-to-Earth line of sight and solar access. |
| `DE_GERLACHE_RIM` | de Gerlache Crater Rim 2 | $-88.30^\circ$ ($88.30^\circ\text{S}$) | $-88.30^\circ\text{W}$ ($271.7^\circ\text{E}$) | $+0.65\text{ km}$ | Prominent crater rim plateau evaluated for Artemis landing opportunities. |
| `HAWORTH_RIDGE` | Haworth Crater Rim | $-87.40^\circ$ ($87.40^\circ\text{S}$) | $-5.10^\circ\text{W}$ ($354.9^\circ\text{E}$) | $+1.15\text{ km}$ | Rim crest bounding permanently shadowed crater interior. |
| `NOBILE_RIM_1` | Nobile Crater Rim 1 | $-85.20^\circ$ ($85.20^\circ\text{S}$) | $+37.80^\circ\text{E}$ | $+1.40\text{ km}$ | Rolling highlands terrain near NASA VIPER mission target area. |

---

## 3. NASA Visual & 3D Assets

| Asset Description | NASA Source | Original Format | Optimized Runtime Asset | License / Usage Terms |
| :--- | :--- | :--- | :--- | :--- |
| **NASA CGI Moon Kit** | NASA Scientific Visualization Studio (SVS #4720) | High-res normal & displacement maps (16-bit TIFF) | Web-optimized $2048 \times 1024$ albedo and normal textures (`moon_albedo.jpg`, `moon_normal.jpg`) | NASA Open Data / Public Domain |
| **LOLA South Pole Topographic Mesh** | Derived directly from LOLA DEM $80^\circ\text{S}$ to $90^\circ\text{S}$ | GeoTIFF Elevation Model | R3F 3D Vertex Displaced Geometry + Precomputed Normal Maps | Derived from NASA PDS open datasets |
| **Apollo / Artemis Concept Lander Marker** | NASA 3D Resources (`nasa/NASA-3D-Resources`) | GLTF / GLB | Web-optimized Draco-compressed GLB ($< 800\text{ KB}$) | Public Domain / NASA open 3D repository |

---

## 4. Scientific Provenance Metadata Standard

Every calculated result returned by the backend API includes a mandatory `provenance` metadata block:

```json
{
  "provenance": {
    "spice_kernel_version": "de421.bsp, pck00010.tpc, naif0012.tls",
    "ephemeris_source": "NASA/JPL Planetary Ephemeris DE421",
    "dem_source": "NASA LRO LOLA PDS Geosciences Node (LDEM_80S_80M)",
    "dem_spatial_resolution_m": 80.0,
    "observer_height_m": 2.0,
    "coordinate_system": "IAU_MOON (Mean Earth/Polar Axis)",
    "calculation_timestamp": "2026-11-14T06:24:00Z",
    "methodology": "Radial Raycasting Skyline Horizon Sweep + SPICE Topocentric Vector Projection",
    "limitations": "Geometric line-of-sight only; does not model radio frequency link budget or atmospheric refraction (lunar atmosphere is negligible airless vacuum)."
  }
}
```
