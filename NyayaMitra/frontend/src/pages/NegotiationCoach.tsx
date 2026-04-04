// NegotiationCoach — Government light theme
import { useMemo, useState } from 'react'
import { Loader2, Send, ShieldAlert, Target, Sparkles } from 'lucide-react'
import { useAppStore } from '@/store/useAppStore'
import { negotiationRespond, type NegotiationTurn } from '@/services/api'

export default function NegotiationCoach() {
  const { language } = useAppStore()
  const [scenario, setScenario] = useState('Employer has delayed my salary for 3 months and is asking me to resign quietly.')
  const [input, setInput] = useState('I want my full salary and written timeline for payment.')
  const [history, setHistory] = useState<NegotiationTurn[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [lastDebrief, setLastDebrief] = useState('')
  const [lastMissed, setLastMissed] = useState<string[]>([])
  const [suggested, setSuggested] = useState('')
  const [score, setScore] = useState<number | null>(null)
  const coachTurns = useMemo(() => history.filter(h => h.role !== 'coach'), [history])

  const sendTurn = async () => {
    if (!scenario.trim() || !input.trim()) return; setLoading(true); setError('')
    const newUserTurn: NegotiationTurn = { role: 'user', text: input.trim() }
    const newHistory = [...coachTurns, newUserTurn]; setHistory(newHistory)
    try {
      const res = await negotiationRespond({ scenario, user_message: newUserTurn.text, history: newHistory, lang: language })
      setHistory(prev => [...prev, { role: 'opponent', text: res.opponent_reply }])
      setLastDebrief(res.coach_debrief); setLastMissed(res.rights_missed); setSuggested(res.suggested_next_line); setScore(res.leverage_score); setInput('')
    } catch (e: unknown) { const err = e as { response?: { data?: { detail?: string } } }; setError(err?.response?.data?.detail || 'Negotiation request failed') }
    finally { setLoading(false) }
  }

  const roleColors = { user: { bg: 'var(--saffron-light)', border: 'rgba(255,153,51,0.2)', label: 'var(--saffron-dark)' }, opponent: { bg: 'var(--blue-light)', border: 'rgba(26,95,180,0.2)', label: 'var(--blue-secondary)' }, coach: { bg: 'var(--green-light)', border: 'rgba(46,125,50,0.2)', label: 'var(--green-success)' } }

  return (
    <div id="negotiation-coach-page" className="page-wrapper">
      <div className="mb-5">
        <h1 className="section-title">Negotiation Coach</h1>
        <p className="section-subtitle">Roleplay legal disputes with AI opponent + rights-based debrief</p>
      </div>

      <div className="gov-card-static p-5 mb-4">
        <label className="text-label mb-2 block">Scenario</label>
        <textarea value={scenario} onChange={e => setScenario(e.target.value)} rows={3} className="input-gov resize-none" placeholder="Describe dispute context..." />
      </div>

      <div className="gov-card-static p-5 mb-4">
        <p className="text-label mb-3">Roleplay</p>
        <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
          {history.length === 0 && <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>No turns yet. Send your first line to begin.</p>}
          {history.map((turn, idx) => {
            const c = roleColors[turn.role as keyof typeof roleColors] || roleColors.coach
            return (
              <div key={idx} className="rounded-xl p-3.5 spring-in" style={{ animationDelay: `${idx * 0.04}s`, background: c.bg, border: `1px solid ${c.border}` }}>
                <p style={{ fontSize: '0.75rem', fontWeight: 700, marginBottom: 4, textTransform: 'capitalize', color: c.label }}>{turn.role}</p>
                <p style={{ fontSize: '0.875rem', lineHeight: 1.6, color: 'var(--text-primary)' }}>{turn.text}</p>
              </div>
            )
          })}
        </div>
      </div>

      <div className="flex gap-2.5 mb-4">
        <input type="text" value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && sendTurn()} placeholder="Your next negotiation line..." className="input-gov flex-1" disabled={loading} />
        <button onClick={sendTurn} disabled={loading || !input.trim()} className="btn-primary px-5 shrink-0">
          {loading ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
        </button>
      </div>

      {error && <div className="alert-danger mb-4"><p style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--red-danger)' }}>{error}</p></div>}

      {(lastDebrief || suggested || score !== null) && (
        <div className="space-y-3 fade-in">
          {score !== null && (
            <div className="gov-card-static p-4 flex items-center justify-between">
              <div className="flex items-center gap-2.5 text-caption"><Target size={15} /> Leverage Score</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--saffron)' }}>{score}</div>
            </div>
          )}
          {lastDebrief && (
            <div className="gov-card-static p-5">
              <p className="text-label mb-2">Coach Debrief</p>
              <p style={{ fontSize: '0.875rem', lineHeight: 1.6, color: 'var(--text-primary)' }}>{lastDebrief}</p>
            </div>
          )}
          {lastMissed.length > 0 && (
            <div className="gov-card-static p-5" style={{ border: '1px solid rgba(211,47,47,0.2)' }}>
              <p style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--red-danger)', marginBottom: 10 }} className="flex items-center gap-1.5"><ShieldAlert size={14} /> Rights/Leverage Missed</p>
              <div className="space-y-2">{lastMissed.map((item, i) => <p key={i} style={{ fontSize: '0.875rem', color: 'var(--text-primary)' }}>• {item}</p>)}</div>
            </div>
          )}
          {suggested && (
            <div className="gov-card-static p-5" style={{ border: '1px solid rgba(46,125,50,0.2)' }}>
              <p style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--green-success)', marginBottom: 8 }} className="flex items-center gap-1.5"><Sparkles size={14} /> Suggested Next Line</p>
              <p style={{ fontSize: '0.875rem', lineHeight: 1.6, color: 'var(--text-primary)' }}>{suggested}</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
