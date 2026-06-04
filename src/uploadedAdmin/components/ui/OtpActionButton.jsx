import { useState } from "react";
import { useAuth } from "../../features/auth/AuthContext.jsx";

export function OtpActionButton({
  children,
  className = "button primary",
  label = "critical action",
  onVerified,
  type = "button",
  disabled = false
}) {
  const { createOtpChallenge, otpChallenge, verifyOtpChallenge } = useAuth();
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState("");
  const [message, setMessage] = useState("");

  function startChallenge() {
    createOtpChallenge(label);
    setCode("");
    setMessage("");
    setOpen(true);
  }

  function submitOtp(event) {
    event.preventDefault();
    const result = verifyOtpChallenge(code);

    if (!result.ok) {
      setMessage(result.message);
      return;
    }

    setOpen(false);
    onVerified();
  }

  return (
    <>
      <button className={className} type={type} disabled={disabled} onClick={startChallenge}>
        {children}
      </button>
      {open ? (
        <div className="modal-backdrop" role="presentation">
          <form className="modal-panel" role="dialog" aria-modal="true" onSubmit={submitOtp}>
            <h3>OTP verification</h3>
            <p>Enter the OTP code to continue with {label}.</p>
            {otpChallenge?.code ? (
              <div className="alert soft inline-alert">Local OTP: {otpChallenge.code}</div>
            ) : null}
            <label className="field-block">
              OTP code
              <input
                required
                inputMode="numeric"
                maxLength="6"
                value={code}
                onChange={(event) => setCode(event.target.value)}
              />
            </label>
            {message ? <p className="form-error">{message}</p> : null}
            <div className="page-actions">
              <button className="button secondary" type="button" onClick={() => setOpen(false)}>
                Cancel
              </button>
              <button className="button primary" type="submit">
                Verify
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </>
  );
}
