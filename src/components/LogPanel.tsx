import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { RoundedBox, Text, Html } from '@react-three/drei';
import * as THREE from 'three';
import type { LogEntry } from '../types';

interface LogPanelProps {
  logs: LogEntry[];
}

const LEVEL_COLORS: Record<string, string> = {
  info: '#22c55e',
  warn: '#f59e0b',
  error: '#ef4444',
  debug: '#6366f1',
};

function LogLine({ entry, index }: { entry: LogEntry; index: number }) {
  const ts = new Date(entry.ts).toLocaleTimeString('es-CO', { hour12: false });
  const color = LEVEL_COLORS[entry.level] || '#94a3b8';

  return (
    <Html
      position={[0, -0.35 - index * 0.3, 0.01]}
      center
      style={{ pointerEvents: 'none' }}
      distanceFactor={2}
    >
      <div style={{
        color: '#cbd5e1',
        fontSize: '10px',
        fontFamily: 'monospace',
        background: 'transparent',
        lineHeight: '1.4',
        whiteSpace: 'nowrap',
        maxWidth: '400px',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
      }}>
        <span style={{ color: '#64748b' }}>{ts}</span>
        {' · '}
        <span style={{ color }}>{entry.text}</span>
      </div>
    </Html>
  );
}

export function LogPanel({ logs }: LogPanelProps) {
  const recentLogs = useMemo(() => logs.slice(-15).reverse(), [logs]);

  return (
    <group position={[0, -0.5, -2.5]}>
      {/* Screen frame */}
      <RoundedBox args={[3.2, 5.5, 0.08]} radius={0.05}>
        <meshStandardMaterial
          color="#0f172a"
          metalness={0.8}
          roughness={0.2}
        />
      </RoundedBox>

      {/* Screen bezel */}
      <RoundedBox args={[3.0, 5.3, 0.1]} radius={0.03} position={[0, 0, 0.05]}>
        <meshStandardMaterial
          color="#1e293b"
          metalness={0.5}
          roughness={0.5}
        />
      </RoundedBox>

      {/* Header */}
      <Text
        position={[0, 2.4, 0.1]}
        fontSize={0.12}
        color="#38bdf8"
        anchorX="center"
        anchorY="top"
        font="/fonts/Geist-Regular.woff"
      >
        ─ LOG ACTIVITY ─
      </Text>

      {/* Log lines */}
      {recentLogs.map((entry, i) => (
        <LogLine key={`${entry.ts}-${i}`} entry={entry} index={i} />
      ))}

      {/* Footer with scroll hint */}
      <Text
        position={[0, -2.6, 0.1]}
        fontSize={0.07}
        color="#334155"
        anchorX="center"
        anchorY="bottom"
      >
        {recentLogs.length} entries · scrolls auto
      </Text>
    </group>
  );
}
