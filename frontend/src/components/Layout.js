import React, { useEffect, useState } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useLang } from "../contexts/LanguageContext";
import api from "../lib/api";
import {
  House, Trophy, Coins, ChartBar, UserCircle, ListChecks,
  SignOut, SignIn, Globe, BellRinging, Lightning, Wallet
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
  ];

  const isAdminRoute = loc.pathname.startsWith("/admin");

  return (
    <div className="grain min-h-screen flex flex-col relative">
      {/* Header */}
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-black/70 border-b border-zinc-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between gap-4">
          <Link to="/" className="flex items-center gap-2 group" data-testid="logo-link">
            <img src="/logo.png" alt="BetRex" className="h-10 sm:h-11 w-auto group-hover:scale-105 transition-transform" />
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

      <footer className="mt-20 border-t border-zinc-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 grid md:grid-cols-3 gap-8 text-sm">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <img src="/logo.png" alt="BetRex" className="h-10 w-auto" />
            </div>
            <p className="text-zinc-400 leading-relaxed">
              {lang === "es"
                ? "Plataforma profesional de pronósticos y mercados prop. Comunidad seria, tipsters verificados."
                : "Pro predictions platform and prop markets. Serious community, verified tipsters."}
            </p>
          </div>
          <div>
            <div className="label mb-3">{lang === "es" ? "Deportes" : "Sports"}</div>
            <ul className="space-y-1.5 text-zinc-400">
              {SPORTS.map((s) => (
                <li key={s.key}>
                  <Link to={`/predictions?sport=${s.key}`} className="hover:text-[#d4ff00]">
                    {s.label[lang]}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <Banner zone="footer" />
          </div>
        </div>
        <div className="border-t border-zinc-900 py-4 text-center text-xs text-zinc-500">
          © {new Date().getFullYear()} BetRex.app · {lang === "es" ? "Apuesta con responsabilidad" : "Bet responsibly"} · 18+
        </div>
      </footer>
    </div>
  );
}
