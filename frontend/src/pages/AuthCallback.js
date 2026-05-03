import React, { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import api from "../lib/api";
import { useAuth } from "../contexts/AuthContext";

export default function AuthCallback() {
  const { setUser } = useAuth();
  const nav = useNavigate();
  const handled = useRef(false);

  useEffect(() => {
    if (handled.current) return;
    handled.current = true;
    const hash = window.location.hash || "";
    const m = hash.match(/session_id=([^&]+)/);
    if (!m) { nav("/login"); return; }
    const session_id = decodeURIComponent(m[1]);
    api.post("/auth/google/session", { session_id })
      .then(({ data }) => {
        setUser(data);
        // Clear the hash and redirect
        window.history.replaceState(null, "", "/");
        nav(data.role === "admin" ? "/admin" : "/", { replace: true });
      })
      .catch(() => nav("/login", { replace: true }));
  }, [nav, setUser]);

  return (
    <div className="min-h-screen grid place-items-center text-zinc-400">
      Authenticating...
    </div>
  );
}
