// BottomNav — persistent bottom navigation bar
import { useLocation, useNavigate } from 'react-router-dom'
import { Mic, FileText, BarChart2, Scale, Shield } from 'lucide-react'

const NAV_ITEMS = [
  { path: '/voice', icon: Mic, label: 'Voice' },
  { path: '/decode', icon: FileText, label: 'Docs' },
  { path: '/case', icon: BarChart2, label: 'Cases' },
  { path: '/score', icon: Scale, label: 'Score' },
  { path: '/police', icon: Shield, label: 'Police' },
]

export default function BottomNav() {
  const location = useLocation()
  const navigate = useNavigate()

  // Hide on splash screen
  if (location.pathname === '/') return null

  return (
    <nav
      id="bottom-nav"
      className="fixed bottom-0 left-0 right-0 z-50 border-t border-white/10 backdrop-blur-xl"
      style={{ background: 'rgba(10,14,26,0.95)' }}
    >
      <div className="flex items-center justify-around max-w-lg mx-auto px-2 py-2">
        {NAV_ITEMS.map(({ path, icon: Icon, label }) => {
          const active = location.pathname === path
          return (
            <button
              key={path}
              id={`nav-${label.toLowerCase()}`}
              onClick={() => navigate(path)}
              className="flex flex-col items-center gap-1 px-3 py-1.5 rounded-xl transition-all duration-200"
              style={{
                color: active ? '#f59e0b' : '#64748b',
                background: active ? 'rgba(245,158,11,0.1)' : 'transparent',
              }}
            >
              <Icon size={20} strokeWidth={active ? 2.5 : 1.8} />
              <span className="text-[10px] font-medium">{label}</span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}
