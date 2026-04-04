// CaseTracker — Manage and track legal cases with limitation period countdown
import { useState, useMemo } from 'react'
import { Plus, Trash2, ChevronRight, Clock, AlertTriangle } from 'lucide-react'
import CaseTimeline from '@/components/CaseTimeline'
import { useAppStore, type Case } from '@/store/useAppStore'
import { v4 as uuidv4 } from 'uuid'

const CASE_TYPES = ['Labour', 'Property', 'Consumer', 'Criminal', 'Family', 'Cyber', 'RTI', 'Other']

// Limitation periods by case type (in days)
const LIMITATION_PERIODS: Record<string, { days: number; forum: string; note: string }> = {
  Labour: {
    days: 1095, // 3 years
    forum: 'Labour Court / Industrial Tribunal',
    note: 'Payment of Wages Act — 3 years from cause of action',
  },
  Property: {
    days: 4380, // 12 years
    forum: 'Civil Court',
    note: 'Limitation Act 1963 — 12 years for immovable property',
  },
  Consumer: {
    days: 730, // 2 years
    forum: 'Consumer Disputes Redressal Commission',
    note: 'Consumer Protection Act 2019 Section 69 — 2 years',
  },
  Criminal: {
    days: 1095, // 3 years for most offences
    forum: 'Magistrate Court',
    note: 'CrPC/BNSS — varies by offence. 3 years for most BNS offences',
  },
  Family: {
    days: 1095, // 3 years
    forum: 'Family Court',
    note: 'Limitation Act — 3 years for maintenance, DV cases',
  },
  Cyber: {
    days: 1095, // 3 years
    forum: 'Metropolitan Magistrate / Cyber Cell',
    note: 'IT Act 2000 — 3 years. File FIR at cybercrime.gov.in immediately',
  },
  RTI: {
    days: 30, // 30 days for first appeal
    forum: 'First Appellate Authority',
    note: 'RTI Act Section 19 — first appeal within 30 days of PIO response',
  },
  Other: {
    days: 1095,
    forum: 'Appropriate Court',
    note: 'Default 3-year limitation period under Limitation Act 1963',
  },
}

function getDaysRemaining(createdAt: string, caseType: string): number {
  const created = new Date(createdAt.split('/').reverse().join('-'))
  const limitDays = LIMITATION_PERIODS[caseType]?.days || 1095
  const deadline = new Date(created.getTime() + limitDays * 24 * 60 * 60 * 1000)
  const now = new Date()
  return Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
}

function getDeadlineColor(daysLeft: number): string {
  if (daysLeft <= 7) return '#f87171'
  if (daysLeft <= 30) return '#fb923c'
  if (daysLeft <= 90) return '#fbbf24'
  return '#34d399'
}

export default function CaseTracker() {
  const { cases, addCase, removeCase } = useAppStore()
  const [selected, setSelected] = useState<Case | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ title: '', type: 'Labour' })

  const handleAdd = () => {
    if (!form.title.trim()) return
    const now = new Date().toLocaleDateString('en-IN')
    const newCase: Case = {
      id: uuidv4(),
      title: form.title,
      type: form.type,
      status: 'active',
      createdAt: now,
      lastActivity: now,
      timeline: [{
        id: uuidv4(),
        date: now,
        title: 'Case registered',
        description: `Case "${form.title}" registered on NyayaMitra`,
        type: 'filed',
      }],
      relatedActs: [],
      winProbability: 60,
    }
    addCase(newCase)
    setForm({ title: '', type: 'Labour' })
    setShowForm(false)
  }

  // Cases with urgent deadlines first
  const sortedCases = useMemo(() => {
    return [...cases].sort((a, b) => {
      if (a.status !== b.status) return a.status === 'active' ? -1 : 1
      return getDaysRemaining(a.createdAt, a.type) - getDaysRemaining(b.createdAt, b.type)
    })
  }, [cases])

  if (selected) {
    const daysLeft = getDaysRemaining(selected.createdAt, selected.type)
    const limitInfo = LIMITATION_PERIODS[selected.type] || LIMITATION_PERIODS.Other
    const deadlineColor = getDeadlineColor(daysLeft)

    return (
      <div id="case-detail-page" className="page-wrapper">
        <button onClick={() => setSelected(null)} className="flex items-center gap-2 text-amber-400 text-sm mb-6">
          ← Back to cases
        </button>
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <h1 className="section-title">{selected.title}</h1>
            <span className="text-xs px-2.5 py-1 rounded-full font-medium"
              style={{
                background: selected.status === 'active' ? 'rgba(245,158,11,0.15)' : 'rgba(52,211,153,0.15)',
                color: selected.status === 'active' ? '#f59e0b' : '#34d399',
              }}>
              {selected.status}
            </span>
          </div>
          <p className="section-subtitle">{selected.type} · Started {selected.createdAt}</p>
        </div>

        {/* Limitation period card */}
        {selected.status === 'active' && (
          <div className="glass-card p-4 mb-4" style={{ border: `1px solid ${deadlineColor}30` }}>
            <div className="flex items-center gap-2 mb-3">
              <Clock size={14} style={{ color: deadlineColor }} />
              <span className="text-xs font-semibold" style={{ color: deadlineColor }}>LIMITATION PERIOD</span>
            </div>

            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-3xl font-black" style={{ color: deadlineColor }}>
                  {daysLeft > 0 ? daysLeft : 0}
                </p>
                <p className="text-xs text-slate-500">days remaining</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-slate-400">{limitInfo.forum}</p>
                <p className="text-[10px] text-slate-600 mt-1">{limitInfo.note}</p>
              </div>
            </div>

            {/* Progress bar */}
            <div className="w-full h-2 rounded-full" style={{ background: 'rgba(255,255,255,0.05)' }}>
              <div
                className="h-2 rounded-full transition-all duration-500"
                style={{
                  width: `${Math.max(0, Math.min(100, (daysLeft / (limitInfo.days)) * 100))}%`,
                  background: deadlineColor,
                }}
              />
            </div>

            {daysLeft <= 30 && daysLeft > 0 && (
              <div className="flex items-center gap-2 mt-3 text-xs" style={{ color: deadlineColor }}>
                <AlertTriangle size={12} />
                <span className="font-semibold">
                  {daysLeft <= 7 ? 'URGENT: File immediately!' :
                   daysLeft <= 30 ? 'Warning: Deadline approaching. Prepare filing documents.' :
                   'Note deadline.'}
                </span>
              </div>
            )}

            {daysLeft <= 0 && (
              <div className="flex items-center gap-2 mt-3 text-xs text-red-400">
                <AlertTriangle size={12} />
                <span className="font-semibold">EXPIRED — Limitation period may have passed. Consult a lawyer immediately.</span>
              </div>
            )}
          </div>
        )}

        <div className="glass-card p-4 mb-4">
          <div className="grid grid-cols-2 gap-3 text-center">
            <div>
              <p className="text-2xl font-black text-amber-400">{selected.winProbability}%</p>
              <p className="text-xs text-slate-500">Win Probability</p>
            </div>
            <div>
              <p className="text-2xl font-black text-white">{selected.timeline.length}</p>
              <p className="text-xs text-slate-500">Timeline Events</p>
            </div>
          </div>
        </div>

        <h2 className="text-xs text-slate-500 font-medium uppercase tracking-wider mb-3">Timeline</h2>
        <CaseTimeline events={selected.timeline} />
      </div>
    )
  }

  return (
    <div id="case-tracker-page" className="page-wrapper">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="section-title">Case Tracker</h1>
          <p className="section-subtitle">{cases.length} case{cases.length !== 1 ? 's' : ''} tracked</p>
        </div>
        <button
          id="add-case-btn"
          onClick={() => setShowForm(!showForm)}
          className="btn-gold flex items-center gap-1.5 text-sm px-4 py-2"
        >
          <Plus size={16} />
          Add Case
        </button>
      </div>

      {/* Add form */}
      {showForm && (
        <div className="glass-card p-4 mb-4 space-y-3 slide-up">
          <input
            id="case-title-input"
            type="text"
            value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            placeholder="Case title (e.g. Salary recovery from ABC Co.)"
            className="input-dark"
          />
          <select
            id="case-type-select"
            value={form.type}
            onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}
            className="input-dark"
            style={{ appearance: 'none' }}
          >
            {CASE_TYPES.map((t) => (
              <option key={t} value={t} style={{ background: '#111827' }}>{t}</option>
            ))}
          </select>

          {/* Show limitation info for selected type */}
          <div className="rounded-xl p-3" style={{ background: 'rgba(245,158,11,0.05)', border: '1px solid rgba(245,158,11,0.15)' }}>
            <p className="text-[10px] text-amber-400 font-semibold mb-1">LIMITATION PERIOD</p>
            <p className="text-xs text-slate-400">
              {LIMITATION_PERIODS[form.type]?.note || 'Standard 3-year limitation'}
            </p>
            <p className="text-xs text-slate-500 mt-1">
              Forum: {LIMITATION_PERIODS[form.type]?.forum || 'Appropriate Court'}
            </p>
          </div>

          <div className="flex gap-2">
            <button onClick={handleAdd} className="btn-gold flex-1">Save Case</button>
            <button onClick={() => setShowForm(false)} className="btn-ghost flex-1">Cancel</button>
          </div>
        </div>
      )}

      {/* Cases list */}
      {cases.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
            style={{ background: 'rgba(245,158,11,0.1)' }}>
            <Plus size={32} style={{ color: '#f59e0b' }} />
          </div>
          <p className="text-slate-400 mb-2">No cases yet</p>
          <p className="text-xs text-slate-600">Add your first case to track it</p>
        </div>
      ) : (
        <div className="space-y-3">
          {sortedCases.map((c, i) => {
            const daysLeft = getDaysRemaining(c.createdAt, c.type)
            const deadlineColor = getDeadlineColor(daysLeft)
            const isUrgent = daysLeft <= 30 && c.status === 'active'

            return (
              <div
                key={c.id}
                id={`case-item-${i}`}
                className="glass-card flex items-center justify-between px-4 py-4 slide-up"
                style={{
                  animationDelay: `${i * 0.05}s`,
                  border: isUrgent ? `1px solid ${deadlineColor}30` : undefined,
                }}
              >
                <button className="flex items-center gap-3 flex-1 text-left" onClick={() => setSelected(c)}>
                  <div className="w-2 h-10 rounded-full shrink-0"
                    style={{ background: c.status === 'active' ? '#f59e0b' : '#34d399' }} />
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-white">{c.title}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{c.type} · {c.lastActivity}</p>
                  </div>
                </button>
                <div className="flex items-center gap-3">
                  {c.status === 'active' && (
                    <div className="text-right">
                      <p className="text-xs font-bold" style={{ color: deadlineColor }}>{daysLeft > 0 ? daysLeft : 0}d</p>
                      <p className="text-[9px] text-slate-600">left</p>
                    </div>
                  )}
                  <span className="text-xs font-bold text-amber-400">{c.winProbability}%</span>
                  <ChevronRight size={14} className="text-slate-600" />
                  <button
                    onClick={() => removeCase(c.id)}
                    className="p-1.5 rounded-lg hover:bg-red-400/10 transition-colors text-slate-600 hover:text-red-400"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
