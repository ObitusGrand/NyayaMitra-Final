// NyayaScore — Legal health score (Government light theme)
import { useState } from 'react'
import { Loader2, TrendingUp, AlertCircle, Sparkles } from 'lucide-react'
import NyayaGauge from '@/components/NyayaGauge'
import { useAppStore } from '@/store/useAppStore'
import { computeScore } from '@/services/api'

export default function NyayaScore() {
  const { decodedClauses, cases, nyayaScore, setNyayaScore, documentsDecoded } = useAppStore()
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<Record<string, unknown> | null>(null)

  const handleCompute = async () => {
    setLoading(true)
    try {
      const res = await computeScore({ clauses: decodedClauses, active_cases: cases.filter(c => c.status === 'active').length, documents_analysed: documentsDecoded })
      setResult(res as unknown as Record<string, unknown>); setNyayaScore(res.score)
      useAppStore.getState().logActivity({ type: 'score_computed', title: `NyayaScore computed: ${res.score}/100`, xpEarned: 200 })
    } catch {
      const illegal = decodedClauses.filter(c => c.risk === 'illegal').length
      const avgIllegal = Math.ceil(illegal / Math.max(1, documentsDecoded))
      const mockScore = Math.max(20, 100 - avgIllegal * 15 - cases.filter(c => c.status === 'active').length * 3)
      setNyayaScore(mockScore)
      setResult({ score: mockScore, improvement_tips: ['Upload agreements for clause scanning', 'Track all active cases', 'Set GROQ_API_KEY for full AI analysis'], top_issues: avgIllegal > 0 ? [{ issue: `${avgIllegal} illegal clauses avg/document`, points_lost: avgIllegal * 15, fix_action: 'Get those clauses reviewed by a lawyer' }] : [] })
      useAppStore.getState().logActivity({ type: 'score_computed', title: `NyayaScore computed: ${mockScore}/100`, xpEarned: 200 })
    } finally { setLoading(false) }
  }

  const score = (result?.score as number) ?? nyayaScore ?? 0
  const tips = (result?.improvement_tips as string[]) ?? []
  const issues = (result?.top_issues as {issue:string;points_lost:number;fix_action:string}[]) ?? []

  return (
    <div id="nyaya-score-page" className="page-wrapper">
      <div className="mb-5">
        <h1 className="section-title">NyayaScore™</h1>
        <p className="section-subtitle">Your legal health index (0–100)</p>
      </div>

      <div className="gov-card-static p-8 flex flex-col items-center mb-6">
        <NyayaGauge score={score} size={220} label={score >= 75 ? 'Strong' : score >= 50 ? 'Moderate' : score > 0 ? 'At Risk' : 'Pending'} sublabel="NyayaScore" />
        <button id="compute-score-btn" onClick={handleCompute} disabled={loading} className="btn-primary mt-6 flex items-center gap-2">
          {loading ? <Loader2 size={16} className="animate-spin" /> : <TrendingUp size={16} />}
          {loading ? 'Computing...' : result ? 'Recompute' : 'Compute My Score'}
        </button>
      </div>

      <div className="gov-card-static p-4 mb-5">
        <p className="text-label mb-3">Score Guide</p>
        {[
          { range: '76–100', label: 'Strong', color: 'var(--green-success)', icon: '💪' },
          { range: '51–75', label: 'Moderate', color: 'var(--saffron)', icon: '⚠️' },
          { range: '26–50', label: 'At Risk', color: '#fb923c', icon: '🔶' },
          { range: '0–25', label: 'Critical', color: 'var(--red-danger)', icon: '🚨' },
        ].map(s => (
          <div key={s.range} className="flex items-center gap-3 mb-2 py-1">
            <span style={{ fontSize: '0.875rem' }}>{s.icon}</span>
            <span style={{ width: 56, fontSize: '0.875rem', fontWeight: 700, color: s.color, flexShrink: 0 }}>{s.range}</span>
            <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)' }}>{s.label}</span>
          </div>
        ))}
      </div>

      {issues.length > 0 && (
        <div className="space-y-2.5 mb-5">
          <p className="text-label">Issues Found</p>
          {issues.map((issue, i) => (
            <div key={i} className="gov-card-static p-4 flex gap-3" style={{ border: '1px solid rgba(211,47,47,0.2)' }}>
              <AlertCircle size={16} style={{ color: 'var(--red-danger)' }} className="shrink-0 mt-0.5" />
              <div className="flex-1">
                <p style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)' }}>{issue.issue}</p>
                <p className="text-caption" style={{ marginTop: 4 }}>{issue.fix_action}</p>
              </div>
              <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--red-danger)', flexShrink: 0 }}>-{issue.points_lost}pts</span>
            </div>
          ))}
        </div>
      )}

      {tips.length > 0 && (
        <div className="gov-card-static p-4">
          <p className="text-label mb-3">Improve Your Score</p>
          <div className="space-y-2.5">
            {tips.map((tip, i) => (
              <div key={i} className="flex items-start gap-2.5">
                <Sparkles size={14} style={{ color: 'var(--green-success)' }} className="shrink-0 mt-0.5" />
                <p style={{ fontSize: '0.875rem', color: 'var(--text-primary)' }}>{tip}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
