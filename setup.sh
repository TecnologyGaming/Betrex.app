#!/usr/bin/env bash
# BetRex.app - Setup script
# Run this ONCE on your VPS after `git clone` to generate the .env files.
# Usage:  bash setup.sh

set -e

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR"

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${GREEN}====================================${NC}"
echo -e "${GREEN}  BetRex.app — Setup configurator${NC}"
echo -e "${GREEN}====================================${NC}"
echo ""

# 1) Check docker
if ! command -v docker >/dev/null 2>&1; then
  echo -e "${RED}❌ Docker no está instalado.${NC}"
  echo "   Instálalo con: curl -fsSL https://get.docker.com | sh"
  exit 1
fi
echo -e "${GREEN}✓ Docker detectado${NC}"

# 2) Ask domain
DEFAULT_DOMAIN="https://betrex.app"
read -p "🌐 URL pública de tu app [${DEFAULT_DOMAIN}]: " PUBLIC_URL
PUBLIC_URL=${PUBLIC_URL:-$DEFAULT_DOMAIN}

# 3) Ask proxy port
DEFAULT_PORT="8081"
read -p "🔌 Puerto interno del proxy (libre en tu VPS) [${DEFAULT_PORT}]: " PROXY_PORT
PROXY_PORT=${PROXY_PORT:-$DEFAULT_PORT}

# 4) Ask admin password
while true; do
  read -s -p "🔐 Contraseña para admin@betrex.app (mínimo 8 chars): " ADMIN_PW
  echo ""
  if [ ${#ADMIN_PW} -lt 8 ]; then
    echo -e "${YELLOW}   La contraseña debe tener al menos 8 caracteres.${NC}"
    continue
  fi
  read -s -p "🔐 Confírmala: " ADMIN_PW2
  echo ""
  if [ "$ADMIN_PW" != "$ADMIN_PW2" ]; then
    echo -e "${YELLOW}   No coinciden, intenta de nuevo.${NC}"
    continue
  fi
  break
done

# 5) Ask Odds API key
DEFAULT_ODDS="1b9c7ffc3d0e88f65a2d89823be9bb19"
read -p "🎯 Odds API key [${DEFAULT_ODDS}]: " ODDS_KEY
ODDS_KEY=${ODDS_KEY:-$DEFAULT_ODDS}

echo ""
echo -e "${GREEN}⚙️  Generando claves seguras...${NC}"

# 6) Generate JWT secret
JWT_SECRET=$(docker run --rm python:3.11-slim python -c "import secrets; print(secrets.token_hex(32))")

# 7) Generate VAPID keys
VAPID_OUT=$(docker run --rm python:3.11-slim sh -c "pip install py_vapid cryptography >/dev/null 2>&1 && python -c \"
from py_vapid import Vapid01
import base64
from cryptography.hazmat.primitives.serialization import Encoding, PublicFormat, PrivateFormat, NoEncryption
v=Vapid01(); v.generate_keys()
pub=base64.urlsafe_b64encode(v.public_key.public_bytes(Encoding.X962, PublicFormat.UncompressedPoint)).rstrip(b'=').decode()
priv_pem=v.private_key.private_bytes(Encoding.PEM, PrivateFormat.PKCS8, NoEncryption()).decode()
print(pub + '|' + base64.b64encode(priv_pem.encode()).decode())
\"")
VAPID_PUB=$(echo "$VAPID_OUT" | tr -d '\r' | cut -d'|' -f1)
VAPID_PRIV_B64=$(echo "$VAPID_OUT" | tr -d '\r' | cut -d'|' -f2)

# Extract host for contact email
DOMAIN_HOST=$(echo "$PUBLIC_URL" | sed -E 's|https?://||' | sed 's|/.*$||')

# 8) Write root .env
cat > .env <<EOF
PUBLIC_URL=${PUBLIC_URL}
PROXY_PORT=${PROXY_PORT}
DB_NAME=betrex_db
EOF
echo -e "${GREEN}✓ Creado ./.env${NC}"

# 9) Write backend/.env
cat > backend/.env <<EOF
MONGO_URL=mongodb://mongo:27017
DB_NAME=betrex_db
CORS_ORIGINS=*
JWT_SECRET=${JWT_SECRET}
ADMIN_EMAIL=admin@${DOMAIN_HOST}
ADMIN_PASSWORD=${ADMIN_PW}
VAPID_PUBLIC_KEY=${VAPID_PUB}
VAPID_PRIVATE_KEY_B64=${VAPID_PRIV_B64}
VAPID_CONTACT_EMAIL=mailto:admin@${DOMAIN_HOST}
ODDS_API_KEY=${ODDS_KEY}
STRIPE_API_KEY=
STRIPE_PUBLISHABLE_KEY=
STRIPE_WEBHOOK_SECRET=
EOF
echo -e "${GREEN}✓ Creado ./backend/.env${NC}"

# 10) Write frontend/.env
cat > frontend/.env <<EOF
REACT_APP_BACKEND_URL=${PUBLIC_URL}
WDS_SOCKET_PORT=443
ENABLE_HEALTH_CHECK=false
EOF
echo -e "${GREEN}✓ Creado ./frontend/.env${NC}"

echo ""
echo -e "${GREEN}====================================${NC}"
echo -e "${GREEN}  ✅ Configuración completa${NC}"
echo -e "${GREEN}====================================${NC}"
echo ""
echo "Próximo paso:"
echo -e "  ${YELLOW}docker compose up -d --build${NC}"
echo ""
echo "Luego configura tu reverse proxy del VPS (Nginx Proxy Manager) para"
echo "redirigir ${DOMAIN_HOST} → http://127.0.0.1:${PROXY_PORT}"
echo ""
echo "Acceso al admin:"
echo "  URL: ${PUBLIC_URL}/login"
echo "  Email: admin@${DOMAIN_HOST}"
echo "  Password: (la que acabas de configurar)"
echo ""
