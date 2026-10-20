import {
  BarChart3,
  Boxes,
  Building2,
  ChevronDown,
  ClipboardCheck,
  ClipboardList,
  Factory,
  LayoutDashboard,
  LogOut,
  Menu,
  Search,
  Settings,
  ShoppingBag,
  Users,
  UserCog,
  X,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import {
  Link,
  Navigate,
  useLocation,
  useNavigate,
  useParams,
} from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import Brand from "../components/Brand";
import { api } from "../services/api";
import useNavigationDrawer from "../hooks/useNavigationDrawer";
import { BuyerPurchases, SellerOrders } from "../components/Purchases";
import {
  Discovery,
  Requirements,
  ReviewQueue,
  SellerRequestQueue,
  SellerListings,
} from "../components/Catalog";

const roleConfig = {
  buyer: {
    label: "Buyer workspace",
    icon: ShoppingBag,
    nav: [
      [LayoutDashboard, "Overview"],
      [Search, "Discover materials"],
      [ClipboardList, "Requirements"],
      [Boxes, "My purchases"],
      [BarChart3, "Impact"],
      [Factory, "Apply to become a Seller"],
    ],
  },
  organization: {
    label: "Organization workspace",
    icon: Building2,
    nav: [
      [LayoutDashboard, "Overview"],
      [Boxes, "Listings"],
      [ShoppingBag, "Orders"],
      [Users, "Team & access"],
      [BarChart3, "Analytics"],
      [Settings, "Settings"],
    ],
  },
  platform: {
    label: "Platform operations",
    icon: ClipboardCheck,
    nav: [
      [LayoutDashboard, "Overview"],
      [Building2, "Organizations"],
      [Users, "Users"],
      [ClipboardCheck, "Review queue"],
      [Building2, "Seller applications"],
      [UserCog, "Reviewers"],
      [BarChart3, "Platform analytics"],
    ],
  },
};
const metricLabels = {
  buyer: ["Active purchases", "Pool commitments", "Recovered value"],
  organization: ["Published listings", "Open orders", "Recovered value"],
  platform: ["Active organizations", "Pending reviews", "Verified users"],
};
function WorkspaceSidebar({
  context,
  config,
  kind,
  membership,
  basePath,
  active,
  menu,
  setMenu,
  wide,
  drawerRef,
  navigate,
  logout,
}) {
  const availableKinds = [
    "buyer",
    ...(context.memberships.length ? ["organization"] : []),
    ...(context.platformRoles.length ? ["platform"] : []),
  ];
  return (
    <aside
      ref={drawerRef}
      className={menu ? "workspace-nav open" : "workspace-nav"}
      aria-label="Workspace navigation"
      role={!wide && menu ? "dialog" : undefined}
      aria-modal={!wide && menu ? true : undefined}
      aria-hidden={!wide && !menu ? true : undefined}
      inert={!wide && !menu ? "" : undefined}
    >
      <div className="workspace-brand">
        <Brand />
        <button onClick={() => setMenu(false)} aria-label="Close navigation">
          <X />
        </button>
      </div>
      <div className="workspace-kind">
        <config.icon />
        <span>
          <small>Current view</small>
          {availableKinds.length > 1 ? (
            <select
              value={kind}
              onChange={(event) => {
                navigate(
                  workspacePath(
                    event.target.value,
                    membership || context.memberships[0],
                  ),
                );
                setMenu(false);
              }}
              aria-label="Switch workspace"
            >
              {availableKinds.map((value) => (
                <option value={value} key={value}>
                  {roleConfig[value].label}
                </option>
              ))}
            </select>
          ) : (
            <strong>{config.label}</strong>
          )}
        </span>
        <ChevronDown />
      </div>
      {kind === "organization" && context.memberships.length > 1 && (
        <label className="organization-switcher">
          Organization
          <select
            aria-label="Switch organization"
            value={membership.slug}
            onChange={(event) => {
              navigate(`/org/${event.target.value}/${sectionPath(active)}`);
              setMenu(false);
            }}
          >
            {context.memberships.map((item) => (
              <option key={item.organization_id} value={item.slug}>
                {item.organization_name}
              </option>
            ))}
          </select>
        </label>
      )}
      <nav aria-label="Workspace sections">
        {config.nav
          .filter(
            ([, label]) =>
              label !== "Reviewers" ||
              context.platformRoles.includes("platform_admin"),
          )
          .map(([Icon, label]) => (
            <Link
              key={label}
              className={active === label ? "active" : ""}
              to={`${basePath}/${sectionPath(label)}`}
              aria-current={active === label ? "page" : undefined}
              onClick={() => {
                setMenu(false);
              }}
            >
              <Icon />
              {label}
            </Link>
          ))}
      </nav>
      <button className="logout" onClick={logout}>
        <LogOut /> Sign out
      </button>
    </aside>
  );
}
function defaultWorkspace(context) {
  if (context.platformRoles.length) return "platform";
  if (context.memberships.length) return "organization";
  return "buyer";
}
function sectionPath(label) {
  return label.toLowerCase().replaceAll(" & ", "-").replaceAll(" ", "-");
}
function workspacePath(kind, membership) {
  if (kind === "organization")
    return membership ? `/org/${membership.slug}` : "/buyer";
  return kind === "platform" ? "/admin" : "/buyer";
}
export function WorkspaceEntry() {
  const { context } = useAuth();
  return (
    <Navigate
      replace
      to={workspacePath(defaultWorkspace(context), context.memberships[0])}
    />
  );
}
export default function Workspace({ kind }) {
  const { context, logout, refresh } = useAuth();
  const { orgSlug } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [menu, setMenu] = useState(false);
  const closeMenu = useCallback(() => setMenu(false), []);
  const { drawerRef, triggerRef, wide } = useNavigationDrawer(menu, closeMenu);
  const membership = context.memberships.find((item) => item.slug === orgSlug);
  const config = roleConfig[kind];
  const basePath = workspacePath(kind, membership || context.memberships[0]);
  const visibleNav =
    kind === "platform" && !context.platformRoles.includes("platform_admin")
      ? config.nav.filter(([, label]) => label !== "Reviewers")
      : config.nav;
  const active =
    visibleNav.find(
      ([, label]) => location.pathname === `${basePath}/${sectionPath(label)}`,
    )?.[1] || "Overview";
  const [primaryMetric, secondaryMetric, valueMetric] = metricLabels[kind];
  const role =
    kind === "organization" ? membership?.role.replace("_", " ") : kind;
  if (
    (kind === "organization" && !membership) ||
    (kind === "platform" && !context.platformRoles.length)
  )
    return (
      <main className="marketplace-page">
        <h1>Workspace unavailable</h1>
        <p>This account does not have access to that workspace.</p>
        <Link to="/buyer">Open buyer workspace</Link>
      </main>
    );
  return (
    <div className="workspace">
      <WorkspaceSidebar
        context={context}
        config={config}
        kind={kind}
        membership={membership}
        basePath={basePath}
        active={active}
        menu={menu}
        setMenu={setMenu}
        wide={wide}
        drawerRef={drawerRef}
        navigate={navigate}
        logout={logout}
      />
      <main className="workspace-main">
        <header>
          <button
            ref={triggerRef}
            className="workspace-menu"
            onClick={() => setMenu(true)}
            aria-label="Open navigation"
          >
            <Menu />
          </button>
          <div>
            <p>{config.label}</p>
            <h1>{active}</h1>
          </div>
          <div className="user-chip">
            <span>
              {context.user.full_name
                .split(" ")
                .map((n) => n[0])
                .slice(0, 2)
                .join("")}
            </span>
            <div>
              <strong>{context.user.full_name}</strong>
              <small>{role}</small>
            </div>
          </div>
        </header>
        <section className="workspace-body">
          {context.memberships.length > 0 && !context.platformRoles.length && (
            <button
              type="button"
              className="workspace-switch"
              onClick={() =>
                navigate(
                  kind === "buyer"
                    ? workspacePath("organization", context.memberships[0])
                    : "/buyer",
                )
              }
            >
              {kind === "buyer"
                ? "Back to seller workspace"
                : "Buy materials with this account"}
            </button>
          )}
          {active !== "Apply to become a Seller" && (
            <>
              <div className="welcome">
                <div>
                  <p className="eyebrow">Foundation ready</p>
                  <h2>Welcome, {context.user.full_name.split(" ")[0]}.</h2>
                  <p>
                    Your secure workspace is active. Marketplace metrics will
                    appear here as real listings and orders are created.
                  </p>
                </div>
              </div>
              <div className="metric-grid">
                <Metric label={primaryMetric} />
                <Metric label={secondaryMetric} />
                <Metric label="Material diverted" unit="kg" />
                <Metric
                  label={valueMetric}
                  unit={kind === "platform" ? "" : "PKR"}
                />
              </div>
            </>
          )}
          <WorkspaceContent
            active={active}
            kind={kind}
            membership={membership}
            context={context}
            refresh={refresh}
          />
        </section>
      </main>
      {menu && !wide && (
        <button
          className="nav-scrim"
          onClick={() => setMenu(false)}
          aria-label="Close navigation"
        />
      )}
    </div>
  );
}
function StartSelling({ context, refresh }) {
  const open = true;
  const [form, setForm] = useState({
    applicantName: context.user.full_name || "",
    cnicNumber: "",
    organizationName: "",
    contactNumber: "",
    businessAddress: "",
  });
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    let active = true;
    api("/seller/requests/mine")
      .then((result) => {
        if (!active) return;
        setRequests(result);
        if (result[0])
          setForm((current) => ({
            ...current,
            applicantName: result[0].applicant_name || current.applicantName,
            organizationName: result[0].organization_name || "",
            contactNumber: result[0].contact_number || "",
            businessAddress: result[0].business_address || "",
          }));
      })
      .catch((err) => active && setError(err.message))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, []);
  const latest = requests[0];
  const update = (event) =>
    setForm({ ...form, [event.target.name]: event.target.value });
  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const created = await api("/seller/requests", {
        method: "POST",
        body: JSON.stringify(form),
      });
      setRequests([
        created,
        ...requests.filter((item) => item.id !== created.id),
      ]);
      setMessage(
        latest?.status === "pending"
          ? "Your pending Seller application was updated."
          : "Your Seller application was submitted for platform review.",
      );
      setForm({ ...form, cnicNumber: "" });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }
  async function openSellerWorkspace() {
    const updated = await refresh();
    const approvedMembership = updated?.memberships?.[0];
    if (approvedMembership)
      window.location.assign(`/org/${approvedMembership.slug}/listings`);
  }
  const submitLabel =
    latest?.status === "pending"
      ? "Update pending application"
      : "Submit Seller application";
  return (
    <section className="start-selling">
      {open && loading && (
        <p className="form-hint">Loading Seller application status…</p>
      )}
      {open && latest?.status === "pending" && (
        <div className="notice notice--success" role="status">
          Seller application for {latest.organization_name} is awaiting platform
          review. You can update the application while it is pending.
        </div>
      )}
      {open && latest?.status === "approved" && (
        <div>
          <p className="notice notice--success">
            Seller access is approved. Your Buyer access remains active.
          </p>
          <button
            className="button"
            type="button"
            onClick={openSellerWorkspace}
          >
            Open Seller workspace
          </button>
        </div>
      )}
      {open &&
        !loading &&
        (!latest ||
          latest.status === "rejected" ||
          latest.status === "pending") && (
          <form onSubmit={submit}>
            <p>
              Submit your details for review. Seller access and the organization
              workspace are created only after approval.
            </p>
            {latest?.status === "rejected" && (
              <p className="notice notice--error">
                Previous application was not approved:{" "}
                {latest.review_note ||
                  "Please update your details and apply again."}
              </p>
            )}
            {latest?.status === "pending" && (
              <p className="form-hint">
                For privacy, your saved CNIC is not displayed. Re-enter it to
                save updated application details.
              </p>
            )}
            <label className="field">
              <span>Applicant name</span>
              <input
                name="applicantName"
                value={form.applicantName}
                onChange={update}
                required
                minLength="2"
                maxLength="120"
                autoComplete="name"
              />
            </label>
            <label className="field">
              <span>CNIC number</span>
              <input
                name="cnicNumber"
                value={form.cnicNumber}
                onChange={update}
                required
                inputMode="numeric"
                placeholder="12345-1234567-1"
                pattern="(?:[0-9]{13}|[0-9]{5}-[0-9]{7}-[0-9]|[0-9]{5} [0-9]{7} [0-9])"
                autoComplete="off"
              />
            </label>
            <label className="field">
              <span>Company or mill name</span>
              <input
                name="organizationName"
                value={form.organizationName}
                onChange={update}
                required
                minLength="2"
                maxLength="180"
                autoComplete="organization"
              />
            </label>
            <label className="field">
              <span>Contact number</span>
              <input
                name="contactNumber"
                value={form.contactNumber}
                onChange={update}
                required
                minLength="7"
                maxLength="32"
                autoComplete="tel"
              />
            </label>
            <label className="field">
              <span>Mill or business address</span>
              <textarea
                name="businessAddress"
                value={form.businessAddress}
                onChange={update}
                required
                minLength="5"
                maxLength="500"
                autoComplete="street-address"
              />
            </label>
            {message && (
              <p className="notice notice--success" role="status">
                {message}
              </p>
            )}
            {error && (
              <p className="notice notice--error" role="alert">
                {error}
              </p>
            )}
            <button className="button" type="submit" disabled={busy}>
              {busy ? "Saving…" : submitLabel}
            </button>
          </form>
        )}
    </section>
  );
}
function WorkspaceContent({ active, kind, membership, context, refresh }) {
  if (active === "Team & access" && kind === "organization")
    return <TeamAccess membership={membership} />;
  if (active === "Listings" && kind === "organization")
    return (
      <SellerListings
        key={membership.organization_id}
        membership={membership}
      />
    );
  if (active === "Discover materials" && kind === "buyer") return <Discovery />;
  if (active === "Requirements" && kind === "buyer") return <Requirements />;
  if (active === "Review queue" && kind === "platform") return <ReviewQueue />;
  if (active === "Seller applications" && kind === "platform")
    return <SellerRequestQueue />;
  const purchaseSection = {
    "buyer:My purchases": <BuyerPurchases />,
    "buyer:Apply to become a Seller": (
      <StartSelling context={context} refresh={refresh} />
    ),
    "organization:Orders": <SellerOrders membership={membership} />,
    "platform:Reviewers": <PlatformReviewers context={context} />,
  }[kind + ":" + active];
  if (purchaseSection) return purchaseSection;
  return (
    <div className="empty-panel">
      <div className="empty-art">
        <i />
        <i />
        <i />
      </div>
      <div>
        <p className="eyebrow">Live data only</p>
        <h3>Your activity will build this view.</h3>
        <p>
          No fabricated numbers are shown. Date filters, charts and downloadable
          reports will populate from completed marketplace events in the
          analytics phase.
        </p>
      </div>
    </div>
  );
}
function PlatformReviewers({ context }) {
  const [email, setEmail] = useState("");
  const [permissions, setPermissions] = useState([]);
  const [reviewers, setReviewers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [saving, setSaving] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const isAdmin = context.platformRoles.includes("platform_admin");
  const options = [
    ["seller_requests.review", "Review Seller applications"],
    ["listings.review", "Review material listings"],
  ];
  const load = useCallback(async () => {
    setLoading(true);
    try {
      setReviewers(await api("/platform/reviewers"));
      setError("");
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    if (!isAdmin) return undefined;
    const timer = window.setTimeout(load, 0);
    return () => window.clearTimeout(timer);
  }, [isAdmin, load]);
  if (!isAdmin)
    return (
      <section className="team-panel">
        <p>Reviewer management is available to Platform Admins only.</p>
      </section>
    );
  async function invite(event) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const result = await api("/platform/reviewers", {
        method: "POST",
        body: JSON.stringify({ email, permissions }),
      });
      setNotice(
        `Reviewer invitation sent to ${result.email}. It expires in ${result.expiresInHours} hours.`,
      );
      setEmail("");
      setPermissions([]);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  async function updateReviewer(reviewer, grants) {
    setSaving(reviewer.user_id);
    setError("");
    setNotice("");
    try {
      await api(`/platform/reviewers/${reviewer.user_id}/permissions`, {
        method: "PUT",
        body: JSON.stringify({ permissions: grants }),
      });
      setNotice(`Permissions updated for ${reviewer.full_name}.`);
      await load();
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving("");
    }
  }
  async function revokeReviewer(reviewer) {
    if (
      !window.confirm(
        `Revoke Platform Reviewer access for ${reviewer.full_name}?`,
      )
    )
      return;
    setSaving(reviewer.user_id);
    setError("");
    setNotice("");
    try {
      await api(`/platform/reviewers/${reviewer.user_id}`, {
        method: "DELETE",
      });
      setNotice(`Platform Reviewer access revoked for ${reviewer.full_name}.`);
      await load();
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving("");
    }
  }
  return (
    <section className="reviewer-admin">
      <div className="reviewer-admin-intro">
        <p className="eyebrow">Platform access</p>
        <h2>Manage Reviewers</h2>
        <p>
          Invite trusted reviewers and give each only the review access they
          need. You can change permissions or revoke access at any time.
        </p>
      </div>
      <form className="reviewer-invite-form" onSubmit={invite}>
        <label className="field">
          <span>Reviewer email</span>
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="reviewer@example.com"
            required
          />
        </label>
        <fieldset className="staff-permission-fieldset">
          <legend>Grant permissions</legend>
          {options.map(([value, label]) => (
            <label className="check" key={value}>
              <input
                type="checkbox"
                checked={permissions.includes(value)}
                onChange={(event) =>
                  setPermissions((current) =>
                    event.target.checked
                      ? [...current, value]
                      : current.filter((item) => item !== value),
                  )
                }
              />
              {label}
            </label>
          ))}
        </fieldset>
        <button className="button" type="submit" disabled={busy}>
          {busy ? "Sending…" : "Invite Reviewer"}
        </button>
      </form>
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
      <div className="team-members">
        <div className="team-members-heading">
          <div>
            <p className="eyebrow">Active platform accounts</p>
            <h4>Reviewers</h4>
          </div>
          <button
            type="button"
            className="button button--quiet"
            onClick={load}
            disabled={loading}
          >
            Refresh
          </button>
        </div>
        {loading && <p>Loading Reviewers…</p>}
        {!loading && reviewers.length === 0 && <p>No active Reviewers yet.</p>}
        {!loading &&
          reviewers.map((reviewer) => (
            <ReviewerAccessRow
              key={reviewer.user_id}
              reviewer={reviewer}
              options={options}
              busy={saving === reviewer.user_id}
              onSave={(grants) => updateReviewer(reviewer, grants)}
              onRevoke={() => revokeReviewer(reviewer)}
            />
          ))}
      </div>
    </section>
  );
}

function ReviewerAccessRow({ reviewer, options, busy, onSave, onRevoke }) {
  const [permissions, setPermissions] = useState(reviewer.permissions || []);
  return (
    <article className="team-member-row reviewer-access-row">
      <div className="team-member-identity">
        <strong>{reviewer.full_name}</strong>
        <span>{reviewer.email}</span>
      </div>
      <div className="team-member-permissions">
        {options.map(([value, label]) => (
          <label className="check" key={value}>
            <input
              type="checkbox"
              checked={permissions.includes(value)}
              onChange={(event) =>
                setPermissions((current) =>
                  event.target.checked
                    ? [...current, value]
                    : current.filter((item) => item !== value),
                )
              }
            />
            {label}
          </label>
        ))}
      </div>
      <div className="reviewer-actions">
        <button
          type="button"
          className="button button--quiet"
          disabled={busy}
          onClick={() => onSave(permissions)}
        >
          {busy ? "Saving…" : "Save permissions"}
        </button>
        <button
          type="button"
          className="button button--quiet"
          disabled={busy}
          onClick={onRevoke}
        >
          Revoke access
        </button>
      </div>
    </article>
  );
}

function Metric({ label, unit }) {
  return (
    <article className="metric">
      <span>{label}</span>
      <strong>—</strong>
      <small>{unit || "No activity yet"}</small>
    </article>
  );
}

function TeamAccess({ membership }) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("staff");
  const [canInviteStaff, setCanInviteStaff] = useState(false);
  const [staffPermissions, setStaffPermissions] = useState([]);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const mayInvite =
    membership.role === "owner" ||
    (membership.role === "manager" && membership.can_invite_staff);
  const roles =
    membership.role === "manager" ? ["staff"] : ["manager", "staff"];
  if (!mayInvite)
    return (
      <section className="team-panel">
        <div>
          <p className="eyebrow">Permission boundary</p>
          <h3>Team access is managed by your organization.</h3>
          <p>
            Your current role cannot issue invitations. An Owner or Organization
            Owner can update team access.
          </p>
        </div>
      </section>
    );
  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    setError("");
    try {
      const result = await api(
        `/organizations/${membership.organization_id}/invitations`,
        {
          method: "POST",
          body: JSON.stringify({
            email,
            role,
            canInviteStaff: role === "manager" && canInviteStaff,
            staffPermissions: role === "staff" ? staffPermissions : [],
          }),
        },
      );
      setMessage(
        `Invitation sent to ${result.email}. It expires in ${result.expiresInHours} hours.`,
      );
      setEmail("");
      setStaffPermissions([]);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="team-panel">
      <div>
        <p className="eyebrow">Controlled delegation</p>
        <h3>Invite a teammate</h3>
        <p>
          Invitations are email-bound, single-use and expire after 72 hours. The
          Owners can invite Managers and Staff. Managers can invite Staff only
          when the Owner grants that permission. Assign Staff access to view or
          manage listings here; the API enforces these permissions.
        </p>
      </div>
      <form onSubmit={submit}>
        <label className="field">
          <span>Work email</span>
          <input
            type="email"
            name="inviteeEmail"
            autoComplete="off"
            placeholder="teammate@company.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </label>
        <label className="field">
          <span>Role</span>
          <select value={role} onChange={(e) => setRole(e.target.value)}>
            {roles.map((item) => (
              <option value={item} key={item}>
                {item.replace("_", " ")}
              </option>
            ))}
          </select>
        </label>
        {role === "manager" && (
          <label className="check">
            <input
              type="checkbox"
              checked={canInviteStaff}
              onChange={(e) => setCanInviteStaff(e.target.checked)}
            />{" "}
            Allow this manager to invite staff
          </label>
        )}
        {role === "staff" && (
          <fieldset className="staff-permission-fieldset">
            <legend>Staff access</legend>
            {["listings.view", "listings.manage"].map((permission) => (
              <label className="check" key={permission}>
                <input
                  type="checkbox"
                  checked={staffPermissions.includes(permission)}
                  onChange={(event) =>
                    setStaffPermissions((current) =>
                      event.target.checked
                        ? [...current, permission]
                        : current.filter((item) => item !== permission),
                    )
                  }
                />
                {permission === "listings.view"
                  ? "View listings"
                  : "Create and manage listings"}
              </label>
            ))}
          </fieldset>
        )}
        {Boolean(error) && <div className="notice notice--error">{error}</div>}
        {Boolean(message) && (
          <div className="notice notice--success">{message}</div>
        )}
        <button type="submit" className="button" disabled={busy}>
          {busy ? "Sending…" : "Send secure invitation"}
        </button>
      </form>
      <StaffAccessList membership={membership} />
    </section>
  );
}

function StaffAccessList({ membership }) {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [saving, setSaving] = useState("");
  const canManage = membership.role === "owner" || membership.can_invite_staff;
  const load = useCallback(async () => {
    setLoading(true);
    try {
      setMembers(
        await api(`/organizations/${membership.organization_id}/members`),
      );
      setError("");
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [membership.organization_id]);
  useEffect(() => {
    if (!canManage) return undefined;
    const timer = window.setTimeout(load, 0);
    return () => window.clearTimeout(timer);
  }, [canManage, load]);
  if (!canManage) return null;
  const staff = members.filter((member) => member.role === "staff");
  async function save(member, permissions) {
    setSaving(member.membership_id);
    setError("");
    setNotice("");
    try {
      await api(
        `/organizations/${membership.organization_id}/members/${member.membership_id}/permissions`,
        {
          method: "PATCH",
          body: JSON.stringify({ permissions }),
        },
      );
      setNotice(`Access updated for ${member.full_name}.`);
      await load();
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving("");
    }
  }
  return (
    <div className="team-members">
      <div className="team-members-heading">
        <div>
          <p className="eyebrow">Team permissions</p>
          <h4>Manage Staff access</h4>
        </div>
        <button
          type="button"
          className="button button--quiet"
          onClick={load}
          disabled={loading}
        >
          Refresh
        </button>
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
      {loading && <p>Loading Staff…</p>}
      {!loading && staff.length === 0 && <p>No active Staff members yet.</p>}
      {!loading &&
        staff.map((member) => (
          <StaffAccessRow
            key={`${member.membership_id}:${(member.permissions || []).join(",")}`}
            member={member}
            saving={saving === member.membership_id}
            onSave={(permissions) => save(member, permissions)}
          />
        ))}
    </div>
  );
}

function StaffAccessRow({ member, saving, onSave }) {
  const [permissions, setPermissions] = useState(member.permissions || []);
  return (
    <article className="team-member-row">
      <div className="team-member-identity">
        <strong>{member.full_name}</strong>
        <span>{member.email}</span>
      </div>
      <div className="team-member-permissions">
        {[
          ["listings.view", "View listings"],
          ["listings.manage", "Create and manage listings"],
        ].map(([permission, label]) => (
          <label className="check" key={permission}>
            <input
              type="checkbox"
              checked={permissions.includes(permission)}
              onChange={(event) =>
                setPermissions((current) => {
                  if (event.target.checked) return [...current, permission];
                  return current.filter((item) => item !== permission);
                })
              }
            />
            {label}
          </label>
        ))}
      </div>
      <button
        type="button"
        className="button button--quiet"
        disabled={saving}
        onClick={() => onSave(permissions)}
      >
        {saving ? "Saving…" : "Save access"}
      </button>
    </article>
  );
}
