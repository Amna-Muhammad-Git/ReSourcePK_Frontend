import {
  BarChart3,
  Boxes,
  Building2,
  ChevronDown,
  ClipboardCheck,
  LayoutDashboard,
  LogOut,
  Menu,
  PackageSearch,
  Settings,
  ShoppingBag,
  Users,
  X,
} from "lucide-react";
import { useCallback, useState } from "react";
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
import {
  Discovery,
  Requirements,
  ReviewQueue,
  SellerListings,
} from "../components/Catalog";

const roleConfig = {
  buyer: {
    label: "Buyer workspace",
    icon: ShoppingBag,
    nav: [
      [LayoutDashboard, "Overview"],
      [PackageSearch, "Discover materials"],
      [PackageSearch, "Requirements"],
      [Boxes, "My purchases"],
      [BarChart3, "Impact"],
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
        {config.nav.map(([Icon, label]) => (
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
  const active =
    config.nav.find(
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
          {!context.memberships.length && !context.platformRoles.length && (
            <StartSelling
              onCreated={async (organization) => {
                await refresh();
                navigate(`/org/${organization.slug}/listings`);
              }}
            />
          )}
          <div className="welcome">
            <div>
              <p className="eyebrow">Foundation ready</p>
              <h2>Welcome, {context.user.full_name.split(" ")[0]}.</h2>
              <p>
                Your secure workspace is active. Marketplace metrics will appear
                here as real listings and orders are created.
              </p>
            </div>
            <span className="status-pill">Verified account</span>
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
          <WorkspaceContent
            active={active}
            kind={kind}
            membership={membership}
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
function StartSelling({ onCreated }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const organization = await api("/organizations", {
        method: "POST",
        body: JSON.stringify({ name }),
      });
      await onCreated(organization);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="start-selling">
      <button
        type="button"
        className="workspace-switch"
        onClick={() => setOpen(!open)}
      >
        Start selling with this account
      </button>
      {open && (
        <form onSubmit={submit}>
          <p>
            Keep this email and password. Create your seller organization and
            become its Owner.
          </p>
          <label className="field">
            <span>Organization name</span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              minLength="2"
              maxLength="180"
            />
          </label>
          {error && (
            <p className="notice notice--error" role="alert">
              {error}
            </p>
          )}
          <button className="button" type="submit" disabled={busy}>
            {busy ? "Creating…" : "Create seller organization"}
          </button>
        </form>
      )}
    </section>
  );
}
function WorkspaceContent({ active, kind, membership }) {
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
          body: JSON.stringify({ email, role, canInviteStaff }),
        },
      );
      setMessage(
        `Invitation sent to ${result.email}. It expires in ${result.expiresInHours} hours.`,
      );
      setEmail("");
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
          Owner manages the organization, delegates operations to a Manager, and
          may invite Staff directly. Managers can invite Staff only when the
          Owner grants that permission.
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
        {Boolean(error) && <div className="notice notice--error">{error}</div>}
        {Boolean(message) && (
          <div className="notice notice--success">{message}</div>
        )}
        <button type="submit" className="button" disabled={busy}>
          {busy ? "Sending…" : "Send secure invitation"}
        </button>
      </form>
    </section>
  );
}
