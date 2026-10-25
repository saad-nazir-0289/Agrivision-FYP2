import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import AuthLayout from '../components/AuthLayout';
import PasswordInput from '../components/PasswordInput';
import { api } from '../services/api';

export default function ResetPassword() {
  const { token } = useParams();
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  async function submit(e) {
    e.preventDefault();
    setError('');
    try {
      const data = await api('/auth/reset-password', { method: 'POST', body: { token, password } });
      setMessage(data.message);
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <AuthLayout title="Set a new password" subtitle="Choose a password with 8 or more characters.">
      {message ? (
        <>
          <p className="success" role="status">{message}</p>
          <Link to="/login">Go to login</Link>
        </>
      ) : (
        <form onSubmit={submit}>
          {error && <p className="error" role="alert">{error}</p>}
          <label htmlFor="password">New password</label>
          <PasswordInput id="password" minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} required />
          <button className="btn" type='button' style={{ marginTop: '1.25rem' }}>
            Update password
          </button>
        </form>
      )}
    </AuthLayout>
  );
}