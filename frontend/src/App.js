import "@/index.css";
import "@/App.css";
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

function AppRouter() {
  const location = useLocation();
  // If returning from Emergent Google auth, the URL has #session_id=...
  if (location.hash?.includes("session_id=")) {
    return <AuthCallback />;
  }
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/predictions" element={<Predictions />} />
        <Route path="/predictions/:id" element={<PredictionDetail />} />
        <Route path="/markets" element={<Markets />} />
        <Route path="/ranking" element={<Ranking />} />
        <Route path="/wallet" element={<Wallet />} />
        <Route path="/profile" element={<Profile />} />
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
