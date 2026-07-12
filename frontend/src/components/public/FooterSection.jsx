import { Link } from "react-router-dom";
import { useEffect, useState } from "react";

const C = {
  navy: "#0C2340",
  g200: "#E5E7EB",
};

const FOOTER_LINKS = [
  { label: "الرئيسية", to: "/" },
  { label: "تقارير الحوادث", to: "/public/incidents" },
  { label: "الإحصائيات", to: "/public/statistics" },
  { label: "مكتبة القصص", to: "/public/stories" },
  { label: "عن المنصة", to: "/public/about" },
];

export default function FooterSection() {
  const [isMobile, setIsMobile] = useState(
    typeof window !== "undefined" ? window.innerWidth < 600 : false
  );

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 600);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return (
    <footer
      style={{
        background: C.navy,
        color: "#fff",
        padding: "28px 20px",
        direction: "rtl",
        fontFamily: '"Segoe UI", system-ui, sans-serif',
      }}
    >
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        <div
          style={{
            display: "flex",
            flexDirection: isMobile ? "column" : "row",
            alignItems: isMobile ? "flex-start" : "center",
            justifyContent: "space-between",
            gap: 12,
          }}
        >
          <div style={{ fontWeight: 700, fontSize: 14 }}>E·OVR — منصة الإبلاغ عن الأحداث</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
            {FOOTER_LINKS.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                style={{
                  color: "#fff",
                  textDecoration: "none",
                  fontSize: 12,
                  opacity: 0.8,
                }}
              >
                {item.label}
              </Link>
            ))}
          </div>
        </div>
        <div
          style={{
            marginTop: 18,
            paddingTop: 12,
            borderTop: `1px solid ${C.g200}33`,
            textAlign: "center",
            fontSize: 12,
            color: "rgba(255,255,255,0.7)",
          }}
        >
         E-OVR © 2025
        </div>
        <div style={{ marginTop: 6, textAlign: "center", fontSize: 11, color: "rgba(255,255,255,0.4)" }}>
          Designed by{" "}
          <a
            href="https://clidatech.com"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: "rgba(255,255,255,0.6)", textDecoration: "none", fontWeight: 600 }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "#fff")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(255,255,255,0.6)")}
          >
            clidatech.com
          </a>
        </div>
      </div>
    </footer>
  );
}