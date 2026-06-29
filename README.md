# BetRex.app

Plataforma de pronósticos deportivos y mercados prop con coins virtuales, panel admin completo y pagos vía Stripe.

**Stack**: React 19 · FastAPI · MongoDB · Docker

---

## 🚀 Despliegue en tu VPS (Hostinger) → `betrex.app`

Tu VPS ya tiene varios servicios corriendo, por lo que **BetRex se despliega en el puerto interno 8081** (libre) y tu reverse proxy del VPS (Nginx Proxy Manager u otro) redirige `betrex.app` a ese puerto. No tocamos los puertos 80/443 que ya tienes ocupados.

### Puertos que usaremos (todos libres en tu VPS)
- **8081** → proxy interno de BetRex (expuesto al host)
- Mongo + backend + frontend → solo en la red interna de Docker (no exponen puertos al host)

### Paso 1 — SSH a tu VPS

```bash
ssh root@TU_IP_VPS
```

### Paso 2 — Instalar Docker (si no lo tienes)

```bash
curl -fsSL https://get.docker.com | sh
apt-get install -y docker-compose-plugin git
```

### Paso 3 — Clonar el repo

```bash
cd /opt
git clone https://github.com/TU_USUARIO/betrex.git
cd betrex
```

### Paso 4 — Configurar las variables de entorno

```bash
cp .env.example .env
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
nano backend/.env
```

Genera tu **JWT_SECRET**:
```bash
docker run --rm python:3.11-slim python -c "import secrets; print(secrets.token_hex(32))"
```

Genera tus **VAPID keys** (para push notifications):
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

Pega ambos valores en `backend/.env`. Edita también:
- `ADMIN_PASSWORD` (¡cámbiala!)
- `ODDS_API_KEY` (gratis en https://the-odds-api.com — ya tienes una: `1b9c7ffc3d0e88f65a2d89823be9bb19`)

### Paso 5 — Configurar el dominio

En tu panel de Hostinger → DNS → apunta el A record de `betrex.app` y `www.betrex.app` a la IP de tu VPS.

### Paso 6 — Levantar todo

```bash
docker compose up -d --build
```

Verifica:
```bash
docker compose ps
docker compose logs -f backend
```

Deberías ver: `betrex_mongo`, `betrex_backend`, `betrex_frontend`, `betrex_proxy` → todos "Up".

### Paso 7 — Configurar tu reverse proxy del VPS

Tu VPS usa un proxy en puertos 80/443 (probablemente Nginx Proxy Manager, Caddy o Apache).

**Opción A — Si usas Nginx Proxy Manager** (lo más probable, va en :81/:9443):
1. Abre el panel del NPM
2. **Proxy Hosts** → "Add Proxy Host"
3. Configura:
   - Domain Names: `betrex.app`, `www.betrex.app`
   - Scheme: `http`
   - Forward Hostname / IP: `127.0.0.1`
   - Forward Port: `8081`
   - ✅ Cache Assets
   - ✅ Block Common Exploits
   - ✅ Websockets Support
4. Pestaña **SSL**: Request a new SSL Certificate (Let's Encrypt), marca "Force SSL" y "HTTP/2"
5. Guardar → ¡Listo!

**Opción B — Si usas nginx directo en el host**:

```bash
cat > /etc/nginx/sites-available/betrex.app <<'EOF'
server {
    listen 80;
    server_name betrex.app www.betrex.app;
    location / {
        proxy_pass http://127.0.0.1:8081;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
EOF
ln -s /etc/nginx/sites-available/betrex.app /etc/nginx/sites-enabled/
nginx -t && systemctl reload nginx
certbot --nginx -d betrex.app -d www.betrex.app
```

### Paso 8 — Acceder
- 🌍 **App**: https://betrex.app
- 🔐 **Admin**: https://betrex.app/login → `admin@betrex.app` / la contraseña que pusiste en `ADMIN_PASSWORD`

### Paso 9 (opcional) — Stripe
1. https://dashboard.stripe.com/apikeys → copia tus 3 claves
2. En BetRex: admin → **Métodos de pago** → editar **Stripe** → pegar las claves
3. En Stripe Dashboard → Webhooks → "Add endpoint":
   - URL: `https://betrex.app/api/webhook/stripe`
   - Events: `checkout.session.completed`
4. Copia el "Signing secret" → pégalo también en admin BetRex

---

## 🔧 Comandos útiles

```bash
# Logs
docker compose logs -f backend
docker compose logs -f proxy

# Reiniciar
docker compose restart backend

# Actualizar tras un git pull
git pull && docker compose up -d --build

# Backup MongoDB
docker compose exec mongo mongodump --archive=/data/db/backup.gz --gzip
docker compose cp mongo:/data/db/backup.gz ./backup-$(date +%Y%m%d).gz

# Cambiar el puerto interno (si 8081 te molesta)
echo "PROXY_PORT=9000" >> .env
docker compose up -d
# luego actualiza tu reverse proxy para apuntar a 127.0.0.1:9000
```

---

## 🛠️ Desarrollo local

```bash
# Backend
cd backend
pip install -r requirements.txt
uvicorn server:app --reload --port 8001

# Frontend
cd frontend
yarn install
yarn start
```

---

## 📁 Estructura

```
betrex/
├── backend/              # FastAPI
│   ├── server.py
│   ├── requirements.txt
│   ├── Dockerfile
│   └── .env.example
├── frontend/             # React + Tailwind
│   ├── src/
│   ├── public/
│   │   ├── logo.png      # Logo principal
│   │   ├── icon-192.png
│   │   ├── icon-512.png
│   │   ├── manifest.json # PWA manifest
│   │   └── sw.js         # Service worker (push)
│   ├── Dockerfile
│   ├── nginx.conf
│   └── .env.example
├── proxy/
│   └── nginx-app.conf    # Proxy interno backend+frontend
├── docker-compose.yml
├── .env.example
└── README.md
```

---

## 🔐 Credenciales por defecto

- Admin: `admin@betrex.app` / `Admin1234!` (**cambia el password en `backend/.env` antes de desplegar**)

---

## 📡 APIs externas

| Servicio | Para qué | Plan free |
|---|---|---|
| The Odds API | Cuotas reales + resultados (La Liga, MLB) | 500 req/mes |
| Stripe | Pagos con tarjeta | 2.9% + $0.30 por transacción |
| Emergent Google Auth | Login social con Google | gratis |

---

## 📱 Pasar a Google Play (TWA)

Una vez la web esté en https://betrex.app funcionando, puedes empaquetarla como app Android con [Bubblewrap](https://github.com/GoogleChromeLabs/bubblewrap):

```bash
npm install -g @bubblewrap/cli
bubblewrap init --manifest=https://betrex.app/manifest.json
bubblewrap build
# sube el .aab a Google Play Console ($25 una sola vez)
```

⚠️ **Ojo**: Google Play tiene políticas estrictas con apps de apuestas. Asegúrate de dejar claro que los coins son virtuales y sin valor monetario.

---

## ⚖️ Licencia

Privado. Todos los derechos reservados.
