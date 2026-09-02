import React, { useEffect, useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useLang } from "../contexts/LanguageContext";
import { X, Gift, Coins, Ticket } from "@phosphor-icons/react";

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
      <div className="pz-card relative max-w-sm w-full overflow-hidden text-center p-6"
           onClick={(e) => e.stopPropagation()} data-testid="welcome-modal">
        <button onClick={close} className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/60 grid place-items-center hover:bg-black">
          <X size={16} weight="bold" />
        </button>

        <div className="mx-auto w-14 h-14 rounded-full bg-[#d4ff00] grid place-items-center mb-3 animate-pulse">
          <Gift size={28} weight="fill" color="#000" />
        </div>

        <h2 className="font-display font-black text-2xl uppercase tracking-tighter">
          {t("common.welcomeBonus")}
        </h2>
        <p className="text-zinc-400 text-xs mt-1">
          {lang === "es"
            ? "Te obsequiamos 2 boletos de Powerball de regalo para que empieces a ganar en grande."
            : "We give you 2 free Powerball tickets to get you started on winning big."}
        </p>

        <div className="my-4 inline-flex items-center gap-2.5 px-4 py-2.5 rounded-xl bg-[#d4ff00]/10 border border-[#d4ff00]/30 animate-bounce">
          <Ticket size={24} weight="fill" color="#d4ff00" />
          <div>
            <div className="text-[9px] text-zinc-400 uppercase tracking-wider font-bold leading-none mb-1">{lang === "es" ? "Regalo Especial" : "Special Gift"}</div>
            <div className="font-mono font-black text-lg text-[#d4ff00] leading-none">{lang === "es" ? "2 BOLETOS POWERBALL" : "2 POWERBALL TICKETS"}</div>
          </div>
        </div>

        <p className="text-[10px] text-zinc-500 mb-4 leading-relaxed">
          {lang === "es"
            ? "¡Tus boletos ya han sido acreditados de obsequio a tu cuenta de Lotería!"
            : "Your tickets have already been credited as a gift to your Lottery account!"}
        </p>

        <button onClick={close} className="btn-primary w-full justify-center !py-2 text-xs font-black uppercase tracking-wider" style={{ backgroundColor: '#d4ff00', color: 'black' }}>
          {lang === "es" ? "¡A jugar!" : "Let's go!"}
        </button>
      </div>
    </div>
  );
}
