// NyayaScore — Legal health score
import { useState } from 'react'
import { Loader2, TrendingUp, AlertCircle } from 'lucide-react'
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
      const res = await computeScore({ 
        clauses: decodedClauses, 
        active_cases: cases.filter(c => c.status === 'active').length,
        documents_analysed: documentsDecoded
      })
      setResult(res as unknown as Record<string, unknown>)
      setNyayaScore(res.score)
    } catch {
      const illegal = decodedClauses.filter(c => c.risk === 'illegal').length
      const avgIllegal = Math.ceil(illegal / Math.max(1, documentsDecoded))
      const mockScore = Math.max(20, 100 - avgIllegal * 15 - cases.filter(c => c.status === 'active').length * 3)
      setNyayaScore(mockScore)
      setResult({
        score: mockScore,
        improvement_tips: ['Upload employment/rental agreements for clause scanning', 'Track all active cases', 'Set GROQ_API_KEY for full AI analysis'],
        top_issues: avgIllegal > 0 ? [{ issue: `${avgIllegal} illegal clauses avg/document`, points_lost: avgIllegal * 15, fix_action: 'Get those clauses reviewed by a lawyer' }] : [],
      })
    } finally { setLoading(false) }
  }

  const score = (result?.score as number) ?? nyayaScore ?? 0
  const tips = (result?.improvement_tips as string[]) ?? []
  const issues = (result?.top_issues as {issue:string;points_lost:number;fix_action:string}[]) ?? []

  return (
    <div id="nyaya-score-page" className="page-wrapper">
      <div className="mb-6">
        <h1 className="section-title">NyayaScore™</h1>
        <p className="section-subtitle">Your legal health index (0–100)</p>
      </div>
      <div className="glass-card p-8 flex flex-col items-center mb-6">
        <NyayaGauge score={score} size={220} label={score >= 75 ? 'Strong' : score >= 50 ? 'Moderate' : score > 0 ? 'At Risk' : 'Pending'} sublabel="NyayaScore" />
        <button id="compute-score-btn" onClick={handleCompute} disabled={loading} className="btn-gold mt-6 flex items-center gap-2">
          {loading ? <Loader2 size={16} className="animate-spin" /> : <TrendingUp size={16} />}
          {loading ? 'Computing...' : result ? 'Recompute' : 'Compute My Score'}
        </button>
      </div>
      <div className="glass-card p-4 mb-4">
        <p className="text-xs font-medium text-slate-500 mb-3 uppercase tracking-wider">Score Guide</p>
        {[{range:'76–100',label:'Strong',color:'#34d399'},{range:'51–75',label:'Moderate',color:'#fbbf24'},{range:'26–50',label:'At Risk',color:'#fb923c'},{range:'0–25',label:'Critical',color:'#f87171'}].map(s => (
          <div key={s.range} className="flex items-center gap-3 mb-1">
            <span className="w-16 text-xs font-bold shrink-0" style={{color:s.color}}>{s.range}</span>
            <span className="text-xs font-semibold text-white">{s.label}</span>
          </div>
        ))}
      </div>
      {issues.length > 0 && (
        <div className="space-y-2 mb-4">
          {issues.map((issue, i) => (
            <div key={i} className="glass-card p-3 border border-red-400/20 flex gap-3">
              <AlertCircle size={16} className="text-red-400 shrink-0" />
              <div className="flex-1">
                <p className="text-sm text-white">{issue.issue}</p>
                <p className="text-xs text-slate-500 mt-0.5">{issue.fix_action}</p>
              </div>
              <span className="text-xs font-bold text-red-400 shrink-0">-{issue.points_lost}pts</span>
            </div>
          ))}
        </div>
      )}
      {tips.length > 0 && (
        <div className="glass-card p-4">
          <p className="text-xs font-medium text-slate-500 mb-3 uppercase tracking-wider">Improve Your Score</p>
          <div className="space-y-2">
            {tips.map((tip, i) => (
              <div key={i} className="flex items-start gap-2">
                <span className="text-emerald-400 text-sm shrink-0">→</span>
                <p className="text-sm text-slate-300">{tip}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
