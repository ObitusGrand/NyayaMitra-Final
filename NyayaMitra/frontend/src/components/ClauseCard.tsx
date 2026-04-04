// ClauseCard — Government light theme
import { useState } from 'react'
import { ChevronDown, ChevronUp, ExternalLink, AlertTriangle, CheckCircle, AlertCircle } from 'lucide-react'
import type { ClauseData } from '@/services/api'

interface ClauseCardProps { clause: ClauseData; index: number }

const RISK_CONFIG = {
  illegal: { badge: 'badge-illegal', icon: AlertTriangle, label: 'Illegal', color: 'var(--red-danger)', border: '1px solid rgba(211,47,47,0.2)', bg: 'var(--red-light)' },
  caution: { badge: 'badge-caution', icon: AlertCircle, label: 'Caution', color: 'var(--saffron)', border: '1px solid rgba(255,153,51,0.2)', bg: 'var(--saffron-light)' },
  safe: { badge: 'badge-safe', icon: CheckCircle, label: 'Safe', color: 'var(--green-success)', border: '1px solid rgba(46,125,50,0.2)', bg: 'var(--green-light)' },
}

export default function ClauseCard({ clause, index }: ClauseCardProps) {
  const [expanded, setExpanded] = useState(clause.risk !== 'safe')
  const config = RISK_CONFIG[clause.risk] || RISK_CONFIG.safe
  const Icon = config.icon

  return (
    <div id={`clause-card-${index}`} className="gov-card-static overflow-hidden slide-up" style={{ border: config.border, animationDelay: `${index * 0.04}s` }}>
      <button className="w-full flex items-start justify-between gap-3 p-4 text-left" style={{ background: 'none', border: 'none', cursor: 'pointer' }} onClick={() => setExpanded(!expanded)}>
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <Icon size={18} className="mt-0.5 shrink-0" style={{ color: config.color }} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className={config.badge}>{config.label}</span>
              <span style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>{clause.law_act} § {clause.law_section}</span>
            </div>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-primary)', lineHeight: 1.5 }} className="line-clamp-2">{clause.clause}</p>
          </div>
        </div>
        {expanded ? <ChevronUp size={16} style={{ color: 'var(--text-muted)' }} className="shrink-0 mt-1" /> : <ChevronDown size={16} style={{ color: 'var(--text-muted)' }} className="shrink-0 mt-1" />}
      </button>
      {expanded && (
        <div className="px-4 pb-4 space-y-3 pt-3" style={{ borderTop: '1px solid var(--border)' }}>
          <div className="rounded-xl p-3" style={{ background: 'var(--bg-page)' }}>
            <p style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 4 }}>हिंदी व्याख्या</p>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-primary)', fontFamily: "'Noto Sans Devanagari', sans-serif" }}>{clause.plain_hindi}</p>
          </div>
          <div className="rounded-xl p-3" style={{ background: 'var(--bg-page)' }}>
            <p style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 4 }}>Plain English</p>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-primary)' }}>{clause.plain_english}</p>
          </div>
          {clause.counter_clause && (
            <div className="rounded-xl p-3" style={{ background: 'var(--green-light)', border: '1px solid rgba(46,125,50,0.15)' }}>
              <p style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--green-success)', marginBottom: 4 }}>Suggested Replacement</p>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-primary)', fontStyle: 'italic' }}>{clause.counter_clause}</p>
            </div>
          )}
          <a href={clause.source_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 transition-colors" style={{ fontSize: '0.875rem', color: 'var(--blue-secondary)', textDecoration: 'none' }}>
            <ExternalLink size={12} /> View on indiacode.nic.in
          </a>
        </div>
      )}
    </div>
  )
}
