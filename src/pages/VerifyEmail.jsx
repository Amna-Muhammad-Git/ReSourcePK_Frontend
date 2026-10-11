import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import AuthShell from "../components/AuthShell";
import { api } from "../services/api";
export default function VerifyEmail() {
  const [params] = useSearchParams();
  const token = params.get("token");
  const [status, setStatus] = useState(
    token
      ? "Verifying your secure link…"
      : "This verification link is incomplete.",
  );
  const [ok, setOk] = useState(false);
  useEffect(() => {
    if (!token) return;
    let active = true;
    api("/auth/verify-email", {
      method: "POST",
      body: JSON.stringify({ token }),
    })
      .then(() => {
        if (!active) return;
        setOk(true);
        setStatus("Your email is verified. Your workspace is ready.");
      })
      .catch((error) => {
        if (active) setStatus(error.message);
      });
    return () => {
      active = false;
    };
  }, [token]);
  return (
    <AuthShell
      eyebrow="Email verification"
      title={status}
      intro="Verification links are single-use and expire after 24 hours."
    >
      {ok && (
        <Link className="button" to="/login">
          Continue to sign in
        </Link>
      )}
      {!ok && (
        <Link to="/resend-verification">Request a new verification link</Link>
      )}
    </AuthShell>
  );
}
