import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../lib/api";
import { useAuth } from "../contexts/AuthContext";
import { useLang } from "../contexts/LanguageContext";
import { Coins, Wallet as WalletIcon } from "@phosphor-icons/react";

export default function Wallet() {
  const { user } = useAuth();
  const { t, lang } = useLang();
  const nav = useNavigate();
  const [methods, setMethods] = useState([]);
  const [recharges, setRecharges] = useState([]);
  const [pmId, setPmId] = useState("");
  const [amount, setAmount] = useState(20);
  const [note, setNote] = useState("");
  const [proofUrl, setProofUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);

  useEffect(() => {
    if (!user) { nav("/login"); return; }
    api.get("/payment-methods").then(({ data }) => {
      setMethods(data || []);
      if (data?.[0]) setPmId(data[0].payment_method_id);
    });
    api.get("/recharges/me").then(({ data }) => setRecharges(data || []));
  }, [user, nav]);

  if (!user) return null;
  const selected = methods.find((m) => m.payment_method_id === pmId);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true); setMsg(null);
    try {
      await api.post("/recharges", {
        payment_method_id: pmId, amount_usd: Number(amount),
        proof_note: note, proof_url: proofUrl || null,
      });
      setMsg({ ok: true, text: t("common.requestSent") });
      setNote(""); setProofUrl("");
      const { data } = await api.get("/recharges/me"); setRecharges(data || []);
    } catch (err) {
      setMsg({ ok: false, text: err?.response?.data?.detail || "Error" });
    } finally { setBusy(false); }
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

          {selected && (selected.instructions || selected.account_info) && (
            <div className="bg-black/40 border border-zinc-800 rounded-md p-3 text-sm">
              <div className="text-zinc-400 whitespace-pre-wrap">{selected.instructions}</div>
              {selected.account_info && (
                <div className="mt-2 font-mono text-[#d4ff00] break-all">{selected.account_info}</div>
              )}
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

          <div>
            <label className="label">{t("wallet.proofNote")}</label>
            <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} className="input" data-testid="recharge-note" />
          </div>

          <div>
            <label className="label">{t("wallet.proofUrl")}</label>
            <input type="url" value={proofUrl} onChange={(e) => setProofUrl(e.target.value)} className="input" placeholder="https://..." data-testid="recharge-proof" />
          </div>

          <button type="submit" disabled={busy || !pmId} className="btn-primary w-full justify-center" data-testid="recharge-submit">
            {busy ? "..." : t("common.submit")}
          </button>
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
