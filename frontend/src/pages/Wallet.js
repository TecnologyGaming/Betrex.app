import React, { useEffect, useState, useCallback } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import api from "../lib/api";
import { useAuth } from "../contexts/AuthContext";
import { useLang } from "../contexts/LanguageContext";
import { Coins, Wallet as WalletIcon, CreditCard, CheckCircle } from "@phosphor-icons/react";

export default function Wallet() {
  const { user, refresh, loading } = useAuth();
  const { t, lang } = useLang();
  const nav = useNavigate();
  const [params, setParams] = useSearchParams();
  const [methods, setMethods] = useState([]);
  const [recharges, setRecharges] = useState([]);
  const [pmId, setPmId] = useState("");
  const [amount, setAmount] = useState(10);
  const [note, setNote] = useState("");
  const [proofUrl, setProofUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);
  const [stripeStatus, setStripeStatus] = useState(null);

  // Premium Subscription States & Helpers
  const [subBusy, setSubBusy] = useState(false);
  const [subErr, setSubErr] = useState("");
  const [subSuccess, setSubSuccess] = useState(false);

  const isPremiumActive = () => {
    if (!user?.premium_until) return false;
    try {
      const exp = new Date(user.premium_until);
      return exp > new Date();
    } catch (e) {
      return false;
    }
  };

  const getPremiumExpDate = () => {
    if (!user?.premium_until) return "";
    return new Date(user.premium_until).toLocaleString();
  };

  const subscribePremium = async () => {
    if (!window.confirm(lang === "es" ? "¿Confirmas que deseas suscribirte al paquete premium mensual por 500 monedas virtuales?" : "Confirm subscribe to premium monthly package for 500 virtual coins?")) return;
    setSubBusy(true); setSubErr(""); setSubSuccess(false);
    try {
      await api.post("/users/subscribe-monthly");
      setSubSuccess(true);
      await refresh();
    } catch (e) {
      setSubErr(e?.response?.data?.detail || "Error");
    } finally {
      setSubBusy(false);
    }
  };

  const loadRecharges = useCallback(() => {
    api.get("/recharges/me").then(({ data }) => setRecharges(data || []));
  }, []);

  useEffect(() => {
    if (loading) return;
    if (!user) { nav("/login"); return; }
    api.get("/payment-methods").then(({ data }) => {
      setMethods(data || []);
      if (data?.[0]) setPmId(data[0].payment_method_id);
    });
    loadRecharges();
  }, [user, loading, nav, loadRecharges]);

  // Stripe return: poll status
  useEffect(() => {
    const sessionId = params.get("session_id");
    const canceled = params.get("canceled");
    if (canceled) {
      setMsg({ ok: false, text: lang === "es" ? "Pago cancelado" : "Payment canceled" });
      setParams({});
      return;
    }
    if (!sessionId || !user) return;
    setStripeStatus({ checking: true });
    let attempts = 0;
    const poll = async () => {
      try {
        const { data } = await api.get(`/recharges/stripe/status/${sessionId}`);
        if (data.payment_status === "paid" || data.credited) {
          setStripeStatus({ ok: true, coins: data.coins, amount: data.amount_usd });
          await refresh();
          loadRecharges();
          setParams({});
          return;
        }
        if (data.status === "expired") {
          setStripeStatus({ ok: false, msg: lang === "es" ? "Sesión expirada" : "Session expired" });
          setParams({});
          return;
        }
        attempts++;
        if (attempts < 8) setTimeout(poll, 2000);
        else setStripeStatus({ ok: false, msg: lang === "es" ? "Verifica tu correo de Stripe" : "Check your Stripe email" });
      } catch (e) {
        setStripeStatus({ ok: false, msg: e?.response?.data?.detail || "Error" });
      }
    };
    poll();
  }, [user, params, setParams, refresh, loadRecharges, lang]);

  if (!user) return null;
  const selected = methods.find((m) => m.payment_method_id === pmId);
  const isStripe = selected?.type === "stripe";

  const submit = async (e) => {
    e.preventDefault();
    if (isStripe) return payWithStripe();
    setBusy(true); setMsg(null);
    try {
      await api.post("/recharges", {
        payment_method_id: pmId, amount_usd: Number(amount),
        proof_note: note, proof_url: proofUrl || null,
      });
      setMsg({ ok: true, text: t("common.requestSent") });
      setNote(""); setProofUrl("");
      loadRecharges();
    } catch (err) {
      setMsg({ ok: false, text: err?.response?.data?.detail || "Error" });
    } finally { setBusy(false); }
  };

  const payWithStripe = async () => {
    setBusy(true); setMsg(null);
    try {
      const { data } = await api.post("/recharges/stripe/checkout", {
        amount_usd: Number(amount),
        origin_url: window.location.origin,
      });
      window.location.href = data.checkout_url;
    } catch (err) {
      setMsg({ ok: false, text: err?.response?.data?.detail || "Error" });
      setBusy(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-12">
      <div className="mb-8 flex items-center justify-between flex-wrap gap-4">
        <div>
          <span className="label">Wallet</span>
          <h1 className="font-display font-black text-4xl sm:text-5xl uppercase tracking-tighter">{t("wallet.title")}</h1>
          <p className="text-zinc-400 mt-2">{t("wallet.subtitle")}</p>
        </div>
        <div className="pz-card px-6 py-4 flex items-center gap-3 glow-lime">
          <Coins size={32} weight="fill" color="#d4ff00" />
          <div>
            <div className="label">{t("common.balance")}</div>
            <div className="font-mono font-bold text-3xl text-[#d4ff00]" data-testid="wallet-balance">{user.coins_balance}</div>
          </div>
        </div>
      </div>

      {/* Premium Subscription Section */}
      <div className="pz-card mb-8 p-6 bg-gradient-to-r from-zinc-950 via-zinc-900 to-zinc-950 border border-zinc-800 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-[#d4ff00]/5 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2 max-w-2xl">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded text-[10px] font-black bg-[#d4ff00] text-black">
                ★ PREMIUM ONLY
              </span>
              {isPremiumActive() && (
                <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-emerald-500 text-black">
                  {lang === "es" ? "ACTIVO" : "ACTIVE"}
                </span>
              )}
            </div>
            <h2 className="font-display font-black text-2xl uppercase tracking-tight text-white">
              {lang === "es" ? "Suscripción Mensual de Pronósticos Premium" : "Monthly Premium Predictions Subscription"}
            </h2>
            <p className="text-sm text-zinc-400 leading-relaxed">
              {lang === "es"
                ? "Obtén acceso ilimitado e instantáneo a todos los pronósticos y análisis premium de BetRex por 30 días usando tus monedas virtuales de forma segura."
                : "Get unlimited, instant access to all premium BetRex predictions and analysis for 30 days securely using your virtual coins."}
            </p>
            {isPremiumActive() ? (
              <div className="text-xs text-emerald-400 font-mono flex items-center gap-1 font-bold">
                <span>✓</span> {lang === "es" ? `Tu suscripción está activa hasta: ${getPremiumExpDate()}` : `Your subscription is active until: ${getPremiumExpDate()}`}
              </div>
            ) : (
              <div className="text-xs text-[#d4ff00] font-mono font-bold">
                {lang === "es" ? "Costo: 500 monedas / 30 días" : "Cost: 500 coins / 30 days"}
              </div>
            )}
          </div>
          <div className="shrink-0 flex flex-col justify-center min-w-[200px]">
            <button
              onClick={subscribePremium}
              disabled={subBusy}
              className="btn-primary w-full justify-center text-sm font-black py-3 px-6 shadow-lg shadow-[#d4ff00]/10 transition-transform active:scale-[0.98]"
              style={{ backgroundColor: '#d4ff00', color: 'black' }}
            >
              {subBusy ? "..." : isPremiumActive() ? (lang === "es" ? "Renovar (500 🪙)" : "Renew (500 🪙)") : (lang === "es" ? "Suscribirse (500 🪙)" : "Subscribe (500 🪙)")}
            </button>
            {subErr && <div className="text-[#ff3b30] text-xs text-center mt-2 font-semibold">{subErr}</div>}
            {subSuccess && <div className="text-emerald-400 text-xs text-center mt-2 font-semibold">
              {lang === "es" ? "¡Suscripción activada con éxito!" : "Subscription activated successfully!"}
            </div>}
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <form onSubmit={submit} className="pz-card p-6 space-y-4" data-testid="recharge-form">
          <h2 className="font-display font-bold text-2xl uppercase">{t("wallet.newRecharge")}</h2>
          <p className="text-xs text-zinc-400">{t("wallet.ratePerDollar")} {t("wallet.minMax")}</p>

          <div>
            <label className="label">{t("wallet.pickMethod")}</label>
            <div className="grid grid-cols-2 gap-2">
              {methods.map((m) => (
                <button
                  key={m.payment_method_id}
                  type="button"
                  onClick={() => setPmId(m.payment_method_id)}
                  data-testid={`pm-pick-${m.type}`}
                  className={`px-3 py-3 rounded-md border text-left transition-all ${
                    pmId === m.payment_method_id ? "border-[#d4ff00] bg-[#d4ff00]/10" : "border-zinc-800 hover:border-zinc-700"
                  }`}
                >
                  <div className="font-bold uppercase text-sm">{m.name}</div>
                  <div className="text-xs text-zinc-400">{m.type}</div>
                </button>
              ))}
            </div>
          </div>

          {selected && (selected.instructions || selected.account_info) && !isStripe && (
            <div className="bg-black/40 border border-zinc-800 rounded-md p-3 text-sm">
              <div className="text-zinc-400 whitespace-pre-wrap">{selected.instructions}</div>
              {selected.account_info && (
                <div className="mt-2 font-mono text-[#d4ff00] break-all">{selected.account_info}</div>
              )}
            </div>
          )}

          {isStripe && (
            <div className="bg-[#007aff]/10 border border-[#007aff]/40 rounded-md p-3 text-sm flex items-start gap-2">
              <CreditCard size={20} weight="duotone" color="#007aff" className="shrink-0 mt-0.5" />
              <div className="text-zinc-300">
                {lang === "es"
                  ? "Pago instantáneo con tarjeta. Tus coins se acreditarán automáticamente al completar el pago."
                  : "Instant card payment. Coins are credited automatically once payment completes."}
              </div>
            </div>
          )}

          <div>
            <label className="label">{t("common.amount")} (USD)</label>
            <input
              type="number" min={10} max={7000} step={10}
              value={amount} onChange={(e) => setAmount(e.target.value)}
              className="input" required data-testid="recharge-amount"
            />
            <div className="text-xs text-zinc-500 mt-1 font-mono">= {Number(amount) * 100} {t("common.coins")}</div>
          </div>

          {!isStripe && (
            <>
              <div>
                <label className="label">{t("wallet.proofNote")}</label>
                <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} className="input" data-testid="recharge-note" />
              </div>

              <div>
                <label className="label">{t("wallet.proofUrl")}</label>
                <input type="url" value={proofUrl} onChange={(e) => setProofUrl(e.target.value)} className="input" placeholder="https://..." data-testid="recharge-proof" />
              </div>
            </>
          )}

          <button type="submit" disabled={busy || !pmId} className={isStripe ? "btn-secondary w-full justify-center" : "btn-primary w-full justify-center"} data-testid="recharge-submit">
            {busy ? "..." : isStripe ? (
              <><CreditCard size={16} weight="fill" /> {lang === "es" ? `Pagar $${amount} con tarjeta` : `Pay $${amount} by card`}</>
            ) : t("common.submit")}
          </button>
          {stripeStatus?.ok && (
            <div className="border border-[#00e676] bg-[#00e676]/10 rounded-md p-3 flex items-center gap-2" data-testid="stripe-success">
              <CheckCircle size={20} weight="fill" color="#00e676" />
              <div className="text-sm">
                <div className="font-bold text-[#00e676]">{lang === "es" ? "¡Pago exitoso!" : "Payment successful!"}</div>
                <div className="text-zinc-300">+{stripeStatus.coins} coins · ${stripeStatus.amount}</div>
              </div>
            </div>
          )}
          {stripeStatus?.checking && (
            <div className="text-sm text-zinc-400" data-testid="stripe-checking">{lang === "es" ? "Verificando pago..." : "Verifying payment..."}</div>
          )}
          {stripeStatus && stripeStatus.ok === false && (
            <div className="text-sm text-[#ff3b30]">{stripeStatus.msg}</div>
          )}
          {msg && <div className={`text-sm ${msg.ok ? "text-[#00e676]" : "text-[#ff3b30]"}`} data-testid="recharge-msg">{msg.text}</div>}
        </form>

        <div className="pz-card p-6">
          <h2 className="font-display font-bold text-2xl uppercase mb-4">{t("wallet.myRecharges")}</h2>
          {recharges.length === 0 ? (
            <div className="text-zinc-500 text-sm">{t("common.noData")}</div>
          ) : (
            <div className="space-y-2 max-h-[500px] overflow-auto scrollbar-thin pr-1">
              {recharges.map((r) => (
                <div key={r.recharge_id} className="border border-zinc-800 rounded-md p-3 flex items-center justify-between">
                  <div>
                    <div className="font-bold">${r.amount_usd} <span className="text-zinc-500 text-xs">/ {r.coins} coins</span></div>
                    <div className="text-xs text-zinc-400">{r.payment_method_name} · {new Date(r.created_at).toLocaleString()}</div>
                  </div>
                  <span className={`badge ${r.status === "approved" ? "badge-win" : r.status === "rejected" ? "badge-loss" : "badge-pending"}`}>
                    {r.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
