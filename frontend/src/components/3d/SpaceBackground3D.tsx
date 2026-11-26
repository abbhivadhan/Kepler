import React, { useEffect, useRef } from "react";
import * as THREE from "three";

export const SpaceBackground3D: React.FC = () => {
  const mountRef = useRef<HTMLDivElement>(null);

  // References
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const moonGroupRef = useRef<THREE.Group | null>(null);
  const starsRef = useRef<THREE.Points | null>(null);

  useEffect(() => {
    if (!mountRef.current) return;
    const container = mountRef.current;
    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;

    // 1. Scene: Pure Pitch Black Deep Space (#000000)
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000000);
    sceneRef.current = scene;

    // 2. Camera
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.set(0, 0, 7.5);
    camera.lookAt(0, 0, 0);
    cameraRef.current = camera;

    // 3. Renderer with ACES Filmic Tone Mapping (Natural, High-Clarity Exposure)
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false,
      powerPreference: "high-performance",
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.08; // Crisp, balanced exposure showcasing micro-crater topography
    rendererRef.current = renderer;
    container.innerHTML = "";
    container.appendChild(renderer.domElement);

    // 4. Photorealistic Lunar Lighting: Natural Solar Grazing Vector
    // 4a. Key Sunlight: Striking from upper-left/front, creating a soft, razor-sharp terminator
    const sunLight = new THREE.DirectionalLight(0xfff9ef, 2.5);
    sunLight.position.set(-9, 3, 5);
    scene.add(sunLight);

    // 4b. Subtle Rim Light: Soft edge definition on the dark lunar limb
    const rimLight = new THREE.DirectionalLight(0xffffff, 0.45);
    rimLight.position.set(6, 4, -4);
    scene.add(rimLight);

    // 4c. Earthshine: Very faint cool starlight on the night side so details aren't completely lost
    const earthshine = new THREE.DirectionalLight(0x1e293b, 0.20);
    earthshine.position.set(5, -4, 3);
    scene.add(earthshine);

    // 4d. Ambient: Soft baseline to lift harsh shadow clipping and eliminate blotchy black spots
    const ambientLight = new THREE.AmbientLight(0x0e131c, 0.12);
    scene.add(ambientLight);

    // 5. Deep Space Starfield: 3,500 Tiny, Sharp Stars
    const starCount = 3500;
    const starGeo = new THREE.BufferGeometry();
    const starPositions = new Float32Array(starCount * 3);
    const starColors = new Float32Array(starCount * 3);

    for (let i = 0; i < starCount; i++) {
      const radius = 70 + Math.random() * 190;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);

      starPositions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      starPositions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      starPositions[i * 3 + 2] = radius * Math.cos(phi);

      const roll = Math.random();
      if (roll > 0.8) {
        starColors[i * 3] = 0.8;
        starColors[i * 3 + 1] = 0.9;
        starColors[i * 3 + 2] = 1.0; // cool blue-white
      } else if (roll > 0.6) {
        starColors[i * 3] = 1.0;
        starColors[i * 3 + 1] = 0.95;
        starColors[i * 3 + 2] = 0.85; // warm white
      } else {
        const b = 0.35 + Math.random() * 0.45;
        starColors[i * 3] = b;
        starColors[i * 3 + 1] = b;
        starColors[i * 3 + 2] = b; // faint distant
      }
    }

    starGeo.setAttribute("position", new THREE.BufferAttribute(starPositions, 3));
    starGeo.setAttribute("color", new THREE.BufferAttribute(starColors, 3));

    const starMat = new THREE.PointsMaterial({
      size: 0.9,
      vertexColors: true,
      transparent: true,
      opacity: 0.9,
    });
    const starField = new THREE.Points(starGeo, starMat);
    scene.add(starField);
    starsRef.current = starField;

    // 6. High-Fidelity 3D Moon: Official NASA LROC 4K Map + High-Resolution Bump
    const moonGroup = new THREE.Group();
    // Positioned gracefully on the right side: radius is 4.6, center at (4.2, -0.3, 0.4)
    moonGroup.position.set(4.2, -0.3, 0.4);
    scene.add(moonGroup);
    moonGroupRef.current = moonGroup;

    const textureLoader = new THREE.TextureLoader();
    const maxAnisotropy = renderer.capabilities.getMaxAnisotropy();

    const moonMap = textureLoader.load("/textures/lroc_color_4k.jpg");
    moonMap.colorSpace = THREE.SRGBColorSpace;
    moonMap.anisotropy = maxAnisotropy;
    moonMap.generateMipmaps = true;
    moonMap.minFilter = THREE.LinearMipmapLinearFilter;
    moonMap.magFilter = THREE.LinearFilter;

    const moonBump = textureLoader.load("/textures/lroc_bump_4k.jpg");
    moonBump.anisotropy = maxAnisotropy;
    moonBump.generateMipmaps = true;
    moonBump.minFilter = THREE.LinearMipmapLinearFilter;

    // Ultra-smooth 160x160 spherical mesh for high geometric fidelity
    const moonRadius = 4.6;
    const moonGeo = new THREE.SphereGeometry(moonRadius, 160, 160);

    const moonMat = new THREE.MeshStandardMaterial({
      map: moonMap,
      bumpMap: moonBump,
      bumpScale: 0.042, // Crisp, tangible crater rim depth and micro-crater topography
      color: 0xffffff, // Calibrated warm rusty lunar albedo embedded in 4K map
      roughness: 0.92, // Authentic diffuse scattering across lunar surface
      metalness: 0.0,
    });

    const moonMesh = new THREE.Mesh(moonGeo, moonMat);
    moonMesh.rotation.x = 0.0;
    moonMesh.rotation.z = 0.12;
    moonMesh.rotation.y = 3.40; // Exact match to user reference: deep rich mare color & dramatic Copernicus crater field
    moonGroup.add(moonMesh);

    // 7. Animation Loop
    let animId: number;
    const clock = new THREE.Clock();

    const animate = () => {
      animId = requestAnimationFrame(animate);
      const elapsed = clock.getElapsedTime();

      // Majestic lunar axial rotation
      moonMesh.rotation.y = 3.40 + elapsed * 0.012;

      // Gentle background stars cosmic drift
      if (starsRef.current) {
        starsRef.current.rotation.y = elapsed * 0.0004;
      }

      renderer.render(scene, camera);
    };
    animate();

    // 8. Resize
    const handleResize = () => {
      if (!mountRef.current) return;
      const w = window.innerWidth;
      const h = window.innerHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);

      if (moonGroupRef.current) {
        moonGroupRef.current.position.x = w < 768 ? 3.0 : 4.2;
      }
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
      moonGeo.dispose();
      moonMat.dispose();
      moonMap.dispose();
      moonBump.dispose();
    };
  }, []);

  return (
    <div className="fixed inset-0 z-0 overflow-hidden bg-black select-none pointer-events-none">
      {/* Three.js Full-Bleed Canvas */}
      <div ref={mountRef} className="w-full h-full" />
    </div>
  );
};
