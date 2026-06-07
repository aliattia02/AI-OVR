// frontend/src/components/public/PublicNavbar.jsx
import { Link, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";

const C = {
  navy:      "#0C2340",
  teal:      "#0B7D6B",
  tealLight: "#E0F5F1",
  g200:      "#E5E7EB",
  g800:      "#1F2937",
};

const NAV_LINKS = [
  { label: "الرئيسية",       to: "/" },
  { label: "الإحصائيات",     to: "/public/statistics" },
  { label: "مكتبة القصص",    to: "/public/stories" },
  { label: "عن المنصة",      to: "/public/about" },
];

export default function PublicNavbar() {
  const navigate = useNavigate();
  const [isMobile, setIsMobile] = useState(
    typeof window !== "undefined" ? window.innerWidth < 768 : false
  );
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 768);
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener("resize", onResize);
    window.addEventListener("scroll", onScroll);
    return () => {
      window.removeEventListener("resize", onResize);
      window.removeEventListener("scroll", onScroll);
    };
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
        transition: "box-shadow 0.2s",
        boxShadow: scrolled ? "0 2px 16px rgba(12,35,64,0.08)" : "none",
      }}
    >
      <div
        style={{
          maxWidth: 1160,
          margin: "0 auto",
          padding: isMobile ? "10px 16px" : "10px 24px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
        }}
      >

        {/* ── LEFT: Login CTA ── */}
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
            boxShadow: "0 4px 14px rgba(11,125,107,0.22)",
            transition: "background 0.15s, transform 0.15s",
            flexShrink: 0,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "#086B5B";
            e.currentTarget.style.transform = "translateY(-1px)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = C.teal;
            e.currentTarget.style.transform = "translateY(0)";
          }}
        >
          تسجيل الدخول
        </button>

        {/* ── CENTER: Nav links (hidden on mobile) ── */}
        {!isMobile && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 24,
              flexWrap: "nowrap",
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
                  whiteSpace: "nowrap",
                  transition: "color 0.15s",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.color = C.teal)}
                onMouseLeave={(e) => (e.currentTarget.style.color = C.g800)}
              >
                {item.label}
              </Link>
            ))}
          </div>
        )}

        {/* ── RIGHT: Brand logos ── */}
        <Link
          to="/"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            textDecoration: "none",
            flexShrink: 0,
          }}
        >
          {/* EHAEGY logo */}
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: "50%",
              overflow: "hidden",
              flexShrink: 0,
              border: `1.5px solid ${C.g200}`,
            }}
          >
            <img
              src="/ehaegypt_logo.jpeg"
              alt="الهيئة العامة للرعاية الصحية"
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          </div>

          {/* Divider */}
          <div
            style={{
              width: 1,
              height: 28,
              background: C.g200,
              flexShrink: 0,
            }}
          />

          {/* E·OVR wordmark */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                background: C.navy,
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <span style={{ fontSize: 12, fontWeight: 800, color: "#fff", letterSpacing: "-0.03em" }}>
                E·OVR
              </span>
            </div>
            {!isMobile && (
              <span style={{ fontSize: 15, fontWeight: 800, color: C.navy }}>E·OVR</span>
            )}
          </div>
        </Link>

      </div>

      {/* ── Mobile nav row ── */}
      {isMobile && (
        <div
          style={{
            borderTop: `1px solid ${C.g200}`,
            padding: "8px 16px",
            display: "flex",
            gap: 16,
            overflowX: "auto",
            WebkitOverflowScrolling: "touch",
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
                fontSize: 13,
                whiteSpace: "nowrap",
              }}
            >
              {item.label}
            </Link>
          ))}
        </div>
      )}
    </nav>
  );
}