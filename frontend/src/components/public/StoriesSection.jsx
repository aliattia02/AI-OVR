import { useEffect, useState } from "react";

const C = {
  navy: "#0C2340",
  teal: "#0B7D6B",
  tealLight: "#E0F5F1",
  g200: "#E5E7EB",
  g400: "#9CA3AF",
  g600: "#4B5563",
};

const STORIES = [
  {
    badge: "خطأ في الجرعة · 1994",
    name: "Betsy Lehman",
    text: "صحفية وأمٌّ لطفلتين، تُوفّيت جرّاء خطأ في جرعة العلاج الكيميائي بلغت أربعة أضعاف الجرعة المقررة. وفاتها أطلقت حركة وطنية لسلامة المرضى في أمريكا.",
    tag: "أسّست مركز Betsy Lehman لسلامة المرضى",
  },
  {
    badge: "خطأ صيدلاني · 2006",
    name: "Emily Jerry",
    text: "طفلة في عمر عامين، فارقت الحياة بعد أن أُعطيت جرعة من كلوريد الصوديوم تزيد عن 20 ضعف الجرعة المسموح بها. قصتها غيّرت قوانين الصيادلة الفنيين في 11 ولاية أمريكية.",
    tag: "قانون Emily Jerry — إلزامية مراجعة الصيادلة",
  },
  {
    badge: "ثقافة الإبلاغ · 2001",
    name: "نموذج WHO للإبلاغ",
    text: "بعد نشر تقرير \"To Err is Human\" الذي كشف عن 98,000 حالة وفاة سنوية بسبب أخطاء طبية قابلة للوقاية، أنشأت منظمة الصحة العالمية نظاماً دولياً للإبلاغ.",
    tag: "44 دولة تطبّق منظومة الإبلاغ الآمن",
  },
];

export default function StoriesSection() {
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
        padding: isMobile ? "52px 20px" : "72px 20px",
        background: "#fff",
        direction: "rtl",
        fontFamily: '"Segoe UI", system-ui, sans-serif',
      }}
    >
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        <div style={{ fontSize: 28, fontWeight: 800, color: C.navy, marginBottom: 6 }}>
          قصص حقيقية
        </div>
        <div style={{ color: C.g400, marginBottom: 26 }}>حين يُغيّر الإبلاغ مسار التاريخ</div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: isMobile ? "1fr" : "repeat(3, minmax(0, 1fr))",
            gap: 20,
          }}
        >
          {STORIES.map((story) => (
            <div
              key={story.name}
              style={{
                background: "#fff",
                borderRadius: 14,
                padding: "22px",
                border: `1px solid ${C.g200}`,
                borderRight: `4px solid ${C.teal}`,
                boxShadow: "0 10px 24px rgba(12,35,64,0.08)",
              }}
            >
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  background: C.tealLight,
                  color: C.teal,
                  borderRadius: 999,
                  fontSize: 12,
                  fontWeight: 700,
                  padding: "4px 10px",
                  marginBottom: 12,
                }}
              >
                {story.badge}
              </div>
              <div style={{ fontSize: 30, color: C.teal, opacity: 0.4, marginBottom: 4 }}>"</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: C.navy, marginBottom: 10 }}>
                {story.name}
              </div>
              <div style={{ fontSize: 14, color: C.g600, lineHeight: 1.8 }}>{story.text}</div>
              <div style={{ marginTop: 14, fontSize: 13, color: C.teal, fontStyle: "italic" }}>
                {story.tag}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
