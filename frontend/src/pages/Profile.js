import React, { useEffect, useState } from "react";
import api from "../lib/api";
import { useAuth } from "../contexts/AuthContext";
import { useLang } from "../contexts/LanguageContext";
import { useNavigate } from "react-router-dom";
import { BellRinging, BellSlash, UserCircle, Users, Trophy, Lightning, Copy } from "@phosphor-icons/react";
import StreakWidget from "../components/StreakWidget";

function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const arr = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
  return arr;
}

export default function Profile() {
  const { user, loading } = useAuth();
  const { t, lang } = useLang();
  const nav = useNavigate();
  const [bets, setBets] = useState([]);
  const [pushOk, setPushOk] = useState(false);
  const [pushMsg, setPushMsg] = useState("");

  useEffect(() => {
    if (loading) return;
    if (!user) { nav("/login"); return; }
    api.get("/bets/me").then(({ data }) => setBets(data || []));
    if ("Notification" in window && Notification.permission === "granted") setPushOk(true);
  }, [user, loading, nav]);

  const enablePush = async () => {
    setPushMsg("");
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      setPushMsg(lang === "es" ? "Tu navegador no soporta push." : "Your browser doesn't support push.");
      return;
    }
    try {
      const perm = await Notification.requestPermission();
      if (perm !== "granted") { setPushMsg(lang === "es" ? "Permiso denegado." : "Permission denied."); return; }
      const reg = await navigator.serviceWorker.register("/sw.js");
      await navigator.serviceWorker.ready;
      const { data } = await api.get("/push/public-key");
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(data.public_key),
      });
      const json = sub.toJSON();
      await api.post("/push/subscribe", { endpoint: json.endpoint, keys: json.keys });
      setPushOk(true);
      setPushMsg(t("common.notificationsEnabled"));
    } catch (e) {
      setPushMsg(String(e.message || e));
    }
  };

  if (!user) return null;

  const won = bets.filter((b) => b.status === "won").length;
  const lost = bets.filter((b) => b.status === "lost").length;
  const profit = bets.reduce((s, b) => s + (b.payout_diff || 0), 0);

  return (
    <div className="max-w-5xl mx-auto px-4 py-12">
      <div className="pz-card p-6 flex flex-col sm:flex-row gap-6 items-start sm:items-center mb-6">
        {user.picture ? (
          <img src={user.picture} alt={user.name} className="w-20 h-20 rounded-full border-2 border-[#d4ff00]" />
        ) : (
          <UserCircle size={80} weight="fill" color="#d4ff00" />
        )}
        <div className="flex-1">
          <h1 className="font-display font-black text-3xl uppercase">{user.name}</h1>
          <div className="text-zinc-400 text-sm">{user.email}</div>
          <div className="flex gap-2 mt-2">
            <span className="badge">{user.role}</span>
            <span className="badge badge-lime font-mono">{user.coins_balance} coins</span>
          </div>
        </div>
        <div>
          {pushOk ? (
            <button className="btn-outline cursor-default" data-testid="push-status">
              <BellRinging size={16} weight="fill" /> {t("common.notificationsEnabled")}
            </button>
          ) : (
            <button onClick={enablePush} className="btn-secondary" data-testid="enable-push-btn">
              <BellRinging size={16} weight="fill" /> {t("common.enableNotifications")}
            </button>
          )}
          {pushMsg && <div className="text-xs mt-2 text-zinc-400">{pushMsg}</div>}
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <div className="pz-card p-4">
          <div className="label">Bets</div>
          <div className="font-mono font-bold text-2xl">{bets.length}</div>
        </div>
        <div className="pz-card p-4">
          <div className="label">Won</div>
          <div className="font-mono font-bold text-2xl text-[#00e676]">{won}</div>
        </div>
        <div className="pz-card p-4">
          <div className="label">Lost</div>
          <div className="font-mono font-bold text-2xl text-[#ff3b30]">{lost}</div>
        </div>
        <div className="pz-card p-4">
          <div className="label">P/L</div>
          <div className={`font-mono font-bold text-2xl ${profit > 0 ? "text-[#00e676]" : profit < 0 ? "text-[#ff3b30]" : ""}`}>
            {profit > 0 ? "+" : ""}{profit}
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4 mb-6">
        {/* Streak / Racha Widget */}
        <div className="space-y-4">
          <StreakWidget />
          
          {/* Racha de Apuestas Consecutivas */}
          <div className="pz-card p-5 bg-gradient-to-r from-zinc-950 to-zinc-900 border border-zinc-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Trophy size={36} color="#d4ff00" weight="duotone" />
              <div>
                <h3 className="font-display font-bold text-lg uppercase tracking-tight text-white">
                  {lang === "es" ? "Racha de Victorias de Apuestas" : "Consecutive Bet Win Streak"}
                </h3>
                <p className="text-xs text-zinc-400">
                  {lang === "es" 
                    ? "¡Gana apuestas seguidas para conseguir bonos de monedas!" 
                    : "Win bets consecutively to claim virtual coin bonuses!"}
                </p>
                <div className="flex gap-4 mt-2 text-[10px] font-mono text-zinc-500 font-bold uppercase">
                  <span>Bronce: 3 seguidos (+100)</span>
                  <span>Plata: 5 seguidos (+300)</span>
                  <span>Oro: 10 seguidos (+1000)</span>
                </div>
              </div>
            </div>
            <div className="text-center bg-[#d4ff00]/10 border border-[#d4ff00]/30 rounded-lg px-4 py-2">
              <span className="text-[10px] uppercase font-bold text-zinc-400 block leading-none">Racha</span>
              <span className="font-mono font-black text-2xl text-[#d4ff00]" data-testid="bet-win-streak-value">
                {user.bet_win_streak ?? 0}
              </span>
            </div>
          </div>
        </div>

        {/* Sistema de Referidos */}
        <div className="pz-card p-6 border border-zinc-800 bg-gradient-to-br from-zinc-950 to-zinc-900 flex flex-col justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Users size={24} color="#d4ff00" weight="duotone" />
              <h3 className="font-display font-bold text-xl uppercase tracking-tight text-white">
                {lang === "es" ? "Sistema de Referidos" : "Referral System"}
              </h3>
            </div>
            <p className="text-xs text-zinc-400 leading-relaxed">
              {lang === "es"
                ? "Invita a tus amigos a unirse a BetRex.app. Por cada amigo que se registre usando tu código único, tú recibirás de forma instantánea 500 monedas de regalo."
                : "Invite your friends to join BetRex.app. For every friend who registers using your unique code, you will instantly receive 500 coins as a gift."}
            </p>
          </div>
          <div className="mt-4 p-3 rounded bg-black/50 border border-zinc-800 flex items-center justify-between gap-4">
            <div className="font-mono text-sm text-[#d4ff00] font-black tracking-widest uppercase">
              {user.referral_code ?? `REF-${user.user_id?.slice(-6).toUpperCase()}`}
            </div>
            <button
              onClick={() => {
                const code = user.referral_code ?? `REF-${user.user_id?.slice(-6).toUpperCase()}`;
                navigator.clipboard.writeText(code);
                alert(lang === "es" ? "Código copiado al portapapeles" : "Referral code copied to clipboard!");
              }}
              className="btn-primary !py-1 !px-2.5 text-[10px] font-black uppercase flex items-center gap-1"
              style={{ backgroundColor: '#d4ff00', color: 'black' }}
            >
              <Copy size={12} weight="bold" /> {lang === "es" ? "Copiar" : "Copy"}
            </button>
          </div>
        </div>
      </div>

      <div className="pz-card p-6">
        <h2 className="font-display font-bold text-2xl uppercase mb-4">{lang === "es" ? "Mis apuestas" : "My bets"}</h2>
        {bets.length === 0 ? (
          <div className="text-zinc-500 text-sm">{t("common.noData")}</div>
        ) : (
          <div className="space-y-2">
            {bets.map((b) => (
              <div key={b.bet_id} className="border border-zinc-800 rounded-md p-3 flex items-center justify-between text-sm">
                <div>
                  <div className="font-bold">{b.market_title}</div>
                  <div className="text-zinc-400 text-xs">
                    {b.option_label} @ {b.odds} · {new Date(b.created_at).toLocaleString()}
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-mono font-bold">{b.coins} → {b.potential_payout}</div>
                  <span className={`badge ${b.status === "won" ? "badge-win" : b.status === "lost" ? "badge-loss" : "badge-pending"}`}>{b.status}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
