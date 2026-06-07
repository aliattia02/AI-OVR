// frontend/src/components/shared/Navbar.jsx
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "../../context/AuthContext";

const C = {
  navy:    "#0C2340",
  navyMid: "#122d52",
  teal:    "#0B7D6B",
  g100:    "#F3F4F6",
  g200:    "#E5E7EB",
  g400:    "#9CA3AF",
  white:   "#ffffff",
};

function displayName(user) {
  if (!user) return "";
  if (user.full_name) return user.full_name;
  if (user.name)      return user.name;
  if (user.email)     return user.email.split("@")[0];
  return "Account";
}

function initials(name) {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

function LanguageSwitcher() {
  const { i18n } = useTranslation();
  const [hovered, setHovered] = useState(false);

  const activeLang   = i18n.resolvedLanguage || i18n.language || "en";
  const isAr         = activeLang.startsWith("ar");
  const nextLang     = isAr ? "en" : "ar";
  const currentLabel = isAr ? "AR" : "EN";
  const nextLabel    = isAr ? "EN" : "AR";

  return (
    <button
      onClick={() => i18n.changeLanguage(nextLang)}
      title={`Switch to ${nextLang.toUpperCase()}`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 5,
        background: hovered ? C.navyMid : "transparent",
        border: `1px solid ${hovered ? C.teal + "80" : "rgba(255,255,255,0.20)"}`,
        borderRadius: 7,
        padding: "4px 10px",
        cursor: "pointer",
        color: C.white,
        fontFamily: "inherit",
        fontSize: 12,
        fontWeight: 700,
        letterSpacing: "0.04em",
        transition: "background 0.15s, border-color 0.15s",
        userSelect: "none",
        flexShrink: 0,
      }}
    >
      <svg width="13" height="13" viewBox="0 0 15 15" fill="none" style={{ opacity: 0.80, flexShrink: 0 }}>
        <circle cx="7.5" cy="7.5" r="6.5" stroke="currentColor" strokeWidth="1.3" />
        <ellipse cx="7.5" cy="7.5" rx="2.8" ry="6.5" stroke="currentColor" strokeWidth="1.3" />
        <path d="M1 7.5h13" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
        <path d="M2 4.5h11M2 10.5h11" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" strokeOpacity="0.6" />
      </svg>
      <span>{currentLabel}</span>
      <span style={{ opacity: 0.40, fontWeight: 400 }}>|</span>
      <span style={{ opacity: hovered ? 1 : 0.45, transition: "opacity 0.15s" }}>{nextLabel}</span>
    </button>
  );
}

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate         = useNavigate();
  const { t, i18n }      = useTranslation();
  const isRTL            = (i18n.resolvedLanguage || i18n.language || 'en').startsWith('ar');
  const [open, setOpen]  = useState(false);
  const menuRef          = useRef(null);
  const name             = displayName(user);

  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const handleChangePassword = () => { setOpen(false); navigate("/change-password"); };
  const handleSignOut = async () => {
    setOpen(false);
    await logout();
    navigate("/login", { replace: true });
  };

  return (
    <header
      style={{
        height: 52,
        background: C.navy,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        flexDirection: isRTL ? "row-reverse" : "row",
        padding: "0 20px",
        flexShrink: 0,
        borderBottom: `1px solid ${C.navyMid}`,
        position: "sticky",
        top: 0,
        zIndex: 100,
      }}
    >
      {/* Brand — product name is intentionally untranslated */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, userSelect: "none" }}>
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            width: 32,
            height: 32,
            borderRadius: 8,
            background: C.teal,
          }}
        >
          <span style={{ fontSize: 13, fontWeight: 800, color: "#fff", letterSpacing: "-0.03em" }}>
            {t("common.brand_mark")}
          </span>
        </div>
        <span style={{ fontSize: 15, fontWeight: 700, color: C.white, letterSpacing: "-0.01em" }}>
          {t("common.brand_name")}
        </span>
      </div>

      {/* Right-side controls */}
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <LanguageSwitcher />

        {/* Account dropdown */}
        <div ref={menuRef} style={{ position: "relative" }}>
          <button
            onClick={() => setOpen((v) => !v)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              background: open ? C.navyMid : "transparent",
              border: `1px solid ${open ? C.teal + "60" : "transparent"}`,
              borderRadius: 8,
              padding: "5px 10px 5px 6px",
              cursor: "pointer",
              color: C.white,
              fontFamily: "inherit",
              transition: "background 0.15s, border-color 0.15s",
            }}
            onMouseEnter={(e) => { if (!open) e.currentTarget.style.background = C.navyMid; }}
            onMouseLeave={(e) => { if (!open) e.currentTarget.style.background = "transparent"; }}
          >
            <div
              style={{
                width: 28, height: 28, borderRadius: "50%",
                background: C.teal, display: "flex",
                alignItems: "center", justifyContent: "center",
                fontSize: 11, fontWeight: 700, color: "#fff", flexShrink: 0,
              }}
            >
              {initials(name)}
            </div>
            <span
              style={{
                fontSize: 13, fontWeight: 600, color: C.white,
                maxWidth: 180, overflow: "hidden",
                textOverflow: "ellipsis", whiteSpace: "nowrap",
              }}
            >
              {name}
            </span>
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none"
              style={{
                flexShrink: 0, opacity: 0.7, transition: "transform 0.2s",
                transform: open ? "rotate(180deg)" : "rotate(0deg)",
              }}
            >
              <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>

          {open && (
            <div
              style={{
                position: "absolute",
                top: "calc(100% + 6px)",
                ...(isRTL ? { left: 0 } : { right: 0 }),
                minWidth: 200,
                background: "#fff",
                border: `1px solid ${C.g200}`,
                borderRadius: 10,
                boxShadow: "0 8px 24px rgba(12,35,64,0.12)",
                overflow: "hidden",
                animation: "eovr-dropdown-in 0.12s ease",
              }}
            >
              <div style={{ padding: "12px 14px 10px", borderBottom: `1px solid ${C.g100}`, textAlign: isRTL ? "right" : "left" }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: C.navy }}>{name}</div>
                {user?.email && (
                  <div style={{ fontSize: 12, color: C.g400, marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {user.email}
                  </div>
                )}
              </div>
              <div style={{ padding: "6px 0" }}>
                <DropdownItem
                  icon={<svg width="15" height="15" viewBox="0 0 15 15" fill="none"><path d="M7.5 1a3 3 0 100 6 3 3 0 000-6zM2 11.5C2 9.6 4.5 8 7.5 8s5.5 1.6 5.5 3.5V13h-11v-1.5z" fill="currentColor" /></svg>}
                  label={t("auth.change_password.title")}
                  onClick={handleChangePassword}
                  isRTL={isRTL}
                />
                <DropdownItem
                  icon={<svg width="15" height="15" viewBox="0 0 15 15" fill="none"><path d="M6 2H3a1 1 0 00-1 1v9a1 1 0 001 1h3M10 10l3-2.5L10 5M13 7.5H6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" /></svg>}
                  label={t("nav.sign_out")}
                  onClick={handleSignOut}
                  danger
                  isRTL={isRTL}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes eovr-dropdown-in {
          from { opacity: 0; transform: translateY(-6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </header>
  );
}

function DropdownItem({ icon, label, onClick, danger = false, isRTL = false }) {
  const [hovered, setHovered] = useState(false);
  const color   = danger ? "#DC2626" : "#1F2937";
  const hoverBg = danger ? "#FEF2F2" : "#F3F4F6";
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: "flex", alignItems: "center", gap: 10,
        flexDirection: isRTL ? "row-reverse" : "row",
        width: "100%", padding: "8px 14px",
        background: hovered ? hoverBg : "transparent",
        border: "none", cursor: "pointer",
        fontFamily: "inherit", fontSize: 13, fontWeight: 500,
        color, textAlign: isRTL ? "right" : "left",
        direction: isRTL ? "rtl" : "ltr",
        transition: "background 0.1s",
      }}
    >
      <span style={{ color, opacity: 0.85, flexShrink: 0 }}>{icon}</span>
      {label}
    </button>
  );
}