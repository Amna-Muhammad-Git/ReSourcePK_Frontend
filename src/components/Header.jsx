import { Menu, X } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import Brand from "./Brand";
export default function Header() {
  const [open, setOpen] = useState(false);
  return (
    <header className="site-header">
      <Brand />
      <button
        className="menu-button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        aria-label="Toggle navigation"
      >
        {open ? <X /> : <Menu />}
      </button>
      <nav
        className={open ? "nav nav--open" : "nav"}
        aria-label="Main navigation"
      >
        <Link to="/marketplace" onClick={() => setOpen(false)}>
          Browse materials
        </Link>
        <a href="/#how">How it works</a>
        <a href="/#model">Purchase models</a>
        <a href="/#trust">Trust</a>
        <Link to="/login">Sign in</Link>
        <Link className="button button--small" to="/signup">
          Enter marketplace <span>↗</span>
        </Link>
      </nav>
    </header>
  );
}
