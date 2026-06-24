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
  const [amount, setAmount] = useState(20);
  const [note, setNote] = useState("");
  const [proofUrl, setProofUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);
  const [stripeStatus, setStripeStatus] = useState(null);

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
              type="number" min={20} max={7000} step={10}
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
