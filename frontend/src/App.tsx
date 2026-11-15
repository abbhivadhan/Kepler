import React, { useState, useEffect } from "react";
import { AudienceMode, CandidateSite, SiteTimelineResult } from "./types";
import { fetchHealth, fetchCandidateSites, fetchIlluminationTimeline } from "./services/api";
import { Header } from "./components/layout/Header";
import { StatusBar } from "./components/layout/StatusBar";
import { MissionControlView } from "./features/mission-control/MissionControlView";
import { HorizonReplayView } from "./features/horizon-replay/HorizonReplayView";
import { ScienceExplorerView } from "./features/science-explorer/ScienceExplorerView";
import { LunarExperienceView } from "./features/lunar-experience/LunarExperienceView";
import { RobustnessModal } from "./features/robustness/RobustnessModal";
import { DecisionBriefModal } from "./features/decision-brief/DecisionBriefModal";
import { LandingView } from "./features/landing/LandingView";

export const App: React.FC = () => {
  const [currentMode, setCurrentMode] = useState<AudienceMode>("LANDING");
  const [isBackendHealthy, setIsBackendHealthy] = useState<boolean>(false);
  const [isLolaActive, setIsLolaActive] = useState<boolean>(false);

  const [candidateSites, setCandidateSites] = useState<CandidateSite[]>([]);
  const [activeSite, setActiveSite] = useState<CandidateSite | null>(null);

  // Modals
  const [robustnessSite, setRobustnessSite] = useState<CandidateSite | null>(null);
  const [decisionBriefData, setDecisionBriefData] = useState<{
    site: CandidateSite;
    timeline: SiteTimelineResult;
  } | null>(null);
  const [isBriefLoading, setIsBriefLoading] = useState<boolean>(false);
  const [provenanceModalOpen, setProvenanceModalOpen] = useState<boolean>(false);

  // Observer height
  const [observerHeightM, setObserverHeightM] = useState<number>(2.0);

  const handleOpenDecisionBrief = async () => {
    const site = activeSite || (candidateSites.length > 0 ? candidateSites[0] : null);
    if (!site) return;

    if (decisionBriefData && decisionBriefData.site.id === site.id) {
      return;
    }

    setIsBriefLoading(true);
    try {
      const timeline = await fetchIlluminationTimeline({
        latitude_deg: site.latitude_deg,
        longitude_deg: site.longitude_deg,
        start_time: "2026-10-15T12:00:00",
        end_time: "2026-10-16T12:00:00",
        step_minutes: 30,
        observer_height_m: observerHeightM,
      });
      setDecisionBriefData({ site, timeline });
    } catch (err) {
      console.error("Failed to load decision brief timeline:", err);
    } finally {
      setIsBriefLoading(false);
    }
  };

  useEffect(() => {
    fetchHealth()
      .then((data) => {
        setIsBackendHealthy(true);
        setIsLolaActive(data.lola_dem?.active === true);
      })
      .catch((err) => {
        console.warn("Health check error:", err);
        setIsBackendHealthy(false);
      });

    fetchCandidateSites()
      .then((sites) => {
        setCandidateSites(sites);
        if (sites.length > 0) setActiveSite(sites[0]);
      })
      .catch((err) => console.error("Sites fetch error:", err));
  }, []);

  return (
    <div className="flex flex-col h-screen w-screen bg-black text-slate-100 font-sans overflow-hidden select-none">
      {/* Top Application Header */}
      <Header
        currentMode={currentMode}
        onSelectMode={(mode) => setCurrentMode(mode)}
        onOpenDecisionBrief={handleOpenDecisionBrief}
        onOpenRobustness={() => {
          if (activeSite) {
            setRobustnessSite(activeSite);
          } else if (candidateSites.length > 0) {
            setRobustnessSite(candidateSites[0]);
          }
        }}
        onOpenProvenance={() => setProvenanceModalOpen(true)}
        isBackendHealthy={isBackendHealthy}
        isLolaActive={isLolaActive}
      />

      {/* Main Feature Viewport */}
      <main className="flex-1 flex overflow-hidden relative">
        {currentMode === "LANDING" && (
          <LandingView
            onNavigate={(mode) => setCurrentMode(mode)}
            candidateSites={candidateSites}
            onSelectSite={(site, targetMode = "MISSION_CONTROL") => {
              setActiveSite(site);
              setCurrentMode(targetMode);
            }}
          />
        )}

        {currentMode === "MISSION_CONTROL" && (
          <MissionControlView
            onOpenRobustness={(site) => setRobustnessSite(site)}
            onOpenDecisionBrief={(site, timeline) =>
              setDecisionBriefData({ site, timeline })
            }
          />
        )}

        {currentMode === "HORIZON_REPLAY" && <HorizonReplayView />}

        {currentMode === "SCIENCE_EXPLORER" && <ScienceExplorerView />}

        {currentMode === "LUNAR_EXPERIENCE" && (
          <LunarExperienceView
            onSelectSiteForTelemetry={(site) => {
              setActiveSite(site);
              setCurrentMode("MISSION_CONTROL");
            }}
            onSelectSiteForReplay={(site) => {
              setActiveSite(site);
              setCurrentMode("HORIZON_REPLAY");
            }}
          />
        )}
      </main>

      {/* Global Status Bar (Active during operational modes, hidden on Landing) */}
      {currentMode !== "LANDING" && (
        <StatusBar
          currentUtc="2026-10-15T12:00:00 UTC"
          observerHeightM={observerHeightM}
          onObserverHeightChange={(h) => setObserverHeightM(h)}
          siteName={activeSite?.name || "Shackleton Connecting Ridge"}
          groundElevationM={activeSite?.nominal_elevation_m || 1250}
        />
      )}

      {/* Robustness Analysis Modal */}
      {robustnessSite && (
        <RobustnessModal
          site={robustnessSite}
          onClose={() => setRobustnessSite(null)}
        />
      )}

      {/* Decision Brief Modal */}
      {(decisionBriefData || isBriefLoading) && (
        <DecisionBriefModal
          site={decisionBriefData?.site || activeSite || candidateSites[0] || null}
          timeline={decisionBriefData?.timeline || null}
          isLoading={isBriefLoading}
          onClose={() => {
            setDecisionBriefData(null);
            setIsBriefLoading(false);
          }}
        />
      )}

      {/* Provenance & Scientific Integrity Modal */}
      {provenanceModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-2xl flex items-center justify-center p-4 sm:p-6 select-none animate-fadeIn">
          <div className="relative rounded-3xl border border-white/[0.12] max-w-2xl w-full p-8 shadow-[0_25px_80px_rgba(0,0,0,0.95)] bg-neutral-950 text-neutral-300 flex flex-col space-y-6">
            {/* Header */}
            <div className="flex items-start justify-between border-b border-white/[0.08] pb-5">
              <div>
                <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-white/[0.04] border border-white/10 text-[10px] font-mono uppercase tracking-wider text-neutral-400 mb-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-white" />
                  <span>Verified Planetary Telemetry</span>
                </div>
                <h2 className="text-xl font-bold tracking-tight text-white">
                  SPICE &amp; LOLA Data Architecture
                </h2>
                <p className="text-xs text-neutral-400 mt-1 font-sans">
                  Physical calculations are verified against authentic NASA PDS and JPL ephemeris standards.
                </p>
              </div>
              <button
                onClick={() => setProvenanceModalOpen(false)}
                className="w-8 h-8 rounded-full border border-white/15 flex items-center justify-center text-neutral-400 hover:text-white hover:border-white/40 hover:bg-white/[0.05] transition cursor-pointer text-sm font-sans"
                title="Close"
              >
                &times;
              </button>
            </div>

            {/* Technical Provenance Cards */}
            <div className="space-y-3.5">
              {/* SPICE Kernel */}
              <div className="p-4 rounded-2xl bg-neutral-900/40 border border-white/[0.08] hover:border-white/20 transition">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-semibold text-white tracking-wide uppercase font-sans">
                    NASA NAIF SPICE Ephemeris Engine
                  </span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white/10 text-neutral-200 border border-white/10">
                    CSPICE N0067
                  </span>
                </div>
                <p className="text-xs text-neutral-400 leading-relaxed font-sans">
                  Target vectors for the Sun and Earth are computed using the JPL Development Ephemeris kernel <code className="text-white font-mono text-[11px] bg-white/[0.06] px-1.5 py-0.5 rounded">de421.bsp</code> and planetary constants <code className="text-white font-mono text-[11px] bg-white/[0.06] px-1.5 py-0.5 rounded">pck00010.tpc</code> in the <code className="text-white font-mono text-[11px] bg-white/[0.06] px-1.5 py-0.5 rounded">MOON_ME</code> Mean Earth / Polar Axis frame.
                </p>
              </div>

              {/* LOLA DEM */}
              <div className="p-4 rounded-2xl bg-neutral-900/40 border border-white/[0.08] hover:border-white/20 transition">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-semibold text-white tracking-wide uppercase font-sans">
                    NASA LRO LOLA Topography
                  </span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white/10 text-neutral-200 border border-white/10">
                    240m / pixel
                  </span>
                </div>
                <p className="text-xs text-neutral-400 leading-relaxed font-sans">
                  Skyline terrain occlusion profiles are evaluated from the NASA Planetary Data System Lunar Orbiter Laser Altimeter dataset (<code className="text-white font-mono text-[11px] bg-white/[0.06] px-1.5 py-0.5 rounded">LDEM_75S_240M_FLOAT.IMG</code>), covering 75&deg;S to 90&deg;S in polar stereographic projection.
                </p>
              </div>

              {/* Curvature Correction */}
              <div className="p-4 rounded-2xl bg-neutral-900/40 border border-white/[0.08] hover:border-white/20 transition">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-semibold text-white tracking-wide uppercase font-sans">
                    Spherical Lunar Curvature Correction
                  </span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white/10 text-neutral-200 border border-white/10">
                    R = 1,737.4 km
                  </span>
                </div>
                <p className="text-xs text-neutral-400 leading-relaxed font-sans">
                  Every raycast sample at ground distance s accounts for true lunar spherical drop: &delta; = s&sup2; / (2 R_moon), eliminating planar flattening distortions across distances up to 120 km.
                </p>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between pt-4 border-t border-white/[0.08]">
              <span className="text-[11px] font-mono text-neutral-500">
                PDS ARCHIVE &bull; NAIF DE421 &bull; LOLA 240M
              </span>
              <button
                onClick={() => setProvenanceModalOpen(false)}
                className="px-6 py-2 rounded-full bg-white text-black font-semibold text-xs tracking-wider uppercase hover:bg-neutral-200 transition cursor-pointer shadow-sm"
              >
                Close Briefing
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
