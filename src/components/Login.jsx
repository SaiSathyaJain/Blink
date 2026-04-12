import React, { useState } from 'react';
import { MessageSquare, Mail, Lock, Eye, EyeOff, ShieldCheck } from 'lucide-react';

const Login = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    // Simple mock login
    const userObj = {
        id: email.split('@')[0],
        name: email.split('@')[0].charAt(0).toUpperCase() + email.split('@')[0].slice(1),
        email: email,
        role: email.includes('admin') ? 'ADMIN' : 'MEMBER'
    };
    localStorage.setItem('blink_user', JSON.stringify(userObj));
    onLogin(userObj);
  };

  return (
    <div style={{ 
        height: '100vh', 
        width: '100vw', 
        display: 'flex', 
        flexDirection: 'column',
        alignItems: 'center', 
        justifyContent: 'center', 
        backgroundColor: '#f8fafc' 
    }}>
      <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
        <div style={{ 
            width: '64px', 
            height: '64px', 
            backgroundColor: 'var(--primary)', 
            borderRadius: '16px', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            color: 'white',
            margin: '0 auto 1rem'
        }}>
          <MessageSquare size={32} fill="white" />
        </div>
        <h1 style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text-main)' }}>Blink</h1>
      </div>

      <div style={{ 
          width: '100%', 
          maxWidth: '440px', 
          backgroundColor: 'white', 
          padding: '2.5rem', 
          borderRadius: '20px', 
          boxShadow: '0 10px 25px -5px rgba(0,0,0,0.05)'
      }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.5rem' }}>Welcome back</h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9375rem', marginBottom: '2rem' }}>
            Sign in to your office workspace
        </p>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '1.25rem' }}>
            <label style={{ 
                display: 'block', 
                fontSize: '0.75rem', 
                fontWeight: 700, 
                textTransform: 'uppercase', 
                letterSpacing: '0.05em',
                color: 'var(--text-muted)',
                marginBottom: '0.5rem'
            }}>Email Address</label>
            <div style={{ position: 'relative' }}>
              <div style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}>
                <Mail size={18} />
              </div>
              <input 
                type="email" 
                placeholder="name@company.com"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={{ 
                    width: '100%', 
                    padding: '0.75rem 1rem 0.75rem 3rem', 
                    borderRadius: '12px', 
                    border: '1px solid var(--border)',
                    backgroundColor: '#f1f5f9',
                    fontSize: '0.9375rem'
                }}
              />
            </div>
          </div>

          <div style={{ marginBottom: '1.25rem' }}>
            <label style={{ 
                display: 'block', 
                fontSize: '0.75rem', 
                fontWeight: 700, 
                textTransform: 'uppercase', 
                letterSpacing: '0.05em',
                color: 'var(--text-muted)',
                marginBottom: '0.5rem'
            }}>Password</label>
            <div style={{ position: 'relative' }}>
              <div style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}>
                <Lock size={18} />
              </div>
              <input 
                type={showPassword ? 'text' : 'password'} 
                placeholder="••••••••"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{ 
                    width: '100%', 
                    padding: '0.75rem 3rem 0.75rem 3rem', 
                    borderRadius: '12px', 
                    border: '1px solid var(--border)',
                    backgroundColor: '#f1f5f9',
                    fontSize: '0.9375rem'
                }}
              />
              <button 
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{ position: 'absolute', right: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', cursor: 'pointer' }}>
                <input type="checkbox" style={{ width: '16px', height: '16px' }} />
                Remember me
            </label>
            <a href="#" style={{ fontSize: '0.875rem', color: 'var(--primary)', fontWeight: 600, textDecoration: 'none' }}>Forgot password?</a>
          </div>

          <button type="submit" style={{ 
              width: '100%', 
              padding: '0.875rem', 
              backgroundColor: 'var(--primary)', 
              color: 'white', 
              borderRadius: '12px', 
              fontWeight: 600,
              fontSize: '1rem',
              marginBottom: '1.5rem'
          }}>
            Sign In
          </button>
        </form>

        <div style={{ position: 'relative', textAlign: 'center', marginBottom: '1.5rem' }}>
            <div style={{ position: 'absolute', top: '50%', left: 0, right: 0, height: '1px', backgroundColor: 'var(--border)', zIndex: 0 }}></div>
            <span style={{ position: 'relative', backgroundColor: 'white', padding: '0 1rem', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Secure Access</span>
        </div>

        <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            gap: '0.5rem', 
            padding: '0.5rem', 
            backgroundColor: '#fff7ed', 
            borderRadius: '12px',
            color: '#9a3412',
            fontSize: '0.8125rem',
            fontWeight: 500
        }}>
            <ShieldCheck size={16} />
            Access restricted to office network only
        </div>
      </div>

      <p style={{ marginTop: '2rem', fontSize: '0.875rem', color: 'var(--text-muted)' }}>
          Need assistance? <a href="#" style={{ color: 'var(--primary)', fontWeight: 600, textDecoration: 'none' }}>Contact IT Support</a>
      </p>
    </div>
  );
};

export default Login;
