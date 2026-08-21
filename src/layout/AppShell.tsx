import { NavLink, Outlet } from "react-router-dom";
import "./AppShell.css";

const navItems = [
  ["/", "Overview", "OV"],
  ["/characters", "Characters", "CH"],
  ["/teams", "Teams", "TM"],
  ["/planner", "Build Planner", "BP"],
  ["/account", "Account", "AC"],
  ["/settings", "Settings", "ST"],
] as const;

export function AppShell() {
  return (
    <>
      <a className="skip-link" href="#main-content">Skip to main content</a>
      <div className="app-shell">
        <aside className="sidebar" aria-label="Application sidebar">
          <div className="brand-block">
            <span className="brand-mark" aria-hidden="true">HB</span>
            <div>
              <div className="brand">HOYO BUILD</div>
              <div className="brand-subtitle">Build intelligence</div>
            </div>
          </div>

          <nav className="nav" aria-label="Primary navigation">
            {navItems.map(([to, label, shortLabel]) => (
              <NavLink key={to} to={to} end={to === "/"}>
                <span className="nav-icon" aria-hidden="true">{shortLabel}</span>
                <span className="nav-label">{label}</span>
              </NavLink>
            ))}
          </nav>

          <div className="sidebar-footer">
            <span className="sidebar-status-dot" aria-hidden="true" />
            <span>UI preview mode</span>
          </div>
        </aside>

        <main className="main" id="main-content" tabIndex={-1}>
          <Outlet />
        </main>
      </div>
    </>
  );
}
