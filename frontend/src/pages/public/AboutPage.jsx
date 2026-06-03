// frontend/src/pages/public/AboutPage.jsx
import { useEffect } from "react";
import PublicNavbar from "../../components/public/PublicNavbar";
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

const VALUES = [
  {
    icon: "🛡️",
    title: "السلامة أولاً",
    desc: "كل قرار نتخذه يُقاس بأثره على سلامة المرضى والكوادر الصحية.",
  },
  {
    icon: "🔍",
    title: "الشفافية الكاملة",
    desc: "الإبلاغ الصادق هو الطريق الوحيد لفهم ما يحدث فعلاً داخل المنظومة.",
  },
  {
    icon: "💡",
    title: "التعلم المستمر",
    desc: "كل حادثة مُبلَّغ عنها هي درس يحمي من يأتون بعده.",
  },
  {
    icon: "🤝",
    title: "لا لوم، بل تحسين",
    desc: "منصتنا تفصل بين المساءلة الفردية وتحسين الأنظمة — فالخطأ غالباً في النظام.",
  },
];

const HOW_IT_WORKS = [
  {
    step: "01",
    title: "سجّل الحادثة",
    desc: "أدخل تفاصيل الحادثة عبر نموذج مُصمَّم بعناية لاستيعاب كل السياقات السريرية.",
  },
  {
    step: "02",
    title: "تحليل آمن",
    desc: "تُحلَّل البيانات بسرية تامة — هويتك محمية وفق أعلى معايير الخصوصية.",
  },
  {
    step: "03",
    title: "استجابة فورية",
    desc: "يتلقى المسؤولون تنبيهاً فورياً ويُشكَّل فريق متابعة خلال ساعات.",
  },
  {
    step: "04",
    title: "إجراء وقائي",
    desc: "يُترجَم التقرير إلى إجراءات ملموسة تمنع تكرار الحادثة في المستقبل.",
  },
];

export default function AboutPage() {
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
        {/* ── Hero ── */}
        <section
          style={{
            background: C.navy,
            padding: "80px 28px 72px",
            textAlign: "center",
            position: "relative",
            overflow: "hidden",
          }}
        >
          <div
            aria-hidden
            style={{
              position: "absolute",
              top: -100,
              right: -100,
              width: 400,
              height: 400,
              borderRadius: "50%",
              background: "radial-gradient(circle, rgba(11,125,107,0.15) 0%, transparent 70%)",
              pointerEvents: "none",
            }}
          />
          <div style={{ maxWidth: 680, margin: "0 auto", position: "relative" }}>
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                padding: "6px 16px",
                borderRadius: 999,
                background: "rgba(11,125,107,0.2)",
                border: "1px solid rgba(11,125,107,0.4)",
                marginBottom: 24,
              }}
            >
              <span style={{ fontSize: 13, fontWeight: 600, color: "#7FDDCA", letterSpacing: "0.04em" }}>
                عن المنصة
              </span>
            </div>
            <h1
              style={{
                margin: "0 0 20px",
                fontSize: "clamp(32px, 5vw, 52px)",
                fontWeight: 900,
                color: "#fff",
                letterSpacing: "-0.025em",
                fontFamily: '"Georgia", "Times New Roman", serif',
                lineHeight: 1.1,
              }}
            >
              نؤمن أن كل خطأ يمكن
              <br />
              <span style={{ color: "#7FDDCA" }}>أن يُنقذ حياة</span>
            </h1>
            <p
              style={{
                margin: 0,
                fontSize: 16,
                lineHeight: 1.8,
                color: "rgba(255,255,255,0.7)",
                maxWidth: 560,
                marginInline: "auto",
              }}
            >
              E·OVR ليست مجرد منصة لتوثيق الأخطاء — إنها حركة لتحويل ثقافة الخوف
              إلى ثقافة التعلم، ومن اللوم إلى التحسين المستمر.
            </p>
          </div>
        </section>

        {/* ── Mission & Vision ── */}
        <section
          style={{
            background: "#fff",
            padding: "72px 28px",
          }}
        >
          <div
            style={{
              maxWidth: 1100,
              margin: "0 auto",
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
              gap: 32,
            }}
          >
            {[
              {
                icon: "🎯",
                label: "رسالتنا",
                title: "تمكين ثقافة الإبلاغ الآمن",
                text: "نوفر بيئة موثوقة وسرية تُمكّن الكوادر الصحية من الإبلاغ دون خوف من العواقب، بهدف تحسين جودة الرعاية وسلامة المرضى.",
                bg: C.tealLight,
                border: C.teal,
              },
              {
                icon: "🌟",
                label: "رؤيتنا",
                title: "منظومة صحية خالية من الأخطاء القابلة للوقاية",
                text: "نطمح إلى يوم لا يتكرر فيه خطأ وقع في مكان آخر — لأن كل تقرير أُبلّغ عنه في مستشفى ينقذ مريضاً في مستشفى آخر.",
                bg: "#F0F4FF",
                border: "#3B82F6",
              },
            ].map((item, i) => (
              <div
                key={i}
                style={{
                  background: item.bg,
                  border: `1px solid ${item.border}25`,
                  borderTop: `4px solid ${item.border}`,
                  borderRadius: 18,
                  padding: "32px 28px",
                }}
              >
                <div style={{ fontSize: 32, marginBottom: 12 }}>{item.icon}</div>
                <div
                  style={{
                    fontSize: 12,
                    fontWeight: 700,
                    color: item.border,
                    letterSpacing: "0.08em",
                    marginBottom: 8,
                  }}
                >
                  {item.label}
                </div>
                <div
                  style={{
                    fontSize: 20,
                    fontWeight: 800,
                    color: C.navy,
                    marginBottom: 12,
                    letterSpacing: "-0.02em",
                    lineHeight: 1.3,
                  }}
                >
                  {item.title}
                </div>
                <p
                  style={{
                    margin: 0,
                    fontSize: 14,
                    lineHeight: 1.8,
                    color: C.g600,
                  }}
                >
                  {item.text}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* ── How It Works ── */}
        <section
          style={{
            background: C.ivory,
            padding: "80px 28px",
          }}
        >
          <div style={{ maxWidth: 1100, margin: "0 auto" }}>
            <div style={{ textAlign: "center", marginBottom: 52 }}>
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 10,
                  marginBottom: 14,
                }}
              >
                <div style={{ width: 28, height: 2, background: C.teal, borderRadius: 2 }} />
                <span
                  style={{
                    fontSize: 13,
                    fontWeight: 700,
                    color: C.teal,
                    letterSpacing: "0.08em",
                  }}
                >
                  آلية العمل
                </span>
                <div style={{ width: 28, height: 2, background: C.teal, borderRadius: 2 }} />
              </div>
              <h2
                style={{
                  margin: 0,
                  fontSize: "clamp(26px, 4vw, 38px)",
                  fontWeight: 900,
                  color: C.navy,
                  letterSpacing: "-0.02em",
                  fontFamily: '"Georgia", serif',
                }}
              >
                من الحادثة إلى التحسين
              </h2>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                gap: 20,
              }}
            >
              {HOW_IT_WORKS.map((step, i) => (
                <div
                  key={i}
                  style={{
                    background: "#fff",
                    borderRadius: 16,
                    padding: "28px 24px",
                    border: `1px solid ${C.g200}`,
                    boxShadow: "0 4px 20px rgba(12,35,64,0.05)",
                    position: "relative",
                    overflow: "hidden",
                  }}
                >
                  <div
                    aria-hidden
                    style={{
                      position: "absolute",
                      top: 12,
                      left: 16,
                      fontSize: 56,
                      fontWeight: 900,
                      color: `${C.navy}05`,
                      fontFamily: "Georgia, serif",
                      lineHeight: 1,
                      pointerEvents: "none",
                    }}
                  >
                    {step.step}
                  </div>
                  <div
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 10,
                      background: C.tealLight,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      marginBottom: 14,
                    }}
                  >
                    <span
                      style={{
                        fontSize: 13,
                        fontWeight: 900,
                        color: C.teal,
                        letterSpacing: "-0.02em",
                      }}
                    >
                      {step.step}
                    </span>
                  </div>
                  <div
                    style={{
                      fontSize: 16,
                      fontWeight: 700,
                      color: C.navy,
                      marginBottom: 8,
                      letterSpacing: "-0.01em",
                    }}
                  >
                    {step.title}
                  </div>
                  <p
                    style={{
                      margin: 0,
                      fontSize: 13,
                      lineHeight: 1.75,
                      color: C.g600,
                    }}
                  >
                    {step.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Values ── */}
        <section
          style={{
            background: "#fff",
            padding: "80px 28px",
          }}
        >
          <div style={{ maxWidth: 1100, margin: "0 auto" }}>
            <div style={{ textAlign: "center", marginBottom: 52 }}>
              <h2
                style={{
                  margin: 0,
                  fontSize: "clamp(26px, 4vw, 38px)",
                  fontWeight: 900,
                  color: C.navy,
                  letterSpacing: "-0.02em",
                  fontFamily: '"Georgia", serif',
                }}
              >
                قيمنا
              </h2>
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
                gap: 20,
              }}
            >
              {VALUES.map((v, i) => (
                <div
                  key={i}
                  style={{
                    padding: "28px 24px",
                    borderRadius: 16,
                    background: C.ivory,
                    border: `1px solid ${C.g200}`,
                    transition: "transform 0.2s, box-shadow 0.2s",
                    cursor: "default",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = "translateY(-3px)";
                    e.currentTarget.style.boxShadow = "0 8px 28px rgba(12,35,64,0.08)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = "translateY(0)";
                    e.currentTarget.style.boxShadow = "none";
                  }}
                >
                  <div style={{ fontSize: 28, marginBottom: 14 }}>{v.icon}</div>
                  <div
                    style={{
                      fontSize: 16,
                      fontWeight: 700,
                      color: C.navy,
                      marginBottom: 8,
                    }}
                  >
                    {v.title}
                  </div>
                  <p
                    style={{
                      margin: 0,
                      fontSize: 13,
                      lineHeight: 1.75,
                      color: C.g600,
                    }}
                  >
                    {v.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── CTA Banner ── */}
        <section
          style={{
            background: C.navy,
            padding: "64px 28px",
            textAlign: "center",
          }}
        >
          <div style={{ maxWidth: 600, margin: "0 auto" }}>
            <h2
              style={{
                margin: "0 0 16px",
                fontSize: "clamp(24px, 3.5vw, 36px)",
                fontWeight: 900,
                color: "#fff",
                letterSpacing: "-0.02em",
                fontFamily: '"Georgia", serif',
              }}
            >
              جاهز للمشاركة؟
            </h2>
            <p
              style={{
                margin: "0 0 28px",
                fontSize: 15,
                color: "rgba(255,255,255,0.65)",
                lineHeight: 1.7,
              }}
            >
              انضم إلى آلاف المختصين الصحيين الذين يصنعون فرقاً حقيقياً من خلال
              الإبلاغ الآمن والمسؤول.
            </p>
            <a
              href="/login"
              style={{
                display: "inline-block",
                padding: "13px 32px",
                borderRadius: 999,
                background: C.teal,
                color: "#fff",
                fontSize: 15,
                fontWeight: 700,
                textDecoration: "none",
                letterSpacing: "0.01em",
                transition: "background 0.15s",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "#086B5B")}
              onMouseLeave={(e) => (e.currentTarget.style.background = C.teal)}
            >
              ابدأ الإبلاغ الآن ←
            </a>
          </div>
        </section>
      </main>

      <FooterSection />
    </div>
  );
}