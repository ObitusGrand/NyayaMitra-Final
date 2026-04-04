// TrustBadge — source URL + confidence (Government light theme)
import { ExternalLink, ShieldCheck } from 'lucide-react'

interface TrustBadgeProps { urls: string[]; confidence: number }

export default function TrustBadge({ urls, confidence }: TrustBadgeProps) {
  const color = confidence >= 75 ? 'var(--green-success)' : confidence >= 50 ? 'var(--saffron)' : 'var(--red-danger)'

  return (
    <div id="trust-badge" className="gov-card-static p-4 flex items-start gap-3">
      <ShieldCheck size={18} className="shrink-0 mt-0.5" style={{ color }} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-2">
          <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)' }}>Legal Sources</span>
          <span style={{ fontSize: '0.75rem', fontWeight: 700, padding: '2px 10px', borderRadius: 'var(--radius-full)', background: confidence >= 75 ? 'var(--green-light)' : confidence >= 50 ? 'var(--saffron-light)' : 'var(--red-light)', color }}>{confidence}% match</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {urls.slice(0, 3).map((url, i) => (
            <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-sm transition-colors truncate max-w-[200px]" style={{ color: 'var(--blue-secondary)', textDecoration: 'none' }}>
              <ExternalLink size={11} /> <span className="truncate">indiacode.nic.in</span>
            </a>
          ))}
        </div>
      </div>
    </div>
  )
}
