// frontend/src/pages/public/IncidentReportsPage.jsx
import { useEffect } from "react";
import PublicNavbar from "../../components/public/PublicNavbar";
import FooterSection from "../../components/public/FooterSection";

const C = {
  navy: "#0C2340",
  teal: "#0B7D6B",
  tealLight: "#E0F5F1",
  ivory: "#F5F7FA",
  g200: "#E5E7EB",
  g400: "#9CA3AF",
  g600: "#4B5563",
};

const INCIDENT_CATEGORIES = [
  { icon: "💊", label: "أخطاء الدواء", count: "412" },
  { icon: "🔪", label: "أخطاء جراحية", count: "189" },
  { icon: "🩺", label: "أخطاء التشخيص", count: "276" },
  { icon: "🏥", label: "سقوط المرضى", count: "203" },
  { icon: "🧪", label: "أخطاء المختبر", count: "167" },
  { icon: "⚕️", label: "عدوى المستشفى", count: "94" },
];

export default function IncidentReportsPage() {
  useEffect(() => {
    document.documentElement.dir = "rtl";
    document.documentElement.lang = "ar";
    return () => {
      document.documentElement.dir = "ltr";
      document.documentElement.lang = "en";
    };
  }, []);

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
        {/* Hero */}
        <section
          style={{
            background: C.navy,
            padding: "72px 28px",
            textAlign: "center",
            position: "relative",
            overflow: "hidden",
          }}
        >
          <div
            aria-hidden
            style={{
              position: "absolute",
              top: -80,
              left: -80,
              width: 350,
              height: 350,
              borderRadius: "50%",
              background: "radial-gradient(circle, rgba(11,125,107,0.18) 0%, transparent 70%)",
              pointerEvents: "none",
            }}
          />
          <div style={{ maxWidth: 640, margin: "0 auto", position: "relative" }}>
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                padding: "5px 14px",
                borderRadius: 999,
                background: "rgba(11,125,107,0.2)",
                border: "1px solid rgba(11,125,107,0.4)",
                marginBottom: 20,
              }}
            >
              <span style={{ fontSize: 12, fontWeight: 700, color: "#7FDDCA", letterSpacing: "0.04em" }}>
                تقارير الحوادث
              </span>
            </div>
            <h1
              style={{
                margin: "0 0 16px",
                fontSize: "clamp(30px, 5vw, 48px)",
                fontWeight: 900,
                color: "#fff",
                letterSpacing: "-0.025em",
                fontFamily: '"Georgia", serif',
                lineHeight: 1.15,
              }}
            >
              سجل شفاف لأحداث سلامة المرضى
            </h1>
            <p
              style={{
                margin: "0 0 28px",
                fontSize: 16,
                color: "rgba(255,255,255,0.65)",
                lineHeight: 1.75,
              }}
            >
              هذه الصفحة ستعرض قريباً ملخصاً تفاعلياً للحوادث المُبلَّغ عنها مع
              الحفاظ على الخصوصية التامة.
            </p>

            {/* Coming soon badge */}
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                padding: "10px 22px",
                borderRadius: 999,
                background: "rgba(255,255,255,0.08)",
                border: "1px solid rgba(255,255,255,0.2)",
                fontSize: 14,
                color: "rgba(255,255,255,0.8)",
                fontWeight: 600,
              }}
            >
              <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  background: "#F59E0B",
                  flexShrink: 0,
                  animation: "pulse-dot 1.5s ease-in-out infinite",
                }}
              />
              قريباً — تحت التطوير
            </div>
          </div>
        </section>

        {/* What's coming */}
        <section style={{ background: "#fff", padding: "72px 28px" }}>
          <div style={{ maxWidth: 1100, margin: "0 auto" }}>
            <div style={{ textAlign: "center", marginBottom: 48 }}>
              <h2
                style={{
                  margin: "0 0 10px",
                  fontSize: "clamp(24px, 3.5vw, 36px)",
                  fontWeight: 900,
                  color: C.navy,
                  letterSpacing: "-0.02em",
                  fontFamily: '"Georgia", serif',
                }}
              >
                ما ستجده هنا
              </h2>
              <p style={{ margin: 0, fontSize: 15, color: C.g600, lineHeight: 1.6 }}>
                توزيع الحوادث المُبلَّغ عنها حسب الفئة — بلا أسماء، بلا لوم
              </p>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                gap: 16,
              }}
            >
              {INCIDENT_CATEGORIES.map((cat, i) => (
                <div
                  key={i}
                  style={{
                    background: C.ivory,
                    borderRadius: 16,
                    padding: "24px 20px",
                    border: `1px solid ${C.g200}`,
                    textAlign: "center",
                    transition: "transform 0.2s",
                    cursor: "default",
                    filter: "blur(0.5px)",
                    opacity: 0.75,
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = "translateY(-2px)";
                    e.currentTarget.style.opacity = "1";
                    e.currentTarget.style.filter = "none";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = "translateY(0)";
                    e.currentTarget.style.opacity = "0.75";
                    e.currentTarget.style.filter = "blur(0.5px)";
                  }}
                >
                  <div style={{ fontSize: 28, marginBottom: 8 }}>{cat.icon}</div>
                  <div
                    style={{
                      fontSize: 26,
                      fontWeight: 900,
                      color: C.navy,
                      letterSpacing: "-0.02em",
                      fontFamily: '"Georgia", serif',
                      marginBottom: 4,
                    }}
                  >
                    {cat.count}
                  </div>
                  <div style={{ fontSize: 12, color: C.g600, fontWeight: 500 }}>
                    {cat.label}
                  </div>
                </div>
              ))}
            </div>

            <p
              style={{
                textAlign: "center",
                marginTop: 24,
                fontSize: 12,
                color: C.g400,
                fontStyle: "italic",
              }}
            >
              * الأرقام المعروضة تقريبية — الصفحة قيد التطوير
            </p>
          </div>
        </section>

        {/* Principles strip */}
        <section
          style={{
            background: C.tealLight,
            padding: "48px 28px",
            borderTop: `1px solid ${C.teal}20`,
            borderBottom: `1px solid ${C.teal}20`,
          }}
        >
          <div
            style={{
              maxWidth: 900,
              margin: "0 auto",
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
              gap: 24,
              textAlign: "center",
            }}
          >
            {[
              { icon: "🔒", title: "سرية تامة", desc: "لا تُكشف هوية المُبلِّغ أبداً" },
              { icon: "⚡", title: "استجابة سريعة", desc: "متابعة خلال 24 ساعة" },
              { icon: "📊", title: "بيانات قابلة للتحليل", desc: "لتحديد الأنماط ومنع التكرار" },
            ].map((p, i) => (
              <div key={i}>
                <div style={{ fontSize: 28, marginBottom: 8 }}>{p.icon}</div>
                <div
                  style={{
                    fontSize: 15,
                    fontWeight: 700,
                    color: C.navy,
                    marginBottom: 4,
                  }}
                >
                  {p.title}
                </div>
                <div style={{ fontSize: 13, color: C.g600 }}>{p.desc}</div>
              </div>
            ))}
          </div>
        </section>
      </main>

      <FooterSection />

      <style>{`
        @keyframes pulse-dot {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(0.85); }
        }
      `}</style>
    </div>
  );
}