// Splash — NyayaMitra premium language selection
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Scale, ChevronRight, ShieldCheck, Lock, Users } from 'lucide-react'
import { useAppStore, LANG_LABELS, type Language } from '@/store/useAppStore'

const LANGUAGES: Language[] = ['hi', 'en', 'mr', 'ta', 'bn', 'te', 'gu', 'kn']

export default function Splash() {
  const navigate = useNavigate()
  const { language, setLanguage } = useAppStore()
  const [selected, setSelected] = useState<Language>(language)

  const handleContinue = () => {
    setLanguage(selected)
    navigate('/auth')
  }

  return (
    <div
      id="splash-page"
      className="min-h-screen flex flex-col items-center justify-center px-6 relative overflow-hidden"
      style={{ background: 'linear-gradient(160deg, #FFF8F0 0%, #F0F4F8 35%, #E8EFF8 70%, #F5F7FA 100%)' }}
    >
      {/* Decorative circles */}
      <div style={{
        position: 'absolute', top: -80, right: -80,
        width: 260, height: 260, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(255,153,51,0.06) 0%, transparent 60%)',
        pointerEvents: 'none',
      }} />
      <div style={{
        position: 'absolute', bottom: -100, left: -60,
        width: 300, height: 300, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(11,31,58,0.03) 0%, transparent 60%)',
        pointerEvents: 'none',
      }} />
      {/* Decorative Ashoka Chakra ring */}
      <div style={{
        position: 'absolute', top: '15%', right: '8%',
        width: 100, height: 100, borderRadius: '50%',
        border: '1.5px solid rgba(11,31,58,0.04)',
        pointerEvents: 'none',
      }} />

      {/* Logo area */}
      <div className="fade-in flex flex-col items-center mb-10 relative z-10">
        {/* Logo icon */}
        <div
          className="pop-in"
          style={{
            width: 100, height: 100,
            borderRadius: 'var(--radius-2xl)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'linear-gradient(145deg, var(--navy) 0%, var(--navy-light) 100%)',
            boxShadow: '0 16px 48px rgba(11,31,58,0.25), inset 0 1px 0 rgba(255,255,255,0.1)',
            marginBottom: 24,
            position: 'relative',
          }}
        >
          <Scale size={48} color="#FFFFFF" />
          {/* inner border ring */}
          <div style={{
            position: 'absolute', inset: 3,
            borderRadius: 'calc(var(--radius-2xl) - 3px)',
            border: '1.5px solid rgba(255,255,255,0.08)',
            pointerEvents: 'none',
          }} />
        </div>

        {/* Title */}
        <h1 className="brand-logo" style={{ fontSize: '2.5rem', textAlign: 'center' }}>
          <span className="brand-nyaya">न्याय</span><span className="brand-mitra">मित्र</span>
        </h1>
        <p style={{
          fontSize: '0.75rem', fontWeight: 700, textAlign: 'center', marginTop: 4,
          color: 'var(--text-secondary)', letterSpacing: '0.1em', textTransform: 'uppercase',
        }}>
          NyayaMitra AI
        </p>
        <p style={{ fontSize: '0.9375rem', color: 'var(--text-secondary)', fontWeight: 400, textAlign: 'center', marginTop: 8, maxWidth: 280 }}>
          Your Trusted Legal Assistant
        </p>

        {/* Trust badges */}
        <div className="flex items-center gap-2.5 mt-6 flex-wrap justify-center">
          {[
            { icon: ShieldCheck, label: 'Verified', color: 'var(--blue-secondary)' },
            { icon: Lock, label: 'Secure', color: 'var(--green-success)' },
            { icon: Users, label: 'Free for All', color: 'var(--saffron)' },
          ].map((b) => (
            <div key={b.label} className="trust-badge" style={{ fontSize: '0.6875rem', padding: '6px 14px' }}>
              <b.icon size={13} style={{ color: b.color }} />
              <span>{b.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Language selector */}
      <div className="slide-up w-full max-w-sm relative z-10" style={{ animationDelay: '0.15s' }}>
        <p style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)', textAlign: 'center', marginBottom: 14 }}>
          Choose your language / अपनी भाषा चुनें
        </p>
        <div className="grid grid-cols-2 gap-3 mb-7">
          {LANGUAGES.map((lang) => (
            <button
              key={lang}
              id={`lang-${lang}`}
              onClick={() => setSelected(lang)}
              style={{
                padding: '15px 16px',
                borderRadius: 'var(--radius-lg)',
                fontSize: '0.9375rem',
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                background: selected === lang
                  ? 'linear-gradient(135deg, var(--saffron-light) 0%, #FFE0B2 100%)'
                  : 'var(--bg-card)',
                border: `2px solid ${selected === lang ? 'var(--saffron)' : 'var(--border)'}`,
                color: selected === lang ? 'var(--saffron-dark)' : 'var(--text-primary)',
                boxShadow: selected === lang
                  ? '0 4px 16px rgba(255,153,51,0.18), inset 0 0 0 1px rgba(255,153,51,0.1)'
                  : 'var(--shadow-sm)',
                transform: selected === lang ? 'scale(1.02)' : 'scale(1)',
              }}
            >
              {LANG_LABELS[lang]}
            </button>
          ))}
        </div>

        <button
          id="splash-continue-btn"
          onClick={handleContinue}
          className="btn-primary w-full flex items-center justify-center gap-2"
          style={{ fontSize: '1.0625rem', padding: '1.0625rem 1.5rem', borderRadius: 'var(--radius-xl)' }}
        >
          Get Started
          <ChevronRight size={20} strokeWidth={2.5} />
        </button>
      </div>

      {/* Footer */}
      <p style={{
        position: 'absolute', bottom: 28,
        fontSize: '0.6875rem', color: 'var(--text-muted)', textAlign: 'center',
        padding: '0 24px', lineHeight: 1.6, letterSpacing: '0.01em',
      }}>
        Free legal aid for every Indian citizen · Powered by AI + Indian Law
      </p>
    </div>
  )
}
