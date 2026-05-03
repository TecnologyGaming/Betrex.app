import React, { useState } from "react";
import api from "../lib/api";
import { useAuth } from "../contexts/AuthContext";
import { useLang } from "../contexts/LanguageContext";
import { useNavigate } from "react-router-dom";
import { SoccerBall, Horse, Baseball, Ticket, Coins } from "@phosphor-icons/react";

const SPORT_ICON = {
  football: SoccerBall,
  horse: Horse,
  baseball: Baseball,
  lottery: Ticket,
};

export default function MarketCard({ market, onBetPlaced }) {
  const { user, refresh } = useAuth();
  const { t } = useLang();
  const nav = useNavigate();
  const [coins, setCoins] = useState(50);
  const [selected, setSelected] = useState(market.options?.[0]?.label || "");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);

  const Icon = SPORT_ICON[market.sport] || SoccerBall;

  const opt = market.options.find((o) => o.label === selected);
  const payout = opt ? Math.round(coins * Number(opt.odds)) : 0;

  const placeBet = async () => {
    if (!user) { nav("/login"); return; }
    setBusy(true); setMsg(null);
    try {
      await api.post("/bets", { market_id: market.market_id, option_label: selected, coins });
      await refresh();
      setMsg({ ok: true, text: t("markets.placedBet") });
      onBetPlaced?.();
    } catch (e) {
      setMsg({ ok: false, text: e?.response?.data?.detail || "Error" });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="pz-card p-5 flex flex-col gap-3" data-testid={`market-card-${market.market_id}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-md bg-zinc-900 grid place-items-center">
            <Icon size={18} weight="duotone" color="#007aff" />
          </div>
          <span className="label !mb-0">{t(`common.${market.sport}`)}</span>
        </div>
        <span className="badge badge-lime"><span className="w-1.5 h-1.5 rounded-full bg-[#d4ff00] pulse-dot mr-1.5" />{t("common.open")}</span>
      </div>
      <div>
        <h3 className="font-display font-bold text-xl uppercase tracking-tight leading-tight">{market.title}</h3>
        <p className="text-zinc-400 text-sm mt-0.5">{market.event}</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {market.options.map((o) => (
          <button
            key={o.label}
            onClick={() => setSelected(o.label)}
            data-testid={`market-option-${market.market_id}-${o.label}`}
            className={`px-3 py-2 rounded-md border text-left transition-all ${
              selected === o.label
                ? "border-[#d4ff00] bg-[#d4ff00]/10"
                : "border-zinc-800 hover:border-zinc-700"
            }`}
          >
            <div className="text-xs text-zinc-400">{o.label}</div>
            <div className="font-mono font-bold text-lg text-white">{Number(o.odds).toFixed(2)}</div>
          </button>
        ))}
      </div>

      <div className="flex items-center gap-2 pt-2 border-t border-zinc-900">
        <div className="flex-1">
          <label className="label">{t("markets.betWith")}</label>
          <div className="flex items-center gap-2">
            <Coins size={18} color="#d4ff00" weight="fill" />
            <input
              type="number"
              min={1}
              value={coins}
              onChange={(e) => setCoins(Math.max(1, Number(e.target.value) || 0))}
              className="input !py-1.5"
              data-testid={`market-coins-${market.market_id}`}
            />
          </div>
        </div>
        <div className="text-right">
          <div className="label">{t("markets.potentialPayout")}</div>
          <div className="font-mono font-bold text-xl text-[#d4ff00]">{payout}</div>
        </div>
      </div>

      <button
        onClick={placeBet}
        disabled={busy || !selected}
        className="btn-primary w-full justify-center"
        data-testid={`place-bet-btn-${market.market_id}`}
      >
        {busy ? "..." : t("common.placeBet")}
      </button>
      {msg && (
        <div className={`text-sm ${msg.ok ? "text-[#00e676]" : "text-[#ff3b30]"}`} data-testid="bet-msg">
          {msg.text}
        </div>
      )}
    </div>
  );
}
