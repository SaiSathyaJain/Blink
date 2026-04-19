import { useState, useEffect } from 'react';
import { Eye, EyeOff, User, MessageSquare } from 'lucide-react';

const API = 'https://blinkv2.saisathyajain.workers.dev';
const GOOGLE_CLIENT_ID = '76300083266-c4hr0fcnfi4jo6k69v8vtdnfsmaalguj.apps.googleusercontent.com';


const Login = ({ onLogin }) => {
  const [mode, setMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [focusedField, setFocusedField] = useState(null);

  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    document.body.appendChild(script);
    return () => document.body.removeChild(script);
  }, []);

  const handleGoogleLogin = () => {
    if (!window.google) { setError('Google SDK not loaded yet, please try again.'); return; }
    const client = window.google.accounts.oauth2.initTokenClient({
      client_id: GOOGLE_CLIENT_ID,
      scope: 'email profile',
      prompt: 'select_account',
      callback: async ({ access_token, error: oauthError }) => {
        if (oauthError) { setError('Google sign-in cancelled.'); return; }
        setLoading(true);
        setError('');
        try {
          const res = await fetch(`${API}/api/auth/google`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ access_token }),
          });
          const data = await res.json();
          if (!res.ok) { setError(data.error || 'Google sign-in failed'); return; }
          localStorage.setItem('blink_token', data.token);
          localStorage.setItem('blink_user', JSON.stringify(data.user));
          onLogin(data.user);
        } catch {
          setError('Could not connect to server.');
        } finally {
          setLoading(false);
        }
      },
    });
    client.requestAccessToken();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const endpoint = mode === 'login' ? '/api/auth/login' : '/api/auth/register';
    const body = mode === 'login' ? { email, password } : { email, password, full_name: fullName };
    try {
      const res = await fetch(`${API}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Something went wrong'); return; }
      localStorage.setItem('blink_token', data.token);
      localStorage.setItem('blink_user', JSON.stringify(data.user));
      onLogin(data.user);
    } catch {
      setError('Could not connect to server.');
    } finally {
      setLoading(false);
    }
  };

  const fieldStyle = (name) => ({
    width: '100%',
    padding: '1.1rem 1rem 0.4rem',
    borderRadius: '12px',
    border: `1.5px solid ${focusedField === name ? '#6366f1' : '#e2e8f0'}`,
    backgroundColor: '#f8fafc',
    fontSize: '0.9375rem',
    color: '#0f172a',
    outline: 'none',
    boxSizing: 'border-box',
    transition: 'border-color 0.2s ease',
  });

  const floatLabel = (name, hasValue) => ({
    position: 'absolute', left: '1rem',
    top: focusedField === name || hasValue ? '0.4rem' : '50%',
    transform: focusedField === name || hasValue ? 'none' : 'translateY(-50%)',
    fontSize: focusedField === name || hasValue ? '0.7rem' : '0.9rem',
    color: focusedField === name ? '#6366f1' : '#94a3b8',
    pointerEvents: 'none',
    transition: 'all 0.15s ease',
    zIndex: 1,
    fontWeight: 500,
  });

  return (
    <div style={{
      minHeight: '100vh', width: '100vw', display: 'flex',
      alignItems: 'center', justifyContent: 'center',
      backgroundColor: '#eef2f7',
      backgroundImage: 'radial-gradient(ellipse at 60% 20%, #e0e7ff 0%, transparent 60%), radial-gradient(ellipse at 20% 80%, #f0fdf4 0%, transparent 50%)',
    }}>
      <div style={{
        width: '100%', maxWidth: '420px', margin: '1rem',
        backgroundColor: 'white', borderRadius: '24px',
        padding: '2.5rem 2.25rem',
        boxShadow: '0 20px 60px -10px rgba(0,0,0,0.12), 0 4px 16px -4px rgba(0,0,0,0.06)',
      }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', marginBottom: '1.75rem' }}>
          <div style={{
            width: '36px', height: '36px', borderRadius: '10px',
            background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 4px 12px rgba(99,102,241,0.35)',
          }}>
            <MessageSquare size={20} fill="white" color="white" />
          </div>
          <span style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em' }}>Blink</span>
        </div>

        {/* Heading */}
        <h2 style={{ fontSize: '1.6rem', fontWeight: 700, color: '#0f172a', marginBottom: '0.375rem', letterSpacing: '-0.02em' }}>
          {mode === 'login' ? 'Welcome back' : 'Create account'}
        </h2>
        <p style={{ fontSize: '0.9rem', color: '#94a3b8', marginBottom: '1.75rem' }}>
          {mode === 'login' ? 'Sign in to continue to your workspace' : 'Join your team on Blink'}
        </p>

        {/* Error */}
        {error && (
          <div style={{
            padding: '0.75rem 1rem', marginBottom: '1rem',
            backgroundColor: '#fef2f2', borderRadius: '10px',
            color: '#dc2626', fontSize: '0.85rem', fontWeight: 500,
            border: '1px solid #fecaca',
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* Full Name (register only) */}
          {mode === 'register' && (
            <div style={{ position: 'relative', marginBottom: '1rem' }}>
              <label style={floatLabel('name', fullName.length > 0)}>Full name</label>
              <div style={{ position: 'relative' }}>
                <input
                  type="text" required value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  onFocus={() => setFocusedField('name')}
                  onBlur={() => setFocusedField(null)}
                  style={{ ...fieldStyle('name'), paddingRight: '2.75rem' }}
                />
                <User size={16} style={{ position: 'absolute', right: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#cbd5e1' }} />
              </div>
            </div>
          )}

          {/* Email */}
          <div style={{ position: 'relative', marginBottom: '1rem' }}>
            <label style={floatLabel('email', email.length > 0)}>Email address</label>
            <input
              type="email" required value={email}
              onChange={(e) => setEmail(e.target.value)}
              onFocus={() => setFocusedField('email')}
              onBlur={() => setFocusedField(null)}
              style={fieldStyle('email')}
            />
          </div>

          {/* Password */}
          <div style={{ position: 'relative', marginBottom: '0.5rem' }}>
            <label style={floatLabel('password', password.length > 0)}>Password</label>
            <input
              type={showPassword ? 'text' : 'password'} required value={password}
              onChange={(e) => setPassword(e.target.value)}
              onFocus={() => setFocusedField('password')}
              onBlur={() => setFocusedField(null)}
              style={{ ...fieldStyle('password'), paddingRight: '2.75rem' }}
            />
            <button type="button" onClick={() => setShowPassword(!showPassword)} style={{
              position: 'absolute', right: '1rem', top: '50%', transform: 'translateY(-50%)',
              background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: 0,
            }}>
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>

          {/* Forgot password */}
          {mode === 'login' && (
            <div style={{ textAlign: 'right', marginBottom: '1.25rem' }}>
              <button type="button" style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.8rem', color: '#6366f1', fontWeight: 500 }}>
                Forgot password?
              </button>
            </div>
          )}
          {mode === 'register' && <div style={{ marginBottom: '1.25rem' }} />}

          {/* Submit */}
          <button type="submit" disabled={loading} style={{
            width: '100%', padding: '0.875rem',
            background: loading ? '#a5b4fc' : 'linear-gradient(135deg, #6366f1, #8b5cf6)',
            color: 'white', borderRadius: '12px', fontWeight: 600,
            fontSize: '0.9375rem', border: 'none', cursor: loading ? 'not-allowed' : 'pointer',
            boxShadow: loading ? 'none' : '0 4px 14px rgba(99,102,241,0.4)',
            transition: 'all 0.2s ease', marginBottom: '1.25rem',
            letterSpacing: '0.01em',
          }}>
            {loading ? 'Please wait…' : mode === 'login' ? 'Sign In' : 'Create Account'}
          </button>
        </form>

        {/* Divider */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
          <div style={{ flex: 1, height: '1px', backgroundColor: '#f1f5f9' }} />
          <span style={{ fontSize: '0.75rem', color: '#cbd5e1', fontWeight: 500 }}>or continue with</span>
          <div style={{ flex: 1, height: '1px', backgroundColor: '#f1f5f9' }} />
        </div>

        {/* Google Sign-In button */}
        <button type="button" onClick={handleGoogleLogin} style={{
          width: '100%', padding: '0.75rem 1rem', marginBottom: '1.25rem',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.625rem',
          border: '1.5px solid #e2e8f0', borderRadius: '12px', backgroundColor: 'white',
          cursor: 'pointer', fontSize: '0.9375rem', fontWeight: 500, color: '#0f172a',
          transition: 'border-color 0.15s, box-shadow 0.15s',
        }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = '#6366f1'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(99,102,241,0.1)'; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.boxShadow = 'none'; }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          Continue with Google
        </button>

        {/* Toggle mode */}
        <p style={{ textAlign: 'center', fontSize: '0.875rem', color: '#94a3b8', margin: 0 }}>
          {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
          <button onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(''); }} style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: '#6366f1', fontWeight: 600, fontSize: '0.875rem',
          }}>
            {mode === 'login' ? 'Sign up' : 'Sign in'}
          </button>
        </p>
      </div>
    </div>
  );
};

export default Login;
