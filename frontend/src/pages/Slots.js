import React, { useState, useEffect } from "react";
import api from "../lib/api";
import { useAuth } from "../contexts/AuthContext";
import { useLang } from "../contexts/LanguageContext";
import { useNavigate } from "react-router-dom";
import { Coins, Trophy, Star, Play, CaretRight } from "@phosphor-icons/react";

const SLOT_MACHINES = {
  astrorex: {
    key: "astrorex",
    name: "Astro Rex Slots",
    tag: "⚡ SPACE THEME",
    color: "#d4ff00",
    glowClass: "glow-lime",
    symbols: ["🦖", "⚡", "☄️", "🪐", "⭐"],
    bgClass: "from-zinc-950 via-zinc-900 to-zinc-950 border-[#d4ff00]/20",
    prizeDesc: "🦖 x5 | ⚡ x3 | Otros x2"
  },
  sports: {
    key: "sports",
    name: "Lucky 7 Sports Slots",
    tag: "🏆 SPORTS CASINO",
    color: "#ff3b30",
    glowClass: "glow-red",
    symbols: ["7️⃣", "🏆", "⚽", "⚾", "🏇"],
    bgClass: "from-zinc-950 via-zinc-900 to-zinc-950 border-red-500/20",
    prizeDesc: "7️⃣ x5 | 🏆 x3 | Otros x2"
  }
};

export default function Slots() {
  const { user, refresh } = useAuth();
  const { lang, t } = useLang();
  const nav = useNavigate();

  const [activeMachine, setActiveMachine] = useState(SLOT_MACHINES.astrorex);
  const [reels, setReels] = useState(["⭐", "⭐", "⭐"]);
  const [spinning, setSpinning] = useState(false);
  const [result, setResult] = useState(null);
  const [err, setErr] = useState("");

  // Inicialización de Efectos de Sonido
  const [spinAudio] = useState(() => {
    const a = new Audio("https://assets.mixkit.co/active_storage/sfx/2003/2003-84.wav");
    a.volume = 0.5;
    return a;
  });
  const [winAudio] = useState(() => {
    const a = new Audio("https://assets.mixkit.co/active_storage/sfx/2019/2019-84.wav");
    a.volume = 0.6;
    return a;
  });
  const [loseAudio] = useState(() => {
    const a = new Audio("https://assets.mixkit.co/active_storage/sfx/2568/2568-84.wav");
    a.volume = 0.5;
    return a;
  });

  useEffect(() => {
    if (!user) { nav("/login"); return; }
    // Inicializar reels con los símbolos correspondientes
    setReels([activeMachine.symbols[0], activeMachine.symbols[1], activeMachine.symbols[2]]);
    setResult(null);
    setErr("");
  }, [user, activeMachine, nav]);

  const spin = async () => {
    if (spinning) return;
    if (user.coins_balance < 10) {
      setErr(lang === "es" ? "Saldo insuficiente. Necesitas al menos 10 monedas." : "Insufficient balance. You need at least 10 coins.");
      return;
    }

    setSpinning(true);
    setResult(null);
    setErr("");

    // Iniciar sonido de giro
    try {
      spinAudio.currentTime = 0;
      spinAudio.loop = true;
      spinAudio.play().catch((ex) => console.log(ex));
    } catch (e) {
      console.log(e);
    }

    // Animación de rotación de rodillos local
    let spinCount = 0;
    const interval = setInterval(() => {
      setReels([
        activeMachine.symbols[Math.floor(Math.random() * activeMachine.symbols.length)],
        activeMachine.symbols[Math.floor(Math.random() * activeMachine.symbols.length)],
        activeMachine.symbols[Math.floor(Math.random() * activeMachine.symbols.length)],
      ]);
      spinCount++;
    }, 100);

    try {
      const { data } = await api.post("/slots/play", { slot_type: activeMachine.key });
      
      // Esperar que la animación corra por lo menos 1.5 segundos (15 ticks) para dar suspenso
      setTimeout(async () => {
        clearInterval(interval);
        
        // Detener sonido de giro
        try {
          spinAudio.pause();
          spinAudio.currentTime = 0;
        } catch (e) {
          console.log(e);
        }

        // Reproducir sonido de desenlace
        try {
          if (data.is_winner) {
            winAudio.currentTime = 0;
            winAudio.play().catch((ex) => console.log(ex));
          } else {
            loseAudio.currentTime = 0;
            loseAudio.play().catch((ex) => console.log(ex));
          }
        } catch (e) {
          console.log(e);
        }

        setReels(data.symbols);
        setResult(data);
        setSpinning(false);
        await refresh();
      }, 1500);

    } catch (e) {
      clearInterval(interval);
      try {
        spinAudio.pause();
        spinAudio.currentTime = 0;
      } catch (ex) {
        console.log(ex);
      }
      setSpinning(false);
      setErr(e?.response?.data?.detail || "Error");
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-12">
      {/* Cabecera */}
      <div className="mb-8 flex items-center justify-between flex-wrap gap-4">
        <div>
          <span className="label flex items-center gap-1 justify-center sm:justify-start">
            <Star size={14} color="#d4ff00" weight="fill" /> Casino Rex
          </span>
          <h1 className="font-display font-black text-4xl sm:text-5xl uppercase tracking-tighter">
            {lang === "es" ? "Tragamonedas Virtuales" : "Virtual Slot Machines"}
          </h1>
          <p className="text-zinc-400 mt-2">
            {lang === "es"
              ? "Prueba tu suerte en nuestras divertidas máquinas tragamonedas usando tus monedas virtuales."
              : "Try your luck on our fun slot machines using your virtual coins."}
          </p>
        </div>
        <div className="pz-card px-6 py-4 flex items-center gap-3 glow-lime">
          <Coins size={32} weight="fill" color="#d4ff00" />
          <div>
            <div className="label">{t("common.balance")}</div>
            <div className="font-mono font-bold text-3xl text-[#d4ff00]">{user?.coins_balance ?? 0}</div>
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-6 items-start">
        {/* Selector de Máquinas */}
        <div className="pz-card p-5 space-y-4 md:col-span-1">
          <h2 className="font-display font-bold text-xl uppercase text-white">
            {lang === "es" ? "Selecciona una Máquina" : "Select a Machine"}
          </h2>
          <div className="flex flex-col gap-2">
            {Object.values(SLOT_MACHINES).map((m) => (
              <button
                key={m.key}
                onClick={() => {
                  if (spinning) return;
                  setActiveMachine(m);
                }}
                disabled={spinning}
                className={`p-4 rounded-md border text-left transition-all ${
                  activeMachine.key === m.key
                    ? `bg-[#d4ff00]/5 border-[#d4ff00] text-[#d4ff00]`
                    : "bg-zinc-950 border-zinc-800 text-zinc-400 hover:border-zinc-700"
                }`}
              >
                <div className="text-[10px] font-black tracking-wider uppercase opacity-80">{m.tag}</div>
                <div className="font-display font-bold text-lg mt-0.5">{m.name}</div>
                <div className="text-xs text-zinc-500 font-mono mt-1">{m.prizeDesc}</div>
              </button>
            ))}
          </div>

          <div className="p-4 bg-zinc-950/40 border border-zinc-900 rounded-md text-xs text-zinc-500 leading-relaxed">
            <span className="font-bold text-zinc-300 block mb-1">ℹ️ Reglas de Juego:</span>
            {lang === "es"
              ? "Cada tiro cuesta 10 monedas. Si alineas 3 símbolos idénticos ganas. Las ganancias se acreditan instantáneamente a tu balance de BetRex."
              : "Each spin costs 10 coins. Aligning 3 identical symbols wins. Winnings are instantly credited to your BetRex balance."}
          </div>
        </div>

        {/* Máquina de Tragamonedas Principal */}
        <div className={`md:col-span-2 pz-card p-8 bg-gradient-to-b border relative overflow-hidden flex flex-col items-center justify-center gap-6 ${activeMachine.bgClass}`}>
          <div className="absolute top-0 right-0 w-48 h-48 bg-[#d4ff00]/5 rounded-full blur-3xl pointer-events-none" />

          {/* Nombre de la Máquina */}
          <div className="text-center">
            <span className="px-2.5 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-[#d4ff00] text-black animate-pulse">
              {activeMachine.tag}
            </span>
            <h2 className="font-display font-black text-3xl sm:text-4xl uppercase tracking-tighter text-white mt-1.5">
              {activeMachine.name}
            </h2>
          </div>

          {/* RODILLOS (Reels) */}
          <div className="flex gap-4 justify-center items-center py-8 bg-black/60 border border-zinc-800/80 rounded-xl px-12 shadow-2xl relative w-full max-w-md">
            <div className="absolute left-0 right-0 h-0.5 bg-[#d4ff00]/30 shadow-lg" /> {/* Línea del centro */}
            {reels.map((symbol, i) => (
              <div
                key={i}
                className={`w-20 h-24 sm:w-24 sm:h-28 rounded-lg bg-zinc-950 border border-zinc-800/80 flex items-center justify-center text-5xl sm:text-6xl select-none relative shadow-inner overflow-hidden ${
                  spinning ? "animate-pulse" : "transition-transform scale-100"
                }`}
              >
                <span className="filter drop-shadow-[0_0_10px_rgba(255,255,255,0.05)]">{symbol}</span>
              </div>
            ))}
          </div>

          {/* Controles */}
          <div className="w-full max-w-md flex flex-col items-center gap-3">
            <button
              onClick={spin}
              disabled={spinning}
              className="btn-primary w-full justify-center py-4 font-display font-black uppercase tracking-wider text-lg flex items-center gap-2 shadow-lg shadow-[#d4ff00]/10 hover:scale-[1.01] active:scale-[0.99] transition-all"
              style={{ backgroundColor: activeMachine.color, color: "black" }}
            >
              <Play size={20} weight="fill" />
              {spinning ? "..." : (lang === "es" ? "Girar por 10 🪙" : "Spin for 10 🪙")}
            </button>

            {err && <div className="text-[#ff3b30] text-sm font-semibold text-center mt-1">{err}</div>}

            {/* Mensajes de Resultado */}
            {result && (
              <div className={`w-full p-4 rounded-lg text-center border animate-bounce ${
                result.is_winner
                  ? "border-emerald-500/20 bg-emerald-500/5 text-emerald-400"
                  : "border-zinc-800 bg-zinc-950/20 text-zinc-400"
              }`}>
                {result.is_winner ? (
                  <div className="space-y-1">
                    <div className="font-display font-black text-2xl uppercase tracking-tight flex items-center justify-center gap-1">
                      <Trophy size={22} weight="fill" />
                      {lang === "es" ? "¡GANADOR!" : "WINNER!"}
                    </div>
                    <div className="text-sm font-mono">
                      {lang === "es" ? `¡Felicidades! Ganaste +${result.prize} monedas` : `Congratulations! You won +${result.prize} coins`}
                    </div>
                  </div>
                ) : (
                  <div className="text-sm font-semibold">
                    {lang === "es" ? "¡Sigue intentando! Casi lo tienes." : "Keep trying! So close."}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}