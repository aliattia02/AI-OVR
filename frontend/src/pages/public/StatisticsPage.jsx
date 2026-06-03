// frontend/src/pages/public/StatisticsPage.jsx
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

// Fake bar chart data for visual placeholder
const BAR_DATA = [
  { label: "يناير", value: 68, color: C.teal },
  { label: "فبراير", value: 52, color: C.teal },
  { label: "مارس", value: 80, color: C.teal },
  { label: "أبريل", value: 45, color: C.teal },
  { label: "مايو", value: 91, color: C.navy },
  { label: "يونيو", value: 73, color: C.teal },
];

const MAX_VAL = Math.max(...BAR_DATA.map((d) => d.value));

export default function StatisticsPage() {
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
              bottom: -100,
              right: -100,
              width: 400,
              height: 400,
              borderRadius: "50%",
              background: "radial-gradient(circle, rgba(11,125,107,0.15) 0%, transparent 70%)",
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
              <span
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  color: "#7FDDCA",
                  letterSpacing: "0.04em",
                }}
              >
                الإحصائيات
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
              البيانات تحكي قصة السلامة
            </h1>
            <p
              style={{
                margin: "0 0 28px",
                fontSize: 16,
                color: "rgba(255,255,255,0.65)",
                lineHeight: 1.75,
              }}
            >
              لوحة بيانات تفاعلية تُظهر اتجاهات الإبلاغ وفاعلية التدخلات الوقائية
              عبر الزمن.
            </p>
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

        {/* Preview chart */}
        <section style={{ background: "#fff", padding: "72px 28px" }}>
          <div style={{ maxWidth: 900, margin: "0 auto" }}>
            <div style={{ textAlign: "center", marginBottom: 40 }}>
              <h2
                style={{
                  margin: "0 0 10px",
                  fontSize: "clamp(22px, 3vw, 32px)",
                  fontWeight: 900,
                  color: C.navy,
                  letterSpacing: "-0.02em",
                  fontFamily: '"Georgia", serif',
                }}
              >
                معاينة: التقارير الشهرية
              </h2>
              <p
                style={{
                  margin: 0,
                  fontSize: 13,
                  color: C.g400,
                  fontStyle: "italic",
                }}
              >
                هذا نموذج للعرض — البيانات الفعلية ستظهر عند إطلاق الصفحة
              </p>
            </div>

            {/* Bar chart */}
            <div
              style={{
                background: C.ivory,
                borderRadius: 20,
                padding: "32px 28px",
                border: `1px solid ${C.g200}`,
                filter: "blur(1px)",
                opacity: 0.7,
                pointerEvents: "none",
                userSelect: "none",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "flex-end",
                  gap: 16,
                  height: 180,
                  borderBottom: `2px solid ${C.g200}`,
                  paddingBottom: 0,
                }}
              >
                {BAR_DATA.map((bar, i) => (
                  <div
                    key={i}
                    style={{
                      flex: 1,
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      gap: 6,
                    }}
                  >
                    <div
                      style={{
                        fontSize: 11,
                        fontWeight: 700,
                        color: bar.color,
                      }}
                    >
                      {bar.value}
                    </div>
                    <div
                      style={{
                        width: "100%",
                        height: `${(bar.value / MAX_VAL) * 140}px`,
                        background:
                          bar.color === C.navy
                            ? `linear-gradient(to top, ${C.navy}, ${C.navy}99)`
                            : `linear-gradient(to top, ${C.teal}, ${C.teal}88)`,
                        borderRadius: "6px 6px 0 0",
                        transition: "height 0.4s",
                      }}
                    />
                  </div>
                ))}
              </div>
              <div
                style={{
                  display: "flex",
                  gap: 16,
                  marginTop: 12,
                }}
              >
                {BAR_DATA.map((bar, i) => (
                  <div
                    key={i}
                    style={{
                      flex: 1,
                      textAlign: "center",
                      fontSize: 11,
                      color: C.g600,
                    }}
                  >
                    {bar.label}
                  </div>
                ))}
              </div>
            </div>

            <div
              style={{
                marginTop: 16,
                textAlign: "center",
                fontSize: 12,
                color: C.g400,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
              }}
            >
              <span>🔒</span>
              <span>البيانات مشفرة — لا تُكشف هوية أي مستشفى أو كادر صحي</span>
            </div>
          </div>
        </section>

        {/* Feature preview */}
        <section style={{ background: C.ivory, padding: "64px 28px" }}>
          <div style={{ maxWidth: 1000, margin: "0 auto" }}>
            <h2
              style={{
                textAlign: "center",
                margin: "0 0 40px",
                fontSize: "clamp(22px, 3vw, 32px)",
                fontWeight: 900,
                color: C.navy,
                letterSpacing: "-0.02em",
                fontFamily: '"Georgia", serif',
              }}
            >
              ما ستجده في لوحة الإحصائيات
            </h2>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                gap: 16,
              }}
            >
              {[
                {
                  icon: "📊",
                  title: "اتجاهات الإبلاغ",
                  desc: "رسوم بيانية تفاعلية للتقارير الشهرية والسنوية",
                },
                {
                  icon: "🗺️",
                  title: "الخريطة الجغرافية",
                  desc: "توزيع التقارير حسب المنطقة والمستشفى",
                },
                {
                  icon: "🏆",
                  title: "مؤشرات الأداء",
                  desc: "قياس مدى فاعلية التدخلات الوقائية المتخذة",
                },
                {
                  icon: "📉",
                  title: "معدلات التحسين",
                  desc: "مقارنة نسب الحوادث قبل وبعد التدخلات",
                },
              ].map((f, i) => (
                <div
                  key={i}
                  style={{
                    background: "#fff",
                    borderRadius: 14,
                    padding: "22px 18px",
                    border: `1px solid ${C.g200}`,
                    boxShadow: "0 2px 12px rgba(12,35,64,0.04)",
                  }}
                >
                  <div style={{ fontSize: 24, marginBottom: 10 }}>{f.icon}</div>
                  <div
                    style={{
                      fontSize: 14,
                      fontWeight: 700,
                      color: C.navy,
                      marginBottom: 6,
                    }}
                  >
                    {f.title}
                  </div>
                  <div style={{ fontSize: 12, color: C.g600, lineHeight: 1.6 }}>
                    {f.desc}
                  </div>
                </div>
              ))}
            </div>
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