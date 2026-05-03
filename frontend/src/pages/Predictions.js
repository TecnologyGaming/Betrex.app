import React, { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import api from "../lib/api";
import PredictionCard from "../components/PredictionCard";
import Banner from "../components/Banner";
import { useLang } from "../contexts/LanguageContext";

const SPORTS = ["all", "football", "horse", "baseball", "lottery"];

export default function Predictions() {
  const [params, setParams] = useSearchParams();
  const sport = params.get("sport") || "all";
  const { t } = useLang();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const q = sport && sport !== "all" ? `?sport=${sport}` : "";
    api.get(`/predictions${q}`).then(({ data }) => setItems(data || []))
      .finally(() => setLoading(false));
  }, [sport]);

  const setSport = (s) => {
    if (s === "all") { params.delete("sport"); } else { params.set("sport", s); }
    setParams(params);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="mb-8">
        <span className="label">Feed</span>
        <h1 className="font-display font-black text-4xl sm:text-6xl uppercase tracking-tighter">{t("predictions.title")}</h1>
        <p className="text-zinc-400 mt-2">{t("predictions.subtitle")}</p>
      </div>

      <div className="flex flex-wrap gap-2 mb-6">
        {SPORTS.map((s) => (
          <button
            key={s}
            onClick={() => setSport(s)}
            data-testid={`filter-sport-${s}`}
            className={`px-4 py-2 rounded-md font-bold text-sm uppercase tracking-wider transition-all ${
              sport === s
                ? "bg-[#d4ff00] text-black"
                : "bg-zinc-900 text-zinc-300 hover:bg-zinc-800 border border-zinc-800"
            }`}
          >
            {t(`common.${s}`)}
          </button>
        ))}
      </div>

      <div className="grid lg:grid-cols-[1fr_300px] gap-6">
        <div>
          {loading ? (
            <div className="pz-card p-10 text-center text-zinc-500">Loading...</div>
          ) : items.length === 0 ? (
            <div className="pz-card p-10 text-center text-zinc-400" data-testid="predictions-empty">{t("predictions.empty")}</div>
          ) : (
            <div className="grid md:grid-cols-2 gap-4">
              {items.map((p, i) => (
                <React.Fragment key={p.prediction_id}>
                  <PredictionCard p={p} />
                  {(i + 1) % 4 === 0 && (
                    <div className="md:col-span-2"><Banner zone="feed" /></div>
                  )}
                </React.Fragment>
              ))}
            </div>
          )}
        </div>
        <aside className="space-y-4 hidden lg:block">
          <Banner zone="sidebar" />
        </aside>
      </div>
    </div>
  );
}
