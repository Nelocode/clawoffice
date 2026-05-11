import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Text, Float, Html } from '@react-three/drei';
import * as THREE from 'three';
import type { WorkerInfo, HermesStatus } from '../types';

const STATUS_COLORS: Record<HermesStatus, string> = {
  idle: '#4a5568',       // gray
  thinking: '#f59e0b',   // amber
  executing: '#22c55e',  // green
  error: '#ef4444',      // red
  waiting: '#6366f1',    // indigo
};

const STATUS_EMOJI: Record<HermesStatus, string> = {
  idle: '💤',
  thinking: '🤔',
  executing: '⚡',
  error: '🚨',
  waiting: '⏳',
};

function WorkerGlow({ status }: { status: HermesStatus }) {
  const color = new THREE.Color(STATUS_COLORS[status]);
  return (
    <pointLight
      color={color}
      intensity={status === 'idle' ? 0.3 : 0.8}
      distance={3}
      decay={2}
    />
  );
}

function WorkerCapsule({ status, progress }: { status: HermesStatus; progress?: number }) {
  const groupRef = useRef<THREE.Group>(null);
  const coreRef = useRef<THREE.Mesh>(null);
  const ringRef = useRef<THREE.Mesh>(null);

  const color = useMemo(() => new THREE.Color(STATUS_COLORS[status]), [status]);

  useFrame((_, delta) => {
    if (!groupRef.current || !coreRef.current) return;

    // Float bobbing
    groupRef.current.position.y = Math.sin(Date.now() * 0.001) * 0.15;

    // Core pulse
    const pulse = 1 + Math.sin(Date.now() * 0.003) * 0.05;
    if (status === 'thinking') {
      coreRef.current.scale.setScalar(1 + Math.sin(Date.now() * 0.005) * 0.08);
    } else if (status === 'executing') {
      coreRef.current.scale.setScalar(pulse);
    } else {
      coreRef.current.scale.setScalar(1);
    }

    // Ring rotation
    if (ringRef.current) {
      ringRef.current.rotation.x += delta * (status === 'executing' ? 1.5 : 0.5);
      ringRef.current.rotation.z += delta * (status === 'thinking' ? 1 : 0.3);
    }
  });

  // Progress ring
  const progressAngle = (progress ?? 0) * Math.PI * 2;
  const progressPoints = useMemo(() => {
    const pts: THREE.Vector3[] = [];
    const segments = 32;
    for (let i = 0; i <= segments; i++) {
      const a = (i / segments) * progressAngle;
      pts.push(new THREE.Vector3(Math.cos(a) * 0.7, Math.sin(a) * 0.7, 0));
    }
    return pts;
  }, [progress]);

  return (
    <group ref={groupRef}>
      {/* Outer glow ring */}
      <mesh ref={ringRef}>
        <torusGeometry args={[0.7, 0.02, 16, 48]} />
        <meshStandardMaterial color={color} transparent opacity={0.4} />
      </mesh>

      {/* Progress arc */}
      {status === 'executing' && progress !== undefined && progress > 0 && (
        <mesh>
          <tubeGeometry args={[
            new THREE.CatmullRomCurve3(progressPoints),
            32, 0.03, 8, false
          ]} />
          <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.5} />
        </mesh>
      )}

      {/* Core */}
      <mesh ref={coreRef}>
        <icosahedronGeometry args={[0.35, 1]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={status === 'idle' ? 0.1 : 0.4}
          roughness={0.3}
          metalness={0.7}
        />
      </mesh>

      {/* Inner glow */}
      <mesh>
        <icosahedronGeometry args={[0.15, 1]} />
        <meshBasicMaterial color="white" transparent opacity={0.6} />
      </mesh>
    </group>
  );
}

interface WorkerNodeProps {
  worker: WorkerInfo;
  position: [number, number, number];
}

export function WorkerNode({ worker, position }: WorkerNodeProps) {
  return (
    <group position={position}>
      <Float speed={1} rotationIntensity={0.05} floatIntensity={0.3}>
        <WorkerCapsule status={worker.status} progress={worker.progress} />
        <WorkerGlow status={worker.status} />
      </Float>

      {/* Name tag */}
      <Text
        position={[0, -1.2, 0]}
        fontSize={0.12}
        color="#94a3b8"
        anchorX="center"
        anchorY="top"
        maxWidth={2}
        font="/fonts/Geist-Regular.woff"
      >
        {worker.name}
      </Text>

      {/* Status indicator - floating above */}
      <Html position={[0, 1, 0]} center style={{ pointerEvents: 'none' }}>
        <div style={{
          background: 'rgba(15,23,42,0.8)',
          border: `1px solid ${STATUS_COLORS[worker.status]}`,
          borderRadius: '8px',
          padding: '4px 10px',
          fontSize: '11px',
          color: '#e2e8f0',
          fontFamily: 'monospace',
          whiteSpace: 'nowrap',
          backdropFilter: 'blur(4px)',
        }}>
          {STATUS_EMOJI[worker.status]} {worker.status}
          {worker.progress && worker.progress > 0 ? ` ${Math.round(worker.progress * 100)}%` : ''}
        </div>
      </Html>
    </group>
  );
}
