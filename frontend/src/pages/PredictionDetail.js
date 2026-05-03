import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import api from "../lib/api";
import { useLang } from "../contexts/LanguageContext";
import { ArrowLeft, SoccerBall, Horse, Baseball, Ticket, Flame } from "@phosphor-icons/react";

const SPORT_ICON = { football: SoccerBall, horse: Horse, baseball: Baseball, lottery: Ticket };

export default function PredictionDetail() {
  const { id } = useParams();
  const { t } = useLang();
  const [p, setP] = useState(null);

  useEffect(() => {
    api.get(`/predictions/${id}`).then(({ data }) => setP(data)).catch(() => {});
  }, [id]);

  if (!p) return <div className="max-w-3xl mx-auto px-4 py-20 text-zinc-400">Loading...</div>;
  const Icon = SPORT_ICON[p.sport] || SoccerBall;

  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <Link to="/predictions" className="text-zinc-400 inline-flex items-center gap-2 mb-4 hover:text-white">
        <ArrowLeft size={16} /> {t("common.back")}
      </Link>
      {p.image_url && (
        <div className="aspect-[16/7] rounded-xl overflow-hidden border border-zinc-800 mb-6">
          <img src={p.image_url} alt={p.title} className="w-full h-full object-cover" />
        </div>
      )}
      <div className="pz-card p-8">
        <div className="flex items-center gap-3 mb-4">
          <Icon size={28} weight="duotone" color="#d4ff00" />
          <span className="label !mb-0">{t(`common.${p.sport}`)}</span>
          <span className={`badge ${p.status === "won" ? "badge-win" : p.status === "lost" ? "badge-loss" : "badge-pending"}`}>
            {t(`common.${p.status}`)}
          </span>
        </div>
        <h1 className="font-display font-black text-4xl uppercase tracking-tighter">{p.title}</h1>
        <p className="text-zinc-400 mt-2">{p.event}</p>

        <div className="mt-6 grid grid-cols-3 gap-3 border border-zinc-800 rounded-lg p-4 bg-black/40">
          <div className="text-center">
            <div className="label">{t("common.odds")}</div>
            <div className="font-mono font-bold text-2xl text-[#d4ff00]">{Number(p.odds).toFixed(2)}</div>
          </div>
          <div className="text-center">
            <div className="label">{t("common.stake")}</div>
            <div className="font-mono font-bold text-2xl">{p.stake}/10</div>
          </div>
          <div className="text-center">
            <div className="label">{t("predictions.confidence")}</div>
            <div className="flex items-center justify-center gap-0.5 mt-1">
              {Array.from({ length: 5 }).map((_, i) => (
                <Flame key={i} size={18} weight={i < (p.confidence || 0) ? "fill" : "regular"}
                       color={i < (p.confidence || 0) ? "#d4ff00" : "#3f3f46"} />
              ))}
            </div>
          </div>
        </div>

        <div className="mt-6">
          <div className="label">{t("common.event")}</div>
          <div className="text-xl font-bold mt-1">{p.pick}</div>
        </div>

        {p.analysis && (
          <div className="mt-6">
            <div className="label">{t("common.analysis")}</div>
            <p className="text-zinc-300 mt-1 whitespace-pre-wrap leading-relaxed">{p.analysis}</p>
          </div>
        )}
      </div>
    </div>
  );
}
