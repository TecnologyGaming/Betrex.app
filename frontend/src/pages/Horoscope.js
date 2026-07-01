import React, { useEffect, useState } from "react";
import api from "../lib/api";
import { useLang } from "../contexts/LanguageContext";
import { Star, ArrowLeft, Coins } from "@phosphor-icons/react";
import { Link } from "react-router-dom";

const SIGNS = [
  { key: "aries", es: "Aries", en: "Aries", dates: { es: "21 Mar - 19 Abr", en: "Mar 21 - Apr 19" }, element: { es: "Fuego", en: "Fire" }, symbol: "♈", bgClass: "from-red-500/10 to-transparent" },
  { key: "taurus", es: "Tauro", en: "Taurus", dates: { es: "20 Abr - 20 May", en: "Apr 20 - May 20" }, element: { es: "Tierra", en: "Earth" }, symbol: "♉", bgClass: "from-amber-600/10 to-transparent" },
  { key: "gemini", es: "Géminis", en: "Gemini", dates: { es: "21 May - 20 Jun", en: "May 21 - Jun 20" }, element: { es: "Aire", en: "Air" }, symbol: "♊", bgClass: "from-cyan-500/10 to-transparent" },
  { key: "cancer", es: "Cáncer", en: "Cancer", dates: { es: "21 Jun - 22 Jul", en: "Jun 21 - Jul 22" }, element: { es: "Agua", en: "Water" }, symbol: "♋", bgClass: "from-blue-500/10 to-transparent" },
  { key: "leo", es: "Leo", en: "Leo", dates: { es: "23 Jul - 22 Ago", en: "Jul 23 - Aug 22" }, element: { es: "Fuego", en: "Fire" }, symbol: "♌", bgClass: "from-yellow-500/10 to-transparent" },
  { key: "virgo", es: "Virgo", en: "Virgo", dates: { es: "23 Ago - 22 Sep", en: "Aug 23 - Sep 22" }, element: { es: "Tierra", en: "Earth" }, symbol: "♍", bgClass: "from-emerald-500/10 to-transparent" },
  { key: "libra", es: "Libra", en: "Libra", dates: { es: "23 Sep - 22 Oct", en: "Sep 23 - Oct 22" }, element: { es: "Aire", en: "Air" }, symbol: "♎", bgClass: "from-teal-500/10 to-transparent" },
  { key: "scorpio", es: "Escorpio", en: "Scorpio", dates: { es: "23 Oct - 21 Nov", en: "Oct 23 - Nov 21" }, element: { es: "Agua", en: "Water" }, symbol: "♏", bgClass: "from-purple-500/10 to-transparent" },
  { key: "sagittarius", es: "Sagitario", en: "Sagittarius", dates: { es: "22 Nov - 21 Dic", en: "Nov 22 - Dec 21" }, element: { es: "Fuego", en: "Fire" }, symbol: "♐", bgClass: "from-orange-500/10 to-transparent" },
  { key: "capricorn", es: "Capricornio", en: "Capricorn", dates: { es: "22 Dic - 19 Ene", en: "Dec 22 - Jan 19" }, element: { es: "Tierra", en: "Earth" }, symbol: "♑", bgClass: "from-indigo-500/10 to-transparent" },
  { key: "aquarius", es: "Acuario", en: "Aquarius", dates: { es: "20 Ene - 18 Feb", en: "Jan 20 - Feb 18" }, element: { es: "Aire", en: "Air" }, symbol: "♒", bgClass: "from-sky-500/10 to-transparent" },
  { key: "pisces", es: "Piscis", en: "Pisces", dates: { es: "19 Feb - 20 Mar", en: "Feb 19 - Mar 20" }, element: { es: "Agua", en: "Water" }, symbol: "♓", bgClass: "from-violet-500/10 to-transparent" },
];

const getLuckyData = (sign, dateStr) => {
  const hash = (sign + dateStr).split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const luckyNumber = (hash % 99) + 1;
  const sports = ["football", "baseball", "horse", "lottery"];
  const luckySport = sports[hash % sports.length];
  return { luckyNumber, luckySport };
};

export default function Horoscope() {
  const { lang, t } = useLang();
  const [selected, setSelected] = useState(null);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  const viewHoroscope = async (sign) => {
    setSelected(sign);
    setLoading(true);
    setData(null);
    try {
      const { data: res } = await api.get(`/horoscope/${sign.key}`);
      setData(res);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const todayStr = new Date().toISOString().split("T")[0];
  const luckyInfo = selected ? getLuckyData(selected.key, todayStr) : null;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      {!selected ? (
        <>
          <div className="mb-8 text-center sm:text-left">
            <span className="label flex items-center justify-center sm:justify-start gap-1">
              <Star size={14} color="#d4ff00" weight="fill" /> Astrología
            </span>
            <h1 className="font-display font-black text-4xl sm:text-6xl uppercase tracking-tighter">
              {lang === "es" ? "Horóscopo Diario AstroRex" : "Daily AstroRex Horoscope"}
            </h1>
            <p className="text-zinc-400 mt-2">
              {lang === "es"
                ? "Consulta los astros para potenciar tus predicciones deportivas y ganar más monedas virtuales hoy."
                : "Consult the stars to boost your sports predictions and win more virtual coins today."}
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {SIGNS.map((s) => (
              <button
                key={s.key}
                onClick={() => viewHoroscope(s)}
                className={`pz-card p-5 text-center flex flex-col items-center justify-center gap-2 hover:-translate-y-1 transition-all border border-zinc-800/40 bg-gradient-to-b ${s.bgClass}`}
              >
                <span className="text-4xl filter drop-shadow-[0_0_10px_rgba(212,255,0,0.1)]">{s.symbol}</span>
                <h3 className="font-display font-bold text-xl uppercase tracking-tight mt-1 text-white">
                  {s[lang]}
                </h3>
                <span className="text-xs text-zinc-500 font-mono">{s.dates[lang]}</span>
                <span className="px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-zinc-900 text-zinc-400 border border-zinc-800">
                  {s.element[lang]}
                </span>
              </button>
            ))}
          </div>
        </>
      ) : (
        <div className="max-w-2xl mx-auto">
          <button
            onClick={() => setSelected(null)}
            className="text-zinc-400 inline-flex items-center gap-2 mb-6 hover:text-white transition-colors"
          >
            <ArrowLeft size={16} /> {lang === "es" ? "Volver" : "Back"}
          </button>

          <div className="pz-card p-8 border border-[#d4ff00]/20 bg-gradient-to-b from-zinc-950 via-zinc-900 to-black relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-[#d4ff00]/5 rounded-full blur-3xl pointer-events-none" />

            <div className="flex items-center gap-4 mb-6">
              <span className="text-6xl">{selected.symbol}</span>
              <div>
                <span className="px-2 py-0.5 rounded text-[10px] font-black tracking-wider bg-[#d4ff00] text-black">
                  ★ ASTROREX
                </span>
                <h2 className="font-display font-black text-3xl sm:text-4xl uppercase tracking-tighter text-white mt-1">
                  {selected[lang]}
                </h2>
                <span className="text-xs text-zinc-400 font-mono">{selected.dates[lang]} · {selected.element[lang]}</span>
              </div>
            </div>

            {loading ? (
              <div className="text-center py-12 text-zinc-500 font-mono">
                {lang === "es" ? "Consultando los astros..." : "Consulting the stars..."}
              </div>
            ) : (
              <div className="space-y-6">
                <div className="bg-black/30 border border-zinc-800/40 rounded-lg p-5 leading-relaxed text-zinc-300 text-sm">
                  {data?.horoscope}
                </div>

                {luckyInfo && (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="pz-card p-4 border border-zinc-800/50 bg-black/40 text-center">
                      <span className="label">{lang === "es" ? "Número de la Suerte" : "Lucky Number"}</span>
                      <div className="font-mono font-bold text-3xl text-[#d4ff00] mt-1">
                        {luckyInfo.luckyNumber}
                      </div>
                    </div>
                    <div className="pz-card p-4 border border-zinc-800/50 bg-black/40 text-center flex flex-col justify-between">
                      <span className="label">{lang === "es" ? "Deporte Favorito hoy" : "Lucky Sport today"}</span>
                      <Link
                        to={`/predictions?sport=${luckyInfo.luckySport}`}
                        className="font-display font-black text-lg uppercase tracking-tight text-[#d4ff00] hover:underline mt-1 block"
                      >
                        {t(`common.${luckyInfo.luckySport}`)}
                      </Link>
                    </div>
                  </div>
                )}

                <div className="pt-4 border-t border-zinc-900 flex items-center justify-between text-xs text-zinc-500 font-mono">
                  <span>BetRex.app · Astrology</span>
                  <span>{data?.date}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}