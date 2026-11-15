import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { CandidateSite } from "../../types";
import { fetchCandidateSites } from "../../services/api";

interface LunarExperienceViewProps {
  onSelectSiteForTelemetry: (site: CandidateSite) => void;
  onSelectSiteForReplay: (site: CandidateSite) => void;
}

export const LunarExperienceView: React.FC<LunarExperienceViewProps> = ({
  onSelectSiteForTelemetry,
  onSelectSiteForReplay,
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const [sites, setSites] = useState<CandidateSite[]>([]);
  const [selectedSite, setSelectedSite] = useState<CandidateSite | null>(null);

  useEffect(() => {
    fetchCandidateSites()
      .then((data) => {
        setSites(data);
        if (data.length > 0) setSelectedSite(data[0]);
      })
      .catch((err) => console.error("Error fetching sites:", err));
  }, []);

  useEffect(() => {
    if (!mountRef.current) return;
    const container = mountRef.current;
    const width = container.clientWidth || 800;
    const height = container.clientHeight || 600;

    // 1. Scene: Pure Pitch Black Space
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000000);

    // 2. Camera looking towards the Lunar South Pole
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.set(0, -2.8, 1.8);
    camera.lookAt(0, 0, 0);

    // 3. Renderer with ACES Filmic Tone Mapping
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    container.innerHTML = "";
    container.appendChild(renderer.domElement);

    // 4. Photorealistic Lunar Lighting: Grazing South Pole Solar Vector
    const sunLight = new THREE.DirectionalLight(0xfff2df, 2.6);
    sunLight.position.set(5, -1, 0.3); // Grazing low-elevation sun across southern craters
    scene.add(sunLight);

    const rimLight = new THREE.DirectionalLight(0xffeedd, 0.35);
    rimLight.position.set(-4, 3, -2);
    scene.add(rimLight);

    const earthGlow = new THREE.DirectionalLight(0x1e293b, 0.15);
    earthGlow.position.set(-2, -3, 2);
    scene.add(earthGlow);

    const ambientLight = new THREE.AmbientLight(0x050810, 0.05);
    scene.add(ambientLight);

    // 5. Deep Space Background Stars (1,500 tiny points)
    const starCount = 1500;
    const starGeo = new THREE.BufferGeometry();
    const starPositions = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount; i++) {
      const radius = 40 + Math.random() * 80;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      starPositions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      starPositions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      starPositions[i * 3 + 2] = radius * Math.cos(phi);
    }
    starGeo.setAttribute("position", new THREE.BufferAttribute(starPositions, 3));
    const starMat = new THREE.PointsMaterial({ size: 0.8, color: 0xffffff, transparent: true, opacity: 0.8 });
    const starField = new THREE.Points(starGeo, starMat);
    scene.add(starField);

    // 6. High-Fidelity 3D Moon: Authentic NASA Lunar Texture & LOLA Bump Mapping
    const textureLoader = new THREE.TextureLoader();
    const maxAnisotropy = renderer.capabilities.getMaxAnisotropy();

    const moonMap = textureLoader.load("/textures/moon_map.jpg");
    moonMap.colorSpace = THREE.SRGBColorSpace;
    moonMap.anisotropy = maxAnisotropy;

    const moonBump = textureLoader.load("/textures/moon_bump.jpg");
    moonBump.anisotropy = maxAnisotropy;

    const moonRadius = 1.0;
    const moonGeo = new THREE.SphereGeometry(moonRadius, 128, 128);
    const moonMat = new THREE.MeshStandardMaterial({
      map: moonMap,
      bumpMap: moonBump,
      bumpScale: 0.055,
      color: 0xd5c8b5, // Warm rusty lunar regolith tint with dark basalt maria
      roughness: 0.92,
      metalness: 0.02,
    });
    const moonMesh = new THREE.Mesh(moonGeo, moonMat);
    scene.add(moonMesh);

    // 7. Site Marker Pins on 3D Globe
    const markersGroup = new THREE.Group();
    moonMesh.add(markersGroup);

    sites.forEach((site) => {
      // Convert lat/lon to 3D Cartesian coordinates
      // lat: -90 (south pole) to 0, lon: -180 to 180
      const phi = (90 - site.latitude_deg) * (Math.PI / 180);
      const theta = (site.longitude_deg + 180) * (Math.PI / 180);

      const x = -(moonRadius * 1.018) * Math.sin(phi) * Math.cos(theta);
      const z = (moonRadius * 1.018) * Math.sin(phi) * Math.sin(theta);
      const y = (moonRadius * 1.018) * Math.cos(phi);

      const isCurrent = selectedSite?.id === site.id;

      // Pure white marker pin
      const markerGeo = new THREE.SphereGeometry(0.022, 16, 16);
      const markerMat = new THREE.MeshBasicMaterial({ color: isCurrent ? 0xffffff : 0xd4d4d4 });
      const markerMesh = new THREE.Mesh(markerGeo, markerMat);
      markerMesh.position.set(x, y, z);
      markerMesh.userData = { site };
      markersGroup.add(markerMesh);

      // Subtle target halo ring
      const ringGeo = new THREE.RingGeometry(0.032, 0.040, 24);
      const ringMat = new THREE.MeshBasicMaterial({
        color: 0xffffff,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: isCurrent ? 0.9 : 0.4,
      });
      const ringMesh = new THREE.Mesh(ringGeo, ringMat);
      ringMesh.position.set(x, y, z);
      ringMesh.lookAt(0, 0, 0);
      markersGroup.add(ringMesh);
    });

    // 8. 3D Apollo Lunar Module landed at Lunar South Pole
    const gltfLoader = new GLTFLoader();
    gltfLoader.load(
      "/models/apollo_lunar_module.glb",
      (gltf) => {
        const lander = gltf.scene;
        lander.scale.set(0.016, 0.016, 0.016);
        lander.position.set(0, -moonRadius - 0.005, 0);
        lander.rotation.x = Math.PI;
        moonMesh.add(lander);
      },
      undefined,
      (err) => console.log("Lander preview fallback:", err)
    );

    // 9. 3D Orbiting Lunar Reconnaissance Spacecraft
    const orbiterGroup = new THREE.Group();
    const orbiterBody = new THREE.Mesh(
      new THREE.CylinderGeometry(0.018, 0.018, 0.05, 16),
      new THREE.MeshStandardMaterial({ color: 0xf1f5f9, metalness: 0.9, roughness: 0.2 })
    );
    orbiterBody.rotation.z = Math.PI / 2;
    orbiterGroup.add(orbiterBody);

    const solarPanel = new THREE.Mesh(
      new THREE.BoxGeometry(0.12, 0.002, 0.028),
      new THREE.MeshStandardMaterial({ color: 0x262626, metalness: 0.8, roughness: 0.3 })
    );
    orbiterGroup.add(solarPanel);
    scene.add(orbiterGroup);

    // Subtle orbit path ring
    const orbitRadius = 1.45;
    const orbitRingGeo = new THREE.RingGeometry(orbitRadius - 0.0015, orbitRadius + 0.0015, 64);
    const orbitRingMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.15,
    });
    const orbitRing = new THREE.Mesh(orbitRingGeo, orbitRingMat);
    orbitRing.rotation.x = Math.PI / 3;
    scene.add(orbitRing);

    // 10. Interactive Drag-to-Rotate & Wheel Zoom
    let isDragging = false;
    let prevMousePos = { x: 0, y: 0 };
    let rotVelX = 0;
    let rotVelY = 0;

    const onMouseDown = (e: MouseEvent) => {
      isDragging = true;
      prevMousePos = { x: e.clientX, y: e.clientY };
    };

    const onMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      const deltaX = e.clientX - prevMousePos.x;
      const deltaY = e.clientY - prevMousePos.y;

      rotVelX = deltaX * 0.005;
      rotVelY = deltaY * 0.005;

      moonMesh.rotation.z += rotVelX;
      moonMesh.rotation.x += rotVelY;

      prevMousePos = { x: e.clientX, y: e.clientY };
    };

    const onMouseUp = () => {
      isDragging = false;
    };

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const zoomFactor = e.deltaY * 0.002;
      const currentDist = camera.position.length();
      const newDist = Math.max(1.6, Math.min(4.5, currentDist + zoomFactor));
      camera.position.setLength(newDist);
    };

    container.addEventListener("mousedown", onMouseDown);
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    container.addEventListener("wheel", onWheel, { passive: false });

    // 11. Animation Loop
    let animId: number;
    let orbitAngle = 0;
    const animate = () => {
      animId = requestAnimationFrame(animate);

      // Inertia and slow natural rotation
      if (!isDragging) {
        rotVelX *= 0.95;
        rotVelY *= 0.95;
        moonMesh.rotation.z += rotVelX + 0.0008;
        moonMesh.rotation.x += rotVelY;
      }

      orbitAngle += 0.012;
      orbiterGroup.position.set(
        Math.cos(orbitAngle) * orbitRadius,
        Math.sin(orbitAngle) * orbitRadius * Math.cos(Math.PI / 3),
        Math.sin(orbitAngle) * orbitRadius * Math.sin(Math.PI / 3)
      );
      orbiterGroup.lookAt(0, 0, 0);

      renderer.render(scene, camera);
    };
    animate();

    const handleResize = () => {
      if (!mountRef.current) return;
      const w = mountRef.current.clientWidth;
      const h = mountRef.current.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener("resize", handleResize);

    return () => {
      cancelAnimationFrame(animId);
      container.removeEventListener("mousedown", onMouseDown);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
      container.removeEventListener("wheel", onWheel);
      window.removeEventListener("resize", handleResize);
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      renderer.dispose();
      moonGeo.dispose();
      moonMat.dispose();
      moonMap.dispose();
      moonBump.dispose();
      starGeo.dispose();
      starMat.dispose();
    };
  }, [sites, selectedSite]);

  return (
    <div className="flex-1 flex flex-col lg:flex-row h-full overflow-hidden p-4 gap-4 bg-black text-white font-sans select-none">
      {/* 3D Lunar Globe Canvas Viewport (70% on desktop) */}
      <div className="flex-1 relative bg-black border border-white/10 rounded-2xl overflow-hidden shadow-2xl flex flex-col">
        {/* Top Floating Badge */}
        <div className="absolute top-4 left-4 z-10 font-mono pointer-events-none">
          <div className="flex items-center space-x-2 bg-neutral-950/90 border border-white/15 px-3.5 py-1.5 rounded-full shadow-lg">
            <span className="text-xs font-semibold text-white uppercase tracking-wider">
              LUNAR SOUTH POLE 3D VISUALIZER
            </span>
          </div>
          <p className="text-[10px] text-neutral-400 mt-1 pl-1">
            Drag to rotate • Scroll to zoom • Grazing solar vector (1.54° axial tilt)
          </p>
        </div>

        {/* Bottom Legend */}
        <div className="absolute bottom-4 left-4 z-10 flex flex-wrap items-center gap-2 text-xs font-mono">
          <div className="flex items-center space-x-2 bg-neutral-950/90 px-3 py-1.5 rounded-full border border-white/15 shadow-md">
            <span className="w-2 h-2 rounded-full bg-white"></span>
            <span className="text-neutral-300">Artemis Target Candidate</span>
          </div>
          <div className="flex items-center space-x-2 bg-neutral-950/90 px-3 py-1.5 rounded-full border border-white/15 shadow-md">
            <span className="w-2 h-2 rounded-full bg-neutral-400"></span>
            <span className="text-neutral-300">Grazing Solar Vector</span>
          </div>
        </div>

        {/* WebGL Canvas Container */}
        <div ref={mountRef} className="w-full h-full cursor-grab active:cursor-grabbing bg-black" />
      </div>

      {/* Candidate Sites Dossier Panel (30% on desktop) */}
      <div className="w-full lg:w-96 flex flex-col border border-white/10 bg-neutral-950 rounded-2xl p-5 font-mono overflow-y-auto space-y-4 shadow-2xl">
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <h2 className="text-xs font-bold uppercase tracking-wider text-white">
            Candidate Site Dossiers
          </h2>
          <span className="text-[10px] text-neutral-400 uppercase font-semibold">
            {sites.length} Official Targets
          </span>
        </div>

        {/* Site List Cards */}
        <div className="space-y-2 overflow-y-auto max-h-[340px] pr-1">
          {sites.map((site) => {
            const isSelected = selectedSite?.id === site.id;
            return (
              <div
                key={site.id}
                onClick={() => setSelectedSite(site)}
                className={`p-3.5 rounded-xl border text-xs cursor-pointer transition-all ${
                  isSelected
                    ? "bg-neutral-900 border-white text-white shadow-md"
                    : "bg-neutral-950 border-white/[0.08] text-neutral-400 hover:border-white/20 hover:text-white"
                }`}
              >
                <div className="flex items-center justify-between font-semibold mb-1">
                  <span className="text-white">{site.name}</span>
                  <span className="text-[10px] text-neutral-300 font-mono">
                    {site.latitude_deg.toFixed(2)}°S
                  </span>
                </div>
                <div className="text-[11px] text-neutral-400 truncate mb-1.5">
                  {site.features}
                </div>
                <div className="flex items-center justify-between text-[10px]">
                  <span className="text-neutral-500">Elev: {site.nominal_elevation_m.toLocaleString()} m</span>
                  <span className="text-white font-medium">Artemis Target</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Selected Site Detailed Inspector */}
        {selectedSite && (
          <div className="mt-auto pt-4 border-t border-white/10 space-y-3 bg-neutral-900/80 p-4 rounded-xl border border-white/10">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-white uppercase tracking-wider">
                {selectedSite.name}
              </span>
              <span className="text-[10px] bg-black border border-white/20 px-2 py-0.5 rounded-md text-white font-mono">
                +{selectedSite.nominal_elevation_m.toLocaleString()} m AMSL
              </span>
            </div>

            <div className="text-xs text-neutral-300 leading-relaxed">
              <span className="text-neutral-500 block text-[10px] uppercase font-semibold">Relevance:</span>
              {selectedSite.clps_artemis_relevance}
            </div>

            <div className="text-xs text-neutral-300 leading-relaxed">
              <span className="text-neutral-500 block text-[10px] uppercase font-semibold">Topographic Relief:</span>
              {selectedSite.features}
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2">
              <button
                onClick={() => onSelectSiteForTelemetry(selectedSite)}
                className="px-4 py-2.5 rounded-xl bg-white text-black font-semibold text-xs tracking-wider uppercase transition-all hover:bg-neutral-200 cursor-pointer text-center shadow-sm"
              >
                Telemetry
              </button>
              <button
                onClick={() => onSelectSiteForReplay(selectedSite)}
                className="px-4 py-2.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 border border-white/20 text-white font-semibold text-xs tracking-wider uppercase transition-all cursor-pointer text-center shadow-sm"
              >
                Replay
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
