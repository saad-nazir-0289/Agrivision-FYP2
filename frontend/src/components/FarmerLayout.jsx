import { NavLink, Outlet } from 'react-router-dom';
import ProfileMenu from './ProfileMenu';

const links = [
  { to: '/', label: 'Dashboard Home', end: true }, // `end` stops "/" matching every page
  { to: '/ndvi-map', label: 'NDVI Map' },
  { to: '/alerts', label: 'Alerts' },
  { to: '/trends', label: 'Trends' },
];

// Top bar shared by every farmer page. <Outlet /> is where the current page is drawn.
export default function FarmerLayout() {
  return (
    <>
      <header className="topbar">
        <span className="topbar-logo-text">🌿 AgriVision</span>
        <nav aria-label="Main">
          {links.map(({ to, label, end }) => (
            <NavLink key={to} to={to} end={end} className="nav-link">
              {label}
            </NavLink>
          ))}
        </nav>
        <ProfileMenu />
      </header>
      <main className="page">
        <Outlet />
      </main>
    </>
  );
}