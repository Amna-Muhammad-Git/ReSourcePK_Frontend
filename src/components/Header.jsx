import { Menu, X } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import Brand from "./Brand";
export default function Header() {
  const [open, setOpen] = useState(false);
  const [signInOpen, setSignInOpen] = useState(false);
  const [teamChoicesOpen, setTeamChoicesOpen] = useState(false);
  function closeNavigation() {
    setOpen(false);
    setSignInOpen(false);
    setTeamChoicesOpen(false);
  }
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
        <Link to="/marketplace" onClick={closeNavigation}>
          Browse materials
        </Link>
        <a href="/#how">How it works</a>
        <a href="/#model">Purchase models</a>
        <a href="/#trust">Trust</a>
        <div className="nav-signin">
          <button
            type="button"
            className="nav-signin-toggle"
            aria-expanded={signInOpen}
            aria-haspopup="true"
            onClick={() => setSignInOpen(!signInOpen)}
            onKeyDown={(event) => {
              if (event.key === "Escape") closeNavigation();
            }}
          >
            Sign in <span aria-hidden="true">⌄</span>
          </button>
          {signInOpen && (
            <div className="nav-signin-menu">
              <Link to="/login" onClick={closeNavigation}>
                Buyer / Seller
              </Link>
              <Link to="/reviewer/login" onClick={closeNavigation}>
                Platform Reviewer
              </Link>
              <div className="nav-team-choice">
                <button
                  type="button"
                  className="nav-team-toggle"
                  aria-expanded={teamChoicesOpen}
                  onClick={() => setTeamChoicesOpen(!teamChoicesOpen)}
                >
                  Seller staff / Manager <span aria-hidden="true">›</span>
                </button>
                {teamChoicesOpen && (
                  <div className="nav-team-links">
                    <Link
                      to="/team/login?role=manager"
                      onClick={closeNavigation}
                    >
                      Manager sign in
                    </Link>
                    <Link to="/team/login?role=staff" onClick={closeNavigation}>
                      Staff sign in
                    </Link>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
        <Link
          className="button button--small"
          to="/signup"
          onClick={closeNavigation}
        >
          Enter marketplace <span>↗</span>
        </Link>
      </nav>
    </header>
  );
}
