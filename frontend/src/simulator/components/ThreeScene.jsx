import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Stars } from '@react-three/drei';
import { EARTH_RADIUS_KM, getOrbitPoints, getSatellitePosition } from '../services/orbitMath';
import styles from '../styles/ThreeScene.module.css';

function createEarthTexture() {
  const size = 1024;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext('2d');

  const oceanGradient = context.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  oceanGradient.addColorStop(0, '#0b4e9f');
  oceanGradient.addColorStop(0.6, '#0d2e75');
  oceanGradient.addColorStop(1, '#040e2d');
  context.fillStyle = oceanGradient;
  context.fillRect(0, 0, size, size);

  context.fillStyle = '#1f7f4f';
  context.beginPath();
  context.ellipse(220, 280, 100, 120, -0.3, 0, Math.PI * 2);
  context.fill();
  context.beginPath();
  context.ellipse(280, 450, 70, 110, 0.1, 0, Math.PI * 2);
  context.fill();
  context.beginPath();
  context.ellipse(540, 260, 90, 130, 0.1, 0, Math.PI * 2);
  context.fill();
  context.beginPath();
  context.ellipse(710, 280, 140, 120, 0.05, 0, Math.PI * 2);
  context.fill();

  context.fillStyle = 'rgba(173, 224, 255, 0.3)';
  for (let i = 0; i < 120; i += 1) {
    context.beginPath();
    context.arc(Math.random() * size, Math.random() * size, Math.random() * 2 + 0.5, 0, Math.PI * 2);
    context.fill();
  }

  return new THREE.CanvasTexture(canvas);
}

function OrbitLine({ orbitParams, showTrajectory }) {
  const points = useMemo(() => getOrbitPoints(orbitParams).map((point) => new THREE.Vector3(...point)), [orbitParams]);
  if (!showTrajectory) {
    return null;
  }

  return (
    <line>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          array={new Float32Array(points.flatMap((point) => [point.x, point.y, point.z]))}
          count={points.length}
          itemSize={3}
        />
      </bufferGeometry>
      <lineBasicMaterial color="#33b2ff" transparent opacity={0.75} />
    </line>
  );
}

function ApoPeriMarkers({ orbitParams, showApoPeri }) {
  const orbitPoints = useMemo(() => getOrbitPoints(orbitParams), [orbitParams]);
  if (!showApoPeri || orbitPoints.length < 2) {
    return null;
  }

  const periPoint = orbitPoints[0];
  const apoPoint = orbitPoints[Math.floor(orbitPoints.length / 2)];

  return (
    <group>
      <mesh position={periPoint}>
        <sphereGeometry args={[65, 14, 14]} />
        <meshBasicMaterial color="#00ff9c" />
      </mesh>
      <mesh position={apoPoint}>
        <sphereGeometry args={[65, 14, 14]} />
        <meshBasicMaterial color="#ff7d4d" />
      </mesh>
      <line>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            array={new Float32Array([...periPoint, ...apoPoint])}
            count={2}
            itemSize={3}
          />
        </bufferGeometry>
        <lineBasicMaterial color="#ff9257" transparent opacity={0.55} />
      </line>
    </group>
  );
}

function SatelliteModel({ satelliteRef }) {
  return (
    <group ref={satelliteRef}>
      <mesh>
        <boxGeometry args={[80, 60, 60]} />
        <meshPhongMaterial color="#d4c99f" specular="#9e8d57" shininess={70} />
      </mesh>
      <mesh>
        <boxGeometry args={[240, 8, 60]} />
        <meshPhongMaterial color="#336eff" specular="#6f9dff" shininess={130} />
      </mesh>
      <mesh position={[0, 45, 0]}>
        <cylinderGeometry args={[25, 5, 30, 16, 1, true]} />
        <meshPhongMaterial color="#e8e8e8" side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}

function SceneContent({ controls, orbitParams, onUpdateAngle }) {
  const earthRef = useRef();
  const satelliteRef = useRef();
  const angleRef = useRef(0);
  const texture = useMemo(() => createEarthTexture(), []);
  const { camera } = useThree();

  useFrame((_, delta) => {
    if (!controls.paused) {
      const angularVelocity = ((2 * Math.PI) / orbitParams.period) * controls.timeScale;
      angleRef.current = (angleRef.current + angularVelocity * delta) % (Math.PI * 2);
      if (earthRef.current) {
        earthRef.current.rotation.y += 0.00007 * controls.timeScale * delta;
      }
    }

    const currentPos = getSatellitePosition(angleRef.current, orbitParams);
    const nextPos = getSatellitePosition(angleRef.current + 0.01, orbitParams);

    if (satelliteRef.current) {
      satelliteRef.current.position.set(currentPos.x, currentPos.y, currentPos.z);
      satelliteRef.current.lookAt(nextPos.x, nextPos.y, nextPos.z);

      const distance = camera.position.distanceTo(satelliteRef.current.position);
      const scale = THREE.MathUtils.clamp(distance * 0.002, 1, 8);
      satelliteRef.current.scale.setScalar(scale);
    }

    if (controls.camMode === 'track') {
      const satVector = new THREE.Vector3(currentPos.x, currentPos.y, currentPos.z);
      const offset = satVector.clone().normalize().multiplyScalar(4000);
      camera.position.lerp(satVector.add(offset), 0.05);
      camera.lookAt(currentPos.x, currentPos.y, currentPos.z);
    }

    if (controls.camMode === 'earth') {
      camera.position.lerp(new THREE.Vector3(0, 18000, 18000), 0.05);
      camera.lookAt(0, 0, 0);
    }

    onUpdateAngle(angleRef.current);
  });

  return (
    <>
      <ambientLight color="#243684" intensity={1.4} />
      <directionalLight color="#fff2d7" intensity={2.1} position={[50000, 20000, 30000]} />
      <directionalLight color="#5b7dff" intensity={0.75} position={[-30000, 0, -20000]} />

      <Stars radius={130000} depth={60} count={8000} factor={4} saturation={0} fade speed={0.5} />

      <mesh ref={earthRef}>
        <sphereGeometry args={[EARTH_RADIUS_KM, 64, 64]} />
        <meshPhongMaterial map={texture} specular="#305081" shininess={30} />
      </mesh>

      <mesh>
        <sphereGeometry args={[EARTH_RADIUS_KM * 1.026, 64, 64]} />
        <meshPhongMaterial color="#2f8cff" transparent opacity={0.11} />
      </mesh>

      <mesh>
        <sphereGeometry args={[EARTH_RADIUS_KM * 1.062, 64, 64]} />
        <meshPhongMaterial color="#674cff" transparent opacity={0.055} />
      </mesh>

      <OrbitLine orbitParams={orbitParams} showTrajectory={controls.showTrajectory} />
      <ApoPeriMarkers orbitParams={orbitParams} showApoPeri={controls.showApoPeri} />
      <SatelliteModel satelliteRef={satelliteRef} />

      <OrbitControls
        enabled={controls.camMode === 'free'}
        minDistance={8000}
        maxDistance={60000}
        enableDamping
        dampingFactor={0.05}
      />
    </>
  );
}

function ThreeScene({ controls, orbitParams, onUpdateAngle }) {
  return (
    <div className={styles.sceneWrap}>
      <Canvas
        camera={{ fov: 45, near: 0.1, far: 150000, position: [0, 6000, 18000] }}
        gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
        dpr={[1, 1.75]}
      >
        <SceneContent controls={controls} orbitParams={orbitParams} onUpdateAngle={onUpdateAngle} />
      </Canvas>
    </div>
  );
}

export default ThreeScene;
