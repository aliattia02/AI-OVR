// frontend/src/pages/public/LandingPage.jsx
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import PublicNavbar from "../../components/public/PublicNavbar";
import HeroSection from "../../components/public/HeroSection";
import StoriesSection from "../../components/public/StoriesSection";
import ImpactSection from "../../components/public/ImpactSection";
import FooterSection from "../../components/public/FooterSection";

const C = {
  navy: "#0C2340",
  navyDark: "#071526",
  teal: "#0B7D6B",
  tealDark: "#086B5B",
  tealLight: "#E0F5F1",
  ivory: "#F5F7FA",
  g200: "#E5E7EB",
  g400: "#9CA3AF",
  g600: "#4B5563",
  g800: "#1F2937",
};

export default function LandingPage() {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  // Keep dir + lang in sync, reset both on unmount
  useEffect(() => {
    document.documentElement.dir = "rtl";
    document.documentElement.lang = "ar";
    return () => {
      document.documentElement.dir = "ltr";
      document.documentElement.lang = "en";
    };
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      navigate("/dashboard", { replace: true });
    }
  }, [isAuthenticated, navigate]);

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        fontFamily: '"Segoe UI", system-ui, sans-serif',
        direction: "rtl",
      }}
    >
      <PublicNavbar />

      <main style={{ flex: 1 }}>
        <HeroSection />
        <StoriesSection />
        <ImpactSection />
      </main>

      <FooterSection />

      <style>{`
        @keyframes pulse-dot {
          0%, 100% { opacity: 1; transform: scale(1); }
          50%       { opacity: 0.5; transform: scale(0.85); }
        }
      `}</style>
    </div>
  );
}