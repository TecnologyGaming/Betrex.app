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
        "coins_balance": 0,
        "language": "es",
        "picture": None,
        "auth_provider": "local",
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
            "coins_balance": 0,
            "language": "es",
            "picture": data.get("picture"),
            "auth_provider": "google",
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


# ----------------------- Bootstrap -----------------------
@api.get("/")
async def root():
    return {"ok": True, "service": "PicksZone API"}


app.include_router(api)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
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


@app.on_event("shutdown")
async def shutdown():
    client.close()
