import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Text, Html } from '@react-three/drei';
import * as THREE from 'three';

interface SceneProps {
  connected: boolean;
  status: string;
}

function GridFloor() {
  return (
    <group position={[0, -0.5, 0]}>
      {/* Main floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
        <planeGeometry args={[12, 12]} />
        <meshStandardMaterial
          color="#0a0f1e"
          roughness={0.8}
          metalness={0.2}
        />
      </mesh>
      {/* Grid lines */}
      <gridHelper args={[12, 16, '#1e293b', '#0f172a']} position={[0, 0.01, 0]} />
    </group>
  );
}

function AmbientParticles() {
  const count = 200;
  const particlesRef = useRef<THREE.Points>(null);

  const [positions, sizes] = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const siz = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 15;
      pos[i * 3 + 1] = Math.random() * 8;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 15;
      siz[i] = Math.random() * 2 + 1;
    }
    return [pos, siz];
  }, []);

  useFrame((_, delta) => {
    if (!particlesRef.current) return;
    const pos = particlesRef.current.geometry.attributes.position.array as Float32Array;
    for (let i = 0; i < count; i++) {
      pos[i * 3 + 1] += delta * 0.02;
      if (pos[i * 3 + 1] > 8) pos[i * 3 + 1] = 0;
    }
    particlesRef.current.geometry.attributes.position.needsUpdate = true;
  });

  return (
    <points ref={particlesRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={count}
          array={positions}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.03}
        color="#38bdf8"
        transparent
        opacity={0.4}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </points>
  );
}

function ConnectionIndicator({ connected }: { connected: boolean }) {
  return (
    <Html position={[-5.5, 3.5, 0]} style={{ pointerEvents: 'none' }} distanceFactor={2}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        color: connected ? '#22c55e' : '#ef4444',
        fontSize: '11px',
        fontFamily: 'monospace',
        background: 'rgba(15,23,42,0.6)',
        padding: '4px 10px',
        borderRadius: '20px',
        backdropFilter: 'blur(4px)',
      }}>
        <span style={{
          width: '8px',
          height: '8px',
          borderRadius: '50%',
          background: connected ? '#22c55e' : '#ef4444',
          display: 'inline-block',
          boxShadow: `0 0 6px ${connected ? '#22c55e' : '#ef4444'}`,
        }} />
        {connected ? 'Connected' : 'Disconnected'}
      </div>
    </Html>
  );
}

export function Scene({ connected, status }: SceneProps) {
  const colorRef = useRef(new THREE.Color('#1e293b'));

  return (
    <>
      {/* Lighting */}
      <ambientLight intensity={0.15} />
      <directionalLight
        position={[5, 8, 5]}
        intensity={0.5}
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
      />
      <pointLight position={[0, 3, 0]} intensity={0.3} color="#38bdf8" />

      {/* Environment */}
      <GridFloor />
      <AmbientParticles />
      <ConnectionIndicator connected={connected} />

      {/* Dim corners */}
      {[-5, 5].map((x) =>
        [-5, 5].map((z) => (
          <mesh key={`corner-${x}-${z}`} position={[x, 0, z]}>
            <boxGeometry args={[0.08, 2.5, 0.08]} />
            <meshStandardMaterial color="#1e293b" transparent opacity={0.3} />
          </mesh>
        ))
      )}

      {/* Subtle outer ring */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.45, 0]}>
        <ringGeometry args={[2.8, 3.0, 64]} />
        <meshStandardMaterial
          color="#1e293b"
          transparent
          opacity={0.3}
          side={THREE.DoubleSide}
        />
      </mesh>
    </>
  );
}
