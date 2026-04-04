// DocumentCard — generated document preview with PDF + WhatsApp share
import { useState } from 'react'
import { FileText, Copy, Download, ChevronDown, ChevronUp, Share2 } from 'lucide-react'
import type { GenerateResponse } from '@/services/api'
import { generatePDF, shareToWhatsApp } from '@/utils/generatePDF'

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

  const handlePDF = () => {
    generatePDF(doc.doc_text, `nyayamitra_${doc.doc_type}_${Date.now()}.pdf`, {
      title: doc.doc_type.replace(/_/g, ' ').toUpperCase(),
      docType: doc.doc_type,
      actsCited: doc.acts_cited,
      disclaimer: doc.disclaimer,
    })
  }

  const handleWhatsApp = () => {
    shareToWhatsApp(doc.doc_text, doc.doc_type)
  }

  return (
    <div id="document-card" className="glass-card overflow-hidden fade-in">
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
      </div>

      {/* Action buttons */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-white/5">
        <button onClick={handleCopy} className="btn-ghost px-3 py-1.5 text-xs flex items-center gap-1.5 flex-1 justify-center">
          <Copy size={13} />
          {copied ? 'Copied!' : 'Copy'}
        </button>
        <button onClick={handlePDF} className="btn-gold px-3 py-1.5 text-xs flex items-center gap-1.5 flex-1 justify-center">
          <Download size={13} />
          PDF
        </button>
        <button
          onClick={handleWhatsApp}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg flex-1 justify-center transition-all"
          style={{ background: 'rgba(37,211,102,0.15)', color: '#25d366', border: '1px solid rgba(37,211,102,0.3)' }}
        >
          <Share2 size={13} />
          WhatsApp
        </button>
      </div>

      {/* Acts cited */}
      {doc.acts_cited?.length > 0 && (
        <div className="px-4 py-2 border-b border-white/5" style={{ background: 'rgba(245,158,11,0.03)' }}>
          <p className="text-[10px] text-slate-500 mb-1 font-medium">ACTS CITED</p>
          <p className="text-xs text-amber-400">{doc.acts_cited.join(' · ')}</p>
        </div>
      )}

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
