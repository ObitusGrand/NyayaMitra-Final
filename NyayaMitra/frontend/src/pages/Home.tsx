// Home — Dashboard with quick actions + status
import { useNavigate } from 'react-router-dom'
import { Mic, FileText, Scale, Shield, Bell, MapPin, Phone, ChevronRight, CheckCircle, WifiOff, Handshake } from 'lucide-react'
import { useAppStore, LANG_LABELS } from '@/store/useAppStore'
import { useEffect } from 'react'
import { checkHealth } from '@/services/api'

const QUICK_ACTIONS = [
  { id: 'voice', icon: Mic, label: 'Voice Counsellor', sublabel: 'Ask legal question', path: '/voice', color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' },
  { id: 'decode', icon: FileText, label: 'Decode Document', sublabel: 'Upload & analyse', path: '/decode', color: '#a78bfa', bg: 'rgba(167,139,250,0.1)' },
  { id: 'score', icon: Scale, label: 'NyayaScore', sublabel: 'Check legal health', path: '/score', color: '#34d399', bg: 'rgba(52,211,153,0.1)' },
  { id: 'police', icon: Shield, label: 'Police Mode', sublabel: 'File FIR · Know rights', path: '/police', color: '#f87171', bg: 'rgba(248,113,113,0.1)' },
  { id: 'amendments', icon: Bell, label: 'Amendments', sublabel: 'Latest law changes', path: '/amendments', color: '#fbbf24', bg: 'rgba(251,191,36,0.1)' },
  { id: 'dlsa', icon: MapPin, label: 'DLSA Connect', sublabel: 'Find free legal aid', path: '/dlsa', color: '#60a5fa', bg: 'rgba(96,165,250,0.1)' },
  { id: 'negotiate', icon: Handshake, label: 'Negotiation Coach', sublabel: 'Roleplay legal disputes', path: '/negotiate', color: '#34d399', bg: 'rgba(52,211,153,0.1)' },
]

export default function Home() {
  const navigate = useNavigate()
  const { language, backendOnline, setBackendOnline, cases, nyayaScore } = useAppStore()

  useEffect(() => {
    checkHealth().then(setBackendOnline)
  }, [setBackendOnline])

  return (
    <div id="home-page" className="page-wrapper">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-3xl font-black text-white">
            न्याय<span className="text-gold">मित्र</span>
          </h1>
          <div className="flex items-center gap-2 mt-1">
            <p className="text-xs text-slate-400">
              {LANG_LABELS[language]} ·{' '}
              <span className={backendOnline ? 'text-emerald-400' : 'text-red-400'}>
                {backendOnline ? '● Online' : '● Offline'}
              </span>
            </p>
            <span className="text-xs text-slate-600">|</span>
            <select
              value={useAppStore.getState().userState}
              onChange={(e) => useAppStore.getState().setUserState(e.target.value)}
              className="text-xs bg-transparent text-amber-400 font-medium focus:outline-none appearance-none cursor-pointer"
            >
              {['Central', 'Maharashtra', 'Delhi', 'Karnataka', 'Tamil Nadu', 'Gujarat'].map(s => (
                <option key={s} value={s} className="bg-slate-900 text-slate-300">{s}</option>
              ))}
            </select>
          </div>
        </div>
        <button
          id="emergency-call-btn"
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all"
          style={{ background: 'rgba(248,113,113,0.15)', color: '#f87171', border: '1px solid rgba(248,113,113,0.3)' }}
          onClick={() => window.open('tel:15100')}
        >
          <Phone size={14} />
          NALSA 15100
        </button>
      </div>

      {/* Dynamic NyayaScore Banner */}
      {nyayaScore !== null && (
        <div className="glass-card flex items-start gap-3 p-3 mb-4 transition-colors"
          style={{ 
            background: nyayaScore >= 76 ? 'rgba(52,211,153,0.05)' : nyayaScore >= 51 ? 'rgba(251,191,36,0.05)' : 'rgba(248,113,113,0.1)',
            border: `1px solid ${nyayaScore >= 76 ? 'rgba(52,211,153,0.2)' : nyayaScore >= 51 ? 'rgba(251,191,36,0.2)' : 'rgba(248,113,113,0.4)'}`
          }}
        >
          <Scale size={20} className="shrink-0 mt-0.5" style={{ color: nyayaScore >= 76 ? '#34d399' : nyayaScore >= 51 ? '#fbbf24' : '#f87171' }} />
          <div>
            <p className="text-sm font-semibold" style={{ color: nyayaScore >= 76 ? '#34d399' : nyayaScore >= 51 ? '#fbbf24' : '#f87171' }}>
              {nyayaScore >= 76 ? "Legal Health Strong" : nyayaScore >= 51 ? "Moderate Legal Risk" : "CRITICAL RISK DETECTED"}
            </p>
            <p className="text-xs text-slate-400 mt-0.5">
              {nyayaScore >= 76 
                ? "Your document standing is solid. No immediate action needed." 
                : nyayaScore >= 51 
                  ? "Unfavorable clauses detected. Use the Negotiation Coach before signing."
                  : "Illegal clauses or active cases detected. Please consult DLSA immediately."}
            </p>
          </div>
        </div>
      )}

      {/* Status bar */}
      {!backendOnline && (
        <div className="glass-card flex items-center gap-3 p-3 mb-4 border border-red-400/20"
          style={{ background: 'rgba(248,113,113,0.05)' }}>
          <WifiOff size={16} className="text-red-400 shrink-0" />
          <p className="text-xs text-slate-400">
            Backend offline — start with <code className="text-amber-400">uvicorn main:app</code>
          </p>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <div className="glass-card p-4 text-center">
          <p className="text-3xl font-black" style={{
            background: 'linear-gradient(135deg, #f59e0b, #fbbf24)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          }}>{nyayaScore ?? '—'}</p>
          <p className="text-xs text-slate-500 mt-1">NyayaScore</p>
        </div>
        <div className="glass-card p-4 text-center">
          <p className="text-3xl font-black text-white">{cases.length}</p>
          <p className="text-xs text-slate-500 mt-1">Active Cases</p>
        </div>
      </div>

      {/* Quick actions */}
      <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Quick Actions</h2>
      <div className="grid grid-cols-2 gap-3 mb-6">
        {QUICK_ACTIONS.map((action) => (
          <button
            key={action.id}
            id={`home-action-${action.id}`}
            onClick={() => navigate(action.path)}
            className="glass-card p-4 text-left flex flex-col gap-3 active:scale-95 transition-transform"
            style={{
              border: (nyayaScore !== null && nyayaScore < 50 && (action.id === 'dlsa' || action.id === 'score')) 
                      ? '1px solid rgba(248,113,113,0.5)' 
                      : (nyayaScore !== null && nyayaScore < 76 && action.id === 'negotiate')
                      ? '1px solid rgba(251,191,36,0.5)'
                      : undefined,
              boxShadow: (nyayaScore !== null && nyayaScore < 50 && (action.id === 'dlsa' || action.id === 'score'))
                      ? '0 0 15px rgba(248,113,113,0.1)'
                      : undefined
            }}
          >
            <div className="w-10 h-10 rounded-xl flex items-center justify-center relative"
              style={{ background: action.bg }}>
              <action.icon size={20} style={{ color: action.color }} />
              {(nyayaScore !== null && nyayaScore < 50 && (action.id === 'dlsa' || action.id === 'score')) && (
                <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-pulse"></span>
              )}
            </div>
            <div>
              <p className="text-sm font-semibold text-white">{action.label}</p>
              <p className="text-xs text-slate-500 mt-0.5">{action.sublabel}</p>
            </div>
          </button>
        ))}
      </div>

      {/* Recent cases */}
      {cases.length > 0 && (
        <>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Recent Cases</h2>
            <button onClick={() => navigate('/case')} className="text-xs text-amber-400">View all</button>
          </div>
          <div className="space-y-2">
            {cases.slice(0, 3).map((c) => (
              <button
                key={c.id}
                onClick={() => navigate('/case')}
                className="glass-card w-full flex items-center justify-between px-4 py-3 group"
              >
                <div className="flex items-center gap-3">
                  <CheckCircle size={16} style={{
                    color: c.status === 'resolved' ? '#34d399' : c.status === 'active' ? '#f59e0b' : '#94a3b8'
                  }} />
                  <div className="text-left">
                    <p className="text-sm font-medium text-white">{c.title}</p>
                    <p className="text-xs text-slate-500">{c.type} · {c.lastActivity}</p>
                  </div>
                </div>
                <ChevronRight size={14} className="text-slate-600 group-hover:text-slate-400 transition-colors" />
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
