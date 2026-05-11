import React, { useMemo } from 'react';
import { Text, Html } from '@react-three/drei';
import { useHermesState } from '../hooks/useHermesState';
import { WorkerNode } from '../components/WorkerNode';
import { LogPanel } from '../components/LogPanel';
import { Scene } from '../components/Scene';
import type { HermesStatus } from '../types';

export function ClawOffice() {
  const state = useHermesState();

  // Posicionar workers en un círculo
  const workerPositions = useMemo(() => {
    const count = Math.max(state.workers.length, 1);
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
      <Scene connected={state.connected} status={state.status} />

      {/* Workers */}
      {state.workers.map((worker, i) => (
        <WorkerNode
          key={worker.id}
          worker={worker}
          position={workerPositions[i]}
        />
      ))}

      {/* Center hub: Hermes core */}
      <CenterHub status={state.status} session={state.session} />

      {/* Log panel (floating screen) */}
      {state.logs.length > 0 && <LogPanel logs={state.logs} />}

      {/* Connection indicator */}
      <Html position={[0, 3.5, -3]} center style={{ pointerEvents: 'none' }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          fontSize: '10px',
          color: '#64748b',
          fontFamily: 'monospace',
        }}>
          <span style={{
            width: 6,
            height: 6,
            borderRadius: '50%',
            background: state.connected ? '#22c55e' : '#ef4444',
            boxShadow: state.connected
              ? '0 0 6px rgba(34,197,94,0.6)'
              : '0 0 6px rgba(239,68,68,0.6)',
          }} />
          {state.connected ? 'CONNECTED' : 'DISCONNECTED'}
          {' · '}v{state.hermesVersion}
        </div>
      </Html>
    </>
  );
}

function CenterHub({ status, session }: { status: HermesStatus; session: { title: string; totalMessages: number } | null }) {
  const statusColor = status === 'executing' ? '#22c55e'
    : status === 'thinking' ? '#f59e0b'
    : status === 'error' ? '#ef4444'
    : status === 'waiting' ? '#6366f1'
    : '#4a5568';

  return (
    <group position={[0, 0, 0]}>
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
            {status.toUpperCase()}
          </div>
          {session && (
            <div style={{
              fontSize: '9px',
              color: '#64748b',
              marginTop: '6px',
              fontFamily: 'monospace',
              maxWidth: '180px',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}>
              {session.title.slice(0, 35)}{session.title.length > 35 ? '…' : ''}
              <br />
              {session.totalMessages} messages
            </div>
          )}
        </div>
      </Html>
    </group>
  );
}
