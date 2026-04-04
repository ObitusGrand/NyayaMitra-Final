// CaseTimeline — Government light theme
import { FileText, Gavel, Bell, CheckCircle, Clock } from 'lucide-react'
import type { TimelineEvent } from '@/store/useAppStore'

interface CaseTimelineProps { events: TimelineEvent[] }

const EVENT_ICONS = { filed: FileText, hearing: Gavel, order: CheckCircle, notice: Bell, update: Clock }
const EVENT_COLORS = { filed: '#FF9933', hearing: '#5E35B1', order: '#2E7D32', notice: '#fb923c', update: '#1976D2' }

export default function CaseTimeline({ events }: CaseTimelineProps) {
  if (!events.length) return <div className="text-center py-8" style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>No timeline events yet</div>

  return (
    <div id="case-timeline" className="relative">
      <div className="absolute left-5 top-0 bottom-0 w-px" style={{ background: 'var(--border)' }} />
      <div className="space-y-4">
        {events.map((event, i) => {
          const Icon = EVENT_ICONS[event.type] || Clock
          const color = EVENT_COLORS[event.type] || '#1976D2'
          return (
            <div key={event.id} className="flex gap-4 relative slide-up" style={{ animationDelay: `${i * 0.06}s` }}>
              <div style={{ width: 40, height: 40, borderRadius: 'var(--radius-full)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, zIndex: 10, background: `${color}15`, border: `1px solid ${color}30` }}>
                <Icon size={16} style={{ color }} />
              </div>
              <div className="gov-card-static flex-1 p-3">
                <div className="flex items-start justify-between gap-2">
                  <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)' }}>{event.title}</span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', flexShrink: 0 }}>{event.date}</span>
                </div>
                <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginTop: 4 }}>{event.description}</p>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
