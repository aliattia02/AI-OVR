// frontend/src/pages/public/StoryLibraryPage.jsx
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
  g800: "#1F2937",
};

const PREVIEW_STORIES = [
  {
    year: "1999",
    tag: "جراحة · أمريكا",
    title: "خطأ في الجانب الصحيح",
    excerpt:
      "جراح استأصل الرجل الخطأ — لا بسبب الإهمال، بل بسبب غياب بروتوكول التحقق. قصته أطلقت معيار «Time-Out» الجراحي المعمول به اليوم عالمياً.",
    tagColor: "#DC2626",
    tagBg: "#FEF2F2",
  },
  {
    year: "2009",
    tag: "دواء · الأردن",
    title: "جرعة مضاعفة في وحدة العناية",
    excerpt:
      "ممرضة أبلغت عن خطأ محتمل في جرعة هيبارين قبل وقوعه — لأن منصة الإبلاغ كانت آمنة وسهلة. تقريرها أنقذ ثلاثة مرضى في نفس الأسبوع.",
    tagColor: C.teal,
    tagBg: C.tealLight,
  },
  {
    year: "2015",
    tag: "مختبر · السعودية",
    title: "عينتان بنفس الاسم",
    excerpt:
      "طاقم المختبر اكتشف خطأ في تسمية العينات قبل إصدار النتيجة، وأبلغ فورياً. أدى التقرير إلى تحديث نظام الباركود في 12 مستشفى.",
    tagColor: "#7C3AED",
    tagBg: "#F5F3FF",
  },
  {
    year: "2021",
    tag: "تواصل · الإمارات",
    title: "أمر لفظي محمول بالخطأ",
    excerpt:
      "طبيب أعطى أمراً لفظياً أُسيء سماعه في بيئة مزدحمة. التقرير المُبلَّغ عنه أدى إلى اعتماد سياسة «اقرأ للخلف» في جميع أوامر الطوارئ.",
    tagColor: "#D97706",
    tagBg: "#FFFBEB",
  },
  {
    year: "2022",
    tag: "تقنية · مصر",
    title: "تنبيه نظام تجاهله الجميع",
    excerpt:
      "تنبيه تداخل الدواء ظهر في النظام 47 مرة خلال أسبوع دون أن ينتبه إليه أحد — حتى أبلغ صيدلاني شاب. الإبلاغ غيّر كيفية عرض التنبيهات.",
    tagColor: "#0C2340",
    tagBg: "#EFF6FF",
  },
  {
    year: "قريباً",
    tag: "قصتك",
    title: "كن جزءاً من التاريخ",
    excerpt:
      "كل تقرير تُقدّمه قد يُنقذ حياة في مستشفى لم تذهب إليه قط. قصتك تستحق أن تُحكى.",
    tagColor: C.teal,
    tagBg: C.tealLight,
    isCta: true,
  },
];

export default function StoryLibraryPage() {
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
              top: -100,
              right: -60,
              width: 380,
              height: 380,
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
              <span
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  color: "#7FDDCA",
                  letterSpacing: "0.04em",
                }}
              >
                مكتبة القصص
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
              قصص غيّرت الطب
            </h1>
            <p
              style={{
                margin: "0 0 28px",
                fontSize: 16,
                color: "rgba(255,255,255,0.65)",
                lineHeight: 1.75,
              }}
            >
              أرشيف حي من الحوادث التي أدت إلى تغييرات حقيقية في بروتوكولات
              السلامة حول العالم — لأن التاريخ يصنعه من يتكلمون.
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

        {/* Story cards preview */}
        <section style={{ background: C.ivory, padding: "72px 28px" }}>
          <div style={{ maxWidth: 1100, margin: "0 auto" }}>
            <div style={{ textAlign: "center", marginBottom: 48 }}>
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
                لمحة من المكتبة
              </h2>
              <p
                style={{
                  margin: 0,
                  fontSize: 14,
                  color: C.g400,
                  fontStyle: "italic",
                }}
              >
                نموذج أولي — القصص الكاملة ستُتاح عند الإطلاق
              </p>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
                gap: 20,
              }}
            >
              {PREVIEW_STORIES.map((s, i) => (
                <div
                  key={i}
                  style={{
                    background: s.isCta ? C.navy : "#fff",
                    borderRadius: 18,
                    padding: "26px 22px",
                    border: `1px solid ${s.isCta ? "transparent" : C.g200}`,
                    borderRight: s.isCta ? "none" : `4px solid ${C.teal}`,
                    boxShadow: "0 4px 20px rgba(12,35,64,0.06)",
                    display: "flex",
                    flexDirection: "column",
                    gap: 12,
                    filter: i >= 3 ? "blur(1.5px)" : "none",
                    opacity: i >= 3 && !s.isCta ? 0.65 : 1,
                    transition: "transform 0.2s, opacity 0.2s, filter 0.2s",
                    cursor: "default",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = "translateY(-3px)";
                    if (i >= 3 && !s.isCta) {
                      e.currentTarget.style.opacity = "1";
                      e.currentTarget.style.filter = "none";
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = "translateY(0)";
                    if (i >= 3 && !s.isCta) {
                      e.currentTarget.style.opacity = "0.65";
                      e.currentTarget.style.filter = "blur(1.5px)";
                    }
                  }}
                >
                  {/* Year + tag */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      flexWrap: "wrap",
                    }}
                  >
                    <span
                      style={{
                        fontSize: 12,
                        fontWeight: 700,
                        color: s.isCta ? "rgba(255,255,255,0.5)" : C.g400,
                      }}
                    >
                      {s.year}
                    </span>
                    <span
                      style={{
                        padding: "3px 10px",
                        borderRadius: 999,
                        background: s.isCta ? "rgba(11,125,107,0.25)" : s.tagBg,
                        color: s.isCta ? "#7FDDCA" : s.tagColor,
                        fontSize: 11,
                        fontWeight: 700,
                        border: s.isCta
                          ? "1px solid rgba(11,125,107,0.4)"
                          : `1px solid ${s.tagColor}25`,
                      }}
                    >
                      {s.tag}
                    </span>
                  </div>

                  {/* Title */}
                  <div
                    style={{
                      fontSize: 16,
                      fontWeight: 800,
                      color: s.isCta ? "#fff" : C.navy,
                      letterSpacing: "-0.01em",
                      lineHeight: 1.3,
                      fontFamily: '"Georgia", serif',
                    }}
                  >
                    {s.title}
                  </div>

                  {/* Excerpt */}
                  <p
                    style={{
                      margin: 0,
                      fontSize: 13,
                      lineHeight: 1.75,
                      color: s.isCta ? "rgba(255,255,255,0.65)" : C.g600,
                      flexGrow: 1,
                    }}
                  >
                    {s.excerpt}
                  </p>

                  {s.isCta && (
                    <a
                      href="/login"
                      style={{
                        display: "inline-block",
                        marginTop: 4,
                        padding: "9px 20px",
                        borderRadius: 999,
                        background: C.teal,
                        color: "#fff",
                        fontSize: 13,
                        fontWeight: 700,
                        textDecoration: "none",
                        textAlign: "center",
                        transition: "background 0.15s",
                      }}
                      onMouseEnter={(e) =>
                        (e.currentTarget.style.background = "#086B5B")
                      }
                      onMouseLeave={(e) =>
                        (e.currentTarget.style.background = C.teal)
                      }
                    >
                      ابدأ بإبلاغك الأول ←
                    </a>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Quote bar */}
        <section
          style={{
            background: C.tealLight,
            padding: "48px 28px",
            textAlign: "center",
            borderTop: `1px solid ${C.teal}20`,
          }}
        >
          <div style={{ maxWidth: 640, margin: "0 auto" }}>
            <div
              style={{
                fontSize: 32,
                color: `${C.teal}50`,
                fontFamily: "Georgia, serif",
                marginBottom: 8,
              }}
            >
              ❝
            </div>
            <p
              style={{
                margin: "0 0 12px",
                fontSize: "clamp(16px, 2.5vw, 22px)",
                fontWeight: 700,
                color: C.navy,
                lineHeight: 1.5,
                fontFamily: '"Georgia", serif',
                fontStyle: "italic",
              }}
            >
              لا يُفيد التاريخ من لم يقرأه — ولا يُفيد الخطأ الطبي من لم يُبلَّغ عنه.
            </p>
            <p style={{ margin: 0, fontSize: 13, color: C.g600 }}>
              — مكتبة قصص E·OVR
            </p>
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