// frontend/src/pages/public/StoryLibraryPage.jsx
import { useEffect, useRef, useState } from "react";
import PublicNavbar from "../../components/public/PublicNavbar";
import FooterSection from "../../components/public/FooterSection";

/* ─── Design tokens ─────────────────────────────────────────────────── */
const C = {
  navy:      "#0C2340",
  navyDeep:  "#071829",
  teal:      "#0B7D6B",
  tealMid:   "#0E9B85",
  tealLight: "#E0F5F1",
  ivory:     "#F5F7FA",
  g100:      "#F3F4F6",
  g200:      "#E5E7EB",
  g400:      "#9CA3AF",
  g600:      "#4B5563",
  g800:      "#1F2937",
};

/* ─── Story data ─────────────────────────────────────────────────────── */
const STORIES = [
  {
    id: "betsy",
    year: "1994",
    country: "أمريكا",
    domain: "دواء",
    tagColor: "#B91C1C",
    tagBg:    "#FEF2F2",
    name:     "بيتسي ليمان",
    title:    "جرعة العلاج الكيماوي القاتلة",
    photo:    "/stories/betsy-lehman.jpg",
    /* initials shown when photo missing */
    initials: "BL",
    initialsColor: "#7C2D12",
    initialsBg:    "#FED7AA",
    impact:   "أدى وفاتها إلى تغيير جذري في أنظمة التحقق الدوائي في مستشفى دانا-فاربر وعلى مستوى الولاية بأكملها.",
    excerpt:
      "كانت بيتسي ليمان صحفية طبية متخصصة تعمل لصالح صحيفة بوسطن غلوب — وكانت تعلم أكثر من غيرها عن أخطاء الطب. لكن في عام 1994، تلقّت جرعة من عقار سيكلوفوسفاميد أعلى من المعتاد بأربعة أضعاف خلال دورة علاج كيماوي لسرطان الثدي. لم يُبلِّغ أحد. توفيت وهي في الثامنة والثلاثين. كشف التحقيق لاحقاً أن نظام الأوامر الدوائية لم يتضمن أي آلية تنبيه للجرعات الاستثنائية.",
    legacy:  "قانون «بيتسي ليمان» في ماساتشوستس — إلزامي للإبلاغ عن الأخطاء الطبية",
  },
  {
    id: "emily",
    year: "2006",
    country: "أمريكا",
    domain: "صيدلة",
    tagColor: "#0F766E",
    tagBg:    "#F0FDFA",
    name:     "إميلي جيري",
    title:    "خطأ في تحضير محلول وريدي",
    photo:    "/stories/emily-jerry.jpg",
    initials: "EJ",
    initialsColor: "#064E3B",
    initialsBg:    "#A7F3D0",
    impact:   "دفع والدها كريستوفر جيري إلى تأسيس «مؤسسة إميلي جيري» وسنّ قانون فيدرالي لاعتماد الصيادلة.",
    excerpt:
      "كانت إميلي في الثانية من عمرها حين أُدخلت مستشفى كليفلاند لإتمام علاج سرطان الدم — وكانت على أعتاب الشفاء التام. لكن صيدلانياً مبتدئاً حضّر محلول الملح الوريدي بتركيز سكر مرتفع بشكل خاطئ. لم يراجعه أحد. توفيت إميلي بعد ساعات من الجرعة الأولى. التحقيق كشف أن المستشفى لم يكن يُطبِّق بروتوكول المراجعة المزدوجة للمحاليل الوريدية.",
    legacy:  "قانون «إميلي جيري» — يُلزم بمراجعة مزدوجة لجميع المحاليل الوريدية في أوهايو",
  },
  {
    id: "willie",
    year: "1995",
    country: "أمريكا",
    domain: "جراحة",
    tagColor: "#7C3AED",
    tagBg:    "#F5F3FF",
    name:     "ويلي كينغ",
    title:    "استئصال الطرف الخطأ",
    photo:    "/stories/willie-king.jpg",
    initials: "WK",
    initialsColor: "#4C1D95",
    initialsBg:    "#DDD6FE",
    impact:   "أطلق معيار «Time-Out» الجراحي المعتمد اليوم دولياً من قِبَل منظمة الصحة العالمية.",
    excerpt:
      "في فلوريدا عام 1995، دخل ويلي كينغ غرفة العمليات لاستئصال ساقه اليسرى المريضة. استئصل الجراح الساق اليمنى السليمة. لم يكن خطأ في المهارة — بل في غياب بروتوكول التحقق من الموقع. ورقة العملية كانت تحتوي على تناقضات واضحة. لكن لم يوقف أحد العملية ليتحقق. بعد الحادثة، وضعت لجان السلامة نظام «إيقاف مؤقت» يجمع الفريق الجراحي كاملاً قبل أي شق.",
    legacy:  "بروتوكول WHO «Surgical Safety Checklist» المُطبَّق في 150 دولة",
  },
  {
    id: "jordan",
    year: "2009",
    country: "الأردن",
    domain: "تمريض",
    tagColor: C.teal,
    tagBg:    C.tealLight,
    name:     "ممرضة مجهولة الاسم",
    title:    "جرعة هيبارين أُوقفت في اللحظة الأخيرة",
    photo:    null,
    initials: "؟",
    initialsColor: "#065F46",
    initialsBg:    "#D1FAE5",
    impact:   "أسهم تقريرها في تغيير إجراءات التحقق من جرعة مضادات التخثر في ثلاثة مستشفيات.",
    excerpt:
      "أثناء جولة ليلية في وحدة العناية المركزة، لاحظت ممرضة تناقضاً بين الجرعة المدوّنة وعبوة الهيبارين المُعدَّة للمريض. كان بإمكانها أن تصمت خشية إزعاج الطبيب. بدلاً من ذلك، ملأت نموذج الإبلاغ الأمني في الدقيقة نفسها. أنقذ تقريرها ثلاثة مرضى في الأسبوع ذاته من جرعة مُضاعَفة غير مقصودة.",
    legacy:  "بروتوكول مراجعة مزدوجة للهيبارين في المستشفيات الثلاثة",
  },
  {
    id: "egypt",
    year: "2022",
    country: "مصر",
    domain: "صيدلة سريرية",
    tagColor: "#B45309",
    tagBg:    "#FFFBEB",
    name:     "صيدلاني سريري شاب",
    title:    "تنبيه نظامي تجاهله الجميع",
    photo:    null,
    initials: "ص",
    initialsColor: "#78350F",
    initialsBg:    "#FDE68A",
    impact:   "أدى تقريره إلى إعادة تصميم واجهة تنبيهات التداخل الدوائي في المنظومة بأكملها.",
    excerpt:
      "ظهر تحذير تداخل دوائي في نظام المستشفى 47 مرة خلال أسبوع واحد — وكان الجميع يُغلقه بنقرة دون قراءة. صيدلاني أمضى ليلة كاملة يوثّق الحالات ويُقدّم تقريراً مفصلاً. كشف تحليله أن التصميم كان يُخلط بين التحذيرات الحرجة والتنبيهات الروتينية في نافذة واحدة. تغيير التصميم أدى إلى تراجع تجاهل التنبيهات بنسبة 73٪.",
    legacy:  "إعادة تصميم طبقة التنبيهات في النظام وفق مبدأ «الإجهاد الصفري»",
  },
  {
    id: "cta",
    isCta: true,
    year:  "قصتك القادمة",
    title: "كل تقرير هو قصه",
    excerpt:
      "كل واحدة من هذه القصص بدأت بشخص واحد رفض الصمت. قصتك — مهما بدت صغيرة — قد تكون البذرة التي تحمي مئات بعدك.",
  },
];

/* ─── Scroll-reveal hook ─────────────────────────────────────────────── */
function useReveal(threshold = 0.15) {
  const ref  = useRef(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!ref.current) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); obs.disconnect(); } },
      { threshold }
    );
    obs.observe(ref.current);
    return () => obs.disconnect();
  }, [threshold]);

  return [ref, visible];
}

/* ─── Avatar component ───────────────────────────────────────────────── */
function PersonAvatar({ story }) {
  const [imgFailed, setImgFailed] = useState(false);
  const showImg = story.photo && !imgFailed;

  return (
    <div
      style={{
        width: "100%",
        height: 200,
        borderRadius: "14px 14px 0 0",
        overflow: "hidden",
        position: "relative",
        background: showImg ? "#000" : story.initialsBg,
        flexShrink: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {showImg ? (
        <img
          src={story.photo}
          alt={story.name}
          onError={() => setImgFailed(true)}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            objectPosition: "top center",
            transition: "transform 0.6s ease",
          }}
        />
      ) : (
        <span
          style={{
            fontSize: 52,
            fontWeight: 900,
            color: story.initialsColor,
            fontFamily: "Georgia, serif",
            userSelect: "none",
          }}
        >
          {story.initials}
        </span>
      )}

      {/* Year badge */}
      <div
        style={{
          position: "absolute",
          top: 12,
          right: 12,
          padding: "3px 10px",
          borderRadius: 999,
          background: "rgba(0,0,0,0.55)",
          backdropFilter: "blur(4px)",
          fontSize: 11,
          fontWeight: 700,
          color: "#fff",
          letterSpacing: "0.05em",
        }}
      >
        {story.year}
      </div>

      {/* Domain badge */}
      <div
        style={{
          position: "absolute",
          bottom: 12,
          right: 12,
          padding: "3px 10px",
          borderRadius: 999,
          background: story.tagBg,
          color: story.tagColor,
          fontSize: 11,
          fontWeight: 700,
          border: `1px solid ${story.tagColor}30`,
        }}
      >
        {story.domain} · {story.country}
      </div>
    </div>
  );
}

/* ─── Individual Story Card ──────────────────────────────────────────── */
function StoryCard({ story, index }) {
  const [ref, visible] = useReveal(0.1);
  const [expanded, setExpanded] = useState(false);

  const delay = `${(index % 3) * 80}ms`;

  return (
    <div
      ref={ref}
      style={{
        background: "#fff",
        borderRadius: 18,
        border: `1px solid ${C.g200}`,
        boxShadow: "0 4px 24px rgba(12,35,64,0.06)",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        transform: visible ? "translateY(0)" : "translateY(32px)",
        opacity: visible ? 1 : 0,
        transition: `transform 0.6s ease ${delay}, opacity 0.6s ease ${delay}`,
        cursor: "default",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.boxShadow = "0 12px 40px rgba(12,35,64,0.13)";
        e.currentTarget.style.transform = "translateY(-4px)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.boxShadow = "0 4px 24px rgba(12,35,64,0.06)";
        e.currentTarget.style.transform = "translateY(0)";
      }}
    >
      <PersonAvatar story={story} />

      <div style={{ padding: "22px 20px", display: "flex", flexDirection: "column", gap: 10, flex: 1 }}>
        {/* Name */}
        <div
          style={{
            fontSize: 11,
            fontWeight: 700,
            color: C.teal,
            letterSpacing: "0.06em",
          }}
        >
          {story.name}
        </div>

        {/* Title */}
        <div
          style={{
            fontSize: 16,
            fontWeight: 800,
            color: C.navy,
            lineHeight: 1.35,
            letterSpacing: "-0.01em",
            fontFamily: "Georgia, serif",
          }}
        >
          {story.title}
        </div>

        {/* Excerpt */}
        <p
          style={{
            margin: 0,
            fontSize: 13,
            lineHeight: 1.8,
            color: C.g600,
            flex: 1,
            overflow: "hidden",
            display: "-webkit-box",
            WebkitLineClamp: expanded ? "unset" : 4,
            WebkitBoxOrient: "vertical",
            transition: "all 0.3s ease",
          }}
        >
          {story.excerpt}
        </p>

        <button
          onClick={() => setExpanded((v) => !v)}
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            color: C.teal,
            fontSize: 12,
            fontWeight: 700,
            padding: 0,
            textAlign: "right",
            letterSpacing: "0.01em",
          }}
        >
          {expanded ? "أقل ↑" : "اقرأ أكثر ↓"}
        </button>

        {/* Impact strip */}
        <div
          style={{
            borderTop: `1px solid ${C.g200}`,
            paddingTop: 12,
            marginTop: 4,
            display: "flex",
            gap: 8,
            alignItems: "flex-start",
          }}
        >
          <span style={{ fontSize: 16, flexShrink: 0 }}>⚡</span>
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, color: C.g400, letterSpacing: "0.05em", marginBottom: 2 }}>
              ما أهمية هذا التقرير؟
            </div>
            <div style={{ fontSize: 12, color: C.g600, lineHeight: 1.6 }}>
              {story.impact}
            </div>
          </div>
        </div>

        {/* Legacy pill */}
        <div
          style={{
            background: C.tealLight,
            borderRadius: 8,
            padding: "8px 12px",
            fontSize: 11,
            color: C.teal,
            lineHeight: 1.5,
            fontWeight: 500,
          }}
        >
          <span style={{ display: "block", fontSize: 10, fontWeight: 700, color: C.teal, opacity: 0.7, marginBottom: 3, letterSpacing: "0.05em" }}>
            ماذا تغيّر؟
          </span>
          🏛 {story.legacy}
        </div>
      </div>
    </div>
  );
}

/* ─── CTA Card ───────────────────────────────────────────────────────── */
function CtaCard({ story, index }) {
  const [ref, visible] = useReveal(0.1);

  return (
    <div
      ref={ref}
      style={{
        background: C.navy,
        borderRadius: 18,
        border: "1px solid transparent",
        padding: "36px 28px",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        gap: 16,
        minHeight: 340,
        transform: visible ? "translateY(0)" : "translateY(32px)",
        opacity: visible ? 1 : 0,
        transition: `transform 0.6s ease ${(index % 3) * 80}ms, opacity 0.6s ease ${(index % 3) * 80}ms`,
      }}
    >
      <div
        style={{
          fontSize: 11,
          fontWeight: 700,
          color: "#7FDDCA",
          letterSpacing: "0.08em",
        }}
      >
        {story.year}
      </div>
      <div
        style={{
          fontSize: 22,
          fontWeight: 900,
          color: "#fff",
          lineHeight: 1.3,
          fontFamily: "Georgia, serif",
          letterSpacing: "-0.02em",
        }}
      >
        {story.title}
      </div>
      <p
        style={{
          margin: 0,
          fontSize: 14,
          color: "rgba(255,255,255,0.65)",
          lineHeight: 1.8,
        }}
      >
        {story.excerpt}
      </p>
      <a
        href="/login"
        style={{
          display: "inline-block",
          marginTop: 8,
          padding: "11px 24px",
          borderRadius: 999,
          background: C.teal,
          color: "#fff",
          fontSize: 13,
          fontWeight: 700,
          textDecoration: "none",
          textAlign: "center",
          transition: "background 0.15s, transform 0.15s",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = "#0E9B85";
          e.currentTarget.style.transform = "scale(1.02)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = C.teal;
          e.currentTarget.style.transform = "scale(1)";
        }}
      >
        ابدأ بإبلاغك الأول ←
      </a>
    </div>
  );
}

/* ─── Timeline counter ───────────────────────────────────────────────── */
function AnimatedStat({ value, label, delay = "0ms" }) {
  const [ref, visible] = useReveal(0.2);
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!visible) return;
    let start = 0;
    const end = parseInt(value.replace(/\D/g, ""), 10) || 0;
    const suffix = value.replace(/[0-9]/g, "");
    const step = Math.ceil(end / 50);
    const timer = setInterval(() => {
      start += step;
      if (start >= end) { setCount(end); clearInterval(timer); }
      else setCount(start);
    }, 20);
    return () => clearInterval(timer);
  }, [visible, value]);

  const suffix = value.replace(/[0-9]/g, "");

  return (
    <div
      ref={ref}
      style={{
        textAlign: "center",
        transform: visible ? "translateY(0)" : "translateY(20px)",
        opacity: visible ? 1 : 0,
        transition: `transform 0.5s ease ${delay}, opacity 0.5s ease ${delay}`,
      }}
    >
      <div
        style={{
          fontSize: "clamp(36px, 5vw, 52px)",
          fontWeight: 900,
          color: "#fff",
          lineHeight: 1,
          fontFamily: "Georgia, serif",
          letterSpacing: "-0.03em",
        }}
      >
        {count.toLocaleString("ar-EG")}{suffix}
      </div>
      <div style={{ fontSize: 13, color: "rgba(255,255,255,0.55)", marginTop: 8, fontWeight: 500 }}>
        {label}
      </div>
    </div>
  );
}

/* ─── Main page ──────────────────────────────────────────────────────── */
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

        {/* ── HERO ──────────────────────────────────────────────────── */}
        <section
          style={{
            background: C.navyDeep,
            padding: "88px 28px 80px",
            textAlign: "center",
            position: "relative",
            overflow: "hidden",
          }}
        >
          {/* Animated background orbs */}
          <div
            aria-hidden
            style={{
              position: "absolute", top: -120, right: -80,
              width: 500, height: 500, borderRadius: "50%",
              background: "radial-gradient(circle, rgba(11,125,107,0.18) 0%, transparent 70%)",
              animation: "drift 12s ease-in-out infinite alternate",
              pointerEvents: "none",
            }}
          />
          <div
            aria-hidden
            style={{
              position: "absolute", bottom: -100, left: -60,
              width: 400, height: 400, borderRadius: "50%",
              background: "radial-gradient(circle, rgba(11,125,107,0.1) 0%, transparent 70%)",
              animation: "drift 16s ease-in-out infinite alternate-reverse",
              pointerEvents: "none",
            }}
          />

          <div style={{ maxWidth: 720, margin: "0 auto", position: "relative" }}>
            {/* Label pill */}
            <div
              style={{
                display: "inline-flex", alignItems: "center", gap: 8,
                padding: "5px 16px", borderRadius: 999,
                background: "rgba(11,125,107,0.2)",
                border: "1px solid rgba(11,125,107,0.4)",
                marginBottom: 24,
                animation: "fadeSlideDown 0.7s ease both",
              }}
            >
              <span style={{ fontSize: 12, fontWeight: 700, color: "#7FDDCA", letterSpacing: "0.06em" }}>
                مكتبة القصص
              </span>
            </div>

            <h1
              style={{
                margin: "0 0 20px",
                fontSize: "clamp(32px, 5.5vw, 58px)",
                fontWeight: 900,
                color: "#fff",
                letterSpacing: "-0.03em",
                fontFamily: "Georgia, serif",
                lineHeight: 1.1,
                animation: "fadeSlideDown 0.7s ease 0.1s both",
              }}
            >
              قصص{" "}
              <span
                style={{
                  color: "#7FDDCA",
                  position: "relative",
                  display: "inline-block",
                }}
              >
                غيّرت الطب
                <span
                  aria-hidden
                  style={{
                    position: "absolute",
                    bottom: -4,
                    right: 0,
                    left: 0,
                    height: 3,
                    borderRadius: 2,
                    background: "linear-gradient(90deg, transparent, #7FDDCA, transparent)",
                    animation: "underlineGrow 1.2s ease 0.8s both",
                    transformOrigin: "center",
                    transform: "scaleX(0)",
                  }}
                />
              </span>
            </h1>

            <p
              style={{
                margin: "0 0 36px",
                fontSize: 16,
                color: "rgba(255,255,255,0.65)",
                lineHeight: 1.85,
                maxWidth: 560,
                marginInline: "auto",
                animation: "fadeSlideDown 0.7s ease 0.2s both",
              }}
            >
              أرشيف حي للحوادث التي أدت إلى تغييرات حقيقية في بروتوكولات السلامة
              حول العالم. لأن التاريخ يصنعه من يتكلمون — ولأن الصمت له ثمن.
            </p>

            {/* Coming soon badge */}
            <div
              style={{
                display: "inline-flex", alignItems: "center", gap: 10,
                padding: "11px 24px", borderRadius: 999,
                background: "rgba(255,255,255,0.07)",
                border: "1px solid rgba(255,255,255,0.18)",
                fontSize: 14, color: "rgba(255,255,255,0.8)", fontWeight: 600,
                animation: "fadeSlideDown 0.7s ease 0.3s both",
              }}
            >
              <span
                style={{
                  width: 8, height: 8, borderRadius: "50%",
                  background: "#F59E0B", flexShrink: 0,
                  animation: "pulseDot 1.5s ease-in-out infinite",
                }}
              />
              قريباً — تحت التطوير
            </div>
          </div>
        </section>

        {/* ── WHY IT MATTERS strip ──────────────────────────────────── */}
        <section
          style={{
            background: C.teal,
            padding: "36px 28px",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              maxWidth: 1100,
              margin: "0 auto",
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
              gap: 32,
            }}
          >
            <AnimatedStat value="98000+" label="وفاة سنوية بسبب أخطاء طبية قابلة للوقاية (أمريكا وحدها)" delay="0ms" />
            <AnimatedStat value="50%" label="من الأخطاء الجراحية كانت يمكن تفادُيها ببروتوكولات بسيطة" delay="100ms" />
            <AnimatedStat value="3x" label="أكثر فاعلية: الإبلاغ الفوري مقارنة بالإبلاغ المتأخر" delay="200ms" />
          </div>
        </section>

        {/* ── STORY GRID ───────────────────────────────────────────── */}
        <section style={{ background: C.ivory, padding: "80px 28px" }}>
          <div style={{ maxWidth: 1140, margin: "0 auto" }}>
            {/* Section header */}
            <div style={{ textAlign: "center", marginBottom: 56 }}>
              <div
                style={{
                  display: "inline-flex", alignItems: "center",
                  gap: 12, marginBottom: 16,
                }}
              >
                <div style={{ width: 32, height: 2, background: C.teal, borderRadius: 2 }} />
                <span style={{ fontSize: 12, fontWeight: 700, color: C.teal, letterSpacing: "0.08em" }}>
                  وجوه أثّرت في مسار السلامة الطبية
                </span>
                <div style={{ width: 32, height: 2, background: C.teal, borderRadius: 2 }} />
              </div>
              <h2
                style={{
                  margin: "0 0 12px",
                  fontSize: "clamp(26px, 4vw, 40px)",
                  fontWeight: 900,
                  color: C.navy,
                  letterSpacing: "-0.025em",
                  fontFamily: "Georgia, serif",
                }}
              >
                لمحة من المكتبة
              </h2>
              <p style={{ margin: 0, fontSize: 14, color: C.g400, fontStyle: "italic" }}>
                نموذج أولي — القصص الكاملة ستُتاح عند الإطلاق
              </p>
            </div>

            {/* Cards grid */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
                gap: 24,
              }}
            >
              {STORIES.map((s, i) =>
                s.isCta
                  ? <CtaCard key={s.id} story={s} index={i} />
                  : <StoryCard key={s.id} story={s} index={i} />
              )}
            </div>
          </div>
        </section>

        {/* ── WHAT MAKES A REPORT POWERFUL ────────────────────────── */}
        <section style={{ background: "#fff", padding: "80px 28px" }}>
          <div style={{ maxWidth: 1000, margin: "0 auto" }}>
            <h2
              style={{
                textAlign: "center",
                margin: "0 0 48px",
                fontSize: "clamp(24px, 3.5vw, 36px)",
                fontWeight: 900,
                color: C.navy,
                letterSpacing: "-0.025em",
                fontFamily: "Georgia, serif",
              }}
            >
              ما الذي يجعل تقريرك قوياً؟
            </h2>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                gap: 20,
                counterReset: "steps",
              }}
            >
              {[
                { icon: "🕐", title: "التوقيت الفوري", desc: "التقارير المُقدَّمة خلال 24 ساعة من الحادثة تحمل تفاصيل أدق بـ3 مرات من تلك المتأخرة." },
                { icon: "📍", title: "السياق الكامل", desc: "صف بيئة العمل، ضغط الوقت، عدد الكوادر — الخطأ دائماً له سياق يفسّره." },
                { icon: "🔗", title: "سلسلة الأحداث", desc: "ما الذي سبق الخطأ؟ ما الخطوات التي لو تغيّرت لاختلفت النتيجة؟" },
                { icon: "💡", title: "مقترحات التحسين", desc: "أنت الأقرب إلى المشكلة. اقتراحك العملي هو أثمن ما في التقرير." },
              ].map((item, i) => {
                const [ref, visible] = useReveal(0.15);
                return (
                  <div
                    key={i}
                    ref={ref}
                    style={{
                      background: C.ivory,
                      borderRadius: 16,
                      padding: "26px 22px",
                      border: `1px solid ${C.g200}`,
                      borderTop: `4px solid ${C.teal}`,
                      transform: visible ? "translateY(0)" : "translateY(24px)",
                      opacity: visible ? 1 : 0,
                      transition: `transform 0.55s ease ${i * 80}ms, opacity 0.55s ease ${i * 80}ms`,
                    }}
                  >
                    <div style={{ fontSize: 26, marginBottom: 12 }}>{item.icon}</div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: C.navy, marginBottom: 8 }}>
                      {item.title}
                    </div>
                    <p style={{ margin: 0, fontSize: 12, color: C.g600, lineHeight: 1.75 }}>
                      {item.desc}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* ── QUOTE BAR ─────────────────────────────────────────────── */}
        <section
          style={{
            background: C.tealLight,
            padding: "64px 28px",
            textAlign: "center",
            borderTop: `1px solid ${C.teal}20`,
          }}
        >
          <div style={{ maxWidth: 680, margin: "0 auto" }}>
            <div
              style={{
                fontSize: 48,
                color: `${C.teal}40`,
                fontFamily: "Georgia, serif",
                marginBottom: 12,
                lineHeight: 1,
              }}
            >
              ❝
            </div>
            <p
              style={{
                margin: "0 0 16px",
                fontSize: "clamp(17px, 2.5vw, 23px)",
                fontWeight: 700,
                color: C.navy,
                lineHeight: 1.6,
                fontFamily: "Georgia, serif",
                fontStyle: "italic",
              }}
            >
              لا يُفيد التاريخ من لم يقرأه —<br />
              ولا يُفيد الخطأ الطبي ما لم يُبلَّغ عنه.
            </p>
            <p style={{ margin: 0, fontSize: 13, color: C.g400 }}>
              — مكتبة قصص E·OVR
            </p>
          </div>
        </section>

      </main>

      <FooterSection />

      <style>{`
        @keyframes pulseDot {
          0%, 100% { opacity: 1; transform: scale(1); }
          50%       { opacity: 0.45; transform: scale(0.8); }
        }
        @keyframes fadeSlideDown {
          from { opacity: 0; transform: translateY(-18px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes underlineGrow {
          to { transform: scaleX(1); }
        }
        @keyframes drift {
          from { transform: translate(0, 0) scale(1); }
          to   { transform: translate(30px, 20px) scale(1.08); }
        }
      `}</style>
    </div>
  );
}