import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../lib/api";
import { useLang } from "../contexts/LanguageContext";
import {
  X, Crown, Flame, SoccerBall, Horse, Baseball, Ticket, ArrowRight,
} from "@phosphor-icons/react";

const SPORT_ICON = { football: SoccerBall, horse: Horse, baseball: Baseball, lottery: Ticket };

export default function BetOfTheDayModal() {
  const { t, lang } = useLang();
  const [open, setOpen] = useState(false);
  const [data, setData] = useState(null);

  useEffect(() => {
    const todayKey = new Date().toISOString().slice(0, 10);
    const seen = localStorage.getItem("pz_botd_seen");
    if (seen === todayKey) return;
    api.get("/bet-of-the-day").then(({ data: d }) => {
      if (d?.prediction) {
        setData(d);
        // small delay so it doesn't feel jarring
        setTimeout(() => setOpen(true), 1200);
      }
    }).catch(() => {});
  }, []);

  const close = (skipForToday = false) => {
    if (skipForToday) {
      const todayKey = new Date().toISOString().slice(0, 10);
      localStorage.setItem("pz_botd_seen", todayKey);
    }
    setOpen(false);
  };

  if (!open || !data?.prediction) return null;
  const p = data.prediction;
  const Icon = SPORT_ICON[p.sport] || SoccerBall;

  return (
    <div
      className="fixed inset-0 z-[60] grid place-items-center bg-black/85 backdrop-blur-sm p-4 fade-up"
      data-testid="botd-overlay"
      onClick={() => close(false)}
    >
      <div
        className="pz-card relative max-w-md w-full overflow-hidden"
        onClick={(e) => e.stopPropagation()}
        data-testid="botd-modal"
      >
        {/* Glow header */}
        <div className="relative h-24 sm:h-28 overflow-hidden">
          <div
            className="absolute inset-0"
            style={{
              background:
                "radial-gradient(ellipse at center, rgba(212,255,0,0.3) 0%, transparent 65%), linear-gradient(135deg, #050505 0%, #1a1a1a 100%)",
            }}
          />
          <div className="absolute inset-0 grid place-items-center">
            <div className="text-center">
              <Crown size={28} weight="fill" color="#d4ff00" className="mx-auto" />
              <div className="font-display font-black text-xl uppercase tracking-tighter mt-0.5">
                {t("common.betOfTheDay")}
              </div>
              <div className="text-[10px] text-zinc-500 mt-0.5">
                {new Date(data.date).toLocaleDateString(lang === "es" ? "es-ES" : "en-US", {
                  weekday: "long", day: "numeric", month: "long",
                })}
              </div>
            </div>
          </div>
          <button
            onClick={() => close(false)}
            className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/60 grid place-items-center hover:bg-black"
            data-testid="botd-close"
            aria-label="Close"
          >
            <X size={16} weight="bold" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-md bg-zinc-900 grid place-items-center">
              <Icon size={20} weight="duotone" color="#d4ff00" />
            </div>
            <span className="label !mb-0">{t(`common.${p.sport}`)}</span>
            <span className="badge badge-lime ml-auto">PREMIUM</span>
          </div>

          <div>
            <h3 className="font-display font-black text-2xl uppercase tracking-tight leading-tight">
              {p.title}
            </h3>
            <p className="text-zinc-400 text-sm mt-1">{p.event}</p>
          </div>

          <div className="grid grid-cols-3 gap-2 text-center border border-zinc-800 rounded-lg p-3 bg-black/40">
            <div>
              <div className="label !mb-0.5">{t("common.odds")}</div>
              <div className="font-mono font-black text-2xl text-[#d4ff00]">{Number(p.odds).toFixed(2)}</div>
            </div>
            <div>
              <div className="label !mb-0.5">{t("common.stake")}</div>
              <div className="font-mono font-bold text-2xl">{p.stake}/10</div>
            </div>
            <div>
              <div className="label !mb-0.5">{t("predictions.confidence")}</div>
              <div className="flex items-center justify-center gap-0.5 mt-2">
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

          <div className="border-t border-zinc-800 pt-3">
            <div className="label">Pick</div>
            <div className="font-bold text-lg">{p.pick}</div>
            {p.analysis && (
              <p className="text-sm text-zinc-400 mt-2 line-clamp-3">{p.analysis}</p>
            )}
          </div>

          <div className="flex gap-2">
            <Link
              to={`/predictions/${p.prediction_id}`}
              onClick={() => close(true)}
              className="btn-primary flex-1 justify-center"
              data-testid="botd-cta"
            >
              {t("home.ctaSee")} <ArrowRight size={14} weight="bold" />
            </Link>
            <button
              onClick={() => close(true)}
              className="btn-outline whitespace-nowrap"
              data-testid="botd-dismiss"
            >
              {t("common.dontShowAgain")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
