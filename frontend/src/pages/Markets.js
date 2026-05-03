import React, { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import api from "../lib/api";
import MarketCard from "../components/MarketCard";
import Banner from "../components/Banner";
import { useLang } from "../contexts/LanguageContext";

const SPORTS = ["all", "football", "horse", "baseball", "lottery"];

export default function Markets() {
  const [params, setParams] = useSearchParams();
  const sport = params.get("sport") || "all";
  const { t } = useLang();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const reload = () => {
    setLoading(true);
    const q = `?status=open${sport && sport !== "all" ? `&sport=${sport}` : ""}`;
    api.get(`/markets${q}`).then(({ data }) => setItems(data || []))
      .finally(() => setLoading(false));
  };

  useEffect(reload, [sport]);

  const setSport = (s) => {
    if (s === "all") params.delete("sport"); else params.set("sport", s);
    setParams(params);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="mb-8">
        <span className="label">Live</span>
        <h1 className="font-display font-black text-4xl sm:text-6xl uppercase tracking-tighter">{t("markets.title")}</h1>
        <p className="text-zinc-400 mt-2">{t("markets.subtitle")}</p>
      </div>

      <div className="flex flex-wrap gap-2 mb-6">
        {SPORTS.map((s) => (
          <button
            key={s}
            onClick={() => setSport(s)}
            data-testid={`market-filter-${s}`}
            className={`px-4 py-2 rounded-md font-bold text-sm uppercase tracking-wider transition-all ${
              sport === s
                ? "bg-[#007aff] text-white"
                : "bg-zinc-900 text-zinc-300 hover:bg-zinc-800 border border-zinc-800"
            }`}
          >
            {t(`common.${s}`)}
          </button>
        ))}
      </div>

      <Banner zone="hero" />

      <div className="mt-6">
        {loading ? (
          <div className="pz-card p-10 text-center text-zinc-500">Loading...</div>
        ) : items.length === 0 ? (
          <div className="pz-card p-10 text-center text-zinc-400" data-testid="markets-empty">{t("markets.empty")}</div>
        ) : (
          <div className="grid md:grid-cols-2 gap-4">
            {items.map((m) => <MarketCard key={m.market_id} market={m} onBetPlaced={reload} />)}
          </div>
        )}
      </div>
    </div>
  );
}
