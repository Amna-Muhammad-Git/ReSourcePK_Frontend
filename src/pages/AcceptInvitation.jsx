import { useEffect, useState } from "react";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import AuthShell from "../components/AuthShell";
import FormField from "../components/FormField";
import { api } from "../services/api";
import { useAuth } from "../hooks/useAuth";
export default function AcceptInvitation() {
  const [params] = useSearchParams();
  const token = params.get("token");
  const { context, loading, refresh, logout } = useAuth();
  const navigate = useNavigate();
  const [details, setDetails] = useState(null);
  const [state, setState] = useState({});
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const wrongAccount = Boolean(
    context &&
    details &&
    context.user.email.toLowerCase() !== details.email.toLowerCase(),
  );
  let actionLabel = "Create account and accept";
  if (context) actionLabel = "Accept as invited account";
  if (busy) actionLabel = "Joining…";
  useEffect(() => {
    if (!token) return;
    let active = true;
    api(`/invitations/details?token=${encodeURIComponent(token)}`)
      .then((invitation) => {
        if (active) setDetails(invitation);
      })
      .catch((requestError) => {
        if (active) setError(requestError.message);
      });
    return () => {
      active = false;
    };
  }, [token]);
  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      if (context)
        await api("/invitations/accept", {
          method: "POST",
          body: JSON.stringify({ token }),
        });
      else
        await api("/invitations/accept-new", {
          method: "POST",
          body: JSON.stringify({
            token,
            fullName: state.fullName,
            password: state.password,
          }),
        });
      if (context) await refresh();
      navigate(context ? "/workspace" : "/login");
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <AuthShell
      eyebrow="Organization invitation"
      title={
        details
          ? `Join ${details.organization_name}.`
          : "Review your invitation."
      }
      intro={
        details
          ? `Invitation for ${details.email} as ${details.role.replace("_", " ")}. This secure link expires after 72 hours and works once.`
          : "Secure invitation details are loading."
      }
    >
      {wrongAccount && (
        <div className="notice notice--error" role="alert">
          You are signed in as {context.user.email}. This invitation belongs to{" "}
          {details.email}.
          <button
            type="button"
            className="text-action"
            onClick={() => logout()}
          >
            Sign out to use the invited account
          </button>
        </div>
      )}
      {!loading && details?.account_exists && !context && (
        <p>
          Already have an account?{" "}
          <Link
            to="/login"
            state={{
              returnTo: `/accept-invitation?token=${encodeURIComponent(token)}`,
            }}
          >
            Sign in as {details.email} to accept.
          </Link>
        </p>
      )}
      <form className="auth-form" onSubmit={submit}>
        {!loading &&
          !context &&
          Boolean(details) &&
          !details.account_exists && (
            <>
              <FormField
                label="Full name"
                value={state.fullName || ""}
                onChange={(e) =>
                  setState({ ...state, fullName: e.target.value })
                }
                required
              />
              <FormField
                label="Create password"
                type="password"
                autoComplete="new-password"
                value={state.password || ""}
                onChange={(e) =>
                  setState({ ...state, password: e.target.value })
                }
                minLength="10"
                required
              />
            </>
          )}
        {Boolean(error) && <div className="notice notice--error">{error}</div>}
        {Boolean(details) &&
          !loading &&
          !wrongAccount &&
          (context || !details.account_exists) && (
            <button
              type="submit"
              className="button button--wide"
              disabled={busy}
            >
              {actionLabel}
            </button>
          )}
      </form>
    </AuthShell>
  );
}
