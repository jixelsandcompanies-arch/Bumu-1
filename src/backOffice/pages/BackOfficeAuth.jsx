import { useState } from "react";
import { ArrowLeft, LogIn, UserPlus } from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../uploadedAdmin/features/auth/AuthContext.jsx";
import { adminPortalService } from "../../services/adminPortalService.js";
import { bumuLogo } from "@/assets/index.js";

export default function BackOfficeAuth() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  const [mode, setMode] = useState("login");
  const [form, setForm] = useState({
    fullName: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
    setupCode: ""
  });
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleLogin(event) {
    event.preventDefault();
    setError("");
    setMessage("");
    setSubmitting(true);

    try {
      const result = await login(form.email.trim(), form.password);
      if (!result.ok) {
        setError(result.message || "Unable to sign in.");
        return;
      }

      const requestedPath = location.state?.from?.pathname;
      const nextPath = requestedPath && requestedPath.startsWith("/backoffice")
        ? requestedPath
        : "/backoffice/overview";
      navigate(nextPath, { replace: true });
    } catch (error) {
      setError(error.message || "Login failed.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRegister(event) {
    event.preventDefault();
    setError("");
    setMessage("");
    setSubmitting(true);

    if (form.password !== form.confirmPassword) {
      setError("Passwords do not match.");
      setSubmitting(false);
      return;
    }

    try {
      await adminPortalService.register({
        fullName: form.fullName.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        password: form.password,
        setupCode: form.setupCode.trim(),
        role: "back_office_officer"
      });
      setMessage("Registration complete. Sign in with your new Back Office credentials.");
      setMode("login");
      setForm((current) => ({ ...current, password: "", confirmPassword: "" }));
    } catch (error) {
      setError(error.message || "Registration failed.");
    } finally {
      setSubmitting(false);
    }
  }

  function updateField(key, value) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  return (
    <main className="auth-screen">
      <section className="auth-panel auth-panel-stacked">
        <button type="button" className="auth-back-link" onClick={() => { window.location.href = "/"; }}>
          <ArrowLeft size={16} />
          Back to site
        </button>
        <div className="brand auth-brand">
          <img className="auth-logo" src={bumuLogo} alt="Bumu Paygo logo" />
          <div>
            <strong>Bumu PAYGO</strong>
            <span>Back Office account access</span>
          </div>
        </div>

        <h1>{mode === "login" ? "Back Office sign in" : "Back Office registration"}</h1>
        <p>
          {mode === "login"
            ? "Use your approved Back Office email to access screening workflows."
            : "Create a Back Office profile linked to Supabase Auth and the shared CRM."}
        </p>

        <form className="form-grid" onSubmit={mode === "login" ? handleLogin : handleRegister}>
          {mode === "register" ? (
            <>
              <label>
                Full name
                <input
                  required
                  value={form.fullName}
                  onChange={(event) => updateField("fullName", event.target.value)}
                />
              </label>
              <label>
                Phone number
                <input
                  required
                  value={form.phone}
                  onChange={(event) => updateField("phone", event.target.value)}
                />
              </label>
              <label>
                Setup code
                <input
                  value={form.setupCode}
                  onChange={(event) => updateField("setupCode", event.target.value)}
                  placeholder="Optional"
                />
              </label>
            </>
          ) : null}

          <label>
            Email address
            <input
              required
              type="email"
              value={form.email}
              onChange={(event) => updateField("email", event.target.value)}
            />
          </label>
          <label>
            Password
            <input
              required
              type="password"
              value={form.password}
              onChange={(event) => updateField("password", event.target.value)}
            />
          </label>
          {mode === "register" ? (
            <label>
              Confirm password
              <input
                required
                type="password"
                value={form.confirmPassword}
                onChange={(event) => updateField("confirmPassword", event.target.value)}
              />
            </label>
          ) : null}

          {error ? <p className="form-error">{error}</p> : null}
          {message ? <div className="alert soft">{message}</div> : null}

          <button className="button primary" type="submit" disabled={submitting}>
            {mode === "login" ? <LogIn size={18} /> : <UserPlus size={18} />}
            {submitting
              ? mode === "login"
                ? "Signing in..."
                : "Registering..."
              : mode === "login"
                ? "Sign in"
                : "Register"}
          </button>
        </form>

        <div className="auth-links auth-links-center">
          {mode === "login" ? (
            <>
              <Link to="/backoffice/reset-password">Reset password</Link>
              <button type="button" className="link-button" onClick={() => { setError(""); setMessage(""); setMode("register"); }}>
                Create Back Office account
              </button>
            </>
          ) : (
            <button type="button" className="link-button" onClick={() => { setError(""); setMessage(""); setMode("login"); }}>
              Already have an account? Sign in
            </button>
          )}
        </div>
      </section>
    </main>
  );
}
