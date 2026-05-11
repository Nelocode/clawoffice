import React, { useMemo } from 'react';
import { useHermesState } from '../hooks/useHermesState';
import { WorkerNode } from '../components/WorkerNode';
import { LogPanel } from '../components/LogPanel';
import { Scene } from '../components/Scene';

interface ClawOfficeProps {
  endpoint?: string;
  pollInterval?: number;
}

export function ClawOffice({ endpoint, pollInterval }: ClawOfficeProps) {
  const { state, connected } = useHermesState({ endpoint, pollInterval });

  // Posicionar workers en un círculo
  const workerPositions = useMemo(() => {
    const count = state.workers.length;
    const radius = 2.2;
    return state.workers.map((_, i) => {
      const angle = (i / count) * Math.PI * 2 - Math.PI / 2;
      return [
        Math.cos(angle) * radius,
        Math.sin(angle) * 0,
        Math.sin(angle) * radius,
      ] as [number, number, number];
    });
  }, [state.workers.length]);

  return (
    <>
      <Scene connected={connected} status={state.status} />

      {/* Workers */}
      {state.workers.map((worker, i) => (
        <WorkerNode
          key={worker.id}
          worker={worker}
          position={workerPositions[i]}
        />
      ))}

      {/* Center hub: Hermes core */}
      <group position={[0, 0, 0]}>
        <CenterHub status={state.status} message={state.message} />
      </group>

      {/* Log panel (floating screen) */}
      <LogPanel logs={state.recentLogs} />
    </>
  );
}

function CenterHub({ status, message }: { status: string; message: string }) {
  const { Html } = require('@react-three/drei');
  const statusColor = status === 'executing' ? '#22c55e' : status === 'thinking' ? '#f59e0b' : '#4a5568';

  return (
    <Html center style={{ pointerEvents: 'none' }} distanceFactor={2}>
      <div style={{
        background: 'rgba(15,23,42,0.9)',
        border: `2px solid ${statusColor}`,
        borderRadius: '12px',
        padding: '12px 20px',
        textAlign: 'center',
        backdropFilter: 'blur(8px)',
        boxShadow: `0 0 20px ${statusColor}40`,
      }}>
        <div style={{
          fontSize: '14px',
          fontWeight: 600,
          color: '#f1f5f9',
          fontFamily: 'monospace',
          letterSpacing: '1px',
        }}>
          ⚡ HERMES AGENT
        </div>
        <div style={{
          fontSize: '11px',
          color: statusColor,
          marginTop: '4px',
          fontFamily: 'monospace',
        }}>
          {status.toUpperCase()} — {message}
        </div>
      </div>
    </Html>
  );
}
