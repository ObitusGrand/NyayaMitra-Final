// DocumentCard — Government light theme
import { useState } from 'react'
import { FileText, Copy, Download, ChevronDown, ChevronUp, Share2 } from 'lucide-react'
import type { GenerateResponse } from '@/services/api'
import { generatePDF, shareToWhatsApp } from '@/utils/generatePDF'

interface DocumentCardProps { doc: GenerateResponse }

export default function DocumentCard({ doc }: DocumentCardProps) {
  const [expanded, setExpanded] = useState(true)
  const [copied, setCopied] = useState(false)
  const handleCopy = async () => { await navigator.clipboard.writeText(doc.doc_text); setCopied(true); setTimeout(() => setCopied(false), 2000) }
  const handlePDF = () => { generatePDF(doc.doc_text, `nyayamitra_${doc.doc_type}_${Date.now()}.pdf`, { title: doc.doc_type.replace(/_/g, ' ').toUpperCase(), docType: doc.doc_type, actsCited: doc.acts_cited, disclaimer: doc.disclaimer }) }
  const handleWhatsApp = () => { shareToWhatsApp(doc.doc_text, doc.doc_type) }

  return (
    <div id="document-card" className="gov-card-static overflow-hidden fade-in">
      <div className="flex items-center gap-3 p-4" style={{ borderBottom: '1px solid var(--border)' }}>
        <div style={{ width: 40, height: 40, borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--saffron-light)' }}>
          <FileText size={18} style={{ color: 'var(--saffron)' }} />
        </div>
        <div className="flex-1">
          <p style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--text-primary)', textTransform: 'capitalize' }}>{doc.doc_type.replace(/_/g, ' ')}</p>
          <p className="text-caption">{doc.word_count} words · AI-generated draft</p>
        </div>
      </div>

      <div className="flex items-center gap-2 px-4 py-3" style={{ borderBottom: '1px solid var(--border)' }}>
        <button onClick={handleCopy} className="btn-ghost px-3 py-2 text-xs flex items-center gap-1.5 flex-1 justify-center" style={{ minHeight: 36 }}><Copy size={13} />{copied ? 'Copied!' : 'Copy'}</button>
        <button onClick={handlePDF} className="btn-primary px-3 py-2 text-xs flex items-center gap-1.5 flex-1 justify-center" style={{ minHeight: 36 }}><Download size={13} />PDF</button>
        <button onClick={handleWhatsApp} className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl flex-1 justify-center transition-all" style={{ minHeight: 36, background: 'rgba(37,211,102,0.08)', color: '#25d366', border: '1px solid rgba(37,211,102,0.2)' }}><Share2 size={13} />WhatsApp</button>
      </div>

      {doc.acts_cited?.length > 0 && (
        <div className="px-4 py-2.5" style={{ borderBottom: '1px solid var(--border)', background: 'var(--saffron-light)' }}>
          <p style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 4 }}>ACTS CITED</p>
          <p style={{ fontSize: '0.875rem', color: 'var(--saffron-dark)' }}>{doc.acts_cited.join(' · ')}</p>
        </div>
      )}

      <button className="w-full flex items-center justify-between px-4 py-2.5" style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', background: 'none', border: 'none', cursor: 'pointer' }} onClick={() => setExpanded(!expanded)}>
        <span>{expanded ? 'Hide document' : 'Show document'}</span>
        {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
      </button>

      {expanded && (
        <div className="px-4 pb-4">
          <pre style={{ fontSize: '0.875rem', whiteSpace: 'pre-wrap', lineHeight: 1.6, fontFamily: 'monospace', maxHeight: 400, overflowY: 'auto', borderRadius: 'var(--radius-md)', padding: 16, background: 'var(--bg-page)', color: 'var(--text-primary)' }}>{doc.doc_text}</pre>
        </div>
      )}
      <div className="px-4 pb-4"><p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>{doc.disclaimer}</p></div>
    </div>
  )
}
