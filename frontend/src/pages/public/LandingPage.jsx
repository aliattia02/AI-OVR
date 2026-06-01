import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import PublicNavbar from "../../components/public/PublicNavbar";
import HeroSection from "../../components/public/HeroSection";
import StoriesSection from "../../components/public/StoriesSection";
import ImpactSection from "../../components/public/ImpactSection";
import FooterSection from "../../components/public/FooterSection";

export default function LandingPage() {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    document.documentElement.dir = "rtl";
    return () => {
      document.documentElement.dir = "ltr";
    };
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      navigate("/dashboard", { replace: true });
    }
  }, [isAuthenticated, navigate]);

  return (
    <>
      <PublicNavbar />
      <HeroSection />
      <StoriesSection />
      <ImpactSection />
      <FooterSection />
    </>
  );
}
