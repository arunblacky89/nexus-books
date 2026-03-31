import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'

export default function Login() {
  const navigate = useNavigate()
  const login = useAuthStore(s => s.login)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showPass, setShowPass] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!username.trim() || !password.trim()) {
      setError('Please enter username and password.')
      return
    }
    setLoading(true)
    setError('')
    try {
      await login(username, password)
      navigate('/dashboard')
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Invalid credentials. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ display: 'flex', height: '100vh', fontFamily: 'Inter, sans-serif' }}>
      {/* Left panel */}
      <div style={{
        width: '45%',
        background: 'linear-gradient(145deg, #1E2A3B 0%, #0D1B2A 100%)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        padding: '48px',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* Background decoration */}
        <div style={{
          position: 'absolute', top: '-80px', right: '-80px',
          width: '300px', height: '300px', borderRadius: '50%',
          background: 'rgba(0,102,204,0.12)', pointerEvents: 'none',
        }} />
        <div style={{
          position: 'absolute', bottom: '-60px', left: '-60px',
          width: '220px', height: '220px', borderRadius: '50%',
          background: 'rgba(0,102,204,0.08)', pointerEvents: 'none',
        }} />

        <div style={{ maxWidth: '400px', width: '100%', zIndex: 1 }}>
          {/* Logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '48px' }}>
            <div style={{
              width: '44px', height: '44px', borderRadius: '10px',
              background: 'linear-gradient(135deg, #0066CC, #0052A3)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 4px 14px rgba(0,102,204,0.4)',
            }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path d="M4 6h16M4 10h16M4 14h10M4 18h7" stroke="white" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </div>
            <span style={{ fontSize: '22px', fontWeight: '700', color: 'white', letterSpacing: '-0.3px' }}>
              NexusBooks
            </span>
          </div>

          <h1 style={{
            fontSize: '32px', fontWeight: '700', color: 'white',
            lineHeight: '1.2', marginBottom: '16px', letterSpacing: '-0.5px',
          }}>
            Smart Accounting<br />for Modern Business
          </h1>
          <p style={{ color: '#94A3B8', fontSize: '15px', lineHeight: '1.6', marginBottom: '48px' }}>
            Manage your finances, invoices, and taxes with the power of GST-ready accounting.
          </p>

          {/* Feature bullets */}
          {[
            { icon: '✦', text: 'GST-compliant invoicing & e-filing' },
            { icon: '✦', text: 'Real-time P&L and balance sheets' },
            { icon: '✦', text: 'Multi-user with role-based access control' },
          ].map((f, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', marginBottom: '20px' }}>
              <div style={{
                width: '28px', height: '28px', borderRadius: '6px',
                background: 'rgba(0,102,204,0.2)', display: 'flex',
                alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: '1px',
              }}>
                <span style={{ color: '#60A5FA', fontSize: '11px' }}>{f.icon}</span>
              </div>
              <span style={{ color: '#CBD5E1', fontSize: '14px', lineHeight: '1.5', paddingTop: '4px' }}>{f.text}</span>
            </div>
          ))}

          <div style={{ marginTop: '60px', padding: '16px 20px', borderRadius: '10px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
            <p style={{ color: '#64748B', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '8px', fontWeight: '600' }}>
              Demo Credentials
            </p>
            <div style={{ display: 'flex', gap: '24px' }}>
              <div>
                <p style={{ color: '#94A3B8', fontSize: '12px', marginBottom: '2px' }}>Username</p>
                <p style={{ color: 'white', fontSize: '14px', fontWeight: '600', fontFamily: 'monospace' }}>admin</p>
              </div>
              <div>
                <p style={{ color: '#94A3B8', fontSize: '12px', marginBottom: '2px' }}>Password</p>
                <p style={{ color: 'white', fontSize: '14px', fontWeight: '600', fontFamily: 'monospace' }}>Admin@2024</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right panel */}
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        background: '#F4F6F9',
        padding: '48px',
      }}>
        <div style={{
          background: 'white', borderRadius: '16px', padding: '48px',
          width: '100%', maxWidth: '440px',
          boxShadow: '0 4px 24px rgba(0,0,0,0.06)',
          border: '1px solid #E2E8F0',
        }}>
          <div style={{ marginBottom: '32px' }}>
            <h2 style={{ fontSize: '24px', fontWeight: '700', color: '#1A202C', marginBottom: '8px' }}>
              Welcome back
            </h2>
            <p style={{ color: '#64748B', fontSize: '14px' }}>Sign in to your NexusBooks account</p>
          </div>

          {error && (
            <div style={{
              background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '8px',
              padding: '12px 16px', marginBottom: '20px', display: 'flex', alignItems: 'flex-start', gap: '10px',
            }}>
              <svg width="16" height="16" viewBox="0 0 20 20" fill="#DC2626" style={{ flexShrink: 0, marginTop: '1px' }}>
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd"/>
              </svg>
              <p style={{ color: '#DC2626', fontSize: '13px', lineHeight: '1.4' }}>{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: '20px' }}>
              <label className="nb-label">Username</label>
              <input
                className="nb-input"
                type="text"
                placeholder="Enter your username"
                value={username}
                onChange={e => setUsername(e.target.value)}
                autoComplete="username"
                autoFocus
              />
            </div>

            <div style={{ marginBottom: '28px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                <label className="nb-label" style={{ marginBottom: 0 }}>Password</label>
                <button type="button" style={{ background: 'none', border: 'none', color: 'var(--primary)', fontSize: '13px', cursor: 'pointer', fontWeight: '500' }}>
                  Forgot password?
                </button>
              </div>
              <div style={{ position: 'relative' }}>
                <input
                  className="nb-input"
                  type={showPass ? 'text' : 'password'}
                  placeholder="Enter your password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  autoComplete="current-password"
                  style={{ paddingRight: '44px' }}
                />
                <button
                  type="button"
                  onClick={() => setShowPass(v => !v)}
                  style={{
                    position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8', display: 'flex',
                  }}
                >
                  {showPass ? (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                  ) : (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                  )}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="btn-primary"
              disabled={loading}
              style={{ width: '100%', justifyContent: 'center', padding: '11px 16px', fontSize: '15px', borderRadius: '8px', opacity: loading ? 0.8 : 1 }}
            >
              {loading ? (
                <>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ animation: 'spin 1s linear infinite' }}>
                    <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
                  </svg>
                  Signing in...
                </>
              ) : 'Sign In'}
            </button>
          </form>
        </div>

        <p style={{ marginTop: '24px', color: '#94A3B8', fontSize: '13px' }}>
          © 2024 NexusBooks. All rights reserved.
        </p>
      </div>

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
