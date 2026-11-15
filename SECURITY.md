# SECURITY & ROBUSTNESS SPECIFICATION

**Product:** LUNAR ATLAS — Lunar Landing Intelligence & Horizon Decision Studio  
**Target:** NASA Space Apps Challenge 2026 — Lunar Landing Site Navigator  
**Document Status:** Approved Baseline Specification  
**Version:** 1.0  

---

## 1. Threat Model & Security Philosophy

LUNAR ATLAS is designed to deliver scientific decision support with zero unnecessary attack surface. The application intentionally omits user accounts, authentication databases, password storage, and arbitrary user file upload mechanisms. By eliminating stateful credential storage, the primary attack surfaces are reduced to:
1. Denial of Service (DoS) via resource-intensive mathematical calculations (e.g. dense raycasting over DEM grids).
2. Input parameter manipulation (latitude, longitude, date ranges, step intervals).
3. Cross-Site Scripting (XSS) through malicious inputs reflected in generated reports or briefings.
4. Server-Side Request Forgery (SSRF) and Path Traversal via file/path specifications.

---

## 2. Implemented Defense Controls

### A. Input Sanitization & Strict Pydantic Schemas
* **Latitude Constraints:** Strictly enforced between $[-90.0, -80.0]$ for South Polar analyses. Rejects out-of-bounds or invalid values with HTTP 422.
* **Longitude Constraints:** Normalized to $[-180.0, +180.0]$ or $[0.0, 360.0]$.
* **Date & Epoch Validation:** ISO 8601 UTC format enforced. Date intervals must fall within verified SPICE kernel coverage ($1950\text{ to }2050$). Minimum time step clamped ($\ge 60\text{ seconds}$) to prevent memory exhaustion.
* **Observer Height Limits:** Enforced between $0.5\text{ m}$ and $25.0\text{ m}$.
* **Sampling Resolution:** Bounded between $0.25^\circ$ and $5.0^\circ$ for azimuth sweeps.

### B. Computational Rate Limiting & Resource Protection
* Heavy endpoints (`/api/horizon`, `/api/compare`, `/api/robustness`) are guarded by an in-memory token bucket rate limiter to prevent computational resource exhaustion.
* Maximum timeline duration per calculation request is clamped to 60 days to prevent CPU saturation.
* Maximum ellipse sample count in robustness analysis is capped at 100 points.

### C. Safe File & Path Handling (Anti-Path-Traversal)
* All terrain and kernel file paths are strictly resolved against an immutable server-side base directory (`data/kernels` and `data/terrain`).
* Endpoints do **NOT** accept user-supplied file paths, URLs, or shell execution strings.

### D. CORS & Transport Security
* FastAPI `CORSMiddleware` configured strictly to allowed origins (`http://localhost:5173`, `http://127.0.0.1:5173`, and production domain).
* Safe HTTP headers: `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Strict-Transport-Security`.

### E. Error Handling & Exception Masking
* Internal traceback details, system filepaths, and stack traces are captured in server logging only and never reflected in client-facing HTTP 500 error responses.
* Safe client responses return standardized error envelopes:
  ```json
  {
    "error": "CalculationError",
    "message": "The requested calculation interval exceeds kernel coverage.",
    "code": "ERR_SPICE_COVERAGE"
  }
  ```

### F. Dependency Auditing & Code Scanning
* Backend static analysis: `Ruff` (linting & formatting), `Bandit` (AST security vulnerability scan), `pip-audit`.
* Frontend security: `npm audit`, `ESLint`, `TypeScript` strict compiler checks (`noImplicitAny: true`).
