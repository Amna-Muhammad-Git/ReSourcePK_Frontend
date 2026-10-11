import { useState } from "react";
import {
  Link,
  useLocation,
  useNavigate,
  useSearchParams,
} from "react-router-dom";
import AuthShell from "../components/AuthShell";
import FormField from "../components/FormField";
import { api } from "../services/api";
import { useAuth } from "../hooks/useAuth";

const copyByMode = {
  signup: {
    eyebrow: "Create an account",
    title: "Choose your place in the loop.",
    intro: "Buy surplus material or open a verified seller organization.",
    submit: "Create account",
  },
  forgot: {
    eyebrow: "Account recovery",
    title: "Reset access securely.",
    intro: "We will email a one-hour reset link if the account exists.",
    submit: "Send reset link",
  },
  resend: {
    eyebrow: "Email verification",
    title: "Need another link?",
    intro:
      "We will send a fresh verification link if your account still needs one.",
    submit: "Resend verification email",
  },
  login: {
    eyebrow: "Welcome back",
    title: "Continue your work.",
    intro: "Sign in to your role-aware workspace.",
    submit: "Sign in",
  },
};

export default function AuthPage({ mode }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [params] = useSearchParams();
  const { login } = useAuth();
  const [accountType, setAccountType] = useState("buyer");
  const [state, setState] = useState({ email: params.get("email") || "" });
  const [fieldErrors, setFieldErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState("");
  const [needsVerification, setNeedsVerification] = useState(false);
  const isSignup = mode === "signup",
    isForgot = mode === "forgot" || mode === "resend";
  const copy = copyByMode[mode];
  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setFieldErrors({});
    try {
      const actions = {
        login: async () => {
          await login({ email: state.email, password: state.password });
          navigate(location.state?.returnTo || "/workspace");
        },
        forgot: async () => {
          await api("/auth/forgot-password", {
            method: "POST",
            body: JSON.stringify({ email: state.email }),
          });
          setDone("If the account exists, a secure reset link is on its way.");
        },
        resend: async () => {
          await resend();
        },
        signup: async () => {
          const data = await api("/auth/register", {
            method: "POST",
            body: JSON.stringify({ ...state, accountType }),
          });
          const message =
            data.emailDelivery === "sent"
              ? "Check your inbox to verify your email."
              : "Your account was created. Email delivery is pending; use resend verification after SMTP is configured.";
          setDone(message);
        },
      };
      await actions[mode]();
    } catch (e) {
      setError(e.message);
      setFieldErrors(e.details || {});
      setNeedsVerification(e.code === "EMAIL_NOT_VERIFIED");
    } finally {
      setBusy(false);
    }
  }
  const update = (e) => setState({ ...state, [e.target.name]: e.target.value });
  async function resend() {
    setBusy(true);
    setError("");
    try {
      await api("/auth/resend-verification", {
        method: "POST",
        body: JSON.stringify({ email: state.email }),
      });
      setDone(
        "If this account still needs verification, we sent a new link. Check your inbox and spam folder.",
      );
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <AuthShell eyebrow={copy.eyebrow} title={copy.title} intro={copy.intro}>
      {done ? (
        <>
          <div className="notice notice--success">{done}</div>
          {isSignup && (
            <button
              type="button"
              className="button button--wide"
              disabled={busy}
              onClick={resend}
            >
              Resend verification email
            </button>
          )}
        </>
      ) : (
        <form
          onSubmit={submit}
          className="auth-form"
          key={isSignup ? accountType : mode}
        >
          {isSignup && (
            <fieldset className="segmented">
              <legend className="sr-only">Account type</legend>
              <button
                type="button"
                className={accountType === "buyer" ? "active" : ""}
                onClick={() => {
                  setAccountType("buyer");
                  setState({});
                  setFieldErrors({});
                }}
              >
                Buyer
              </button>
              <button
                type="button"
                className={accountType === "seller" ? "active" : ""}
                onClick={() => {
                  setAccountType("seller");
                  setState({});
                  setFieldErrors({});
                }}
              >
                Seller
              </button>
            </fieldset>
          )}
          {isSignup && (
            <FormField
              label="Full name"
              name="fullName"
              value={state.fullName || ""}
              onChange={update}
              autoComplete="name"
              required
              error={fieldErrors.fullName?.[0]}
            />
          )}
          {isSignup && accountType === "seller" && (
            <FormField
              label="Organization name"
              name="organizationName"
              value={state.organizationName || ""}
              onChange={update}
              required
              error={fieldErrors.organizationName?.[0]}
            />
          )}
          <FormField
            label="Email address"
            name="email"
            type="email"
            value={state.email || ""}
            onChange={update}
            autoComplete={isSignup ? `section-${accountType} email` : "email"}
            required
            error={fieldErrors.email?.[0]}
          />
          {!isForgot && (
            <FormField
              label="Password"
              name="password"
              type="password"
              value={state.password || ""}
              onChange={update}
              autoComplete={
                isSignup
                  ? `section-${accountType} new-password`
                  : "current-password"
              }
              minLength="10"
              required
              error={fieldErrors.password?.[0]}
            />
          )}
          {isSignup && (
            <p className="form-hint">
              Use 10+ characters with uppercase, lowercase and a number.
            </p>
          )}
          {Boolean(error) && (
            <div className="notice notice--error" role="alert">
              {error}
            </div>
          )}
          {needsVerification && (
            <button
              type="button"
              className="text-action"
              onClick={resend}
              disabled={busy}
            >
              Resend verification email
            </button>
          )}
          <button type="submit" className="button button--wide" disabled={busy}>
            {busy ? "Working…" : copy.submit}
          </button>
        </form>
      )}
      <div className="auth-links">
        {mode === "login" && (
          <>
            <Link to="/forgot-password">Forgot password?</Link>
            <span>
              New here? <Link to="/signup">Create account</Link>
            </span>
          </>
        )}
        {isSignup && (
          <span>
            Already registered? <Link to="/login">Sign in</Link>
          </span>
        )}
        {isForgot && <Link to="/login">Return to sign in</Link>}
        {mode === "login" && (
          <Link to="/resend-verification">No verification email?</Link>
        )}
      </div>
    </AuthShell>
  );
}
