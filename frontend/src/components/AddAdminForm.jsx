import { useState } from 'react';
import PasswordInput from './PasswordInput';
import { api } from '../services/api';

// Small form for creating another admin. `onCreated` tells the parent to refresh the list.
export default function AddAdminForm({ onCreated }) {
  console.log('AddAdminForm v2 loaded');
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // One handler for every input: the input's name attribute picks which field to update.
  const change = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  async function submit(e) {
    console.log('submit fired');
    e.preventDefault(); // stop the browser reloading the page
    setError('');
    setSuccess('');
    try {
      await api('/admin/users', { method: 'POST', body: form });
      setSuccess(`Admin created: ${form.email}`);
      setForm({ name: '', email: '', password: '' }); // clear the form
      onCreated();
    } catch (err) {
      setError(err.message); //  like "Email already registered"
    }
  }

  return (
    <form onSubmit={submit}>
      {error && <p className="error" role="alert">{error}</p>}
      {success && <p className="success" role="status">{success}</p>}

      <div className="inline-form">
        <div>
          <label htmlFor="adminName">Name</label>
          <input id="adminName" name="name" type="text" value={form.name} onChange={change} required />
        </div>
        <div>
          <label htmlFor="adminEmail">Email</label>
          <input id="adminEmail" name="email" type="email" value={form.email} onChange={change} required />
        </div>
        <div>
          <label htmlFor="adminPassword">Password (8+ characters)</label>
          <PasswordInput id="adminPassword" name="password" value={form.password} onChange={change} required />
        </div>
        <button className="btn" type='submit'>Add admin</button>
      </div>
    </form>
  );
}