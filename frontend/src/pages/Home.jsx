import { useAuth } from '../services/AuthContext';

export default function Home() {
  const { user, logout } = useAuth();
  return (
    <div className="center">
      <h1>Welcome, {user.name}</h1>
      <p className="muted">Role: {user.role} (placeholder, the Dashboard replaces this page)</p>
      <button className="btn" style={{ maxWidth: 200 }} onClick={logout}>Log out</button>
    </div>
  );
}