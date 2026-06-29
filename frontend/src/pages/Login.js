import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useLang } from "../contexts/LanguageContext";
import { GoogleLogo, Lightning } from "@phosphor-icons/react";

export default function Login() {
  const { login } = useAuth();
  const { t } = useLang();
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const submit = async (e) => {
    e.preventDefault(); setBusy(true); setErr("");
    try {
      const u = await login(email, password);
      nav(u.role === "admin" ? "/admin" : "/");
    } catch (er) { setErr(er?.response?.data?.detail || "Error"); }
    finally { setBusy(false); }
  };

  const google = () => {
    // REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
    const redirectUrl = window.location.origin + "/auth/callback";
    window.location.href = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}`;
  };

  return (
    <div className="min-h-[calc(100vh-200px)] grid place-items-center px-4 py-12">
      <div className="pz-card p-8 max-w-md w-full">
        <div className="flex items-center justify-center gap-2 mb-5">
          <img src="/logo.png" alt="BetRex" className="h-16 w-auto" />
        </div>
        <h1 className="font-display font-black text-3xl uppercase tracking-tighter text-center mb-6">{t("auth.loginTitle")}</h1>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="label">{t("common.email")}</label>
            <input type="email" required className="input" value={email} onChange={(e) => setEmail(e.target.value)} data-testid="login-email" />
          </div>
          <div>
            <label className="label">{t("common.password")}</label>
            <input type="password" required minLength={6} className="input" value={password} onChange={(e) => setPassword(e.target.value)} data-testid="login-password" />
          </div>
          {err && <div className="text-[#ff3b30] text-sm" data-testid="login-error">{err}</div>}
          <button type="submit" disabled={busy} className="btn-primary w-full justify-center" data-testid="login-submit">
            {busy ? "..." : t("nav.login")}
          </button>
        </form>

        <div className="my-5 flex items-center gap-3">
          <div className="flex-1 divider" />
          <span className="text-xs text-zinc-500">{t("common.or")}</span>
          <div className="flex-1 divider" />
        </div>

        <button onClick={google} className="btn-outline w-full justify-center" data-testid="login-google">
          <GoogleLogo size={18} weight="bold" /> {t("common.continueWithGoogle")}
        </button>

        <div className="text-center text-sm text-zinc-400 mt-6">
          {t("auth.noAccount")} <Link to="/register" className="text-[#d4ff00] font-semibold">{t("auth.goRegister")}</Link>
        </div>
      </div>
    </div>
  );
}
