import React, { useEffect, useState } from "react";
import api from "../lib/api";
import { useAuth } from "../contexts/AuthContext";
import { useLang } from "../contexts/LanguageContext";
import { Flame, Gift, Coins, Lightning } from "@phosphor-icons/react";

export default function StreakWidget({ compact = false }) {
  const { user, refresh } = useAuth();
  const { lang } = useLang();
  const [status, setStatus] = useState(null);
  const [busy, setBusy] = useState(false);
  const [justClaimed, setJustClaimed] = useState(null);

  const load = () => {
    if (!user) return;
    api.get("/streak/status").then(({ data }) => setStatus(data)).catch(() => {});
  };
  useEffect(load, [user]);

  if (!user || !status) return null;
  if (!status.enabled) return null;  // Hidden when admin disabled

  const claim = async () => {
    setBusy(true);
    try {
      const { data } = await api.post("/streak/claim");
      setJustClaimed(data);
      await refresh();
      load();
    } catch (e) {
      // silent
    } finally { setBusy(false); }
  };

  const ladderEntries = Object.entries(status.ladder).map(([d, r]) => ({ day: Number(d), reward: r }));
  ladderEntries.sort((a, b) => a.day - b.day);

  const t = {
    es: {
      title: "Tu racha diaria",
      sub: "Inicia sesión cada día y gana coins gratis",
      streak: "Racha actual",
      best: "Mejor",
      days: "días",
      claim: "Reclamar bono diario",
      claimed: "Ya reclamaste hoy",
      today: "Hoy",
      reward: "Premio",
      keep: "Vuelve mañana para subir tu racha",
      gotIt: "¡Genial!",
      youGot: "Ganaste",
    },
    en: {
      title: "Your daily streak",
      sub: "Log in every day and earn free coins",
      streak: "Current streak",
      best: "Best",
      days: "days",
      claim: "Claim daily bonus",
      claimed: "Claimed today",
      today: "Today",
      reward: "Reward",
      keep: "Come back tomorrow to grow your streak",
      gotIt: "Awesome!",
      youGot: "You got",
    },
  }[lang];

  if (compact) {
    return (
      <button
        onClick={claim}
        disabled={!status.available || busy}
        data-testid="streak-compact-claim"
        className={`pz-card p-4 flex items-center gap-3 w-full text-left ${
          status.available ? "border-[#d4ff00] hover:bg-[#d4ff00]/5" : "opacity-70"
        } transition-colors`}
      >
        <div className={`w-10 h-10 rounded-md grid place-items-center ${status.available ? "bg-[#d4ff00]" : "bg-zinc-800"}`}>
          {status.available ? <Gift size={22} weight="fill" color="#000" /> : <Flame size={22} weight="fill" color="#d4ff00" />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-bold text-sm leading-tight">{status.available ? t.claim : t.claimed}</div>
          <div className="text-xs text-zinc-400">
            {t.streak}: <span className="font-mono font-bold text-white">{status.streak_current}</span> {t.days}
          </div>
        </div>
        {status.available && (
          <div className="text-right">
            <div className="font-mono font-bold text-[#d4ff00]">+{status.next_reward}</div>
            <div className="text-[10px] text-zinc-500">coins</div>
          </div>
        )}
      </button>
    );
  }

  return (
    <div className="pz-card p-6 relative overflow-hidden" data-testid="streak-widget">
      <div className="absolute inset-0 pointer-events-none opacity-30"
           style={{ background: "radial-gradient(circle at 90% 10%, rgba(212,255,0,0.25), transparent 50%)" }} />
      <div className="relative">
        <div className="flex items-start justify-between gap-3 mb-4">
          <div>
            <span className="label">Daily streak</span>
            <h3 className="font-display font-bold text-2xl uppercase tracking-tight flex items-center gap-2">
              <Flame size={28} weight="fill" color="#d4ff00" />
              {t.title}
            </h3>
            <p className="text-sm text-zinc-400 mt-1">{t.sub}</p>
          </div>
          <div className="text-right shrink-0">
            <div className="label !mb-0">{t.streak}</div>
            <div className="font-mono font-black text-4xl text-[#d4ff00] leading-none">{status.streak_current}</div>
            <div className="text-xs text-zinc-500">{t.best}: {status.streak_best}</div>
          </div>
        </div>

        {/* ladder */}
        <div className="grid grid-cols-5 gap-2 mb-5">
          {ladderEntries.map(({ day, reward }) => {
            const passed = status.streak_current >= day;
            const isNext = !passed && status.next_day === day;
            return (
              <div
                key={day}
                className={`border rounded-md p-2 text-center ${
                  passed ? "border-[#d4ff00] bg-[#d4ff00]/10"
                    : isNext ? "border-[#007aff] bg-[#007aff]/10"
                    : "border-zinc-800"
                }`}
                data-testid={`streak-ladder-${day}`}
              >
                <div className="text-[10px] text-zinc-400 uppercase font-bold tracking-wider">D{day}</div>
                <div className={`font-mono font-bold text-sm ${passed ? "text-[#d4ff00]" : isNext ? "text-[#007aff]" : "text-zinc-500"}`}>
                  +{reward}
                </div>
              </div>
            );
          })}
        </div>

        {justClaimed ? (
          <div className="border border-[#00e676] bg-[#00e676]/10 rounded-md p-3 flex items-center gap-3" data-testid="streak-just-claimed">
            <Coins size={24} weight="fill" color="#00e676" />
            <div className="flex-1">
              <div className="font-bold text-[#00e676]">{t.youGot} +{justClaimed.reward} coins</div>
              <div className="text-xs text-zinc-400">{t.keep}</div>
            </div>
          </div>
        ) : status.available ? (
          <button
            onClick={claim}
            disabled={busy}
            className="btn-primary w-full justify-center"
            data-testid="streak-claim-btn"
          >
            {busy ? "..." : <><Gift size={16} weight="fill" /> {t.claim} · +{status.next_reward}</>}
          </button>
        ) : (
          <div className="text-center text-sm text-zinc-400 py-2">
            <Lightning size={16} weight="fill" color="#d4ff00" className="inline" /> {t.claimed} · {t.keep}
          </div>
        )}
      </div>
    </div>
  );
}
