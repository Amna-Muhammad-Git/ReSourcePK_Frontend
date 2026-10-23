import { useCallback, useEffect, useRef, useState } from "react";
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

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

const copyByMode = {
  signup: {
    eyebrow: "Create an account",
    title: "Choose how you’ll use ReThread.",
    intro: "Continue with Google as a Buyer or start a Seller application.",
  },
  login: {
    eyebrow: "Welcome back",
    title: "Continue your work.",
    intro: "Sign in with Google as a Buyer or Seller.",
  },
  forgot: {
    eyebrow: "Account recovery",
    title: "Reset access securely.",
    intro: "We will email a one-hour reset link if the account exists.",
  },
  resend: {
    eyebrow: "Email verification",
    title: "Need another link?",
    intro:
      "We will send a fresh verification link if your account still needs one.",
  },
};

function GoogleButton({ role, nonce, onCredential, busy, disabled }) {
  const ref = useRef(null);
  const [ready, setReady] = useState(Boolean(window.google?.accounts?.id));
  useEffect(() => {
    let active = true;
    if (window.google?.accounts?.id) {
      const readyTimer = window.setTimeout(() => active && setReady(true), 0);
      return () => {
        active = false;
        window.clearTimeout(readyTimer);
      };
    }
    let script = document.querySelector('script[data-google-identity="true"]');
    if (!script) {
      script = document.createElement("script");
      script.src = "https://accounts.google.com/gsi/client";
      script.async = true;
      script.defer = true;
      script.dataset.googleIdentity = "true";
      document.head.appendChild(script);
    }
    const timer = window.setInterval(() => {
      if (window.google?.accounts?.id && active) {
        setReady(true);
        window.clearInterval(timer);
      }
    }, 100);
    script.addEventListener("error", () => active && setReady(false), {
      once: true,
    });
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, []);
  useEffect(() => {
    if (!ready || !ref.current || !GOOGLE_CLIENT_ID || !nonce || disabled)
      return;
    ref.current.replaceChildren();
    window.google.accounts.id.initialize({
      client_id: GOOGLE_CLIENT_ID,
      nonce,
      callback: (response) => onCredential(response.credential),
      ux_mode: "popup",
      auto_select: false,
    });
    window.google.accounts.id.renderButton(ref.current, {
      type: "standard",
      theme: "outline",
      size: "large",
      text: "continue_with",
      shape: "rectangular",
      width: 320,
    });
  }, [ready, role, nonce, onCredential, disabled]);
  return (
    <div className="google-button">
      {!GOOGLE_CLIENT_ID ? (
        <p className="notice notice--error">
          Google sign-in is not configured. Set VITE_GOOGLE_CLIENT_ID.
        </p>
      ) : (
        <div ref={ref} aria-busy={busy || disabled} />
      )}
      {GOOGLE_CLIENT_ID && !ready && (
        <p className="form-hint">Loading Google sign-in…</p>
      )}
    </div>
  );
}

export default function AuthPage({ mode }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [params] = useSearchParams();
  const { googleLogin } = useAuth();
  const [accountType, setAccountType] = useState("buyer");
  const [state, setState] = useState({ email: params.get("email") || "" });
  const [fieldErrors, setFieldErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState("");
  const [needsVerification, setNeedsVerification] = useState(false);
  const [nonce, setNonce] = useState("");
  const [nonceRole, setNonceRole] = useState("");
  const isForgot = mode === "forgot" || mode === "resend";
  const requestedReturnTo = params.get("returnTo");
  const returnToLogin = [
    "/login",
    "/reviewer/login",
    "/team/login",
    "/team/login?role=manager",
    "/team/login?role=staff",
  ].includes(requestedReturnTo)
    ? requestedReturnTo
    : "/login";
  const copy = copyByMode[mode];
  const loadNonce = useCallback(async () => {
    if (isForgot) return;
    try {
      const result = await api(
        accountType === "seller"
          ? "/auth/google/seller/nonce"
          : "/auth/google/nonce",
      );
      setNonce(result.nonce);
      setNonceRole(accountType);
    } catch (e) {
      setError(e.message);
    }
  }, [accountType, isForgot]);
  useEffect(() => {
    const timer = window.setTimeout(loadNonce, 0);
    return () => window.clearTimeout(timer);
  }, [loadNonce]);
  async function onCredential(credential) {
    setBusy(true);
    setError("");
    setDone("");
    const usedNonce = nonce;
    setNonce("");
    try {
      const result = await googleLogin(credential, accountType, usedNonce);
      if (result.verificationRequired) {
        setDone(
          result.emailDelivery === "sent"
            ? "Check your inbox to verify your email, then sign in again."
            : "Email verification is required. Use resend verification after email delivery is configured.",
        );
        return;
      }
      const from = location.state?.from;
      let path = from ? `${from.pathname}${from.search}` : "/buyer";
      if (accountType === "seller") {
        path = result.context.memberships.length
          ? `/org/${result.context.memberships[0].slug}`
          : "/seller/application";
      }
      navigate(path, { replace: true });
    } catch (e) {
      setError(e.message);
      if (e.code === "GOOGLE_LINK_REQUIRED") {
        setError(
          `${e.message} Use invited account sign-in, then link Google from account settings.`,
        );
      }
    } finally {
      setBusy(false);
      loadNonce();
    }
  }
  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setFieldErrors({});
    try {
      if (mode === "forgot") {
        await api("/auth/forgot-password", {
          method: "POST",
          body: JSON.stringify({ email: state.email }),
        });
        setDone("If the account exists, a secure reset link is on its way.");
      } else if (mode === "resend") {
        await resend();
      }
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
  const actionLabel = mode === "login" ? "Sign in" : "Send reset link";
  return (
    <AuthShell eyebrow={copy.eyebrow} title={copy.title} intro={copy.intro}>
      {done && (
        <div className="notice notice--success" role="status">
          {done}
        </div>
      )}
      {!done && !isForgot && (
        <div
          className={`auth-form${["signup", "login"].includes(mode) ? " auth-form--google" : ""}`}
        >
          <fieldset className="segmented">
            <legend className="sr-only">Choose sign-in role</legend>
            <button
              type="button"
              className={accountType === "buyer" ? "active" : ""}
              onClick={() => setAccountType("buyer")}
            >
              Buyer
            </button>
            <button
              type="button"
              className={accountType === "seller" ? "active" : ""}
              onClick={() => setAccountType("seller")}
            >
              Seller
            </button>
          </fieldset>
          <GoogleButton
            role={accountType}
            nonce={nonceRole === accountType ? nonce : ""}
            onCredential={onCredential}
            busy={busy}
            disabled={busy || nonceRole !== accountType || !nonce}
          />
        </div>
      )}
      {!done && isForgot && (
        <form onSubmit={submit} className="auth-form">
          <FormField
            label="Email address"
            name="email"
            type="email"
            value={state.email || ""}
            onChange={update}
            autoComplete="email"
            required
            error={fieldErrors.email?.[0]}
          />
          {error && (
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
            {busy ? "Working…" : actionLabel}
          </button>
        </form>
      )}
      {error && !isForgot && (
        <div className="notice notice--error" role="alert">
          {error}
        </div>
      )}
      <div className="auth-links">
        {mode === "login" && (
          <span>
            New here? <Link to="/signup">Create account</Link>
          </span>
        )}
        {mode === "signup" && (
          <span>
            Already registered? <Link to="/login">Sign in</Link>
          </span>
        )}
        {isForgot && <Link to={returnToLogin}>Return to sign in</Link>}
      </div>
    </AuthShell>
  );
}
