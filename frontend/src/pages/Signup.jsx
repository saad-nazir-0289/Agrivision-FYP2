import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import AuthLayout from '../components/AuthLayout';
import PasswordInput from '../components/PasswordInput';
import { api } from '../services/api';
import { useAuth } from '../services/AuthContext';

export default function Signup() {
  // State to hold registration form inputs (name, email, password, confirmation)
  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '' });
  
  // State to manage error display and loading (busy) status
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  
  const { saveSession } = useAuth();
  const navigate = useNavigate();

  // Dynamically updates form state when user types into any input field
  const change = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  // Handles form submission and registration process
  async function submit(e) {
    e.preventDefault();
    
    // Client-side validation: check if passwords match before making API call
    if (form.password !== form.confirm) return setError('Passwords do not match');
    
    setError('');
    setBusy(true);
    
    try {
      const { name, email, password } = form;
      
      // Send registration request to the backend API
      const data = await api('/auth/register', { method: 'POST', body: { name, email, password } });
      
      // Save session data and redirect to dashboard
      saveSession(data, false);
      void navigate('/'); // 'void' prevents SonarQube unhandled promise warning
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false); // Reset loading 
    }
  }

  return (
    <AuthLayout title="Create your account" subtitle="Farmer accounts are active immediately.">
      <form onSubmit={submit}>
        {/* Display error message if registration fails */}
        {error && <p className="error" role="alert">{error}</p>}
        
        {/* Full Name Input */}
        <label htmlFor="name">Full name</label>
        <input id="name" name="name" type="text" value={form.name} onChange={change} required />
        
        {/* Email Input */}
        <label htmlFor="email">Email</label>
        <input id="email" name="email" type="email" value={form.email} onChange={change} required />
        
        {/* Password Input */}
        <label htmlFor="password">Password (8+ characters)</label>
        <PasswordInput id="password" name="password" minLength={8} value={form.password} onChange={change} required />
        
        {/* Confirm Password Input */}
        <label htmlFor="confirm">Confirm password</label>
        <PasswordInput id="confirm" name="confirm" minLength={8} value={form.confirm} onChange={change} required />
        
        {/* Submit Button (type="submit" included for SonarQube compliance) */}
        <button className="btn" type="submit" style={{ marginTop: '1.25rem' }} disabled={busy}>
          {busy ? 'Creating…' : 'Sign up'}
        </button>
      </form>
      
      {/* Switch to Login Link */}
      <p className="switch">Already registered? <Link to="/login">Log in</Link></p>
    </AuthLayout>
  );
}