import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../lib/api";
import { useLang } from "../contexts/LanguageContext";
import PredictionCard from "../components/PredictionCard";
import MarketCard from "../components/MarketCard";
import Banner from "../components/Banner";
import { ArrowRight, Lightning, SoccerBall, Horse, Baseball, Ticket, ChartLineUp, Crown } from "@phosphor-icons/react";

const HERO_IMG = "https://images.unsplash.com/photo-1769120062656-23adba3790b3?crop=entropy&cs=srgb&fm=jpg&w=2000&q=80";
const SPORT_DATA = [
  { key: "football", img: "https://images.unsplash.com/photo-1767916732786-a83902ffc25c?w=900&q=70", Icon: SoccerBall },
  { key: "horse", img: "https://images.unsplash.com/photo-1702465420628-240095a78f8d?w=900&q=70", Icon: Horse },
  { key: "baseball", img: "https://images.unsplash.com/photo-1772476053599-1dae60f56339?w=900&q=70", Icon: Baseball },
  { key: "lottery", img: "https://images.unsplash.com/photo-1629723515744-9ece210b6ddd?w=900&q=70", Icon: Ticket },
];

export default function Home() {
  const { t, lang } = useLang();
  const [picks, setPicks] = useState([]);
  const [markets, setMarkets] = useState([]);

  useEffect(() => {
    api.get("/predictions?limit=6").then(({ data }) => setPicks(data || [])).catch(() => {});
    api.get("/markets?status=open&limit=4").then(({ data }) => setMarkets(data || [])).catch(() => {});
  }, []);

  return (
    <div>
      {/* HERO */}
      <section className="relative overflow-hidden">
        <div
          className="absolute inset-0 opacity-30"
          style={{ backgroundImage: `url(${HERO_IMG})`, backgroundSize: "cover", backgroundPosition: "center" }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/80 to-black gradient-radial" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-20 sm:pt-24 sm:pb-32">
          <div className="max-w-3xl fade-up">
            <span className="badge badge-lime mb-6" data-testid="hero-tag">
              <Lightning size={12} weight="fill" className="mr-1.5" />
              {lang === "es" ? "Nueva temporada · 2026" : "New season · 2026"}
            </span>
            <h1 className="font-display font-black text-5xl sm:text-7xl lg:text-8xl uppercase tracking-tighter leading-[0.9]">
              {t("home.hero1")}
              <br />
              <span className="text-[#d4ff00]">{t("home.hero2")}</span>
            </h1>
            <p className="mt-6 text-lg text-zinc-300 max-w-2xl leading-relaxed">{t("home.heroDesc")}</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/register" className="btn-primary" data-testid="hero-cta-join">
                {t("home.ctaJoin")} <ArrowRight size={16} weight="bold" />
              </Link>
              <Link to="/predictions" className="btn-outline" data-testid="hero-cta-see">
                {t("home.ctaSee")}
              </Link>
            </div>

            <div className="mt-12 grid grid-cols-3 max-w-md gap-6 border-t border-zinc-800 pt-6">
              <div>
                <div className="font-mono text-3xl font-bold text-[#d4ff00]">+1.2k</div>
                <div className="label !mt-1">Tipsters</div>
              </div>
              <div>
                <div className="font-mono text-3xl font-bold">94%</div>
                <div className="label !mt-1">ROI Top10</div>
              </div>
              <div>
                <div className="font-mono text-3xl font-bold">24/7</div>
                <div className="label !mt-1">Live</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* HERO BANNER */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-8 relative z-10">
        <Banner zone="hero" />
      </section>

      {/* SPORTS GRID */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="flex items-end justify-between mb-8">
          <div>
            <span className="label">01 / Sports</span>
            <h2 className="font-display font-black text-3xl sm:text-5xl uppercase tracking-tighter">
              {t("home.sports")}
            </h2>
          </div>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {SPORT_DATA.map((s) => (
            <Link
              key={s.key}
              to={`/predictions?sport=${s.key}`}
              data-testid={`sport-tile-${s.key}`}
              className="relative aspect-[4/5] overflow-hidden rounded-xl border border-zinc-800 group hover:border-[#d4ff00] transition-colors"
            >
              <img src={s.img} alt={s.key} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
              <div className="absolute inset-0 p-5 flex flex-col justify-end">
                <s.Icon size={40} weight="duotone" color="#d4ff00" className="mb-2" />
                <h3 className="font-display font-black text-2xl uppercase">{t(`common.${s.key}`)}</h3>
                <span className="text-xs text-zinc-400 inline-flex items-center gap-1 mt-1">
                  {lang === "es" ? "Ver pronósticos" : "See picks"} <ArrowRight size={12} />
                </span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* LATEST PICKS */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="flex items-end justify-between mb-8">
          <div>
            <span className="label">02 / Feed</span>
            <h2 className="font-display font-black text-3xl sm:text-5xl uppercase tracking-tighter">
              {t("home.latestPicks")}
            </h2>
          </div>
          <Link to="/predictions" className="btn-outline !py-2">
            {lang === "es" ? "Todos" : "All"} <ArrowRight size={14} />
          </Link>
        </div>
        {picks.length === 0 ? (
          <div className="pz-card p-10 text-center text-zinc-400">{t("predictions.empty")}</div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {picks.map((p) => <PredictionCard key={p.prediction_id} p={p} />)}
          </div>
        )}
      </section>

      {/* HOT MARKETS */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="flex items-end justify-between mb-8">
          <div>
            <span className="label">03 / Live</span>
            <h2 className="font-display font-black text-3xl sm:text-5xl uppercase tracking-tighter">
              {t("home.hotMarkets")}
            </h2>
          </div>
          <Link to="/markets" className="btn-outline !py-2">
            {lang === "es" ? "Mercados" : "Markets"} <ArrowRight size={14} />
          </Link>
        </div>
        {markets.length === 0 ? (
          <div className="pz-card p-10 text-center text-zinc-400">{t("markets.empty")}</div>
        ) : (
          <div className="grid md:grid-cols-2 gap-4">
            {markets.map((m) => <MarketCard key={m.market_id} market={m} />)}
          </div>
        )}
      </section>
    </div>
  );
}
