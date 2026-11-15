import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader.js";
import { CelestialTargetTelemetry, SkylineProfileData } from "../../types";

export type SpacecraftType = "APOLLO_LM" | "SATELLITE" | "ARTEMIS_HLS";
export type CameraVantage = "ORBIT" | "SURFACE_MAST" | "COCKPIT";

interface SpacecraftViewer3DProps {
  sunTelemetry?: CelestialTargetTelemetry;
  earthTelemetry?: CelestialTargetTelemetry;
  skyline?: SkylineProfileData;
  siteName?: string;
  isNight?: boolean;
}

export const SpacecraftViewer3D: React.FC<SpacecraftViewer3DProps> = ({
  sunTelemetry,
  earthTelemetry,
  skyline,
  siteName,
  isNight = false,
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const [spacecraftType, setSpacecraftType] = useState<SpacecraftType>("APOLLO_LM");
  const [cameraVantage, setCameraVantage] = useState<CameraVantage>("ORBIT");
  const [modelLoading, setModelLoading] = useState<boolean>(true);

  // References to dynamic 3D objects
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const sunLightRef = useRef<THREE.DirectionalLight | null>(null);
  const sunMeshRef = useRef<THREE.Mesh | null>(null);
  const earthGroupRef = useRef<THREE.Group | null>(null);
  const spacecraftGroupRef = useRef<THREE.Group | null>(null);
  const antennaMeshRef = useRef<THREE.Object3D | null>(null);

  // Azimuth/Elevation to Cartesian Vector on a celestial sphere of given radius
  const calcCelestialVector = (
    azimuthDeg: number,
    elevationDeg: number,
    radius: number
  ): THREE.Vector3 => {
    const azRad = (azimuthDeg * Math.PI) / 180;
    const elRad = (elevationDeg * Math.PI) / 180;
    // North is +Z, East is +X, Up is +Y
    const x = radius * Math.cos(elRad) * Math.sin(azRad);
    const y = radius * Math.sin(elRad);
    const z = radius * Math.cos(elRad) * Math.cos(azRad);
    return new THREE.Vector3(x, y, z);
  };

  useEffect(() => {
    if (!mountRef.current) return;
    const container = mountRef.current;
    const width = container.clientWidth || 600;
    const height = container.clientHeight || 450;

    // 1. Scene Setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x02050e);
    scene.fog = new THREE.FogExp2(0x02050e, 0.003);
    sceneRef.current = scene;

    // 2. Camera Setup
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.set(6, 4, 8);
    cameraRef.current = camera;

    // 3. WebGL Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    container.innerHTML = "";
    container.appendChild(renderer.domElement);

    // 4. OrbitControls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.maxPolarAngle = Math.PI / 2 - 0.01; // Don't clip below lunar surface
    controls.minDistance = 2.0;
    controls.maxDistance = 60.0;
    controls.target.set(0, 1.8, 0);
    controlsRef.current = controls;

    // 5. Ambient & Starlight - boosted for crisp 3D model visibility
    const ambientLight = new THREE.AmbientLight(0x22304d, 1.3);
    scene.add(ambientLight);

    // Directional Earthshine (cyan/blue fill)
    const earthshineLight = new THREE.DirectionalLight(0x38bdf8, 1.4);
    earthshineLight.position.set(-10, 8, -5);
    scene.add(earthshineLight);

    // Rim Backlight for silhouette definition against pitch black space
    const rimLight = new THREE.DirectionalLight(0x818cf8, 1.8);
    rimLight.position.set(0, 15, -15);
    scene.add(rimLight);

    // 6. Direct Solar Light (with dynamic shadow casting)
    const sunLight = new THREE.DirectionalLight(0xfff8e7, 3.6);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 2048;
    sunLight.shadow.mapSize.height = 2048;
    sunLight.shadow.camera.near = 0.5;
    sunLight.shadow.camera.far = 150;
    sunLight.shadow.camera.left = -12;
    sunLight.shadow.camera.right = 12;
    sunLight.shadow.camera.top = 12;
    sunLight.shadow.camera.bottom = -12;
    sunLight.shadow.bias = -0.0005;
    scene.add(sunLight);
    sunLightRef.current = sunLight;

    // 7. Sun Visual Disk
    const sunGeo = new THREE.SphereGeometry(1.5, 32, 32);
    const sunMat = new THREE.MeshBasicMaterial({ color: 0xfffaed });
    const sunMesh = new THREE.Mesh(sunGeo, sunMat);
    scene.add(sunMesh);
    sunMeshRef.current = sunMesh;

    // 8. Earth 3D Visual Mesh with Atmospheric Rayleigh Halo
    const earthGroup = new THREE.Group();
    const earthGeo = new THREE.SphereGeometry(1.2, 32, 32);

    // Procedural Earth texture
    const earthCanvas = document.createElement("canvas");
    earthCanvas.width = 512;
    earthCanvas.height = 256;
    const eCtx = earthCanvas.getContext("2d");
    if (eCtx) {
      eCtx.fillStyle = "#1e3a8a"; // deep ocean blue
      eCtx.fillRect(0, 0, 512, 256);
      eCtx.fillStyle = "#15803d"; // continents
      for (let i = 0; i < 30; i++) {
        eCtx.beginPath();
        eCtx.arc(Math.random() * 512, Math.random() * 256, Math.random() * 40 + 10, 0, Math.PI * 2);
        eCtx.fill();
      }
      eCtx.fillStyle = "rgba(255, 255, 255, 0.65)"; // clouds
      for (let i = 0; i < 50; i++) {
        eCtx.beginPath();
        eCtx.arc(Math.random() * 512, Math.random() * 256, Math.random() * 30 + 5, 0, Math.PI * 2);
        eCtx.fill();
      }
    }
    const earthTex = new THREE.CanvasTexture(earthCanvas);
    const earthMat = new THREE.MeshStandardMaterial({
      map: earthTex,
      roughness: 0.6,
      metalness: 0.1,
    });
    const earthSphere = new THREE.Mesh(earthGeo, earthMat);
    earthGroup.add(earthSphere);

    // Atmosphere Glow Ring
    const haloGeo = new THREE.SphereGeometry(1.32, 32, 32);
    const haloMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.25,
      side: THREE.BackSide,
    });
    earthGroup.add(new THREE.Mesh(haloGeo, haloMat));
    scene.add(earthGroup);
    earthGroupRef.current = earthGroup;

    // 9. Deep Space 3D Starfield
    const starCount = 3000;
    const starGeo = new THREE.BufferGeometry();
    const starPositions = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount * 3; i += 3) {
      const r = 250;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(Math.random() * 2 - 1);
      starPositions[i] = r * Math.sin(phi) * Math.cos(theta);
      starPositions[i + 1] = Math.abs(r * Math.cos(phi)) + 5; // hemisphere above horizon
      starPositions[i + 2] = r * Math.sin(phi) * Math.sin(theta);
    }
    starGeo.setAttribute("position", new THREE.BufferAttribute(starPositions, 3));
    const starMat = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 1.2,
      sizeAttenuation: false,
    });
    scene.add(new THREE.Points(starGeo, starMat));

    // 10. Lunar Surface Ground & Topography (Terrain Mesh)
    const groundGeo = new THREE.PlaneGeometry(80, 80, 64, 64);
    groundGeo.rotateX(-Math.PI / 2);
    // Add subtle procedural lunar crater displacement
    const pos = groundGeo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const vx = pos.getX(i);
      const vz = pos.getZ(i);
      const dist = Math.sqrt(vx * vx + vz * vz);
      // Gentle slope towards crater rim in distance
      let dY = Math.sin(vx * 0.1) * Math.cos(vz * 0.1) * 0.35;
      if (dist > 25) {
        dY += (dist - 25) * 0.12; // surrounding ridge
      }
      pos.setY(i, dY);
    }
    groundGeo.computeVertexNormals();

    const groundCanvas = document.createElement("canvas");
    groundCanvas.width = 512;
    groundCanvas.height = 512;
    const gCtx = groundCanvas.getContext("2d");
    if (gCtx) {
      gCtx.fillStyle = "#334155";
      gCtx.fillRect(0, 0, 512, 512);
      for (let i = 0; i < 400; i++) {
        const x = Math.random() * 512;
        const y = Math.random() * 512;
        const r = Math.random() * 6 + 1;
        gCtx.beginPath();
        gCtx.arc(x, y, r, 0, Math.PI * 2);
        gCtx.fillStyle = "rgba(15, 23, 42, 0.45)";
        gCtx.fill();
      }
    }
    const groundTex = new THREE.CanvasTexture(groundCanvas);
    groundTex.wrapS = THREE.RepeatWrapping;
    groundTex.wrapT = THREE.RepeatWrapping;
    groundTex.repeat.set(8, 8);

    const groundMat = new THREE.MeshStandardMaterial({
      map: groundTex,
      roughness: 0.95,
      metalness: 0.05,
      color: 0x64748b,
    });
    const groundMesh = new THREE.Mesh(groundGeo, groundMat);
    groundMesh.receiveShadow = true;
    groundMesh.position.y = -0.1;
    scene.add(groundMesh);

    // 11. Distant 360° LOLA Terrain Skyline Ribbon in 3D
    if (skyline && skyline.skyline_profile.length > 0) {
      const skylineRadius = 75;
      const skylineGeo = new THREE.BufferGeometry();
      const vertices: number[] = [];
      const numPts = skyline.skyline_profile.length;

      for (let i = 0; i < numPts; i++) {
        const pt = skyline.skyline_profile[i];
        const nextPt = skyline.skyline_profile[(i + 1) % numPts];

        const v1Base = calcCelestialVector(pt.azimuth_deg, -0.5, skylineRadius);
        const v1Top = calcCelestialVector(pt.azimuth_deg, Math.max(0.2, pt.elevation_deg), skylineRadius);
        const v2Base = calcCelestialVector(nextPt.azimuth_deg, -0.5, skylineRadius);
        const v2Top = calcCelestialVector(nextPt.azimuth_deg, Math.max(0.2, nextPt.elevation_deg), skylineRadius);

        // Quad 1: v1Base -> v1Top -> v2Top
        vertices.push(v1Base.x, v1Base.y, v1Base.z);
        vertices.push(v1Top.x, v1Top.y, v1Top.z);
        vertices.push(v2Top.x, v2Top.y, v2Top.z);

        // Quad 2: v1Base -> v2Top -> v2Base
        vertices.push(v1Base.x, v1Base.y, v1Base.z);
        vertices.push(v2Top.x, v2Top.y, v2Top.z);
        vertices.push(v2Base.x, v2Base.y, v2Base.z);
      }

      skylineGeo.setAttribute("position", new THREE.Float32BufferAttribute(vertices, 3));
      skylineGeo.computeVertexNormals();
      const skylineMat = new THREE.MeshBasicMaterial({
        color: 0x0f172a,
        side: THREE.DoubleSide,
      });
      const skylineMesh = new THREE.Mesh(skylineGeo, skylineMat);
      scene.add(skylineMesh);

      // Neon ridge outline on crest
      const crestLineGeo = new THREE.BufferGeometry();
      const crestVerts: number[] = [];
      skyline.skyline_profile.forEach((pt) => {
        const top = calcCelestialVector(pt.azimuth_deg, Math.max(0.2, pt.elevation_deg), skylineRadius);
        crestVerts.push(top.x, top.y, top.z);
      });
      crestLineGeo.setAttribute("position", new THREE.Float32BufferAttribute(crestVerts, 3));
      const crestMat = new THREE.LineBasicMaterial({ color: 0x06b6d4, linewidth: 1.5 });
      const crestLine = new THREE.LineLoop(crestLineGeo, crestMat);
      scene.add(crestLine);
    }

    // 12. Spacecraft Container Group
    const scGroup = new THREE.Group();
    scene.add(scGroup);
    spacecraftGroupRef.current = scGroup;

    // Load Spacecraft Model
    loadSpacecraftModel(spacecraftType, scGroup);

    // 13. Animation Loop
    let animId: number;
    const animate = () => {
      animId = requestAnimationFrame(animate);
      controls.update();

      // Earth slow diurnal rotation
      if (earthSphere) {
        earthSphere.rotation.y += 0.0015;
      }

      renderer.render(scene, camera);
    };
    animate();

    // Resize Handler
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
    };
  }, [skyline]);

  // Spacecraft Model Loader function
  const loadSpacecraftModel = (type: SpacecraftType, parent: THREE.Group) => {
    // Clear existing children
    while (parent.children.length > 0) {
      parent.remove(parent.children[0]);
    }
    setModelLoading(true);

    const dracoLoader = new DRACOLoader();
    dracoLoader.setDecoderPath("/draco/");
    const loader = new GLTFLoader();
    loader.setDRACOLoader(dracoLoader);

    if (type === "APOLLO_LM") {
      loader.load(
        "/models/apollo_lunar_module.glb",
        (gltf) => {
          const model = gltf.scene;
          model.scale.set(0.75, 0.75, 0.75);
          model.position.set(0, 0, 0);

          model.traverse((child) => {
            if ((child as THREE.Mesh).isMesh) {
              const mesh = child as THREE.Mesh;
              mesh.castShadow = true;
              mesh.receiveShadow = true;

              // Enhance material metallic response for lunar sun
              if (mesh.material) {
                const mat = mesh.material as THREE.MeshStandardMaterial;
                mat.roughness = Math.max(0.15, mat.roughness ?? 0.35);
                mat.metalness = Math.min(0.9, mat.metalness ?? 0.6);
                mat.envMapIntensity = 1.3;
              }
            }
          });

          parent.add(model);
          setModelLoading(false);
        },
        undefined,
        (err) => {
          console.warn("Could not load GLB model, building procedural high-detail lander:", err);
          buildProceduralLander(parent);
          setModelLoading(false);
        }
      );
    } else if (type === "SATELLITE") {
      loader.load(
        "/models/satellite.glb",
        (gltf) => {
          const model = gltf.scene;
          const box = new THREE.Box3().setFromObject(model);
          const size = box.getSize(new THREE.Vector3());
          const center = box.getCenter(new THREE.Vector3());
          const maxDim = Math.max(size.x, size.y, size.z);
          const scale = maxDim > 0 ? 3.6 / maxDim : 1.0;

          model.scale.setScalar(scale);
          model.position.x = -center.x * scale;
          model.position.y = -center.y * scale + 1.8;
          model.position.z = -center.z * scale;

          model.traverse((child) => {
            if ((child as THREE.Mesh).isMesh) {
              const mesh = child as THREE.Mesh;
              mesh.castShadow = true;
              mesh.receiveShadow = true;
              if (mesh.material) {
                const mat = mesh.material as THREE.MeshStandardMaterial;
                mat.roughness = Math.max(0.15, mat.roughness ?? 0.35);
                mat.metalness = Math.min(0.9, mat.metalness ?? 0.6);
                mat.envMapIntensity = 1.3;
              }
            }
          });

          parent.add(model);
          setModelLoading(false);
        },
        undefined,
        () => {
          buildProceduralLander(parent);
          setModelLoading(false);
        }
      );
    } else {
      buildArtemisHLS(parent);
      setModelLoading(false);
    }
  };

  // Build Museum-Grade Photorealistic Artemis Human Landing System (Starship HLS)
  const buildArtemisHLS = (parent: THREE.Group) => {
    const hls = new THREE.Group();

    // 1. High-Fidelity Aerospace PBR Materials
    const stainlessSteelMat = new THREE.MeshStandardMaterial({
      color: 0xf1f5f9,
      metalness: 0.94,
      roughness: 0.15,
    });

    const polishedSteelMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      metalness: 0.96,
      roughness: 0.10,
    });

    const weldRingMat = new THREE.MeshStandardMaterial({
      color: 0x94a3b8,
      metalness: 0.90,
      roughness: 0.35,
    });

    const heatShieldMat = new THREE.MeshStandardMaterial({
      color: 0x141418,
      metalness: 0.12,
      roughness: 0.88,
    });

    const cabinWindowMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      roughness: 0.1,
      metalness: 0.9,
      emissive: 0xffedd5,
      emissiveIntensity: 0.5,
    });

    const solarWrapMat = new THREE.MeshStandardMaterial({
      color: 0x0a0f1d,
      metalness: 0.88,
      roughness: 0.12,
      emissive: 0x1e293b,
      emissiveIntensity: 0.15,
    });

    const goldFoilMat = new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      metalness: 0.95,
      roughness: 0.22,
    });

    const darkAlloyMat = new THREE.MeshStandardMaterial({
      color: 0x334155,
      metalness: 0.90,
      roughness: 0.28,
    });

    const raptorNozzleMat = new THREE.MeshStandardMaterial({
      color: 0x475569,
      metalness: 0.92,
      roughness: 0.22,
    });

    const spotlightMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
    });

    // 2. Towering Cylindrical Starship Fuselage
    // 2a. Aft Skirt (housing Raptor vacuum engine cluster)
    const skirtGeo = new THREE.CylinderGeometry(1.62, 1.70, 2.2, 48);
    const skirtMesh = new THREE.Mesh(skirtGeo, stainlessSteelMat);
    skirtMesh.position.y = 1.5;
    skirtMesh.castShadow = true;
    skirtMesh.receiveShadow = true;
    hls.add(skirtMesh);

    // 2b. Main Propellant Tank Barrel (Liquid Oxygen & Liquid Methane)
    const tankGeo = new THREE.CylinderGeometry(1.58, 1.62, 3.6, 48);
    const tankMesh = new THREE.Mesh(tankGeo, stainlessSteelMat);
    tankMesh.position.y = 4.4;
    tankMesh.castShadow = true;
    tankMesh.receiveShadow = true;
    hls.add(tankMesh);

    // 2c. Weld Ring Stringers (Circumferential structural rings)
    [0.4, 1.8, 2.6, 3.8, 5.0, 6.2].forEach((ringY) => {
      const ringGeo = new THREE.TorusGeometry(1.62, 0.02, 12, 48);
      const ringMesh = new THREE.Mesh(ringGeo, weldRingMat);
      ringMesh.rotation.x = Math.PI / 2;
      ringMesh.position.y = ringY;
      hls.add(ringMesh);
    });

    // 2d. Windward Thermal Protection System (TPS) Black Ceramic Heat Shield (180° Wrap)
    const heatShieldBarrelGeo = new THREE.CylinderGeometry(
      1.63,
      1.71,
      5.8,
      32,
      1,
      false,
      -Math.PI / 2,
      Math.PI
    );
    const heatShieldBarrelMesh = new THREE.Mesh(heatShieldBarrelGeo, heatShieldMat);
    heatShieldBarrelMesh.position.set(0, 3.7, 0.01);
    heatShieldBarrelMesh.castShadow = true;
    hls.add(heatShieldBarrelMesh);

    // 3. Multi-Deck Pressurized Crew Habitat & Observation Stargazer Deck
    const habGeo = new THREE.CylinderGeometry(1.48, 1.58, 1.8, 48);
    const habMesh = new THREE.Mesh(habGeo, polishedSteelMat);
    habMesh.position.y = 7.1;
    habMesh.castShadow = true;
    hls.add(habMesh);

    // 3a. Panoramic Upper Cupola Windows (Radial viewing ports on leeward side)
    const numWindows = 7;
    for (let i = 0; i < numWindows; i++) {
      const winAngle = (i - (numWindows - 1) / 2) * 0.22 + Math.PI / 2;
      const winGeo = new THREE.BoxGeometry(0.35, 0.45, 0.12);
      const winMesh = new THREE.Mesh(winGeo, cabinWindowMat);
      winMesh.position.set(Math.cos(winAngle) * 1.52, 7.35, Math.sin(winAngle) * 1.52);
      winMesh.rotation.y = -winAngle + Math.PI / 2;
      hls.add(winMesh);
    }

    // 3b. Lower Flight Deck Observation Strip
    const lowerWinGeo = new THREE.BoxGeometry(1.2, 0.28, 0.15);
    const lowerWinMesh = new THREE.Mesh(lowerWinGeo, cabinWindowMat);
    lowerWinMesh.position.set(0, 6.7, 1.54);
    hls.add(lowerWinMesh);

    // 3c. Crew Egress Airlock Door Frame
    const airlockFrameGeo = new THREE.BoxGeometry(0.7, 1.1, 0.1);
    const airlockFrame = new THREE.Mesh(airlockFrameGeo, darkAlloyMat);
    airlockFrame.position.set(0, 5.7, 1.6);
    hls.add(airlockFrame);

    const airlockHatchGeo = new THREE.BoxGeometry(0.55, 0.95, 0.12);
    const airlockHatch = new THREE.Mesh(airlockHatchGeo, polishedSteelMat);
    airlockHatch.position.set(0, 5.7, 1.62);
    hls.add(airlockHatch);

    // 4. Smooth Aerodynamic Ogive Nosecone & Forward Docking Port
    const noseLowerGeo = new THREE.CylinderGeometry(0.95, 1.48, 1.2, 48);
    const noseLower = new THREE.Mesh(noseLowerGeo, stainlessSteelMat);
    noseLower.position.y = 8.6;
    noseLower.castShadow = true;
    hls.add(noseLower);

    const noseUpperGeo = new THREE.ConeGeometry(0.95, 1.6, 48);
    const noseUpper = new THREE.Mesh(noseUpperGeo, stainlessSteelMat);
    noseUpper.position.y = 10.0;
    noseUpper.castShadow = true;
    hls.add(noseUpper);

    // Nosecone Heat Shield Half
    const noseShieldGeo = new THREE.ConeGeometry(0.96, 1.6, 32, 1, false, -Math.PI / 2, Math.PI);
    const noseShield = new THREE.Mesh(noseShieldGeo, heatShieldMat);
    noseShield.position.set(0, 10.0, 0.01);
    hls.add(noseShield);

    // Apex NASA Docking System (NDS) Ring & Target
    const dockingRingGeo = new THREE.CylinderGeometry(0.32, 0.38, 0.25, 24);
    const dockingRing = new THREE.Mesh(dockingRingGeo, darkAlloyMat);
    dockingRing.position.y = 10.9;
    hls.add(dockingRing);

    const dockingCrossGeo = new THREE.BoxGeometry(0.45, 0.04, 0.45);
    const dockingCross = new THREE.Mesh(dockingCrossGeo, polishedSteelMat);
    dockingCross.position.y = 11.03;
    hls.add(dockingCross);

    // 5. Polar Photovoltaic Array Collar (360° Wrapped High-Efficiency Solar Ring)
    const solarRingGeo = new THREE.CylinderGeometry(1.63, 1.63, 1.4, 48);
    const solarRing = new THREE.Mesh(solarRingGeo, solarWrapMat);
    solarRing.position.y = 3.6;
    hls.add(solarRing);

    // Solar array division busbars
    for (let i = 0; i < 12; i++) {
      const busAngle = (i * Math.PI * 2) / 12;
      const busGeo = new THREE.BoxGeometry(0.04, 1.42, 0.06);
      const busMesh = new THREE.Mesh(busGeo, weldRingMat);
      busMesh.position.set(Math.cos(busAngle) * 1.64, 3.6, Math.sin(busAngle) * 1.64);
      busMesh.rotation.y = -busAngle;
      hls.add(busMesh);
    }

    // 6. Crew Lunar Surface Elevator System
    // Dual guide-rail truss running from airlock (Y=5.7) down to footpad surface (Y=0.4)
    const railGeo = new THREE.CylinderGeometry(0.02, 0.02, 5.4, 8);
    const leftRail = new THREE.Mesh(railGeo, darkAlloyMat);
    leftRail.position.set(-0.25, 3.0, 1.68);
    hls.add(leftRail);

    const rightRail = new THREE.Mesh(railGeo, darkAlloyMat);
    rightRail.position.set(0.25, 3.0, 1.68);
    hls.add(rightRail);

    // Elevator Hoist Basket Platform
    const basketGeo = new THREE.BoxGeometry(0.65, 0.55, 0.45);
    const basketMesh = new THREE.Mesh(basketGeo, darkAlloyMat);
    basketMesh.position.set(0, 1.8, 1.76);
    hls.add(basketMesh);

    const basketRailGeo = new THREE.BoxGeometry(0.68, 0.04, 0.48);
    const basketRail = new THREE.Mesh(basketRailGeo, polishedSteelMat);
    basketRail.position.set(0, 2.1, 1.76);
    hls.add(basketRail);

    // 7. Heavy Hexagonal Lunar Landing Gear System (6 Articulated Deployable Legs)
    for (let i = 0; i < 6; i++) {
      const legAngle = (i * Math.PI * 2) / 6;
      const legGroup = new THREE.Group();

      // Main Telescopic Hydraulic Oleo Strut (Heavy titanium-alloy cylinder)
      const mainStrutGeo = new THREE.CylinderGeometry(0.11, 0.09, 3.2, 16);
      const mainStrut = new THREE.Mesh(mainStrutGeo, darkAlloyMat);
      mainStrut.position.set(Math.cos(legAngle) * 2.3, 1.1, Math.sin(legAngle) * 2.3);
      mainStrut.rotation.z = Math.cos(legAngle) * -0.42;
      mainStrut.rotation.x = Math.sin(legAngle) * 0.42;
      mainStrut.castShadow = true;
      legGroup.add(mainStrut);

      // Upper Mechanical Scissor Cross-Brace
      const braceGeo = new THREE.CylinderGeometry(0.05, 0.05, 2.0, 12);
      const brace = new THREE.Mesh(braceGeo, weldRingMat);
      brace.position.set(Math.cos(legAngle) * 1.9, 1.5, Math.sin(legAngle) * 1.9);
      brace.rotation.z = Math.cos(legAngle) * -0.65;
      brace.rotation.x = Math.sin(legAngle) * 0.65;
      brace.castShadow = true;
      legGroup.add(brace);

      // Large Radial Footpad (Gold thermal foil covered wide-stance disc)
      const footpadGroup = new THREE.Group();
      footpadGroup.position.set(Math.cos(legAngle) * 3.1, 0.05, Math.sin(legAngle) * 3.1);

      const footpadGeo = new THREE.CylinderGeometry(0.52, 0.58, 0.12, 24);
      const footpad = new THREE.Mesh(footpadGeo, goldFoilMat);
      footpad.castShadow = true;
      footpad.receiveShadow = true;
      footpadGroup.add(footpad);

      // Footpad Ball Joint Socket
      const socketGeo = new THREE.SphereGeometry(0.12, 12, 12);
      const socket = new THREE.Mesh(socketGeo, darkAlloyMat);
      socket.position.y = 0.1;
      footpadGroup.add(socket);

      legGroup.add(footpadGroup);
      hls.add(legGroup);
    }

    // 8. Aft Raptor Vacuum Propulsion Cluster (6-Engine Layout)
    // Thrust Puck Plate
    const puckGeo = new THREE.CylinderGeometry(1.5, 1.5, 0.2, 32);
    const puck = new THREE.Mesh(puckGeo, darkAlloyMat);
    puck.position.y = 0.55;
    hls.add(puck);

    // 3 Outer Massive Raptor Vacuum Engines with regenerative cooling bells
    for (let i = 0; i < 3; i++) {
      const engAngle = (i * Math.PI * 2) / 3;
      const engX = Math.cos(engAngle) * 0.85;
      const engZ = Math.sin(engAngle) * 0.85;

      const nozzleGeo = new THREE.CylinderGeometry(0.18, 0.52, 1.1, 24, 1, true);
      const nozzle = new THREE.Mesh(nozzleGeo, raptorNozzleMat);
      nozzle.position.set(engX, 0.05, engZ);
      nozzle.castShadow = true;
      hls.add(nozzle);

      // Nozzle Stiffener Ring
      const stiffRingGeo = new THREE.TorusGeometry(0.52, 0.025, 8, 24);
      const stiffRing = new THREE.Mesh(stiffRingGeo, weldRingMat);
      stiffRing.rotation.x = Math.PI / 2;
      stiffRing.position.set(engX, -0.48, engZ);
      hls.add(stiffRing);
    }

    // 3 Center Sea-Level Raptor Engines
    for (let i = 0; i < 3; i++) {
      const engAngle = (i * Math.PI * 2) / 3 + Math.PI / 3;
      const engX = Math.cos(engAngle) * 0.35;
      const engZ = Math.sin(engAngle) * 0.35;

      const slNozzleGeo = new THREE.CylinderGeometry(0.12, 0.28, 0.75, 20, 1, true);
      const slNozzle = new THREE.Mesh(slNozzleGeo, darkAlloyMat);
      slNozzle.position.set(engX, 0.2, engZ);
      hls.add(slNozzle);
    }

    // 9. Forward Attitude Control System (Cold-Gas / Methalox RCS Thruster Quads)
    [Math.PI / 4, (3 * Math.PI) / 4, (5 * Math.PI) / 4, (7 * Math.PI) / 4].forEach((rcsAngle) => {
      const rcsGroup = new THREE.Group();
      rcsGroup.position.set(Math.cos(rcsAngle) * 1.05, 9.2, Math.sin(rcsAngle) * 1.05);

      const rcsHousingGeo = new THREE.BoxGeometry(0.2, 0.2, 0.2);
      const rcsHousing = new THREE.Mesh(rcsHousingGeo, goldFoilMat);
      rcsGroup.add(rcsHousing);

      // Tiny thruster nozzles
      [-0.06, 0.06].forEach((nx) => {
        const nozGeo = new THREE.ConeGeometry(0.04, 0.1, 8);
        const noz = new THREE.Mesh(nozGeo, darkAlloyMat);
        noz.rotation.z = nx > 0 ? Math.PI / 2 : -Math.PI / 2;
        noz.position.set(nx * 1.8, 0, 0);
        rcsGroup.add(noz);
      });

      hls.add(rcsGroup);
    });

    // 10. Steerable High-Gain Deep-Space Communications Antenna (Ka-Band Dish)
    const antennaBoomGeo = new THREE.CylinderGeometry(0.04, 0.04, 1.2, 8);
    const antennaBoom = new THREE.Mesh(antennaBoomGeo, darkAlloyMat);
    antennaBoom.position.set(0, 8.2, -1.65);
    antennaBoom.rotation.x = -Math.PI / 4;
    hls.add(antennaBoom);

    const dishGeo = new THREE.SphereGeometry(0.72, 24, 16, 0, Math.PI * 2, 0, Math.PI / 2.2);
    const dishMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      metalness: 0.88,
      roughness: 0.18,
      side: THREE.DoubleSide,
    });
    const dish = new THREE.Mesh(dishGeo, dishMat);
    dish.position.set(0, 8.8, -2.1);
    dish.rotation.x = Math.PI / 3;
    dish.castShadow = true;
    hls.add(dish);
    antennaMeshRef.current = dish;

    // 11. Exterior Surface Work Floodlights (Downward-facing high-CRI LEDs)
    [Math.PI / 3, (2 * Math.PI) / 3, (4 * Math.PI) / 3, (5 * Math.PI) / 3].forEach((lightAngle) => {
      const spotGroup = new THREE.Group();
      spotGroup.position.set(Math.cos(lightAngle) * 1.62, 5.0, Math.sin(lightAngle) * 1.62);

      const spotHousingGeo = new THREE.CylinderGeometry(0.08, 0.1, 0.15, 12);
      const spotHousing = new THREE.Mesh(spotHousingGeo, darkAlloyMat);
      spotHousing.rotation.x = Math.PI / 2;
      spotGroup.add(spotHousing);

      const lensGeo = new THREE.CircleGeometry(0.08, 12);
      const lens = new THREE.Mesh(lensGeo, spotlightMat);
      lens.position.z = 0.08;
      spotGroup.add(lens);

      hls.add(spotGroup);
    });

    // Scale Artemis HLS to authentic towering proportion relative to lunar surface
    hls.scale.setScalar(0.55);

    parent.add(hls);
  };

  // Build Procedural Apollo-Style Lunar Lander as fallback
  const buildProceduralLander = (parent: THREE.Group) => {
    const lander = new THREE.Group();

    // Octagonal Descent Stage with gold foil
    const descentGeo = new THREE.CylinderGeometry(1.6, 1.8, 1.2, 8);
    const goldMat = new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      metalness: 0.95,
      roughness: 0.25,
      bumpScale: 0.05,
    });
    const descentMesh = new THREE.Mesh(descentGeo, goldMat);
    descentMesh.position.y = 1.0;
    descentMesh.castShadow = true;
    descentMesh.receiveShadow = true;
    lander.add(descentMesh);

    // Ascent Stage Cabin
    const ascentGeo = new THREE.BoxGeometry(1.8, 1.4, 1.8);
    const silverMat = new THREE.MeshStandardMaterial({
      color: 0xd1d5db,
      metalness: 0.85,
      roughness: 0.3,
    });
    const ascentMesh = new THREE.Mesh(ascentGeo, silverMat);
    ascentMesh.position.y = 2.2;
    ascentMesh.castShadow = true;
    lander.add(ascentMesh);

    // 4 Landing Gear Legs
    for (let i = 0; i < 4; i++) {
      const angle = (i * Math.PI) / 2;
      const strutGeo = new THREE.CylinderGeometry(0.08, 0.08, 2.2);
      const strutMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.9 });
      const strut = new THREE.Mesh(strutGeo, strutMat);
      strut.position.set(Math.cos(angle) * 1.5, 0.7, Math.sin(angle) * 1.5);
      strut.rotation.z = Math.cos(angle) * -0.5;
      strut.rotation.x = Math.sin(angle) * 0.5;
      strut.castShadow = true;
      lander.add(strut);

      const footpadGeo = new THREE.CylinderGeometry(0.35, 0.4, 0.08, 16);
      const pad = new THREE.Mesh(footpadGeo, goldMat);
      pad.position.set(Math.cos(angle) * 2.2, 0.04, Math.sin(angle) * 2.2);
      pad.castShadow = true;
      lander.add(pad);
    }

    // Parabolic High Gain Antenna
    const dishGeo = new THREE.SphereGeometry(0.5, 16, 16, 0, Math.PI * 2, 0, Math.PI / 2);
    const dishMat = new THREE.MeshStandardMaterial({ color: 0xf1f5f9, metalness: 0.7, side: THREE.DoubleSide });
    const dish = new THREE.Mesh(dishGeo, dishMat);
    dish.position.set(0.6, 3.1, -0.6);
    dish.rotation.x = Math.PI / 4;
    lander.add(dish);
    antennaMeshRef.current = dish;

    parent.add(lander);
  };

  // Switch Spacecraft Type
  useEffect(() => {
    if (spacecraftGroupRef.current) {
      loadSpacecraftModel(spacecraftType, spacecraftGroupRef.current);
    }
  }, [spacecraftType]);

  // Update Sun & Earth Positions Dynamically
  useEffect(() => {
    if (!sunTelemetry) return;

    // 1. Position Sun & Directional Light
    const sunDist = 90;
    const sunPos = calcCelestialVector(sunTelemetry.azimuth_deg, sunTelemetry.elevation_deg, sunDist);

    if (sunMeshRef.current) {
      sunMeshRef.current.position.copy(sunPos);
    }
    if (sunLightRef.current) {
      sunLightRef.current.position.copy(sunPos);
      // If sun is below skyline or below horizon, dim the light
      const isSunBlocked = (sunTelemetry.clearance_deg ?? 0) < 0 || sunTelemetry.elevation_deg < -0.2;
      sunLightRef.current.intensity = isSunBlocked ? 0.05 : 3.4;
    }

    // 2. Position Earth
    if (earthTelemetry && earthGroupRef.current) {
      const earthDist = 80;
      const earthPos = calcCelestialVector(earthTelemetry.azimuth_deg, earthTelemetry.elevation_deg, earthDist);
      earthGroupRef.current.position.copy(earthPos);

      // Aim antenna towards Earth
      if (antennaMeshRef.current) {
        antennaMeshRef.current.lookAt(earthPos);
      }
    }
  }, [sunTelemetry, earthTelemetry]);

  // Update Camera Vantage Point
  useEffect(() => {
    if (!cameraRef.current || !controlsRef.current) return;
    const cam = cameraRef.current;
    const ctrl = controlsRef.current;

    if (cameraVantage === "ORBIT") {
      if (spacecraftType === "ARTEMIS_HLS") {
        cam.position.set(7.5, 4.5, 9.5);
        ctrl.target.set(0, 2.6, 0);
      } else {
        cam.position.set(6, 4, 8);
        ctrl.target.set(0, 1.8, 0);
      }
      ctrl.minDistance = 2.0;
      ctrl.maxDistance = 60.0;
    } else if (cameraVantage === "SURFACE_MAST") {
      // Observer mast perspective (2m above ground looking towards Sun/Earth)
      cam.position.set(0, 2.0, 0.5);
      if (sunTelemetry) {
        const lookTarget = calcCelestialVector(sunTelemetry.azimuth_deg, sunTelemetry.elevation_deg, 20);
        ctrl.target.copy(lookTarget);
      } else {
        ctrl.target.set(0, 2.0, 20);
      }
      ctrl.minDistance = 0.5;
      ctrl.maxDistance = 100.0;
    } else if (cameraVantage === "COCKPIT") {
      // Cockpit window vantage looking forward
      if (spacecraftType === "ARTEMIS_HLS") {
        cam.position.set(0, 3.8, 1.0);
        ctrl.target.set(0, 3.8, 25);
      } else {
        cam.position.set(0, 2.6, 0.7);
        ctrl.target.set(0, 2.6, 25);
      }
      ctrl.minDistance = 0.2;
      ctrl.maxDistance = 50.0;
    }
  }, [cameraVantage, sunTelemetry, spacecraftType]);

  const handleResetCamera = () => {
    if (cameraRef.current && controlsRef.current) {
      if (spacecraftType === "ARTEMIS_HLS") {
        cameraRef.current.position.set(7.5, 4.5, 9.5);
        controlsRef.current.target.set(0, 2.6, 0);
      } else {
        cameraRef.current.position.set(6, 4, 8);
        controlsRef.current.target.set(0, 1.8, 0);
      }
      setCameraVantage("ORBIT");
    }
  };

  return (
    <div className="relative w-full h-full min-h-[460px] bg-black rounded-2xl overflow-hidden border border-white/10 shadow-2xl flex flex-col font-sans select-none">
      {/* 3D WebGL Canvas Mount */}
      <div ref={mountRef} className="w-full h-full cursor-grab active:cursor-grabbing flex-1" />

      {/* Top Floating HUD: Site & Ephemeris Vectors */}
      <div className="absolute top-3 left-3 z-10 pointer-events-none flex flex-col space-y-1.5">
        <div className="flex items-center space-x-2 bg-black/80 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/10 text-xs shadow-lg">
          <span className="font-bold text-white uppercase tracking-wider">
            {siteName || "Lunar South Pole"}
          </span>
          <span className="text-[10px] text-white border border-white/20 px-2 py-0.5 rounded-full bg-neutral-900 font-mono font-medium">
            3D Studio
          </span>
        </div>

        {sunTelemetry && (
          <div className="flex items-center space-x-2 bg-black/80 backdrop-blur-md px-2.5 py-1 rounded-lg border border-white/10 text-[11px] font-mono">
            <span className="text-white font-bold">Sun</span>
            <span className="text-neutral-300">
              Az {sunTelemetry.azimuth_deg.toFixed(1)}° / El {sunTelemetry.elevation_deg.toFixed(2)}°
            </span>
            <span
              className={`text-[9px] px-2 py-0.5 rounded-full font-bold uppercase ${
                (sunTelemetry.clearance_deg ?? 0) >= 0
                  ? "bg-white text-black font-semibold border border-white"
                  : "bg-neutral-800 text-neutral-400 border border-white/10"
              }`}
            >
              {(sunTelemetry.clearance_deg ?? 0) >= 0 ? "Sunlit" : "Shadow"}
            </span>
          </div>
        )}

        {earthTelemetry && (
          <div className="flex items-center space-x-2 bg-black/80 backdrop-blur-md px-2.5 py-1 rounded-lg border border-white/10 text-[11px] font-mono">
            <span className="text-neutral-300 font-bold">Earth</span>
            <span className="text-neutral-300">
              Az {earthTelemetry.azimuth_deg.toFixed(1)}° / El {earthTelemetry.elevation_deg.toFixed(2)}°
            </span>
            <span
              className={`text-[9px] px-2 py-0.5 rounded-full font-bold uppercase ${
                (earthTelemetry.clearance_deg ?? 0) >= 0
                  ? "bg-white text-black font-semibold border border-white"
                  : "bg-neutral-800 text-neutral-400 border border-white/10"
              }`}
            >
              {(earthTelemetry.clearance_deg ?? 0) >= 0 ? "DTE Link" : "Occluded"}
            </span>
          </div>
        )}
      </div>

      {/* Top Right Floating Toolbar: Spacecraft & Camera Controls */}
      <div className="absolute top-3 right-3 z-10 flex flex-col space-y-2">
        {/* Spacecraft Switcher */}
        <div className="flex items-center space-x-1 bg-black/80 backdrop-blur-md p-1 rounded-xl border border-white/10 text-xs shadow-xl font-sans">
          <button
            onClick={() => setSpacecraftType("SATELLITE")}
            className={`px-2.5 py-1 rounded-lg transition text-xs font-semibold cursor-pointer ${
              spacecraftType === "SATELLITE"
                ? "bg-white text-black font-bold shadow-sm"
                : "text-neutral-400 hover:text-white"
            }`}
            title="Deep Space Orbital Communications Satellite"
          >
            Satellite
          </button>
          <button
            onClick={() => setSpacecraftType("APOLLO_LM")}
            className={`px-2.5 py-1 rounded-lg transition text-xs font-semibold cursor-pointer ${
              spacecraftType === "APOLLO_LM"
                ? "bg-white text-black font-bold shadow-sm"
                : "text-neutral-400 hover:text-white"
            }`}
            title="NASA Official Apollo Lunar Module"
          >
            Apollo LM
          </button>
          <button
            onClick={() => setSpacecraftType("ARTEMIS_HLS")}
            className={`px-2.5 py-1 rounded-lg transition text-xs font-semibold cursor-pointer ${
              spacecraftType === "ARTEMIS_HLS"
                ? "bg-white text-black font-bold shadow-sm"
                : "text-neutral-400 hover:text-white"
            }`}
            title="Next-Gen Artemis Human Landing System"
          >
            Artemis HLS
          </button>
        </div>

        {/* Camera Vantage Switcher */}
        <div className="flex items-center space-x-1 bg-black/80 backdrop-blur-md p-1 rounded-xl border border-white/10 text-xs shadow-xl">
          <button
            onClick={() => setCameraVantage("ORBIT")}
            className={`px-2.5 py-1 rounded-lg transition text-[11px] font-medium cursor-pointer ${
              cameraVantage === "ORBIT" ? "bg-white text-black font-semibold shadow-sm" : "text-neutral-400 hover:text-white"
            }`}
            title="Free Orbit Camera"
          >
            Orbit
          </button>
          <button
            onClick={() => setCameraVantage("SURFACE_MAST")}
            className={`px-2.5 py-1 rounded-lg transition text-[11px] font-medium cursor-pointer ${
              cameraVantage === "SURFACE_MAST" ? "bg-white text-black font-semibold shadow-sm" : "text-neutral-400 hover:text-white"
            }`}
            title="Lander Mast First-Person View (2m height)"
          >
            Mast
          </button>
          <button
            onClick={() => setCameraVantage("COCKPIT")}
            className={`px-2.5 py-1 rounded-lg transition text-[11px] font-medium cursor-pointer ${
              cameraVantage === "COCKPIT" ? "bg-white text-black font-semibold shadow-sm" : "text-neutral-400 hover:text-white"
            }`}
            title="Flight Deck Cockpit HUD"
          >
            Cockpit
          </button>
          <button
            onClick={handleResetCamera}
            className="px-2.5 py-1 rounded-lg text-neutral-400 hover:text-white hover:bg-white/10 transition text-[11px] cursor-pointer"
            title="Reset Camera Position"
          >
            Reset
          </button>
        </div>
      </div>

      {/* Bottom Center Indicator: Lunar Lighting Condition */}
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-10 flex items-center space-x-3 bg-black/80 backdrop-blur-md px-4 py-1.5 rounded-full border border-white/10 text-[11px] text-neutral-300">
        <div className="flex items-center space-x-1.5">
          <span
            className={`w-2.5 h-2.5 rounded-full ${
              !isNight
                ? "bg-white"
                : "bg-neutral-600"
            }`}
          />
          <span>{isNight ? "Cryogenic Shadow State" : "Direct Sunlight Generating"}</span>
        </div>
        <span className="text-neutral-600">|</span>
        <span className="text-neutral-400 text-[10px]">
          Dynamic 3D PBR Shadows &bull; NASA LOLA 240m Ridge Horizon
        </span>
      </div>

      {/* Loading overlay */}
      {modelLoading && (
        <div className="absolute inset-0 z-20 bg-black/70 backdrop-blur-sm flex items-center justify-center text-xs text-white font-mono">
          <div className="flex items-center space-x-2">
            <span>Loading Spacecraft 3D Mesh...</span>
          </div>
        </div>
      )}
    </div>
  );
};

