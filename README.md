# ClawOffice — Hermes Agent Visual Dashboard

Dashboard 3D en tiempo real para visualizar workers, logs y estado del agente Hermes.

## Stack

- **Vite 8** + **React 19** + **TypeScript**
- **Three.js** via `@react-three/fiber` + `@react-three/drei`
- Despliegue: **Easypanel** (Docker multi-stage)

## Estructura

```
src/
├── types.ts                # Tipos compartidos (HermesState, Worker, Logs)
├── hooks/
│   └── useHermesState.ts   # Capa de conexión (WebSocket + polling)
├── components/
│   ├── Scene.tsx           # Entorno 3D (grid, partículas, luces)
│   ├── WorkerNode.tsx      # Worker como objeto 3D animado
│   └── LogPanel.tsx        # Panel flotante de logs
├── scenes/
│   └── ClawOffice.tsx      # Escena principal (hub central + workers)
├── App.tsx                 # Entry point con Canvas + UI overlay
├── main.tsx                # ReactDOM mount
└── index.css               # Global styles
```

## Desarrollo

```bash
npm install
npm run dev
```

## Variables de entorno

| Variable | Default | Descripción |
|----------|---------|-------------|
| `VITE_HERMES_WS` | `''` | WebSocket endpoint (ej: `ws://localhost:11434/api/ws`) |
| `VITE_POLL_INTERVAL` | `3000` | ms entre polling (mock si no hay WS) |

## Conexión con Hermes

El hook `useHermesState` soporta dos modos:

1. **WebSocket** — conexión persistente si `VITE_HERMES_WS` está configurado
2. **Polling** — fallback automático con estado mock para desarrollo/demo

El estado mock simula workers recorriendo estados `idle → thinking → executing → thinking → idle` en un loop para visualizar las animaciones 3D.

## Mapeo visual Workers → objetos 3D

| Estado | Animación | Color |
|--------|-----------|-------|
| `idle` | Quieto, pulso suave | Gris (#4a5568) |
| `thinking` | Púlsa (escala oscilante), anillo gira lento | Ámbar (#f59e0b) |
| `executing` | Pulso rápido, anillo gira rápido, arco de progreso | Verde (#22c55e) |
| `error` | Brillo rojo constante | Rojo (#ef4444) |
| `waiting` | Estático | Índigo (#6366f1) |

## Despliegue en Easypanel

```bash
# 1. Push a GitHub
git remote add origin git@github.com:Nelocode/clawoffice.git
git push -u origin main

# 2. Easypanel detecta el Dockerfile automáticamente
#    Webhook deploy: push → build → deploy
#    Puerto: 80
```
