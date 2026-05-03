"""PicksZone backend E2E tests against public URL using cookies.

Covers: auth register/login/me/language, public content, bets, settle, recharges,
admin CRUD (predictions, markets, payment methods, banners), admin users/metrics/notifications,
validation errors and serialization (no _id).
"""
import os
import uuid
import pytest
import requests

BASE = os.environ.get("REACT_APP_BACKEND_URL", "https://sports-betting-app-38.preview.emergentagent.com").rstrip("/")
API = f"{BASE}/api"
ADMIN_EMAIL = "admin@pickszone.com"
ADMIN_PW = "Admin1234!"


# ------------- Fixtures -------------
@pytest.fixture(scope="module")
def admin():
    s = requests.Session()
    r = s.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PW})
    assert r.status_code == 200, r.text
    assert r.json().get("role") == "admin"
    return s


@pytest.fixture(scope="module")
def user():
    s = requests.Session()
    email = f"test_{uuid.uuid4().hex[:8]}@example.com"
    r = s.post(f"{API}/auth/register", json={"email": email, "password": "User1234!", "name": "TEST_User"})
    assert r.status_code == 200, r.text
    d = r.json()
    assert d["coins_balance"] == 0
    assert d["role"] == "user"
    assert "_id" not in d and "password_hash" not in d
    s.user_id = d["user_id"]
    s.email = email
    return s


# ------------- Auth -------------
def test_register_cookies_and_shape(user):
    # Cookies were set by fixture
    assert "access_token" in user.cookies.get_dict()
    r = user.get(f"{API}/auth/me")
    assert r.status_code == 200
    assert r.json()["email"] == user.email


def test_login_admin_role(admin):
    r = admin.get(f"{API}/auth/me")
    assert r.status_code == 200
    assert r.json()["role"] == "admin"


def test_login_invalid():
    r = requests.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": "wrong"})
    assert r.status_code == 401


def test_register_duplicate_email(user):
    r = requests.post(f"{API}/auth/register", json={"email": user.email, "password": "x"*6, "name": "dup"})
    assert r.status_code == 400


def test_language_patch(user):
    r = user.patch(f"{API}/auth/language", json={"language": "en"})
    assert r.status_code == 200 and r.json()["language"] == "en"
    me = user.get(f"{API}/auth/me").json()
    assert me["language"] == "en"


def test_me_requires_auth():
    r = requests.get(f"{API}/auth/me")
    assert r.status_code == 401


# ------------- Public content -------------
def test_public_endpoints_no_auth():
    for path in ["/predictions", "/markets", "/banners", "/payment-methods", "/ranking"]:
        r = requests.get(f"{API}{path}")
        assert r.status_code == 200, f"{path} -> {r.status_code}"
        assert isinstance(r.json(), list)


def test_public_payment_methods_no_config():
    r = requests.get(f"{API}/payment-methods")
    assert r.status_code == 200
    for pm in r.json():
        assert "config" not in pm, "Public endpoint leaked config"
        assert "_id" not in pm


def test_push_public_key():
    r = requests.get(f"{API}/push/public-key")
    assert r.status_code == 200 and r.json()["public_key"]


# ------------- Admin predictions -------------
def test_admin_predictions_crud(admin):
    payload = {"sport": "football", "title": "TEST pred", "event": "A vs B",
               "pick": "Home win", "odds": 1.85, "stake": 5, "confidence": 3, "analysis": "t"}
    r = admin.post(f"{API}/admin/predictions", json=payload)
    assert r.status_code == 200, r.text
    pid = r.json()["prediction_id"]
    assert "_id" not in r.json()
    # Update
    r = admin.patch(f"{API}/admin/predictions/{pid}", json={**payload, "title": "TEST pred 2"})
    assert r.status_code == 200
    # Status
    r = admin.patch(f"{API}/admin/predictions/{pid}/status", json={"status": "won"})
    assert r.status_code == 200
    # Verify persisted
    got = requests.get(f"{API}/predictions/{pid}").json()
    assert got["title"] == "TEST pred 2" and got["status"] == "won"
    # Delete
    r = admin.delete(f"{API}/admin/predictions/{pid}")
    assert r.status_code == 200
    r = requests.get(f"{API}/predictions/{pid}")
    assert r.status_code == 404


def test_admin_requires_admin(user):
    r = user.post(f"{API}/admin/predictions", json={"sport": "football", "title": "x",
                  "event": "x", "pick": "x", "odds": 1.5})
    assert r.status_code == 403


# ------------- Markets + Bets + Settle -------------
@pytest.fixture(scope="module")
def open_market(admin):
    mkt = {"sport": "football", "market_type": "over_under_goals", "title": "TEST O/U",
           "event": "X vs Y", "options": [{"label": "Over 2.5", "odds": 1.9},
                                            {"label": "Under 2.5", "odds": 1.9}]}
    r = admin.post(f"{API}/admin/markets", json=mkt)
    assert r.status_code == 200, r.text
    return r.json()


def test_create_market_visible(open_market):
    r = requests.get(f"{API}/markets")
    assert any(m["market_id"] == open_market["market_id"] for m in r.json())


def test_bet_insufficient(user, open_market):
    r = user.post(f"{API}/bets", json={"market_id": open_market["market_id"],
                                         "option_label": "Over 2.5", "coins": 100})
    assert r.status_code == 400


def test_bet_flow_won_payout(admin, open_market):
    # Create fresh user & credit coins via admin
    s = requests.Session()
    email = f"better_{uuid.uuid4().hex[:6]}@example.com"
    r = s.post(f"{API}/auth/register", json={"email": email, "password": "Pass1234", "name": "TEST_Better"})
    assert r.status_code == 200
    uid = r.json()["user_id"]
    admin.patch(f"{API}/admin/users/{uid}/coins", json={"delta": 1000})
    me = s.get(f"{API}/auth/me").json()
    assert me["coins_balance"] == 1000

    # Place bet 100 on "Over 2.5" odds 1.9 -> payout=190
    r = s.post(f"{API}/bets", json={"market_id": open_market["market_id"],
                                      "option_label": "Over 2.5", "coins": 100})
    assert r.status_code == 200, r.text
    bet = r.json()
    assert bet["potential_payout"] == 190 and bet["payout_diff"] == -100 and bet["status"] == "pending"
    assert "_id" not in bet
    me = s.get(f"{API}/auth/me").json()
    assert me["coins_balance"] == 900

    # Bets/me
    bets = s.get(f"{API}/bets/me").json()
    assert any(b["bet_id"] == bet["bet_id"] for b in bets)

    # Create a second market for void test BEFORE settling this one
    # Settle this market as won
    r = admin.post(f"{API}/admin/markets/{open_market['market_id']}/settle",
                   json={"winning_label": "Over 2.5"})
    assert r.status_code == 200
    # Winner balance = 900 + 190 = 1090
    me = s.get(f"{API}/auth/me").json()
    assert me["coins_balance"] == 1090
    # Bet updated
    mybets = s.get(f"{API}/bets/me").json()
    b2 = next(b for b in mybets if b["bet_id"] == bet["bet_id"])
    assert b2["status"] == "won" and b2["payout_diff"] == 90

    # Cannot settle twice
    r = admin.post(f"{API}/admin/markets/{open_market['market_id']}/settle",
                   json={"winning_label": "Over 2.5"})
    assert r.status_code == 400


def test_market_void_refund(admin):
    # New market for void flow
    mkt = {"sport": "football", "market_type": "draw", "title": "TEST void",
           "event": "A vs B", "options": [{"label": "Yes", "odds": 2.0},
                                            {"label": "No", "odds": 1.8}]}
    m = admin.post(f"{API}/admin/markets", json=mkt).json()

    s = requests.Session()
    email = f"void_{uuid.uuid4().hex[:6]}@example.com"
    r = s.post(f"{API}/auth/register", json={"email": email, "password": "Pass1234", "name": "TEST_Void"})
    uid = r.json()["user_id"]
    admin.patch(f"{API}/admin/users/{uid}/coins", json={"delta": 500})
    s.post(f"{API}/bets", json={"market_id": m["market_id"], "option_label": "Yes", "coins": 200})
    assert s.get(f"{API}/auth/me").json()["coins_balance"] == 300
    r = admin.post(f"{API}/admin/markets/{m['market_id']}/settle", json={"winning_label": ""})
    assert r.status_code == 200
    assert s.get(f"{API}/auth/me").json()["coins_balance"] == 500  # refunded

    # Bet marked void with payout_diff=0
    bet = s.get(f"{API}/bets/me").json()[0]
    assert bet["status"] == "void" and bet["payout_diff"] == 0

    # Cleanup
    admin.delete(f"{API}/admin/markets/{m['market_id']}")


def test_settle_requires_admin(user, admin):
    m = admin.post(f"{API}/admin/markets", json={"sport": "football", "market_type": "custom",
                                                   "title": "x", "event": "e",
                                                   "options": [{"label": "a", "odds": 1.5}]}).json()
    r = user.post(f"{API}/admin/markets/{m['market_id']}/settle", json={"winning_label": ""})
    assert r.status_code == 403
    admin.delete(f"{API}/admin/markets/{m['market_id']}")


# ------------- Recharges -------------
def test_recharge_validation(user):
    pms = requests.get(f"{API}/payment-methods").json()
    assert pms
    pm_id = pms[0]["payment_method_id"]
    # Below min -> 422 (Pydantic) or 400
    r = user.post(f"{API}/recharges", json={"payment_method_id": pm_id, "amount_usd": 10})
    assert r.status_code in (400, 422)
    # Above max
    r = user.post(f"{API}/recharges", json={"payment_method_id": pm_id, "amount_usd": 8000})
    assert r.status_code in (400, 422)


def test_recharge_approve_and_reject(admin):
    pms = requests.get(f"{API}/payment-methods").json()
    pm_id = pms[0]["payment_method_id"]

    s = requests.Session()
    email = f"rch_{uuid.uuid4().hex[:6]}@example.com"
    s.post(f"{API}/auth/register", json={"email": email, "password": "Pass1234", "name": "TEST_Rch"})

    # Approve path
    r = s.post(f"{API}/recharges", json={"payment_method_id": pm_id, "amount_usd": 20, "proof_note": "p"})
    assert r.status_code == 200
    rec = r.json()
    assert rec["status"] == "pending" and rec["coins"] == 2000 and "_id" not in rec
    r = admin.post(f"{API}/admin/recharges/{rec['recharge_id']}/review", json={"action": "approve"})
    assert r.status_code == 200 and r.json()["status"] == "approved"
    assert s.get(f"{API}/auth/me").json()["coins_balance"] == 2000

    # Reject path
    r = s.post(f"{API}/recharges", json={"payment_method_id": pm_id, "amount_usd": 50})
    rid = r.json()["recharge_id"]
    r = admin.post(f"{API}/admin/recharges/{rid}/review", json={"action": "reject"})
    assert r.status_code == 200 and r.json()["status"] == "rejected"
    assert s.get(f"{API}/auth/me").json()["coins_balance"] == 2000  # no change

    # Can't review twice
    r = admin.post(f"{API}/admin/recharges/{rid}/review", json={"action": "approve"})
    assert r.status_code == 400


# ------------- Admin payment methods -------------
def test_admin_payment_methods_crud(admin):
    # Admin GET includes config
    r = admin.get(f"{API}/admin/payment-methods")
    assert r.status_code == 200
    items = r.json()
    if items:
        # at least some have config field (default Stripe does)
        assert any("config" in it for it in items)
    # Create
    r = admin.post(f"{API}/admin/payment-methods", json={"name": "TEST_PM", "type": "custom",
                   "instructions": "i", "account_info": "x", "config": {"k": "v"},
                   "active": True, "order": 99})
    assert r.status_code == 200
    pid = r.json()["payment_method_id"]
    # Update
    r = admin.patch(f"{API}/admin/payment-methods/{pid}", json={"name": "TEST_PM2", "type": "custom",
                    "instructions": "i", "account_info": "x", "config": {"k": "v2"},
                    "active": False, "order": 99})
    assert r.status_code == 200
    # Now inactive: should not appear in public
    pub = requests.get(f"{API}/payment-methods").json()
    assert not any(p["payment_method_id"] == pid for p in pub)
    # Delete
    r = admin.delete(f"{API}/admin/payment-methods/{pid}")
    assert r.status_code == 200


# ------------- Admin banners -------------
def test_admin_banners_crud(admin):
    r = admin.post(f"{API}/admin/banners", json={"title": "TEST_B", "image_url": "https://x.com/i.jpg",
                   "link_url": "/", "zone": "hero", "active": True, "order": 1})
    assert r.status_code == 200
    bid = r.json()["banner_id"]
    # Filter by zone
    r = requests.get(f"{API}/banners?zone=hero")
    assert r.status_code == 200
    assert any(b["banner_id"] == bid for b in r.json())
    # Update inactive -> not in public
    r = admin.patch(f"{API}/admin/banners/{bid}",
                    json={"title": "TEST_B2", "image_url": "https://x.com/i.jpg",
                          "link_url": "/", "zone": "hero", "active": False, "order": 1})
    assert r.status_code == 200
    pub = requests.get(f"{API}/banners?zone=hero").json()
    assert not any(b["banner_id"] == bid for b in pub)
    # Delete
    admin.delete(f"{API}/admin/banners/{bid}")


# ------------- Admin users / metrics / notifications -------------
def test_admin_users_role_and_coins(admin):
    s = requests.Session()
    email = f"au_{uuid.uuid4().hex[:6]}@example.com"
    s.post(f"{API}/auth/register", json={"email": email, "password": "Pass1234", "name": "TEST_AU"})
    uid = s.get(f"{API}/auth/me").json()["user_id"]

    r = admin.get(f"{API}/admin/users")
    assert r.status_code == 200
    users = r.json()
    for u in users:
        assert "password_hash" not in u and "_id" not in u
    assert any(u["user_id"] == uid for u in users)

    # Role
    r = admin.patch(f"{API}/admin/users/{uid}/role", json={"role": "admin"})
    assert r.status_code == 200
    assert s.get(f"{API}/auth/me").json()["role"] == "admin"
    r = admin.patch(f"{API}/admin/users/{uid}/role", json={"role": "user"})
    assert r.status_code == 200

    # Coins delta
    admin.patch(f"{API}/admin/users/{uid}/coins", json={"delta": 300})
    assert s.get(f"{API}/auth/me").json()["coins_balance"] == 300
    admin.patch(f"{API}/admin/users/{uid}/coins", json={"delta": -100})
    assert s.get(f"{API}/auth/me").json()["coins_balance"] == 200

    # Invalid role
    r = admin.patch(f"{API}/admin/users/{uid}/role", json={"role": "superuser"})
    assert r.status_code == 400


def test_admin_metrics(admin):
    r = admin.get(f"{API}/admin/metrics")
    assert r.status_code == 200
    d = r.json()
    for k in ["users", "markets_open", "bets", "recharges_pending", "predictions", "revenue_usd"]:
        assert k in d


def test_admin_notifications_no_sub(admin):
    r = admin.post(f"{API}/admin/notifications/send",
                   json={"title": "t", "body": "b", "target": "all"})
    assert r.status_code == 200
    d = r.json()
    assert d["ok"] is True
    assert d["sent"] == 0


# ------------- Serialization global check -------------
def test_no_mongo_id_in_lists(admin):
    for path in ["/predictions", "/markets", "/banners", "/payment-methods",
                 "/admin/users", "/admin/payment-methods", "/admin/banners",
                 "/admin/recharges"]:
        r = admin.get(f"{API}{path}")
        assert r.status_code == 200, path
        for item in r.json():
            assert "_id" not in item, f"{path} leaked _id"
