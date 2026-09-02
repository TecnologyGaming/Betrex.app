import "@/index.css";
import "@/App.css";
import React, { useEffect } from "react";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { LanguageProvider } from "@/contexts/LanguageContext";
import Layout from "@/components/Layout";
import Home from "@/pages/Home";
import Predictions from "@/pages/Predictions";
import PredictionDetail from "@/pages/PredictionDetail";
import Markets from "@/pages/Markets";
import Ranking from "@/pages/Ranking";
import Wallet from "@/pages/Wallet";
import Profile from "@/pages/Profile";
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import AuthCallback from "@/pages/AuthCallback";
import Admin from "@/pages/Admin";
import Horoscope from "@/pages/Horoscope";
import Lottery from "@/pages/Lottery";
import Slots from "@/pages/Slots";
import Terms from "@/pages/Terms";
import BetOfTheDayModal from "@/components/BetOfTheDayModal";
import WelcomeBonusModal from "@/components/WelcomeBonusModal";
import api from "@/lib/api";

function AppRouter() {
  const location = useLocation();

  useEffect(() => {
    api.get("/seo").then(({ data }) => {
      if (data) {
        if (data.title) document.title = data.title;
        const descMeta = document.querySelector('meta[name="description"]');
        if (descMeta && data.description) descMeta.setAttribute("content", data.description);
        const keyMeta = document.querySelector('meta[name="keywords"]');
        if (keyMeta && data.keywords) {
          keyMeta.setAttribute("content", data.keywords);
        } else if (data.keywords) {
          const newMeta = document.createElement('meta');
          newMeta.name = 'keywords';
          newMeta.content = data.keywords;
          document.head.appendChild(newMeta);
        }
      }
    }).catch(() => {});
  }, [location.pathname]);

  // If returning from Emergent Google auth, the URL has #session_id=...
  if (location.hash?.includes("session_id=")) {
    return <AuthCallback />;
  }
  // Don't show modals on auth/admin routes
  const isAuthOrAdmin = /^\/(login|register|auth|admin)/.test(location.pathname);
  return (
    <Layout>
      {!isAuthOrAdmin && <BetOfTheDayModal />}
      {!isAuthOrAdmin && <WelcomeBonusModal />}
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/predictions" element={<Predictions />} />
        <Route path="/predictions/:id" element={<PredictionDetail />} />
        <Route path="/markets" element={<Markets />} />
        <Route path="/ranking" element={<Ranking />} />
        <Route path="/wallet" element={<Wallet />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/horoscope" element={<Horoscope />} />
        <Route path="/lottery" element={<Lottery />} />
        <Route path="/slots" element={<Slots />} />
        <Route path="/terms" element={<Terms />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/auth/callback" element={<AuthCallback />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="*" element={<Home />} />
      </Routes>
    </Layout>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <LanguageProvider>
        <AuthProvider>
          <AppRouter />
        </AuthProvider>
      </LanguageProvider>
    </BrowserRouter>
  );
}
