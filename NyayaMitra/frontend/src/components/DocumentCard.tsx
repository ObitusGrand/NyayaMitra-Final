// DocumentCard — generated document preview card
import { useState } from 'react'
import { FileText, Copy, Download, ChevronDown, ChevronUp } from 'lucide-react'
import type { GenerateResponse } from '@/services/api'

interface DocumentCardProps {
  doc: GenerateResponse
}

export default function DocumentCard({ doc }: DocumentCardProps) {
  const [expanded, setExpanded] = useState(true)
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    await navigator.clipboard.writeText(doc.doc_text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleDownload = () => {
    const blob = new Blob([doc.doc_text], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `nyayamitra_${doc.doc_type}_${Date.now()}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div id="document-card" className="glass-card overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 border-b border-white/5">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center"
          style={{ background: 'rgba(245,158,11,0.15)' }}>
          <FileText size={18} style={{ color: '#f59e0b' }} />
        </div>
        <div className="flex-1">
          <p className="text-sm font-semibold text-white capitalize">
            {doc.doc_type.replace(/_/g, ' ')}
          </p>
          <p className="text-xs text-slate-500">{doc.word_count} words · AI-generated draft</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleCopy} className="btn-ghost px-3 py-1.5 text-xs flex items-center gap-1.5">
            <Copy size={13} />
            {copied ? 'Copied!' : 'Copy'}
          </button>
          <button onClick={handleDownload} className="btn-gold px-3 py-1.5 text-xs flex items-center gap-1.5">
            <Download size={13} />
            Save
          </button>
        </div>
      </div>

      {/* Toggle body */}
      <button
        className="w-full flex items-center justify-between px-4 py-2 text-xs text-slate-500 hover:text-slate-300 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <span>{expanded ? 'Hide document' : 'Show document'}</span>
        {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
      </button>

      {expanded && (
        <div className="px-4 pb-4">
          <pre className="text-xs text-slate-300 whitespace-pre-wrap leading-relaxed font-mono max-h-[400px] overflow-y-auto rounded-xl p-4"
            style={{ background: 'rgba(255,255,255,0.03)' }}>
            {doc.doc_text}
          </pre>
        </div>
      )}

      {/* Disclaimer */}
      <div className="px-4 pb-4">
        <p className="text-[10px] text-slate-600 leading-relaxed">{doc.disclaimer}</p>
      </div>
    </div>
  )
}
