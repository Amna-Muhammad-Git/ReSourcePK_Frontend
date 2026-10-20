import { Navigate } from "react-router-dom";
import Brand from "../components/Brand";
import { useAuth } from "../hooks/useAuth";
import { StartSelling } from "./Workspace";

export default function SellerApplicationPage() {
  const { context, refresh, logout } = useAuth();

  if (context.memberships.length) {
    return (
      <Navigate replace to={`/org/${context.memberships[0].slug}/listings`} />
    );
  }

  return (
    <main className="seller-onboarding">
      <header className="seller-onboarding-header">
        <Brand />
        <button className="text-action" type="button" onClick={logout}>
          Sign out
        </button>
      </header>
      <div className="seller-onboarding-title">
        <p className="eyebrow">Seller onboarding</p>
        <h1>Apply to become a Seller</h1>
      </div>
      <StartSelling context={context} refresh={refresh} />
    </main>
  );
}
