import { useEffect, useState } from "react";
import { api } from "../services/api";
import FormField from "./FormField";

export function ListingImage({ image }) {
  const [url, setUrl] = useState("");
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    api(`/listing-images/${image.id}`)
      .then((data) => {
        if (active) setUrl(data.url);
      })
      .catch((err) => {
        if (active) setError(err.message);
      });
    return () => {
      active = false;
    };
  }, [image.id]);
  if (error)
    return (
      <p className="notice" role="status">
        Image unavailable: {error}
      </p>
    );
  return url ? (
    <img
      className="listing-image"
      src={url}
      alt={image.altText}
      width={image.width}
      height={image.height}
      loading="lazy"
      referrerPolicy="no-referrer"
      onError={() =>
        setError("Reload this view to request a fresh image link.")
      }
    />
  ) : (
    <p role="status">Loading image…</p>
  );
}

export function PriceTiers({ tiers = [], unit }) {
  if (!tiers.length) return null;
  return (
    <div className="tier-table">
      <table>
        <caption>Seller quantity price tiers</caption>
        <thead>
          <tr>
            <th scope="col">Minimum {unit}</th>
            <th scope="col">PKR per {unit}</th>
          </tr>
        </thead>
        <tbody>
          {tiers.map((tier) => (
            <tr key={tier.minQuantity}>
              <td>{tier.minQuantity}</td>
              <td>{tier.pricePerUnit}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function TierEditor({ tiers, onChange }) {
  function update(index, key, value) {
    onChange(
      tiers.map((tier, i) => (i === index ? { ...tier, [key]: value } : tier)),
    );
  }
  return (
    <fieldset className="tier-editor">
      <legend>Quantity price tiers (optional)</legend>
      <p>
        Enter thresholds from MOQ up to available stock, in increasing order.
        Prices must stay the same or decrease.
      </p>
      {tiers.map((tier, index) => (
        <div className="tier-editor-row" key={index}>
          <FormField
            label={`Tier ${index + 1} minimum quantity`}
            type="number"
            step="0.001"
            min="0.001"
            required
            value={tier.minQuantity}
            onChange={(e) => update(index, "minQuantity", e.target.value)}
          />
          <FormField
            label={`Tier ${index + 1} PKR per unit`}
            type="number"
            step="0.01"
            min="0.01"
            required
            value={tier.pricePerUnit}
            onChange={(e) => update(index, "pricePerUnit", e.target.value)}
          />
          <button
            type="button"
            onClick={() => onChange(tiers.filter((_, i) => i !== index))}
          >
            Remove tier {index + 1}
          </button>
        </div>
      ))}
      <button
        type="button"
        disabled={tiers.length >= 10}
        onClick={() =>
          onChange([...tiers, { minQuantity: "", pricePerUnit: "" }])
        }
      >
        Add price tier
      </button>
    </fieldset>
  );
}

export function ListingImagesEditor({ listing, url, onSaved }) {
  const [file, setFile] = useState(null);
  const [alt, setAlt] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function upload(event) {
    event.preventDefault();
    setError("");
    if (!file) {
      setError("Choose a JPEG, PNG or WebP image.");
      return;
    }
    setBusy(true);
    try {
      const body = new FormData();
      body.append("file", file);
      body.append("altText", alt);
      body.append("version", String(listing.version));
      await api(`${url}/${listing.id}/images`, { method: "POST", body });
      setFile(null);
      setAlt("");
      event.target.reset();
      await onSaved();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }
  async function remove(image) {
    setBusy(true);
    setError("");
    try {
      await api(`${url}/${listing.id}/images/${image.id}`, {
        method: "DELETE",
        body: JSON.stringify({ version: listing.version }),
      });
      await onSaved();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <details className="image-editor">
      <summary>Manage listing images</summary>
      <p>
        Up to 8 images, 5 MB each, 16 megapixels. JPEG, PNG and WebP only. Add a
        description for people using screen readers.
      </p>
      {listing.images.map((image) => (
        <div key={image.id}>
          <ListingImage image={image} />
          <button type="button" disabled={busy} onClick={() => remove(image)}>
            Remove image: {image.altText}
          </button>
        </div>
      ))}
      <form onSubmit={upload}>
        <label className="field">
          <span>Listing image</span>
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={(e) => setFile(e.target.files[0])}
            required
          />
        </label>
        <FormField
          label="Image description"
          value={alt}
          onChange={(e) => setAlt(e.target.value)}
          required
          maxLength="200"
        />
        <button type="submit" disabled={busy || listing.images.length >= 8}>
          {busy ? "Uploading…" : "Upload image"}
        </button>
      </form>
      {error && (
        <p className="notice notice--error" role="alert">
          {error}
        </p>
      )}
    </details>
  );
}
