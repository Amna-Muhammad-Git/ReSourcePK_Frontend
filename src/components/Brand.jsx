import { Link } from "react-router-dom";
export default function Brand({ light = false }) {
  return (
    <Link
      className={`brand ${light ? "brand--light" : ""}`}
      to="/"
      aria-label="ReThread home"
    >
      <span className="brand__mark">
        <i />
        <i />
        <i />
      </span>
      <span>
        Re<em>Thread</em>
      </span>
    </Link>
  );
}
