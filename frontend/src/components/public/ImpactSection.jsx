import { useEffect, useState } from "react";

const C = {
  navy: "#0C2340",
  teal: "#0B7D6B",
  g200: "#E5E7EB",
};

const IMPACT_STATS = [
  {
    value: "70%",
    label: "انخفاض الأخطاء الدوائية في المستشفيات التي تتبنّى ثقافة الإبلاغ",
  },
  {
    value: "3×",
    label: "تحسّن في جودة الرعاية عند تفعيل التغذية الراجعة",
  },
  {
    value: "50%",
    label: "من الحوادث الخطيرة يمكن تفاديها بالإبلاغ المبكر",
  },
  {
    value: "∞",
    label: "أثر تقرير واحد على سياسات تحمي آلاف المرضى",
  },
];

export default function ImpactSection() {
  const [width, setWidth] = useState(
    typeof window !== "undefined" ? window.innerWidth : 1024
  );

  useEffect(() => {
    const handleResize = () => setWidth(window.innerWidth);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const gridColumns =
    width < 600 ? "1fr" : width < 900 ? "repeat(2, minmax(0, 1fr))" : "repeat(4, minmax(0, 1fr))";

  return (
    <section
      style={{
        background: C.navy,
        color: "#fff",
        padding: width < 600 ? "52px 20px" : "72px 20px",
        direction: "rtl",
        fontFamily: '"Segoe UI", system-ui, sans-serif',
      }}
    >
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        <div style={{ fontSize: 28, fontWeight: 800, marginBottom: 26 }}>ماذا يحدث حين نُبلّغ؟</div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: gridColumns,
            gap: 18,
            marginBottom: 24,
          }}
        >
          {IMPACT_STATS.map((stat) => (
            <div
              key={stat.value}
              style={{
                background: "rgba(255,255,255,0.08)",
                border: "1px solid rgba(255,255,255,0.12)",
                borderRadius: 14,
                padding: "20px 18px",
                minHeight: 140,
              }}
            >
              <div style={{ fontSize: 28, fontWeight: 800, marginBottom: 8 }}>{stat.value}</div>
              <div style={{ fontSize: 14, lineHeight: 1.7, color: C.g200 }}>{stat.label}</div>
            </div>
          ))}
        </div>
        <div style={{ textAlign: "center", color: C.teal, fontStyle: "italic", lineHeight: 1.8 }}>
          صوتك مهم. الإبلاغ الآمن هو ركيزة ثقافة الجودة — لا عقوبة، لا إجراءات تأديبية، فقط تحسين
          مستمر.
        </div>
      </div>
    </section>
  );
}
