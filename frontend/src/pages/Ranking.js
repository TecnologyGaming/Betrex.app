import React, { useEffect, useState } from "react";
import api from "../lib/api";
import { useLang } from "../contexts/LanguageContext";
import { Trophy, Crown, ChartLineUp } from "@phosphor-icons/react";

export default function Ranking() {
  const { t, lang } = useLang();
  const [users, setUsers] = useState([]);

  useEffect(() => { api.get("/ranking?limit=50").then(({ data }) => setUsers(data || [])); }, []);

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <div className="mb-8">
        <span className="label">Top players</span>
        <h1 className="font-display font-black text-4xl sm:text-6xl uppercase tracking-tighter flex items-center gap-3">
          <Trophy size={48} weight="duotone" color="#d4ff00" /> Ranking
        </h1>
        <p className="text-zinc-400 mt-2">{lang === "es" ? "Los mejores jugadores por ganancias netas." : "Top players by net profit."}</p>
      </div>

      <div className="pz-card overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-zinc-800 text-zinc-400 text-xs uppercase tracking-wider">
              <th className="text-left p-4">#</th>
              <th className="text-left p-4">{lang === "es" ? "Jugador" : "Player"}</th>
              <th className="text-right p-4 hidden sm:table-cell">{lang === "es" ? "Apuestas" : "Bets"}</th>
              <th className="text-right p-4 hidden sm:table-cell">{lang === "es" ? "Ganadas" : "Wins"}</th>
              <th className="text-right p-4">P/L</th>
              <th className="text-right p-4">Coins</th>
            </tr>
          </thead>
          <tbody>
            {users.length === 0 ? (
              <tr><td colSpan={6} className="text-center p-10 text-zinc-500">{t("common.noData")}</td></tr>
            ) : users.map((u, i) => (
              <tr key={u.user_id} className="border-b border-zinc-900 hover:bg-zinc-900/50">
                <td className="p-4 font-mono">
                  {i === 0 ? <Crown size={20} color="#d4ff00" weight="fill" /> :
                   i === 1 ? <Crown size={18} color="#a1a1aa" weight="fill" /> :
                   i === 2 ? <Crown size={16} color="#cd7f32" weight="fill" /> :
                   <span className="text-zinc-500">{i + 1}</span>}
                </td>
                <td className="p-4">
                  <div className="flex items-center gap-2">
                    {u.picture ? <img src={u.picture} alt="" className="w-7 h-7 rounded-full" /> :
                      <div className="w-7 h-7 rounded-full bg-zinc-800 grid place-items-center text-xs font-bold">{(u.name || "?").slice(0,1).toUpperCase()}</div>}
                    <span className="font-semibold">{u.name}</span>
                  </div>
                </td>
                <td className="p-4 text-right font-mono hidden sm:table-cell">{u.total_bets}</td>
                <td className="p-4 text-right font-mono hidden sm:table-cell">{u.wins}</td>
                <td className={`p-4 text-right font-mono font-bold ${u.profit > 0 ? "text-[#00e676]" : u.profit < 0 ? "text-[#ff3b30]" : ""}`}>
                  {u.profit > 0 ? "+" : ""}{u.profit}
                </td>
                <td className="p-4 text-right font-mono">{u.coins_balance}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
