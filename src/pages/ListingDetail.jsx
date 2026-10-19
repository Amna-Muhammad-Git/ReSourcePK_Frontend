import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import Header from "../components/Header";
import { ListingImage, PriceTiers } from "../components/CatalogMedia";
import { api } from "../services/api";
import { formatCurrency } from "../utils/formatters";
import { useAuth } from "../hooks/useAuth";
import { ListingPurchaseActions } from "../components/Purchases";

export default function ListingDetail() {
  const { listingId } = useParams();
  const { context } = useAuth();
  const [record, setRecord] = useState(null);
  const listing = record?.id === listingId ? record : null;
  const [failure, setFailure] = useState(null);
  const error = failure?.id === listingId ? failure.error : null;
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    let active = true;
    api(`/listings/${listingId}`)
      .then((data) => {
        if (active) {
          setRecord(data);
          setFailure(null);
        }
      })
      .catch((failure) => {
        if (active) setFailure({ id: listingId, error: failure });
      });
    return () => {
      active = false;
    };
  }, [listingId, revision]);
  let content = <output className="collection-status">Loading listing…</output>;
  if (error) {
    content = (
      <section role="alert" className="notice notice--error">
        <h1>
          {error.status === 404
            ? "Listing unavailable"
            : "Could not load this listing"}
        </h1>
        <p>
          {error.status === 404
            ? "This stock may be private, archived or no longer available."
            : error.message}
        </p>
        {error.status !== 404 && (
          <button
            type="button"
            onClick={() => {
              setFailure(null);
              setRevision((value) => value + 1);
            }}
          >
            Try again
          </button>
        )}
      </section>
    );
  } else if (listing) {
    content = (
      <article className="listing-detail">
        {listing.is_demo && <span className="demo-badge">Demo stock</span>}
        <p className="eyebrow">{listing.organization_name}</p>
        <h1>{listing.title}</h1>
        <div className="listing-detail-images">
          {listing.images.map((image) => (
            <ListingImage key={image.id} image={image} />
          ))}
        </div>
        <p className="listing-description">{listing.description}</p>
        <dl className="listing-facts">
          <div>
            <dt>Material</dt>
            <dd>{listing.material}</dd>
          </div>
          <div>
            <dt>Condition</dt>
            <dd>{listing.condition}</dd>
          </div>
          <div>
            <dt>Available quantity</dt>
            <dd>
              {listing.quantity} {listing.unit}
            </dd>
          </div>
          <div>
            <dt>Minimum order</dt>
            <dd>
              {listing.min_order_quantity} {listing.unit}
            </dd>
          </div>
          <div>
            <dt>Base price per {listing.unit}</dt>
            <dd>{formatCurrency(listing.price_per_unit)}</dd>
          </div>
          {listing.color && (
            <div>
              <dt>Color</dt>
              <dd>{listing.color}</dd>
            </div>
          )}
          {listing.composition && (
            <div>
              <dt>Composition</dt>
              <dd>{listing.composition}</dd>
            </div>
          )}
          {listing.location && (
            <div>
              <dt>Location</dt>
              <dd>{listing.location}</dd>
            </div>
          )}
        </dl>
        <PriceTiers tiers={listing.price_tiers} unit={listing.unit} />
        <ListingPurchaseActions listing={listing} context={context} />
        <Link className="button" to="/workspace">
          Open your workspace
        </Link>
      </article>
    );
  }
  return (
    <>
      <Header />
      <main className="marketplace-page">
        <Link className="text-action" to="/marketplace">
          Back to marketplace
        </Link>
        {content}
      </main>
    </>
  );
}
