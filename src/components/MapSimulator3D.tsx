/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import {
  EmergencyVehicle,
  IntersectionSignal,
  RoadSegment,
} from '../types/traffic';
import { CivilianCar, GRID_COLS, GRID_ROWS, parseIntersectionId } from '../utils/simulation';
import {
  Camera,
  Layers,
  Flame,
  Activity,
  Shield,
  Zap,
  Radio,
  Eye,
  Sliders,
  Sun,
  Moon,
  Info,
} from 'lucide-react';

interface MapSimulator3DProps {
  intersections: Map<string, IntersectionSignal>;
  roadSegments: Map<string, RoadSegment>;
  vehicles: EmergencyVehicle[];
  civilianCars: CivilianCar[];
  selectedVehicleId: string | null;
  onSelectVehicle: (id: string | null) => void;
  selectedIntersectionId: string | null;
  onSelectIntersection: (id: string | null) => void;
  showCongestionOverlay: boolean;
  onToggleCongestion: () => void;
  isSignalFlowActive: boolean;
  activeConflictIntersectionIds: string[];
}

export const MapSimulator3D: React.FC<MapSimulator3DProps> = ({
  intersections,
  roadSegments,
  vehicles,
  civilianCars,
  selectedVehicleId,
  onSelectVehicle,
  selectedIntersectionId,
  onSelectIntersection,
  showCongestionOverlay,
  onToggleCongestion,
  isSignalFlowActive,
  activeConflictIntersectionIds,
}) => {
  const mountRef = useRef<HTMLDivElement>(null);

  // High-visibility state
  const [cameraMode, setCameraMode] = useState<'isometric' | 'topDown' | 'follow' | 'conflict'>('isometric');
  const [heatmapMode, setHeatmapMode] = useState<'thermal' | 'preemption' | 'technical'>('thermal');
  const [showTechnicalLabels, setShowTechnicalLabels] = useState<boolean>(true);
  const [isNightMode, setIsNightMode] = useState<boolean>(true);

  // References for live 3D updates
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);

  // Dynamic 3D Object Registries
  const vehicleMeshesRef = useRef<Map<string, THREE.Group>>(new Map());
  const roadMeshesRef = useRef<Map<string, THREE.Mesh>>(new Map());
  const signalMeshesRef = useRef<Map<string, { pylon: THREE.Mesh; nsHead: THREE.Mesh; ewHead: THREE.Mesh; halo?: THREE.Mesh }>>(new Map());
  const greenWaveMeshRef = useRef<THREE.Group | null>(null);

  // Dimensions
  const BLOCK_SIZE = 40;
  const ROAD_WIDTH = 18; // Extra-wide road for high visibility & thermal gradients
  const GRID_SPACING = BLOCK_SIZE + ROAD_WIDTH; // 58 units
  const TOTAL_GRID_WIDTH = (GRID_COLS - 1) * GRID_SPACING;
  const TOTAL_GRID_DEPTH = (GRID_ROWS - 1) * GRID_SPACING;
  const HALF_W = TOTAL_GRID_WIDTH / 2;
  const HALF_D = TOTAL_GRID_DEPTH / 2;

  const gridToWorld = (gx: number, gy: number) => {
    return {
      x: gx * GRID_SPACING - HALF_W,
      z: gy * GRID_SPACING - HALF_D,
    };
  };

  const idToWorld = (id: string) => {
    const { x, y } = parseIntersectionId(id);
    return gridToWorld(x, y);
  };

  // Thermal Color Scale: Green (low load) -> Amber (moderate) -> Blazing Crimson / Violet (gridlock)
  const getThermalColor = (congestion: number): { hex: number; colorStr: string } => {
    if (congestion >= 0.65) {
      return { hex: 0xff0055, colorStr: '#ff0055' }; // Severe Thermal Crimson
    } else if (congestion >= 0.45) {
      return { hex: 0xff4d00, colorStr: '#ff4d00' }; // High Orange Thermal
    } else if (congestion >= 0.25) {
      return { hex: 0xffb700, colorStr: '#ffb700' }; // Moderate Amber Thermal
    } else {
      return { hex: 0x00e676, colorStr: '#00e676' }; // Low Green Flow
    }
  };

  // Helper: Large High-Visibility Emergency Vehicle (Scaled ~2.2x standard for crisp recognition)
  const createVehicleMesh = (veh: EmergencyVehicle): THREE.Group => {
    const group = new THREE.Group();

    // 1. Primary Chassis: High-Visibility Gloss Coating
    const bodyColor = veh.agency === 'EMS' ? 0x06b6d4 : veh.agency === 'FIRE' ? 0xff1744 : 0x2563eb;
    const bodyMat = new THREE.MeshStandardMaterial({
      color: bodyColor,
      roughness: 0.15,
      metalness: 0.5,
      emissive: bodyColor,
      emissiveIntensity: 0.25,
    });
    // Scaled for high visibility from high camera angles
    const body = new THREE.Mesh(new THREE.BoxGeometry(6.8, 2.8, 3.4), bodyMat);
    body.position.y = 1.8;
    body.castShadow = true;
    group.add(body);

    // 2. Cab & Windshield (High Contrast Black Gloss)
    const cabMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      roughness: 0.1,
      metalness: 0.9,
    });
    const cab = new THREE.Mesh(new THREE.BoxGeometry(3.6, 1.8, 3.1), cabMat);
    cab.position.set(0.9, 3.2, 0);
    cab.castShadow = true;
    group.add(cab);

    // 3. Heavy Duty Wheels (4 tires with bright silver rims)
    const wheelMat = new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.7 });
    const rimMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.9 });
    const wheelGeom = new THREE.CylinderGeometry(0.9, 0.9, 0.7, 16);
    wheelGeom.rotateX(Math.PI / 2);

    const wheelOffsets = [
      [-2.1, 0.9, 1.7],
      [-2.1, 0.9, -1.7],
      [2.1, 0.9, 1.7],
      [2.1, 0.9, -1.7],
    ];

    wheelOffsets.forEach(([wx, wy, wz]) => {
      const wheel = new THREE.Mesh(wheelGeom, wheelMat);
      wheel.position.set(wx, wy, wz);
      group.add(wheel);

      const rim = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.45, 0.72, 12), rimMat);
      rim.rotation.x = Math.PI / 2;
      rim.position.set(wx, wy, wz);
      group.add(rim);
    });

    // 4. Ultra-Bright Flashing Emergency Lightbar on Roof
    const strobeColor = veh.agency === 'EMS' ? 0x00f5ff : veh.agency === 'FIRE' ? 0xff0033 : 0x0066ff;
    const lightbarMat = new THREE.MeshStandardMaterial({
      color: strobeColor,
      emissive: strobeColor,
      emissiveIntensity: 2.8,
      roughness: 0.1,
    });
    const lightbar = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.6, 2.6), lightbarMat);
    lightbar.position.set(0.6, 4.3, 0);
    group.add(lightbar);

    // 5. Blazing High-Beam Headlights
    const headlightMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const hlLeft = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.45, 0.7), headlightMat);
    hlLeft.position.set(3.45, 1.8, 1.1);
    const hlRight = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.45, 0.7), headlightMat);
    hlRight.position.set(3.45, 1.8, -1.1);
    group.add(hlLeft, hlRight);

    // 6. Thermal Laser Projection (Ground Beam)
    const beamGeo = new THREE.PlaneGeometry(16, 3.8);
    const beamMat = new THREE.MeshBasicMaterial({
      color: veh.color,
      transparent: true,
      opacity: 0.35,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const beam = new THREE.Mesh(beamGeo, beamMat);
    beam.rotation.x = -Math.PI / 2;
    beam.position.set(7.5, 0.12, 0);
    group.add(beam);

    // 7. Ground Thermal Halo
    const haloGeo = new THREE.RingGeometry(4.2, 5.0, 32);
    const haloMat = new THREE.MeshBasicMaterial({
      color: veh.color,
      transparent: true,
      opacity: 0.85,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const halo = new THREE.Mesh(haloGeo, haloMat);
    halo.rotation.x = -Math.PI / 2;
    halo.position.y = 0.1;
    group.add(halo);

    // 8. 3D Billboard Sprite Tag Above Vehicle (Readable from any angle)
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 80;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.roundRect(4, 4, 248, 72, 16);
      ctx.fill();
      ctx.strokeStyle = veh.color;
      ctx.lineWidth = 4;
      ctx.stroke();

      ctx.font = 'bold 26px sans-serif';
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'center';
      ctx.fillText(`${veh.callSign.split(' ')[0]} · ${veh.scoreExplanation.priorityLevel}`, 128, 36);

      ctx.font = 'bold 20px monospace';
      ctx.fillStyle = '#38bdf8';
      ctx.fillText(`SCORE ${veh.scoreExplanation.totalScore} · ${veh.speed * 100 | 0} km/h`, 128, 62);
    }
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    const spriteMat = new THREE.SpriteMaterial({ map: texture, depthTest: false });
    const sprite = new THREE.Sprite(spriteMat);
    sprite.position.set(0, 8.5, 0);
    sprite.scale.set(12, 3.8, 1);
    group.add(sprite);

    return group;
  };

  // Main Scene Setup
  useEffect(() => {
    if (!mountRef.current) return;
    const container = mountRef.current;
    const width = container.clientWidth || 800;
    const height = container.clientHeight || 600;

    // Detect software WebGL
    const isSoftwareGl = (() => {
      try {
        const gl = document.createElement('canvas').getContext('webgl2');
        if (!gl) return true;
        const ext = gl.getExtension('WEBGL_debug_renderer_info');
        const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
        const gpu = String(gl.getParameter(param));
        gl.getExtension('WEBGL_lose_context')?.loseContext();
        return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
      } catch {
        return false;
      }
    })();

    // 1. Scene with High-Contrast Dark Canvas
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(isNightMode ? 0x050811 : 0x0f172a);
    scene.fog = new THREE.FogExp2(isNightMode ? 0x050811 : 0x0f172a, 0.002);
    sceneRef.current = scene;

    // 2. Camera with Clear Wide-Angle Perspective
    const camera = new THREE.PerspectiveCamera(48, width / height, 1, 1200);
    camera.position.set(HALF_W + 65, 115, HALF_D + 95);
    cameraRef.current = camera;

    // 3. Renderer with High Tone-Mapping for Vivid Neon Lights
    const renderer = new THREE.WebGLRenderer({
      antialias: !isSoftwareGl,
      powerPreference: 'high-performance',
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.35; // Bright tone-mapping so heatmaps and signals pop!
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    container.innerHTML = '';
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // 4. Orbit Controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.06;
    controls.maxPolarAngle = Math.PI / 2.05;
    controls.minDistance = 25;
    controls.maxDistance = 350;
    controls.target.set(0, 0, 0);
    controlsRef.current = controls;

    // 5. Radiant Studio Lighting Rig
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.85);
    scene.add(ambientLight);

    const hemiLight = new THREE.HemisphereLight(0x38bdf8, 0x020617, 0.8);
    scene.add(hemiLight);

    const sunLight = new THREE.DirectionalLight(0xffffff, 1.5);
    sunLight.position.set(70, 140, 50);
    sunLight.castShadow = !isSoftwareGl;
    sunLight.shadow.mapSize.width = 1024;
    sunLight.shadow.mapSize.height = 1024;
    scene.add(sunLight);

    // 6. Base Foundation Grid
    const groundGeo = new THREE.PlaneGeometry(TOTAL_GRID_WIDTH + 180, TOTAL_GRID_DEPTH + 180);
    const groundMat = new THREE.MeshStandardMaterial({
      color: 0x030712,
      roughness: 0.9,
    });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.15;
    ground.receiveShadow = true;
    scene.add(ground);

    // 7. High-Visibility Thermal Heatmap Road Corridors
    roadMeshesRef.current.clear();
    const roadsGroup = new THREE.Group();

    // North-South Avenues
    for (let x = 0; x < GRID_COLS; x++) {
      const pos = gridToWorld(x, 0);
      const roadGeo = new THREE.PlaneGeometry(ROAD_WIDTH, TOTAL_GRID_DEPTH + ROAD_WIDTH);
      // Vivid thermal road surface
      const roadMat = new THREE.MeshStandardMaterial({
        color: x === 2 ? 0xef4444 : 0x0f172a, // 3rd Ave heavy thermal red by default
        emissive: x === 2 ? 0x991b1b : 0x020617,
        emissiveIntensity: 0.6,
        roughness: 0.4,
      });
      const road = new THREE.Mesh(roadGeo, roadMat);
      road.rotation.x = -Math.PI / 2;
      road.position.set(pos.x, 0.02, 0);
      road.receiveShadow = true;
      roadsGroup.add(road);
      roadMeshesRef.current.set(`ave_${x}`, road);

      // Bright yellow center lane markings
      const stripeGeo = new THREE.PlaneGeometry(0.8, TOTAL_GRID_DEPTH + ROAD_WIDTH);
      const stripeMat = new THREE.MeshBasicMaterial({ color: 0xfacc15 });
      const stripe = new THREE.Mesh(stripeGeo, stripeMat);
      stripe.rotation.x = -Math.PI / 2;
      stripe.position.set(pos.x, 0.04, 0);
      roadsGroup.add(stripe);
    }

    // East-West Streets
    for (let y = 0; y < GRID_ROWS; y++) {
      const pos = gridToWorld(0, y);
      const roadGeo = new THREE.PlaneGeometry(TOTAL_GRID_WIDTH + ROAD_WIDTH, ROAD_WIDTH);
      const roadMat = new THREE.MeshStandardMaterial({
        color: y === 2 ? 0xf59e0b : 0x0f172a, // Lexington St amber thermal by default
        emissive: y === 2 ? 0x78350f : 0x020617,
        emissiveIntensity: 0.6,
        roughness: 0.4,
      });
      const road = new THREE.Mesh(roadGeo, roadMat);
      road.rotation.x = -Math.PI / 2;
      road.position.set(0, 0.03, pos.z);
      road.receiveShadow = true;
      roadsGroup.add(road);
      roadMeshesRef.current.set(`st_${y}`, road);

      // Bright yellow center lane markings
      const stripeGeo = new THREE.PlaneGeometry(TOTAL_GRID_WIDTH + ROAD_WIDTH, 0.8);
      const stripeMat = new THREE.MeshBasicMaterial({ color: 0xfacc15 });
      const stripe = new THREE.Mesh(stripeGeo, stripeMat);
      stripe.rotation.x = -Math.PI / 2;
      stripe.position.set(0, 0.05, pos.z);
      roadsGroup.add(stripe);
    }
    scene.add(roadsGroup);

    // 8. Low-Profile Translucent Cyber Buildings (NEVER occlude roads or vehicles!)
    const buildingsGroup = new THREE.Group();
    for (let r = 0; r < GRID_ROWS - 1; r++) {
      for (let c = 0; c < GRID_COLS - 1; c++) {
        const p1 = gridToWorld(c, r);
        const p2 = gridToWorld(c + 1, r + 1);
        const centerX = (p1.x + p2.x) / 2;
        const centerZ = (p1.z + p2.z) / 2;

        // Moderate heights (10-18 units) with sleek translucent cyber-glass
        const h = 12 + ((c + r) % 3) * 4;
        const bMat = new THREE.MeshStandardMaterial({
          color: 0x0f172a,
          roughness: 0.2,
          metalness: 0.8,
          transparent: true,
          opacity: 0.75, // Translucent so you can see through behind them!
        });
        const bGeom = new THREE.BoxGeometry(BLOCK_SIZE - 4, h, BLOCK_SIZE - 4);
        const bMesh = new THREE.Mesh(bGeom, bMat);
        bMesh.position.set(centerX, h / 2, centerZ);
        buildingsGroup.add(bMesh);

        // Bright Neon Edge Outline on Buildings
        const edges = new THREE.EdgesGeometry(bGeom);
        const lineMat = new THREE.LineBasicMaterial({
          color: c === 3 && r === 1 ? 0x00f5ff : 0x334155, // Metro General Hospital neon cyan
          linewidth: 2,
        });
        const wireframe = new THREE.LineSegments(edges, lineMat);
        wireframe.position.set(centerX, h / 2, centerZ);
        buildingsGroup.add(wireframe);

        // Helipad on Metro General Hospital
        if (c === 3 && r === 1) {
          const pad = new THREE.Mesh(
            new THREE.CylinderGeometry(5, 5, 0.5, 16),
            new THREE.MeshStandardMaterial({ color: 0xff0055, emissive: 0xff0055, emissiveIntensity: 0.6 })
          );
          pad.position.set(centerX, h + 0.3, centerZ);
          buildingsGroup.add(pad);
        }
      }
    }
    scene.add(buildingsGroup);

    // 9. Towering High-Luminance Traffic Signal Pylons (Visible from any angle)
    signalMeshesRef.current.clear();
    const signalsGroup = new THREE.Group();

    for (let y = 0; y < GRID_ROWS; y++) {
      for (let x = 0; x < GRID_COLS; x++) {
        const id = `I_${x}_${y}`;
        const pos = gridToWorld(x, y);

        // Central Illuminated Intersection Hub Junction
        const junctionGeo = new THREE.PlaneGeometry(ROAD_WIDTH, ROAD_WIDTH);
        const junctionMat = new THREE.MeshStandardMaterial({
          color: 0x1e293b,
          roughness: 0.3,
        });
        const junction = new THREE.Mesh(junctionGeo, junctionMat);
        junction.rotation.x = -Math.PI / 2;
        junction.position.set(pos.x, 0.035, pos.z);
        signalsGroup.add(junction);

        // Tall Signal Pylon Tower (Height 14 units)
        const pylonGeom = new THREE.CylinderGeometry(0.5, 0.7, 14, 8);
        const pylonMat = new THREE.MeshStandardMaterial({ color: 0x38bdf8, metalness: 0.8 });
        const pylon = new THREE.Mesh(pylonGeom, pylonMat);
        pylon.position.set(pos.x + 8.5, 7, pos.z + 8.5);
        signalsGroup.add(pylon);

        // Giant NS Signal Beacon (Diameter 2.4 units, high emissive brightness)
        const nsHeadMat = new THREE.MeshStandardMaterial({
          color: 0x00ff88,
          emissive: 0x00ff88,
          emissiveIntensity: 2.2,
        });
        const nsHead = new THREE.Mesh(new THREE.SphereGeometry(1.2, 16, 16), nsHeadMat);
        nsHead.position.set(pos.x, 13, pos.z - 6.5);

        // Giant EW Signal Beacon
        const ewHeadMat = new THREE.MeshStandardMaterial({
          color: 0xff0033,
          emissive: 0xff0033,
          emissiveIntensity: 2.2,
        });
        const ewHead = new THREE.Mesh(new THREE.SphereGeometry(1.2, 16, 16), ewHeadMat);
        ewHead.position.set(pos.x - 6.5, 13, pos.z);

        signalsGroup.add(nsHead, ewHead);

        // Glowing Preemption / Conflict Holographic Shockwave Ring
        const haloMat = new THREE.MeshBasicMaterial({
          color: 0x00ff88,
          wireframe: true,
          transparent: true,
          opacity: 0.9,
          side: THREE.DoubleSide,
        });
        const halo = new THREE.Mesh(new THREE.RingGeometry(8, 10, 32), haloMat);
        halo.rotation.x = -Math.PI / 2;
        halo.position.set(pos.x, 1.2, pos.z);
        halo.visible = false;
        signalsGroup.add(halo);

        signalMeshesRef.current.set(id, { pylon, nsHead, ewHead, halo });
      }
    }
    scene.add(signalsGroup);

    // 10. Glowing Green Wave Corridor Ribbons Group
    const greenWaveGroup = new THREE.Group();
    scene.add(greenWaveGroup);
    greenWaveMeshRef.current = greenWaveGroup;

    // Animation Loop
    let animationFrameId = 0;
    const clock = new THREE.Clock();

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      const delta = clock.getDelta();

      // Pulsing preemption shockwave halos
      signalMeshesRef.current.forEach(({ halo }) => {
        if (halo && halo.visible) {
          halo.rotation.z += delta * 1.8;
          const s = 1 + Math.sin(clock.getElapsedTime() * 4) * 0.12;
          halo.scale.set(s, s, s);
        }
      });

      controls.update();
      renderer.render(scene, camera);
    };

    animate();

    const handleResize = () => {
      if (!mountRef.current || !rendererRef.current || !cameraRef.current) return;
      const w = mountRef.current.clientWidth;
      const h = mountRef.current.clientHeight;
      cameraRef.current.aspect = w / h;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(w, h);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
      renderer.dispose();
    };
  }, [isNightMode]);

  // Update Thermal Heatmap Colors on Road Segments
  useEffect(() => {
    if (!sceneRef.current) return;

    // Update Avenue Road Heatmap Colors
    for (let x = 0; x < GRID_COLS; x++) {
      const road = roadMeshesRef.current.get(`ave_${x}`);
      if (!road) continue;

      // Calculate average congestion of avenue segments
      let totalCong = 0;
      let count = 0;
      roadSegments.forEach((seg) => {
        const fromCoord = parseIntersectionId(seg.fromId);
        if (fromCoord.x === x && seg.direction === 'NS') {
          totalCong += seg.congestion;
          count++;
        }
      });
      const avgCong = count > 0 ? totalCong / count : 0.3;
      const thermal = getThermalColor(avgCong);

      if (heatmapMode === 'thermal') {
        (road.material as THREE.MeshStandardMaterial).color.setHex(thermal.hex);
        (road.material as THREE.MeshStandardMaterial).emissive.setHex(thermal.hex);
        (road.material as THREE.MeshStandardMaterial).emissiveIntensity = 0.55;
      } else {
        (road.material as THREE.MeshStandardMaterial).color.setHex(0x111827);
        (road.material as THREE.MeshStandardMaterial).emissive.setHex(0x020617);
      }
    }

    // Update Street Road Heatmap Colors
    for (let y = 0; y < GRID_ROWS; y++) {
      const road = roadMeshesRef.current.get(`st_${y}`);
      if (!road) continue;

      let totalCong = 0;
      let count = 0;
      roadSegments.forEach((seg) => {
        const fromCoord = parseIntersectionId(seg.fromId);
        if (fromCoord.y === y && seg.direction === 'EW') {
          totalCong += seg.congestion;
          count++;
        }
      });
      const avgCong = count > 0 ? totalCong / count : 0.3;
      const thermal = getThermalColor(avgCong);

      if (heatmapMode === 'thermal') {
        (road.material as THREE.MeshStandardMaterial).color.setHex(thermal.hex);
        (road.material as THREE.MeshStandardMaterial).emissive.setHex(thermal.hex);
        (road.material as THREE.MeshStandardMaterial).emissiveIntensity = 0.55;
      } else {
        (road.material as THREE.MeshStandardMaterial).color.setHex(0x111827);
        (road.material as THREE.MeshStandardMaterial).emissive.setHex(0x020617);
      }
    }
  }, [roadSegments, heatmapMode]);

  // Synchronize 3D Traffic Signals with App State
  useEffect(() => {
    if (!sceneRef.current) return;

    intersections.forEach((inter, id) => {
      const entry = signalMeshesRef.current.get(id);
      if (!entry) return;

      const isNSGreen = inter.activePhase === 'NS_GREEN';
      const isNSYellow = inter.activePhase === 'NS_YELLOW';
      const isEWGreen = inter.activePhase === 'EW_GREEN';
      const isEWYellow = inter.activePhase === 'EW_YELLOW';

      const nsColor = isNSGreen ? 0x00ff88 : isNSYellow ? 0xffb700 : 0xff0044;
      const ewColor = isEWGreen ? 0x00ff88 : isEWYellow ? 0xffb700 : 0xff0044;

      (entry.nsHead.material as THREE.MeshStandardMaterial).color.setHex(nsColor);
      (entry.nsHead.material as THREE.MeshStandardMaterial).emissive.setHex(nsColor);

      (entry.ewHead.material as THREE.MeshStandardMaterial).color.setHex(ewColor);
      (entry.ewHead.material as THREE.MeshStandardMaterial).emissive.setHex(ewColor);

      // Preemption or Conflict Hologram Shockwave
      const hasConflict = activeConflictIntersectionIds.includes(id);
      if (entry.halo) {
        if (hasConflict) {
          entry.halo.visible = true;
          (entry.halo.material as THREE.MeshBasicMaterial).color.setHex(0xffaa00);
        } else if (inter.isPreempted && isSignalFlowActive) {
          entry.halo.visible = true;
          (entry.halo.material as THREE.MeshBasicMaterial).color.setHex(0x00ff88);
        } else {
          entry.halo.visible = false;
        }
      }
    });
  }, [intersections, activeConflictIntersectionIds, isSignalFlowActive]);

  // Synchronize 3D Emergency Vehicles with App State
  useEffect(() => {
    if (!sceneRef.current) return;
    const scene = sceneRef.current;
    const existingMap = vehicleMeshesRef.current;
    const currentVehIds = new Set(vehicles.map((v) => v.id));

    // Remove old
    existingMap.forEach((mesh, id) => {
      if (!currentVehIds.has(id)) {
        scene.remove(mesh);
        existingMap.delete(id);
      }
    });

    // Update or add
    vehicles.forEach((veh) => {
      let group = existingMap.get(veh.id);
      if (!group) {
        group = createVehicleMesh(veh);
        scene.add(group);
        existingMap.set(veh.id, group);
      }

      const fromPos = idToWorld(veh.currentIntersectionId);
      const toPos = veh.nextIntersectionId ? idToWorld(veh.nextIntersectionId) : fromPos;

      const curX = fromPos.x + (toPos.x - fromPos.x) * veh.progressOnSegment;
      const curZ = fromPos.z + (toPos.z - fromPos.z) * veh.progressOnSegment;

      group.position.set(curX, 0, curZ);

      const dx = toPos.x - fromPos.x;
      const dz = toPos.z - fromPos.z;
      if (Math.abs(dx) > 0.01 || Math.abs(dz) > 0.01) {
        const targetAngle = Math.atan2(dx, dz);
        group.rotation.y = targetAngle - Math.PI / 2;
      }
    });

    // Follow camera
    if (cameraMode === 'follow' && vehicles.length > 0 && cameraRef.current && controlsRef.current) {
      const leader = [...vehicles].sort((a, b) => b.scoreExplanation.totalScore - a.scoreExplanation.totalScore)[0];
      const leaderMesh = existingMap.get(leader.id);
      if (leaderMesh) {
        controlsRef.current.target.lerp(leaderMesh.position, 0.12);
      }
    }
  }, [vehicles, cameraMode]);

  // Glowing Green Wave Preemption Corridor
  useEffect(() => {
    if (!greenWaveMeshRef.current || !sceneRef.current) return;
    const group = greenWaveMeshRef.current;

    while (group.children.length > 0) {
      group.remove(group.children[0]);
    }

    if (!isSignalFlowActive) return;

    vehicles
      .filter((v) => v.scoreExplanation.priorityLevel === 'P1' || v.isPreempting)
      .forEach((v) => {
        for (let i = v.routeIndex; i < v.route.length - 1; i++) {
          const fromPos = idToWorld(v.route[i]);
          const toPos = idToWorld(v.route[i + 1]);

          const distance = Math.hypot(toPos.x - fromPos.x, toPos.z - fromPos.z);
          const midX = (fromPos.x + toPos.x) / 2;
          const midZ = (fromPos.z + toPos.z) / 2;

          // Extra-wide bright green wave corridor ribbon
          const ribbonGeo = new THREE.PlaneGeometry(ROAD_WIDTH - 2, distance);
          const ribbonMat = new THREE.MeshBasicMaterial({
            color: 0x00ff88,
            transparent: true,
            opacity: 0.7,
            side: THREE.DoubleSide,
            depthWrite: false,
          });
          const ribbon = new THREE.Mesh(ribbonGeo, ribbonMat);
          ribbon.rotation.x = -Math.PI / 2;

          const angle = Math.atan2(toPos.x - fromPos.x, toPos.z - fromPos.z);
          ribbon.rotation.z = -angle;

          ribbon.position.set(midX, 0.15, midZ);
          group.add(ribbon);
        }
      });
  }, [vehicles, isSignalFlowActive]);

  // Camera presets
  const setCameraPreset = (mode: 'isometric' | 'topDown' | 'follow' | 'conflict') => {
    setCameraMode(mode);
    if (!cameraRef.current || !controlsRef.current) return;
    const camera = cameraRef.current;
    const controls = controlsRef.current;

    if (mode === 'isometric') {
      camera.position.set(HALF_W + 65, 115, HALF_D + 95);
      controls.target.set(0, 0, 0);
    } else if (mode === 'topDown') {
      camera.position.set(0, 220, 0.1);
      controls.target.set(0, 0, 0);
    } else if (mode === 'conflict') {
      const pos = gridToWorld(2, 2);
      camera.position.set(pos.x + 40, 50, pos.z + 45);
      controls.target.set(pos.x, 6, pos.z);
    }
  };

  return (
    <div className="relative bg-slate-950 rounded-xl border border-slate-800 shadow-2xl overflow-hidden flex flex-col h-[740px]">
      {/* High-Visibility 3D Viewport Header Toolbar */}
      <div className="px-4 py-3 bg-slate-900 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 z-10">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-rose-500 animate-ping" />
            <span className="text-sm font-bold text-white tracking-tight">
              3D Real-Time Thermal Heatmap Grid
            </span>
          </div>
          <span className="text-slate-600 hidden md:inline">·</span>
          <span className="text-xs text-slate-400 font-mono hidden md:inline">
            Vivid Infrared Congestion & Green Wave Telemetry
          </span>
        </div>

        {/* Heatmap & Camera Controls */}
        <div className="flex items-center gap-2">
          {/* Heatmap Mode Selector */}
          <div className="flex items-center bg-slate-950 rounded-lg border border-slate-800 p-0.5 text-xs">
            <button
              onClick={() => setHeatmapMode('thermal')}
              className={`px-2.5 py-1 rounded font-semibold transition-colors flex items-center gap-1 ${
                heatmapMode === 'thermal'
                  ? 'bg-rose-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Flame className="w-3.5 h-3.5" />
              <span>Infrared Heatmap</span>
            </button>
            <button
              onClick={() => setHeatmapMode('preemption')}
              className={`px-2.5 py-1 rounded font-semibold transition-colors flex items-center gap-1 ${
                heatmapMode === 'preemption'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Zap className="w-3.5 h-3.5" />
              <span>Corridor Waves</span>
            </button>
          </div>

          {/* Technical Telemetry Toggle */}
          <button
            onClick={() => setShowTechnicalLabels(!showTechnicalLabels)}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-colors ${
              showTechnicalLabels
                ? 'bg-cyan-950/60 text-cyan-300 border-cyan-800'
                : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
            }`}
          >
            HUD Telemetry
          </button>

          {/* Camera View Mode */}
          <div className="flex items-center bg-slate-950 rounded-lg border border-slate-800 p-0.5 text-xs">
            <button
              onClick={() => setCameraPreset('isometric')}
              className={`px-2 py-1 rounded font-medium transition-colors ${
                cameraMode === 'isometric' ? 'bg-slate-800 text-cyan-300 font-bold' : 'text-slate-400'
              }`}
            >
              Isometric
            </button>
            <button
              onClick={() => setCameraPreset('topDown')}
              className={`px-2 py-1 rounded font-medium transition-colors ${
                cameraMode === 'topDown' ? 'bg-slate-800 text-cyan-300 font-bold' : 'text-slate-400'
              }`}
            >
              Top-Down
            </button>
            <button
              onClick={() => setCameraPreset('follow')}
              className={`px-2 py-1 rounded font-medium transition-colors ${
                cameraMode === 'follow' ? 'bg-slate-800 text-emerald-300 font-bold' : 'text-slate-400'
              }`}
            >
              Chase Cam
            </button>
            <button
              onClick={() => setCameraPreset('conflict')}
              className={`px-2 py-1 rounded font-medium transition-colors ${
                cameraMode === 'conflict' ? 'bg-slate-800 text-amber-300 font-bold' : 'text-slate-400'
              }`}
            >
              Conflict Node
            </button>
          </div>
        </div>
      </div>

      {/* WebGL Canvas Container */}
      <div ref={mountRef} className="w-full flex-1 relative cursor-grab active:cursor-grabbing bg-[#050811]" />

      {/* High-Density Technical Telemetry HUD Overlay (Floating in viewport) */}
      {showTechnicalLabels && (
        <div className="absolute top-16 left-4 pointer-events-none z-20 space-y-2">
          {/* Active Corridor Card */}
          <div className="bg-slate-950/85 backdrop-blur-md border border-cyan-500/40 rounded-lg p-3 text-xs w-72 shadow-2xl">
            <div className="flex items-center justify-between text-cyan-400 font-bold mb-1">
              <span className="flex items-center gap-1.5 font-mono text-[11px]">
                <Radio className="w-3.5 h-3.5" /> METRO TOC TELEMETRY
              </span>
              <span className="text-[10px] font-mono text-emerald-400">ACTIVE</span>
            </div>
            <div className="space-y-1 font-mono text-[11px] text-slate-300">
              <div className="flex justify-between">
                <span className="text-slate-500">3RD AVE LOAD:</span>
                <span className="text-rose-400 font-bold">84% (SEVERE BTLNK)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">LEXINGTON ST:</span>
                <span className="text-amber-400 font-bold">62% (MODERATE HEAT)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">SIGNALS PREEMPTED:</span>
                <span className="text-emerald-400 font-bold">I_1_2, I_2_2 (GREEN LOCK)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">CORRIDOR RECOVERY:</span>
                <span className="text-cyan-300 font-bold">12.4 SECONDS</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Thermal Heatmap Scale Footer */}
      <div className="px-4 py-2.5 bg-slate-900 border-t border-slate-800 flex flex-wrap items-center justify-between gap-4 text-xs text-slate-400">
        <div className="flex items-center gap-3">
          <span className="text-xs font-semibold text-slate-200">Thermal Heatmap Scale:</span>
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1 font-mono text-[11px]">
              <span className="w-3 h-3 rounded bg-[#00e676]" /> &lt;25% Clear
            </span>
            <span className="flex items-center gap-1 font-mono text-[11px]">
              <span className="w-3 h-3 rounded bg-[#ffb700]" /> 45% Moderate
            </span>
            <span className="flex items-center gap-1 font-mono text-[11px]">
              <span className="w-3 h-3 rounded bg-[#ff4d00]" /> 65% Dense
            </span>
            <span className="flex items-center gap-1 font-mono text-[11px]">
              <span className="w-3 h-3 rounded bg-[#ff0055]" /> &gt;85% Gridlock
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3 text-[11px] font-mono">
          <span className="text-emerald-400 flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" /> Green Wave Hologram
          </span>
          <span className="text-amber-400 flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400" /> Conflict Arbitration Node
          </span>
        </div>
      </div>
    </div>
  );
};
