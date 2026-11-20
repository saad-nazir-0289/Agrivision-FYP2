import UsersPanel from '../components/UsersPanel';
import { useAuth } from '../services/AuthContext';
import AoisPanel from '../components/AoisPanel';
import AlertRulesPanel from '../components/AlertRulesPanel';

export default function Admin() {
  const { user, logout } = useAuth();

  return (
    <div className="admin">
      <header className="admin-header">
        <strong>🌿 AgriVision Admin</strong>
        <div>
          {user.name}
          <button className="link-btn" onClick={logout}>Log out</button>
        </div>
      </header>

      <main>
        <h1>Admin panel</h1>
        <UsersPanel />
        <AoisPanel />
        <AlertRulesPanel />
      </main>
    </div>
  );
}