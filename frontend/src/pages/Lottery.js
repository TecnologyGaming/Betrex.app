import React, { useEffect, useState } from "react";
import api from "../lib/api";
import { useAuth } from "../contexts/AuthContext";
import { useLang } from "../contexts/LanguageContext";
import { useNavigate } from "react-router-dom";
import { Ticket, Star, CheckCircle, Clock, Eye, CloudArrowUp, Plus, Image as ImageIcon } from "@phosphor-icons/react";

const LOTTERY_OPTIONS = [
  { key: "powerball", label: "Powerball", desc: { es: "Sorteo millonario de Powerball de EE.UU.", en: "Powerball US Millionaire Draw" }, cost: 100, balls_count: 5, max_ball: 69, max_special: 26 },
  { key: "megamillions", label: "Mega Millions", desc: { es: "Sorteo estelar de Mega Millions de EE.UU.", en: "Mega Millions US Stellar Draw" }, cost: 100, balls_count: 5, max_ball: 70, max_special: 25 },
];

export default function Horoscope() {
  const { user, refresh } = useAuth();
  const { lang, t } = useLang();
  const nav = useNavigate();

  const [activeLottery, setActiveLottery] = useState(LOTTERY_OPTIONS[0]);
  const [selectedNumbers, setSelectedNumbers] = useState([]);
  const [selectedSpecial, setSelectedSpecial] = useState(null);
  
  const [myTickets, setMyTickets] = useState([]);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);
  
  const [viewTicketImage, setViewTicketImage] = useState(null);

  const loadTickets = () => {
    api.get("/lottery/my-tickets").then(({ data }) => setMyTickets(data || [])).catch(() => {});
  };

  useEffect(() => {
    if (!user) { nav("/login"); return; }
    loadTickets();
  }, [user, nav]);

  const selectNumber = (num) => {
    if (selectedNumbers.includes(num)) {
      setSelectedNumbers(selectedNumbers.filter((n) => n !== num));
    } else {
      if (selectedNumbers.length < activeLottery.balls_count) {
        setSelectedNumbers([...selectedNumbers, num].sort((a, b) => a - b));
      }
    }
  };

  const selectSpecialBall = (num) => {
    setSelectedSpecial(num === selectedSpecial ? null : num);
  };

  const buyTicket = async () => {
    if (selectedNumbers.length < activeLottery.balls_count || selectedSpecial === null) {
      setMsg({ ok: false, text: lang === "es" ? "Por favor completa la selección de números." : "Please complete the number selection." });
      return;
    }
    setBusy(true); setMsg(null);
    try {
      await api.post("/lottery/buy", {
        lottery_type: activeLottery.key,
        numbers: selectedNumbers,
        special_ball: selectedSpecial,
      });
      setMsg({ ok: true, text: lang === "es" ? "¡Boleto comprado con éxito! Monedas debitadas." : "Ticket purchased successfully! Coins debited." });
      setSelectedNumbers([]);
      setSelectedSpecial(null);
      await refresh();
      loadTickets();
    } catch (e) {
      setMsg({ ok: false, text: e?.response?.data?.detail || "Error" });
    } finally {
      setBusy(false);
    }
  };

  const quickPick = () => {
    const nums = [];
    while (nums.length < activeLottery.balls_count) {
      const r = Math.floor(Math.random() * activeLottery.max_ball) + 1;
      if (!nums.includes(r)) nums.push(r);
    }
    setSelectedNumbers(nums.sort((a, b) => a - b));
    setSelectedSpecial(Math.floor(Math.random() * activeLottery.max_special) + 1);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="mb-8">
        <span className="label flex items-center gap-1 justify-center sm:justify-start">
          <Ticket size={14} color="#d4ff00" weight="fill" /> Lotería y Sorteos
        </span>
        <h1 className="font-display font-black text-4xl sm:text-6xl uppercase tracking-tighter">
          {lang === "es" ? "Sorteos de Powerball & MegaMillions" : "Powerball & MegaMillions Draws"}
        </h1>
        <p className="text-zinc-400 mt-2">
          {lang === "es"
            ? "Escoge tus números de la suerte. El administrador comprará y escaneará tu boleto físico real para que puedas ganar monedas millonarias."
            : "Choose your lucky numbers. The administrator will buy and scan your real physical ticket so you can win millionaire coins."}
        </p>
      </div>

      <div className="grid lg:grid-cols-12 gap-8 items-start">
        {/* Panel Izquierdo: Formulario de Selección */}
        <div className="lg:col-span-8 pz-card p-6 space-y-6">
          <div className="flex gap-2">
            {LOTTERY_OPTIONS.map((l) => (
              <button
                key={l.key}
                onClick={() => {
                  setActiveLottery(l);
                  setSelectedNumbers([]);
                  setSelectedSpecial(null);
                  setMsg(null);
                }}
                className={`flex-1 py-3 rounded-md font-bold uppercase tracking-wider text-sm transition-all border ${
                  activeLottery.key === l.key
                    ? "bg-[#d4ff00] text-black border-[#d4ff00]"
                    : "bg-zinc-950 border-zinc-800 text-zinc-400 hover:border-zinc-700"
                }`}
              >
                {l.label}
              </button>
            ))}
          </div>

          <div className="space-y-1">
            <h3 className="font-display font-bold text-lg uppercase tracking-tight text-white">
              {lang === "es" ? `Selecciona ${activeLottery.balls_count} números` : `Select ${activeLottery.balls_count} numbers`}
            </h3>
            <p className="text-xs text-zinc-500">
              {lang === "es"
                ? `Rango permitido: 1 al ${activeLottery.max_ball}.`
                : `Allowed range: 1 to ${activeLottery.max_ball}.`}
            </p>
            <div className="flex flex-wrap gap-1.5 pt-2 max-h-[160px] overflow-auto border border-zinc-900 bg-zinc-950/40 p-3 rounded scrollbar-thin">
              {Array.from({ length: activeLottery.max_ball }).map((_, i) => {
                const n = i + 1;
                const isSelected = selectedNumbers.includes(n);
                return (
                  <button
                    key={n}
                    onClick={() => selectNumber(n)}
                    className={`w-8 h-8 rounded-full font-mono text-xs font-bold transition-all flex items-center justify-center ${
                      isSelected
                        ? "bg-[#d4ff00] text-black font-black"
                        : "bg-zinc-900 text-zinc-400 hover:bg-zinc-800 border border-zinc-800"
                    }`}
                  >
                    {n}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-1">
            <h3 className="font-display font-bold text-lg uppercase tracking-tight text-white flex items-center gap-1.5">
              <span className="w-5 h-5 rounded-full bg-red-600 text-white font-mono text-[10px] font-bold inline-flex items-center justify-center">★</span>
              {lang === "es" ? "Selecciona la bola especial" : "Select the special ball"}
            </h3>
            <p className="text-xs text-zinc-500">
              {lang === "es"
                ? `Rango permitido: 1 al ${activeLottery.max_special}.`
                : `Allowed range: 1 to ${activeLottery.max_special}.`}
            </p>
            <div className="flex flex-wrap gap-1.5 pt-2 border border-zinc-900 bg-zinc-950/40 p-3 rounded max-h-[100px] overflow-auto scrollbar-thin">
              {Array.from({ length: activeLottery.max_special }).map((_, i) => {
                const n = i + 1;
                const isSelected = selectedSpecial === n;
                return (
                  <button
                    key={n}
                    onClick={() => selectSpecialBall(n)}
                    className={`w-8 h-8 rounded-full font-mono text-xs font-bold transition-all flex items-center justify-center ${
                      isSelected
                        ? "bg-red-600 text-white font-black scale-105 shadow-lg shadow-red-600/30"
                        : "bg-zinc-900 text-zinc-400 hover:bg-zinc-800 border border-zinc-800"
                    }`}
                  >
                    {n}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="pt-4 border-t border-zinc-900 flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <button
                onClick={quickPick}
                className="btn-outline !py-2 !px-4 text-xs font-black uppercase tracking-wider"
              >
                {lang === "es" ? "⚡ Selección Rápida" : "⚡ Quick Pick"}
              </button>
              <div className="text-xs text-zinc-400">
                {lang === "es" ? "Costo por Boleto:" : "Cost per ticket:"} <strong className="text-[#d4ff00]">{activeLottery.cost} coins</strong>
              </div>
            </div>

            <button
              onClick={buyTicket}
              disabled={busy || selectedNumbers.length < activeLottery.balls_count || selectedSpecial === null}
              className="btn-primary !py-2.5 !px-6 text-sm font-black uppercase tracking-wider"
              style={{ backgroundColor: '#d4ff00', color: 'black' }}
            >
              {busy ? "..." : (lang === "es" ? "Comprar Boleto (100 🪙)" : "Buy Ticket (100 🪙)")}
            </button>
          </div>

          {msg && (
            <div className={`text-sm font-semibold p-3 rounded-md border ${msg.ok ? "border-emerald-500/20 bg-emerald-500/5 text-emerald-400" : "border-[#ff3b30]/20 bg-[#ff3b30]/5 text-[#ff3b30]"}`}>
              {msg.text}
            </div>
          )}
        </div>

        {/* Panel Derecho: Mis Boletos */}
        <div className="lg:col-span-4 pz-card p-6 flex flex-col justify-between min-h-[400px]">
          <div>
            <h2 className="font-display font-bold text-xl uppercase mb-4 text-white">
              {lang === "es" ? "Mis Boletos Comprados" : "My Purchased Tickets"}
            </h2>
            {myTickets.length === 0 ? (
              <div className="text-zinc-500 text-sm py-12 text-center">
                {lang === "es" ? "Aún no tienes boletos comprados." : "You don't have purchased tickets yet."}
              </div>
            ) : (
              <div className="space-y-3 max-h-[450px] overflow-auto pr-1 scrollbar-thin">
                {myTickets.map((t) => (
                  <div key={t.ticket_id} className="border border-zinc-800 bg-zinc-950/40 rounded-lg p-3.5 space-y-2 relative">
                    <div className="flex items-center justify-between text-[10px] font-bold text-zinc-500 font-mono">
                      <span>{t.lottery_type.toUpperCase()}</span>
                      <span>{new Date(t.created_at).toLocaleDateString()}</span>
                    </div>

                    <div className="flex items-center gap-1 flex-wrap">
                      {t.numbers.map((n) => (
                        <span key={n} className="w-6 h-6 rounded-full bg-zinc-900 border border-zinc-800 text-[10px] font-mono font-bold text-zinc-300 flex items-center justify-center">
                          {n}
                        </span>
                      ))}
                      <span className="w-6 h-6 rounded-full bg-red-600 text-white text-[10px] font-mono font-bold flex items-center justify-center">
                        {t.special_ball}
                      </span>
                    </div>

                    <div className="pt-2 border-t border-zinc-900 flex items-center justify-between">
                      <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase ${
                        t.status === "won" ? "bg-emerald-500 text-black" : t.status === "lost" ? "bg-zinc-800 text-zinc-500" : "bg-[#ffcc00] text-black animate-pulse"
                      }`}>
                        {t.status}
                      </span>
                      <div className="flex items-center gap-1.5">
                        {t.ticket_image_url ? (
                          <button
                            onClick={() => setViewTicketImage(t.ticket_image_url)}
                            className="p-1.5 hover:bg-zinc-900 text-[#d4ff00] rounded"
                            title="Ver Ticket Escaneado"
                          >
                            <Eye size={16} weight="bold" />
                          </button>
                        ) : (
                          <span className="text-[9px] text-zinc-500 flex items-center gap-1" title="Pendiente de escaneo por admin">
                            <Clock size={12} /> {lang === "es" ? "Escaneo pend." : "Scan pend."}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal para ver imagen del boleto escaneado */}
      {viewTicketImage && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/90 p-4" onClick={() => setViewTicketImage(null)}>
          <div className="max-w-xl w-full max-h-[90vh] flex flex-col items-center justify-center gap-4" onClick={(e) => e.stopPropagation()}>
            <img src={viewTicketImage} alt="Ticket Escaneado" className="w-full h-auto rounded-lg border border-zinc-800 max-h-[80vh] object-contain shadow-2xl" />
            <button
              onClick={() => setViewTicketImage(null)}
              className="btn-outline !py-1.5 !px-4 text-xs font-black uppercase"
            >
              {lang === "es" ? "Cerrar" : "Close"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}