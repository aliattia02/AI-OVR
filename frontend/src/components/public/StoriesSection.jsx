// frontend/src/components/public/StoriesSection.jsx
import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";

const C = {
  navy:      "#0C2340",
  teal:      "#0B7D6B",
  tealLight: "#E0F5F1",
  ivory:     "#F5F7FA",
  g200:      "#E5E7EB",
  g400:      "#9CA3AF",
  g600:      "#4B5563",
};

const STORIES = [
  {
    badge:        "خطأ في الجرعة · 1994",
    name:         "بيتسي ليمان",
    nameEn:       "Betsy Lehman",
    photo:        "/stories/betsy-lehman.jpg",
    initials:     "BL",
    initialsColor:"#7C2D12",
    initialsBg:   "#FED7AA",
    domain:       "دواء",
    domainColor:  "#B91C1C",
    domainBg:     "#FEF2F2",
    brief:
      "صحفية طبية وأم لطفلتين. تلقّت جرعة كيماوي أعلى من المقررة بأربعة أضعاف — ولم يُنبّه النظام أحداً. توفيت وهي في الثامنة والثلاثين، وأصبحت قضيتها شرارة حركة سلامة المرضى في أمريكا.",
    tag:          "أسّست مركز Betsy Lehman لسلامة المرضى في ماساتشوستس",
    tagIcon:      "🏛",
  },
  {
    badge:        "خطأ صيدلاني · 2006",
    name:         "إميلي جيري",
    nameEn:       "Emily Jerry",
    photo:        "/stories/emily-jerry.jpg",
    initials:     "EJ",
    initialsColor:"#064E3B",
    initialsBg:   "#A7F3D0",
    domain:       "صيدلة",
    domainColor:  "#0F766E",
    domainBg:     "#F0FDFA",
    brief:
      "طفلة في عمر عامين كانت على أعتاب الشفاء من سرطان الدم. محلول وريدي حُضِّر بتركيز خاطئ دون مراجعة. رحلت في يومها الأول بعد العلاج. والدها حوّل حزنه إلى قانون فيدرالي يحمي كل طفل بعدها.",
    tag:          "قانون Emily Jerry — مراجعة مزدوجة إلزامية للمحاليل الوريدية",
    tagIcon:      "⚖️",
  },
  {
    badge:        "ثقافة الإبلاغ · 2001",
    name:         "To Err is Human",
    nameEn:       "To Err is Human",
    photo:        "/stories/placeholder-story.jpg",
    initials:     "WHO",
    initialsColor:"#1E40AF",
    initialsBg:   "#DBEAFE",
    domain:       "سياسة صحية",
    domainColor:  "#1D4ED8",
    domainBg:     "#EFF6FF",
    brief:
      "كشف تقرير \"To Err is Human\" عن 98,000 وفاة سنوية في أمريكا وحدها بسبب أخطاء كان بالإمكان تفاديها. الصدمة كانت عالمية — وأدت إلى إنشاء منظومة إبلاغ دولية شاملة.",
    tag:          "44 دولة تطبّق منظومة الإبلاغ الآمن حتى اليوم",
    tagIcon:      "🌍",
  },
];

/* ── Scroll-reveal hook ── */
function useReveal(threshold = 0.12) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    if (!ref.current) return;
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setVisible(true); obs.disconnect(); } },
      { threshold }
    );
    obs.observe(ref.current);
    return () => obs.disconnect();
  }, [threshold]);
  return [ref, visible];
}

/* ── Person avatar with graceful fallback ── */
function Avatar({ story }) {
  const [failed, setFailed] = useState(false);
  const showImg = story.photo && !failed;

  return (
    <div
      style={{
        width: 64,
        height: 64,
        borderRadius: "50%",
        overflow: "hidden",
        flexShrink: 0,
        background: showImg ? "#000" : story.initialsBg,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        border: `2px solid ${C.g200}`,
        boxShadow: "0 2px 10px rgba(12,35,64,0.10)",
      }}
    >
      {showImg ? (
        <img
          src={story.photo}
          alt={story.name}
          onError={() => setFailed(true)}
          style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "top" }}
        />
      ) : (
        <span style={{ fontSize: 18, fontWeight: 800, color: story.initialsColor, fontFamily: "Georgia, serif" }}>
          {story.initials}
        </span>
      )}
    </div>
  );
}

/* ── Single story card ── */
function StoryCard({ story, index }) {
  const [ref, visible] = useReveal(0.1);
  const delay = `${index * 100}ms`;

  return (
    <div
      ref={ref}
      style={{
        background: "#fff",
        borderRadius: 16,
        padding: "22px 20px",
        border: `1px solid ${C.g200}`,
        borderRight: `4px solid ${C.teal}`,
        boxShadow: "0 6px 24px rgba(12,35,64,0.07)",
        display: "flex",
        flexDirection: "column",
        gap: 14,
        transform: visible ? "translateY(0)" : "translateY(28px)",
        opacity: visible ? 1 : 0,
        transition: `transform 0.55s ease ${delay}, opacity 0.55s ease ${delay}`,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.boxShadow = "0 12px 36px rgba(12,35,64,0.13)";
        e.currentTarget.style.transform = "translateY(-3px)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.boxShadow = "0 6px 24px rgba(12,35,64,0.07)";
        e.currentTarget.style.transform = "translateY(0)";
      }}
    >
      {/* Header: avatar + name + domain badge */}
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <Avatar story={story} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 15, fontWeight: 800, color: C.navy, marginBottom: 3, lineHeight: 1.2 }}>
            {story.name}
          </div>
          <div style={{ fontSize: 11, color: C.g400, marginBottom: 5 }}>{story.nameEn}</div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            <span
              style={{
                padding: "2px 9px",
                borderRadius: 999,
                background: story.domainBg,
                color: story.domainColor,
                fontSize: 11,
                fontWeight: 700,
                border: `1px solid ${story.domainColor}25`,
              }}
            >
              {story.domain}
            </span>
            <span
              style={{
                padding: "2px 9px",
                borderRadius: 999,
                background: C.tealLight,
                color: C.teal,
                fontSize: 11,
                fontWeight: 600,
              }}
            >
              {story.badge}
            </span>
          </div>
        </div>
      </div>

      {/* Brief */}
      <p style={{ margin: 0, fontSize: 13, color: C.g600, lineHeight: 1.85 }}>
        {story.brief}
      </p>

      {/* Legacy pill */}
      <div
        style={{
          background: C.ivory,
          borderRadius: 8,
          padding: "8px 12px",
          fontSize: 12,
          color: C.teal,
          lineHeight: 1.5,
          fontWeight: 500,
          borderRight: `3px solid ${C.teal}`,
          display: "flex",
          gap: 6,
          alignItems: "flex-start",
        }}
      >
        <span style={{ flexShrink: 0 }}>{story.tagIcon}</span>
        <span>{story.tag}</span>
      </div>
    </div>
  );
}

/* ── Main component ── */
export default function StoriesSection() {
  const [headerRef, headerVisible] = useReveal(0.1);
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
        padding: isMobile ? "56px 20px" : "80px 28px",
        background: "#fff",
        direction: "rtl",
        fontFamily: '"Segoe UI", system-ui, sans-serif',
      }}
    >
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>

        {/* Section header */}
        <div
          ref={headerRef}
          style={{
            marginBottom: 44,
            transform: headerVisible ? "translateY(0)" : "translateY(20px)",
            opacity: headerVisible ? 1 : 0,
            transition: "transform 0.55s ease, opacity 0.55s ease",
          }}
        >
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 10,
              marginBottom: 12,
            }}
          >
            <div style={{ width: 28, height: 2, background: C.teal, borderRadius: 2 }} />
            <span style={{ fontSize: 12, fontWeight: 700, color: C.teal, letterSpacing: "0.07em" }}>
              من التاريخ
            </span>
            <div style={{ width: 28, height: 2, background: C.teal, borderRadius: 2 }} />
          </div>
          <div
            style={{
              fontSize: isMobile ? 26 : 34,
              fontWeight: 900,
              color: C.navy,
              marginBottom: 8,
              lineHeight: 1.2,
              fontFamily: "Georgia, serif",
              letterSpacing: "-0.02em",
            }}
          >
            قصص حقيقية غيّرت الطب
          </div>
          <div style={{ color: C.g400, fontSize: 14, maxWidth: 480 }}>
            حين يُبلَّغ عن خطأ — لا تتوقف القصة عند الألم، بل تبدأ عند التغيير.
          </div>
        </div>

        {/* Cards */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: isMobile ? "1fr" : "repeat(3, minmax(0, 1fr))",
            gap: 20,
            marginBottom: 32,
          }}
        >
          {STORIES.map((story, i) => (
            <StoryCard key={story.nameEn} story={story} index={i} />
          ))}
        </div>

        {/* CTA link to full library */}
        <div style={{ textAlign: "center" }}>
          <Link
            to="/public/stories"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "10px 24px",
              borderRadius: 999,
              border: `1.5px solid ${C.teal}`,
              color: C.teal,
              fontSize: 13,
              fontWeight: 700,
              textDecoration: "none",
              transition: "background 0.15s, color 0.15s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = C.teal;
              e.currentTarget.style.color = "#fff";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "transparent";
              e.currentTarget.style.color = C.teal;
            }}
          >
            اقرأ المكتبة الكاملة ←
          </Link>
        </div>
      </div>
    </section>
  );
}