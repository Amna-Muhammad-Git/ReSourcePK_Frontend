import { useCallback, useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { api } from "../services/api";

export default function PaymentReturn() {
  const [search] = useSearchParams();
  const attemptId = search.get("attempt");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const refresh = useCallback(async () => {
    if (!attemptId) return;
    setLoading(true);
    try {
      setData(await api(`/payment-attempts/${attemptId}`));
      setError("");
    } catch (failure) {
      setError(failure.message);
    } finally {
      setLoading(false);
    }
  }, [attemptId]);
  const status = data?.status;
  const done = ["succeeded", "failed", "expired"].includes(status);
  useEffect(() => {
    if (!attemptId || done) return undefined;
    const initial = window.setTimeout(refresh, 0);
    const timer = window.setInterval(refresh, 4000);
    return () => {
      window.clearTimeout(initial);
      window.clearInterval(timer);
    };
  }, [attemptId, done, refresh]);

  let title = "Confirming your payment";
  let message =
    "RapidGateway is confirming the result. This page updates when the signed payment notification reaches us.";
  if (status === "succeeded") {
    title = "Payment confirmed";
    message =
      "Your order is marked paid. You can review its status in My purchases.";
  } else if (status === "failed") {
    title = "Payment was not completed";
    message =
      "The payment attempt failed. Return to My purchases to start another attempt if the order is still payable.";
  } else if (error) {
    title = "We could not confirm the payment";
    message = error;
  }

  return (
    <main className="payment-return-page">
      <section
        className="purchase-panel payment-return-card"
        aria-live="polite"
      >
        <p className="eyebrow">RapidGateway checkout</p>
        <h1>{title}</h1>
        <p>{message}</p>
        {status === "pending" && (
          <span className="data-badge">Awaiting confirmation</span>
        )}
        {loading && !data && (
          <p className="form-hint">Loading payment status…</p>
        )}
        <div className="payment-return-actions">
          <button
            className="button button--quiet"
            type="button"
            onClick={refresh}
            disabled={loading}
          >
            Refresh status
          </button>
          <Link className="button" to="/buyer/my-purchases">
            My purchases
          </Link>
        </div>
        <p className="form-hint">
          The return from the checkout page does not prove payment. Only
          verified gateway notifications update an order.
        </p>
      </section>
    </main>
  );
}
