#!/bin/bash
# ClawOffice Bridge Launcher
# Inicia o reinicia el Hermes Bridge en localhost:4099

BRIDGE_DIR="$HOME/Dev/clawoffice/server"
LOG_FILE="$HOME/.hermes/logs/bridge.log"

echo "🔄 Hermes Bridge — Starting..."
cd "$BRIDGE_DIR" || { echo "❌ No se encuentra $BRIDGE_DIR"; exit 1; }

# Matar instancia previa si existe
PID=$(lsof -ti:4099 2>/dev/null)
if [ -n "$PID" ]; then
  echo "   Matando proceso existente (PID: $PID)..."
  kill "$PID" 2>/dev/null
  sleep 1
fi

# Iniciar
HERMES_HOME="$HOME/.hermes" \
WS_PORT=4099 \
POLL_INTERVAL=2000 \
node index.js >> "$LOG_FILE" 2>&1 &
BRIDGE_PID=$!
echo "   PID: $BRIDGE_PID"

# Esperar a que arranque
sleep 2
if curl -sf http://localhost:4099/health > /dev/null 2>&1; then
  echo "✅ Bridge running on http://localhost:4099"
  echo "   State:  http://localhost:4099/state"
  echo "   Log:    $LOG_FILE"
else
  echo "❌ Bridge failed to start — check log"
  tail -5 "$LOG_FILE"
  exit 1
fi
