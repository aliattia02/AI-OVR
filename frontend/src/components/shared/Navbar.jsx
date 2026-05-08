// frontend/src/components/shared/Navbar.jsx
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

const C = {
  navy:    "#0C2340",
  navyMid: "#122d52",
  teal:    "#0B7D6B",
  tealLight: "#E0F5F1",
  g100:    "#F3F4F6",
  g200:    "#E5E7EB",
  g400:    "#9CA3AF",
  g600:    "#4B5563",
  white:   "#ffffff",
};

/** Derive a short display name from the user object. */
function displayName(user) {
  if (!user) return "";
  if (user.full_name) return user.full_name;
  if (user.name)      return user.name;
  if (user.email)     return user.email.split("@")[0];
  return "Account";
}

/** Two-letter avatar initials. */
function initials(name) {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate          = useNavigate();
  const [open, setOpen]   = useState(false);
  const menuRef           = useRef(null);

  const name = displayName(user);

  // Close dropdown when clicking outside
  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const handleChangePassword = () => {
    setOpen(false);
    navigate("/change-password");
  };

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
        padding: "0 20px",
        flexShrink: 0,
        borderBottom: `1px solid ${C.navyMid}`,
        position: "sticky",
        top: 0,
        zIndex: 100,
      }}
    >
      {/* Brand */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          userSelect: "none",
        }}
      >
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
            E·O
          </span>
        </div>
        <span style={{ fontSize: 15, fontWeight: 700, color: C.white, letterSpacing: "-0.01em" }}>
          E·OVR
        </span>
      </div>

      {/* Account button */}
      <div ref={menuRef} style={{ position: "relative" }}>
        <button
          onClick={() => setOpen((v) => !v)}
          title="Account options"
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
          onMouseEnter={(e) => {
            if (!open) e.currentTarget.style.background = C.navyMid;
          }}
          onMouseLeave={(e) => {
            if (!open) e.currentTarget.style.background = "transparent";
          }}
        >
          {/* Avatar circle */}
          <div
            style={{
              width: 28,
              height: 28,
              borderRadius: "50%",
              background: C.teal,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 11,
              fontWeight: 700,
              color: "#fff",
              flexShrink: 0,
            }}
          >
            {initials(name)}
          </div>

          {/* Name */}
          <span
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: C.white,
              maxWidth: 180,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {name}
          </span>

          {/* Chevron */}
          <svg
            width="12"
            height="12"
            viewBox="0 0 12 12"
            fill="none"
            style={{
              flexShrink: 0,
              opacity: 0.7,
              transition: "transform 0.2s",
              transform: open ? "rotate(180deg)" : "rotate(0deg)",
            }}
          >
            <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>

        {/* Dropdown */}
        {open && (
          <div
            style={{
              position: "absolute",
              top: "calc(100% + 6px)",
              right: 0,
              minWidth: 200,
              background: "#fff",
              border: `1px solid ${C.g200}`,
              borderRadius: 10,
              boxShadow: "0 8px 24px rgba(12,35,64,0.12)",
              overflow: "hidden",
              animation: "eovr-dropdown-in 0.12s ease",
            }}
          >
            {/* User info header */}
            <div
              style={{
                padding: "12px 14px 10px",
                borderBottom: `1px solid ${C.g100}`,
              }}
            >
              <div style={{ fontSize: 13, fontWeight: 700, color: C.navy }}>{name}</div>
              {user?.email && (
                <div
                  style={{
                    fontSize: 12,
                    color: C.g400,
                    marginTop: 2,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {user.email}
                </div>
              )}
            </div>

            {/* Menu items */}
            <div style={{ padding: "6px 0" }}>
              <DropdownItem
                icon={
                  <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
                    <path d="M7.5 1a3 3 0 100 6 3 3 0 000-6zM2 11.5C2 9.6 4.5 8 7.5 8s5.5 1.6 5.5 3.5V13h-11v-1.5z" fill="currentColor" />
                  </svg>
                }
                label="Change password"
                onClick={handleChangePassword}
              />
              <DropdownItem
                icon={
                  <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
                    <path d="M6 2H3a1 1 0 00-1 1v9a1 1 0 001 1h3M10 10l3-2.5L10 5M13 7.5H6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                }
                label="Sign out"
                onClick={handleSignOut}
                danger
              />
            </div>
          </div>
        )}
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

function DropdownItem({ icon, label, onClick, danger = false }) {
  const [hovered, setHovered] = useState(false);
  const color = danger ? "#DC2626" : "#1F2937";
  const hoverBg = danger ? "#FEF2F2" : "#F3F4F6";

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        width: "100%",
        padding: "8px 14px",
        background: hovered ? hoverBg : "transparent",
        border: "none",
        cursor: "pointer",
        fontFamily: "inherit",
        fontSize: 13,
        fontWeight: 500,
        color,
        textAlign: "left",
        transition: "background 0.1s",
      }}
    >
      <span style={{ color, opacity: 0.85, flexShrink: 0 }}>{icon}</span>
      {label}
    </button>
  );
}