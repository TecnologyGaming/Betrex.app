import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useLang } from "../contexts/LanguageContext";
import { GoogleLogo, Lightning } from "@phosphor-icons/react";

export default function Register() {
  const { register } = useAuth();
  const { t, lang } = useLang();
  const nav = useNavigate();
  const [form, setForm] = useState({ name: "", email: "", password: "", referral_code: "" });
  const [agreed, setAgreed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    if (!agreed) {
      setErr(lang === "es" ? "Debes confirmar que eres mayor de 18 años para registrarte." : "You must confirm you are 18 years or older to register.");
      return;
    }
    setBusy(true); setErr("");
    try { await register(form); nav("/"); }
    catch (er) { setErr(er?.response?.data?.detail || "Error"); }
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
          <img src="/logo.png" alt="BetRex" className="max-w-[300px] h-[90px] object-contain" />
        </div>
        <h1 className="font-display font-black text-3xl uppercase tracking-tighter text-center mb-6">{t("auth.registerTitle")}</h1>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="label">{t("common.name")}</label>
            <input required className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} data-testid="register-name" />
          </div>
          <div>
            <label className="label">{t("common.email")}</label>
            <input type="email" required className="input" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} data-testid="register-email" />
          </div>
          <div>
            <label className="label">{t("common.password")}</label>
            <input type="password" required minLength={6} className="input" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} data-testid="register-password" />
          </div>

          <div>
            <label className="label">{lang === "es" ? "Código de Referido (Opcional)" : "Referral Code (Optional)"}</label>
            <input className="input" placeholder="REF-XXXXXX" value={form.referral_code} onChange={(e) => setForm({ ...form, referral_code: e.target.value })} data-testid="register-referral" />
          </div>

          <div className="flex items-start gap-2.5 my-4">
            <input
              type="checkbox"
              id="agree-checkbox"
              required
              className="mt-1 h-4 w-4 rounded border-zinc-800 bg-zinc-950 text-[#d4ff00] focus:ring-[#d4ff00] accent-[#d4ff00] cursor-pointer"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
              data-testid="agree-checkbox"
            />
            <label htmlFor="agree-checkbox" className="text-xs text-zinc-400 select-none leading-relaxed cursor-pointer">
              {lang === "es" ? (
                <>
                  Confirmo que tengo <strong className="text-zinc-300 font-bold">18 años o más</strong> y acepto las políticas de <strong className="text-zinc-300 font-bold">Juego Responsable</strong> de BetRex.app. Entiendo que es una plataforma de simulación con monedas virtuales sin valor real.
                </>
              ) : (
                <>
                  I confirm that I am <strong className="text-zinc-300 font-bold">18 years or older</strong> and accept the <strong className="text-zinc-300 font-bold">Responsible Gaming</strong> policies of BetRex.app. I understand this is a simulation platform with virtual coins of no real value.
                </>
              )}
            </label>
          </div>

          {err && <div className="text-[#ff3b30] text-sm" data-testid="register-error">{err}</div>}
          <button type="submit" disabled={busy || !agreed} className="btn-primary w-full justify-center" data-testid="register-submit">
            {busy ? "..." : t("nav.register")}
          </button>
        </form>

        <div className="my-5 flex items-center gap-3">
          <div className="flex-1 divider" />
          <span className="text-xs text-zinc-500">{t("common.or")}</span>
          <div className="flex-1 divider" />
        </div>

        <button onClick={google} className="btn-outline w-full justify-center" data-testid="register-google">
          <GoogleLogo size={18} weight="bold" /> {t("common.continueWithGoogle")}
        </button>

        <div className="text-center text-sm text-zinc-400 mt-6">
          {t("auth.haveAccount")} <Link to="/login" className="text-[#d4ff00] font-semibold">{t("auth.goLogin")}</Link>
        </div>
      </div>
    </div>
  );
}
