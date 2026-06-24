# PicksZone - Sports Predictions & Prop Betting Platform

## Original Problem Statement (ES)
Usuario solicitó una app inspirada en BetsWall (Google Play) con: sección de pronósticos para caballos / fútbol europeo / béisbol / loterías; sección de mercados prop (over/under goles, empate, faltas, tarjetas rojas) con apuestas en coins virtuales; auth email + Google; métodos de pago editables en admin (Zelle, Stripe, otros, ampliables); notificaciones push web; banners publicitarios CRUD por zona; admin completo. Frontend moderno pero intuitivo, bilingüe ES/EN. Recargas mínimo $20 / máximo $7,000 USD.

## Architecture
- **Backend**: FastAPI + Motor (MongoDB) + bcrypt + PyJWT + pywebpush (VAPID)
- **Frontend**: React 19 + React Router 7 + TailwindCSS + Phosphor Icons
- **Fonts**: Barlow Condensed (display) · Manrope (body) · JetBrains Mono (data)
- **Theme**: Dark "Performance Pro" — Obsidian #050505, Neon Lime #D4FF00, Volt Blue #007AFF
- **Auth**: JWT cookies httpOnly (access 12h / refresh 7d) + Emergent Google OAuth (session_token cookie)
- **Push**: Web Push via VAPID keys (registered service worker `/sw.js`)
- **i18n**: Context-based ES/EN with toggle in header

## User Personas
- **Bettor**: Browse picks/markets, bet with virtual coins, request recharges, track P/L
- **Tipster (admin-promoted)**: Future — community picks
- **Admin**: Manage everything from `/admin` panel

## Core Requirements (static)
1. Predictions feed filterable by sport (football/horse/baseball/lottery)
2. Prop markets with virtual coins (over/under, draw, fouls, red cards, custom)
3. Recharge system with admin approval (1 USD = 100 coins, $20-$7000 range)
4. Dynamic payment methods (Zelle, Stripe placeholder, Binance, custom — config JSON editable)
5. Banners CRUD by zone (hero/sidebar/feed/footer) with on/off toggle
6. Web push notifications (admin-sent to all or specific user)
7. Bilingual ES/EN
8. User ranking by net profit

## Implemented (2026-05-03 / 2026-06-24)
### Backend (`/app/backend/server.py`)
- Auth: `/api/auth/{register,login,logout,me,language}`, Google session at `/api/auth/google/session`
- **Welcome bonus**: +100 coins on register (both email and Google signups)
- **Daily streak system**: `GET /api/streak/status` + `POST /api/streak/claim` (idempotent per UTC day). Rewards: D1=10, D3=30, D7=75, D14=150, D30=500, other days=5
- **Bet of the Day**: `GET /api/bet-of-the-day` returns one featured pick deterministically per UTC day (cached in `botd_cache` collection)
- Public: `/api/predictions`, `/api/markets`, `/api/banners`, `/api/payment-methods`, `/api/ranking`
- Bets: `POST /api/bets` (deducts coins), `GET /api/bets/me`
- Recharges: `POST /api/recharges`, `GET /api/recharges/me`
- Push: `GET /api/push/public-key`, `POST /api/push/subscribe`
- Admin: full CRUD for predictions, markets (with settle that pays winners + refunds void), payment methods, banners, recharges (approve/reject), users (role/coins), notifications send, metrics dashboard
- **Odds API integration**: sync auto cada 12h (La Liga + MLB), settle **MANUAL ONLY** via admin button (no consume cuota inesperada). Auto-imports events + creates predictions (best home moneyline) + 2 markets per event (1X2 result + Over/Under totals). Push notifications a usuarios cuando se liquida su apuesta.
- VAPID keys generated and stored in backend `.env`
- MongoDB indexes on email/user_id/market_id/banner_id/etc

### Frontend
- 11 pages: Home, Predictions, PredictionDetail, Markets, Ranking, Wallet, Profile, Login, Register, AuthCallback, Admin (with 8 tabs)
- Layout with sticky header, mobile menu, language toggle, balance pill, footer banner zone
- Responsive cards: PredictionCard, MarketCard with live bet placement
- Banner component for 4 zones (hero, sidebar, feed, footer)
- Service worker for push notifications

### Testing
- Backend: 24/24 tests passed (testing agent iteration_1) covering auth, content, bets/settle (won/void payouts verified), recharge approve/reject, CRUD, validation, serialization (no Mongo `_id` leaks), admin authorization
- Frontend: smoke tested — login → admin redirects correctly, metrics load with real data, markets page shows banner + market cards

## Default Seed
- Admin: `admin@pickszone.com` / `Admin1234!`
- 3 payment methods seeded (Zelle, Stripe placeholder, Binance Pay)
- 1 hero banner seeded

## Backlog (P0/P1/P2)
### P1
- Stripe Checkout activation (placeholder ready, needs API keys via admin → live endpoint)
- Image upload for banners/predictions (currently URL-only)
- Recharge proof image upload (currently URL-only)
- Tipster-published picks (community, with verification flag)

### P2
- Live odds feed integration (API-Football / Odds API)
- Native mobile app wrapper / PWA install prompt
- Affiliate / referral system
- Multi-currency support
- Bet streaks badges, achievements
- Email notifications via SendGrid/Resend (in addition to push)

## Next Action Items
- Configure Stripe API keys from admin panel when ready to monetize
- Add actual sports data feed for live markets
- Set up Cloudflare/CDN cache rules for banner images
