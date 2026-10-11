import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import AuthShell from "../components/AuthShell";
import FormField from "../components/FormField";
import { api } from "../services/api";
export default function ResetPassword() {
  const [params] = useSearchParams();
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  async function submit(e) {
    e.preventDefault();
    try {
      await api("/auth/reset-password", {
        method: "POST",
        body: JSON.stringify({ token: params.get("token"), password }),
      });
      setMessage("Password updated. All previous sessions were signed out.");
    } catch (err) {
      setError(err.message);
    }
  }
  return (
    <AuthShell
      eyebrow="Secure recovery"
      title="Choose a new password."
      intro="Your reset link is single-use and expires after one hour."
    >
      {message ? (
        <>
          <div className="notice notice--success">{message}</div>
          <Link className="button" to="/login">
            Sign in
          </Link>
        </>
      ) : (
        <form className="auth-form" onSubmit={submit}>
          <FormField
            label="New password"
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            minLength="10"
            required
            error={error && error.includes("previous") ? error : undefined}
          />
          <p className="form-hint">
            Use 10+ characters with uppercase, lowercase and a number.
          </p>
          {Boolean(error) && (
            <div className="notice notice--error">{error}</div>
          )}
          <button type="submit" className="button button--wide">
            Update password
          </button>
        </form>
      )}
    </AuthShell>
  );
}
