import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader.js";

export type HeroModelKey = "SATELLITE" | "ISS" | "APOLLO_LM" | "CUBESAT";

interface ModelConfig {
  key: HeroModelKey;
  label: string;
  shortLabel: string;
  path: string;
  targetSize: number;
  initialCameraPos: [number, number, number];
  subhead: string;
  specs: string;
}

const MODEL_CONFIGS: Record<HeroModelKey, ModelConfig> = {
  SATELLITE: {
    key: "SATELLITE",
    label: "Deep Space Orbital Satellite",
    shortLabel: "Satellite",
    path: "/models/satellite.glb",
    targetSize: 4.2,
    initialCameraPos: [4.5, 2.5, 5.0],
    subhead: "High-Gain Ka/X-Band Communications Array",
    specs: "GaAs Solar Wings • High-Gain Dish • 3-Axis Stabilized",
  },
  ISS: {
    key: "ISS",
    label: "International Space Station",
    shortLabel: "ISS Station",
    path: "/models/iss.glb",
    targetSize: 4.8,
    initialCameraPos: [5.0, 3.2, 5.5],
    subhead: "Modular Orbital Laboratory & Truss Array",
    specs: "8 Photovoltaic Wings • 240kW Power • Habitation Modules",
  },
  APOLLO_LM: {
    key: "APOLLO_LM",
    label: "Apollo Lunar Module",
    shortLabel: "Apollo LM",
    path: "/models/apollo_lunar_module.glb",
    targetSize: 3.8,
    initialCameraPos: [4.0, 2.8, 4.5],
    subhead: "NASA Official Descent & Ascent Vehicle",
    specs: "Gold Mylar Foil • 4 Landing Pads • Reaction Control Thrusters",
  },
  CUBESAT: {
    key: "CUBESAT",
    label: "Deep Space 6U CubeSat",
    shortLabel: "CubeSat",
    path: "/models/cubesat.glb",
    targetSize: 3.5,
    initialCameraPos: [3.8, 2.2, 4.2],
    subhead: "Autonomous Autonomous Polar Scout",
    specs: "Deployable Solar Panels • Star Tracker • Cold Gas Propulsion",
  },
};

export const HeroSatelliteViewer3D: React.FC = () => {
  const mountRef = useRef<HTMLDivElement>(null);
  const [activeModel, setActiveModel] = useState<HeroModelKey>("SATELLITE");
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [autoRotate, setAutoRotate] = useState<boolean>(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // References
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const modelGroupRef = useRef<THREE.Group | null>(null);
  const currentModelRef = useRef<THREE.Object3D | null>(null);
  const autoRotateRef = useRef<boolean>(true);

  useEffect(() => {
    autoRotateRef.current = autoRotate;
    if (controlsRef.current) {
      controlsRef.current.autoRotate = autoRotate;
    }
  }, [autoRotate]);

  useEffect(() => {
    if (!mountRef.current) return;
    const container = mountRef.current;
    const width = container.clientWidth || 700;
    const height = container.clientHeight || 520;

    // 1. Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x02050e);
    sceneRef.current = scene;

    // 2. Camera
    const camera = new THREE.PerspectiveCamera(42, width / height, 0.1, 1000);
    const cfg = MODEL_CONFIGS[activeModel];
    camera.position.set(...cfg.initialCameraPos);
    cameraRef.current = camera;

    // 3. WebGL Renderer with High-Fidelity ACES Filmic Tone Mapping
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.35;
    container.innerHTML = "";
    container.appendChild(renderer.domElement);

    // 4. OrbitControls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.autoRotate = autoRotateRef.current;
    controls.autoRotateSpeed = 0.9;
    controls.minDistance = 1.8;
    controls.maxDistance = 25.0;
    controls.target.set(0, 0, 0);
    controlsRef.current = controls;

    // 5. Studio 3-Point Lighting for Crystal Clear Metal / Foil Visibility
    // 5a. Ambient Base Light - ensures no part of model falls into complete darkness
    const ambientLight = new THREE.AmbientLight(0x24324f, 1.4);
    scene.add(ambientLight);

    // 5b. Key Sunlight - bright directional highlight
    const sunLight = new THREE.DirectionalLight(0xffffff, 3.6);
    sunLight.position.set(12, 10, 8);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 2048;
    sunLight.shadow.mapSize.height = 2048;
    sunLight.shadow.bias = -0.0001;
    scene.add(sunLight);

    // 5c. Earthshine Fill Light - soft blue glow on the opposing side
    const earthshineLight = new THREE.DirectionalLight(0x38bdf8, 1.8);
    earthshineLight.position.set(-10, -6, -8);
    scene.add(earthshineLight);

    // 5d. Rim Backlight - defines the silhouette cleanly against pitch black
    const rimLight = new THREE.DirectionalLight(0x818cf8, 2.2);
    rimLight.position.set(0, 12, -12);
    scene.add(rimLight);

    // 5e. Soft Upward Ground Bounce
    const bounceLight = new THREE.DirectionalLight(0x94a3b8, 0.8);
    bounceLight.position.set(0, -10, 4);
    scene.add(bounceLight);

    // 6. Deep Space Background Particle Cloud (Stars)
    const starCount = 900;
    const starGeo = new THREE.BufferGeometry();
    const starPositions = new Float32Array(starCount * 3);
    const starColors = new Float32Array(starCount * 3);

    for (let i = 0; i < starCount; i++) {
      const radius = 60 + Math.random() * 80;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);

      starPositions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      starPositions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      starPositions[i * 3 + 2] = radius * Math.cos(phi);

      // Subtle celestial star colors (blue-white, gold, pale cyan)
      const colorType = Math.random();
      if (colorType > 0.8) {
        starColors[i * 3] = 0.98;
        starColors[i * 3 + 1] = 0.88;
        starColors[i * 3 + 2] = 0.65; // golden warm
      } else if (colorType > 0.4) {
        starColors[i * 3] = 0.65;
        starColors[i * 3 + 1] = 0.85;
        starColors[i * 3 + 2] = 1.0; // blue-white
      } else {
        starColors[i * 3] = 0.9;
        starColors[i * 3 + 1] = 0.95;
        starColors[i * 3 + 2] = 1.0; // bright white
      }
    }

    starGeo.setAttribute("position", new THREE.BufferAttribute(starPositions, 3));
    starGeo.setAttribute("color", new THREE.BufferAttribute(starColors, 3));

    const starMat = new THREE.PointsMaterial({
      size: 0.9,
      vertexColors: true,
      transparent: true,
      opacity: 0.85,
    });
    const starField = new THREE.Points(starGeo, starMat);
    scene.add(starField);

    // 7. Distant Earth Orbital Crescent in Background
    const earthGroup = new THREE.Group();
    earthGroup.position.set(-35, -18, -45);
    const earthSphereGeo = new THREE.SphereGeometry(14, 32, 32);
    const earthMat = new THREE.MeshStandardMaterial({
      color: 0x1d4ed8,
      roughness: 0.7,
      metalness: 0.1,
    });
    const earthMesh = new THREE.Mesh(earthSphereGeo, earthMat);
    earthGroup.add(earthMesh);

    // Earth atmosphere limb glow
    const atmosGeo = new THREE.SphereGeometry(14.4, 32, 32);
    const atmosMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.18,
      side: THREE.BackSide,
    });
    const atmosMesh = new THREE.Mesh(atmosGeo, atmosMat);
    earthGroup.add(atmosMesh);
    scene.add(earthGroup);

    // 8. Model Container Group
    const modelGroup = new THREE.Group();
    scene.add(modelGroup);
    modelGroupRef.current = modelGroup;

    // Load initial model
    loadModel(activeModel, modelGroup);

    // 9. Animation Loop
    let animId: number;
    let clock = new THREE.Clock();

    const animate = () => {
      animId = requestAnimationFrame(animate);
      const elapsedTime = clock.getElapsedTime();

      controls.update();

      // Gentle floating micro-oscillation for zero-g effect
      if (currentModelRef.current) {
        currentModelRef.current.position.y = Math.sin(elapsedTime * 0.9) * 0.08;
        currentModelRef.current.rotation.z = Math.sin(elapsedTime * 0.4) * 0.02;
      }

      // Slow background stars rotation
      starField.rotation.y = elapsedTime * 0.005;

      renderer.render(scene, camera);
    };
    animate();

    // 10. Resize
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
      window.removeEventListener("resize", handleResize);
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      renderer.dispose();
      starGeo.dispose();
      starMat.dispose();
    };
  }, []);

  // When activeModel changes, reload the model inside modelGroup
  useEffect(() => {
    if (modelGroupRef.current) {
      loadModel(activeModel, modelGroupRef.current);
    }
  }, [activeModel]);

  const loadModel = (modelKey: HeroModelKey, parentGroup: THREE.Group) => {
    setIsLoading(true);
    setLoadError(null);

    // Clear existing children
    while (parentGroup.children.length > 0) {
      parentGroup.remove(parentGroup.children[0]);
    }
    currentModelRef.current = null;

    const config = MODEL_CONFIGS[modelKey];

    // Configure GLTF & DRACO Loaders
    const gltfLoader = new GLTFLoader();
    const dracoLoader = new DRACOLoader();
    dracoLoader.setDecoderPath("/draco/");
    gltfLoader.setDRACOLoader(dracoLoader);

    gltfLoader.load(
      config.path,
      (gltf) => {
        const root = gltf.scene;

        // Compute Bounding Box to automatically scale and center the model
        const box = new THREE.Box3().setFromObject(root);
        const size = box.getSize(new THREE.Vector3());
        const center = box.getCenter(new THREE.Vector3());

        const maxDim = Math.max(size.x, size.y, size.z);
        const scale = maxDim > 0 ? config.targetSize / maxDim : 1.0;

        root.scale.setScalar(scale);

        // Center model at origin
        root.position.x = -center.x * scale;
        root.position.y = -center.y * scale;
        root.position.z = -center.z * scale;

        // Materials enhancement for vibrant aerospace illumination
        root.traverse((child) => {
          if ((child as THREE.Mesh).isMesh) {
            const mesh = child as THREE.Mesh;
            mesh.castShadow = true;
            mesh.receiveShadow = true;

            if (mesh.material) {
              const mat = mesh.material as THREE.MeshStandardMaterial;
              mat.roughness = Math.max(0.15, mat.roughness ?? 0.35);
              mat.metalness = Math.min(0.9, mat.metalness ?? 0.6);
              mat.envMapIntensity = 1.4;
              mat.needsUpdate = true;
            }
          }
        });

        const wrapper = new THREE.Group();
        wrapper.add(root);
        parentGroup.add(wrapper);
        currentModelRef.current = wrapper;

        // Reset camera comfortably
        if (cameraRef.current && controlsRef.current) {
          cameraRef.current.position.set(...config.initialCameraPos);
          controlsRef.current.target.set(0, 0, 0);
          controlsRef.current.update();
        }

        setIsLoading(false);
      },
      undefined,
      (err) => {
        console.warn(`Failed to load ${config.path}:`, err);
        setLoadError(`Failed to load 3D model asset: ${config.label}`);
        setIsLoading(false);
      }
    );
  };

  const handleResetCamera = () => {
    const config = MODEL_CONFIGS[activeModel];
    if (cameraRef.current && controlsRef.current) {
      cameraRef.current.position.set(...config.initialCameraPos);
      controlsRef.current.target.set(0, 0, 0);
      controlsRef.current.update();
    }
  };

  const activeCfg = MODEL_CONFIGS[activeModel];

  return (
    <div className="relative w-full h-full min-h-[480px] lg:min-h-[580px] bg-[#02050e] rounded-2xl overflow-hidden border border-white/10 shadow-[0_20px_60px_rgba(0,0,0,0.8)] flex flex-col select-none group">
      {/* 3D WebGL Canvas */}
      <div ref={mountRef} className="w-full h-full flex-1 cursor-grab active:cursor-grabbing" />

      {/* Top Floating Glass Bar: Model Telemetry Dossier */}
      <div className="absolute top-4 left-4 z-10 pointer-events-none max-w-sm">
        <div className="bg-black/75 backdrop-blur-md px-3.5 py-2 rounded-xl border border-white/10 shadow-lg space-y-1">
          <div className="flex items-center space-x-2">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
            <span className="text-[10px] tracking-widest text-cyan-300 uppercase font-semibold">
              Live 3D Telemetry Studio
            </span>
          </div>
          <div className="text-sm font-bold text-white tracking-wide">
            {activeCfg.label}
          </div>
          <div className="text-[11px] text-slate-400 leading-tight">
            {activeCfg.specs}
          </div>
        </div>
      </div>

      {/* Top Right Floating Toolbar: Model Switcher */}
      <div className="absolute top-4 right-4 z-10 flex flex-col space-y-2 items-end">
        <div className="flex items-center space-x-1 bg-black/80 backdrop-blur-md p-1 rounded-xl border border-white/10 shadow-xl">
          {(Object.keys(MODEL_CONFIGS) as HeroModelKey[]).map((key) => {
            const cfg = MODEL_CONFIGS[key];
            const isActive = activeModel === key;
            return (
              <button
                key={key}
                onClick={() => setActiveModel(key)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold tracking-wide transition-all cursor-pointer ${
                  isActive
                    ? "bg-white text-black font-bold shadow-md"
                    : "text-slate-400 hover:text-white hover:bg-white/5"
                }`}
              >
                {cfg.shortLabel}
              </button>
            );
          })}
        </div>
      </div>

      {/* Bottom Floating Bar: Interactive Controls & Interaction Hint */}
      <div className="absolute bottom-4 left-4 right-4 z-10 flex items-center justify-between pointer-events-none">
        <div className="bg-black/70 backdrop-blur-md px-3 py-1.5 rounded-lg border border-white/10 text-[11px] text-slate-300 flex items-center space-x-2">
          <span className="text-cyan-400 font-bold">•</span>
          <span>Interactive 3D • Drag to orbit • Scroll to zoom</span>
        </div>

        <div className="pointer-events-auto flex items-center space-x-2">
          <button
            onClick={() => setAutoRotate(!autoRotate)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold backdrop-blur-md border transition-all cursor-pointer ${
              autoRotate
                ? "bg-cyan-500/15 border-cyan-400/40 text-cyan-300"
                : "bg-black/70 border-white/10 text-slate-400 hover:text-white"
            }`}
            title="Toggle Continuous Orbital Rotation"
          >
            {autoRotate ? "Auto-Rotate ON" : "Auto-Rotate PAUSED"}
          </button>

          <button
            onClick={handleResetCamera}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-black/70 backdrop-blur-md border border-white/10 text-slate-300 hover:text-white hover:bg-white/10 transition-all cursor-pointer"
            title="Reset Camera Vantage Point"
          >
            Reset View
          </button>
        </div>
      </div>

      {/* Loading Overlay */}
      {isLoading && (
        <div className="absolute inset-0 z-20 bg-black/70 backdrop-blur-sm flex flex-col items-center justify-center space-y-3">
          <div className="w-8 h-8 rounded-full border-2 border-cyan-400 border-t-transparent animate-spin" />
          <div className="text-xs font-semibold text-slate-300 tracking-wider">
            Loading {activeCfg.label}...
          </div>
        </div>
      )}

      {/* Load Error Fallback Banner */}
      {loadError && (
        <div className="absolute top-16 left-4 right-4 z-20 bg-rose-950/90 border border-rose-500/40 text-rose-200 px-4 py-2.5 rounded-xl text-xs flex items-center justify-between">
          <span>{loadError}</span>
          <button
            onClick={() => loadModel(activeModel, modelGroupRef.current!)}
            className="underline font-semibold ml-2 text-rose-300 hover:text-white cursor-pointer"
          >
            Retry
          </button>
        </div>
      )}
    </div>
  );
};
