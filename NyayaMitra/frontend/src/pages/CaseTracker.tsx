// CaseTracker — Manage and track legal cases
import { useState } from 'react'
import { Plus, Trash2, ChevronRight } from 'lucide-react'
import CaseTimeline from '@/components/CaseTimeline'
import { useAppStore, type Case } from '@/store/useAppStore'
import { v4 as uuidv4 } from 'uuid'

const CASE_TYPES = ['Labour', 'Property', 'Consumer', 'Criminal', 'Family', 'Cyber', 'RTI', 'Other']

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

  if (selected) {
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
          {cases.map((c, i) => (
            <div
              key={c.id}
              id={`case-item-${i}`}
              className="glass-card flex items-center justify-between px-4 py-4 slide-up"
              style={{ animationDelay: `${i * 0.05}s` }}
            >
              <button className="flex items-center gap-3 flex-1 text-left" onClick={() => setSelected(c)}>
                <div className="w-2 h-10 rounded-full shrink-0"
                  style={{ background: c.status === 'active' ? '#f59e0b' : '#34d399' }} />
                <div>
                  <p className="text-sm font-semibold text-white">{c.title}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{c.type} · {c.lastActivity}</p>
                </div>
              </button>
              <div className="flex items-center gap-2">
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
          ))}
        </div>
      )}
    </div>
  )
}
