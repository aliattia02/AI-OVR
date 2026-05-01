// LoginForm component — renders the E·OVR login form (email/password fields, submit button) and calls the auth service.
// frontend/src/components/auth/LoginForm.jsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { MFA_TEMP_TOKEN_STORAGE_KEY } from "../../utils/authStorage";

const C = {
  navy: "#0C2340",
  teal: "#0B7D6B",
  tealLight: "#E0F5F1",
  red: "#DC2626",
  redLight: "#FEE2E2",
  g100: "#F3F4F6",
  g200: "#E5E7EB",
  g400: "#9CA3AF",
  g600: "#4B5563",
  g800: "#1F2937",
};

export default function LoginForm() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    if (!email.trim() || !password.trim()) {
      setError("Email and password are required.");
      return;
    }
    setLoading(true);
    try {
      const me = await login(email.trim(), password);
      // login() returns null when must_change_password is true —
      // AuthContext already navigated to /change-password in that case,
      // so only navigate here when we actually got a user back.
      if (me) {
        navigate("/", { replace: true });
      }
    } catch (err) {
      if (err?.requires_mfa) {
        const tempToken = err?.temp_token ?? null;
        if (tempToken && typeof sessionStorage !== "undefined") {
          sessionStorage.setItem(MFA_TEMP_TOKEN_STORAGE_KEY, tempToken);
        }
        navigate("/mfa/verify", { replace: true, state: { tempToken } });
        return;
      }
      const msg =
        err?.response?.data?.detail ||
        err?.message ||
        "Invalid email or password.";
      setError(typeof msg === "string" ? msg : "Login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#EEF2F7",
        fontFamily: '"Segoe UI", system-ui, sans-serif',
        padding: "24px",
      }}
    >
      <div style={{ width: "100%", maxWidth: 420 }}>
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              width: 56,
              height: 56,
              borderRadius: 14,
              background: C.navy,
              marginBottom: 16,
            }}
          >
            <span style={{ fontSize: 22, fontWeight: 800, color: "#fff", letterSpacing: "-0.03em" }}>
              E·O
            </span>
          </div>
          <div style={{ fontSize: 26, fontWeight: 800, color: C.navy, letterSpacing: "-0.02em" }}>
            E·OVR
          </div>
          <div style={{ fontSize: 13, color: C.g400, marginTop: 4, letterSpacing: "0.04em" }}>
            Electronic Occurrence &amp; Variance Reporting
          </div>
        </div>

        {/* Card */}
        <div
          style={{
            background: "#fff",
            borderRadius: 14,
            border: `1px solid ${C.g200}`,
            padding: "32px 28px",
            boxShadow: "0 4px 24px rgba(12,35,64,0.07)",
          }}
        >
          <div style={{ fontSize: 17, fontWeight: 700, color: C.g800, marginBottom: 22 }}>
            Sign in to your account
          </div>

          {/* Error banner */}
          {error && (
            <div
              style={{
                background: C.redLight,
                border: `1px solid ${C.red}30`,
                borderRadius: 8,
                padding: "10px 14px",
                marginBottom: 18,
                fontSize: 13,
                color: C.red,
                display: "flex",
                alignItems: "flex-start",
                gap: 8,
              }}
            >
              <span style={{ marginTop: 1 }}>⚠</span>
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate>
            {/* Email */}
            <div style={{ marginBottom: 16 }}>
              <label
                htmlFor="eovr-email"
                style={{ display: "block", fontSize: 13, fontWeight: 600, color: C.g800, marginBottom: 6 }}
              >
                Email address
              </label>
              <input
                id="eovr-email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@hospital.gov.eg"
                disabled={loading}
                style={{
                  width: "100%",
                  padding: "10px 13px",
                  borderRadius: 8,
                  border: `1px solid ${C.g200}`,
                  fontSize: 14,
                  color: C.g800,
                  background: loading ? C.g100 : "#fff",
                  outline: "none",
                  boxSizing: "border-box",
                  fontFamily: "inherit",
                  transition: "border-color 0.15s",
                }}
                onFocus={(e) => (e.target.style.borderColor = C.teal)}
                onBlur={(e) => (e.target.style.borderColor = C.g200)}
              />
            </div>

            {/* Password */}
            <div style={{ marginBottom: 24 }}>
              <label
                htmlFor="eovr-password"
                style={{ display: "block", fontSize: 13, fontWeight: 600, color: C.g800, marginBottom: 6 }}
              >
                Password
              </label>
              <input
                id="eovr-password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                disabled={loading}
                style={{
                  width: "100%",
                  padding: "10px 13px",
                  borderRadius: 8,
                  border: `1px solid ${C.g200}`,
                  fontSize: 14,
                  color: C.g800,
                  background: loading ? C.g100 : "#fff",
                  outline: "none",
                  boxSizing: "border-box",
                  fontFamily: "inherit",
                  transition: "border-color 0.15s",
                }}
                onFocus={(e) => (e.target.style.borderColor = C.teal)}
                onBlur={(e) => (e.target.style.borderColor = C.g200)}
              />
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              style={{
                width: "100%",
                padding: "11px",
                borderRadius: 8,
                border: "none",
                background: loading ? C.g400 : C.teal,
                color: "#fff",
                fontSize: 14,
                fontWeight: 700,
                cursor: loading ? "not-allowed" : "pointer",
                fontFamily: "inherit",
                letterSpacing: "0.01em",
                transition: "background 0.15s",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
              }}
            >
              {loading ? (
                <>
                  <span
                    style={{
                      width: 14,
                      height: 14,
                      border: "2px solid rgba(255,255,255,0.4)",
                      borderTopColor: "#fff",
                      borderRadius: "50%",
                      display: "inline-block",
                      animation: "eovr-spin 0.7s linear infinite",
                    }}
                  />
                  Signing in…
                </>
              ) : (
                "Sign in"
              )}
            </button>
          </form>
        </div>

        {/* Footer note */}
        <div style={{ textAlign: "center", marginTop: 20, fontSize: 12, color: C.g400 }}>
          6 Governorates · 348 Facilities · Confidential
        </div>
      </div>

      {/* Spinner keyframe — injected once */}
      <style>{`@keyframes eovr-spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
