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
  const [teamRole, setTeamRole] = useState(
    ["manager", "staff"].includes(requestedRole) ? requestedRole : "",
  );
  const invalidRole = Boolean(requestedRole && !teamRole);
  const roleLabel = teamRole
    ? teamRole[0].toUpperCase() + teamRole.slice(1)
    : "Invited team";
  let title = "Seller team sign in.";
  if (isReviewer) title = "Reviewer sign in.";
  else if (teamRole) title = `${roleLabel} sign in.`;
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
          : "Choose your invited role, then sign in with your email and password."
      }
    >
      <form className="auth-form" onSubmit={submit}>
        {!isReviewer && (
          <fieldset className="segmented">
            <legend className="sr-only">Choose team role</legend>
            <button
              type="button"
              className={teamRole === "manager" ? "active" : ""}
              aria-pressed={teamRole === "manager"}
              onClick={() => setTeamRole("manager")}
            >
              Manager
            </button>
            <button
              type="button"
              className={teamRole === "staff" ? "active" : ""}
              aria-pressed={teamRole === "staff"}
              onClick={() => setTeamRole("staff")}
            >
              Staff
            </button>
          </fieldset>
        )}
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
            {error || "Choose Manager or Staff to continue."}
          </div>
        )}
        <button
          className="button button--wide"
          type="submit"
          disabled={busy || invalidRole || (!isReviewer && !teamRole)}
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
