// BottomNav — NyayaMitra premium navigation
import { useState, useEffect, useCallback } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Home, FileText, Scale, Mic, BarChart2, Shield, Bell, MapPin, Handshake, MoreHorizontal, X, ShieldCheck } from 'lucide-react'

const PRIMARY_NAV = [
  { path: '/home', icon: Home, label: 'Home' },
  { path: '/decode', icon: FileText, label: 'Docs' },
  { path: '/score', icon: Scale, label: 'Score' },
]

const MORE_ITEMS = [
  { path: '/voice', icon: Mic, label: 'Voice Counsellor', sublabel: 'Ask legal questions', color: '#FF9933', bg: 'linear-gradient(135deg, #FFF3E0 0%, #FFE0B2 100%)' },
  { path: '/case', icon: BarChart2, label: 'Case Tracker', sublabel: 'Track your cases', color: '#1976D2', bg: 'linear-gradient(135deg, #E3F2FD 0%, #BBDEFB 100%)' },
  { path: '/police', icon: Shield, label: 'Police Mode', sublabel: 'Know your rights · File FIR', color: '#D32F2F', bg: 'linear-gradient(135deg, #FFEBEE 0%, #FFCDD2 100%)' },
  { path: '/amendments', icon: Bell, label: 'Amendments', sublabel: 'Latest law changes', color: '#F59E0B', bg: 'linear-gradient(135deg, #FFF8E1 0%, #FFECB3 100%)' },
  { path: '/dlsa', icon: MapPin, label: 'DLSA Connect', sublabel: 'Find free legal aid', color: '#00897B', bg: 'linear-gradient(135deg, #E0F2F1 0%, #B2DFDB 100%)' },
  { path: '/negotiate', icon: Handshake, label: 'Negotiation Coach', sublabel: 'Roleplay disputes', color: '#5C6BC0', bg: 'linear-gradient(135deg, #E8EAF6 0%, #C5CAE9 100%)' },
]

export default function BottomNav() {
  const location = useLocation()
  const navigate = useNavigate()
  const [showMore, setShowMore] = useState(false)

  useEffect(() => { setShowMore(false) }, [location.pathname])

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') setShowMore(false)
  }, [])

  useEffect(() => {
    if (showMore) {
      document.addEventListener('keydown', handleKeyDown)
      document.body.style.overflow = 'hidden'
    } else { document.body.style.overflow = '' }
    return () => { document.removeEventListener('keydown', handleKeyDown); document.body.style.overflow = '' }
  }, [showMore, handleKeyDown])

  const isMoreActive = MORE_ITEMS.some(item => location.pathname === item.path)

  if (location.pathname === '/') return null

  return (
    <>
      {/* More Menu Overlay */}
      {showMore && <div className="more-menu-overlay" onClick={() => setShowMore(false)} />}

      {/* More Menu Bottom Sheet */}
      {showMore && (
        <div className="more-menu-sheet" role="dialog" aria-label="All features">
          <div className="more-menu-handle" />
          <div className="flex items-center justify-between mb-5 px-1">
            <p className="text-label" style={{ fontSize: '0.8125rem' }}>All Features</p>
            <button onClick={() => setShowMore(false)} style={{ width: 36, height: 36, borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--border)', background: 'var(--bg-page)', cursor: 'pointer' }} aria-label="Close menu">
              <X size={16} style={{ color: 'var(--text-secondary)' }} />
            </button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {MORE_ITEMS.map(({ path, icon: Icon, label, sublabel, color, bg }) => {
              const active = location.pathname === path
              return (
                <button
                  key={path}
                  id={`more-nav-${label.toLowerCase().replace(/\s/g, '-')}`}
                  onClick={() => { navigate(path); setShowMore(false) }}
                  className="flex items-start gap-3 p-4 text-left transition-all duration-300"
                  style={{
                    background: active ? `linear-gradient(135deg, ${color}08, ${color}14)` : 'var(--bg-page)',
                    border: `1.5px solid ${active ? color : 'var(--border)'}`,
                    borderRadius: 'var(--radius-xl)',
                    cursor: 'pointer',
                    boxShadow: active ? `0 2px 8px ${color}15` : 'none',
                  }}
                >
                  <div style={{ width: 42, height: 42, borderRadius: 'var(--radius-lg)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, background: bg }}>
                    <Icon size={20} style={{ color }} />
                  </div>
                  <div className="min-w-0">
                    <p style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-primary)', fontFamily: "'Poppins', sans-serif" }} className="truncate">{label}</p>
                    <p style={{ fontSize: '0.6875rem', color: 'var(--text-secondary)', marginTop: 2 }} className="truncate">{sublabel}</p>
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Government Verified Footer Bar */}
      <div className="gov-footer fixed bottom-14 left-0 right-0 z-40">
        <ShieldCheck size={14} style={{ color: '#4FC3F7' }} />
        <span style={{ fontSize: '0.75rem' }}>
          <span style={{ color: 'rgba(255,255,255,0.8)' }}>Government of India </span>
          <span style={{ color: '#4FC3F7', fontWeight: 800 }}>Verified</span>
        </span>
      </div>

      {/* Bottom Navigation Bar */}
      <nav
        id="bottom-nav"
        className="fixed bottom-0 left-0 right-0 z-50 nav-safe-area"
        style={{
          background: 'var(--bg-card)',
          borderTop: '1px solid var(--border)',
          boxShadow: '0 -4px 20px rgba(0,0,0,0.06)',
        }}
      >
        <div className="flex items-center justify-around max-w-lg mx-auto px-2 py-1">
          {PRIMARY_NAV.map(({ path, icon: Icon, label }) => {
            const active = location.pathname === path
            return (
              <button
                key={path}
                id={`nav-${label.toLowerCase()}`}
                onClick={() => navigate(path)}
                className="flex flex-col items-center gap-0.5 px-5 py-2 rounded-2xl transition-all duration-300"
                style={{
                  color: active ? 'var(--saffron)' : 'var(--text-muted)',
                  background: active ? 'var(--saffron-50)' : 'transparent',
                  border: 'none', cursor: 'pointer', minWidth: 68,
                  boxShadow: active ? 'inset 0 -2px 0 var(--saffron)' : 'none',
                }}
              >
                <Icon size={22} strokeWidth={active ? 2.5 : 1.8} />
                <span style={{ fontSize: '0.625rem', fontWeight: active ? 800 : 500, letterSpacing: '0.02em' }}>{label}</span>
              </button>
            )
          })}

          <button
            id="nav-more"
            onClick={() => setShowMore(!showMore)}
            className="flex flex-col items-center gap-0.5 px-5 py-2 rounded-2xl transition-all duration-300"
            style={{
              color: isMoreActive || showMore ? 'var(--saffron)' : 'var(--text-muted)',
              background: isMoreActive || showMore ? 'var(--saffron-50)' : 'transparent',
              border: 'none', cursor: 'pointer', minWidth: 68,
              boxShadow: isMoreActive || showMore ? 'inset 0 -2px 0 var(--saffron)' : 'none',
            }}
          >
            <MoreHorizontal size={22} strokeWidth={showMore ? 2.5 : 1.8} />
            <span style={{ fontSize: '0.625rem', fontWeight: isMoreActive || showMore ? 800 : 500, letterSpacing: '0.02em' }}>More</span>
          </button>
        </div>
      </nav>
    </>
  )
}
