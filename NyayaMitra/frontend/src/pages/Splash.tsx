// Landing Page — NyayaMitra state-of-the-art showcase
import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ChevronRight, ShieldCheck, Lock, Users, Mic, FileText, Scale, Shield,
  BarChart2, Bell, MapPin, Handshake, Sparkles, Globe, Zap, ArrowRight,
  Phone, CheckCircle2, Star, Award, ChevronDown,
} from 'lucide-react'
import { useAppStore, LANG_LABELS, type Language } from '@/store/useAppStore'

const LANGUAGES: Language[] = ['hi', 'en', 'mr', 'ta', 'bn', 'te', 'gu', 'kn']

const FEATURES = [
  { icon: Mic, label: 'Voice Counsellor', desc: 'Ask legal questions in 8 Indian languages via voice or text', color: '#FF9933', bg: '#FFF3E0' },
  { icon: FileText, label: 'Doc Decoder', desc: 'AI scans contracts & identifies illegal clauses instantly', color: '#5E35B1', bg: '#EDE7F6' },
  { icon: Scale, label: 'NyayaScore', desc: 'Get your personal legal health score with risk analysis', color: '#2E7D32', bg: '#E8F5E9' },
  { icon: Users, label: 'Lawyer Finder', desc: 'AI matches you with the best lawyers for your case type', color: '#9C27B0', bg: '#F3E5F5' },
  { icon: Shield, label: 'Police Station Mode', desc: 'Know your rights + auto-generate FIR complaints', color: '#D32F2F', bg: '#FFEBEE' },
  { icon: BarChart2, label: 'Case Tracker', desc: 'Track court cases with real-time eCourts integration', color: '#1976D2', bg: '#E3F2FD' },
  { icon: Bell, label: 'Amendment Alerts', desc: 'Stay updated with latest changes in Indian law', color: '#F59E0B', bg: '#FFF8E1' },
  { icon: MapPin, label: 'DLSA Connect', desc: 'Locate nearest free legal aid centers on the map', color: '#00897B', bg: '#E0F2F1' },
  { icon: Handshake, label: 'Negotiation Coach', desc: 'AI-powered roleplay to prepare for legal disputes', color: '#5C6BC0', bg: '#E8EAF6' },
  { icon: Sparkles, label: 'Gamified Learning', desc: 'Earn XP, badges, and level up your legal awareness', color: '#FF9933', bg: '#FFF3E0' },
]

const STATS = [
  { value: '8+', label: 'Languages', icon: Globe },
  { value: '30+', label: 'Features', icon: Zap },
  { value: '100%', label: 'Free', icon: Star },
  { value: '24/7', label: 'Available', icon: Award },
]

const STEPS = [
  { num: '01', title: 'Ask Your Question', desc: 'Speak or type your legal concern in any supported Indian language', icon: Mic },
  { num: '02', title: 'AI Analyzes Laws', desc: 'Our RAG pipeline searches through Indian statutes to find the most relevant laws', icon: Scale },
  { num: '03', title: 'Get Actionable Advice', desc: 'Receive clear, cited legal guidance with specific next steps to take', icon: CheckCircle2 },
]

export default function Splash() {
  const navigate = useNavigate()
  const { language, setLanguage } = useAppStore()
  const [selected, setSelected] = useState<Language>(language)
  const [isVisible, setIsVisible] = useState(false)
  const [animatedStats, setAnimatedStats] = useState(false)
  const statsRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setIsVisible(true)
    const observer = new IntersectionObserver(
      (entries) => { if (entries[0].isIntersecting) setAnimatedStats(true) },
      { threshold: 0.3 }
    )
    if (statsRef.current) observer.observe(statsRef.current)
    return () => observer.disconnect()
  }, [])

  const handleContinue = () => {
    setLanguage(selected)
    navigate('/auth')
  }

  return (
    <div id="landing-page" style={{ minHeight: '100vh', background: '#FAFBFC', overflowX: 'hidden' }}>

      {/* ═══ NAVIGATION BAR ═══════════════════════════════════ */}
      <nav className={`landing-nav ${isVisible ? 'visible' : ''}`}>
        <div className="landing-nav-inner">
          <div className="flex items-center gap-3">
            <img src="/nyayamitra-logo.png" alt="NyayaMitra" style={{ width: 40, height: 40, objectFit: 'contain' }} />
            <div>
              <div className="brand-logo" style={{ fontSize: '1.25rem' }}>
                <span className="brand-nyaya">न्याय</span><span className="brand-mitra">मित्र</span>
              </div>
              <p style={{ fontSize: '0.5625rem', fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.1em', textTransform: 'uppercase', marginTop: -1 }}>
                AI Legal Assistant
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <a href="tel:15100" className="landing-nav-link" style={{ color: 'var(--red-danger)', fontWeight: 700 }}>
              <Phone size={14} /> NALSA: 15100
            </a>
            <button onClick={handleContinue} className="btn-primary" style={{ padding: '10px 24px', minHeight: 40, fontSize: '0.875rem' }}>
              Get Started <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </nav>

      {/* ═══ HERO SECTION ═════════════════════════════════════ */}
      <section className="landing-hero">
        {/* Decorative elements */}
        <div className="hero-deco hero-deco-1" />
        <div className="hero-deco hero-deco-2" />
        <div className="hero-deco hero-deco-3" />

        <div className="landing-container" style={{ position: 'relative', zIndex: 2, paddingTop: 100, paddingBottom: 80 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '64px', alignItems: 'center' }}>
            
            {/* Left: Text */}
            <div className={`${isVisible ? 'slide-up' : ''}`}>
              <div className="flex items-center gap-2 mb-5">
                <span style={{ padding: '6px 16px', borderRadius: 'var(--radius-full)', background: 'linear-gradient(135deg, var(--saffron-light), #FFE0B2)', border: '1px solid rgba(255,153,51,0.2)', fontSize: '0.75rem', fontWeight: 700, color: 'var(--saffron-dark)', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  <Sparkles size={13} /> AI-Powered Legal Justice
                </span>
              </div>
              <h1 style={{
                fontFamily: "'Poppins', sans-serif", fontSize: '3.25rem', fontWeight: 900,
                color: 'var(--navy)', letterSpacing: '-0.04em', lineHeight: 1.1, marginBottom: 20,
              }}>
                Legal Justice for{' '}
                <span style={{ color: 'var(--saffron)', position: 'relative' }}>
                  Every Indian
                  <svg viewBox="0 0 200 10" style={{ position: 'absolute', bottom: -4, left: 0, width: '100%', height: 10 }}>
                    <path d="M0 8 Q50 0 100 5 T200 3" stroke="var(--saffron)" strokeWidth="3" fill="none" strokeLinecap="round" opacity="0.4" />
                  </svg>
                </span>{' '}
                Citizen
              </h1>
              <p style={{ fontSize: '1.125rem', color: 'var(--text-secondary)', lineHeight: 1.7, maxWidth: 520, marginBottom: 32 }}>
                NyayaMitra is India's first AI-powered legal assistant that understands your rights, 
                decodes complex documents, and connects you with the right legal help — all in your own language.
              </p>

              <div className="flex items-center gap-4 mb-8">
                <button onClick={handleContinue} className="btn-primary" style={{ padding: '14px 32px', fontSize: '1.0625rem', borderRadius: 'var(--radius-xl)' }}>
                  Start Free <ArrowRight size={18} />
                </button>
                <a href="#features" className="btn-ghost" style={{ padding: '14px 28px', fontSize: '1.0625rem', borderRadius: 'var(--radius-xl)' }}>
                  Explore Features
                </a>
              </div>

              {/* Trust badges */}
              <div className="flex items-center gap-3 flex-wrap">
                {[
                  { icon: ShieldCheck, label: 'Govt. Verified Laws', color: 'var(--blue-secondary)' },
                  { icon: Lock, label: 'Private & Secure', color: 'var(--green-success)' },
                  { icon: Users, label: 'Free for All Citizens', color: 'var(--saffron)' },
                ].map((b) => (
                  <div key={b.label} className="trust-badge" style={{ fontSize: '0.75rem', padding: '7px 16px' }}>
                    <b.icon size={14} style={{ color: b.color }} />
                    <span>{b.label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Right: Logo + Visual */}
            <div className={`landing-hero-visual ${isVisible ? 'pop-in' : ''}`} style={{ animationDelay: '0.2s' }}>
              <div className="landing-logo-showcase">
                <div className="landing-logo-glow" />
                <img src="/nyayamitra-logo.png" alt="NyayaMitra" style={{ width: '280px', height: '280px', objectFit: 'contain', position: 'relative', zIndex: 2, filter: 'drop-shadow(0 20px 60px rgba(11,31,58,0.15))' }} />
                {/* Floating feature pills */}
                <div className="floating-pill" style={{ top: '10%', right: '-10%', animationDelay: '0s' }}>
                  <Mic size={14} style={{ color: '#FF9933' }} /> Voice AI
                </div>
                <div className="floating-pill" style={{ bottom: '15%', right: '-5%', animationDelay: '1s' }}>
                  <FileText size={14} style={{ color: '#5E35B1' }} /> Doc Scanner
                </div>
                <div className="floating-pill" style={{ top: '55%', left: '-12%', animationDelay: '2s' }}>
                  <Scale size={14} style={{ color: '#2E7D32' }} /> NyayaScore
                </div>
                <div className="floating-pill" style={{ top: '5%', left: '5%', animationDelay: '0.5s' }}>
                  <Shield size={14} style={{ color: '#D32F2F' }} /> FIR Builder
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Scroll indicator */}
        <a href="#stats" className="landing-scroll-indicator">
          <span style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'var(--text-muted)' }}>Explore</span>
          <ChevronDown size={18} style={{ color: 'var(--saffron)', animation: 'bounceDown 1.5s ease infinite' }} />
        </a>
      </section>

      {/* ═══ STATS BAR ════════════════════════════════════════ */}
      <section id="stats" ref={statsRef} className="landing-stats-section">
        <div className="landing-container">
          <div className="landing-stats-grid">
            {STATS.map((stat, i) => (
              <div key={stat.label} className={`landing-stat-item ${animatedStats ? 'slide-up' : ''}`} style={{ animationDelay: `${i * 0.1}s` }}>
                <stat.icon size={24} style={{ color: 'var(--saffron)', marginBottom: 8 }} />
                <span className="landing-stat-value">{stat.value}</span>
                <span className="landing-stat-label">{stat.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ HOW IT WORKS ═════════════════════════════════════ */}
      <section className="landing-section" style={{ background: '#FFFFFF' }}>
        <div className="landing-container">
          <div className="landing-section-header">
            <span className="landing-section-tag">Simple Process</span>
            <h2 className="landing-section-title">How NyayaMitra Works</h2>
            <p className="landing-section-subtitle">Get legal guidance in three simple steps — no legal jargon, no fees</p>
          </div>
          <div className="landing-steps-grid">
            {STEPS.map((step, i) => (
              <div key={step.num} className="landing-step-card slide-up" style={{ animationDelay: `${i * 0.15}s` }}>
                <div className="landing-step-num">{step.num}</div>
                <div className="landing-step-icon">
                  <step.icon size={28} style={{ color: '#FFF' }} />
                </div>
                <h3 style={{ fontFamily: "'Poppins', sans-serif", fontSize: '1.25rem', fontWeight: 800, color: 'var(--navy)', marginBottom: 8 }}>
                  {step.title}
                </h3>
                <p style={{ fontSize: '0.9375rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                  {step.desc}
                </p>
                {i < STEPS.length - 1 && <div className="landing-step-connector" />}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ FEATURES GRID ════════════════════════════════════ */}
      <section id="features" className="landing-section" style={{ background: 'var(--bg-page)' }}>
        <div className="landing-container">
          <div className="landing-section-header">
            <span className="landing-section-tag">Platform Capabilities</span>
            <h2 className="landing-section-title">30+ Features, One Platform</h2>
            <p className="landing-section-subtitle">Everything you need to understand, protect, and exercise your legal rights</p>
          </div>
          <div className="landing-features-grid">
            {FEATURES.map((feat, i) => (
              <div key={feat.label} className="landing-feature-card slide-up" style={{ animationDelay: `${i * 0.05}s` }}>
                <div style={{ width: 52, height: 52, borderRadius: 'var(--radius-lg)', background: feat.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16, transition: 'transform 0.3s var(--ease-spring)' }}>
                  <feat.icon size={24} style={{ color: feat.color }} />
                </div>
                <h3 style={{ fontFamily: "'Poppins', sans-serif", fontSize: '1rem', fontWeight: 700, color: 'var(--navy)', marginBottom: 6 }}>
                  {feat.label}
                </h3>
                <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                  {feat.desc}
                </p>
                <div className="landing-feature-accent" style={{ background: feat.color }} />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ LANGUAGE + CTA ═══════════════════════════════════ */}
      <section className="landing-section" style={{ background: 'linear-gradient(160deg, var(--navy) 0%, var(--navy-light) 100%)', color: '#FFF' }}>
        <div className="landing-container">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '64px', alignItems: 'center' }}>
            {/* Left: CTA */}
            <div>
              <h2 style={{ fontFamily: "'Poppins', sans-serif", fontSize: '2.5rem', fontWeight: 900, letterSpacing: '-0.03em', lineHeight: 1.15, marginBottom: 16 }}>
                Ready to Know{' '}
                <span style={{ color: 'var(--saffron)' }}>Your Rights?</span>
              </h2>
              <p style={{ fontSize: '1.0625rem', opacity: 0.75, lineHeight: 1.7, maxWidth: 440, marginBottom: 32 }}>
                Join thousands of Indian citizens who are already using NyayaMitra to navigate the 
                legal system with confidence.
              </p>
              <button onClick={handleContinue} className="btn-primary" style={{ padding: '16px 40px', fontSize: '1.125rem', borderRadius: 'var(--radius-xl)', background: 'linear-gradient(135deg, var(--saffron), #E68A2E)' }}>
                Start Now — It's Free <ArrowRight size={20} />
              </button>
            </div>

            {/* Right: Language selector */}
            <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: 'var(--radius-2xl)', padding: '32px', border: '1px solid rgba(255,255,255,0.08)', backdropFilter: 'blur(10px)' }}>
              <p style={{ fontSize: '0.9375rem', fontWeight: 700, textAlign: 'center', marginBottom: 20, opacity: 0.9 }}>
                Choose your language / अपनी भाषा चुनें
              </p>
              <div className="grid grid-cols-2 gap-3 mb-6">
                {LANGUAGES.map((lang) => (
                  <button
                    key={lang}
                    id={`lang-${lang}`}
                    onClick={() => setSelected(lang)}
                    style={{
                      padding: '14px 16px', borderRadius: 'var(--radius-lg)',
                      fontSize: '0.9375rem', fontWeight: 700, cursor: 'pointer',
                      transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                      background: selected === lang ? 'rgba(255,153,51,0.2)' : 'rgba(255,255,255,0.06)',
                      border: `2px solid ${selected === lang ? 'var(--saffron)' : 'rgba(255,255,255,0.1)'}`,
                      color: selected === lang ? 'var(--saffron)' : 'rgba(255,255,255,0.7)',
                      transform: selected === lang ? 'scale(1.03)' : 'scale(1)',
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
                style={{ fontSize: '1rem', padding: '14px 1.5rem', borderRadius: 'var(--radius-xl)' }}
              >
                Continue with {LANG_LABELS[selected]} <ChevronRight size={18} strokeWidth={2.5} />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ FOOTER ═══════════════════════════════════════════ */}
      <footer className="landing-footer">
        <div className="landing-container">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <img src="/nyayamitra-logo.png" alt="NyayaMitra" style={{ width: 32, height: 32, objectFit: 'contain' }} />
              <div>
                <div className="brand-logo" style={{ fontSize: '1rem' }}>
                  <span className="brand-nyaya">न्याय</span><span className="brand-mitra">मित्र</span>
                </div>
                <p style={{ fontSize: '0.625rem', color: 'var(--text-muted)', marginTop: 1 }}>
                  AI-Powered Legal Justice
                </p>
              </div>
            </div>
            <div className="flex items-center gap-6">
              <a href="tel:15100" className="flex items-center gap-2" style={{ color: 'var(--red-danger)', fontWeight: 700, fontSize: '0.875rem', textDecoration: 'none' }}>
                <Phone size={14} /> NALSA Helpline: 15100
              </a>
              <div className="flex items-center gap-2" style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                <ShieldCheck size={13} style={{ color: 'var(--blue-secondary)' }} />
                Powered by AI + Indian Law
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
