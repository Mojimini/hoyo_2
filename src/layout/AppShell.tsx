import { NavLink, Outlet } from "react-router-dom";

const navItems = [
  ["/", "Overview"],
  ["/characters", "Characters"],
  ["/teams", "Teams"],
  ["/planner", "Build Planner"],
  ["/account", "Account"],
  ["/settings", "Settings"],
] as const;

export function AppShell() {
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">HOYO BUILD</div>
        <nav className="nav" aria-label="Primary navigation">
          {navItems.map(([to, label]) => (
            <NavLink key={to} to={to} end={to === "/"}>
              {label}
            </NavLink>
          ))}
        </nav>
      </aside>
      <main className="main">
        <Outlet />
      </main>
    </div>
  );
}
