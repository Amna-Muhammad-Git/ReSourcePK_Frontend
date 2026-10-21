import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import Home from "./pages/Home";
import AuthPage from "./pages/AuthPage";
import InvitedAccountLogin from "./pages/InvitedAccountLogin";
import VerifyEmail from "./pages/VerifyEmail";
import ResetPassword from "./pages/ResetPassword";
import AcceptInvitation from "./pages/AcceptInvitation";
import Workspace, { WorkspaceEntry } from "./pages/Workspace";
import SellerApplicationPage from "./pages/SellerApplicationPage";
import ProtectedRoute from "./components/ProtectedRoute";
import Marketplace from "./pages/Marketplace";
import ListingDetail from "./pages/ListingDetail";
import PaymentReturn from "./pages/PaymentReturn";

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/marketplace" element={<Marketplace />} />
          <Route
            path="/marketplace/listings/:listingId"
            element={<ListingDetail />}
          />
          <Route path="/login" element={<AuthPage mode="login" />} />
          <Route
            path="/reviewer/login"
            element={<InvitedAccountLogin kind="reviewer" />}
          />
          <Route
            path="/team/login"
            element={<InvitedAccountLogin kind="team" />}
          />
          <Route path="/signup" element={<AuthPage mode="signup" />} />
          <Route path="/forgot-password" element={<AuthPage mode="forgot" />} />
          <Route
            path="/resend-verification"
            element={<AuthPage mode="resend" />}
          />
          <Route path="/verify-email" element={<VerifyEmail />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/accept-invitation" element={<AcceptInvitation />} />
          <Route
            path="/payment/return"
            element={
              <ProtectedRoute>
                <PaymentReturn />
              </ProtectedRoute>
            }
          />
          <Route
            path="/seller/application"
            element={
              <ProtectedRoute>
                <SellerApplicationPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/workspace/*"
            element={
              <ProtectedRoute>
                <WorkspaceEntry />
              </ProtectedRoute>
            }
          />
          <Route
            path="/buyer/*"
            element={
              <ProtectedRoute>
                <Workspace kind="buyer" />
              </ProtectedRoute>
            }
          />
          <Route
            path="/org/:orgSlug/*"
            element={
              <ProtectedRoute>
                <Workspace kind="organization" />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/*"
            element={
              <ProtectedRoute>
                <Workspace kind="platform" />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
