# PicksZone

Plataforma de pronósticos deportivos y mercados prop con coins virtuales, panel admin completo y pagos vía Stripe.

**Stack**: React 19 · FastAPI · MongoDB · Tailwind · Docker

---

## ✨ Features
- 🎯 **Pronósticos** filtrables por deporte (Fútbol, Caballos, Béisbol, Lotería)
- ⚡ **Mercados Prop** con coins virtuales (Over/Under, 1X2, faltas, tarjetas)
- 🔐 **Auth**: email/JWT + Google OAuth (Emergent)
- 💳 **Pagos**: Zelle, Binance, Stripe Checkout (con webhook), métodos editables desde admin
- 🎁 **Engagement**: bono de bienvenida, racha diaria, "Bet of the Day"
- 🏆 **Ranking** de jugadores por P/L
- 🔔 **Web Push notifications** (VAPID)
- 🌍 **Bilingüe ES/EN**
- 📊 **Admin panel** completo: predicciones, mercados, banners, recargas, usuarios, push, bonos, settings de Stripe y Odds API
- 🔄 **Auto-sync** de eventos y cuotas desde [The Odds API](https://the-odds-api.com) (gratis 500 req/mes)
- 🧾 **Auto-settle** de mercados con resultados reales

---

## 🚀 Despliegue en VPS de Hostinger (recomendado)

### Requisitos previos
- VPS con Ubuntu 22.04+ (Hostinger ofrece KVM 1+, 2 GB RAM mínimo)
- Dominio apuntando a la IP de tu VPS (Hostinger → hPanel → DNS)
- Acceso SSH como root o usuario con sudo

### Paso 1 — Instalar Docker y dependencias

```bash
# Conéctate por SSH
ssh root@TU_IP_VPS

# Instala Docker y docker-compose
curl -fsSL https://get.docker.com | sh
apt-get install -y docker-compose-plugin git

# Verifica
docker --version
docker compose version
```

### Paso 2 — Clonar el repo

```bash
cd /opt
git clone https://github.com/TU_USUARIO/pickszone.git
cd pickszone
```

### Paso 3 — Configurar variables de entorno

```bash
# Copia los templates
cp .env.example .env
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env

# Edita cada uno y rellena los valores reales
nano .env              # PUBLIC_URL=https://tudominio.com
nano backend/.env      # JWT_SECRET, VAPID, ODDS_API_KEY, STRIPE...
nano frontend/.env     # REACT_APP_BACKEND_URL=https://tudominio.com
```

Genera el `JWT_SECRET`:
```bash
docker run --rm python:3.11-slim python -c "import secrets; print(secrets.token_hex(32))"
```

Genera las VAPID keys (para push notifications):
```bash
docker run --rm python:3.11-slim sh -c "pip install py_vapid cryptography >/dev/null && python -c \"
from py_vapid import Vapid01
import base64
from cryptography.hazmat.primitives.serialization import Encoding, PublicFormat, PrivateFormat, NoEncryption
v=Vapid01(); v.generate_keys()
pub=base64.urlsafe_b64encode(v.public_key.public_bytes(Encoding.X962, PublicFormat.UncompressedPoint)).rstrip(b'=').decode()
priv_pem=v.private_key.private_bytes(Encoding.PEM, PrivateFormat.PKCS8, NoEncryption()).decode()
print('VAPID_PUBLIC_KEY=' + pub)
print('VAPID_PRIVATE_KEY_B64=' + base64.b64encode(priv_pem.encode()).decode())
\""
```

### Paso 4 — Configurar el proxy nginx

```bash
# Reemplaza YOUR_DOMAIN por tu dominio real
sed -i 's/YOUR_DOMAIN/tudominio.com/g' proxy/nginx.conf
```

### Paso 5 — Generar certificado SSL con Let's Encrypt

```bash
# 1) Levanta primero solo el proxy en modo HTTP (sin SSL)
# Comenta temporalmente el bloque "server { listen 443 ssl ... }" del proxy/nginx.conf
# y deja solo el bloque HTTP

# 2) Instala certbot
apt-get install -y certbot

# 3) Solicita el certificado
mkdir -p proxy/letsencrypt
certbot certonly --webroot -w ./proxy/letsencrypt -d tudominio.com -d www.tudominio.com \
  --email tu_email@correo.com --agree-tos --no-eff-email

# 4) Copia los certificados al volumen del proxy
mkdir -p proxy/certs
cp /etc/letsencrypt/live/tudominio.com/fullchain.pem proxy/certs/
cp /etc/letsencrypt/live/tudominio.com/privkey.pem proxy/certs/

# 5) Restaura el bloque HTTPS en proxy/nginx.conf
```

> **Tip**: configura un cron para renovar el certificado cada 60 días:  
> `0 3 1 */2 * certbot renew && cp /etc/letsencrypt/live/tudominio.com/*.pem /opt/pickszone/proxy/certs/ && docker compose restart proxy`

### Paso 6 — Levantar todo

```bash
cd /opt/pickszone
docker compose up -d --build
```

Verifica el estado:
```bash
docker compose ps
docker compose logs -f backend
```

### Paso 7 — Acceder
- **Frontend**: https://tudominio.com
- **Admin**: https://tudominio.com/login → usa el email/contraseña que pusiste en `ADMIN_EMAIL` / `ADMIN_PASSWORD`

### Paso 8 — Configurar Stripe (opcional, para pagos con tarjeta)
1. Ve a https://dashboard.stripe.com/apikeys y copia tus 3 claves
2. En tu app: admin → **Métodos de pago** → editar **Stripe** → pegar las claves
3. En Stripe Dashboard → Developers → Webhooks → "Add endpoint"
4. URL del endpoint: `https://tudominio.com/api/webhook/stripe`
5. Eventos: `checkout.session.completed`
6. Copia el "Signing secret" (`whsec_...`) y pégalo también en admin
7. ¡Listo! Los pagos con tarjeta funcionarán automáticamente

---

## 🛠️ Desarrollo local

```bash
# Backend
cd backend
pip install -r requirements.txt
uvicorn server:app --reload --port 8001

# Frontend (en otra terminal)
cd frontend
yarn install
yarn start
```

MongoDB local: `brew install mongodb-community` (Mac) o `apt install -y mongodb` (Linux).

---

## 📁 Estructura del repo

```
pickszone/
├── backend/              # FastAPI + Motor
│   ├── server.py        # toda la API
│   ├── requirements.txt
│   ├── Dockerfile
│   └── .env.example
├── frontend/            # React + Tailwind
│   ├── src/
│   ├── public/
│   ├── package.json
│   ├── Dockerfile
│   ├── nginx.conf
│   └── .env.example
├── proxy/               # reverse proxy (terminación TLS)
│   ├── nginx.conf
│   ├── certs/          # certificados Let's Encrypt
│   └── letsencrypt/    # challenge ACME
├── docker-compose.yml
├── .env.example
└── README.md
```

---

## 🔧 Comandos útiles

```bash
# Ver logs
docker compose logs -f backend
docker compose logs -f frontend
docker compose logs -f proxy

# Reiniciar un servicio
docker compose restart backend

# Reconstruir después de un git pull
git pull
docker compose up -d --build

# Backup de MongoDB
docker compose exec mongo mongodump --archive=/data/db/backup.gz --gzip
docker compose cp mongo:/data/db/backup.gz ./backup-$(date +%Y%m%d).gz

# Acceso al shell de MongoDB
docker compose exec mongo mongosh pickszone_db
```

---

## 🔐 Credenciales por defecto

- **Admin**: `admin@pickszone.com` / `Admin1234!` (CÁMBIALAS en producción editando `backend/.env`)

---

## 📡 APIs externas usadas

| Servicio | Para qué | Plan free |
|---|---|---|
| [The Odds API](https://the-odds-api.com) | Cuotas y resultados | 500 req/mes |
| Stripe | Pagos con tarjeta | 2.9% + $0.30 por transacción |
| Emergent Google Auth | Login social | gratis |

---

## ⚖️ Licencia

Privado. Todos los derechos reservados.
