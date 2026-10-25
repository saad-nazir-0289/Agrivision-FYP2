import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import AuthLayout from '../components/AuthLayout';
import PasswordInput from '../components/PasswordInput';
import { api } from '../services/api';
import { useAuth } from '../services/AuthContext';

export default function Login() {
    // State to hold the login form input values
  const [form, setForm] = useState({ 
    email: '', 
    password: '', 
    rememberMe: false
  });
  // State to track error messages and loading status
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const { saveSession } = useAuth();
  const navigate = useNavigate();

  // Handles updating form state when user types or clicks checkboxes
  const change = (e) =>
    setForm({ ...form, [e.target.name]: e.target.type === 'checkbox' ? e.target.checked : e.target.value });

  async function submit(e) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
        // Send login request to the backend API
      const data = await api('/auth/login', { method: 'POST', body: form });
       // Save user session and redirect to the dashboard
      saveSession(data, form.rememberMe);
      void navigate('/');
    } catch (err) {   // Display any login errors returned by the server
      setError(err.message);
    } finally { // Reset loading state regardless of success or failure
      setBusy(false);
    }
  }

  return (
    <AuthLayout 
       title="Welcome back" 
       subtitle="Satellite-based vegetation health monitoring for Pakistan."
    >
      <form onSubmit={submit}>
        {/* Display error banner if login fails */}
        {error && <p className="error" role="alert">{error}</p>}
        {/* Email Field */}
        <label htmlFor="email">Email</label>
        <input id="email" name="email" type="email" placeholder="Enter your email" value={form.email} onChange={change} required />
        {/* Password Field */}
        <label htmlFor="password">Password</label>
        <PasswordInput id="password" name="password" placeholder="Enter your password" value={form.password} onChange={change} required />
        {/* Remember me & Forgot Password Row */}
        <div className="row">
          <label><input type="checkbox" name="rememberMe" checked={form.rememberMe} onChange={change} /> Remember me</label>
          <Link to="/forgot-password">Forgot password?</Link>
        </div>
        {/* Submit Button */}
        <button className="btn" type="submit" disabled={busy}>
            {busy ? 'Logging in…' : 'Login'}
            </button>
      </form>
      {/* Signup Link */}
      <p className="switch">
        New farmer? <Link to="/signup">Create an account</Link>
      </p>
    </AuthLayout>
  );
}