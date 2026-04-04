import { useMemo, useState } from 'react'
import { Loader2, Send, ShieldAlert, Target } from 'lucide-react'
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

  const coachTurns = useMemo(() => history.filter((h) => h.role !== 'coach'), [history])

  const sendTurn = async () => {
    if (!scenario.trim() || !input.trim()) return
    setLoading(true)
    setError('')

    const newUserTurn: NegotiationTurn = { role: 'user', text: input.trim() }
    const newHistory = [...coachTurns, newUserTurn]
    setHistory(newHistory)

    try {
      const res = await negotiationRespond({
        scenario,
        user_message: newUserTurn.text,
        history: newHistory,
        lang: language,
      })

      setHistory((prev) => [...prev, { role: 'opponent', text: res.opponent_reply }])
      setLastDebrief(res.coach_debrief)
      setLastMissed(res.rights_missed)
      setSuggested(res.suggested_next_line)
      setScore(res.leverage_score)
      setInput('')
    } catch (e: unknown) {
      const err = e as { response?: { data?: { detail?: string } } }
      setError(err?.response?.data?.detail || 'Negotiation request failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div id="negotiation-coach-page" className="page-wrapper">
      <div className="mb-6">
        <h1 className="section-title">Negotiation Coach</h1>
        <p className="section-subtitle">Roleplay legal disputes with AI opponent + rights-based debrief</p>
      </div>

      <div className="glass-card p-4 mb-4">
        <label className="text-xs text-slate-500 mb-2 block font-medium">Scenario</label>
        <textarea
          value={scenario}
          onChange={(e) => setScenario(e.target.value)}
          rows={3}
          className="input-dark resize-none"
          placeholder="Describe dispute context, relationship, and what the other side is demanding..."
        />
      </div>

      <div className="glass-card p-4 mb-4">
        <p className="text-xs text-slate-500 mb-3">Roleplay</p>
        <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
          {history.length === 0 && (
            <p className="text-sm text-slate-500">No turns yet. Send your first line to begin simulation.</p>
          )}
          {history.map((turn, idx) => (
            <div
              key={idx}
              className="rounded-xl p-3 text-sm"
              style={{
                background:
                  turn.role === 'user'
                    ? 'rgba(245,158,11,0.12)'
                    : turn.role === 'opponent'
                      ? 'rgba(96,165,250,0.12)'
                      : 'rgba(52,211,153,0.12)',
              }}
            >
              <p className="text-xs font-semibold mb-1 capitalize text-slate-400">{turn.role}</p>
              <p className="text-slate-200 leading-relaxed">{turn.text}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="flex gap-2 mb-4">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && sendTurn()}
          placeholder="Your next negotiation line..."
          className="input-dark flex-1"
          disabled={loading}
        />
        <button onClick={sendTurn} disabled={loading || !input.trim()} className="btn-gold px-4 shrink-0">
          {loading ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
        </button>
      </div>

      {error && <div className="glass-card p-3 mb-4 border border-red-400/30 text-sm text-red-400">{error}</div>}

      {(lastDebrief || suggested || score !== null) && (
        <div className="space-y-3 fade-in">
          {score !== null && (
            <div className="glass-card p-4 flex items-center justify-between">
              <div className="flex items-center gap-2 text-slate-400 text-xs">
                <Target size={14} /> Leverage Score
              </div>
              <div className="text-2xl font-black text-amber-400">{score}</div>
            </div>
          )}

          {lastDebrief && (
            <div className="glass-card p-4">
              <p className="text-xs text-slate-500 mb-2">Coach Debrief</p>
              <p className="text-sm text-slate-200 leading-relaxed">{lastDebrief}</p>
            </div>
          )}

          {lastMissed.length > 0 && (
            <div className="glass-card p-4 border border-red-400/20">
              <p className="text-xs text-red-400 mb-2 flex items-center gap-1.5">
                <ShieldAlert size={13} /> Rights/Leverage Missed
              </p>
              <div className="space-y-1.5">
                {lastMissed.map((item, i) => (
                  <p key={i} className="text-sm text-slate-300">• {item}</p>
                ))}
              </div>
            </div>
          )}

          {suggested && (
            <div className="glass-card p-4 border border-emerald-400/20">
              <p className="text-xs text-emerald-400 mb-2">Suggested Next Line</p>
              <p className="text-sm text-slate-100 leading-relaxed">{suggested}</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
