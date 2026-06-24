import React, { useEffect, useState } from "react";
import api from "../lib/api";
import { useAuth } from "../contexts/AuthContext";
import { useLang } from "../contexts/LanguageContext";
import { useNavigate } from "react-router-dom";
import { BellRinging, BellSlash, UserCircle } from "@phosphor-icons/react";
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
  const { user } = useAuth();
  const { t, lang } = useLang();
  const nav = useNavigate();
  const [bets, setBets] = useState([]);
  const [pushOk, setPushOk] = useState(false);
  const [pushMsg, setPushMsg] = useState("");

  useEffect(() => {
    if (!user) { nav("/login"); return; }
    api.get("/bets/me").then(({ data }) => setBets(data || []));
    if ("Notification" in window && Notification.permission === "granted") setPushOk(true);
  }, [user, nav]);

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

      <div className="mb-6">
        <StreakWidget />
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
