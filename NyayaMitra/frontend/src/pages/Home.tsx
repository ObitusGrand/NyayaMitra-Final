// Home — NyayaMitra Dashboard (Web App)
import { useNavigate } from 'react-router-dom'
import { Mic, FileText, Scale, Shield, Bell, MapPin, Phone, WifiOff, Handshake, BarChart2, Star, Trophy, Flame, Award, Zap, Target, ArrowUpRight, Clock, Sparkles, AlertTriangle } from 'lucide-react'
import { useAppStore } from '@/store/useAppStore'
import { useEffect, useMemo } from 'react'
import { checkHealth } from '@/services/api'

// ── Gamification Engine ──────────────────────────────────

const LEVELS = [
  { level: 1, title: 'Citizen Apprentice', minXP: 0, maxXP: 200, emoji: '🌱' },
  { level: 2, title: 'Legal Learner', minXP: 200, maxXP: 500, emoji: '📚' },
  { level: 3, title: 'Rights Defender', minXP: 500, maxXP: 1000, emoji: '🛡️' },
  { level: 4, title: 'Law Guardian', minXP: 1000, maxXP: 2000, emoji: '⚖️' },
  { level: 5, title: 'NyayaMitra Champion', minXP: 2000, maxXP: 5000, emoji: '🏆' },
  { level: 6, title: 'Legal Eagle', minXP: 5000, maxXP: 10000, emoji: '🦅' },
  { level: 7, title: 'Justice Warrior', minXP: 10000, maxXP: 999999, emoji: '⭐' },
]

function getLevel(xp: number) {
  for (let i = LEVELS.length - 1; i >= 0; i--) {
    if (xp >= LEVELS[i].minXP) return LEVELS[i]
  }
  return LEVELS[0]
}

const BADGES = [
  { id: 'first_query', emoji: '🎤', name: 'First Voice', desc: 'Asked your first legal question', check: (s: StoreState) => s.voiceQueriesCount > 0 },
  { id: 'doc_decoded', emoji: '📄', name: 'Doc Detective', desc: 'Decoded your first document', check: (s: StoreState) => s.documentsDecoded > 0 },
  { id: 'case_keeper', emoji: '⚖️', name: 'Case Keeper', desc: 'Tracking a legal case', check: (s: StoreState) => s.cases.length > 0 },
  { id: 'score_scholar', emoji: '📊', name: 'Score Scholar', desc: 'Computed your NyayaScore', check: (s: StoreState) => s.nyayaScore !== null },
  { id: 'power_scanner', emoji: '🏆', name: 'Power Scanner', desc: 'Decoded 5+ documents', check: (s: StoreState) => s.documentsDecoded >= 5 },
  { id: 'legal_fortress', emoji: '💪', name: 'Legal Fortress', desc: 'NyayaScore above 75', check: (s: StoreState) => (s.nyayaScore ?? 0) >= 75 },
  { id: 'streak_3', emoji: '🔥', name: '3-Day Streak', desc: 'Active for 3 consecutive days', check: (s: StoreState) => computeStreak(s.activeDays) >= 3 },
  { id: 'ten_queries', emoji: '🧠', name: 'Legal Mind', desc: '10+ voice queries', check: (s: StoreState) => s.voiceQueriesCount >= 10 },
]

type StoreState = ReturnType<typeof useAppStore.getState>

function computeStreak(activeDays: string[]): number {
  if (activeDays.length === 0) return 0
  const today = new Date()
  let streak = 0
  for (let i = 0; i < 30; i++) {
    const d = new Date(today)
    d.setDate(d.getDate() - i)
    const key = d.toISOString().split('T')[0]
    if (activeDays.includes(key)) streak++
    else if (i > 0) break // allow today to be missed
  }
  return streak
}

function getWeekActivity(activeDays: string[]): boolean[] {
  const result: boolean[] = []
  const today = new Date()
  const dayOfWeek = today.getDay() === 0 ? 6 : today.getDay() - 1 // 0=Mon
  for (let i = 0; i <= 6; i++) {
    const d = new Date(today)
    d.setDate(d.getDate() - (dayOfWeek - i))
    const key = d.toISOString().split('T')[0]
    result.push(activeDays.includes(key))
  }
  return result
}

function getSmartRecommendations(store: StoreState) {
  const recs: { icon: typeof Mic; text: string; action: string; path: string; priority: number; color: string }[] = []

  if (store.nyayaScore === null) {
    recs.push({ icon: Scale, text: 'Compute your NyayaScore to assess legal health', action: 'Check Now', path: '/score', priority: 1, color: '#2E7D32' })
  } else if (store.nyayaScore < 50) {
    recs.push({ icon: AlertTriangle, text: `Your NyayaScore is ${store.nyayaScore} — you may have legal risks`, action: 'Review', path: '/score', priority: 1, color: '#D32F2F' })
  }

  if (store.documentsDecoded === 0) {
    recs.push({ icon: FileText, text: 'Upload a document to check for hidden legal traps', action: 'Scan Now', path: '/decode', priority: 2, color: '#5E35B1' })
  }

  if (store.voiceQueriesCount === 0) {
    recs.push({ icon: Mic, text: 'Ask your first legal question using voice or text', action: 'Ask Now', path: '/voice', priority: 2, color: '#FF9933' })
  }

  if (store.cases.length === 0) {
    recs.push({ icon: BarChart2, text: 'Start tracking a legal case to monitor progress', action: 'Add Case', path: '/case', priority: 3, color: '#1976D2' })
  }

  const activeCases = store.cases.filter(c => c.status === 'active')
  if (activeCases.length > 0) {
    recs.push({ icon: Clock, text: `${activeCases.length} active case${activeCases.length > 1 ? 's' : ''} need${activeCases.length === 1 ? 's' : ''} attention`, action: 'View', path: '/case', priority: 2, color: '#FF9933' })
  }

  if (store.decodedClauses.some(c => c.risk === 'illegal')) {
    recs.push({ icon: AlertTriangle, text: 'Illegal clauses detected in your documents!', action: 'Review', path: '/decode', priority: 0, color: '#D32F2F' })
  }

  return recs.sort((a, b) => a.priority - b.priority).slice(0, 3)
}

// ── Component ────────────────────────────────────────────

const ALL_FEATURES = [
  { id: 'voice', icon: Mic, label: 'Voice Counsellor', desc: 'Ask legal questions', path: '/voice', color: '#FF9933', bg: '#FFF3E0' },
  { id: 'decode', icon: FileText, label: 'Doc Decoder', desc: 'Scan documents', path: '/decode', color: '#5E35B1', bg: '#EDE7F6' },
  { id: 'score', icon: Scale, label: 'NyayaScore', desc: 'Legal health check', path: '/score', color: '#2E7D32', bg: '#E8F5E9' },
  { id: 'police', icon: Shield, label: 'Police Mode', desc: 'File FIR · Know rights', path: '/police', color: '#D32F2F', bg: '#FFEBEE' },
  { id: 'case', icon: BarChart2, label: 'Case Tracker', desc: 'Track cases', path: '/case', color: '#1976D2', bg: '#E3F2FD' },
  { id: 'amendments', icon: Bell, label: 'Amendments', desc: 'Latest changes', path: '/amendments', color: '#F59E0B', bg: '#FFF8E1' },
  { id: 'dlsa', icon: MapPin, label: 'DLSA Connect', desc: 'Free legal aid', path: '/dlsa', color: '#00897B', bg: '#E0F2F1' },
  { id: 'negotiate', icon: Handshake, label: 'Negotiation', desc: 'Roleplay disputes', path: '/negotiate', color: '#5C6BC0', bg: '#E8EAF6' },
]

const ACTIVITY_ICONS: Record<string, typeof Mic> = {
  voice_query: Mic, doc_decoded: FileText, case_added: BarChart2,
  score_computed: Scale, fir_generated: Shield, negotiation: Handshake,
}
const ACTIVITY_COLORS: Record<string, string> = {
  voice_query: '#FF9933', doc_decoded: '#5E35B1', case_added: '#1976D2',
  score_computed: '#2E7D32', fir_generated: '#D32F2F', negotiation: '#5C6BC0',
}

export default function Home() {
  const navigate = useNavigate()
  const store = useAppStore()
  const { backendOnline, setBackendOnline, cases, nyayaScore, documentsDecoded, totalXP, activityLog, activeDays, voiceQueriesCount } = store

  useEffect(() => { checkHealth().then(setBackendOnline) }, [setBackendOnline])

  // Mark today as active on mount
  useEffect(() => {
    const today = new Date().toISOString().split('T')[0]
    if (!activeDays.includes(today)) {
      store.logActivity({ type: 'voice_query', title: 'Session started', xpEarned: 0 })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const levelInfo = useMemo(() => getLevel(totalXP), [totalXP])
  const xpInLevel = totalXP - levelInfo.minXP
  const xpForLevel = levelInfo.maxXP - levelInfo.minXP
  const xpProgress = Math.min(100, (xpInLevel / xpForLevel) * 100)
  const earnedBadges = useMemo(() => BADGES.filter(b => b.check(store)), [store])
  const streak = useMemo(() => computeStreak(activeDays), [activeDays])
  const weekActivity = useMemo(() => getWeekActivity(activeDays), [activeDays])
  const recommendations = useMemo(() => getSmartRecommendations(store), [store])
  const activeCases = cases.filter(c => c.status === 'active').length
  const resolvedCases = cases.filter(c => c.status === 'resolved').length

  const totalActions = voiceQueriesCount + documentsDecoded + cases.length

  const timeAgo = (iso: string) => {
    const diff = Date.now() - new Date(iso).getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 1) return 'Just now'
    if (mins < 60) return `${mins}m ago`
    const hrs = Math.floor(mins / 60)
    if (hrs < 24) return `${hrs}h ago`
    return `${Math.floor(hrs / 24)}d ago`
  }

  return (
    <div id="home-page" className="page-wrapper">

      {/* ─── HEADER ─────────────────────────────────────── */}
      <div className="flex items-end justify-between mb-8 slide-up">
        <div>
          <p style={{ fontSize: '0.8125rem', fontWeight: 500, color: 'var(--text-muted)', marginBottom: 4 }}>
            {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
          <h1 style={{ fontFamily: "'Poppins', sans-serif", fontSize: '1.75rem', fontWeight: 800, color: 'var(--navy)', letterSpacing: '-0.03em', lineHeight: 1.2 }}>
            Dashboard
          </h1>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full" style={{ background: backendOnline ? 'var(--green-light)' : 'var(--red-light)', border: `1px solid ${backendOnline ? 'rgba(46,125,50,0.2)' : 'rgba(211,47,47,0.2)'}` }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: backendOnline ? 'var(--green-success)' : 'var(--red-danger)' }} />
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: backendOnline ? 'var(--green-success)' : 'var(--red-danger)' }}>
              {backendOnline ? 'API Online' : 'API Offline'}
            </span>
          </div>
          <select
            value={store.userState}
            onChange={(e) => store.setUserState(e.target.value)}
            style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--navy)', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '8px 14px', cursor: 'pointer' }}
          >
            {['Central', 'Maharashtra', 'Delhi', 'Karnataka', 'Tamil Nadu', 'Gujarat'].map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
      </div>

      {!backendOnline && (
        <div className="alert-danger mb-6 slide-up">
          <WifiOff size={16} style={{ color: 'var(--red-danger)' }} className="shrink-0" />
          <p style={{ fontSize: '0.8125rem' }}>Backend offline — run <code style={{ fontWeight: 700, color: 'var(--red-danger)', background: 'rgba(211,47,47,0.06)', padding: '2px 6px', borderRadius: 4 }}>uvicorn main:app</code></p>
        </div>
      )}

      {/* ─── STAT CARDS ROW ─────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px', marginBottom: '28px' }}>
        {[
          { label: 'NyayaScore', value: nyayaScore !== null ? `${nyayaScore}` : '—', suffix: nyayaScore !== null ? '/100' : '', color: nyayaScore !== null ? (nyayaScore >= 75 ? 'var(--green-success)' : nyayaScore >= 50 ? 'var(--saffron)' : 'var(--red-danger)') : 'var(--text-muted)', icon: Scale, iconBg: '#E8F5E9', accent: nyayaScore !== null ? (nyayaScore >= 75 ? 'var(--green-success)' : nyayaScore >= 50 ? 'var(--saffron)' : 'var(--red-danger)') : '#E2E5EA', change: nyayaScore !== null ? (nyayaScore >= 75 ? '↑ Strong' : nyayaScore >= 50 ? '→ Moderate' : '↓ At Risk') : 'Not computed', changeColor: nyayaScore !== null ? (nyayaScore >= 75 ? 'var(--green-success)' : nyayaScore >= 50 ? 'var(--saffron)' : 'var(--red-danger)') : 'var(--text-muted)' },
          { label: 'Active Cases', value: `${activeCases}`, suffix: cases.length > 0 ? ` / ${cases.length}` : '', color: 'var(--navy)', icon: BarChart2, iconBg: '#E3F2FD', accent: 'var(--navy)', change: resolvedCases > 0 ? `${resolvedCases} resolved` : 'No cases yet', changeColor: resolvedCases > 0 ? 'var(--green-success)' : 'var(--text-muted)' },
          { label: 'Docs Scanned', value: `${documentsDecoded}`, suffix: '', color: '#5E35B1', icon: FileText, iconBg: '#EDE7F6', accent: '#5E35B1', change: documentsDecoded > 0 ? `+${documentsDecoded * 100} XP` : 'Upload first doc', changeColor: documentsDecoded > 0 ? 'var(--green-success)' : 'var(--text-muted)' },
          { label: 'Level & XP', value: `Lv ${levelInfo.level}`, suffix: '', color: 'var(--saffron)', icon: Zap, iconBg: '#FFF3E0', accent: 'var(--saffron)', change: `${totalXP.toLocaleString()} XP total`, changeColor: 'var(--saffron-dark)' },
        ].map((stat, i) => (
          <div key={stat.label} className="stat-widget slide-up" style={{ animationDelay: `${i * 0.06}s` }}>
            <div className="flex items-start justify-between mb-4">
              <div className="stat-widget-icon" style={{ background: stat.iconBg }}>
                <stat.icon size={20} style={{ color: stat.color }} />
              </div>
              <span style={{ fontSize: '0.6875rem', fontWeight: 600, color: stat.changeColor }}>{stat.change}</span>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="stat-widget-value" style={{ color: stat.color }}>{stat.value}</span>
              {stat.suffix && <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-muted)' }}>{stat.suffix}</span>}
            </div>
            <p className="stat-widget-label">{stat.label}</p>
            <div className="stat-widget-accent" style={{ background: `linear-gradient(90deg, ${stat.accent}, transparent)` }} />
          </div>
        ))}
      </div>

      {/* ─── TWO-COLUMN LAYOUT ──────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: '24px', alignItems: 'start' }}>

        {/* ═══ LEFT: Main Content ══════════════════════════ */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

          {/* Smart Recommendations */}
          {recommendations.length > 0 && (
            <div className="gov-card-static slide-up" style={{ padding: '24px', animationDelay: '0.15s' }}>
              <div className="flex items-center gap-2 mb-4">
                <Sparkles size={18} style={{ color: 'var(--saffron)' }} />
                <h2 style={{ fontFamily: "'Poppins', sans-serif", fontSize: '1rem', fontWeight: 700, color: 'var(--navy)' }}>
                  Smart Recommendations
                </h2>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {recommendations.map((rec, i) => (
                  <button
                    key={i}
                    onClick={() => navigate(rec.path)}
                    className="flex items-center gap-4 w-full text-left transition-all"
                    style={{ padding: '14px 16px', borderRadius: 'var(--radius-lg)', background: 'var(--bg-page)', border: '1px solid var(--border)', cursor: 'pointer' }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = rec.color; e.currentTarget.style.transform = 'translateX(4px)' }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.transform = 'none' }}
                  >
                    <div style={{ width: 40, height: 40, borderRadius: 'var(--radius-md)', background: `${rec.color}12`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <rec.icon size={18} style={{ color: rec.color }} />
                    </div>
                    <span className="flex-1" style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-primary)' }}>{rec.text}</span>
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: rec.color, whiteSpace: 'nowrap' }}>{rec.action} →</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* All Features Grid */}
          <div className="gov-card-static slide-up" style={{ padding: '24px', animationDelay: '0.2s' }}>
            <div className="flex items-center justify-between mb-4">
              <h2 style={{ fontFamily: "'Poppins', sans-serif", fontSize: '1rem', fontWeight: 700, color: 'var(--navy)' }}>All Features</h2>
              <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>{ALL_FEATURES.length} tools</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
              {ALL_FEATURES.map((feat) => (
                <button
                  key={feat.id}
                  onClick={() => navigate(feat.path)}
                  style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', padding: '16px 8px', borderRadius: 'var(--radius-xl)', border: '1px solid var(--border)', background: 'var(--bg-card)', cursor: 'pointer', transition: 'all 0.25s', textAlign: 'center' }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = feat.color; e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = `0 4px 12px ${feat.color}15` }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'none' }}
                >
                  <div style={{ width: 44, height: 44, borderRadius: 'var(--radius-lg)', background: feat.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <feat.icon size={20} style={{ color: feat.color }} />
                  </div>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.3 }}>{feat.label}</span>
                  <span style={{ fontSize: '0.625rem', color: 'var(--text-muted)', lineHeight: 1.3 }}>{feat.desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Activity Timeline */}
          <div className="gov-card-static slide-up" style={{ padding: '24px', animationDelay: '0.25s' }}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Clock size={18} style={{ color: 'var(--navy)' }} />
                <h2 style={{ fontFamily: "'Poppins', sans-serif", fontSize: '1rem', fontWeight: 700, color: 'var(--navy)' }}>Activity Timeline</h2>
              </div>
              <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>{totalActions} total actions</span>
            </div>
            {activityLog.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '32px 0' }}>
                <Target size={36} style={{ color: 'var(--text-muted)', margin: '0 auto 10px', opacity: 0.4 }} />
                <p style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--text-secondary)' }}>No activity yet</p>
                <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginTop: 4, maxWidth: 300, margin: '4px auto 0' }}>
                  Start using NyayaMitra features to build your activity timeline and earn XP
                </p>
                <button onClick={() => navigate('/voice')} className="btn-primary mt-4" style={{ fontSize: '0.8125rem', padding: '10px 24px', minHeight: 40 }}>
                  <Mic size={16} /> Ask Your First Question
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {activityLog.slice(0, 8).map((entry) => {
                  const Icon = ACTIVITY_ICONS[entry.type] || Target
                  const color = ACTIVITY_COLORS[entry.type] || 'var(--text-muted)'
                  return (
                    <div key={entry.id} className="flex items-center gap-3" style={{ padding: '10px 12px', borderRadius: 'var(--radius-md)', background: 'var(--bg-page)' }}>
                      <div style={{ width: 32, height: 32, borderRadius: 'var(--radius-sm)', background: `${color}12`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <Icon size={14} style={{ color }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-primary)' }} className="truncate">{entry.title}</p>
                        <p style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>{timeAgo(entry.timestamp)}</p>
                      </div>
                      {entry.xpEarned > 0 && (
                        <span style={{ fontSize: '0.6875rem', fontWeight: 700, color: 'var(--green-success)', background: 'var(--green-light)', padding: '2px 10px', borderRadius: 'var(--radius-full)' }}>
                          +{entry.xpEarned} XP
                        </span>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* ═══ RIGHT SIDEBAR: Gamification ═════════════════ */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', position: 'sticky', top: '24px' }}>

          {/* Level Card */}
          <div className="slide-up" style={{
            animationDelay: '0.15s', padding: '24px',
            background: 'linear-gradient(145deg, var(--navy) 0%, var(--navy-light) 100%)',
            borderRadius: 'var(--radius-xl)', color: '#FFF',
            boxShadow: '0 8px 32px rgba(11,31,58,0.25)',
          }}>
            <div className="flex items-center gap-4 mb-4">
              <div style={{ width: 56, height: 56, borderRadius: '50%', border: '3px solid var(--saffron)', background: 'rgba(255,153,51,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem' }}>
                {levelInfo.emoji}
              </div>
              <div className="flex-1">
                <p style={{ fontSize: '1.125rem', fontWeight: 800, fontFamily: "'Poppins', sans-serif" }}>
                  {levelInfo.title}
                </p>
                <p style={{ fontSize: '0.75rem', opacity: 0.7 }}>Level {levelInfo.level} · {totalXP.toLocaleString()} XP</p>
              </div>
            </div>
            <div style={{ marginBottom: 8 }}>
              <div className="flex items-center justify-between mb-1.5">
                <span style={{ fontSize: '0.6875rem', fontWeight: 600, opacity: 0.7 }}>Progress to Level {Math.min(levelInfo.level + 1, 7)}</span>
                <span style={{ fontSize: '0.6875rem', fontWeight: 700, color: 'var(--saffron)' }}>{Math.round(xpProgress)}%</span>
              </div>
              <div style={{ height: 8, borderRadius: 'var(--radius-full)', background: 'rgba(255,255,255,0.15)', overflow: 'hidden' }}>
                <div className="xp-bar-fill" style={{ width: `${xpProgress}%`, background: 'linear-gradient(90deg, var(--saffron), #F59E0B)' }} />
              </div>
              <p style={{ fontSize: '0.625rem', opacity: 0.5, marginTop: 6 }}>
                {(levelInfo.maxXP - totalXP).toLocaleString()} XP remaining
              </p>
            </div>
            {/* Streak row inside level card */}
            <div className="flex items-center justify-between" style={{ padding: '12px 0 0', borderTop: '1px solid rgba(255,255,255,0.1)', marginTop: 8 }}>
              <div className="flex items-center gap-2">
                <Flame size={16} style={{ color: 'var(--saffron)' }} />
                <span style={{ fontSize: '0.8125rem', fontWeight: 700 }}>{streak} day streak</span>
              </div>
              <div className="flex gap-1.5">
                {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => (
                  <div key={i} title={d} style={{
                    width: 24, height: 24, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '0.5rem', fontWeight: 700,
                    background: weekActivity[i] ? 'var(--saffron)' : 'rgba(255,255,255,0.1)',
                    color: weekActivity[i] ? '#FFF' : 'rgba(255,255,255,0.3)',
                  }}>
                    {weekActivity[i] ? '✓' : d}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Badges */}
          <div className="gov-card-static slide-up" style={{ padding: '20px', animationDelay: '0.2s' }}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Award size={16} style={{ color: 'var(--saffron)' }} />
                <h3 style={{ fontFamily: "'Poppins', sans-serif", fontSize: '0.9375rem', fontWeight: 700, color: 'var(--navy)' }}>Badges</h3>
              </div>
              <span style={{ fontSize: '0.6875rem', fontWeight: 800, padding: '3px 10px', borderRadius: 'var(--radius-full)', background: earnedBadges.length > 0 ? 'var(--saffron-light)' : 'var(--bg-page)', color: earnedBadges.length > 0 ? 'var(--saffron-dark)' : 'var(--text-muted)' }}>
                {earnedBadges.length}/{BADGES.length}
              </span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
              {BADGES.map(badge => {
                const earned = earnedBadges.some(b => b.id === badge.id)
                return (
                  <div key={badge.id} className="flex flex-col items-center gap-1" title={`${badge.name}: ${badge.desc}`}
                    style={{ padding: '8px 4px', borderRadius: 'var(--radius-md)', transition: 'background 0.2s', cursor: 'default' }}
                    onMouseEnter={e => { e.currentTarget.style.background = earned ? 'var(--saffron-50)' : 'var(--bg-page)' }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
                  >
                    <div style={{
                      width: 44, height: 44, borderRadius: 'var(--radius-md)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '1.25rem', transition: 'all 0.3s',
                      background: earned ? 'linear-gradient(145deg, var(--saffron-light), #FFE0B2)' : '#F0F2F5',
                      border: earned ? '2px solid var(--saffron)' : '2px dashed #D0D5DD',
                      opacity: earned ? 1 : 0.4,
                      filter: earned ? 'none' : 'grayscale(100%)',
                    }}>
                      {badge.emoji}
                    </div>
                    <span style={{ fontSize: '0.5625rem', fontWeight: 600, color: earned ? 'var(--text-primary)' : 'var(--text-muted)', textAlign: 'center', lineHeight: 1.3 }}>
                      {badge.name}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Leaderboard */}
          <div className="gov-card-static slide-up" style={{ padding: '20px', animationDelay: '0.25s' }}>
            <div className="flex items-center gap-2 mb-3">
              <Trophy size={16} style={{ color: 'var(--saffron)' }} />
              <h3 style={{ fontFamily: "'Poppins', sans-serif", fontSize: '0.9375rem', fontWeight: 700, color: 'var(--navy)' }}>Community</h3>
            </div>

            {/* user's position */}
            <div className="flex items-center gap-3 mb-3" style={{ padding: '12px 14px', borderRadius: 'var(--radius-lg)', background: 'linear-gradient(135deg, var(--saffron-light), #FFF9F0)', border: '1px solid rgba(255,153,51,0.15)' }}>
              <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'linear-gradient(135deg, var(--saffron), var(--saffron-dark))', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#FFF', fontSize: '0.875rem', fontWeight: 900 }}>
                {levelInfo.emoji}
              </div>
              <div className="flex-1">
                <p style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--saffron-dark)' }}>You</p>
                <p style={{ fontSize: '0.625rem', color: 'var(--text-muted)' }}>{levelInfo.title}</p>
              </div>
              <div className="text-right">
                <p style={{ fontSize: '0.9375rem', fontWeight: 900, color: 'var(--saffron)' }}>{totalXP.toLocaleString()}</p>
                <p style={{ fontSize: '0.5625rem', color: 'var(--text-muted)' }}>XP</p>
              </div>
            </div>

            {/* mock leaderboard sorted dynamically including user */}
            {(() => {
              const peers = [
                { name: 'Priya S.', xp: Math.max(100, totalXP + 850 + Math.floor(Math.random() * 50)) },
                { name: 'Amit K.', xp: Math.max(80, totalXP + 420 + Math.floor(Math.random() * 50)) },
                { name: 'Ravi P.', xp: Math.max(50, totalXP + 180 + Math.floor(Math.random() * 50)) },
                { name: 'Sneha R.', xp: Math.max(30, totalXP - 120) },
                { name: 'Mohd. I.', xp: Math.max(10, totalXP - 350) },
              ].sort((a, b) => b.xp - a.xp)

              return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  {peers.slice(0, 4).map((u, i) => (
                    <div key={u.name} className="flex items-center gap-3" style={{ padding: '8px 12px', borderRadius: 'var(--radius-md)', transition: 'background 0.2s' }}
                      onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-page)' }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
                    >
                      <span style={{ width: 22, height: 22, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.625rem', fontWeight: 800, background: i < 3 ? 'var(--saffron-light)' : 'var(--bg-page)', color: i < 3 ? 'var(--saffron-dark)' : 'var(--text-muted)', border: i < 3 ? '1px solid var(--saffron)' : '1px solid var(--border)' }}>
                        {i + 1}
                      </span>
                      <span className="flex-1" style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-primary)' }}>{u.name}</span>
                      <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--saffron)' }}>{u.xp.toLocaleString()}</span>
                      <Star size={10} style={{ color: 'var(--saffron)', opacity: 0.5 }} />
                    </div>
                  ))}
                </div>
              )
            })()}
          </div>

          {/* Earn XP Card */}
          <div className="gov-card-static slide-up" style={{ padding: '20px', animationDelay: '0.3s' }}>
            <div className="flex items-center gap-2 mb-3">
              <Target size={16} style={{ color: 'var(--green-success)' }} />
              <h3 style={{ fontSize: '0.9375rem', fontWeight: 700, color: 'var(--navy)' }}>Earn XP</h3>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {[
                { action: 'Voice query', xp: 50, icon: Mic, color: '#FF9933', path: '/voice' },
                { action: 'Decode doc', xp: 100, icon: FileText, color: '#5E35B1', path: '/decode' },
                { action: 'Track case', xp: 150, icon: BarChart2, color: '#1976D2', path: '/case' },
                { action: 'NyayaScore', xp: 200, icon: Scale, color: '#2E7D32', path: '/score' },
              ].map((item) => (
                <button
                  key={item.action}
                  onClick={() => navigate(item.path)}
                  className="flex items-center gap-3 w-full text-left"
                  style={{ padding: '8px 10px', borderRadius: 'var(--radius-md)', background: 'transparent', border: 'none', cursor: 'pointer', transition: 'background 0.2s' }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-page)' }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
                >
                  <item.icon size={14} style={{ color: item.color }} />
                  <span className="flex-1" style={{ fontSize: '0.8125rem', color: 'var(--text-primary)' }}>{item.action}</span>
                  <span style={{ fontSize: '0.6875rem', fontWeight: 700, color: 'var(--green-success)', background: 'var(--green-light)', padding: '2px 10px', borderRadius: 'var(--radius-full)' }}>+{item.xp}</span>
                  <ArrowUpRight size={12} style={{ color: 'var(--text-muted)' }} />
                </button>
              ))}
            </div>
          </div>

          {/* Emergency */}
          <div className="slide-up" style={{
            animationDelay: '0.35s', borderRadius: 'var(--radius-xl)', padding: '16px 20px',
            background: 'linear-gradient(135deg, #FFEBEE, #FCE4EC)', border: '1px solid rgba(211,47,47,0.12)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
          }}>
            <div>
              <p style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--red-danger)' }}>Emergency Help</p>
              <p style={{ fontSize: '0.6875rem', color: 'var(--text-secondary)' }}>NALSA Legal Aid</p>
            </div>
            <a href="tel:15100" className="btn-danger flex items-center gap-1.5" style={{ minHeight: 36, fontSize: '0.75rem', padding: '8px 16px' }}>
              <Phone size={13} /> 15100
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
