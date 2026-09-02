import React, { useEffect, useState } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useLang } from "../contexts/LanguageContext";
import api from "../lib/api";
import {
  House, Trophy, Coins, ChartBar, UserCircle, ListChecks,
  SignOut, SignIn, Globe, BellRinging, Lightning, Wallet, Star, Ticket
} from "@phosphor-icons/react";
import Banner from "./Banner";

const SPORTS = [
  { key: "football", label: { es: "Fútbol", en: "Football" } },
  { key: "horse", label: { es: "Caballos", en: "Horse" } },
  { key: "baseball", label: { es: "Béisbol", en: "Baseball" } },
  { key: "lottery", label: { es: "Lotería", en: "Lottery" } },
];

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const { lang, setLang, t } = useLang();
  const nav = useNavigate();
  const loc = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => { setMobileOpen(false); }, [loc.pathname]);

  const navLinks = [
    { to: "/", label: t("nav.home"), icon: House, testId: "nav-home" },
    { to: "/predictions", label: t("nav.predictions"), icon: ListChecks, testId: "nav-predictions" },
    { to: "/markets", label: t("nav.markets"), icon: Lightning, testId: "nav-markets" },
    { to: "/ranking", label: t("nav.ranking"), icon: Trophy, testId: "nav-ranking" },
    { to: "/horoscope", label: lang === "es" ? "Horóscopo" : "Horoscope", icon: Star, testId: "nav-horoscope" },
    { to: "/lottery", label: lang === "es" ? "Lotería" : "Lottery", icon: Ticket, testId: "nav-lottery" },
    { to: "/slots", label: "Slots", icon: Coins, testId: "nav-slots" },
  ];

  const isAdminRoute = loc.pathname.startsWith("/admin");

  return (
    <div className="grain min-h-screen flex flex-col relative">
      {/* Header */}
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-black/70 border-b border-zinc-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between gap-4">
          <Link to="/" className="flex items-center gap-2 group" data-testid="logo-link">
            <img src="/logo.png" alt="BetRex" className="max-w-[180px] h-[60px] sm:max-w-[280px] sm:h-[90px] lg:max-w-[450px] lg:h-[140px] object-contain group-hover:opacity-80 transition-opacity" />
          </Link>

          <nav className="hidden md:flex items-center gap-1">
            {navLinks.map((l) => (
              <NavLink
                key={l.to}
                to={l.to}
                end={l.to === "/"}
                data-testid={l.testId}
                className={({ isActive }) =>
                  `px-3 py-2 rounded-md text-sm font-semibold transition-colors flex items-center gap-2 ${
                    isActive ? "bg-zinc-900 text-[#d4ff00]" : "text-zinc-400 hover:text-white hover:bg-zinc-900/50"
                  }`
                }
              >
                <l.icon size={16} weight="bold" />
                {l.label}
              </NavLink>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setLang(lang === "es" ? "en" : "es")}
              data-testid="lang-toggle"
              className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border border-zinc-800 text-xs font-bold uppercase tracking-wider hover:border-[#d4ff00] hover:text-[#d4ff00] transition-colors"
              aria-label="Toggle language"
            >
              <Globe size={14} weight="bold" />
              {lang.toUpperCase()}
            </button>

            {user ? (
              <>
                <Link
                  to="/wallet"
                  data-testid="wallet-pill"
                  className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-zinc-900 border border-zinc-800 hover:border-[#d4ff00] transition-colors"
                >
                  <Coins size={16} color="#d4ff00" weight="fill" />
                  <span className="font-mono font-bold text-sm">
                    {user.coins_balance ?? 0}
                  </span>
                </Link>
                {user.role === "admin" && !isAdminRoute && (
                  <Link to="/admin" className="btn-outline !py-1.5 !px-3 text-xs" data-testid="goto-admin">
                    {t("nav.admin")}
                  </Link>
                )}
                <Link
                  to="/profile"
                  data-testid="goto-profile"
                  className="hidden sm:flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-zinc-900"
                >
                  {user.picture ? (
                    <img src={user.picture} alt={user.name} className="w-7 h-7 rounded-full" />
                  ) : (
                    <UserCircle size={26} weight="fill" />
                  )}
                  <span className="text-sm font-semibold max-w-[120px] truncate">{user.name}</span>
                </Link>
                <button
                  onClick={async () => { await logout(); nav("/"); }}
                  data-testid="logout-btn"
                  className="p-2 text-zinc-400 hover:text-white"
                  title={t("nav.logout")}
                >
                  <SignOut size={20} />
                </button>
              </>
            ) : (
              <>
                <Link to="/login" className="btn-outline !py-1.5 !px-3 text-xs" data-testid="header-login">
                  <SignIn size={14} weight="bold" /> {t("nav.login")}
                </Link>
                <Link to="/register" className="btn-primary !py-1.5 !px-3 text-xs" data-testid="header-register">
                  {t("nav.register")}
                </Link>
              </>
            )}

            <button
              className="md:hidden p-2 text-white"
              onClick={() => setMobileOpen((v) => !v)}
              data-testid="mobile-menu-toggle"
              aria-label="Menu"
            >
              <div className="w-5 h-0.5 bg-white mb-1.5" />
              <div className="w-5 h-0.5 bg-white mb-1.5" />
              <div className="w-5 h-0.5 bg-white" />
            </button>
          </div>
        </div>

        {mobileOpen && (
          <div className="md:hidden border-t border-zinc-900 bg-black px-4 py-3 flex flex-col gap-1">
            {navLinks.map((l) => (
              <NavLink
                key={l.to}
                to={l.to}
                end={l.to === "/"}
                className={({ isActive }) =>
                  `px-3 py-2 rounded-md text-sm font-semibold flex items-center gap-2 ${
                    isActive ? "bg-zinc-900 text-[#d4ff00]" : "text-zinc-300"
                  }`
                }
              >
                <l.icon size={16} weight="bold" />
                {l.label}
              </NavLink>
            ))}
            {user && (
              <Link to="/wallet" className="px-3 py-2 rounded-md text-sm font-semibold flex items-center gap-2 text-zinc-300">
                <Wallet size={16} weight="bold" /> {t("nav.wallet")} · {user.coins_balance} {t("common.coins")}
              </Link>
            )}
            {user && (
              <Link to="/profile" className="px-3 py-2 rounded-md text-sm font-semibold text-zinc-300 flex items-center gap-2">
                <UserCircle size={16} weight="bold" /> {t("nav.profile")}
              </Link>
            )}
            <button
              onClick={() => setLang(lang === "es" ? "en" : "es")}
              className="px-3 py-2 rounded-md text-sm font-semibold text-zinc-300 flex items-center gap-2 text-left"
            >
              <Globe size={16} weight="bold" /> {lang.toUpperCase()}
            </button>
          </div>
        )}
      </header>

      <main className="flex-1 relative z-10">
        {children}
      </main>

      <footer className="mt-20 border-t border-zinc-900 bg-black/60 relative z-20">
        {/* Grilla de Métodos de Pago y Partners de Confianza */}
        <div className="border-b border-zinc-900/60 py-6 bg-black/40">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-4 text-zinc-500 font-mono text-[10px] font-bold uppercase tracking-widest text-center">
              <span>Visa</span>
              <span>MasterCard</span>
              <span>Bank Transfer</span>
              <span>Zimpler</span>
              <span>Trustly</span>
              <span>Revolut</span>
              <span>Skrill</span>
              <span>Neteller</span>
              <span>Rapid Transfer</span>
              <span>Paysafecard</span>
              <span>AstroPay</span>
              <span>Jetonbank</span>
              <span>MiFinity</span>
              <span>CASHlib</span>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 grid md:grid-cols-3 gap-8 text-sm">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <img src="/logo.png" alt="BetRex" className="max-w-[180px] h-[60px] sm:max-w-[280px] sm:h-[90px] lg:max-w-[450px] lg:h-[140px] object-contain" />
            </div>
            <p className="text-zinc-400 leading-relaxed text-xs">
              {lang === "es"
                ? "Plataforma de apuestas deportivas líder que utiliza monedas virtuales propias. ¡Apuesta de forma divertida, sin riesgo y siente toda la emoción de ganar hoy!"
                : "Leading sports betting platform using own virtual coins. Bet in a fun, risk-free way and feel all the excitement of winning today!"}
            </p>
          </div>
          <div>
            <div className="label mb-3">{lang === "es" ? "Deportes & Enlaces" : "Sports & Links"}</div>
            <ul className="space-y-1.5 text-zinc-400 text-xs">
              {SPORTS.map((s) => (
                <li key={s.key}>
                  <Link to={`/predictions?sport=${s.key}`} className="hover:text-[#d4ff00]">
                    {s.label[lang]}
                  </Link>
                </li>
              ))}
              <li className="pt-2 border-t border-zinc-900/50">
                <Link to="/terms" className="text-zinc-300 hover:text-[#d4ff00] font-bold">
                  ⚖ {lang === "es" ? "Términos y Condiciones" : "Terms & Conditions"}
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <Banner zone="footer" />
          </div>

          {/* MGA License block / Malta regulator */}
          <div className="md:col-span-3 border-t border-zinc-900/60 pt-6 text-center space-y-4">
            <p className="text-[10px] text-zinc-500 leading-relaxed max-w-4xl mx-auto">
              The official number and date of issue of the license is <strong className="text-zinc-400">BETREX/B2C/767/2023</strong> issued on <strong className="text-zinc-400">11.10.2023</strong>. This public regulatory body is responsible for the governance of all forms of gaming based in Malta. Find out more about the MGA at www.mga.org.mt.
            </p>
            <p className="text-[10px] text-zinc-600 leading-relaxed max-w-4xl mx-auto">
              Copyright © 2024. This website is operated by BetRex Ltd. according to Maltese Law whose registered office is at Level 3 (Suite No.3333) Tower Business Centre, Triq It-Torri, Swatar, Birkirkara BKR 4013, Malta.
            </p>
          </div>

          <div className="md:col-span-3 border-t border-zinc-900/50 pt-6 mt-2">
            <h4 className="text-[#d4ff00] font-bold text-xs uppercase tracking-wider mb-2">
              {lang === "es" ? "🔞 Juego Responsable y Descargo de Responsabilidad" : "🔞 Responsible Gaming & Disclaimer"}
            </h4>
            <p className="text-xs text-zinc-500 leading-relaxed">
              {lang === "es" ? (
                "BetRex es una plataforma de apuestas deportivas y entretenimiento que utiliza exclusivamente monedas virtuales propias de la plataforma para jugar sin riesgo financiero real. No se ofrecen juegos de azar con dinero real ni la oportunidad de ganar premios monetarios reales. La participación y el éxito en nuestro simulador no garantizan el éxito futuro en apuestas con dinero real de verdad. Juega de manera responsable y moderada."
              ) : (
                "BetRex is a sports betting and entertainment platform that operates solely and exclusively using the platform's own virtual coins for risk-free entertainment. We do not offer real money gambling, real sports betting, or any opportunity to win real money or prizes. Practice or success in our simulator does not imply or guarantee future success in real-world gambling. Play responsibly and in moderation."
              )}
            </p>
          </div>
        </div>

        {/* Responsible gambling badges & certifications */}
        <div className="border-t border-zinc-900 py-6 bg-black/80">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-zinc-500 font-mono text-[9px] font-black uppercase tracking-wider text-center">
            <span className="border border-zinc-800 rounded px-1.5 py-0.5 text-zinc-400 text-xs">18+</span>
            <span className="hover:text-[#d4ff00] transition-colors">eCOGRA</span>
            <span className="hover:text-[#d4ff00] transition-colors">Responsible Gaming Foundation</span>
            <span className="hover:text-[#d4ff00] transition-colors">Gambling Therapy (GA)</span>
          </div>
        </div>

        <div className="border-t border-zinc-900/80 py-4 text-center text-xs text-zinc-500 font-mono bg-black">
          © 2024 BetRex.app · {lang === "es" ? "Apuesta con responsabilidad" : "Bet responsibly"} · 18+
        </div>
      </footer>
    </div>
  );
}
