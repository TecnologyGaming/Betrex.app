import React, { useEffect, useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useLang } from "../contexts/LanguageContext";
import { X, Gift, Coins } from "@phosphor-icons/react";

export default function WelcomeBonusModal() {
  const { user } = useAuth();
  const { t, lang } = useLang();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!user) return;
    if (!user.welcome_bonus_granted) return;
    const seen = localStorage.getItem(`pz_welcome_${user.user_id}`);
    if (seen) return;
    setTimeout(() => setOpen(true), 600);
  }, [user]);

  if (!open || !user) return null;

  const close = () => {
    localStorage.setItem(`pz_welcome_${user.user_id}`, "1");
    setOpen(false);
  };

  return (
    <div className="fixed inset-0 z-[60] grid place-items-center bg-black/85 backdrop-blur-sm p-4 fade-up"
         onClick={close} data-testid="welcome-overlay">
      <div className="pz-card relative max-w-md w-full overflow-hidden text-center p-8"
           onClick={(e) => e.stopPropagation()} data-testid="welcome-modal">
        <button onClick={close} className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/60 grid place-items-center hover:bg-black">
          <X size={16} weight="bold" />
        </button>

        <div className="mx-auto w-20 h-20 rounded-full bg-[#d4ff00] grid place-items-center mb-4 animate-pulse">
          <Gift size={42} weight="fill" color="#000" />
        </div>

        <h2 className="font-display font-black text-3xl uppercase tracking-tighter">
          {t("common.welcomeBonus")}
        </h2>
        <p className="text-zinc-400 mt-2">
          {lang === "es"
            ? "Te damos coins gratis para empezar a jugar."
            : "Free coins to get you started."}
        </p>

        <div className="my-6 inline-flex items-center gap-3 px-6 py-4 rounded-xl bg-[#d4ff00]/10 border border-[#d4ff00]">
          <Coins size={36} weight="fill" color="#d4ff00" />
          <div>
            <div className="text-xs text-zinc-400 uppercase tracking-wider font-bold">{t("common.youReceived")}</div>
            <div className="font-mono font-black text-4xl text-[#d4ff00] leading-none">+100</div>
          </div>
        </div>

        <p className="text-xs text-zinc-500 mb-4">
          {lang === "es"
            ? "Inicia sesión cada día para sumar coins extra con el sistema de rachas."
            : "Log in daily for extra coins via the streak system."}
        </p>

        <button onClick={close} className="btn-primary w-full justify-center" data-testid="welcome-cta">
          {lang === "es" ? "¡A jugar!" : "Let's go!"}
        </button>
      </div>
    </div>
  );
}
