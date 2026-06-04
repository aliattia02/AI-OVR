import { Link } from "react-router-dom";
import { useEffect, useState } from "react";

const C = {
  navy: "#0C2340",
  teal: "#0B7D6B",
  tealLight: "#E0F5F1",
  g200: "#E5E7EB",
  g600: "#4B5563",
  g800: "#1F2937",
};

const STATS = [
  { value: "1,247", label: "تقرير هذا الشهر" },
  { value: "89%", label: "تحسّن في الاستجابة" },
  { value: "34", label: "إجراء وقائي اتُّخذ" },
];

export default function HeroSection() {
  const [isMobile, setIsMobile] = useState(
    typeof window !== "undefined" ? window.innerWidth < 600 : false
  );

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 600);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return (
    <section
      style={{
        background: "#EEF2F7",
        padding: isMobile ? "48px 20px" : "72px 20px",
        direction: "rtl",
        fontFamily: '"Segoe UI", system-ui, sans-serif',
      }}
    >
      <div
        style={{
          maxWidth: 1100,
          margin: "0 auto",
          display: "flex",
          alignItems: "center",
          gap: isMobile ? 0 : 48,
        }}
      >
        {/* ── Logo (left side) ── */}
        {!isMobile && (
          <div style={{ flexShrink: 0 }}>
            <img
              src="/ehaegypt_logo.jpeg"
              alt="EHA Egypt"
              style={{
                width: 180,
                height: 180,
                objectFit: "contain",
                borderRadius: 16,
                background: "#fff",
                padding: 12,
                boxShadow: "0 8px 24px rgba(12,35,64,0.10)",
              }}
            />
          </div>
        )}

        {/* ── Text + stats column ── */}
        <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ color: C.teal, fontWeight: 700, fontSize: 14, marginBottom: 12 }}>
          منصة الإبلاغ عن الأحداث والحوادث
        </div>
        <div
          style={{
            fontSize: isMobile ? 32 : 44,
            fontWeight: 800,
            color: C.navy,
            marginBottom: 14,
            lineHeight: 1.2,
          }}
        >
          كل إبلاغ ينقذ حياة
        </div>
        <p style={{ color: C.g600, fontSize: 16, lineHeight: 1.8, marginBottom: 24 }}>
          الإبلاغ ليس مجرد إجراء إداري — هو عمل شجاع يحمي المرضى ويبني ثقافة أمان حقيقية. قصص
          حقيقية تثبت أن صوتك يُحدث فرقاً.
        </p>

        <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
          <Link
            to="/login"
            style={{
              background: C.teal,
              color: "#fff",
              padding: "10px 20px",
              borderRadius: 10,
              textDecoration: "none",
              fontWeight: 700,
              fontSize: 14,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 8px 18px rgba(11,125,107,0.25)",
            }}
          >
            سجّل حادثة الآن ←
          </Link>
          <Link
            to="/public/about"
            style={{
              border: `1px solid ${C.teal}`,
              color: C.teal,
              padding: "10px 20px",
              borderRadius: 10,
              textDecoration: "none",
              fontWeight: 700,
              fontSize: 14,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              background: "#fff",
            }}
          >
            تعرّف على المنصة
          </Link>
        </div>

        <div
          style={{
            marginTop: 32,
            display: "grid",
            gridTemplateColumns: isMobile ? "1fr" : "repeat(3, minmax(0, 1fr))",
            gap: 16,
          }}
        >
          {STATS.map((stat) => (
            <div
              key={stat.label}
              style={{
                background: stat.highlight ? C.tealLight : "#fff",
                borderRadius: 12,
                padding: "16px 18px",
                boxShadow: "0 8px 18px rgba(12,35,64,0.08)",
                border: stat.highlight ? `1px solid ${C.teal}` : `1px solid ${C.g200}`,
              }}
            >
              <div
                style={{
                  fontSize: 24,
                  fontWeight: 800,
                  color: stat.highlight ? C.teal : C.navy,
                  marginBottom: 6,
                }}
              >
                {stat.value}
              </div>
              <div style={{ fontSize: 13, color: C.g800 }}>{stat.label}</div>
            </div>
          ))}
        </div>
        </div> {/* end text column */}
      </div> {/* end flex wrapper */}
    </section>
  );
}