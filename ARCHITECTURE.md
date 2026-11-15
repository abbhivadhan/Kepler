# SYSTEM ARCHITECTURE SPECIFICATION

**Product:** LUNAR ATLAS — Lunar Landing Intelligence & Horizon Decision Studio  
**Target:** NASA Space Apps Challenge 2026 — Lunar Landing Site Navigator  
**Document Status:** Approved Baseline Specification  
**Version:** 1.0  

---

## 1. High-Level Architecture Overview

LUNAR ATLAS follows a decoupled client-server architecture:

```
┌────────────────────────────────────────────────────────────────────────┐
│                        FRONTEND (React + Three.js)                     │
│                                                                        │
│  ┌────────────────────┐ ┌────────────────────┐ ┌────────────────────┐  │
│  │   MISSION CONTROL  │ │  SCIENCE EXPLORER  │ │  LUNAR EXPERIENCE  │  │
│  └─────────┬──────────┘ └─────────┬──────────┘ └─────────┬──────────┘  │
│            └──────────────────────┼──────────────────────┘             │
│                                   ▼                                    │
│                 HORIZON REPLAY & COMPARISON WORKFLOW                   │
│                                   │                                    │
│       ┌───────────────────────────┴───────────────────────────┐        │
│       ▼                                                       ▼        │
│  3D Canvas (R3F / Drei)                          Analytical Dashboard  │
│  - Dual Viewport Synchronizer                    - Synchronized Scrubber
│  - Topographic LOLA Mesh View                    - Dual Site Timelines │
│  - Local Horizon Skyline View                    - Visibility Banners  │
│  - Celestial Vector Rays                         - Metrics & Briefings │
│       ▲                                                       ▲        │
│       └───────────────────────────┬───────────────────────────┘        │
│                                   ▼                                    │
│                        Zustand State Stores                            │
│                        Axios / TanStack Client                         │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ HTTPS / REST (JSON API)
┌───────────────────────────────────▼────────────────────────────────────┐
│                        BACKEND (FastAPI / Python)                      │
│                                                                        │
│   FastAPI Router & Pydantic Validation & Security Middleware           │
│   ├── /api/health                                                      │
│   ├── /api/sites (Catalog of candidate lunar south pole sites)         │
│   ├── /api/geometry (Sun/Earth topocentric angles & ephemerides)       │
│   ├── /api/horizon (360° local terrain skyline profile calculation)    │
│   ├── /api/illumination (Terrain-aware solar visibility timeline)      │
│   ├── /api/communication (Direct-to-Earth geometric line-of-sight)     │
│   ├── /api/compare (Dual site/date HORIZON REPLAY analysis engine)     │
│   ├── /api/robustness (Landing dispersion ellipse spatial sensitivity) │
│   └── /api/report (Printable / CSV decision brief generator)           │
│                                   │                                    │
│   Scientific Engine Modules:                                           │
│   ├── spice_engine (SpiceyPy: de421, pck00010, naif0012)               │
│   ├── coordinate_transforms (IAU_MOON, Topocentric SEU/ENU)            │
│   ├── terrain_engine (LOLA DEM GeoTIFF loader & bilinear sampler)      │
│   ├── horizon_calculator (Radial skyline raycasting with curvature)   │
│   ├── visibility_classifier (Disk limb & terrain obstacle analyzer)   │
│   ├── event_detector (Zero-crossing bisection event detector)          │
│   └── power_estimator (Cosine incidence solar energy estimation)       │
│                                   │                                    │
│   Data Repositories:                                                   │
│   ├── /data/kernels/ (SPICE LSK, PCK, SPK binary/text kernels)         │
│   ├── /data/terrain/ (LOLA DEM regional high-res GeoTIFF datasets)     │
│   └── /data/models/  (Optimized lunar & lander 3D assets)              │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Directory Layout

```
nasa/
├── backend/
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py                     # FastAPI application entrypoint
│   │   ├── config.py                   # Environment settings & constants
│   │   ├── api/
│   │   │   ├── __init__.py
│   │   │   ├── routes.py               # REST API endpoints
│   │   │   └── dependencies.py         # Injected dependencies
│   │   ├── core/
│   │   │   ├── __init__.py
│   │   │   ├── security.py             # Rate limiters & input sanitizers
│   │   │   └── exceptions.py           # Clean error handling
│   │   ├── scientific/
│   │   │   ├── __init__.py
│   │   │   ├── spice_service.py        # SPICE ephemeris calculations
│   │   │   ├── coordinates.py          # Coordinate conversions
│   │   │   ├── terrain.py              # LOLA DEM loader & sampler
│   │   │   ├── horizon.py              # Radial skyline raycaster
│   │   │   ├── visibility.py           # Sun/Earth visibility & disk limb
│   │   │   ├── events.py               # Rise/Set event bisection
│   │   │   ├── comparison.py           # Dual site comparison engine
│   │   │   ├── robustness.py           # Landing ellipse spatial analysis
│   │   │   ├── power.py                # Solar irradiance & power model
│   │   │   └── validation.py           # Scientific validation routines
│   │   ├── schemas/
│   │   │   ├── __init__.py
│   │   │   ├── requests.py             # Strict Pydantic input schemas
│   │   │   └── responses.py            # Strict Pydantic output schemas
│   │   └── tests/
│   │       ├── test_spice.py
│   │       ├── test_terrain.py
│   │       ├── test_horizon.py
│   │       ├── test_visibility.py
│   │       └── test_api.py
│   ├── data/
│   │   ├── kernels/                    # naif0012.tls, pck00010.tpc, de421.bsp
│   │   └── terrain/                    # LOLA DEM GeoTIFF south pole datasets
│   └── requirements.txt
│
├── frontend/
│   ├── public/
│   │   ├── models/                     # Web-ready 3D models & textures
│   │   └── textures/
│   ├── src/
│   │   ├── assets/
│   │   ├── components/
│   │   │   ├── common/                 # Buttons, Badges, Modals, Sliders
│   │   │   ├── 3d/                     # Three.js / R3F Canvas components
│   │   │   │   ├── LunarScene.tsx      # Interactive Moon & polar terrain
│   │   │   │   ├── HorizonView.tsx     # Observer eye-level skyline camera
│   │   │   │   ├── SunEarthRays.tsx    # Celestial direction indicator rays
│   │   │   │   └── TerrainMesh.tsx     # LOLA elevation vertex displacement
│   │   │   ├── layout/                 # Header, Navigation, Status Bar
│   │   │   └── features/
│   │   │       ├── horizon-replay/     # Signature dual comparison player
│   │   │       │   ├── ReplayCanvas.tsx
│   │   │       │   ├── TimelineBar.tsx
│   │   │       │   └── EventTracker.tsx
│   │   │       ├── mission-control/    # Technical engineering dashboard
│   │   │       ├── science-explorer/   # Accessible scientific explainers
│   │   │       ├── lunar-experience/   # Public 3D interactive mode
│   │   │       ├── robustness/         # Landing ellipse sensitivity map
│   │   │       └── decision-brief/     # Printable report & CSV exporter
│   │   ├── hooks/                      # useSimulation, useHorizon, etc.
│   │   ├── services/                   # API client (Axios / Fetch)
│   │   ├── store/                      # Zustand store (simulationState)
│   │   ├── types/                      # TypeScript scientific interfaces
│   │   ├── utils/                      # Formatting, math, export helpers
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── package.json
│   ├── tsconfig.json
│   ├── tailwind.config.js
│   └── vite.config.ts
│
├── COMPETITOR_GAP.md
├── DATA_SOURCES.md
├── SCIENTIFIC_METHODS.md
├── ARCHITECTURE.md
├── SECURITY.md
└── VALIDATION.md
```
