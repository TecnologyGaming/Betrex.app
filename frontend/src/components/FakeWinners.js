import React, { useState, useEffect } from "react";
import { useLang } from "../contexts/LanguageContext";
import { Trophy, Clock, Coins, Star, GameController } from "@phosphor-icons/react";

// Lista de 50 usuarios ficticios con avatares astronómicos y deportivos
const USERS = [
  { name: "Zeno", avatar: "https://api.dicebear.com/7.x/bottts/svg?seed=Zeno" },
  { name: "Cube Noob", avatar: "https://api.dicebear.com/7.x/pixel-art/svg?seed=CubeNoob" },
  { name: "PepeKing", avatar: "https://api.dicebear.com/7.x/pixel-art/svg?seed=PepeKing" },
  { name: "LunaJack", avatar: "https://api.dicebear.com/7.x/adventurer/svg?seed=LunaJack" },
  { name: "ShadowNFT", avatar: "https://api.dicebear.com/7.x/bottts/svg?seed=Shadow" },
  { name: "AstroBet", avatar: "https://api.dicebear.com/7.x/bottts/svg?seed=Astro" },
  { name: "TipsterPro", avatar: "https://api.dicebear.com/7.x/pixel-art/svg?seed=Tipster" },
  { name: "GoldenBoy", avatar: "https://api.dicebear.com/7.x/adventurer/svg?seed=Golden" },
  { name: "SaratogaKing", avatar: "https://api.dicebear.com/7.x/pixel-art/svg?seed=Saratoga" },
  { name: "MLB_Guru", avatar: "https://api.dicebear.com/7.x/bottts/svg?seed=MLBGuru" },
  { name: "LigaMaster", avatar: "https://api.dicebear.com/7.x/adventurer/svg?seed=LigaMaster" },
  { name: "CodyWinner", avatar: "https://api.dicebear.com/7.x/bottts/svg?seed=Cody" },
  { name: "YankeeDoodle", avatar: "https://api.dicebear.com/7.x/pixel-art/svg?seed=Yankee" },
  { name: "RayoFan", avatar: "https://api.dicebear.com/7.x/adventurer/svg?seed=Rayo" },
  { name: "SlotsWinner", avatar: "https://api.dicebear.com/7.x/bottts/svg?seed=Slots" },
  { name: "PowerBaller", avatar: "https://api.dicebear.com/7.x/pixel-art/svg?seed=Power" },
  { name: "MegaLucky", avatar: "https://api.dicebear.com/7.x/adventurer/svg?seed=Mega" },
  { name: "ZodiacBets", avatar: "https://api.dicebear.com/7.x/bottts/svg?seed=Zodiac" },
  { name: "AstroRex_Jr", avatar: "https://api.dicebear.com/7.x/pixel-art/svg?seed=AstroRex" },
  { name: "RichBettor", avatar: "https://api.dicebear.com/7.x/adventurer/svg?seed=Rich" },
  { name: "ZeusPick", avatar: "https://api.dicebear.com/7.x/bottts/svg?seed=Zeus" },
  { name: "HadesBet", avatar: "https://api.dicebear.com/7.x/pixel-art/svg?seed=Hades" },
  { name: "Poseidon🏇", avatar: "https://api.dicebear.com/7.x/adventurer/svg?seed=Poseidon" },
  { name: "Ares⚽", avatar: "https://api.dicebear.com/7.x/bottts/svg?seed=Ares" },
  { name: "Hermes⚡", avatar: "https://api.dicebear.com/7.x/pixel-art/svg?seed=Hermes" },
  { name: "Apolo777", avatar: "https://api.dicebear.com/7.x/adventurer/svg?seed=Apolo" },
  { name: "Artemis🏹", avatar: "https://api.dicebear.com/7.x/bottts/svg?seed=Artemis" },
  { name: "Athena🧠", avatar: "https://api.dicebear.com/7.x/pixel-art/svg?seed=Athena" },
  { name: "Dionysus🍷", avatar: "https://api.dicebear.com/7.x/adventurer/svg?seed=Dionysus" },
  { name: "Hephaestus", avatar: "https://api.dicebear.com/7.x/bottts/svg?seed=Hephaestus" },
  { name: "Demeter🌾", avatar: "https://api.dicebear.com/7.x/pixel-art/svg?seed=Demeter" },
  { name: "Hestia🔥", avatar: "https://api.dicebear.com/7.x/adventurer/svg?seed=Hestia" },
  { name: "PegasusWing", avatar: "https://api.dicebear.com/7.x/bottts/svg?seed=Pegasus" },
  { name: "RichStrikeFan", avatar: "https://api.dicebear.com/7.x/pixel-art/svg?seed=RichStrike" },
  { name: "EpicenterGo", avatar: "https://api.dicebear.com/7.x/adventurer/svg?seed=Epicenter" },
  { name: "DerbyStar", avatar: "https://api.dicebear.com/7.x/bottts/svg?seed=Derby" },
  { name: "SaratogaTurf", avatar: "https://api.dicebear.com/7.x/pixel-art/svg?seed=SaratogaTurf" },
  { name: "GulfStreamGo", avatar: "https://api.dicebear.com/7.x/adventurer/svg?seed=GulfStream" },
  { name: "CodyStreak", avatar: "https://api.dicebear.com/7.x/bottts/svg?seed=CodyStreak" },
  { name: "YankeeSlide", avatar: "https://api.dicebear.com/7.x/pixel-art/svg?seed=YankeeSlide" },
  { name: "DodgersCap", avatar: "https://api.dicebear.com/7.x/adventurer/svg?seed=Dodgers" },
  { name: "SoxFan", avatar: "https://api.dicebear.com/7.x/bottts/svg?seed=Sox" },
  { name: "BravesWin", avatar: "https://api.dicebear.com/7.x/pixel-art/svg?seed=Braves" },
  { name: "AstrosLaunch", avatar: "https://api.dicebear.com/7.x/adventurer/svg?seed=Astros" },
  { name: "PlinkoMaster", avatar: "https://api.dicebear.com/7.x/bottts/svg?seed=Plinko" },
  { name: "DiceRolls", avatar: "https://api.dicebear.com/7.x/pixel-art/svg?seed=Dice" },
  { name: "CrashHigh", avatar: "https://api.dicebear.com/7.x/adventurer/svg?seed=Crash" },
  { name: "CoinRushPro", avatar: "https://api.dicebear.com/7.x/bottts/svg?seed=CoinRush" },
  { name: "BetRexBoss", avatar: "https://api.dicebear.com/7.x/pixel-art/svg?seed=BetRexBoss" },
  { name: "MaltaPlayer", avatar: "https://api.dicebear.com/7.x/adventurer/svg?seed=Malta" },
];

// Lista de pronósticos pasados, juegos de casino y tragamonedas de la app
const GAMES = [
  { es: "la racha en Gulfstream Park", en: "Gulfstream Park win streak" },
  { es: "el pronóstico de Saratoga Race", en: "Saratoga Race prediction" },
  { es: "Astro Rex Slots", en: "Astro Rex Slots" },
  { es: "Lucky 7 Sports Slots", en: "Lucky 7 Sports Slots" },
  { es: "el sorteo de Powerball", en: "the Powerball draw" },
  { es: "el sorteo de Mega Millions", en: "the Mega Millions draw" },
  { es: "el pronóstico Real Madrid vs Barcelona", en: "Real Madrid vs Barcelona prediction" },
  { es: "las apuestas de béisbol MLB", en: "MLB baseball bets" },
  { es: "la racha de victorias de apuestas", en: "consecutive bet win streak" },
  { es: "el bono de bienvenida", en: "welcome bonus" },
];

const PREMIOS = [
  100, 125, 210, 380, 500, 760, 950, 1200, 2400, 3800, 5500, 7800, 9900, 11550
];

// Generar una entrada aleatoria de ganador
const generateRandomWinner = (lang) => {
  const user = USERS[Math.floor(Math.random() * USERS.length)];
  const game = GAMES[Math.floor(Math.random() * GAMES.length)];
  const prize = PREMIOS[Math.floor(Math.random() * PREMIOS.length)];
  const timeOffset = Math.floor(Math.random() * 5) + 1; // Hace 1 - 5 mins

  return {
    name: user.name,
    avatar: user.avatar,
    game: game[lang],
    prize: prize.toFixed(2),
    time: lang === "es" ? `Hace ${timeOffset} min` : `${timeOffset} min ago`,
  };
};

export default function FakeWinners() {
  const { lang } = useLang();
  const [winners, setWinners] = useState([]);
  const [animating, setSpinning] = useState(false);

  // Inicializar los primeros 5 ganadores
  useEffect(() => {
    const initial = Array.from({ length: 5 }).map(() => generateRandomWinner(lang));
    setWinners(initial);
  }, [lang]);

  // Sincronizador periódico: se mueve, rota y actualiza un ganador cada 3 minutos de forma aleatoria
  useEffect(() => {
    const interval = setInterval(() => {
      setSpinning(true);
      setTimeout(() => {
        setWinners((prev) => {
          // Crear un ganador nuevo
          const newWinner = generateRandomWinner(lang);
          // Quitar el último e insertar el nuevo al inicio de la lista
          const updated = [newWinner, ...prev.slice(0, 4)];
          return updated;
        });
        setSpinning(false);
      }, 800); // 800ms de animación de rotación
    }, 180000); // Cada 3 minutos (180,000 milisegundos)

    return () => clearInterval(interval);
  }, [lang]);

  return (
    <div className="pz-card p-6 bg-[#0c0c0e] border border-zinc-800/80 relative overflow-hidden max-w-md w-full mx-auto">
      <div className="absolute top-0 right-0 w-32 h-32 bg-[#d4ff00]/5 rounded-full blur-3xl pointer-events-none" />
      
      {/* Cabecera de la sección */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-full bg-[#d4ff00]/10 border border-[#d4ff00]/20 grid place-items-center animate-pulse">
          <Trophy size={20} color="#d4ff00" weight="duotone" />
        </div>
        <div>
          <h3 className="font-display font-black text-lg uppercase tracking-tight text-white flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-ping inline-block" />
            🔥 {lang === "es" ? "Últimos Ganadores" : "Recent Winners"}
          </h3>
          <p className="text-[10px] text-zinc-500 font-mono font-bold uppercase tracking-wider">
            {lang === "es" ? "Actualizado cada 3 minutos" : "Updated every 3 minutes"}
          </p>
        </div>
      </div>

      {/* Lista de ganadores con animación suave */}
      <div className={`space-y-3 transition-opacity duration-500 ${animating ? "opacity-40 scale-[0.99]" : "opacity-100 scale-100"}`}>
        {winners.map((w, index) => (
          <div
            key={index}
            className="p-3.5 rounded-xl border border-zinc-900/60 bg-gradient-to-r from-zinc-950 via-zinc-900/40 to-black/60 flex items-center justify-between gap-4 hover:border-zinc-800 transition-colors"
          >
            <div className="flex items-center gap-3 min-w-0">
              <img
                src={w.avatar}
                alt={w.name}
                className="w-10 h-10 rounded-full border border-zinc-800 bg-zinc-950 object-contain p-0.5"
              />
              <div className="min-w-0">
                <div className="font-display font-bold text-sm text-zinc-100 truncate">{w.name}</div>
                <div className="text-[10px] text-zinc-400 font-medium truncate">
                  {lang === "es" ? "ganó en " : "won in "}
                  <span className="text-amber-500 font-bold">{w.game}</span>
                </div>
                <div className="text-[9px] text-zinc-600 font-mono flex items-center gap-1 mt-0.5">
                  <Clock size={10} />
                  {w.time}
                </div>
              </div>
            </div>

            <div className="text-right shrink-0">
              <span className="text-[8px] uppercase font-bold text-zinc-500 block leading-none mb-1">Monto ganado</span>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                <Coins size={14} weight="fill" color="#00e676" />
                <span className="font-mono font-black text-xs leading-none">${w.prize}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Pie de la sección */}
      <div className="mt-5 border-t border-zinc-900/60 pt-4 flex items-center justify-between text-[10px] text-zinc-500 font-mono font-bold uppercase tracking-wider">
        <span>BetRex.app · Casino Rex</span>
        <span className="flex items-center gap-1">
          <Star size={12} color="#d4ff00" weight="fill" /> live feed
        </span>
      </div>
    </div>
  );
}