import { Link, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";

const C = {
  navy: "#0C2340",
  teal: "#0B7D6B",
  tealLight: "#E0F5F1",
  g200: "#E5E7EB",
  g400: "#9CA3AF",
  g800: "#1F2937",
};

const NAV_LINKS = [
  { label: "الرئيسية", to: "/" },
  { label: "تقارير الحوادث", to: "/public/incidents" },
  { label: "الإحصائيات", to: "/public/statistics" },
  { label: "مكتبة القصص", to: "/public/stories" },
  { label: "عن المنصة", to: "/public/about" },
];

export default function PublicNavbar() {
  const navigate = useNavigate();
  const [isMobile, setIsMobile] = useState(
    typeof window !== "undefined" ? window.innerWidth < 600 : false
  );

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 600);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return (
    <nav
      style={{
        position: "sticky",
        top: 0,
        zIndex: 1000,
        background: "#fff",
        borderBottom: `1px solid ${C.g200}`,
        fontFamily: '"Segoe UI", system-ui, sans-serif',
        direction: "rtl",
      }}
    >
      <div
        style={{
          maxWidth: 1160,
          margin: "0 auto",
          padding: "12px 20px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 16,
          flexDirection: isMobile ? "column" : "row",
        }}
      >
        <button
          type="button"
          onClick={() => navigate("/login")}
          style={{
            background: C.teal,
            color: "#fff",
            border: "none",
            borderRadius: 10,
            padding: "8px 18px",
            fontWeight: 700,
            fontSize: 14,
            cursor: "pointer",
            fontFamily: "inherit",
            letterSpacing: "0.01em",
            boxShadow: "0 6px 16px rgba(11,125,107,0.24)",
          }}
        >
          تسجيل الدخول
        </button>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 18,
            flexWrap: "wrap",
            justifyContent: "center",
            color: C.navy,
          }}
        >
          {NAV_LINKS.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              style={{
                textDecoration: "none",
                color: C.g800,
                fontWeight: 600,
                fontSize: 14,
              }}
            >
              {item.label}
            </Link>
          ))}
        </div>

        <Link
          to="/"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            textDecoration: "none",
            color: C.navy,
            fontWeight: 800,
          }}
        >
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 12,
              background: C.navy,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <span style={{ fontSize: 16, fontWeight: 800, color: "#fff", letterSpacing: "-0.03em" }}>
              E·OVR
            </span>
          </div>
          <span style={{ fontSize: 16, color: C.navy }}>E·OVR</span>
        </Link>
      </div>
    </nav>
  );
}
