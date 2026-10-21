import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../services/api";
import { useAuth } from "../hooks/useAuth";
import { formatCurrency } from "../utils/formatters";

const cash = (minor) => formatCurrency(Number(minor || 0) / 100);
const readable = (value) => String(value || "—").replaceAll("_", " ");
const date = (value) => (value ? new Date(value).toLocaleDateString() : "—");
const quantityByUnit = (values = []) =>
  values.length
    ? values.map((item) => `${item.quantity} ${item.unit}`).join(" · ")
    : "No recorded quantity";

function useRemoteData(path) {
  const [result, setResult] = useState({ path: "", revision: -1 });
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    if (!path) return undefined;
    let active = true;
    api(path)
      .then((data) => active && setResult({ path, revision, data, error: "" }))
      .catch(
        (failure) =>
          active &&
          setResult({ path, revision, data: null, error: failure.message }),
      );
    return () => {
      active = false;
    };
  }, [path, revision]);
  const current = result.path === path && result.revision === revision;
  return {
    data: current ? result.data : null,
    loading: !current,
    error: current ? result.error : "",
    reload: () => setRevision((value) => value + 1),
  };
}

function PageHeading({ eyebrow, title, description, onRefresh, loading }) {
  return (
    <div className="data-page-heading">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h2>{title}</h2>
        <p>{description}</p>
      </div>
      {onRefresh && (
        <button
          type="button"
          className="button button--quiet"
          onClick={onRefresh}
          disabled={loading}
        >
          {loading ? "Refreshing…" : "Refresh"}
        </button>
      )}
    </div>
  );
}

function StateMessage({ loading, error, empty, onRetry }) {
  if (loading) return <p className="data-state">Loading live data…</p>;
  if (error)
    return (
      <div className="notice notice--error" role="alert">
        <span>{error}</span>
        {onRetry && (
          <button className="text-action" type="button" onClick={onRetry}>
            Try again
          </button>
        )}
      </div>
    );
  if (empty) return <p className="data-state">No records yet.</p>;
  return null;
}

function StatGrid({ items }) {
  return (
    <div className="data-stat-grid">
      {items.map(([label, value, detail]) => (
        <article className="data-stat" key={label}>
          <span>{label}</span>
          <strong>{value ?? "—"}</strong>
          {detail && <small>{detail}</small>}
        </article>
      ))}
    </div>
  );
}

function SimpleTable({ columns, rows, loading, error, onRetry }) {
  return (
    <div className="data-table-wrap">
      <StateMessage
        loading={loading}
        error={error}
        empty={!loading && !error && !rows.length}
        onRetry={onRetry}
      />
      {!loading && !error && rows.length > 0 && (
        <table className="data-table">
          <thead>
            <tr>
              {columns.map(([label]) => (
                <th key={label}>{label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr key={row.id || row.organization_id || index}>
                {columns.map(([label, render]) => (
                  <td key={label}>{render(row)}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

function DataBadge({ children, tone = "" }) {
  const className = ["data-badge", tone].filter(Boolean).join(" ");
  return <span className={className}>{children}</span>;
}

export function BuyerImpact() {
  const remote = useRemoteData("/analytics/buyer-impact");
  const summary = remote.data?.summary || {};
  const recent = remote.data?.recent || [];
  return (
    <section className="data-page">
      <PageHeading
        eyebrow="Buyer activity"
        title="Purchases & material impact"
        description="Track your orders and paid material volume from live marketplace records. Environmental diversion is only reported when verified impact data is available."
        onRefresh={remote.reload}
        loading={remote.loading}
      />
      <StateMessage
        loading={remote.loading}
        error={remote.error}
        onRetry={remote.reload}
      />
      {remote.data && (
        <>
          <StatGrid
            items={[
              ["Orders placed", summary.order_count],
              ["Awaiting seller", summary.awaiting_seller],
              ["Awaiting payment", summary.awaiting_payment],
              [
                "Paid material",
                quantityByUnit(summary.paid_quantity_by_unit),
                `${summary.paid_orders || 0} paid orders · ${cash(summary.paid_total_minor)}`,
              ],
            ]}
          />
          <div className="data-panel">
            <div className="data-panel-heading">
              <div>
                <p className="eyebrow">Recent activity</p>
                <h3>Your latest orders</h3>
              </div>
              <Link className="text-action" to="/buyer/my-purchases">
                Open purchases
              </Link>
            </div>
            <SimpleTable
              columns={[
                ["Material", (row) => <strong>{row.listing_title}</strong>],
                ["Seller", (row) => row.organization_name],
                ["Quantity", (row) => `${row.quantity} ${row.unit}`],
                ["Order value", (row) => cash(row.total_minor)],
                [
                  "Status",
                  (row) => <DataBadge>{readable(row.status)}</DataBadge>,
                ],
                ["Placed", (row) => date(row.created_at)],
              ]}
              rows={recent}
              loading={remote.loading}
              error={remote.error}
              onRetry={remote.reload}
            />
          </div>
        </>
      )}
    </section>
  );
}

function overviewPath(kind, membership, context) {
  if (kind === "buyer") return "/analytics/buyer-impact";
  if (kind === "organization") {
    const mayView =
      membership?.role === "owner" ||
      (membership?.role === "manager" &&
        membership.permissions?.includes("orders.confirm"));
    return mayView
      ? `/organizations/${membership.organization_id}/analytics`
      : null;
  }
  return context.platformRoles.includes("platform_admin")
    ? "/platform/analytics"
    : null;
}

function overviewMetrics(kind, data) {
  if (kind === "buyer") {
    const summary = data?.summary || {};
    return [
      ["Orders placed", summary.order_count],
      ["Awaiting seller", summary.awaiting_seller],
      ["Awaiting payment", summary.awaiting_payment],
      ["Paid orders", summary.paid_orders],
    ];
  }
  if (kind === "organization") {
    const listings = data?.listings || {};
    const orders = data?.orders || {};
    return [
      ["Published listings", listings.published],
      ["Draft listings", listings.drafts],
      ["Orders", orders.total],
      ["Awaiting response", orders.awaiting_response],
    ];
  }
  const users = data?.users || {};
  const organizations = data?.organizations || {};
  const listings = data?.listings || {};
  const orders = data?.orders || {};
  return [
    ["Active organizations", organizations.active],
    ["Pending reviews", listings.pending_review],
    ["Recorded paid value", cash(orders.paid_total_minor)],
    ["Verified users", users.verified],
  ];
}

export function WorkspaceOverview({ kind, membership, context }) {
  const path = overviewPath(kind, membership, context);
  const remote = useRemoteData(path || "");

  if (!path) {
    return (
      <div className="data-panel overview-note">
        <p className="eyebrow">Workspace ready</p>
        <h3>Welcome, {context.user.full_name.split(" ")[0]}.</h3>
        <p>
          {kind === "organization"
            ? "Your workspace is ready. Available pages follow the permissions granted by your Owner."
            : "Your account is ready. Open an available page to continue."}
        </p>
      </div>
    );
  }

  const items = overviewMetrics(kind, remote.data);
  const description = {
    buyer: "Your order activity from live marketplace records.",
    organization: "Your listing and order activity. Demo stock is excluded.",
    platform: "Platform operations from live, non-demo marketplace data.",
  }[kind];
  return (
    <section className="data-page overview-data">
      <div className="data-page-heading">
        <div>
          <p className="eyebrow">Workspace overview</p>
          <h2>Welcome, {context.user.full_name.split(" ")[0]}.</h2>
          <p>{description}</p>
        </div>
        <button
          type="button"
          className="button button--quiet"
          onClick={remote.reload}
          disabled={remote.loading}
        >
          {remote.loading ? "Refreshing…" : "Refresh"}
        </button>
      </div>
      <StateMessage
        loading={remote.loading}
        error={remote.error}
        onRetry={remote.reload}
      />
      {remote.data && <StatGrid items={items} />}
      <p className="form-hint">
        {kind === "platform"
          ? "Recorded payment states are operational counts, not settlement or revenue reporting."
          : "Only data recorded by the marketplace is shown; no impact estimates are fabricated."}
      </p>
    </section>
  );
}

export function SellerAnalytics({ membership }) {
  const remote = useRemoteData(
    `/organizations/${membership.organization_id}/analytics`,
  );
  const data = remote.data;
  const monthly = data?.monthly || [];
  const maxOrders = Math.max(1, ...monthly.map((item) => Number(item.orders)));
  return (
    <section className="data-page">
      <PageHeading
        eyebrow="Organization reporting"
        title="Seller analytics"
        description="Live listing and order activity for this organization. Demo listings are excluded from these figures."
        onRefresh={remote.reload}
        loading={remote.loading}
      />
      <StateMessage
        loading={remote.loading}
        error={remote.error}
        onRetry={remote.reload}
      />
      {data && (
        <>
          <StatGrid
            items={[
              ["Published listings", data.listings.published],
              ["Draft listings", data.listings.drafts],
              ["Pending review", data.listings.pending_review],
              [
                "Orders",
                data.orders.total,
                `${data.orders.paid} recorded as paid`,
              ],
              ["Awaiting response", data.orders.awaiting_response],
              [
                "Requested quantity",
                quantityByUnit(data.orders.requested_quantity_by_unit),
              ],
              ["Recorded paid value", cash(data.orders.paid_total_minor)],
            ]}
          />
          <div className="data-panel">
            <div className="data-panel-heading">
              <div>
                <p className="eyebrow">Last six months</p>
                <h3>Order activity</h3>
              </div>
            </div>
            {!monthly.length ? (
              <p className="data-state">No orders in this period.</p>
            ) : (
              <div className="data-bars" aria-label="Monthly order counts">
                {monthly.map((item) => (
                  <div className="data-bar-item" key={item.month}>
                    <strong>{item.orders}</strong>
                    <span className="data-bar-track">
                      <i
                        style={{
                          height: `${Math.max(8, (Number(item.orders) / maxOrders) * 100)}%`,
                        }}
                      />
                    </span>
                    <small>
                      {new Date(`${item.month}T00:00:00`).toLocaleDateString(
                        undefined,
                        { month: "short", year: "2-digit" },
                      )}
                    </small>
                  </div>
                ))}
              </div>
            )}
            <p className="form-hint">
              Recorded order and payment states only; this is not a settlement
              or verified impact report.
            </p>
          </div>
        </>
      )}
    </section>
  );
}

export function OrganizationSettings({ membership }) {
  const remote = useRemoteData(
    `/organizations/${membership.organization_id}/settings`,
  );
  const { refresh } = useAuth();
  const [name, setName] = useState(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  async function save(event) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const result = await api(
        `/organizations/${membership.organization_id}/settings`,
        {
          method: "PATCH",
          body: JSON.stringify({ name: name ?? remote.data.name }),
        },
      );
      setName(result.name);
      await refresh();
      setNotice("Organization name updated.");
      window.dispatchEvent(new Event("resourcepk-organization-updated"));
    } catch (failure) {
      setError(failure.message);
    } finally {
      setBusy(false);
    }
  }
  const isOwner = membership.role === "owner";
  return (
    <section className="data-page">
      <PageHeading
        eyebrow="Organization profile"
        title="Settings"
        description="Manage the organization name and review its current account details."
        onRefresh={remote.reload}
        loading={remote.loading}
      />
      <StateMessage
        loading={remote.loading}
        error={remote.error}
        onRetry={remote.reload}
      />
      {remote.data && (
        <div className="data-panel settings-panel">
          <form className="settings-form" onSubmit={save}>
            <label className="field">
              <span>Organization name</span>
              <input
                value={name ?? remote.data.name}
                onChange={(event) => setName(event.target.value)}
                minLength="2"
                maxLength="180"
                required
                disabled={!isOwner}
              />
            </label>
            <div className="settings-readonly">
              <span>Workspace address</span>
              <strong>/org/{remote.data.slug}</strong>
            </div>
            <div className="settings-readonly">
              <span>Account status</span>
              <DataBadge>{readable(remote.data.status)}</DataBadge>
            </div>
            <div className="settings-readonly">
              <span>Your role</span>
              <DataBadge>{readable(remote.data.role)}</DataBadge>
            </div>
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
            {isOwner ? (
              <button
                className="button"
                disabled={
                  busy || (name ?? remote.data.name) === remote.data.name
                }
              >
                {busy ? "Saving…" : "Save organization settings"}
              </button>
            ) : (
              <p className="form-hint">
                Only the Owner can change organization settings.
              </p>
            )}
          </form>
        </div>
      )}
    </section>
  );
}

function DirectoryPage({ title, eyebrow, description, path, columns }) {
  const [offset, setOffset] = useState(0);
  const remote = useRemoteData(`${path}?limit=50&offset=${offset}`);
  const page = remote.data;
  return (
    <section className="data-page">
      <PageHeading
        eyebrow={eyebrow}
        title={title}
        description={description}
        onRefresh={remote.reload}
        loading={remote.loading}
      />
      <div className="data-panel">
        <SimpleTable
          columns={columns}
          rows={page?.items || []}
          loading={remote.loading}
          error={remote.error}
          onRetry={remote.reload}
        />
        {page && page.total > 50 && (
          <div className="data-pagination">
            <span>
              {offset + 1}–{Math.min(offset + 50, page.total)} of {page.total}
            </span>
            <div>
              <button
                className="button button--quiet"
                disabled={!offset || remote.loading}
                onClick={() => setOffset(Math.max(0, offset - 50))}
              >
                Previous
              </button>
              <button
                className="button button--quiet"
                disabled={offset + 50 >= page.total || remote.loading}
                onClick={() => setOffset(offset + 50)}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

export function PlatformOrganizations() {
  return (
    <DirectoryPage
      title="Organizations"
      eyebrow="Platform directory"
      description="Seller workspaces and their current listing and membership counts. Demo fixtures are marked for clarity."
      path="/platform/organizations"
      columns={[
        ["Organization", (row) => <strong>{row.name}</strong>],
        ["Workspace", (row) => row.slug],
        ["Status", (row) => <DataBadge>{readable(row.status)}</DataBadge>],
        ["Members", (row) => row.member_count],
        ["Listings", (row) => row.listing_count],
        ["Created", (row) => date(row.created_at)],
        [
          "Data",
          (row) =>
            row.is_demo ? (
              <DataBadge tone="demo">Demo</DataBadge>
            ) : (
              <DataBadge tone="live">Live</DataBadge>
            ),
        ],
      ]}
    />
  );
}

export function PlatformUsers() {
  return (
    <DirectoryPage
      title="Users"
      eyebrow="Platform directory"
      description="Account status, verification, and workspace roles. Demo accounts are explicitly labelled."
      path="/platform/users"
      columns={[
        ["User", (row) => <strong>{row.full_name}</strong>],
        ["Email", (row) => row.email],
        ["Status", (row) => <DataBadge>{readable(row.status)}</DataBadge>],
        [
          "Organization roles",
          (row) =>
            (row.organization_roles || []).map(readable).join(", ") || "Buyer",
        ],
        [
          "Platform roles",
          (row) => (row.platform_roles || []).map(readable).join(", ") || "—",
        ],
        ["Verified", (row) => (row.email_verified_at ? "Yes" : "No")],
        [
          "Account",
          (row) =>
            row.is_demo ? (
              <DataBadge tone="demo">Demo</DataBadge>
            ) : (
              <DataBadge tone="live">Live</DataBadge>
            ),
        ],
      ]}
    />
  );
}

export function PlatformAnalytics() {
  const remote = useRemoteData("/platform/analytics");
  const data = remote.data;
  const activity = data?.auditActivity || [];
  const max = Math.max(1, ...activity.map((item) => Number(item.events)));
  return (
    <section className="data-page">
      <PageHeading
        eyebrow="Platform health"
        title="Platform analytics"
        description="Operational counts from live accounts and non-demo marketplace activity. No synthetic seed activity is included in the totals."
        onRefresh={remote.reload}
        loading={remote.loading}
      />
      <StateMessage
        loading={remote.loading}
        error={remote.error}
        onRetry={remote.reload}
      />
      {data && (
        <>
          <h3 className="data-section-title">Accounts and moderation</h3>
          <StatGrid
            items={[
              [
                "Verified users",
                data.users.verified,
                `${data.users.total} live accounts`,
              ],
              [
                "Active organizations",
                data.organizations.active,
                `${data.organizations.total} live workspaces`,
              ],
              [
                "Published listings",
                data.listings.published,
                `${data.listings.total} live listings`,
              ],
              ["Pending listing reviews", data.listings.pending_review],
              ["Pending Seller applications", data.applications.pending],
              [
                "Recorded orders",
                data.orders.total,
                `${data.orders.awaiting_seller} awaiting seller`,
              ],
              [
                "Paid order records",
                data.orders.paid,
                cash(data.orders.paid_total_minor),
              ],
            ]}
          />
          <div className="data-panel">
            <div className="data-panel-heading">
              <div>
                <p className="eyebrow">Recent 14 days</p>
                <h3>Audit activity</h3>
              </div>
            </div>
            {!activity.length ? (
              <p className="data-state">No audit events in the last 14 days.</p>
            ) : (
              <div className="data-bars">
                {activity.map((item) => (
                  <div className="data-bar-item" key={item.day}>
                    <strong>{item.events}</strong>
                    <span className="data-bar-track">
                      <i
                        style={{
                          height: `${Math.max(8, (Number(item.events) / max) * 100)}%`,
                        }}
                      />
                    </span>
                    <small>
                      {new Date(`${item.day}T00:00:00`).toLocaleDateString(
                        undefined,
                        { month: "short", day: "numeric" },
                      )}
                    </small>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </section>
  );
}
