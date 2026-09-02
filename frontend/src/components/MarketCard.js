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
  const { t, lang } = useLang();
  const nav = useNavigate();
  const [coins, setCoins] = useState(50);
  const [selected, setSelected] = useState(market.options?.[0]?.label || "");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);

  const Icon = SPORT_ICON[market.sport] || SoccerBall;

  const opt = market.options.find((o) => o.label === selected);
  const payout = opt ? Math.round(coins * Number(opt.odds)) : 0;

  const TEAM_LOGOS = {
    "real madrid": "https://upload.wikimedia.org/wikipedia/en/5/56/Real_Madrid_CF.svg",
    "barcelona": "https://upload.wikimedia.org/wikipedia/en/4/47/FC_Barcelona.svg",
    "fc barcelona": "https://upload.wikimedia.org/wikipedia/en/4/47/FC_Barcelona.svg",
    "barca": "https://upload.wikimedia.org/wikipedia/en/4/47/FC_Barcelona.svg",
    "atlético madrid": "https://upload.wikimedia.org/wikipedia/en/f/f4/Atletico_Madrid_2017_logo.svg",
    "atletico madrid": "https://upload.wikimedia.org/wikipedia/en/f/f4/Atletico_Madrid_2017_logo.svg",
    "manchester united": "https://upload.wikimedia.org/wikipedia/en/7/7a/Manchester_United_FC_crest.svg",
    "manchester city": "https://upload.wikimedia.org/wikipedia/en/e/eb/Manchester_City_FC_badge.svg",
    "liverpool": "https://upload.wikimedia.org/wikipedia/en/0/0c/Liverpool_FC.svg",
    "arsenal": "https://upload.wikimedia.org/wikipedia/en/5/53/Arsenal_FC.svg",
    "chelsea": "https://upload.wikimedia.org/wikipedia/en/c/cc/Chelsea_FC.svg",
    "bayern munich": "https://upload.wikimedia.org/wikipedia/commons/1/1b/FC_Bayern_M%C3%BCnchen_logo_%282017%29.svg",
    "psg": "https://upload.wikimedia.org/wikipedia/en/a/a7/Paris_Saint-Germain_F.C..svg",
    "paris saint-germain": "https://upload.wikimedia.org/wikipedia/en/a/a7/Paris_Saint-Germain_F.C..svg",
    "new york yankees": "https://upload.wikimedia.org/wikipedia/commons/f/fe/New_York_Yankees_logo.svg",
    "los angeles dodgers": "https://upload.wikimedia.org/wikipedia/commons/6/69/Los_Angeles_Dodgers_logo.svg",
    "boston red sox": "https://upload.wikimedia.org/wikipedia/commons/a/aa/Boston_Red_Sox_logo.svg",
  };

  const getTeamLogos = () => {
    if (market.sport !== "football" && market.sport !== "baseball") return null;
    const parts = market.title.split(/\s+(?:vs|-|@)\s+/i);
    if (parts.length === 2) {
      const home = parts[0].trim().toLowerCase();
      const away = parts[1].trim().toLowerCase();
      const homeLogo = TEAM_LOGOS[home] || TEAM_LOGOS[home.replace("fc", "").trim()];
      const awayLogo = TEAM_LOGOS[away] || TEAM_LOGOS[away.replace("fc", "").trim()];
      
      if (homeLogo || awayLogo) {
        return (
          <div className="flex items-center justify-center gap-6 py-3 my-1 bg-zinc-950/40 border border-zinc-900/60 rounded-xl">
            <div className="text-center flex flex-col items-center gap-1 w-24">
              {homeLogo ? (
                <img src={homeLogo} alt={parts[0]} className="w-12 h-12 object-contain filter drop-shadow-[0_0_8px_rgba(255,255,255,0.05)]" />
              ) : (
                <div className="w-12 h-12 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center font-bold text-zinc-500 text-lg">🛡</div>
              )}
              <span className="text-[10px] text-zinc-400 font-bold uppercase truncate max-w-full">{parts[0]}</span>
            </div>

            <span className="font-display font-black text-xs text-[#d4ff00] bg-zinc-900 px-2 py-0.5 rounded border border-zinc-800 tracking-wider">VS</span>

            <div className="text-center flex flex-col items-center gap-1 w-24">
              {awayLogo ? (
                <img src={awayLogo} alt={parts[1]} className="w-12 h-12 object-contain filter drop-shadow-[0_0_8px_rgba(255,255,255,0.05)]" />
              ) : (
                <div className="w-12 h-12 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center font-bold text-zinc-500 text-lg">🛡</div>
              )}
              <span className="text-[10px] text-zinc-400 font-bold uppercase truncate max-w-full">{parts[1]}</span>
            </div>
          </div>
        );
      }
    }
    return null;
  };

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
        {getTeamLogos() ? (
          getTeamLogos()
        ) : (
          <h3 className="font-display font-bold text-xl uppercase tracking-tight leading-tight">{market.title}</h3>
        )}
        <p className="text-zinc-400 text-sm mt-1">{market.event}</p>
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
