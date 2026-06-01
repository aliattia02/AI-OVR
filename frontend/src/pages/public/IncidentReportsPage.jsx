import { useEffect } from "react";
import PublicNavbar from "../../components/public/PublicNavbar";
import FooterSection from "../../components/public/FooterSection";

const C = {
  navy: "#0C2340",
  teal: "#0B7D6B",
};

export default function IncidentReportsPage() {
  useEffect(() => {
    document.documentElement.dir = "rtl";
    return () => {
      document.documentElement.dir = "ltr";
    };
  }, []);

  return (
    <>
      <PublicNavbar />
      <main
        style={{
          minHeight: "60vh",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          textAlign: "center",
          padding: "60px 20px",
          fontFamily: '"Segoe UI", system-ui, sans-serif',
          direction: "rtl",
        }}
      >
        <div style={{ fontSize: 28, fontWeight: 800, color: C.navy }}>تقارير الحوادث</div>
        <div style={{ marginTop: 12, fontSize: 16, color: C.teal }}>
          قريباً — هذه الصفحة تحت الإنشاء
        </div>
      </main>
      <FooterSection />
    </>
  );
}
