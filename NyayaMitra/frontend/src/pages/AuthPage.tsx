// AuthPage — NyayaMitra Sign In / Sign Up
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Scale, Mail, Lock, User, Eye, EyeOff, ArrowRight, ShieldCheck, Users, AlertCircle, Loader2 } from 'lucide-react'
import { useAuth } from '@/store/AuthContext'

type Mode = 'login' | 'signup' | 'reset'

export default function AuthPage() {
  const navigate = useNavigate()
  const { signIn, signUp, signInWithGoogle, signInWithGithub, resetPassword, error, clearError } = useAuth()

  const [mode, setMode] = useState<Mode>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [resetSent, setResetSent] = useState(false)

  const switchMode = (m: Mode) => {
    setMode(m); clearError(); setResetSent(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      if (mode === 'reset') {
        await resetPassword(email)
        setResetSent(true)
      } else if (mode === 'signup') {
        await signUp(email, password, name)
        navigate('/home')
      } else {
        await signIn(email, password)
        navigate('/home')
      }
    } catch {
      // error is already set in context
    } finally {
      setLoading(false)
    }
  }

  const handleGoogle = async () => {
    setLoading(true)
    try {
      await signInWithGoogle()
      navigate('/home')
    } catch { /* handled */ }
    finally { setLoading(false) }
  }

  const handleGithub = async () => {
    setLoading(true)
    try {
      await signInWithGithub()
      navigate('/home')
    } catch { /* handled */ }
    finally { setLoading(false) }
  }

  return (
    <div
      className="min-h-screen flex"
      style={{ background: 'linear-gradient(135deg, #F0F2F5 0%, #E8EFF8 50%, #FFF8F0 100%)' }}
    >
      {/* ─── Left Panel: Branding ────────────────────── */}
      <div
        className="hidden lg:flex flex-col justify-between"
        style={{
          width: '45%', minHeight: '100vh',
          background: 'linear-gradient(160deg, var(--navy) 0%, #132D52 40%, var(--navy-light) 100%)',
          padding: '48px',
          position: 'relative', overflow: 'hidden',
        }}
      >
        {/* Decorative circles */}
        <div style={{ position: 'absolute', top: -100, right: -100, width: 400, height: 400, borderRadius: '50%', background: 'radial-gradient(circle, rgba(255,153,51,0.08) 0%, transparent 60%)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: -120, left: -80, width: 350, height: 350, borderRadius: '50%', background: 'radial-gradient(circle, rgba(255,255,255,0.03) 0%, transparent 60%)', pointerEvents: 'none' }} />

        {/* Top: Logo */}
        <div>
          <div className="flex items-center gap-3 mb-8">
            <div style={{ width: 48, height: 48, borderRadius: 'var(--radius-lg)', background: 'rgba(255,153,51,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Scale size={24} color="var(--saffron)" />
            </div>
            <div>
              <h1 className="brand-logo" style={{ fontSize: '1.5rem', color: '#FFF' }}>
                <span style={{ color: '#FFF' }}>न्याय</span><span style={{ color: 'var(--saffron)' }}>मित्र</span>
              </h1>
              <p style={{ fontSize: '0.625rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.5)', marginTop: 1 }}>NyayaMitra AI</p>
            </div>
          </div>
        </div>

        {/* Center: Tagline */}
        <div style={{ maxWidth: 420 }}>
          <h2 style={{ fontFamily: "'Poppins', sans-serif", fontSize: '2.25rem', fontWeight: 900, color: '#FFF', lineHeight: 1.2, letterSpacing: '-0.03em', marginBottom: 16 }}>
            Your Trusted<br />Legal Assistant
          </h2>
          <p style={{ fontSize: '1rem', color: 'rgba(255,255,255,0.7)', lineHeight: 1.7, marginBottom: 32 }}>
            AI-powered legal guidance for every Indian citizen. Get instant answers, decode documents, track cases, and know your rights — all in your language.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {[
              { icon: ShieldCheck, text: 'Government-grade security & privacy' },
              { icon: Users, text: 'Available in 8 Indian languages' },
              { icon: Scale, text: 'Based on Indian Penal Code & BNS 2023' },
            ].map(item => (
              <div key={item.text} className="flex items-center gap-3">
                <div style={{ width: 36, height: 36, borderRadius: 'var(--radius-md)', background: 'rgba(255,153,51,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <item.icon size={16} style={{ color: 'var(--saffron)' }} />
                </div>
                <span style={{ fontSize: '0.875rem', color: 'rgba(255,255,255,0.8)', fontWeight: 500 }}>{item.text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom: Trust */}
        <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.3)' }}>
          Free legal aid for every Indian citizen · Powered by AI + Indian Law
        </p>
      </div>

      {/* ─── Right Panel: Auth Form ──────────────────── */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12">
        <div style={{ width: '100%', maxWidth: 440 }}>

          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-3 mb-8 justify-center">
            <div className="gov-emblem-ring" style={{ width: 44, height: 44 }}>
              <Scale size={22} />
            </div>
            <div>
              <h1 className="brand-logo" style={{ fontSize: '1.375rem' }}>
                <span className="brand-nyaya">न्याय</span><span className="brand-mitra">मित्र</span>
              </h1>
              <p style={{ fontSize: '0.5625rem', fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>NyayaMitra AI</p>
            </div>
          </div>

          {/* Header */}
          <div className="mb-8">
            <h2 style={{ fontFamily: "'Poppins', sans-serif", fontSize: '1.5rem', fontWeight: 800, color: 'var(--navy)', letterSpacing: '-0.02em' }}>
              {mode === 'login' ? 'Welcome back' : mode === 'signup' ? 'Create account' : 'Reset password'}
            </h2>
            <p style={{ fontSize: '0.9375rem', color: 'var(--text-secondary)', marginTop: 6 }}>
              {mode === 'login' ? 'Sign in to continue to your dashboard' : mode === 'signup' ? 'Start your legal journey with NyayaMitra' : 'Enter your email to receive a reset link'}
            </p>
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-center gap-2.5 mb-5 p-3.5 rounded-xl" style={{ background: 'var(--red-light)', border: '1px solid rgba(211,47,47,0.15)' }}>
              <AlertCircle size={16} style={{ color: 'var(--red-danger)', flexShrink: 0 }} />
              <p style={{ fontSize: '0.8125rem', fontWeight: 500, color: 'var(--red-danger)' }}>{error}</p>
            </div>
          )}

          {/* Reset success */}
          {resetSent && (
            <div className="flex items-center gap-2.5 mb-5 p-3.5 rounded-xl" style={{ background: 'var(--green-light)', border: '1px solid rgba(46,125,50,0.15)' }}>
              <Mail size={16} style={{ color: 'var(--green-success)', flexShrink: 0 }} />
              <p style={{ fontSize: '0.8125rem', fontWeight: 500, color: 'var(--green-success)' }}>Password reset email sent! Check your inbox.</p>
            </div>
          )}

          {/* Social Buttons */}
          {mode !== 'reset' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24 }}>
              <button
                onClick={handleGoogle}
                disabled={loading}
                className="flex items-center justify-center gap-3 w-full"
                style={{
                  padding: '12px 16px', minHeight: 48,
                  borderRadius: 'var(--radius-lg)',
                  border: '1.5px solid var(--border)',
                  background: 'var(--bg-card)',
                  cursor: 'pointer', fontSize: '0.9375rem', fontWeight: 600,
                  color: 'var(--text-primary)',
                  transition: 'all 0.25s', boxShadow: 'var(--shadow-xs)',
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = '#4285F4'; e.currentTarget.style.boxShadow = '0 2px 8px rgba(66,133,244,0.15)' }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.boxShadow = 'var(--shadow-xs)' }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
                Continue with Google
              </button>

              <button
                onClick={handleGithub}
                disabled={loading}
                className="flex items-center justify-center gap-3 w-full"
                style={{
                  padding: '12px 16px', minHeight: 48,
                  borderRadius: 'var(--radius-lg)',
                  border: '1.5px solid var(--border)',
                  background: 'var(--bg-card)',
                  cursor: 'pointer', fontSize: '0.9375rem', fontWeight: 600,
                  color: 'var(--text-primary)',
                  transition: 'all 0.25s', boxShadow: 'var(--shadow-xs)',
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = '#333'; e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)' }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.boxShadow = 'var(--shadow-xs)' }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="#333">
                  <path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0 1 12 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z"/>
                </svg>
                Continue with GitHub
              </button>
            </div>
          )}

          {/* Divider */}
          {mode !== 'reset' && (
            <div className="flex items-center gap-4 mb-6">
              <div className="flex-1" style={{ height: 1, background: 'var(--border)' }} />
              <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>or continue with email</span>
              <div className="flex-1" style={{ height: 1, background: 'var(--border)' }} />
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

            {mode === 'signup' && (
              <div style={{ position: 'relative' }}>
                <User size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input
                  type="text" placeholder="Full name" value={name} onChange={e => setName(e.target.value)}
                  required={mode === 'signup'} autoComplete="name"
                  className="input-gov" style={{ paddingLeft: 42 }}
                />
              </div>
            )}

            <div style={{ position: 'relative' }}>
              <Mail size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                type="email" placeholder="Email address" value={email} onChange={e => setEmail(e.target.value)}
                required autoComplete="email"
                className="input-gov" style={{ paddingLeft: 42 }}
              />
            </div>

            {mode !== 'reset' && (
              <div style={{ position: 'relative' }}>
                <Lock size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input
                  type={showPassword ? 'text' : 'password'} placeholder="Password" value={password} onChange={e => setPassword(e.target.value)}
                  required minLength={6} autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                  className="input-gov" style={{ paddingLeft: 42, paddingRight: 42 }}
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)}
                  style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            )}

            {mode === 'login' && (
              <div className="flex justify-end">
                <button type="button" onClick={() => switchMode('reset')}
                  style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--saffron)', background: 'none', border: 'none', cursor: 'pointer' }}>
                  Forgot password?
                </button>
              </div>
            )}

            <button type="submit" disabled={loading} className="btn-primary w-full mt-1"
              style={{ fontSize: '1rem', padding: '14px 24px', minHeight: 52 }}>
              {loading ? <Loader2 size={20} className="animate-spin" /> : (
                <>
                  {mode === 'login' ? 'Sign In' : mode === 'signup' ? 'Create Account' : 'Send Reset Link'}
                  <ArrowRight size={18} />
                </>
              )}
            </button>
          </form>

          {/* Toggle mode */}
          <div className="text-center mt-6">
            {mode === 'reset' ? (
              <button onClick={() => switchMode('login')}
                style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-secondary)', background: 'none', border: 'none', cursor: 'pointer' }}>
                ← Back to sign in
              </button>
            ) : (
              <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
                <button
                  onClick={() => switchMode(mode === 'login' ? 'signup' : 'login')}
                  style={{ fontWeight: 700, color: 'var(--saffron)', background: 'none', border: 'none', cursor: 'pointer' }}>
                  {mode === 'login' ? 'Sign up free' : 'Sign in'}
                </button>
              </p>
            )}
          </div>

          {/* Footer */}
          <p style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', textAlign: 'center', marginTop: 32, lineHeight: 1.6 }}>
            By continuing, you agree to NyayaMitra's Terms of Service and Privacy Policy
          </p>
        </div>
      </div>
    </div>
  )
}
