import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { getPortalPathForRole, useAuth } from "../../features/auth/AuthContext.jsx";
import { bumuLogo } from "@/assets/index.js";

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  const [form, setForm] = useState({
    email: "",
    password: ""
  });
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    const result = await login(form.email, form.password);
    setSubmitting(false);

    if (!result.ok) {
      setError(result.message);
      return;
    }
    const targetPath = result.user?.role ? getPortalPathForRole(result.user.role) : "/admin/overview";
    const requestedPath = location.state?.from?.pathname;
    const shouldUseRequestedPath =
      requestedPath && (!requestedPath.startsWith("/admin") || targetPath.startsWith("/admin"));
    navigate(shouldUseRequestedPath ? requestedPath : targetPath, { replace: true });
  }

  return (
    <main className="auth-screen">
      <section className="auth-panel">
        <div className="brand auth-brand">
          <img className="auth-logo" src={bumuLogo} alt="Bumu Paygo logo" />
          <div>
            <strong>Bumu PAYGO</strong>
            <span>Admin CRM</span>
          </div>
        </div>
        <h1>Admin sign in</h1>
        <p>Access the back-office portal for agents, screening, bikes, and audit operations.</p>

        <form className="form-grid" onSubmit={handleSubmit}>
          <label>
            Email address
            <input
              required
              type="email"
              value={form.email}
              onChange={(event) => setForm({ ...form, email: event.target.value })}
            />
          </label>
          <label>
            Password
            <input
              required
              type="password"
              value={form.password}
              onChange={(event) => setForm({ ...form, password: event.target.value })}
            />
          </label>
          {error ? <p className="form-error">{error}</p> : null}
          <button className="button primary" type="submit" disabled={submitting}>
            {submitting ? "Signing in..." : "Sign in"}
          </button>
        </form>

        <div className="auth-links">
          <Link to="/reset-password">Reset password</Link>
        </div>
      </section>
    </main>
  );
}
