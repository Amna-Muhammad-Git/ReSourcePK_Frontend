import { useState } from "react";
import {
  Link,
  useLocation,
  useNavigate,
  useSearchParams,
} from "react-router-dom";
import AuthShell from "../components/AuthShell";
import FormField from "../components/FormField";
import { useAuth } from "../hooks/useAuth";

export default function InvitedAccountLogin({ kind = "reviewer" }) {
  const { login, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [values, setValues] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const isReviewer = kind === "reviewer";
  const requestedRole = searchParams.get("role");
  const teamRole = ["manager", "staff"].includes(requestedRole)
    ? requestedRole
    : "";
  const invalidRole = Boolean(requestedRole && !teamRole);
  const roleLabel = teamRole
    ? teamRole[0].toUpperCase() + teamRole.slice(1)
    : "Invited team";
  const title = isReviewer ? "Reviewer sign in." : `${roleLabel} sign in.`;
  let forgotTarget = "/forgot-password?returnTo=%2Fteam%2Flogin";
  if (isReviewer)
    forgotTarget = "/forgot-password?returnTo=%2Freviewer%2Flogin";
  else if (teamRole) {
    const returnPath = `/team/login?role=${teamRole}`;
    forgotTarget = `/forgot-password?returnTo=${encodeURIComponent(returnPath)}`;
  }

  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const context = await login(values);
      const returnTo = location.state?.returnTo;
      const hasReviewerAccess = context.platformRoles.some((role) =>
        ["platform_admin", "platform_reviewer"].includes(role),
      );
      if (isReviewer && !hasReviewerAccess) {
        await logout();
        throw new Error("This account does not have Platform Reviewer access.");
      }
      if (
        !isReviewer &&
        teamRole &&
        !context.memberships.some((membership) => membership.role === teamRole)
      ) {
        await logout();
        throw new Error(
          `This account does not have Seller ${teamRole} access.`,
        );
      }
      if (
        !isReviewer &&
        !context.memberships.length &&
        !returnTo?.startsWith("/accept-invitation?")
      ) {
        await logout();
        throw new Error("This account has no invited organization access.");
      }
      navigate(isReviewer ? "/admin" : returnTo || "/workspace", {
        replace: true,
      });
    } catch (failure) {
      setError(failure.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthShell
      eyebrow={isReviewer ? "Platform access" : "Organization access"}
      title={title}
      intro={
        isReviewer
          ? "Sign in with the email and password linked to your reviewer invitation."
          : `Sign in with the account invited as ${teamRole || "a team member"}.`
      }
    >
      <form className="auth-form" onSubmit={submit}>
        <FormField
          label="Email address"
          name="email"
          type="email"
          value={values.email}
          onChange={(event) =>
            setValues({ ...values, email: event.target.value })
          }
          autoComplete="email"
          required
        />
        <FormField
          label="Password"
          name="password"
          type="password"
          value={values.password}
          onChange={(event) =>
            setValues({ ...values, password: event.target.value })
          }
          autoComplete="current-password"
          required
        />
        {(error || invalidRole) && (
          <div className="notice notice--error" role="alert">
            {error || "Choose Manager or Staff from the sign-in menu."}
          </div>
        )}
        <button
          className="button button--wide"
          type="submit"
          disabled={busy || invalidRole}
        >
          {busy ? "Signing in…" : "Sign in"}
        </button>
      </form>
      <div className="auth-links">
        <Link to={forgotTarget}>Forgot password?</Link>
      </div>
    </AuthShell>
  );
}
