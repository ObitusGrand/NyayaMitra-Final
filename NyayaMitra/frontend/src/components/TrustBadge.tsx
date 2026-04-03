// TrustBadge — source URL + confidence indicator
import { ExternalLink, ShieldCheck } from 'lucide-react'

interface TrustBadgeProps {
  urls: string[]
  confidence: number
}

export default function TrustBadge({ urls, confidence }: TrustBadgeProps) {
  const color = confidence >= 75 ? '#34d399' : confidence >= 50 ? '#fbbf24' : '#f87171'

  return (
    <div id="trust-badge" className="glass-card p-3 flex items-start gap-3">
      <ShieldCheck size={18} className="shrink-0 mt-0.5" style={{ color }} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1.5">
          <span className="text-xs font-semibold text-slate-300">Legal Sources</span>
          <span
            className="text-xs font-bold px-2 py-0.5 rounded-full"
            style={{ background: `${color}20`, color }}
          >
            {confidence}% match
          </span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {urls.slice(0, 3).map((url, i) => (
            <a
              key={i}
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-amber-400 hover:text-amber-300 transition-colors truncate max-w-[200px]"
            >
              <ExternalLink size={10} />
              <span className="truncate">indiacode.nic.in</span>
            </a>
          ))}
        </div>
      </div>
    </div>
  )
}
