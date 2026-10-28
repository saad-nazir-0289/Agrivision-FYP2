import { useEffect, useState } from 'react';
import AddAdminForm from './AddAdminForm';
import { api } from '../services/api';
import { useAuth } from '../services/AuthContext';

// Format a date for the table, or show "Never" if the user has not logged in yet.
const formatDate = (value) => ( 
    value ? new Date(value).toLocaleString() : 'Never'
);

export default function UsersPanel() {
  const { user: me } = useAuth(); // the logged-in admin (used to protect their own row)
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [reloadKey, setReloadKey] = useState(0); // change this number to re-fetch the list

  // Fetch the list whenever the search box, status filter or reloadKey changes.
  // The 300 ms timer waits until the admin stops typing instead of
  // sending a request on every keystroke.
  useEffect(() => {
    const timer = setTimeout(async () => {
      try {
        const params = new URLSearchParams({ search, status });
        const data = await api(`/admin/users?${params}`);
        setUsers(data.users);
        setError('');
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer); // cancel the old timer if the inputs change again
  }, [search, status, reloadKey]);

  async function toggleActive(user) {
    const action = user.isActive ? 'deactivate' : 'activate';
    if (!window.confirm(`Do you want to ${action} ${user.name}?`)) return;

    try {
      await api(`/admin/users/${user._id}/status`, { method: 'PATCH', body: { isActive: !user.isActive } });
      setReloadKey((n) => n + 1); // refresh the table
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <>
      <div className="card">
        <h2>Users</h2>
        <div className="toolbar">
          <input
            type="search"
            placeholder="Search by name or email"
            aria-label="Search users"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select aria-label="Filter by status" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="all">All users</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>

        {error && <p className="error" role="alert">{error}</p>}

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Status</th>
                <th>Last login</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u._id}>
                  <td>{u.name}</td>
                  <td>{u.email}</td>
                  <td>{u.role}</td>
                  <td>
                    <span className={`badge ${u.isActive ? 'active' : 'inactive'}`}>
                      {u.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td>{formatDate(u.lastLoginAt)}</td>
                  <td>
                    {/* The admin's own row has no button, matching the backend rule. */}
                    {u._id === me.id ? (
                      <span className="muted">You</span>
                    ) : (
                      <button
                        className={`btn-small ${u.isActive ? 'danger' : ''}`}
                        onClick={() => toggleActive(u)}
                      >
                        {u.isActive ? 'Deactivate' : 'Activate'}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {!loading && users.length === 0 && <p className="muted">No users match your search.</p>}
      </div>

      <div className="card">
        <h2>Add another admin</h2>
        <AddAdminForm onCreated={() => setReloadKey((n) => n + 1)} />
      </div>
    </>
  );
}