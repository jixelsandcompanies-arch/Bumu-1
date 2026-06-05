import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../../features/auth/AuthContext.jsx";
import { bumuLogo } from "@/assets/index.js";

export default function ResetPassword() {
  const location = useLocation();
  const { requestPasswordReset } = useAuth();
  const [identifier, setIdentifier] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const loginPath = location.pathname.startsWith("/backoffice") ? "/backoffice/login" : "/login";

  async function handleSubmit(event) {
    event.preventDefault();
    setSubmitting(true);
    const result = await requestPasswordReset(identifier);
    setSubmitting(false);
    setMessage(result.message);
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
        <h1>Password reset</h1>
        <p>Send a secure password reset link to the registered admin email address.</p>
        <form className="form-grid" onSubmit={handleSubmit}>
          <label>
            Email address
            <input
              required
              type="email"
              value={identifier}
              onChange={(event) => setIdentifier(event.target.value)}
              placeholder="you@example.com"
            />
          </label>
          {message ? <p className="form-error neutral-message">{message}</p> : null}
          <button className="button primary" type="submit" disabled={submitting}>
            {submitting ? "Sending..." : "Send reset link"}
          </button>
        </form>
        <div className="auth-links">
          <Link to={loginPath}>Back to login</Link>
        </div>
      </section>
    </main>
  );
}
