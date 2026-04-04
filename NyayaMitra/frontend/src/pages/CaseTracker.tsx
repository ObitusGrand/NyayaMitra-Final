// CaseTracker — Government light theme
import { useState, useMemo } from 'react'
import { Plus, Trash2, ChevronRight, Clock, AlertTriangle, ArrowLeft } from 'lucide-react'
import CaseTimeline from '@/components/CaseTimeline'
import { useAppStore, type Case } from '@/store/useAppStore'
import { v4 as uuidv4 } from 'uuid'

const CASE_TYPES = ['Labour', 'Property', 'Consumer', 'Criminal', 'Family', 'Cyber', 'RTI', 'Other']
const LIMITATION_PERIODS: Record<string, { days: number; forum: string; note: string }> = {
  Labour: { days: 1095, forum: 'Labour Court / Industrial Tribunal', note: 'Payment of Wages Act — 3 years' },
  Property: { days: 4380, forum: 'Civil Court', note: 'Limitation Act 1963 — 12 years' },
  Consumer: { days: 730, forum: 'Consumer Disputes Redressal Commission', note: 'Consumer Protection Act 2019 — 2 years' },
  Criminal: { days: 1095, forum: 'Magistrate Court', note: 'CrPC/BNSS — 3 years for most offences' },
  Family: { days: 1095, forum: 'Family Court', note: 'Limitation Act — 3 years' },
  Cyber: { days: 1095, forum: 'Metropolitan Magistrate / Cyber Cell', note: 'IT Act 2000 — 3 years' },
  RTI: { days: 30, forum: 'First Appellate Authority', note: 'RTI Act Section 19 — 30 days' },
  Other: { days: 1095, forum: 'Appropriate Court', note: 'Default 3-year limitation' },
}

function getDaysRemaining(createdAt: string, caseType: string): number {
  const created = new Date(createdAt.split('/').reverse().join('-'))
  const limitDays = LIMITATION_PERIODS[caseType]?.days || 1095
  const deadline = new Date(created.getTime() + limitDays * 86400000)
  return Math.ceil((deadline.getTime() - Date.now()) / 86400000)
}
function getDeadlineColor(d: number): string {
  if (d <= 7) return 'var(--red-danger)'; if (d <= 30) return '#fb923c'; if (d <= 90) return 'var(--saffron)'; return 'var(--green-success)'
}

export default function CaseTracker() {
  const { cases, addCase, removeCase } = useAppStore()
  const [selected, setSelected] = useState<Case | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ title: '', type: 'Labour' })

  const handleAdd = () => {
    if (!form.title.trim()) return
    const now = new Date().toLocaleDateString('en-IN')
    addCase({ id: uuidv4(), title: form.title, type: form.type, status: 'active', createdAt: now, lastActivity: now, timeline: [{ id: uuidv4(), date: now, title: 'Case registered', description: `Case "${form.title}" registered on NyayaMitra`, type: 'filed' }], relatedActs: [], winProbability: 60 })
    setForm({ title: '', type: 'Labour' }); setShowForm(false)
  }

  const sortedCases = useMemo(() => [...cases].sort((a, b) => { if (a.status !== b.status) return a.status === 'active' ? -1 : 1; return getDaysRemaining(a.createdAt, a.type) - getDaysRemaining(b.createdAt, b.type) }), [cases])

  if (selected) {
    const daysLeft = getDaysRemaining(selected.createdAt, selected.type)
    const limitInfo = LIMITATION_PERIODS[selected.type] || LIMITATION_PERIODS.Other
    const deadlineColor = getDeadlineColor(daysLeft)

    return (
      <div id="case-detail-page" className="page-wrapper content-narrow">
        <button onClick={() => setSelected(null)} className="flex items-center gap-2 font-semibold mb-5" style={{ fontSize: '0.875rem', color: 'var(--blue-secondary)', background: 'none', border: 'none', cursor: 'pointer' }}><ArrowLeft size={16} /> Back to cases</button>

        <div className="mb-5">
          <div className="flex items-center justify-between">
            <h1 className="section-title">{selected.title}</h1>
            <span className={selected.status === 'active' ? 'badge-caution' : 'badge-safe'}>{selected.status}</span>
          </div>
          <p className="section-subtitle">{selected.type} · Started {selected.createdAt}</p>
        </div>

        {selected.status === 'active' && (
          <div className="gov-card-static p-5 mb-5" style={{ border: `1px solid ${deadlineColor}25` }}>
            <div className="flex items-center gap-2 mb-3"><Clock size={15} style={{ color: deadlineColor }} /><span className="text-label" style={{ color: deadlineColor }}>LIMITATION PERIOD</span></div>
            <div className="flex items-center justify-between mb-3">
              <div>
                <p style={{ fontSize: '2.5rem', fontWeight: 900, color: deadlineColor, lineHeight: 1 }}>{daysLeft > 0 ? daysLeft : 0}</p>
                <p className="text-caption">days remaining</p>
              </div>
              <div className="text-right">
                <p style={{ fontSize: '0.875rem', color: 'var(--text-primary)' }}>{limitInfo.forum}</p>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 4 }}>{limitInfo.note}</p>
              </div>
            </div>
            <div style={{ width: '100%', height: 10, borderRadius: 'var(--radius-full)', background: '#E0E0E0' }}>
              <div style={{ width: `${Math.max(0, Math.min(100, (daysLeft / limitInfo.days) * 100))}%`, height: 10, borderRadius: 'var(--radius-full)', background: deadlineColor, transition: 'width 0.5s' }} />
            </div>
            {daysLeft <= 30 && daysLeft > 0 && <div className="flex items-center gap-2.5 mt-3" style={{ fontSize: '0.875rem', fontWeight: 600, color: deadlineColor }}><AlertTriangle size={14} />{daysLeft <= 7 ? 'URGENT: File immediately!' : 'Deadline approaching.'}</div>}
            {daysLeft <= 0 && <div className="flex items-center gap-2.5 mt-3" style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--red-danger)' }}><AlertTriangle size={14} />EXPIRED — Consult a lawyer immediately.</div>}
          </div>
        )}

        <div className="gov-card-static p-5 mb-5">
          <div className="grid grid-cols-2 gap-3 text-center">
            <div><p style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--saffron)' }}>{selected.winProbability}%</p><p className="text-caption">Win Probability</p></div>
            <div><p style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--navy)' }}>{selected.timeline.length}</p><p className="text-caption">Timeline Events</p></div>
          </div>
        </div>

        <p className="text-label mb-3">Timeline</p>
        <CaseTimeline events={selected.timeline} />
      </div>
    )
  }

  return (
    <div id="case-tracker-page" className="page-wrapper content-narrow">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="section-title">Case Tracker</h1>
          <p className="section-subtitle">{cases.length} case{cases.length !== 1 ? 's' : ''}</p>
        </div>
        <button id="add-case-btn" onClick={() => setShowForm(!showForm)} className="btn-primary flex items-center gap-1.5 text-sm px-4" style={{ minHeight: 44, fontSize: '0.875rem' }}><Plus size={16} /> Add Case</button>
      </div>

      {showForm && (
        <div className="gov-card-static p-5 mb-5 space-y-3 slide-up">
          <input id="case-title-input" type="text" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Case title (e.g. Salary recovery from ABC Co.)" className="input-gov" />
          <select id="case-type-select" value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))} className="input-gov" style={{ appearance: 'none' }}>
            {CASE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          <div className="rounded-xl p-3.5" style={{ background: 'var(--saffron-light)', border: '1px solid rgba(255,153,51,0.15)' }}>
            <p style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--saffron-dark)', marginBottom: 4 }}>LIMITATION PERIOD</p>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-primary)' }}>{LIMITATION_PERIODS[form.type]?.note || 'Standard 3-year limitation'}</p>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 4 }}>Forum: {LIMITATION_PERIODS[form.type]?.forum || 'Appropriate Court'}</p>
          </div>
          <div className="flex gap-2.5"><button onClick={handleAdd} className="btn-primary flex-1">Save Case</button><button onClick={() => setShowForm(false)} className="btn-ghost flex-1">Cancel</button></div>
        </div>
      )}

      {cases.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div style={{ width: 64, height: 64, borderRadius: 'var(--radius-xl)', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--saffron-light)', marginBottom: 16 }}><Plus size={32} style={{ color: 'var(--saffron)' }} /></div>
          <p style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--text-primary)' }}>No cases yet</p>
          <p className="text-caption" style={{ marginTop: 4 }}>Add your first case to track it</p>
        </div>
      ) : (
        <div className="space-y-3">
          {sortedCases.map((c, i) => {
            const daysLeft = getDaysRemaining(c.createdAt, c.type)
            const deadlineColor = getDeadlineColor(daysLeft)
            const isUrgent = daysLeft <= 30 && c.status === 'active'
            return (
              <div key={c.id} id={`case-item-${i}`} className="action-card slide-up" style={{ animationDelay: `${i * 0.04}s`, borderColor: isUrgent ? deadlineColor : undefined }}>
                <button className="flex items-center gap-3 flex-1 text-left" style={{ background: 'none', border: 'none', cursor: 'pointer' }} onClick={() => setSelected(c)}>
                  <div style={{ width: 4, height: 40, borderRadius: 'var(--radius-full)', background: c.status === 'active' ? 'var(--saffron)' : 'var(--green-success)', flexShrink: 0 }} />
                  <div className="flex-1">
                    <p className="action-card-title">{c.title}</p>
                    <p className="action-card-desc">{c.type} · {c.lastActivity}</p>
                  </div>
                </button>
                <div className="flex items-center gap-3">
                  {c.status === 'active' && <div className="text-right"><p style={{ fontSize: '0.75rem', fontWeight: 700, color: deadlineColor }}>{daysLeft > 0 ? daysLeft : 0}d</p><p style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>left</p></div>}
                  <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--saffron)' }}>{c.winProbability}%</span>
                  <ChevronRight size={14} className="action-card-arrow" />
                  <button onClick={() => removeCase(c.id)} style={{ padding: 8, borderRadius: 'var(--radius-sm)', border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--text-muted)' }}><Trash2 size={14} /></button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
