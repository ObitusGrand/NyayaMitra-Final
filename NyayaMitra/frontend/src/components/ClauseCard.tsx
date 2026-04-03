// ClauseCard — displays a single legal clause with risk analysis
import { useState } from 'react'
import { ChevronDown, ChevronUp, ExternalLink, AlertTriangle, CheckCircle, AlertCircle } from 'lucide-react'
import type { ClauseData } from '@/services/api'

interface ClauseCardProps {
  clause: ClauseData
  index: number
}

const RISK_CONFIG = {
  illegal: {
    badge: 'badge-illegal',
    icon: AlertTriangle,
    label: 'Illegal',
    border: 'border-red-400/30',
    glow: 'rgba(248,113,113,0.05)',
  },
  caution: {
    badge: 'badge-caution',
    icon: AlertCircle,
    label: 'Caution',
    border: 'border-yellow-400/30',
    glow: 'rgba(251,191,36,0.05)',
  },
  safe: {
    badge: 'badge-safe',
    icon: CheckCircle,
    label: 'Safe',
    border: 'border-emerald-400/30',
    glow: 'rgba(52,211,153,0.05)',
  },
}

export default function ClauseCard({ clause, index }: ClauseCardProps) {
  const [expanded, setExpanded] = useState(clause.risk !== 'safe')
  const config = RISK_CONFIG[clause.risk] || RISK_CONFIG.safe
  const Icon = config.icon

  return (
    <div
      id={`clause-card-${index}`}
      className={`glass-card border ${config.border} overflow-hidden slide-up`}
      style={{ background: config.glow, animationDelay: `${index * 0.05}s` }}
    >
      {/* Header */}
      <button
        className="w-full flex items-start justify-between gap-3 p-4 text-left"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <Icon size={18} className="mt-0.5 shrink-0"
            color={clause.risk === 'illegal' ? '#f87171' : clause.risk === 'caution' ? '#fbbf24' : '#34d399'}
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className={config.badge}>
                {config.label}
              </span>
              <span className="text-xs text-slate-500">
                {clause.law_act} § {clause.law_section}
              </span>
            </div>
            <p className="text-sm text-slate-300 leading-relaxed line-clamp-2">
              {clause.clause}
            </p>
          </div>
        </div>
        {expanded ? (
          <ChevronUp size={16} className="text-slate-500 shrink-0 mt-1" />
        ) : (
          <ChevronDown size={16} className="text-slate-500 shrink-0 mt-1" />
        )}
      </button>

      {/* Expanded content */}
      {expanded && (
        <div className="px-4 pb-4 space-y-3 border-t border-white/5 pt-3">
          {/* Hindi explanation */}
          <div className="rounded-xl p-3" style={{ background: 'rgba(255,255,255,0.04)' }}>
            <p className="text-xs text-slate-500 mb-1 font-medium">हिंदी व्याख्या</p>
            <p className="text-sm text-slate-300" style={{ fontFamily: "'Noto Sans Devanagari', sans-serif" }}>
              {clause.plain_hindi}
            </p>
          </div>

          {/* English explanation */}
          <div className="rounded-xl p-3" style={{ background: 'rgba(255,255,255,0.04)' }}>
            <p className="text-xs text-slate-500 mb-1 font-medium">Plain English</p>
            <p className="text-sm text-slate-300">{clause.plain_english}</p>
          </div>

          {/* Counter clause */}
          {clause.counter_clause && (
            <div className="rounded-xl p-3 border border-emerald-400/20"
              style={{ background: 'rgba(52,211,153,0.05)' }}>
              <p className="text-xs text-emerald-400 mb-1 font-medium">Suggested Replacement</p>
              <p className="text-sm text-slate-300 italic">{clause.counter_clause}</p>
            </div>
          )}

          {/* Source link */}
          <a
            href={clause.source_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs text-amber-400 hover:text-amber-300 transition-colors"
          >
            <ExternalLink size={12} />
            View on indiacode.nic.in
          </a>
        </div>
      )}
    </div>
  )
}
