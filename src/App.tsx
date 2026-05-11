import React, { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { Loader, OrbitControls } from '@react-three/drei';
import { ClawOffice } from './scenes/ClawOffice';

// --- Config ---
// En producción, apuntar a:
//   Hermes WebSocket: ws://localhost:11434/api/ws   (Ollama)
//   Hermes REST:      http://localhost:3001/api/state
const WS_ENDPOINT = import.meta.env.VITE_HERMES_WS || '';
const POLL_INTERVAL = Number(import.meta.env.VITE_POLL_INTERVAL) || 3000;

function LoadingFallback() {
  return (
    <div style={{
      width: '100vw',
      height: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#020617',
      color: '#38bdf8',
      fontFamily: 'monospace',
      fontSize: '14px',
      gap: '12px',
    }}>
      <span style={{
        width: '8px',
        height: '8px',
        borderRadius: '50%',
        background: '#38bdf8',
        display: 'inline-block',
        animation: 'pulse 1s ease-in-out infinite',
      }} />
      Loading ClawOffice...
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 0.3; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.3); }
        }
      `}</style>
    </div>
  );
}

export default function App() {
  return (
    <div style={{ width: '100vw', height: '100vh', background: '#020617', overflow: 'hidden' }}>
      <Suspense fallback={<LoadingFallback />}>
        <Canvas
          camera={{ position: [0, 3.5, 6], fov: 50, near: 0.1, far: 100 }}
          dpr={[1, 2]}
          frameloop="always"
          performance={{ min: 0.5 }}
          gl={{
            antialias: true,
            alpha: false,
            powerPreference: 'high-performance',
            failIfMajorPerformanceCaveat: false,
          }}
        >
          {/* Custom controls */}
          <OrbitControls
            enableDamping
            dampingFactor={0.05}
            minDistance={2}
            maxDistance={12}
            maxPolarAngle={Math.PI / 2.1}
            target={[0, 0.5, 0]}
          />

          <ClawOffice
            endpoint={WS_ENDPOINT || undefined}
            pollInterval={POLL_INTERVAL}
          />
        </Canvas>

        <Loader
          containerStyles={{
            background: '#020617',
            fontFamily: 'monospace',
          }}
          innerStyles={{
            color: '#38bdf8',
          }}
          barStyles={{
            background: '#1e293b',
          }}
          dataStyles={{
            color: '#64748b',
          }}
          dataInterpolation={(p) => `Loading ${Math.round(p)}%`}
        />
      </Suspense>

      {/* UI overlay: minimal HUD */}
      <div style={{
        position: 'fixed',
        bottom: 16,
        left: '50%',
        transform: 'translateX(-50%)',
        background: 'rgba(15,23,42,0.7)',
        backdropFilter: 'blur(8px)',
        border: '1px solid #1e293b',
        borderRadius: '8px',
        padding: '6px 16px',
        fontSize: '11px',
        color: '#64748b',
        fontFamily: 'monospace',
        display: 'flex',
        gap: '16px',
        alignItems: 'center',
      }}>
        <span>🖱️ Drag to orbit</span>
        <span>·</span>
        <span>🔄 Scroll to zoom</span>
        <span>·</span>
        <span style={{ color: '#38bdf8' }}>ClawOffice v0.1</span>
      </div>
    </div>
  );
}
