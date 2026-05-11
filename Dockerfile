# ──────────────────────────────────────────────
# ClawOffice — Hermes Agent Visual Dashboard
# Multi-stage build: Node → Nginx → Easypanel
# ──────────────────────────────────────────────

# === Stage 1: Build ===
FROM node:20-alpine AS builder
WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev && \
    npm cache clean --force

COPY tsconfig.json vite.config.js index.html ./
COPY public/ public/
COPY src/ src/

ARG VITE_HERMES_WS
ARG VITE_POLL_INTERVAL=3000
ENV VITE_HERMES_WS=$VITE_HERMES_WS
ENV VITE_POLL_INTERVAL=$VITE_POLL_INTERVAL

RUN npx vite build

# === Stage 2: Serve ===
FROM nginx:alpine AS runner
RUN apk add --no-cache curl

# Copy build output
COPY --from=builder /app/dist /usr/share/nginx/html

# Nginx config: SPA fallback + gzip + security headers
RUN printf '%s\n' 'server {' \
    '    listen 80;' \
    '    gzip on;' \
    '    gzip_types text/plain text/css application/json application/javascript image/svg+xml;' \
    '    add_header X-Frame-Options "SAMEORIGIN" always;' \
    '    add_header X-Content-Type-Options "nosniff" always;' \
    '    add_header Referrer-Policy "strict-origin-when-cross-origin" always;' \
    '    location / {' \
    '        root /usr/share/nginx/html;' \
    '        index index.html;' \
    '        try_files $uri $uri/ /index.html;' \
    '    }' \
    '    location /health {' \
    '        access_log off;' \
    '        return 200 "healthy\n";' \
    '        add_header Content-Type text/plain;' \
    '    }' \
    '}' > /etc/nginx/conf.d/default.conf

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=2 \
    CMD curl -f http://localhost/health || exit 1

USER nginx
CMD ["nginx", "-g", "daemon off;"]
