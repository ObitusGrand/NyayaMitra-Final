// AmendmentCard — Government light theme
import { useState, useMemo } from 'react'
import { ChevronDown, ChevronUp, ExternalLink, Zap } from 'lucide-react'
import type { Amendment } from '@/services/api'

interface AmendmentCardProps { amendment: Amendment; index: number }

function computeDiff(oldText: string, newText: string) {
  const oldWords = oldText.split(/\s+/), newWords = newText.split(/\s+/)
  const oldSet = new Set(newWords), newSet = new Set(oldWords)
  return { old: oldWords.map(w => ({ text: w, changed: !oldSet.has(w) })), new_: newWords.map(w => ({ text: w, changed: !newSet.has(w) })) }
}

export default function AmendmentCard({ amendment, index }: AmendmentCardProps) {
  const [expanded, setExpanded] = useState(false)
  const diff = useMemo(() => amendment.old_text && amendment.new_text ? computeDiff(amendment.old_text, amendment.new_text) : null, [amendment.old_text, amendment.new_text])

  return (
    <div id={`amendment-card-${index}`} className="gov-card-static overflow-hidden slide-up" style={{ animationDelay: `${index * 0.05}s` }}>
      <button className="w-full flex items-start gap-3 p-4 text-left" style={{ background: 'none', border: 'none', cursor: 'pointer' }} onClick={() => setExpanded(!expanded)}>
        <div style={{ width: 32, height: 32, borderRadius: 'var(--radius-sm)', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--saffron-light)', flexShrink: 0, marginTop: 2 }}>
          <Zap size={15} style={{ color: 'var(--saffron)' }} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)' }}>{amendment.title}</span>
            <span style={{ fontSize: '0.75rem', fontWeight: 600, padding: '2px 10px', borderRadius: 'var(--radius-full)', background: 'var(--saffron-light)', color: 'var(--saffron-dark)', border: '1px solid rgba(255,153,51,0.2)' }}>{amendment.date}</span>
          </div>
          <p className="text-caption" style={{ marginTop: 4 }}>{amendment.affected_act}</p>
          {amendment.affected_case_types?.length > 0 && (
            <div className="flex gap-1 mt-1.5 flex-wrap">
              {amendment.affected_case_types.map((ct, i) => <span key={i} style={{ fontSize: '0.75rem', padding: '2px 8px', borderRadius: 'var(--radius-full)', background: 'var(--bg-page)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}>{ct}</span>)}
            </div>
          )}
        </div>
        {expanded ? <ChevronUp size={16} style={{ color: 'var(--text-muted)' }} className="shrink-0" /> : <ChevronDown size={16} style={{ color: 'var(--text-muted)' }} className="shrink-0" />}
      </button>

      {expanded && (
        <div className="px-4 pb-4 space-y-3 pt-3" style={{ borderTop: '1px solid var(--border)' }}>
          <div className="rounded-xl p-3" style={{ background: 'var(--bg-page)' }}>
            <p style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 4 }}>Hindi</p>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-primary)', fontFamily: "'Noto Sans Devanagari', sans-serif" }}>{amendment.summary_hindi}</p>
          </div>
          <div className="rounded-xl p-3" style={{ background: 'var(--bg-page)' }}>
            <p style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 4 }}>English Summary</p>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-primary)' }}>{amendment.summary_english}</p>
          </div>
          {diff && (
            <div className="space-y-2">
              <p style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Before / After</p>
              <div className="rounded-xl p-3" style={{ background: 'var(--red-light)', border: '1px solid rgba(211,47,47,0.15)' }}>
                <p style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--red-danger)', marginBottom: 8 }}>BEFORE (Removed)</p>
                <p style={{ fontSize: '0.875rem', color: 'var(--text-primary)', lineHeight: 1.6 }}>
                  {diff.old.map((w, i) => <span key={i}>{w.changed ? <span style={{ textDecoration: 'line-through', color: 'var(--red-danger)', background: 'rgba(211,47,47,0.08)', padding: '0 2px', borderRadius: 2 }}>{w.text}</span> : <span>{w.text}</span>}{' '}</span>)}
                </p>
              </div>
              <div className="rounded-xl p-3" style={{ background: 'var(--green-light)', border: '1px solid rgba(46,125,50,0.15)' }}>
                <p style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--green-success)', marginBottom: 8 }}>AFTER (Added)</p>
                <p style={{ fontSize: '0.875rem', color: 'var(--text-primary)', lineHeight: 1.6 }}>
                  {diff.new_.map((w, i) => <span key={i}>{w.changed ? <span style={{ fontWeight: 600, color: 'var(--green-success)', background: 'rgba(46,125,50,0.08)', padding: '0 2px', borderRadius: 2 }}>{w.text}</span> : <span>{w.text}</span>}{' '}</span>)}
                </p>
              </div>
            </div>
          )}
          {!diff && amendment.old_text && (
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-xl p-3" style={{ background: 'var(--red-light)', border: '1px solid rgba(211,47,47,0.15)' }}>
                <p style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--red-danger)', marginBottom: 4 }}>BEFORE</p>
                <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>{amendment.old_text}</p>
              </div>
              <div className="rounded-xl p-3" style={{ background: 'var(--green-light)', border: '1px solid rgba(46,125,50,0.15)' }}>
                <p style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--green-success)', marginBottom: 4 }}>AFTER</p>
                <p style={{ fontSize: '0.875rem', color: 'var(--text-primary)' }}>{amendment.new_text}</p>
              </div>
            </div>
          )}
          <a href={amendment.source_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 transition-colors" style={{ fontSize: '0.875rem', color: 'var(--blue-secondary)', textDecoration: 'none' }}>
            <ExternalLink size={11} /> View official gazette
          </a>
        </div>
      )}
    </div>
  )
}
