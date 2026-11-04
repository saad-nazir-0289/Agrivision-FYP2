import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../services/AuthContext';

export default function ProfileMenu() {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  // Close the menu when the user clicks outside it or presses Escape.
  useEffect(() => {
    const onClick = (e) => {
      if (!ref.current?.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, []);

  return (
    <div className="profile" ref={ref}>
      <button className="profile-btn" onClick={() => setOpen(!open)} aria-expanded={open} aria-haspopup="menu">
        {user.name} ▾
      </button>
      {open && (
        <div className="menu" role="menu">
          <p className="menu-info">
            <strong>{user.name}</strong>
            <br />
            {user.email}
            <br />
            <span className="muted">Role: {user.role}</span>
          </p>
          <button role="menuitem" className="menu-item" onClick={logout}>
            Log out
          </button>
        </div>
      )}
    </div>
  );
}