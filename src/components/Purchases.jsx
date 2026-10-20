import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../services/api";
import { formatCurrency } from "../utils/formatters";

const cash = (minor) => formatCurrency(Number(minor || 0) / 100);
const when = (value) => (value ? new Date(value).toLocaleString() : "—");
const label = (value) => String(value || "unknown").replaceAll("_", " ");
const key = () => crypto.randomUUID();
const closeDefault = () => {
  const date = new Date(Date.now() + 86400000);
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  return date.toISOString().slice(0, 16);
};

function useData(loader) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const reload = useCallback(async () => {
    setLoading(true);
    try {
      setData(await loader());
      setError("");
    } catch (failure) {
      setError(failure.message);
    } finally {
      setLoading(false);
    }
  }, [loader]);
  useEffect(() => {
    const timer = window.setTimeout(reload, 0);
    return () => window.clearTimeout(timer);
  }, [reload]);
  return { data, loading, error, reload, setError };
}

export function ListingPurchaseActions({
  listing,
  context,
  groupOnly = false,
}) {
  const [quantity, setQuantity] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const groups = useData(
    useCallback(
      () => api("/listings/" + listing.id + "/purchase-groups?limit=50"),
      [listing.id],
    ),
  );
  async function direct(event) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const order = await api("/orders", {
        method: "POST",
        body: JSON.stringify({
          listingId: listing.id,
          quantity,
          requestKey: key(),
        }),
      });
      setNotice(
        "Order placed. Seller response is due " +
          when(order.seller_response_due_at) +
          ".",
      );
      setQuantity("");
    } catch (failure) {
      setError(failure.message);
    } finally {
      setBusy(false);
    }
  }
  async function join(groupId, share) {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const order = await api(
        "/purchase-groups/" + groupId + "/contributions",
        {
          method: "POST",
          body: JSON.stringify({ quantity: share, requestKey: key() }),
        },
      );
      setNotice(
        "Group share joined. Locked total: " +
          cash(order.total_minor) +
          ". Seller confirmation comes before payment.",
      );
      await groups.reload();
    } catch (failure) {
      setError(failure.message);
    } finally {
      setBusy(false);
    }
  }
  const directEnabled =
    !groupOnly && ["direct", "both"].includes(listing.purchase_mode);
  const groupEnabled = ["group", "both"].includes(listing.purchase_mode);
  return (
    <section
      className={`purchase-actions${groupOnly ? " purchase-actions--compact" : ""}`}
    >
      {!groupOnly && <p className="eyebrow">Buying options</p>}
      <h2>{groupOnly ? "Open group orders" : "Purchase this material"}</h2>
      {!context && <p>Sign in as a Buyer to place an order or join a group.</p>}
      {context && directEnabled && (
        <form className="purchase-form" onSubmit={direct}>
          <label className="field">
            <span>Quantity ({listing.unit})</span>
            <input
              type="number"
              min="0.001"
              step="0.001"
              max={listing.quantity}
              value={quantity}
              onChange={(event) => setQuantity(event.target.value)}
              required
            />
          </label>
          <button className="button" disabled={busy}>
            {busy ? "Placing order…" : "Request direct purchase"}
          </button>
          <small>
            Seller confirms first. If confirmed, you have 3 days to pay.
          </small>
        </form>
      )}
      {groupEnabled && (
        <div className="purchase-list">
          {!groupOnly && <h3>Open group orders</h3>}
          {groups.error && (
            <div className="notice notice--error" role="alert">
              {groups.error}
            </div>
          )}
          {groups.loading && <p>Loading groups…</p>}
          {!groups.loading && !(groups.data?.items || []).length && (
            <p className="group-empty-state">
              <strong>No group orders are open right now.</strong>
              <span>
                The Seller has not started a group for this material yet. Check
                back later to join when one opens.
              </span>
            </p>
          )}
          {(groups.data?.items || []).map((group) => (
            <BuyerGroup
              key={group.id}
              group={group}
              signedIn={Boolean(context)}
              busy={busy}
              onJoin={join}
            />
          ))}
        </div>
      )}
      {error && (
        <div className="notice notice--error" role="alert">
          {error}
        </div>
      )}
      {notice && (
        <div className="notice notice--success" role="status">
          {notice}
        </div>
      )}
      {!context && (
        <Link className="button" to="/login">
          Sign in to buy
        </Link>
      )}
    </section>
  );
}

function BuyerGroup({ group, signedIn, busy, onJoin }) {
  const [share, setShare] = useState("");
  const joined = Number(group.joined_quantity || 0);
  const remaining = Math.max(0, Number(group.target_quantity) - joined);
  return (
    <article className="purchase-card">
      <div className="purchase-card-heading">
        <div>
          <strong>{group.organization_name}</strong>
          <span>{label(group.status)}</span>
        </div>
        <small>Closes {when(group.closes_at)}</small>
      </div>
      <p>
        {joined} / {group.target_quantity} {group.unit} joined · {remaining}{" "}
        {group.unit} to target
      </p>
      <progress
        max={Number(group.target_quantity) || 1}
        value={Math.min(joined, Number(group.target_quantity))}
        aria-label="Group progress"
      />
      {signedIn &&
        remaining > 0 &&
        ["open", "ready_for_confirmation", "reconfirmation_required"].includes(
          group.status,
        ) && (
          <form
            className="purchase-form purchase-form--inline"
            onSubmit={(event) => {
              event.preventDefault();
              onJoin(group.id, share);
              setShare("");
            }}
          >
            <label className="field">
              <span>Your share ({group.unit})</span>
              <input
                type="number"
                min="0.001"
                step="0.001"
                max={remaining}
                value={share}
                onChange={(event) => setShare(event.target.value)}
                required
              />
            </label>
            <button className="button" disabled={busy}>
              Join group
            </button>
          </form>
        )}
      {!signedIn && (
        <Link className="text-action" to="/login">
          Sign in to join
        </Link>
      )}
    </article>
  );
}

export function BuyerPurchases() {
  const loader = useCallback(() => api("/orders/mine?limit=50"), []);
  const orders = useData(loader);
  const [busy, setBusy] = useState("");
  const [notice, setNotice] = useState("");
  async function leave(order) {
    if (!window.confirm("Leave this group and release your reserved share?"))
      return;
    setBusy(order.id);
    orders.setError("");
    setNotice("");
    try {
      await api(
        "/purchase-groups/" +
          order.group_id +
          "/contributions/" +
          order.id +
          "/leave",
        { method: "POST", body: JSON.stringify({}) },
      );
      setNotice("You left the group and your reserved share was released.");
      await orders.reload();
    } catch (failure) {
      orders.setError(failure.message);
    } finally {
      setBusy("");
    }
  }
  const items = orders.data?.items || [];
  return (
    <section className="purchase-panel">
      <p className="eyebrow">Buyer workspace</p>
      <h2>My purchases</h2>
      <p>Track Seller decisions, group shares, and payment deadlines.</p>
      {notice && (
        <div className="notice notice--success" role="status">
          {notice}
        </div>
      )}
      {orders.error && (
        <div className="notice notice--error" role="alert">
          {orders.error}
        </div>
      )}
      {orders.loading && <p>Loading purchases…</p>}
      {!orders.loading && !items.length && (
        <p>You have no orders yet. Explore materials to get started.</p>
      )}
      <div className="purchase-list">
        {items.map((order) => (
          <article className="purchase-card" key={order.id}>
            <div className="purchase-card-heading">
              <div>
                <strong>{order.listing_title}</strong>
                <span>{label(order.status)}</span>
              </div>
              <small>Placed {when(order.created_at)}</small>
            </div>
            <p>
              {order.quantity} {order.unit} · {cash(order.total_minor)}
            </p>
            {order.group_id && <p>Group status: {label(order.group_status)}</p>}
            {order.status === "pending_seller_confirmation" && (
              <p>Seller response due {when(order.seller_response_due_at)}.</p>
            )}
            {order.status === "pending_payment" && (
              <div className="notice">
                Payment due {when(order.payment_due_at)}. Online checkout will
                be available after payment gateway integration.
              </div>
            )}
            {order.status === "group_open" && (
              <>
                <p>
                  Your share price is locked. Payment starts after Seller
                  confirmation.
                </p>
                <button
                  className="button button--quiet"
                  type="button"
                  disabled={busy === order.id}
                  onClick={() => leave(order)}
                >
                  {busy === order.id ? "Leaving…" : "Leave group"}
                </button>
              </>
            )}
          </article>
        ))}
      </div>
    </section>
  );
}

export function SellerOrders({ membership }) {
  const orgId = membership.organization_id;
  const orders = useData(
    useCallback(
      () => api("/organizations/" + orgId + "/orders?limit=50"),
      [orgId],
    ),
  );
  const groups = useData(
    useCallback(
      () => api("/organizations/" + orgId + "/purchase-groups?limit=50"),
      [orgId],
    ),
  );
  const listings = useData(
    useCallback(
      () => api("/organizations/" + orgId + "/listings?limit=50"),
      [orgId],
    ),
  );
  const [busy, setBusy] = useState("");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const mayDecide =
    membership.role === "owner" ||
    (membership.role === "manager" &&
      membership.permissions?.includes("orders.confirm"));
  async function act(path, body, message) {
    setBusy(path);
    setError("");
    setNotice("");
    try {
      await api(path, { method: "POST", body: JSON.stringify(body) });
      setNotice(message);
      await Promise.all([orders.reload(), groups.reload()]);
    } catch (failure) {
      setError(failure.message);
    } finally {
      setBusy("");
    }
  }
  const directOrders = (orders.data?.items || []).filter(
    (order) => !order.group_id,
  );
  const groupItems = groups.data?.items || [];
  const groupListings = (listings.data?.items || []).filter(
    (item) =>
      item.status === "published" &&
      ["group", "both"].includes(item.purchase_mode),
  );
  return (
    <section className="purchase-panel">
      <p className="eyebrow">Seller workspace</p>
      <h2>Orders and group purchases</h2>
      <p>Confirm direct orders and groups. Buyers then have 3 days to pay.</p>
      {notice && (
        <div className="notice notice--success" role="status">
          {notice}
        </div>
      )}
      {error && (
        <div className="notice notice--error" role="alert">
          {error}
        </div>
      )}
      {!mayDecide && (
        <div className="notice">
          You can view orders, but only the Owner or a Manager with order
          confirmation access can decide them.
        </div>
      )}
      <SellerGroupCreator
        organizationId={orgId}
        listings={groupListings}
        onCreated={groups.reload}
      />
      <div className="purchase-section">
        <h3>Direct orders</h3>
        {orders.loading && <p>Loading orders…</p>}
        {orders.error && (
          <div className="notice notice--error">{orders.error}</div>
        )}
        {!orders.loading && !directOrders.length && (
          <p>No direct orders yet.</p>
        )}
        {directOrders.map((order) => (
          <article className="purchase-card" key={order.id}>
            <div className="purchase-card-heading">
              <div>
                <strong>{order.listing_title}</strong>
                <span>{label(order.status)}</span>
              </div>
              <small>Placed {when(order.created_at)}</small>
            </div>
            <p>
              {order.quantity} {order.unit} · {cash(order.total_minor)}
            </p>
            {order.status === "pending_seller_confirmation" && (
              <p>Respond by {when(order.seller_response_due_at)}.</p>
            )}
            {order.status === "pending_payment" && (
              <p>Buyer payment due {when(order.payment_due_at)}.</p>
            )}
            {mayDecide && order.status === "pending_seller_confirmation" && (
              <div className="purchase-actions-row">
                <button
                  className="button"
                  disabled={busy.endsWith(order.id)}
                  onClick={() =>
                    act(
                      "/organizations/" +
                        orgId +
                        "/orders/" +
                        order.id +
                        "/decision",
                      { decision: "confirm" },
                      "Order confirmed. Buyer has 3 days to pay.",
                    )
                  }
                >
                  Confirm order
                </button>
                <button
                  className="button button--quiet"
                  disabled={busy.endsWith(order.id)}
                  onClick={() =>
                    act(
                      "/organizations/" +
                        orgId +
                        "/orders/" +
                        order.id +
                        "/decision",
                      { decision: "reject" },
                      "Order rejected and its stock reservation released.",
                    )
                  }
                >
                  Reject order
                </button>
              </div>
            )}
          </article>
        ))}
      </div>
      <div className="purchase-section">
        <h3>Group orders</h3>
        {groups.loading && <p>Loading groups…</p>}
        {groups.error && (
          <div className="notice notice--error">{groups.error}</div>
        )}
        {!groups.loading && !groupItems.length && <p>No group orders yet.</p>}
        {groupItems.map((group) => {
          const joined = Number(group.joined_quantity || 0);
          const target = Number(group.target_quantity || 0);
          const reached = joined >= target;
          const passed = new Date(group.closes_at) <= new Date();
          const open = [
            "open",
            "ready_for_confirmation",
            "reconfirmation_required",
          ].includes(group.status);
          return (
            <article className="purchase-card" key={group.id}>
              <div className="purchase-card-heading">
                <div>
                  <strong>{group.listing_title}</strong>
                  <span>{label(group.status)}</span>
                </div>
                <small>Closes {when(group.closes_at)}</small>
              </div>
              <p>
                {joined} / {target} {group.unit} joined
              </p>
              <progress max={target || 1} value={Math.min(joined, target)} />
              {open && <p>{groupGuidance(reached, passed)}</p>}
              {mayDecide && open && (
                <div className="purchase-actions-row">
                  <button
                    className="button"
                    disabled={busy.endsWith(group.id) || (!reached && !passed)}
                    onClick={() =>
                      act(
                        "/organizations/" +
                          orgId +
                          "/purchase-groups/" +
                          group.id +
                          "/decision",
                        { decision: "confirm" },
                        "Group confirmed. Buyers have 3 days to pay.",
                      )
                    }
                  >
                    {reached ? "Confirm group" : "Confirm smaller group"}
                  </button>
                  {passed && !reached && (
                    <button
                      className="button button--quiet"
                      disabled={busy.endsWith(group.id)}
                      onClick={() =>
                        act(
                          "/organizations/" +
                            orgId +
                            "/purchase-groups/" +
                            group.id +
                            "/decision",
                          { decision: "expire" },
                          "Group expired and reservations released.",
                        )
                      }
                    >
                      Expire group
                    </button>
                  )}
                </div>
              )}
              {group.status === "payment_open" && (
                <p>Buyer payments are due within 3 days of confirmation.</p>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
}

function groupGuidance(reached, deadlinePassed) {
  if (reached) return "Target reached. Ready for Seller confirmation.";
  if (deadlinePassed)
    return "Deadline passed. Confirm the smaller group or expire it.";
  return "Waiting for target quantity or deadline.";
}

function SellerGroupCreator({ organizationId, listings, onCreated }) {
  const [listingId, setListingId] = useState("");
  const [target, setTarget] = useState("");
  const [deadline, setDeadline] = useState(closeDefault);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  async function create(event) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await api("/organizations/" + organizationId + "/purchase-groups", {
        method: "POST",
        body: JSON.stringify({
          listingId,
          targetQuantity: target,
          closesAt: new Date(deadline).toISOString(),
          requestKey: key(),
        }),
      });
      setNotice("Group created and open for Buyer contributions.");
      setListingId("");
      setTarget("");
      setDeadline(closeDefault());
      await onCreated();
    } catch (failure) {
      setError(failure.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <details className="purchase-create-group">
      <summary>Create a group order</summary>
      {!listings.length ? (
        <p>Publish a listing with Group or Both purchase mode first.</p>
      ) : (
        <form
          className="purchase-form purchase-create-group-form"
          onSubmit={create}
        >
          <label className="field">
            <span>Published listing</span>
            <select
              value={listingId}
              onChange={(event) => setListingId(event.target.value)}
              required
            >
              <option value="">Choose listing</option>
              {listings.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.title} · {item.quantity} {item.unit}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Target quantity</span>
            <input
              type="number"
              min="0.001"
              step="0.001"
              value={target}
              onChange={(event) => setTarget(event.target.value)}
              required
            />
          </label>
          <label className="field">
            <span>Group deadline</span>
            <input
              type="datetime-local"
              min={closeDefault()}
              value={deadline}
              onChange={(event) => setDeadline(event.target.value)}
              required
            />
          </label>
          {error && <div className="notice notice--error">{error}</div>}
          {notice && <div className="notice notice--success">{notice}</div>}
          <button className="button" disabled={busy}>
            {busy ? "Creating…" : "Create group"}
          </button>
        </form>
      )}
    </details>
  );
}
