// CaseTimeline — shows a case's event timeline
import { FileText, Gavel, Bell, CheckCircle, Clock } from 'lucide-react'
import type { TimelineEvent } from '@/store/useAppStore'

interface CaseTimelineProps {
  events: TimelineEvent[]
}

const EVENT_ICONS = {
  filed: FileText,
  hearing: Gavel,
  order: CheckCircle,
  notice: Bell,
  update: Clock,
}

const EVENT_COLORS = {
  filed: '#f59e0b',
  hearing: '#a78bfa',
  order: '#34d399',
  notice: '#fb923c',
  update: '#60a5fa',
}

export default function CaseTimeline({ events }: CaseTimelineProps) {
  if (!events.length) {
    return (
      <div className="text-center py-8 text-slate-500 text-sm">
        No timeline events yet
      </div>
    )
  }

  return (
    <div id="case-timeline" className="relative">
      {/* Vertical line */}
      <div className="absolute left-5 top-0 bottom-0 w-px bg-white/10" />

      <div className="space-y-4">
        {events.map((event, i) => {
          const Icon = EVENT_ICONS[event.type] || Clock
          const color = EVENT_COLORS[event.type] || '#60a5fa'
          return (
            <div key={event.id} className="flex gap-4 relative slide-up"
              style={{ animationDelay: `${i * 0.08}s` }}>
              {/* Icon dot */}
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 z-10"
                style={{ background: `${color}20`, border: `1px solid ${color}40` }}
              >
                <Icon size={16} style={{ color }} />
              </div>
              {/* Content */}
              <div className="glass-card flex-1 p-3">
                <div className="flex items-start justify-between gap-2">
                  <span className="text-sm font-semibold text-white">{event.title}</span>
                  <span className="text-xs text-slate-500 shrink-0">{event.date}</span>
                </div>
                <p className="text-xs text-slate-400 mt-1">{event.description}</p>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
