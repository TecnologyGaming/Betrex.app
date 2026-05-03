import React from "react";
import { Link } from "react-router-dom";
import { useLang } from "../contexts/LanguageContext";
import { SoccerBall, Horse, Baseball, Ticket, Flame } from "@phosphor-icons/react";

const SPORT_ICON = {
  football: SoccerBall,
  horse: Horse,
  baseball: Baseball,
  lottery: Ticket,
};

const STATUS_BADGE = {
  pending: "badge-pending",
  won: "badge-win",
  lost: "badge-loss",
  void: "",
};

export default function PredictionCard({ p }) {
  const { t } = useLang();
  const Icon = SPORT_ICON[p.sport] || SoccerBall;
  return (
    <Link
      to={`/predictions/${p.prediction_id}`}
      data-testid={`prediction-card-${p.prediction_id}`}
      className="pz-card p-5 flex flex-col gap-3 hover:-translate-y-0.5"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-md bg-zinc-900 grid place-items-center">
            <Icon size={18} weight="duotone" color="#d4ff00" />
          </div>
          <span className="label !mb-0">{t(`common.${p.sport}`)}</span>
        </div>
        <span className={`badge ${STATUS_BADGE[p.status] || ""}`} data-testid={`pred-status-${p.status}`}>
          {t(`common.${p.status}`)}
        </span>
      </div>
      <div>
        <h3 className="font-display font-bold text-xl uppercase leading-tight tracking-tight line-clamp-2">
          {p.title}
        </h3>
        <p className="text-zinc-400 text-sm mt-1 line-clamp-1">{p.event}</p>
      </div>
      <div className="grid grid-cols-3 gap-2 text-center pt-2 border-t border-zinc-900">
        <div>
          <div className="label !mb-0.5">{t("common.odds")}</div>
          <div className="font-mono font-bold text-lg text-[#d4ff00]">{Number(p.odds).toFixed(2)}</div>
        </div>
        <div>
          <div className="label !mb-0.5">{t("common.stake")}</div>
          <div className="font-mono font-bold text-lg">{p.stake}/10</div>
        </div>
        <div>
          <div className="label !mb-0.5">{t("predictions.confidence")}</div>
          <div className="flex items-center justify-center gap-0.5 mt-1">
            {Array.from({ length: 5 }).map((_, i) => (
              <Flame
                key={i}
                size={14}
                weight={i < (p.confidence || 0) ? "fill" : "regular"}
                color={i < (p.confidence || 0) ? "#d4ff00" : "#3f3f46"}
              />
            ))}
          </div>
        </div>
      </div>
      <div className="text-sm text-zinc-300 line-clamp-2 font-medium">{p.pick}</div>
    </Link>
  );
}
