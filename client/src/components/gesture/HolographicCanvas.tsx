// client/src/components/gesture/HolographicCanvas.tsx
// High-Performance Three.js 3D Holographic Hand Tracking & Floating Media Controls

import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { Landmark3D, GestureType } from '../../types/gesture';

interface HolographicCanvasProps {
  landmarks: Landmark3D[] | null;
  detectedGesture: GestureType | null;
  volumePercent?: number;
  isPlaying?: boolean;
  theme?: 'cyber-cyan' | 'neon-purple' | 'matrix-green';
  showSkeleton?: boolean;
  showFloatingControls?: boolean;
}

// MediaPipe 21 Hand Connections
const HAND_CONNECTIONS: [number, number][] = [
  // Thumb
  [0, 1], [1, 2], [2, 3], [3, 4],
  // Index
  [0, 5], [5, 6], [6, 7], [7, 8],
  // Middle
  [9, 10], [10, 11], [11, 12],
  // Ring
  [13, 14], [14, 15], [15, 16],
  // Pinky
  [0, 17], [17, 18], [18, 19], [19, 20],
  // Palm Base
  [5, 9], [9, 13], [13, 17],
];

export const HolographicCanvas: React.FC<HolographicCanvasProps> = ({
  landmarks,
  detectedGesture,
  volumePercent = 100,
  isPlaying = false,
  theme = 'cyber-cyan',
  showSkeleton = true,
  showFloatingControls = true,
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  // Hologram 3D Objects refs
  const jointMeshesRef = useRef<THREE.Mesh[]>([]);
  const boneLinesRef = useRef<THREE.Line[]>([]);
  const palmReticleRef = useRef<THREE.Group | null>(null);
  const particlesRef = useRef<THREE.Points | null>(null);
  const gridFloorRef = useRef<THREE.GridHelper | null>(null);

  // Floating Control Widgets Refs
  const playWidgetRef = useRef<THREE.Group | null>(null);
  const nextWidgetRef = useRef<THREE.Group | null>(null);
  const prevWidgetRef = useRef<THREE.Group | null>(null);
  const volumeRingRef = useRef<THREE.Group | null>(null);
  const likeBurstRef = useRef<THREE.Points | null>(null);

  // Stable props ref for requestAnimationFrame loop
  const propsRef = useRef({
    landmarks,
    detectedGesture,
    volumePercent,
    isPlaying,
    theme,
    showSkeleton,
    showFloatingControls,
  });
  propsRef.current = {
    landmarks,
    detectedGesture,
    volumePercent,
    isPlaying,
    theme,
    showSkeleton,
    showFloatingControls,
  };

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    // 1. Scene setup
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    const width = container.clientWidth || 800;
    const height = container.clientHeight || 500;

    const camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 1000);
    camera.position.set(0, 0, 5);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'high-performance' });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0); // Transparent canvas
    container.innerHTML = '';
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // 2. Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.9);
    scene.add(ambientLight);

    const pointLight = new THREE.PointLight(0x00f0ff, 2.5, 50);
    pointLight.position.set(0, 2, 4);
    scene.add(pointLight);

    // 3. Cyber Particles (Ambient Floating Starfield)
    const particleCount = 160;
    const particleGeo = new THREE.BufferGeometry();
    const particlePositions = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount * 3; i += 3) {
      particlePositions[i] = (Math.random() - 0.5) * 12;
      particlePositions[i + 1] = (Math.random() - 0.5) * 8;
      particlePositions[i + 2] = (Math.random() - 0.5) * 6;
    }
    particleGeo.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
    const particleMat = new THREE.PointsMaterial({
      color: 0x00f0ff,
      size: 0.045,
      transparent: true,
      opacity: 0.6,
      blending: THREE.AdditiveBlending,
    });
    const particles = new THREE.Points(particleGeo, particleMat);
    scene.add(particles);
    particlesRef.current = particles;

    // 4. Futuristic Cyber Grid Floor
    const grid = new THREE.GridHelper(14, 18, 0x00f0ff, 0x002244);
    grid.position.y = -2.8;
    grid.rotation.x = 0.2;
    (grid.material as THREE.Material).transparent = true;
    (grid.material as THREE.Material).opacity = 0.35;
    scene.add(grid);
    gridFloorRef.current = grid;

    // 5. 3D Hand Joints (21 spheres)
    const jointGeo = new THREE.SphereGeometry(0.048, 12, 12);
    const jointMat = new THREE.MeshBasicMaterial({
      color: 0x00f0ff,
      wireframe: true,
      transparent: true,
      opacity: 0.9,
    });
    const joints: THREE.Mesh[] = [];
    for (let i = 0; i < 21; i++) {
      const mesh = new THREE.Mesh(jointGeo, jointMat.clone());
      mesh.visible = false;
      scene.add(mesh);
      joints.push(mesh);
    }
    jointMeshesRef.current = joints;

    // 6. 3D Hand Bones (Lines connecting joints)
    const lines: THREE.Line[] = [];
    const lineMat = new THREE.LineBasicMaterial({
      color: 0x00d8ff,
      transparent: true,
      opacity: 0.75,
      linewidth: 2,
    });
    for (let i = 0; i < HAND_CONNECTIONS.length; i++) {
      const lineGeo = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(0, 0, 0),
      ]);
      const line = new THREE.Line(lineGeo, lineMat.clone());
      line.visible = false;
      scene.add(line);
      lines.push(line);
    }
    boneLinesRef.current = lines;

    // 7. Palm Targeting Reticle (Spinning Cyber Rings)
    const reticleGroup = new THREE.Group();
    const ring1Geo = new THREE.RingGeometry(0.18, 0.21, 24);
    const ring1Mat = new THREE.MeshBasicMaterial({
      color: 0x00ffff,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.8,
    });
    const ring1 = new THREE.Mesh(ring1Geo, ring1Mat);
    reticleGroup.add(ring1);

    const ring2Geo = new THREE.RingGeometry(0.24, 0.26, 6);
    const ring2Mat = new THREE.MeshBasicMaterial({
      color: 0x00ff9d,
      side: THREE.DoubleSide,
      wireframe: true,
      transparent: true,
      opacity: 0.7,
    });
    const ring2 = new THREE.Mesh(ring2Geo, ring2Mat);
    reticleGroup.add(ring2);

    reticleGroup.visible = false;
    scene.add(reticleGroup);
    palmReticleRef.current = reticleGroup;

    // 8. Floating 3D Media Control Widgets
    // Play/Pause Hologram Widget (Top-Left)
    const playGroup = new THREE.Group();
    playGroup.position.set(-3.2, 1.6, 0);
    const playCrystalGeo = new THREE.OctahedronGeometry(0.25, 0);
    const playCrystalMat = new THREE.MeshBasicMaterial({
      color: 0x00ff9d,
      wireframe: true,
      transparent: true,
      opacity: 0.8,
    });
    const playCrystal = new THREE.Mesh(playCrystalGeo, playCrystalMat);
    playGroup.add(playCrystal);
    scene.add(playGroup);
    playWidgetRef.current = playGroup;

    // Next Video Arrow Widget (Right Wing)
    const nextGroup = new THREE.Group();
    nextGroup.position.set(3.4, 0.4, 0);
    const arrowGeo = new THREE.ConeGeometry(0.18, 0.35, 4);
    const arrowMat = new THREE.MeshBasicMaterial({
      color: 0x00f0ff,
      wireframe: true,
      transparent: true,
      opacity: 0.8,
    });
    const nextMesh = new THREE.Mesh(arrowGeo, arrowMat);
    nextMesh.rotation.z = -Math.PI / 2;
    nextGroup.add(nextMesh);
    scene.add(nextGroup);
    nextWidgetRef.current = nextGroup;

    // Prev Video Arrow Widget (Left Wing)
    const prevGroup = new THREE.Group();
    prevGroup.position.set(-3.4, 0.4, 0);
    const prevMesh = new THREE.Mesh(arrowGeo, arrowMat.clone());
    prevMesh.rotation.z = Math.PI / 2;
    prevGroup.add(prevMesh);
    scene.add(prevGroup);
    prevWidgetRef.current = prevGroup;

    // Volume Hologram Arc/Torus (Right Side)
    const volGroup = new THREE.Group();
    volGroup.position.set(3.3, -1.2, 0);
    const volRingGeo = new THREE.TorusGeometry(0.3, 0.04, 8, 24, Math.PI * 1.5);
    const volRingMat = new THREE.MeshBasicMaterial({
      color: 0xffaa00,
      wireframe: true,
      transparent: true,
      opacity: 0.85,
    });
    const volRing = new THREE.Mesh(volRingGeo, volRingMat);
    volGroup.add(volRing);
    scene.add(volGroup);
    volumeRingRef.current = volGroup;

    // 9. Resize handler
    const handleResize = () => {
      if (!container || !rendererRef.current || !cameraRef.current) return;
      const w = container.clientWidth || 800;
      const h = container.clientHeight || 500;
      cameraRef.current.aspect = w / h;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    // 10. Animation Loop
    let clock = new THREE.Clock();

    const animate = () => {
      animationFrameRef.current = requestAnimationFrame(animate);
      const delta = clock.getDelta();
      const time = clock.getElapsedTime();

      const {
        landmarks: curLandmarks,
        detectedGesture: curGesture,
        volumePercent: curVol,
        isPlaying: curPlaying,
        showSkeleton: curShowSkel,
        showFloatingControls: curShowControls,
      } = propsRef.current;

      // Rotate cyber grid gently
      if (gridFloorRef.current) {
        gridFloorRef.current.position.z = (time * 0.4) % 1;
      }

      // Rotate ambient particles
      if (particlesRef.current) {
        particlesRef.current.rotation.y = time * 0.04;
      }

      // Animate Floating Widgets
      if (playWidgetRef.current) {
        playWidgetRef.current.visible = curShowControls;
        playWidgetRef.current.rotation.y = time * 1.2;
        playWidgetRef.current.rotation.x = time * 0.8;
        // Pulse if playing vs paused
        const playMesh = playWidgetRef.current.children[0] as THREE.Mesh;
        if (playMesh) {
          const mat = playMesh.material as THREE.MeshBasicMaterial;
          mat.color.setHex(curPlaying ? 0x00ff9d : 0xff3366);
          const scale = 1 + 0.15 * Math.sin(time * 3);
          playWidgetRef.current.scale.set(scale, scale, scale);
        }
      }

      if (nextWidgetRef.current) {
        nextWidgetRef.current.visible = curShowControls;
        const scale = curGesture === 'SWIPE_RIGHT' ? 1.6 : 1 + 0.1 * Math.sin(time * 2);
        nextWidgetRef.current.scale.set(scale, scale, scale);
      }

      if (prevWidgetRef.current) {
        prevWidgetRef.current.visible = curShowControls;
        const scale = curGesture === 'SWIPE_LEFT' ? 1.6 : 1 + 0.1 * Math.sin(time * 2);
        prevWidgetRef.current.scale.set(scale, scale, scale);
      }

      if (volumeRingRef.current) {
        volumeRingRef.current.visible = curShowControls;
        volumeRingRef.current.rotation.z = time * 0.6;
        const volScale = 0.8 + (curVol / 100) * 0.6;
        volumeRingRef.current.scale.set(volScale, volScale, volScale);
      }

      // Map 21 MediaPipe hand landmarks to 3D World Space
      if (curLandmarks && curLandmarks.length >= 21 && curShowSkel) {
        const positions: THREE.Vector3[] = [];

        // Aspect ratio factor to match screen
        const aspect = (cameraRef.current?.aspect || 1.6) * 2.8;

        for (let i = 0; i < 21; i++) {
          const lm = curLandmarks[i];
          // Mirror x for natural selfie view: (0.5 - x)
          const wx = (0.5 - lm.x) * aspect;
          // Invert y: (0.5 - y)
          const wy = (0.5 - lm.y) * 3.4;
          const wz = -(lm.z || 0) * 4;

          const vec = new THREE.Vector3(wx, wy, wz);
          positions.push(vec);

          // Update joint mesh position
          const jointMesh = jointMeshesRef.current[i];
          if (jointMesh) {
            jointMesh.position.copy(vec);
            jointMesh.visible = true;

            // Highlight fingertips when gestures are active
            const isTip = [4, 8, 12, 16, 20].includes(i);
            const mat = jointMesh.material as THREE.MeshBasicMaterial;
            if (curGesture === 'PINCH' && (i === 4 || i === 8)) {
              mat.color.setHex(0xffaa00);
              jointMesh.scale.set(1.5, 1.5, 1.5);
            } else if (curGesture === 'THUMBS_UP' && i === 4) {
              mat.color.setHex(0x00ff9d);
              jointMesh.scale.set(2, 2, 2);
            } else if (isTip) {
              mat.color.setHex(0x00ff9d);
              jointMesh.scale.set(1.2, 1.2, 1.2);
            } else {
              mat.color.setHex(0x00f0ff);
              jointMesh.scale.set(1, 1, 1);
            }
          }
        }

        // Update bone line segments
        for (let i = 0; i < HAND_CONNECTIONS.length; i++) {
          const [startIdx, endIdx] = HAND_CONNECTIONS[i];
          const line = boneLinesRef.current[i];
          if (line && positions[startIdx] && positions[endIdx]) {
            line.visible = true;
            const posAttr = line.geometry.attributes.position as THREE.BufferAttribute;
            posAttr.setXYZ(0, positions[startIdx].x, positions[startIdx].y, positions[startIdx].z);
            posAttr.setXYZ(1, positions[endIdx].x, positions[endIdx].y, positions[endIdx].z);
            posAttr.needsUpdate = true;
          }
        }

        // Update Palm Reticle (centered between Wrist 0, Index MCP 5, Pinky MCP 17)
        if (palmReticleRef.current && positions[0] && positions[5] && positions[17]) {
          const palmCenter = new THREE.Vector3()
            .add(positions[0])
            .add(positions[5])
            .add(positions[17])
            .divideScalar(3);

          palmReticleRef.current.position.copy(palmCenter);
          palmReticleRef.current.position.z += 0.05;
          palmReticleRef.current.visible = true;

          // Rotate reticle rings in opposite directions
          const ring1 = palmReticleRef.current.children[0];
          const ring2 = palmReticleRef.current.children[1];
          if (ring1) ring1.rotation.z = time * 2;
          if (ring2) ring2.rotation.z = -time * 1.5;
        }
      } else {
        // Hide joints and bones when no hand is detected
        jointMeshesRef.current.forEach((m) => (m.visible = false));
        boneLinesRef.current.forEach((l) => (l.visible = false));
        if (palmReticleRef.current) palmReticleRef.current.visible = false;
      }

      renderer.render(scene, camera);
    };

    animate();

    return () => {
      window.removeEventListener('resize', handleResize);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      renderer.dispose();
      if (container) {
        container.innerHTML = '';
      }
    };
  }, []);

  return (
    <div
      ref={mountRef}
      className="absolute inset-0 w-full h-full pointer-events-none z-20 overflow-hidden"
    />
  );
};
