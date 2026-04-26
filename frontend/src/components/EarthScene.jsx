/**
 * EarthScene Component
 * 
 * 3D Earth visualization using React Three Fiber
 */

import { useMemo, useRef, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Stars } from '@react-three/drei';
import * as THREE from 'three';

// Earth component
function Earth() {
  const earthRef = useRef();
  
  // Create procedural Earth texture
  function createEarthTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 2048;
    const ctx = canvas.getContext('2d');

    // Ocean background
    const grad = ctx.createRadialGradient(1024, 1024, 0, 1024, 1024, 1024);
    grad.addColorStop(0, '#0a3d6b');
    grad.addColorStop(0.5, '#0d4f8a');
    grad.addColorStop(1, '#041e3a');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 2048, 2048);

    // Land masses
    ctx.fillStyle = '#1a5c2e';
    // North America
    ctx.beginPath();
    ctx.ellipse(450, 480, 150, 180, -0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(390, 620, 80, 100, 0.2, 0, Math.PI * 2);
    ctx.fill();
    // South America
    ctx.beginPath();
    ctx.ellipse(520, 900, 80, 150, 0.1, 0, Math.PI * 2);
    ctx.fill();
    // Europe / Africa
    ctx.beginPath();
    ctx.ellipse(1060, 500, 80, 120, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(1080, 700, 100, 200, 0.15, 0, Math.PI * 2);
    ctx.fill();
    // Asia
    ctx.beginPath();
    ctx.ellipse(1400, 480, 250, 140, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(1600, 650, 120, 100, 0, 0, Math.PI * 2);
    ctx.fill();
    // Australia
    ctx.beginPath();
    ctx.ellipse(1650, 900, 100, 70, 0, 0, Math.PI * 2);
    ctx.fill();
    // Antarctica
    ctx.fillStyle = '#ddeeff';
    ctx.beginPath();
    ctx.ellipse(1024, 1984, 1024, 80, 0, 0, Math.PI * 2);
    ctx.fill();

    // City lights
    ctx.fillStyle = 'rgba(255,230,100,0.12)';
    for (let i = 0; i < 200; i++) {
      const x = Math.random() * 2048;
      const y = Math.random() * 2048;
      ctx.fillRect(x, y, 2, 2);
    }

    return new THREE.CanvasTexture(canvas);
  }

  const earthTexture = useMemo(() => createEarthTexture(), []);

  useFrame(() => {
    if (earthRef.current) {
      earthRef.current.rotation.y += 0.0001;
    }
  });

  return (
    <group ref={earthRef}>
      <mesh>
        <sphereGeometry args={[6371, 64, 64]} />
        <meshPhongMaterial map={earthTexture} shininess={30} />
      </mesh>
      {/* Atmosphere glow */}
      <mesh>
        <sphereGeometry args={[6371 * 1.025, 64, 64]} />
        <meshPhongMaterial 
          color={0x0066ff} 
          transparent 
          opacity={0.08}
        />
      </mesh>
      {/* Outer glow */}
      <mesh>
        <sphereGeometry args={[6371 * 1.06, 64, 64]} />
        <meshPhongMaterial 
          color={0x0044cc} 
          transparent 
          opacity={0.035}
        />
      </mesh>
    </group>
  );
}

// Satellite component
function Satellite({ event }) {
  const satRef = useRef();
  const eventScale = Math.max(0.85, Math.min(1.25, 1 + ((event?.collision_probability ?? 0.03) - 0.03) * 2));
  const orbitOffset = Math.max(0, (event?.miss_distance ?? 450) * 4);
  
  useFrame(() => {
    if (satRef.current) {
      satRef.current.rotation.x += 0.01;
      satRef.current.rotation.y += 0.02;
    }
  });

  return (
    <group ref={satRef} position={[7500 + orbitOffset, 5000, 8000]} scale={eventScale}>
      {/* Body */}
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[80, 60, 60]} />
        <meshPhongMaterial color={0xcccc88} shininess={80} />
      </mesh>
      {/* Solar panels */}
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[240, 8, 60]} />
        <meshPhongMaterial color={0x2255cc} shininess={120} />
      </mesh>
      {/* Dish */}
      <mesh position={[0, 45, 0]}>
        <cylinderGeometry args={[25, 5, 30, 16, 1]} />
        <meshPhongMaterial color={0xaaaaaa} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}

// Orbit line
function OrbitTrail({ event }) {
  const lineRef = useRef();
  const eventShift = Math.max(0, Math.min(1, (event?.collision_probability ?? 0.03) * 4));
  
  useEffect(() => {
    if (!lineRef.current) return;

    const points = [];
    const a = 19913; // semi-major axis
    const ecc = 0.331 + eventShift * 0.05;
    const incl = 90 * Math.PI / 180;
    const raan = 90 * Math.PI / 180;

    for (let i = 0; i <= 256; i++) {
      const nu = (i / 256) * Math.PI * 2;
      const r = a * (1 - ecc * ecc) / (1 + ecc * Math.cos(nu));
      const x0 = r * Math.cos(nu);
      const y0 = r * Math.sin(nu);

      const x1 = x0;
      const y1 = y0 * Math.cos(incl);
      const z1 = y0 * Math.sin(incl);

      const x2 = x1 * Math.cos(raan) - y1 * Math.sin(raan);
      const y2 = x1 * Math.sin(raan) + y1 * Math.cos(raan);
      const z2 = z1;

      points.push(new THREE.Vector3(x2, z2, y2));
    }

    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    lineRef.current.geometry = geometry;
  }, [eventShift]);

  return (
    <line ref={lineRef}>
      <bufferGeometry />
      <lineBasicMaterial color={0x00ffff} opacity={0.7} transparent />
    </line>
  );
}

function ConjunctionMarker({ event }) {
  const markerRef = useRef();
  const markerPosition = useMemo(() => {
    const tca = event?.tca_minutes ?? 45;
    const angle = ((event?.id ?? 1) * 0.72 + tca * 0.06) % (Math.PI * 2);
    const radius = 8500 + Math.min(12000, (event?.miss_distance ?? 300) * 2);

    return new THREE.Vector3(
      Math.cos(angle) * radius,
      Math.sin(angle * 0.55) * radius * 0.32,
      Math.sin(angle) * radius
    );
  }, [event]);

  useEffect(() => {
    if (markerRef.current) {
      markerRef.current.position.copy(markerPosition);
    }
  }, [markerPosition]);

  return (
    <mesh ref={markerRef}>
      <sphereGeometry args={[180, 24, 24]} />
      <meshBasicMaterial color={0xff2d55} transparent opacity={0.95} />
    </mesh>
  );
}

// Main scene
function EarthSceneContent({ event }) {
  const { camera } = useThree();

  useEffect(() => {
    camera.position.set(0, 6000, 18000);
    camera.lookAt(0, 0, 0);
  }, [camera]);

  return (
    <>
      <Stars radius={100000} depth={50000} count={8000} factor={4} />
      
      <ambientLight intensity={1.5} color={0x111122} />
      <directionalLight position={[50000, 20000, 30000]} intensity={2} color={0xfff5e0} />
      <directionalLight position={[-30000, 0, -20000]} intensity={0.8} color={0x003366} />
      
      <Earth event={event} />
      <Satellite event={event} />
      <OrbitTrail event={event} />
      <ConjunctionMarker event={event} />
      
      <OrbitControls 
        autoRotate={false}
        enableZoom={true}
        enablePan={true}
      />
    </>
  );
}

const EarthScene = ({ event = null }) => {
  return (
    <div id="threeCanvas" style={{ 
      width: '100%', 
      height: '100%',
      position: 'absolute',
      top: 0,
      left: 0
    }}>
      <Canvas
        gl={{ antialias: true, alpha: true }}
        camera={{ position: [0, 6000, 18000], fov: 45 }}
      >
        <EarthSceneContent event={event} />
      </Canvas>
    </div>
  );
};

export default EarthScene;
