// Sidebar — web application navigation with auth
import { useLocation, useNavigate } from 'react-router-dom'
import { Home, FileText, Scale, Mic, BarChart2, Shield, Bell, MapPin, Handshake, ShieldCheck, Phone, LogOut, Users } from 'lucide-react'
import { useAuth } from '@/store/AuthContext'

const MAIN_NAV = [
  { path: '/home', icon: Home, label: 'Dashboard', color: '#FF9933', bg: '#FFF3E0' },
  { path: '/voice', icon: Mic, label: 'Voice Counsellor', color: '#FF9933', bg: '#FFF3E0' },
  { path: '/decode', icon: FileText, label: 'Doc Decoder', color: '#5E35B1', bg: '#EDE7F6' },
  { path: '/score', icon: Scale, label: 'NyayaScore', color: '#2E7D32', bg: '#E8F5E9' },
]

const TOOLS_NAV = [
  { path: '/lawyers', icon: Users, label: 'Lawyer Finder', color: '#9C27B0', bg: '#F3E5F5' },
  { path: '/case', icon: BarChart2, label: 'Case Tracker', color: '#1976D2', bg: '#E3F2FD' },
  { path: '/police', icon: Shield, label: 'Police Mode', color: '#D32F2F', bg: '#FFEBEE' },
  { path: '/amendments', icon: Bell, label: 'Amendments', color: '#F59E0B', bg: '#FFF8E1' },
  { path: '/dlsa', icon: MapPin, label: 'DLSA Connect', color: '#00897B', bg: '#E0F2F1' },
  { path: '/negotiate', icon: Handshake, label: 'Negotiation Coach', color: '#5C6BC0', bg: '#E8EAF6' },
]

export default function Sidebar() {
  const location = useLocation()
  const navigate = useNavigate()
  const { user, signOut } = useAuth()

  if (location.pathname === '/' || location.pathname === '/auth') return null

  const handleSignOut = async () => {
    await signOut()
    navigate('/auth')
  }

  const renderItems = (items: typeof MAIN_NAV) =>
    items.map(({ path, icon: Icon, label, color, bg }) => {
      const active = location.pathname === path
      return (
        <button
          key={path}
          onClick={() => navigate(path)}
          className={`sidebar-item ${active ? 'active' : ''}`}
        >
          <div className="sidebar-icon-box" style={{ background: active ? `${color}18` : bg }}>
            <Icon size={18} style={{ color }} />
          </div>
          <span>{label}</span>
        </button>
      )
    })

  return (
    <aside className="sidebar">
      {/* Logo */}
      <div className="sidebar-logo" onClick={() => navigate('/home')} style={{ cursor: 'pointer' }}>
        <img
          src="/nyayamitra-logo.png"
          alt="NyayaMitra"
          style={{ width: 42, height: 42, objectFit: 'contain', flexShrink: 0 }}
        />
        <div>
          <div className="brand-logo" style={{ fontSize: '1.125rem' }}>
            <span className="brand-nyaya">न्याय</span><span className="brand-mitra">मित्र</span>
          </div>
          <p style={{ fontSize: '0.6rem', fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase', marginTop: 1 }}>
            NyayaMitra AI
          </p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="sidebar-nav">
        <div className="sidebar-section-label">Main</div>
        {renderItems(MAIN_NAV)}

        <div className="sidebar-section-label">Tools</div>
        {renderItems(TOOLS_NAV)}
      </nav>

      {/* Footer with user info */}
      <div className="sidebar-footer">
        {/* User profile */}
        {user && (
          <div className="flex items-center gap-3 mb-3 pb-3" style={{ borderBottom: '1px solid var(--border)' }}>
            {user.photoURL ? (
              <img src={user.photoURL} alt="" style={{ width: 34, height: 34, borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--saffron)' }} />
            ) : (
              <div style={{ width: 34, height: 34, borderRadius: '50%', background: 'linear-gradient(135deg, var(--saffron), var(--saffron-dark))', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#FFF', fontSize: '0.75rem', fontWeight: 800 }}>
                {(user.displayName || user.email || 'U').charAt(0).toUpperCase()}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--text-primary)' }} className="truncate">
                {user.displayName || 'User'}
              </p>
              <p style={{ fontSize: '0.625rem', color: 'var(--text-muted)' }} className="truncate">
                {user.email}
              </p>
            </div>
            <button
              onClick={handleSignOut}
              title="Sign out"
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', transition: 'color 0.2s', padding: 4 }}
              onMouseEnter={e => { e.currentTarget.style.color = 'var(--red-danger)' }}
              onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-muted)' }}
            >
              <LogOut size={16} />
            </button>
          </div>
        )}

        <a href="tel:15100" className="flex items-center gap-2.5 text-sm mb-3" style={{ color: 'var(--red-danger)', fontWeight: 700, textDecoration: 'none' }}>
          <Phone size={14} /> NALSA: 15100
        </a>
        <div className="flex items-center gap-2" style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>
          <ShieldCheck size={12} style={{ color: 'var(--blue-secondary)' }} />
          <span>Govt. of India Verified</span>
        </div>
      </div>
    </aside>
  )
}
