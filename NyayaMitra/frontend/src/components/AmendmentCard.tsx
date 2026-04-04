// AmendmentCard — shows a single law amendment with proper diff view
import { useState, useMemo } from 'react'
import { ChevronDown, ChevronUp, ExternalLink, Zap } from 'lucide-react'
import type { Amendment } from '@/services/api'

interface AmendmentCardProps {
  amendment: Amendment
  index: number
}

// Simple word-level diff for visual highlighting
function computeDiff(oldText: string, newText: string): { old: { text: string; changed: boolean }[]; new_: { text: string; changed: boolean }[] } {
  const oldWords = oldText.split(/\s+/)
  const newWords = newText.split(/\s+/)
  const oldSet = new Set(newWords)
  const newSet = new Set(oldWords)

  return {
    old: oldWords.map(w => ({ text: w, changed: !oldSet.has(w) })),
    new_: newWords.map(w => ({ text: w, changed: !newSet.has(w) })),
  }
}

export default function AmendmentCard({ amendment, index }: AmendmentCardProps) {
  const [expanded, setExpanded] = useState(false)

  const diff = useMemo(() => {
    if (amendment.old_text && amendment.new_text) {
      return computeDiff(amendment.old_text, amendment.new_text)
    }
    return null
  }, [amendment.old_text, amendment.new_text])

  return (
    <div
      id={`amendment-card-${index}`}
      className="glass-card overflow-hidden slide-up"
      style={{ animationDelay: `${index * 0.06}s` }}
    >
      <button
        className="w-full flex items-start gap-3 p-4 text-left"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
          style={{ background: 'rgba(245,158,11,0.15)' }}>
          <Zap size={15} style={{ color: '#f59e0b' }} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold text-white">{amendment.title}</span>
            <span className="text-xs text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded-full border border-amber-400/20">
              {amendment.date}
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">{amendment.affected_act}</p>
          {amendment.affected_case_types?.length > 0 && (
            <div className="flex gap-1 mt-1.5 flex-wrap">
              {amendment.affected_case_types.map((ct, i) => (
                <span key={i} className="text-[9px] px-1.5 py-0.5 rounded-full bg-white/5 text-slate-500">{ct}</span>
              ))}
            </div>
          )}
        </div>
        {expanded ? <ChevronUp size={16} className="text-slate-500 shrink-0" /> :
          <ChevronDown size={16} className="text-slate-500 shrink-0" />}
      </button>

      {expanded && (
        <div className="px-4 pb-4 space-y-3 border-t border-white/5 pt-3">
          {/* Hindi summary */}
          <div className="rounded-xl p-3" style={{ background: 'rgba(255,255,255,0.04)' }}>
            <p className="text-xs text-slate-500 mb-1 font-medium">Hindi</p>
            <p className="text-sm text-slate-300" style={{ fontFamily: "'Noto Sans Devanagari', sans-serif" }}>
              {amendment.summary_hindi}
            </p>
          </div>
          {/* English summary */}
          <div className="rounded-xl p-3" style={{ background: 'rgba(255,255,255,0.04)' }}>
            <p className="text-xs text-slate-500 mb-1 font-medium">English Summary</p>
            <p className="text-sm text-slate-300">{amendment.summary_english}</p>
          </div>

          {/* Diff view */}
          {diff && (
            <div className="space-y-2">
              <p className="text-[10px] text-slate-500 font-medium uppercase tracking-wider">Before / After Comparison</p>

              {/* Old text with strikethrough on removed words */}
              <div className="rounded-xl p-3" style={{ background: 'rgba(248,113,113,0.05)', border: '1px solid rgba(248,113,113,0.15)' }}>
                <p className="text-[10px] text-red-400 font-medium mb-2 flex items-center gap-1">
                  <span className="w-3 h-0.5 rounded bg-red-400 inline-block" /> BEFORE (Removed)
                </p>
                <p className="text-xs text-slate-400 leading-relaxed">
                  {diff.old.map((w, i) => (
                    <span key={i}>
                      {w.changed ? (
                        <span className="line-through text-red-400/70 bg-red-400/10 px-0.5 rounded">{w.text}</span>
                      ) : (
                        <span>{w.text}</span>
                      )}
                      {' '}
                    </span>
                  ))}
                </p>
              </div>

              {/* New text with highlight on added words */}
              <div className="rounded-xl p-3" style={{ background: 'rgba(52,211,153,0.05)', border: '1px solid rgba(52,211,153,0.15)' }}>
                <p className="text-[10px] text-emerald-400 font-medium mb-2 flex items-center gap-1">
                  <span className="w-3 h-0.5 rounded bg-emerald-400 inline-block" /> AFTER (Added)
                </p>
                <p className="text-xs text-slate-300 leading-relaxed">
                  {diff.new_.map((w, i) => (
                    <span key={i}>
                      {w.changed ? (
                        <span className="font-semibold text-emerald-400 bg-emerald-400/10 px-0.5 rounded">{w.text}</span>
                      ) : (
                        <span>{w.text}</span>
                      )}
                      {' '}
                    </span>
                  ))}
                </p>
              </div>
            </div>
          )}

          {/* Fallback: old raw text display if no diff possible */}
          {!diff && amendment.old_text && (
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-xl p-3 border border-red-400/20" style={{ background: 'rgba(248,113,113,0.05)' }}>
                <p className="text-[10px] text-red-400 font-medium mb-1">BEFORE</p>
                <p className="text-xs text-slate-400">{amendment.old_text}</p>
              </div>
              <div className="rounded-xl p-3 border border-emerald-400/20" style={{ background: 'rgba(52,211,153,0.05)' }}>
                <p className="text-[10px] text-emerald-400 font-medium mb-1">AFTER</p>
                <p className="text-xs text-slate-300">{amendment.new_text}</p>
              </div>
            </div>
          )}

          <a href={amendment.source_url} target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs text-amber-400 hover:text-amber-300">
            <ExternalLink size={11} /> View official gazette
          </a>
        </div>
      )}
    </div>
  )
}
