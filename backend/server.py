"""PicksZone backend - FastAPI + MongoDB."""
from dotenv import load_dotenv
from pathlib import Path
ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

import os
import uuid
import json
import base64
import logging
import bcrypt
import jwt
import requests
from datetime import datetime, timezone, timedelta
from typing import List, Optional, Literal, Any, Dict

from fastapi import FastAPI, APIRouter, HTTPException, Request, Response, Depends, Query
from fastapi.responses import JSONResponse
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field, EmailStr, ConfigDict

from pywebpush import webpush, WebPushException

# ----------------------- Setup -----------------------
JWT_SECRET = os.environ["JWT_SECRET"]
JWT_ALGO = "HS256"
ADMIN_EMAIL = os.environ.get("ADMIN_EMAIL", "admin@pickszone.com")
ADMIN_PASSWORD = os.environ.get("ADMIN_PASSWORD", "Admin1234!")
VAPID_PUBLIC = os.environ["VAPID_PUBLIC_KEY"]
VAPID_PRIVATE_PEM = base64.b64decode(os.environ["VAPID_PRIVATE_KEY_B64"]).decode()
VAPID_CONTACT = os.environ.get("VAPID_CONTACT_EMAIL", "mailto:admin@pickszone.com")
ODDS_API_KEY = os.environ.get("ODDS_API_KEY", "")
ODDS_API_BASE = "https://api.the-odds-api.com/v4"

# Default sport keys we sync (mapped to our internal sports)
ODDS_SPORT_MAP = {
    "soccer_epl": "football",
    "soccer_spain_la_liga": "football",
    "soccer_italy_serie_a": "football",
    "soccer_germany_bundesliga": "football",
    "soccer_france_ligue_one": "football",
    "soccer_uefa_champs_league": "football",
    "baseball_mlb": "baseball",
}

mongo_url = os.environ["MONGO_URL"]
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ["DB_NAME"]]

app = FastAPI(title="PicksZone API")
api = APIRouter(prefix="/api")

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
log = logging.getLogger("pickszone")

# ----------------------- Helpers -----------------------
def now_utc() -> datetime:
    return datetime.now(timezone.utc)


def iso(dt: datetime) -> str:
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.isoformat()


def hash_pw(pw: str) -> str:
    return bcrypt.hashpw(pw.encode(), bcrypt.gensalt()).decode()


def verify_pw(pw: str, h: str) -> bool:
    try:
        return bcrypt.checkpw(pw.encode(), h.encode())
    except Exception:
        return False


def make_jwt(user_id: str, role: str, kind: str = "access") -> str:
    delta = timedelta(days=7) if kind == "refresh" else timedelta(hours=12)
    payload = {"sub": user_id, "role": role, "type": kind,
               "exp": now_utc() + delta, "iat": now_utc()}
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGO)


def decode_jwt(token: str) -> Dict[str, Any]:
    return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGO])


def set_auth_cookies(resp: Response, user_id: str, role: str):
    access = make_jwt(user_id, role, "access")
    refresh = make_jwt(user_id, role, "refresh")
    # samesite none + secure for cross-site preview env
    resp.set_cookie("access_token", access, httponly=True, secure=True,
                    samesite="none", max_age=12 * 3600, path="/")
    resp.set_cookie("refresh_token", refresh, httponly=True, secure=True,
                    samesite="none", max_age=7 * 86400, path="/")


def clear_auth_cookies(resp: Response):
    resp.delete_cookie("access_token", path="/")
    resp.delete_cookie("refresh_token", path="/")
    resp.delete_cookie("session_token", path="/")


async def get_current_user(request: Request) -> dict:
    # Try JWT cookie / bearer first
    token = request.cookies.get("access_token")
    if not token:
        auth = request.headers.get("Authorization", "")
        if auth.startswith("Bearer "):
            token = auth[7:]
    if token:
        try:
            payload = decode_jwt(token)
            if payload.get("type") == "access":
                user = await db.users.find_one({"user_id": payload["sub"]}, {"_id": 0, "password_hash": 0})
                if user:
                    return user
        except jwt.ExpiredSignatureError:
            pass
        except Exception:
            pass

    # Try Emergent session_token cookie
    sess = request.cookies.get("session_token")
    if sess:
        s = await db.user_sessions.find_one({"session_token": sess}, {"_id": 0})
        if s:
            exp = s["expires_at"]
            if isinstance(exp, str):
                exp = datetime.fromisoformat(exp)
            if exp.tzinfo is None:
                exp = exp.replace(tzinfo=timezone.utc)
            if exp > now_utc():
                user = await db.users.find_one({"user_id": s["user_id"]}, {"_id": 0, "password_hash": 0})
                if user:
                    return user

    raise HTTPException(status_code=401, detail="Not authenticated")


async def require_admin(request: Request) -> dict:
    user = await get_current_user(request)
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin only")
    return user


def serialize(doc: dict) -> dict:
    """Strip _id, ensure datetimes are ISO."""
    if not doc:
        return doc
    doc.pop("_id", None)
    doc.pop("password_hash", None)
    for k, v in list(doc.items()):
        if isinstance(v, datetime):
            doc[k] = iso(v)
    return doc


# ----------------------- Models -----------------------
Sport = Literal["football", "horse", "baseball", "lottery"]
MarketType = Literal["over_under_goals", "draw", "fouls", "red_cards", "custom"]


class RegisterIn(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6)
    name: str = Field(min_length=1, max_length=80)


class LoginIn(BaseModel):
    email: EmailStr
    password: str


class PredictionIn(BaseModel):
    sport: Sport
    title: str
    event: str
    pick: str
    odds: float
    stake: int = Field(ge=1, le=10, default=5)
    confidence: int = Field(ge=1, le=5, default=3)
    analysis: str = ""
    starts_at: Optional[str] = None
    image_url: Optional[str] = None


class PredictionStatusIn(BaseModel):
    status: Literal["pending", "won", "lost", "void"]


class MarketOption(BaseModel):
    label: str
    odds: float


class MarketIn(BaseModel):
    sport: Sport
    market_type: MarketType
    title: str
    event: str
    options: List[MarketOption]
    closes_at: Optional[str] = None
    image_url: Optional[str] = None


class MarketSettleIn(BaseModel):
    winning_label: str  # use empty string for void


class BetIn(BaseModel):
    market_id: str
    option_label: str
    coins: int = Field(ge=1)


class PaymentMethodIn(BaseModel):
    name: str
    type: str  # zelle | stripe | paypal | binance | custom
    instructions: str = ""
    account_info: str = ""
    config: Dict[str, Any] = {}
    active: bool = True
    order: int = 0
    icon_url: Optional[str] = None


class BannerIn(BaseModel):
    title: str = ""
    image_url: str
    link_url: str = ""
    zone: Literal["hero", "sidebar", "feed", "footer"]
    active: bool = True
    order: int = 0


class RechargeIn(BaseModel):
    payment_method_id: str
    amount_usd: float = Field(ge=20, le=7000)
    proof_note: str = ""
    proof_url: Optional[str] = None


class RechargeReviewIn(BaseModel):
    action: Literal["approve", "reject"]
    note: str = ""


class PushSubIn(BaseModel):
    endpoint: str
    keys: Dict[str, str]


class NotifyIn(BaseModel):
    title: str
    body: str
    target: Literal["all", "user"] = "all"
    user_id: Optional[str] = None
    url: Optional[str] = None


class LangIn(BaseModel):
    language: Literal["es", "en"]


# ----------------------- Auth Routes -----------------------
@api.post("/auth/register")
async def register(body: RegisterIn, response: Response):
    email = body.email.lower()
    existing = await db.users.find_one({"email": email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    user_id = f"user_{uuid.uuid4().hex[:12]}"
    user = {
        "user_id": user_id,
        "email": email,
        "name": body.name,
        "password_hash": hash_pw(body.password),
        "role": "user",
        "coins_balance": 100,  # welcome bonus
        "language": "es",
        "picture": None,
        "auth_provider": "local",
        "welcome_bonus_granted": True,
        "streak_current": 0,
        "streak_best": 0,
        "last_streak_claim_date": None,
        "created_at": iso(now_utc()),
    }
    await db.users.insert_one(user.copy())
    set_auth_cookies(response, user_id, "user")
    return serialize(user)


@api.post("/auth/login")
async def login(body: LoginIn, response: Response):
    email = body.email.lower()
    user = await db.users.find_one({"email": email})
    if not user or not user.get("password_hash") or not verify_pw(body.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    set_auth_cookies(response, user["user_id"], user.get("role", "user"))
    return serialize(user)


@api.post("/auth/logout")
async def logout(response: Response, request: Request):
    sess = request.cookies.get("session_token")
    if sess:
        await db.user_sessions.delete_one({"session_token": sess})
    clear_auth_cookies(response)
    return {"ok": True}


@api.get("/auth/me")
async def me(user: dict = Depends(get_current_user)):
    return serialize(user)


@api.post("/auth/google/session")
async def google_session(request: Request, response: Response):
    """Exchange Emergent session_id for our session and create/find user."""
    body = await request.json()
    session_id = body.get("session_id")
    if not session_id:
        raise HTTPException(status_code=400, detail="session_id required")
    try:
        r = requests.get(
            "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data",
            headers={"X-Session-ID": session_id},
            timeout=10,
        )
        if r.status_code != 200:
            raise HTTPException(status_code=401, detail="Invalid session")
        data = r.json()
    except requests.RequestException:
        raise HTTPException(status_code=502, detail="Auth service unavailable")

    email = (data.get("email") or "").lower()
    if not email:
        raise HTTPException(status_code=400, detail="No email from Google")
    user = await db.users.find_one({"email": email})
    if not user:
        user_id = f"user_{uuid.uuid4().hex[:12]}"
        user = {
            "user_id": user_id,
            "email": email,
            "name": data.get("name") or email.split("@")[0],
            "password_hash": None,
            "role": "user",
            "coins_balance": 100,  # welcome bonus
            "language": "es",
            "picture": data.get("picture"),
            "auth_provider": "google",
            "welcome_bonus_granted": True,
            "streak_current": 0,
            "streak_best": 0,
            "last_streak_claim_date": None,
            "created_at": iso(now_utc()),
        }
        await db.users.insert_one(user.copy())
    else:
        # Update picture/name if changed
        await db.users.update_one(
            {"user_id": user["user_id"]},
            {"$set": {"picture": data.get("picture") or user.get("picture"),
                      "name": user.get("name") or data.get("name")}},
        )

    # Save Emergent session
    await db.user_sessions.insert_one({
        "session_id": str(uuid.uuid4()),
        "user_id": user["user_id"],
        "session_token": data["session_token"],
        "created_at": iso(now_utc()),
        "expires_at": iso(now_utc() + timedelta(days=7)),
    })

    # Set both Emergent session_token cookie AND our JWT cookies
    response.set_cookie(
        "session_token", data["session_token"],
        httponly=True, secure=True, samesite="none",
        max_age=7 * 86400, path="/",
    )
    set_auth_cookies(response, user["user_id"], user.get("role", "user"))
    return serialize(user)


@api.patch("/auth/language")
async def set_language(body: LangIn, user: dict = Depends(get_current_user)):
    await db.users.update_one({"user_id": user["user_id"]}, {"$set": {"language": body.language}})
    return {"ok": True, "language": body.language}


# ----------------------- Streak / daily bonus -----------------------
STREAK_REWARDS = {1: 10, 3: 30, 7: 75, 14: 150, 30: 500}
STREAK_BASE = 5  # other days


def _streak_reward(day: int) -> int:
    return STREAK_REWARDS.get(day, STREAK_BASE)


def _today_utc_date() -> str:
    return now_utc().date().isoformat()


def _yesterday_utc_date() -> str:
    return (now_utc().date() - timedelta(days=1)).isoformat()


@api.get("/streak/status")
async def streak_status(user: dict = Depends(get_current_user)):
    """Return current streak info and whether claim is available today."""
    today = _today_utc_date()
    last = user.get("last_streak_claim_date")
    streak = int(user.get("streak_current") or 0)
    available = last != today
    # Determine which day would be claimed
    if last == today:
        next_day = streak
    elif last == _yesterday_utc_date():
        next_day = streak + 1
    else:
        next_day = 1
    return {
        "streak_current": streak,
        "streak_best": int(user.get("streak_best") or 0),
        "last_claim_date": last,
        "available": available,
        "next_day": next_day,
        "next_reward": _streak_reward(next_day),
        "ladder": STREAK_REWARDS,
        "base_reward": STREAK_BASE,
    }


@api.post("/streak/claim")
async def streak_claim(user: dict = Depends(get_current_user)):
    today = _today_utc_date()
    last = user.get("last_streak_claim_date")
    if last == today:
        raise HTTPException(400, "Already claimed today")
    if last == _yesterday_utc_date():
        new_streak = int(user.get("streak_current") or 0) + 1
    else:
        new_streak = 1
    reward = _streak_reward(new_streak)
    new_best = max(int(user.get("streak_best") or 0), new_streak)
    await db.users.update_one(
        {"user_id": user["user_id"]},
        {
            "$set": {
                "streak_current": new_streak,
                "streak_best": new_best,
                "last_streak_claim_date": today,
            },
            "$inc": {"coins_balance": reward},
        },
    )
    return {
        "ok": True,
        "streak_current": new_streak,
        "streak_best": new_best,
        "reward": reward,
        "new_balance": int(user.get("coins_balance") or 0) + reward,
    }


# ----------------------- Public content -----------------------
@api.get("/banners")
async def list_banners(zone: Optional[str] = None):
    q: Dict[str, Any] = {"active": True}
    if zone:
        q["zone"] = zone
    items = await db.banners.find(q, {"_id": 0}).sort("order", 1).to_list(200)
    return items


@api.get("/payment-methods")
async def list_payment_methods_public():
    items = await db.payment_methods.find({"active": True}, {"_id": 0, "config": 0}).sort("order", 1).to_list(200)
    return items


@api.get("/predictions")
async def list_predictions(sport: Optional[Sport] = None, status: Optional[str] = None,
                           limit: int = Query(50, ge=1, le=200)):
    q: Dict[str, Any] = {}
    if sport:
        q["sport"] = sport
    if status:
        q["status"] = status
    items = await db.predictions.find(q, {"_id": 0}).sort("created_at", -1).to_list(limit)
    return items


@api.get("/predictions/{pid}")
async def get_prediction(pid: str):
    p = await db.predictions.find_one({"prediction_id": pid}, {"_id": 0})
    if not p:
        raise HTTPException(404, "Not found")
    return p


@api.get("/markets")
async def list_markets(sport: Optional[Sport] = None, status: Optional[str] = None,
                       limit: int = Query(50, ge=1, le=200)):
    q: Dict[str, Any] = {}
    if sport:
        q["sport"] = sport
    if status:
        q["status"] = status
    items = await db.markets.find(q, {"_id": 0}).sort("created_at", -1).to_list(limit)
    return items


@api.get("/ranking")
async def ranking(limit: int = 20):
    pipeline = [
        {"$match": {"role": {"$ne": "admin"}}},
        {"$lookup": {
            "from": "bets", "localField": "user_id", "foreignField": "user_id", "as": "bets"
        }},
        {"$project": {
            "_id": 0, "user_id": 1, "name": 1, "picture": 1,
            "coins_balance": 1,
            "total_bets": {"$size": "$bets"},
            "wins": {"$size": {"$filter": {"input": "$bets", "as": "b", "cond": {"$eq": ["$$b.status", "won"]}}}},
            "profit": {"$sum": "$bets.payout_diff"},
        }},
        {"$sort": {"profit": -1, "coins_balance": -1}},
        {"$limit": limit},
    ]
    items = await db.users.aggregate(pipeline).to_list(limit)
    return items


# ----------------------- Bets -----------------------
@api.post("/bets")
async def place_bet(body: BetIn, user: dict = Depends(get_current_user)):
    market = await db.markets.find_one({"market_id": body.market_id}, {"_id": 0})
    if not market:
        raise HTTPException(404, "Market not found")
    if market.get("status") != "open":
        raise HTTPException(400, "Market closed")
    option = next((o for o in market["options"] if o["label"] == body.option_label), None)
    if not option:
        raise HTTPException(400, "Invalid option")
    if user.get("coins_balance", 0) < body.coins:
        raise HTTPException(400, "Insufficient coins")
    payout = round(body.coins * float(option["odds"]))
    bet_id = f"bet_{uuid.uuid4().hex[:10]}"
    bet = {
        "bet_id": bet_id,
        "user_id": user["user_id"],
        "user_name": user.get("name"),
        "market_id": body.market_id,
        "market_title": market.get("title"),
        "option_label": body.option_label,
        "odds": float(option["odds"]),
        "coins": body.coins,
        "potential_payout": payout,
        "payout_diff": -body.coins,  # while pending counts as loss
        "status": "pending",
        "created_at": iso(now_utc()),
    }
    await db.bets.insert_one(bet.copy())
    await db.users.update_one({"user_id": user["user_id"]}, {"$inc": {"coins_balance": -body.coins}})
    bet.pop("_id", None)
    return bet


@api.get("/bets/me")
async def my_bets(user: dict = Depends(get_current_user)):
    items = await db.bets.find({"user_id": user["user_id"]}, {"_id": 0}).sort("created_at", -1).to_list(200)
    return items


@api.get("/bet-of-the-day")
async def bet_of_the_day():
    """Pick one featured prediction per UTC day (deterministic)."""
    today = _today_utc_date()
    cached = await db.botd_cache.find_one({"_id": today}, {"_id": 0})
    if cached and cached.get("prediction_id"):
        pred = await db.predictions.find_one({"prediction_id": cached["prediction_id"]}, {"_id": 0})
        if pred and pred.get("status") == "pending":
            return {"date": today, "prediction": pred}

    # Pick best confidence + odds among pending
    candidates = await db.predictions.find(
        {"status": "pending"}, {"_id": 0}
    ).sort([("confidence", -1), ("odds", -1)]).limit(50).to_list(50)
    if not candidates:
        return {"date": today, "prediction": None}
    # Deterministic-ish: hash by date+title to pick same one all day
    import hashlib
    h = int(hashlib.md5(today.encode()).hexdigest(), 16)
    pick = candidates[h % len(candidates)]
    await db.botd_cache.update_one(
        {"_id": today},
        {"$set": {"prediction_id": pick["prediction_id"], "created_at": iso(now_utc())}},
        upsert=True,
    )
    return {"date": today, "prediction": pick}


# ----------------------- Recharges (user side) -----------------------
@api.post("/recharges")
async def request_recharge(body: RechargeIn, user: dict = Depends(get_current_user)):
    pm = await db.payment_methods.find_one({"payment_method_id": body.payment_method_id, "active": True})
    if not pm:
        raise HTTPException(400, "Payment method not available")
    coins = int(body.amount_usd * 100)  # 1 USD = 100 coins
    rid = f"rch_{uuid.uuid4().hex[:10]}"
    rec = {
        "recharge_id": rid,
        "user_id": user["user_id"],
        "user_email": user["email"],
        "user_name": user.get("name"),
        "payment_method_id": body.payment_method_id,
        "payment_method_name": pm["name"],
        "amount_usd": body.amount_usd,
        "coins": coins,
        "proof_note": body.proof_note,
        "proof_url": body.proof_url,
        "status": "pending",
        "created_at": iso(now_utc()),
        "reviewed_at": None,
        "review_note": "",
    }
    await db.recharges.insert_one(rec.copy())
    rec.pop("_id", None)
    return rec


@api.get("/recharges/me")
async def my_recharges(user: dict = Depends(get_current_user)):
    items = await db.recharges.find({"user_id": user["user_id"]}, {"_id": 0}).sort("created_at", -1).to_list(100)
    return items


# ----------------------- Push -----------------------
@api.get("/push/public-key")
async def push_pubkey():
    return {"public_key": VAPID_PUBLIC}


@api.post("/push/subscribe")
async def push_sub(body: PushSubIn, user: dict = Depends(get_current_user)):
    sub = {"endpoint": body.endpoint, "keys": body.keys}
    await db.users.update_one({"user_id": user["user_id"]}, {"$set": {"push_sub": sub}})
    return {"ok": True}


def send_push_to(sub: dict, payload: dict) -> bool:
    try:
        webpush(
            subscription_info=sub,
            data=json.dumps(payload),
            vapid_private_key=VAPID_PRIVATE_PEM,
            vapid_claims={"sub": VAPID_CONTACT},
            timeout=10,
        )
        return True
    except WebPushException as e:
        log.warning(f"Push failed: {e}")
        return False
    except Exception as e:
        log.warning(f"Push error: {e}")
        return False


# ----------------------- Admin: predictions -----------------------
@api.post("/admin/predictions")
async def admin_create_pred(body: PredictionIn, _: dict = Depends(require_admin)):
    pid = f"pred_{uuid.uuid4().hex[:10]}"
    doc = body.model_dump()
    doc.update({
        "prediction_id": pid,
        "status": "pending",
        "created_at": iso(now_utc()),
        "likes": 0,
    })
    await db.predictions.insert_one(doc.copy())
    doc.pop("_id", None)
    return doc


@api.patch("/admin/predictions/{pid}")
async def admin_update_pred(pid: str, body: PredictionIn, _: dict = Depends(require_admin)):
    res = await db.predictions.update_one({"prediction_id": pid}, {"$set": body.model_dump()})
    if res.matched_count == 0:
        raise HTTPException(404, "Not found")
    return {"ok": True}


@api.patch("/admin/predictions/{pid}/status")
async def admin_set_pred_status(pid: str, body: PredictionStatusIn, _: dict = Depends(require_admin)):
    res = await db.predictions.update_one({"prediction_id": pid}, {"$set": {"status": body.status}})
    if res.matched_count == 0:
        raise HTTPException(404, "Not found")
    return {"ok": True}


@api.delete("/admin/predictions/{pid}")
async def admin_del_pred(pid: str, _: dict = Depends(require_admin)):
    await db.predictions.delete_one({"prediction_id": pid})
    return {"ok": True}


# ----------------------- Admin: markets -----------------------
@api.post("/admin/markets")
async def admin_create_market(body: MarketIn, _: dict = Depends(require_admin)):
    mid = f"mkt_{uuid.uuid4().hex[:10]}"
    doc = body.model_dump()
    doc.update({
        "market_id": mid,
        "status": "open",
        "created_at": iso(now_utc()),
    })
    await db.markets.insert_one(doc.copy())
    doc.pop("_id", None)
    return doc


@api.patch("/admin/markets/{mid}")
async def admin_update_market(mid: str, body: MarketIn, _: dict = Depends(require_admin)):
    res = await db.markets.update_one({"market_id": mid}, {"$set": body.model_dump()})
    if res.matched_count == 0:
        raise HTTPException(404, "Not found")
    return {"ok": True}


@api.post("/admin/markets/{mid}/settle")
async def admin_settle_market(mid: str, body: MarketSettleIn, _: dict = Depends(require_admin)):
    market = await db.markets.find_one({"market_id": mid}, {"_id": 0})
    if not market:
        raise HTTPException(404, "Not found")
    if market.get("status") == "settled":
        raise HTTPException(400, "Already settled")

    bets = await db.bets.find({"market_id": mid, "status": "pending"}, {"_id": 0}).to_list(10000)
    for b in bets:
        if not body.winning_label:
            # void: refund
            await db.users.update_one({"user_id": b["user_id"]}, {"$inc": {"coins_balance": b["coins"]}})
            await db.bets.update_one({"bet_id": b["bet_id"]},
                                     {"$set": {"status": "void", "payout_diff": 0,
                                               "settled_at": iso(now_utc())}})
        elif b["option_label"] == body.winning_label:
            payout = b["potential_payout"]
            await db.users.update_one({"user_id": b["user_id"]}, {"$inc": {"coins_balance": payout}})
            await db.bets.update_one({"bet_id": b["bet_id"]},
                                     {"$set": {"status": "won",
                                               "payout_diff": payout - b["coins"],
                                               "settled_at": iso(now_utc())}})
        else:
            await db.bets.update_one({"bet_id": b["bet_id"]},
                                     {"$set": {"status": "lost",
                                               "payout_diff": -b["coins"],
                                               "settled_at": iso(now_utc())}})
    await db.markets.update_one({"market_id": mid},
                                {"$set": {"status": "settled", "winning_label": body.winning_label,
                                          "settled_at": iso(now_utc())}})
    return {"ok": True, "settled_bets": len(bets)}


@api.delete("/admin/markets/{mid}")
async def admin_del_market(mid: str, _: dict = Depends(require_admin)):
    await db.markets.delete_one({"market_id": mid})
    return {"ok": True}


# ----------------------- Admin: payment methods -----------------------
@api.get("/admin/payment-methods")
async def admin_list_pm(_: dict = Depends(require_admin)):
    items = await db.payment_methods.find({}, {"_id": 0}).sort("order", 1).to_list(200)
    return items


@api.post("/admin/payment-methods")
async def admin_create_pm(body: PaymentMethodIn, _: dict = Depends(require_admin)):
    pid = f"pm_{uuid.uuid4().hex[:10]}"
    doc = body.model_dump()
    doc.update({"payment_method_id": pid, "created_at": iso(now_utc())})
    await db.payment_methods.insert_one(doc.copy())
    doc.pop("_id", None)
    return doc


@api.patch("/admin/payment-methods/{pid}")
async def admin_update_pm(pid: str, body: PaymentMethodIn, _: dict = Depends(require_admin)):
    res = await db.payment_methods.update_one({"payment_method_id": pid}, {"$set": body.model_dump()})
    if res.matched_count == 0:
        raise HTTPException(404, "Not found")
    return {"ok": True}


@api.delete("/admin/payment-methods/{pid}")
async def admin_del_pm(pid: str, _: dict = Depends(require_admin)):
    await db.payment_methods.delete_one({"payment_method_id": pid})
    return {"ok": True}


# ----------------------- Admin: banners -----------------------
@api.get("/admin/banners")
async def admin_list_banners(_: dict = Depends(require_admin)):
    items = await db.banners.find({}, {"_id": 0}).sort("order", 1).to_list(500)
    return items


@api.post("/admin/banners")
async def admin_create_banner(body: BannerIn, _: dict = Depends(require_admin)):
    bid = f"ban_{uuid.uuid4().hex[:10]}"
    doc = body.model_dump()
    doc.update({"banner_id": bid, "created_at": iso(now_utc())})
    await db.banners.insert_one(doc.copy())
    doc.pop("_id", None)
    return doc


@api.patch("/admin/banners/{bid}")
async def admin_update_banner(bid: str, body: BannerIn, _: dict = Depends(require_admin)):
    res = await db.banners.update_one({"banner_id": bid}, {"$set": body.model_dump()})
    if res.matched_count == 0:
        raise HTTPException(404, "Not found")
    return {"ok": True}


@api.delete("/admin/banners/{bid}")
async def admin_del_banner(bid: str, _: dict = Depends(require_admin)):
    await db.banners.delete_one({"banner_id": bid})
    return {"ok": True}


# ----------------------- Admin: recharges -----------------------
@api.get("/admin/recharges")
async def admin_list_recharges(status: Optional[str] = None, _: dict = Depends(require_admin)):
    q: Dict[str, Any] = {}
    if status:
        q["status"] = status
    items = await db.recharges.find(q, {"_id": 0}).sort("created_at", -1).to_list(500)
    return items


@api.post("/admin/recharges/{rid}/review")
async def admin_review_recharge(rid: str, body: RechargeReviewIn, _: dict = Depends(require_admin)):
    rec = await db.recharges.find_one({"recharge_id": rid}, {"_id": 0})
    if not rec:
        raise HTTPException(404, "Not found")
    if rec["status"] != "pending":
        raise HTTPException(400, "Already reviewed")
    if body.action == "approve":
        await db.users.update_one({"user_id": rec["user_id"]},
                                  {"$inc": {"coins_balance": rec["coins"]}})
        new_status = "approved"
    else:
        new_status = "rejected"
    await db.recharges.update_one(
        {"recharge_id": rid},
        {"$set": {"status": new_status, "review_note": body.note,
                  "reviewed_at": iso(now_utc())}})
    # Push notify user
    user = await db.users.find_one({"user_id": rec["user_id"]}, {"_id": 0})
    if user and user.get("push_sub"):
        msg = f"Recarga {new_status.upper()}: ${rec['amount_usd']}"
        send_push_to(user["push_sub"], {"title": "PicksZone", "body": msg, "url": "/wallet"})
    return {"ok": True, "status": new_status}


# ----------------------- Admin: users + notifications -----------------------
@api.get("/admin/users")
async def admin_users(_: dict = Depends(require_admin)):
    items = await db.users.find({}, {"_id": 0, "password_hash": 0, "push_sub": 0}).sort("created_at", -1).to_list(1000)
    return items


@api.patch("/admin/users/{uid}/role")
async def admin_set_role(uid: str, body: dict, _: dict = Depends(require_admin)):
    role = body.get("role")
    if role not in ("user", "admin"):
        raise HTTPException(400, "Invalid role")
    await db.users.update_one({"user_id": uid}, {"$set": {"role": role}})
    return {"ok": True}


@api.patch("/admin/users/{uid}/coins")
async def admin_adjust_coins(uid: str, body: dict, _: dict = Depends(require_admin)):
    delta = int(body.get("delta", 0))
    await db.users.update_one({"user_id": uid}, {"$inc": {"coins_balance": delta}})
    return {"ok": True}


@api.post("/admin/notifications/send")
async def admin_send_notification(body: NotifyIn, _: dict = Depends(require_admin)):
    payload = {"title": body.title, "body": body.body, "url": body.url or "/"}
    sent = 0
    failed = 0
    if body.target == "user":
        if not body.user_id:
            raise HTTPException(400, "user_id required")
        u = await db.users.find_one({"user_id": body.user_id}, {"_id": 0})
        if u and u.get("push_sub"):
            ok = send_push_to(u["push_sub"], payload)
            sent += int(ok); failed += int(not ok)
    else:
        cursor = db.users.find({"push_sub": {"$exists": True, "$ne": None}}, {"_id": 0, "push_sub": 1})
        async for u in cursor:
            ok = send_push_to(u["push_sub"], payload)
            sent += int(ok); failed += int(not ok)
    await db.notifications.insert_one({
        "notification_id": f"ntf_{uuid.uuid4().hex[:8]}",
        "title": body.title, "body": body.body, "url": body.url,
        "target": body.target, "user_id": body.user_id,
        "sent": sent, "failed": failed,
        "created_at": iso(now_utc()),
    })
    return {"ok": True, "sent": sent, "failed": failed}


@api.get("/admin/metrics")
async def admin_metrics(_: dict = Depends(require_admin)):
    users = await db.users.count_documents({})
    preds = await db.predictions.count_documents({})
    markets_open = await db.markets.count_documents({"status": "open"})
    bets = await db.bets.count_documents({})
    recharges_pending = await db.recharges.count_documents({"status": "pending"})
    pipe = [{"$match": {"status": "approved"}},
            {"$group": {"_id": None, "total": {"$sum": "$amount_usd"}}}]
    rev = await db.recharges.aggregate(pipe).to_list(1)
    revenue = rev[0]["total"] if rev else 0
    return {
        "users": users, "predictions": preds, "markets_open": markets_open,
        "bets": bets, "recharges_pending": recharges_pending, "revenue_usd": revenue,
    }


# ----------------------- Odds API integration -----------------------
import asyncio
import httpx

async def odds_get_config() -> dict:
    cfg = await db.odds_config.find_one({"_id": "main"}, {"_id": 0})
    if not cfg:
        cfg = {
            "enabled_sports": list(ODDS_SPORT_MAP.keys()),
            "auto_sync_hours": 6,
            "auto_sync_enabled": True,
            "last_sync_at": None,
            "last_sync_summary": None,
        }
        await db.odds_config.update_one({"_id": "main"}, {"$set": cfg}, upsert=True)
    return cfg


def _best_odds_for_outcome(bookmakers: list, market_key: str, outcome_name: str):
    """Find the best (highest) odds across bookmakers for a given outcome."""
    best = None
    for b in bookmakers or []:
        for m in b.get("markets", []):
            if m.get("key") != market_key:
                continue
            for o in m.get("outcomes", []):
                if o.get("name") == outcome_name:
                    price = o.get("price")
                    if price and (best is None or price > best):
                        best = price
    return best


def _iter_outcomes(bookmakers: list, market_key: str):
    """Collect unique outcome names + best odds for a given market."""
    out = {}
    for b in bookmakers or []:
        for m in b.get("markets", []):
            if m.get("key") != market_key:
                continue
            for o in m.get("outcomes", []):
                name = o.get("name")
                price = o.get("price")
                if not name or not price:
                    continue
                if name not in out or price > out[name]["odds"]:
                    out[name] = {"odds": float(price), "point": o.get("point")}
    return out


async def odds_sync_run(create_markets: bool = True, create_predictions: bool = True) -> dict:
    """Pull events from The Odds API and create predictions/markets if missing."""
    if not ODDS_API_KEY:
        raise HTTPException(400, "ODDS_API_KEY not configured")
    cfg = await odds_get_config()
    sports = cfg.get("enabled_sports") or list(ODDS_SPORT_MAP.keys())

    summary = {"sports": [], "predictions_created": 0, "markets_created": 0, "events_seen": 0, "errors": []}
    async with httpx.AsyncClient(timeout=20) as http:
        for sport_key in sports:
            internal_sport = ODDS_SPORT_MAP.get(sport_key, "football")
            try:
                r = await http.get(
                    f"{ODDS_API_BASE}/sports/{sport_key}/odds",
                    params={
                        "apiKey": ODDS_API_KEY,
                        "regions": "eu,uk,us",
                        "markets": "h2h,totals",
                        "oddsFormat": "decimal",
                        "dateFormat": "iso",
                    },
                )
                if r.status_code != 200:
                    summary["errors"].append(f"{sport_key}: HTTP {r.status_code} {r.text[:120]}")
                    continue
                events = r.json()
            except Exception as e:
                summary["errors"].append(f"{sport_key}: {e}")
                continue

            sport_summary = {"sport": sport_key, "events": len(events), "preds": 0, "mkts": 0}
            for ev in events[:25]:  # cap per sport
                summary["events_seen"] += 1
                ext_id = ev.get("id")
                if not ext_id:
                    continue
                home, away = ev.get("home_team"), ev.get("away_team")
                event_label = f"{home} vs {away}"
                commence = ev.get("commence_time")
                bk = ev.get("bookmakers") or []
                if not bk:
                    continue

                # H2H best odds
                h2h_outcomes = _iter_outcomes(bk, "h2h")
                # Totals (over/under)
                totals_outcomes = _iter_outcomes(bk, "totals")

                # ---- Prediction (best home pick) ----
                if create_predictions and home in h2h_outcomes:
                    exists = await db.predictions.find_one({"external_id": f"odds:{ext_id}:h2h"}, {"_id": 0})
                    if not exists:
                        odds = h2h_outcomes[home]["odds"]
                        await db.predictions.insert_one({
                            "prediction_id": f"pred_{uuid.uuid4().hex[:10]}",
                            "external_id": f"odds:{ext_id}:h2h",
                            "sport": internal_sport,
                            "title": f"{home} ML",
                            "event": event_label,
                            "pick": f"{home} to win (1X2 home)",
                            "odds": odds,
                            "stake": 5,
                            "confidence": 3,
                            "analysis": f"Auto-imported from The Odds API. Best home moneyline @ {odds:.2f}.",
                            "starts_at": commence,
                            "image_url": None,
                            "status": "pending",
                            "likes": 0,
                            "auto_imported": True,
                            "created_at": iso(now_utc()),
                        })
                        summary["predictions_created"] += 1
                        sport_summary["preds"] += 1

                # ---- Market H2H ----
                if create_markets and h2h_outcomes:
                    exists = await db.markets.find_one({"external_id": f"odds:{ext_id}:h2h"}, {"_id": 0})
                    if not exists:
                        options = [
                            {"label": name, "odds": data["odds"]}
                            for name, data in h2h_outcomes.items()
                        ]
                        if len(options) >= 2:
                            await db.markets.insert_one({
                                "market_id": f"mkt_{uuid.uuid4().hex[:10]}",
                                "external_id": f"odds:{ext_id}:h2h",
                                "sport": internal_sport,
                                "market_type": "custom",
                                "title": f"{home} vs {away} — Result",
                                "event": event_label,
                                "options": options,
                                "closes_at": commence,
                                "image_url": None,
                                "status": "open",
                                "auto_imported": True,
                                "created_at": iso(now_utc()),
                            })
                            summary["markets_created"] += 1
                            sport_summary["mkts"] += 1

                # ---- Market Over/Under ----
                if create_markets and totals_outcomes:
                    exists = await db.markets.find_one({"external_id": f"odds:{ext_id}:totals"}, {"_id": 0})
                    if not exists:
                        options = []
                        for name, data in totals_outcomes.items():
                            label = name
                            if data.get("point") is not None:
                                label = f"{name} {data['point']}"
                            options.append({"label": label, "odds": data["odds"]})
                        if len(options) >= 2:
                            mt = "over_under_goals" if internal_sport == "football" else "custom"
                            await db.markets.insert_one({
                                "market_id": f"mkt_{uuid.uuid4().hex[:10]}",
                                "external_id": f"odds:{ext_id}:totals",
                                "sport": internal_sport,
                                "market_type": mt,
                                "title": f"{home} vs {away} — Total",
                                "event": event_label,
                                "options": options,
                                "closes_at": commence,
                                "image_url": None,
                                "status": "open",
                                "auto_imported": True,
                                "created_at": iso(now_utc()),
                            })
                            summary["markets_created"] += 1
                            sport_summary["mkts"] += 1

            summary["sports"].append(sport_summary)

    summary["completed_at"] = iso(now_utc())
    await db.odds_config.update_one(
        {"_id": "main"},
        {"$set": {"last_sync_at": iso(now_utc()), "last_sync_summary": summary}},
        upsert=True,
    )
    log.info(f"Odds sync done: {summary['predictions_created']} preds, {summary['markets_created']} markets, errors={len(summary['errors'])}")
    return summary


@api.get("/admin/odds/sports")
async def admin_odds_sports(_: dict = Depends(require_admin)):
    """Proxy to fetch active sports list from The Odds API."""
    if not ODDS_API_KEY:
        raise HTTPException(400, "ODDS_API_KEY not configured")
    async with httpx.AsyncClient(timeout=15) as http:
        r = await http.get(f"{ODDS_API_BASE}/sports", params={"apiKey": ODDS_API_KEY, "all": "false"})
        if r.status_code != 200:
            raise HTTPException(502, f"Odds API error {r.status_code}")
        return r.json()


@api.get("/admin/odds/config")
async def admin_odds_get_config(_: dict = Depends(require_admin)):
    cfg = await odds_get_config()
    cfg["api_key_set"] = bool(ODDS_API_KEY)
    cfg["sport_map"] = ODDS_SPORT_MAP
    return cfg


@api.patch("/admin/odds/config")
async def admin_odds_set_config(body: dict, _: dict = Depends(require_admin)):
    update = {}
    if "enabled_sports" in body and isinstance(body["enabled_sports"], list):
        update["enabled_sports"] = [s for s in body["enabled_sports"] if isinstance(s, str)]
    if "auto_sync_hours" in body:
        h = int(body["auto_sync_hours"])
        update["auto_sync_hours"] = max(1, min(24, h))
    if "auto_sync_enabled" in body:
        update["auto_sync_enabled"] = bool(body["auto_sync_enabled"])
    await db.odds_config.update_one({"_id": "main"}, {"$set": update}, upsert=True)
    return await odds_get_config()


@api.post("/admin/odds/sync")
async def admin_odds_sync_now(body: Optional[dict] = None, _: dict = Depends(require_admin)):
    body = body or {}
    return await odds_sync_run(
        create_markets=body.get("create_markets", True),
        create_predictions=body.get("create_predictions", True),
    )


# ----------------------- Auto-settle -----------------------
def _parse_total_label(label: str) -> tuple:
    """Parse 'Over 2.5' or 'Under 8.5' into ('Over', 2.5) / ('Under', 8.5). Returns (None, None) if not parsable."""
    parts = label.strip().split()
    if len(parts) >= 2:
        try:
            return parts[0], float(parts[-1])
        except ValueError:
            return None, None
    return None, None


def _scores_total(scores_list: list) -> float:
    total = 0.0
    for s in scores_list or []:
        try:
            total += float(s.get("score") or 0)
        except (TypeError, ValueError):
            pass
    return total


async def odds_settle_run() -> dict:
    """Fetch results from Odds API for all enabled sports, settle matching open markets."""
    if not ODDS_API_KEY:
        raise HTTPException(400, "ODDS_API_KEY not configured")
    cfg = await odds_get_config()
    sports = cfg.get("enabled_sports") or list(ODDS_SPORT_MAP.keys())
    summary = {"checked": 0, "settled": 0, "voided": 0, "skipped": 0, "errors": []}

    async with httpx.AsyncClient(timeout=20) as http:
        for sport_key in sports:
            try:
                r = await http.get(
                    f"{ODDS_API_BASE}/sports/{sport_key}/scores",
                    params={"apiKey": ODDS_API_KEY, "daysFrom": 3, "dateFormat": "iso"},
                )
                if r.status_code != 200:
                    summary["errors"].append(f"{sport_key} scores: HTTP {r.status_code}")
                    continue
                events = r.json()
            except Exception as e:
                summary["errors"].append(f"{sport_key}: {e}")
                continue

            for ev in events:
                if not ev.get("completed"):
                    continue
                ext_id = ev.get("id")
                home, away = ev.get("home_team"), ev.get("away_team")
                scores = ev.get("scores") or []
                home_s = next((float(s.get("score") or 0) for s in scores if s.get("name") == home), None)
                away_s = next((float(s.get("score") or 0) for s in scores if s.get("name") == away), None)
                if home_s is None or away_s is None:
                    continue

                # h2h
                h2h_market = await db.markets.find_one(
                    {"external_id": f"odds:{ext_id}:h2h", "status": "open"}, {"_id": 0})
                if h2h_market:
                    summary["checked"] += 1
                    if home_s > away_s:
                        winner = home
                    elif away_s > home_s:
                        winner = away
                    else:
                        winner = ""  # draw -> if "Draw" option exists set it, else void
                        if any(o["label"] == "Draw" for o in h2h_market["options"]):
                            winner = "Draw"
                    await _settle_market_internal(h2h_market, winner)
                    summary["settled" if winner else "voided"] += 1

                # totals
                tot_market = await db.markets.find_one(
                    {"external_id": f"odds:{ext_id}:totals", "status": "open"}, {"_id": 0})
                if tot_market:
                    summary["checked"] += 1
                    total = home_s + away_s
                    winner_label = ""
                    # Each option has label like "Over 8.5" / "Under 8.5"
                    for o in tot_market["options"]:
                        side, line = _parse_total_label(o["label"])
                        if line is None:
                            continue
                        if side == "Over" and total > line:
                            winner_label = o["label"]; break
                        if side == "Under" and total < line:
                            winner_label = o["label"]; break
                    await _settle_market_internal(tot_market, winner_label)
                    summary["settled" if winner_label else "voided"] += 1

                # Also resolve auto-imported predictions
                pred = await db.predictions.find_one(
                    {"external_id": f"odds:{ext_id}:h2h", "status": "pending"}, {"_id": 0})
                if pred:
                    # pred is "home to win"
                    if home_s > away_s:
                        new_status = "won"
                    elif home_s == away_s:
                        new_status = "void"
                    else:
                        new_status = "lost"
                    await db.predictions.update_one(
                        {"prediction_id": pred["prediction_id"]},
                        {"$set": {"status": new_status, "settled_at": iso(now_utc())}})

    summary["completed_at"] = iso(now_utc())
    await db.odds_config.update_one(
        {"_id": "main"},
        {"$set": {"last_settle_at": iso(now_utc()), "last_settle_summary": summary}},
        upsert=True,
    )
    log.info(f"Odds settle: settled={summary['settled']} voided={summary['voided']} errors={len(summary['errors'])}")
    return summary


async def _settle_market_internal(market: dict, winning_label: str):
    """Same logic as admin_settle_market but callable internally."""
    if market.get("status") == "settled":
        return
    bets = await db.bets.find({"market_id": market["market_id"], "status": "pending"}, {"_id": 0}).to_list(10000)
    user_payouts: Dict[str, dict] = {}  # user_id -> {coins, won, market}
    for b in bets:
        if not winning_label:
            await db.users.update_one({"user_id": b["user_id"]}, {"$inc": {"coins_balance": b["coins"]}})
            await db.bets.update_one({"bet_id": b["bet_id"]},
                                     {"$set": {"status": "void", "payout_diff": 0,
                                               "settled_at": iso(now_utc())}})
        elif b["option_label"] == winning_label:
            payout = b["potential_payout"]
            await db.users.update_one({"user_id": b["user_id"]}, {"$inc": {"coins_balance": payout}})
            await db.bets.update_one({"bet_id": b["bet_id"]},
                                     {"$set": {"status": "won",
                                               "payout_diff": payout - b["coins"],
                                               "settled_at": iso(now_utc())}})
            user_payouts[b["user_id"]] = {"coins": payout, "won": True, "title": market["title"]}
        else:
            await db.bets.update_one({"bet_id": b["bet_id"]},
                                     {"$set": {"status": "lost",
                                               "payout_diff": -b["coins"],
                                               "settled_at": iso(now_utc())}})
            user_payouts.setdefault(b["user_id"], {"coins": 0, "won": False, "title": market["title"]})

    await db.markets.update_one(
        {"market_id": market["market_id"]},
        {"$set": {"status": "settled", "winning_label": winning_label,
                  "settled_at": iso(now_utc()), "auto_settled": True}})

    # Push notify users with bets
    for uid, info in user_payouts.items():
        u = await db.users.find_one({"user_id": uid}, {"_id": 0})
        if u and u.get("push_sub"):
            if info["won"]:
                msg = f"GANASTE {info['coins']} coins en {info['title']}"
            else:
                msg = f"Resultado de {info['title']}: no fue esta vez."
            send_push_to(u["push_sub"], {"title": "PicksZone", "body": msg, "url": "/profile"})


@api.post("/admin/odds/settle")
async def admin_odds_settle_now(_: dict = Depends(require_admin)):
    return await odds_settle_run()


# Background scheduler
_odds_task: Optional[asyncio.Task] = None

async def _odds_loop():
    """Run odds sync (events+markets) periodically per config. Settle is MANUAL ONLY."""
    while True:
        try:
            cfg = await odds_get_config()
            if cfg.get("auto_sync_enabled") and ODDS_API_KEY:
                last = cfg.get("last_sync_at")
                hours = cfg.get("auto_sync_hours", 6)
                should_sync = False
                if not last:
                    should_sync = True
                else:
                    try:
                        last_dt = datetime.fromisoformat(last)
                        if last_dt.tzinfo is None:
                            last_dt = last_dt.replace(tzinfo=timezone.utc)
                        if (now_utc() - last_dt) >= timedelta(hours=hours):
                            should_sync = True
                    except Exception:
                        should_sync = True
                if should_sync:
                    log.info("Auto odds sync starting...")
                    try: await odds_sync_run()
                    except Exception as e: log.warning(f"sync err: {e}")
                # Settle is MANUAL ONLY (admin must click the button)
        except Exception as e:
            log.warning(f"odds_loop error: {e}")
        await asyncio.sleep(60 * 30)  # check every 30 min


# ----------------------- Bootstrap -----------------------
@api.get("/")
async def root():
    return {"ok": True, "service": "PicksZone API"}


app.include_router(api)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origin_regex=".*",
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def startup():
    # Indexes
    await db.users.create_index("email", unique=True)
    await db.users.create_index("user_id", unique=True)
    await db.predictions.create_index("prediction_id", unique=True)
    await db.markets.create_index("market_id", unique=True)
    await db.bets.create_index("bet_id", unique=True)
    await db.bets.create_index("user_id")
    await db.banners.create_index("banner_id", unique=True)
    await db.payment_methods.create_index("payment_method_id", unique=True)
    await db.recharges.create_index("recharge_id", unique=True)
    await db.user_sessions.create_index("session_token", unique=True)

    # Seed admin
    existing = await db.users.find_one({"email": ADMIN_EMAIL})
    if not existing:
        await db.users.insert_one({
            "user_id": f"user_admin_{uuid.uuid4().hex[:6]}",
            "email": ADMIN_EMAIL,
            "name": "Admin",
            "password_hash": hash_pw(ADMIN_PASSWORD),
            "role": "admin",
            "coins_balance": 0,
            "language": "es",
            "auth_provider": "local",
            "created_at": iso(now_utc()),
        })
        log.info(f"Seeded admin: {ADMIN_EMAIL}")
    else:
        # keep password in sync if env changed
        if not existing.get("password_hash") or not verify_pw(ADMIN_PASSWORD, existing["password_hash"]):
            await db.users.update_one({"email": ADMIN_EMAIL},
                                      {"$set": {"password_hash": hash_pw(ADMIN_PASSWORD), "role": "admin"}})

    # Seed default payment methods if none
    if await db.payment_methods.count_documents({}) == 0:
        defaults = [
            {"payment_method_id": f"pm_{uuid.uuid4().hex[:8]}", "name": "Zelle",
             "type": "zelle", "instructions": "Envía a admin@pickszone.com y sube el comprobante.",
             "account_info": "admin@pickszone.com", "config": {}, "active": True, "order": 1,
             "icon_url": None, "created_at": iso(now_utc())},
            {"payment_method_id": f"pm_{uuid.uuid4().hex[:8]}", "name": "Stripe",
             "type": "stripe",
             "instructions": "Pago seguro con tarjeta. Configura tus claves en admin.",
             "account_info": "",
             "config": {"secret_key": "", "publishable_key": "", "webhook_secret": ""},
             "active": False, "order": 2, "icon_url": None, "created_at": iso(now_utc())},
            {"payment_method_id": f"pm_{uuid.uuid4().hex[:8]}", "name": "Binance Pay",
             "type": "binance", "instructions": "Envía USDT a la dirección indicada.",
             "account_info": "TXxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx", "config": {},
             "active": True, "order": 3, "icon_url": None, "created_at": iso(now_utc())},
        ]
        await db.payment_methods.insert_many(defaults)

    # Seed sample banner
    if await db.banners.count_documents({}) == 0:
        await db.banners.insert_many([
            {"banner_id": f"ban_{uuid.uuid4().hex[:8]}",
             "title": "Recarga $20 y obtén bono",
             "image_url": "https://images.unsplash.com/photo-1769120062656-23adba3790b3?w=1600",
             "link_url": "/wallet", "zone": "hero", "active": True, "order": 1,
             "created_at": iso(now_utc())},
        ])

    log.info("PicksZone backend ready")

    # Start odds auto-sync loop
    global _odds_task
    if ODDS_API_KEY and (_odds_task is None or _odds_task.done()):
        _odds_task = asyncio.create_task(_odds_loop())
        log.info("Odds auto-sync loop started")


@app.on_event("shutdown")
async def shutdown():
    client.close()
