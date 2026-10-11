import { useEffect, useState } from "react";
import { api, downloadFile } from "../services/api";
import FormField from "./FormField";
import {
  ListingImage,
  ListingImagesEditor,
  PriceTiers,
  TierEditor,
} from "./CatalogMedia";

const emptyListing = {
  title: "",
  description: "",
  material: "",
  condition: "",
  unit: "kg",
  quantity: "",
  minOrderQuantity: "",
  pricePerUnit: "",
  color: "",
  composition: "",
  location: "",
  priceTiers: [],
};
const units = ["kg", "meter", "roll", "piece"];
const price = (value) => `PKR ${Number(value).toLocaleString("en-PK")}`;

export function Discovery() {
  const [filters, setFilters] = useState({
    q: "",
    material: "",
    sort: "newest",
  });
  const [search, setSearch] = useState({
    q: "",
    material: "",
    sort: "newest",
    page: 1,
  });
  const [result, setResult] = useState({
    items: [],
    total: 0,
    page: 1,
    limit: 12,
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let active = true;
    api(`/listings?${new URLSearchParams(search)}`)
      .then((data) => {
        if (active) {
          setResult(data);
          setError("");
        }
      })
      .catch((err) => {
        if (active) setError(err.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [search]);
  return (
    <section className="catalog-panel">
      <p className="eyebrow">Live exchange</p>
      <h2>Discover surplus material</h2>
      <form
        className="catalog-filters"
        onSubmit={(e) => {
          e.preventDefault();
          setLoading(true);
          setError("");
          setSearch({ ...filters, page: 1 });
        }}
      >
        <FormField
          label="Search"
          value={filters.q}
          onChange={(e) => setFilters({ ...filters, q: e.target.value })}
          placeholder="Denim, cotton, canvas…"
        />
        <FormField
          label="Material"
          value={filters.material}
          onChange={(e) => setFilters({ ...filters, material: e.target.value })}
        />
        <label className="field">
          <span>Sort</span>
          <select
            value={filters.sort}
            onChange={(e) => setFilters({ ...filters, sort: e.target.value })}
          >
            <option value="newest">Newest</option>
            <option value="price_asc">Lowest price</option>
            <option value="price_desc">Highest price</option>
          </select>
        </label>
        <button className="button" type="submit">
          Find materials
        </button>
      </form>
      {error && (
        <p role="alert" className="notice notice--error">
          {error}
        </p>
      )}
      {loading && <p role="status">Loading materials…</p>}
      {!loading && !error && !result.items.length && (
        <p>No published materials match yet. Try a broader search.</p>
      )}
      <div className="catalog-grid">
        {result.items.map((item) => (
          <article className="catalog-card" key={item.id}>
            {item.is_demo && <span className="demo-badge">Demo stock</span>}
            {item.images?.[0] && <ListingImage image={item.images[0]} />}
            <span className="eyebrow">
              {item.material} · {item.condition}
            </span>
            <h3>{item.title}</h3>
            <p>{item.organization_name}</p>
            <p>
              {Number(item.quantity).toLocaleString()} {item.unit} available ·
              MOQ {Number(item.min_order_quantity).toLocaleString()} {item.unit}
            </p>
            <strong>
              {price(item.price_per_unit)} / {item.unit}
            </strong>
            <details>
              <summary>See details</summary>
              <p>{item.description}</p>
              <p>
                {[item.color, item.composition, item.location]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
              <PriceTiers tiers={item.price_tiers} unit={item.unit} />
              <p>
                Direct purchasing opens in the commerce phase. Below MOQ? Group
                buying will be available there.
              </p>
            </details>
          </article>
        ))}
      </div>
      {result.total > result.limit && (
        <div className="pagination">
          <button
            type="button"
            disabled={search.page === 1}
            onClick={() => {
              setLoading(true);
              setSearch({ ...search, page: search.page - 1 });
            }}
          >
            Previous
          </button>
          <span>
            Page {search.page} of {Math.ceil(result.total / result.limit)}
          </span>
          <button
            type="button"
            disabled={search.page * result.limit >= result.total}
            onClick={() => {
              setLoading(true);
              setSearch({ ...search, page: search.page + 1 });
            }}
          >
            Next
          </button>
        </div>
      )}
    </section>
  );
}

export function SellerListings({ membership }) {
  const [input, setInput] = useState(emptyListing);
  const [items, setItems] = useState([]);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState(null);
  const [file, setFile] = useState(null);
  const [requestKey, setRequestKey] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [editingVersion, setEditingVersion] = useState(null);
  let saveLabel = "Save draft";
  if (editingId) saveLabel = "Save changes";
  if (busy) saveLabel = "Saving…";
  const canEdit = ["owner", "manager"].includes(membership.role);
  const url = `/organizations/${membership.organization_id}/listings`;
  async function load() {
    try {
      setItems(await api(url));
    } catch (err) {
      setError(err.message);
    }
  }
  useEffect(() => {
    let active = true;
    api(url)
      .then((data) => {
        if (active) setItems(data);
      })
      .catch((err) => {
        if (active) setError(err.message);
      });
    return () => {
      active = false;
    };
  }, [url]);
  async function create(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await api(editingId ? `${url}/${editingId}` : url, {
        method: editingId ? "PUT" : "POST",
        body: JSON.stringify(
          editingId ? { ...input, version: editingVersion } : input,
        ),
      });
      setInput(emptyListing);
      setEditingId(null);
      setMessage("Draft saved. Review it and submit for platform approval.");
      await load();
    } catch (err) {
      setError(
        err.details
          ? Object.entries(err.details)
              .map(([key, value]) => `${key}: ${value.join(", ")}`)
              .join(" · ")
          : err.message,
      );
    } finally {
      setBusy(false);
    }
  }
  async function submit(item) {
    try {
      await api(`${url}/${item.id}/submit`, {
        method: "POST",
        body: JSON.stringify({ version: item.version }),
      });
      await load();
    } catch (err) {
      setError(err.message);
    }
  }
  async function archive(item) {
    setBusy(true);
    setError("");
    try {
      await api(`${url}/${item.id}/archive`, {
        method: "POST",
        body: JSON.stringify({ version: item.version }),
      });
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }
  function edit(item) {
    setEditingId(item.id);
    setEditingVersion(item.version);
    setInput({
      title: item.title,
      description: item.description,
      material: item.material,
      condition: item.condition,
      unit: item.unit,
      quantity: item.quantity,
      minOrderQuantity: item.min_order_quantity,
      pricePerUnit: item.price_per_unit,
      color: item.color,
      composition: item.composition,
      location: item.location,
      priceTiers: (item.price_tiers || []).map((tier) => ({
        minQuantity: tier.minQuantity,
        pricePerUnit: tier.pricePerUnit,
      })),
    });
    window.scrollTo({
      top: 0,
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "auto"
        : "smooth",
    });
  }
  async function previewFile(e) {
    e.preventDefault();
    setError("");
    setPreview(null);
    if (!file) {
      setError("Select a CSV or XLSX file first.");
      return;
    }
    const body = new FormData();
    body.append("file", file);
    setBusy(true);
    try {
      setPreview(await api(`${url}/import/preview`, { method: "POST", body }));
      setRequestKey(crypto.randomUUID());
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }
  async function commit() {
    setBusy(true);
    setError("");
    try {
      const result = await api(`${url}/import/commit`, {
        method: "POST",
        body: JSON.stringify({ requestKey, rows: preview.rows }),
      });
      setMessage(
        `${result.created} draft listings imported. Review each draft before submitting.`,
      );
      setPreview(null);
      setFile(null);
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="catalog-panel">
      <p className="eyebrow">Seller inventory</p>
      <h2>Your materials</h2>
      {canEdit && (
        <form className="listing-form" onSubmit={create}>
          <FormField
            label="Listing title"
            value={input.title}
            onChange={(e) => setInput({ ...input, title: e.target.value })}
            required
            minLength="3"
            maxLength="160"
          />
          <FormField
            label="Material"
            value={input.material}
            onChange={(e) => setInput({ ...input, material: e.target.value })}
            required
          />
          <FormField
            label="Condition"
            value={input.condition}
            onChange={(e) => setInput({ ...input, condition: e.target.value })}
            required
          />
          <label className="field">
            <span>Unit</span>
            <select
              value={input.unit}
              onChange={(e) => setInput({ ...input, unit: e.target.value })}
            >
              {units.map((u) => (
                <option key={u}>{u}</option>
              ))}
            </select>
          </label>
          <FormField
            label="Available quantity"
            type="number"
            step="0.001"
            min="0.001"
            value={input.quantity}
            onChange={(e) => setInput({ ...input, quantity: e.target.value })}
            required
          />
          <FormField
            label="Minimum order quantity"
            type="number"
            step="0.001"
            min="0.001"
            value={input.minOrderQuantity}
            onChange={(e) =>
              setInput({ ...input, minOrderQuantity: e.target.value })
            }
            required
          />
          <FormField
            label="Price per unit in PKR"
            type="number"
            step="0.01"
            min="0.01"
            value={input.pricePerUnit}
            onChange={(e) =>
              setInput({ ...input, pricePerUnit: e.target.value })
            }
            required
          />
          {[
            ["color", "Color", 80],
            ["composition", "Composition", 200],
            ["location", "Location", 180],
          ].map(([key, label, max]) => (
            <FormField
              key={key}
              label={`${label} (optional)`}
              value={input[key]}
              maxLength={max}
              onChange={(e) => setInput({ ...input, [key]: e.target.value })}
            />
          ))}
          <TierEditor
            tiers={input.priceTiers}
            onChange={(priceTiers) => setInput({ ...input, priceTiers })}
          />
          <label className="field listing-description">
            <span>Description (at least 20 characters)</span>
            <textarea
              value={input.description}
              onChange={(e) =>
                setInput({ ...input, description: e.target.value })
              }
              required
              minLength="20"
              maxLength="5000"
            />
          </label>
          <button type="submit" className="button" disabled={busy}>
            {saveLabel}
          </button>
          {editingId && (
            <button
              type="button"
              className="text-action"
              onClick={() => {
                setEditingId(null);
                setInput(emptyListing);
              }}
            >
              Cancel editing
            </button>
          )}
        </form>
      )}
      {canEdit && (
        <section className="import-panel">
          <h3>Import a factory stock sheet</h3>
          <p>
            Upload CSV or XLSX, up to 100 rows and 2 MB. Nothing is saved until
            you review valid rows and confirm. Imports create drafts.
          </p>
          <button
            type="button"
            className="text-action"
            onClick={() =>
              downloadFile(
                `${url}/import/template`,
                "resourcepk-listings.csv",
              ).catch((err) => setError(err.message))
            }
          >
            Download CSV template
          </button>
          <form onSubmit={previewFile}>
            <label className="field">
              <span>Factory stock sheet</span>
              <input
                type="file"
                accept=".csv,.xlsx"
                onChange={(e) => {
                  setFile(e.target.files[0]);
                  setPreview(null);
                }}
              />
            </label>
            <button className="button" type="submit" disabled={busy}>
              Validate and preview
            </button>
          </form>
          {preview && (
            <div>
              <p>
                {preview.validCount} valid rows · {preview.invalidCount} rows
                need correction.
              </p>
              {preview.errors.map((item) => (
                <p className="notice notice--error" key={item.row}>
                  Row {item.row}:{" "}
                  {Object.entries(item.fields)
                    .map(([key, value]) => `${key}: ${value.join(", ")}`)
                    .join(" · ")}
                </p>
              ))}
              {preview.rows.length > 0 && (
                <div className="import-review">
                  <h4>Review draft records</h4>
                  {preview.rows.map((row, index) => (
                    <p key={`${row.title}-${index}`}>
                      {index + 1}. {row.title} · {row.quantity} {row.unit} ·{" "}
                      {price(row.pricePerUnit)} / {row.unit}
                    </p>
                  ))}
                </div>
              )}
              {preview.invalidCount === 0 && preview.validCount > 0 && (
                <button
                  className="button"
                  type="button"
                  disabled={busy}
                  onClick={commit}
                >
                  {busy
                    ? "Importing…"
                    : `Confirm ${preview.validCount} draft listings`}
                </button>
              )}
            </div>
          )}
        </section>
      )}
      {error && (
        <p className="notice notice--error" role="alert">
          {error}
        </p>
      )}
      {message && <p className="notice notice--success">{message}</p>}
      {!items.length && <p>No listings yet.</p>}
      <div className="catalog-grid">
        {items.map((item) => (
          <article className="catalog-card" key={item.id}>
            <span className="eyebrow">{item.status.replace("_", " ")}</span>
            {item.is_demo && <span className="demo-badge">Demo stock</span>}
            {item.images?.[0] && <ListingImage image={item.images[0]} />}
            <h3>{item.title}</h3>
            <PriceTiers tiers={item.price_tiers} unit={item.unit} />
            {item.review_reason && <p>Review note: {item.review_reason}</p>}
            <p>
              {item.material} · {item.quantity} {item.unit}
            </p>
            <strong>
              {price(item.price_per_unit)} / {item.unit}
            </strong>
            {canEdit && ["draft", "rejected"].includes(item.status) && (
              <>
                <ListingImagesEditor listing={item} url={url} onSaved={load} />
                <button type="button" onClick={() => edit(item)}>
                  Edit draft
                </button>
                <button
                  type="button"
                  className="button"
                  onClick={() => submit(item)}
                  disabled={busy}
                >
                  Submit for review
                </button>
              </>
            )}
            {canEdit && item.status !== "archived" && (
              <details>
                <summary>Archive this listing</summary>
                <p>
                  Archiving removes this stock from discovery and matching. Keep
                  the record for audit; it cannot be republished.
                </p>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => archive(item)}
                >
                  Confirm archive
                </button>
              </details>
            )}
          </article>
        ))}
      </div>
    </section>
  );
}

export function Requirements() {
  const [input, setInput] = useState({
    material: "",
    minQuantity: "",
    unit: "kg",
    maxPricePerUnit: "",
  });
  const [items, setItems] = useState([]);
  const [matches, setMatches] = useState(null);
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    api("/requirements")
      .then((data) => {
        if (active) setItems(data);
      })
      .catch((err) => {
        if (active) setError(err.message);
      });
    return () => {
      active = false;
    };
  }, []);
  async function create(e) {
    e.preventDefault();
    setError("");
    try {
      const payload = { ...input };
      if (!payload.maxPricePerUnit) {
        delete payload.maxPricePerUnit;
      }
      await api("/requirements", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      setItems(await api("/requirements"));
      setInput({
        material: "",
        minQuantity: "",
        unit: "kg",
        maxPricePerUnit: "",
      });
    } catch (err) {
      setError(err.message);
    }
  }
  async function match(id) {
    try {
      setMatches(await api(`/requirements/${id}/matches`));
    } catch (err) {
      setError(err.message);
    }
  }
  async function changeStatus(item, status) {
    setError("");
    try {
      await api(`/requirements/${item.id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status, version: item.version }),
      });
      setItems(await api("/requirements"));
      setMatches(null);
    } catch (err) {
      setError(err.message);
    }
  }
  return (
    <section className="catalog-panel">
      <p className="eyebrow">Buyer procurement</p>
      <h2>Material requirements</h2>
      <p>
        Tell us what you need. Matches use material, unit, available quantity,
        and your price ceiling.
      </p>
      <form className="catalog-filters" onSubmit={create}>
        <FormField
          label="Material"
          value={input.material}
          onChange={(e) => setInput({ ...input, material: e.target.value })}
          required
        />
        <FormField
          label="Quantity"
          type="number"
          min="0.001"
          step="0.001"
          value={input.minQuantity}
          onChange={(e) => setInput({ ...input, minQuantity: e.target.value })}
          required
        />
        <label className="field">
          <span>Unit</span>
          <select
            value={input.unit}
            onChange={(e) => setInput({ ...input, unit: e.target.value })}
          >
            {units.map((u) => (
              <option key={u}>{u}</option>
            ))}
          </select>
        </label>
        <FormField
          label="Maximum PKR per unit (optional)"
          type="number"
          min="0.01"
          step="0.01"
          value={input.maxPricePerUnit}
          onChange={(e) =>
            setInput({ ...input, maxPricePerUnit: e.target.value })
          }
        />
        <button className="button" type="submit">
          Save requirement
        </button>
      </form>
      {error && (
        <p className="notice notice--error" role="alert">
          {error}
        </p>
      )}
      {items.map((item) => (
        <div className="requirement-row" key={item.id}>
          <strong>
            {item.material} · {item.min_quantity} {item.unit}
          </strong>
          <span>{item.status}</span>
          {item.status !== "closed" && (
            <>
              <button
                type="button"
                onClick={() =>
                  changeStatus(
                    item,
                    item.status === "active" ? "paused" : "active",
                  )
                }
              >
                {item.status === "active" ? "Pause" : "Resume"}
              </button>
              <button
                type="button"
                onClick={() => changeStatus(item, "closed")}
              >
                Close requirement
              </button>
            </>
          )}
          <button
            type="button"
            disabled={item.status !== "active"}
            onClick={() => match(item.id)}
          >
            See matches
          </button>
        </div>
      ))}
      {matches && <p role="status">{matches.explanation}</p>}
      {matches && (
        <div className="catalog-grid">
          {matches.items.length ? (
            matches.items.map((item) => (
              <article className="catalog-card" key={item.id}>
                <h3>{item.title}</h3>
                <p>
                  {item.organization_name} ·{" "}
                  {price(item.matched_price_per_unit)} / {item.unit}
                </p>
                <p>
                  {item.direct_purchase_eligible
                    ? "Meets current MOQ"
                    : "Below MOQ: group buying needed"}
                </p>
              </article>
            ))
          ) : (
            <p>No matches yet. Try a different material or price limit.</p>
          )}
        </div>
      )}
    </section>
  );
}

export function ReviewQueue() {
  const [reasons, setReasons] = useState({});
  const [items, setItems] = useState([]);
  const [error, setError] = useState("");
  async function load() {
    try {
      setItems(await api("/platform/listings/pending"));
    } catch (err) {
      setError(err.message);
    }
  }
  useEffect(() => {
    let active = true;
    api("/platform/listings/pending")
      .then((data) => {
        if (active) setItems(data);
      })
      .catch((err) => {
        if (active) setError(err.message);
      });
    return () => {
      active = false;
    };
  }, []);
  async function review(item, decision) {
    try {
      await api(`/platform/listings/${item.id}/review`, {
        method: "POST",
        body: JSON.stringify({
          decision,
          reason: reasons[item.id] || "",
          version: item.version,
        }),
      });
      await load();
    } catch (err) {
      setError(err.message);
    }
  }
  return (
    <section className="catalog-panel">
      <p className="eyebrow">Platform moderation</p>
      <h2>Listing review queue</h2>
      {error && (
        <p role="alert" className="notice notice--error">
          {error}
        </p>
      )}
      {!items.length && !error && <p>No listings awaiting review.</p>}
      <div className="catalog-grid">
        {items.map((item) => (
          <article className="catalog-card" key={item.id}>
            {item.is_demo && <span className="demo-badge">Demo stock</span>}
            {item.images?.map((image) => (
              <ListingImage image={image} key={image.id} />
            ))}
            <h3>{item.title}</h3>
            <PriceTiers tiers={item.price_tiers} unit={item.unit} />
            <p>
              {item.organization_name} · {item.material} · {item.quantity}{" "}
              {item.unit}
            </p>
            <p>{item.description}</p>
            <p>
              MOQ {item.min_order_quantity} · {price(item.price_per_unit)} /{" "}
              {item.unit}
            </p>
            <FormField
              label="Review reason (required)"
              value={reasons[item.id] || ""}
              maxLength="1000"
              onChange={(e) =>
                setReasons({ ...reasons, [item.id]: e.target.value })
              }
            />
            <button
              type="button"
              className="button"
              onClick={() => review(item, "published")}
              disabled={(reasons[item.id] || "").trim().length < 3}
            >
              Publish
            </button>
            <button
              type="button"
              onClick={() => review(item, "rejected")}
              disabled={(reasons[item.id] || "").trim().length < 3}
            >
              Reject
            </button>
          </article>
        ))}
      </div>
    </section>
  );
}
