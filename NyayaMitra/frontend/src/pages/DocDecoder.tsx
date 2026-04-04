// DocDecoder — Upload PDF → clause analysis + document generator
import { useState, useCallback } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Upload, FileText, Loader2, AlertTriangle, CheckCircle, Wand2 } from 'lucide-react'
import ClauseCard from '@/components/ClauseCard'
import DocumentCard from '@/components/DocumentCard'
import { useAppStore } from '@/store/useAppStore'
import {
  decodeDocument,
  generateDocument,
  getDocumentTypes,
  type DecodeResponse,
  type GenerateResponse,
} from '@/services/api'

const FALLBACK_DOC_TYPES = [
  { value: 'legal_notice', label: 'Legal Notice' },
  { value: 'salary_notice', label: 'Salary Notice' },
  { value: 'rti', label: 'RTI Application' },
  { value: 'eviction_reply', label: 'Eviction Reply' },
  { value: 'consumer_complaint', label: 'Consumer Complaint' },
]

export default function DocDecoder() {
  const { language, setDecodedClauses } = useAppStore()
  const [decodeResult, setDecodeResult] = useState<DecodeResponse | null>(null)
  const [generated, setGenerated] = useState<GenerateResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [genLoading, setGenLoading] = useState(false)
  const [error, setError] = useState('')
  const [dragging, setDragging] = useState(false)
  const [tab, setTab] = useState<'decode' | 'generate'>('decode')

  // Generate form state
  const [docType, setDocType] = useState('legal_notice')
  const [facts, setFacts] = useState({ name: '', address: '', issue: '', demand: '' })

  const { data: docTypesData } = useQuery({
    queryKey: ['doc-types'],
    queryFn: getDocumentTypes,
    retry: 1,
  })

  const docTypes = docTypesData?.types?.length
    ? docTypesData.types.map((t) => ({ value: t.value, label: `${t.label} (${t.category})` }))
    : FALLBACK_DOC_TYPES

  const handleFile = async (file: File) => {
    setLoading(true)
    setError('')
    setDecodeResult(null)
    try {
      const res = await decodeDocument(file)
      setDecodeResult(res)
      setDecodedClauses(res.clauses)
    } catch (e: unknown) {
      const err = e as { response?: { data?: { detail?: string } } }
      setError(err?.response?.data?.detail || 'Failed to decode document')
    } finally {
      setLoading(false)
    }
  }

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }, [])

  const handleGenerate = async () => {
    setGenLoading(true)
    setError('')
    try {
      const res = await generateDocument(docType, facts, language)
      setGenerated(res)
    } catch (e: unknown) {
      const err = e as { response?: { data?: { detail?: string } } }
      setError(err?.response?.data?.detail || 'Generation failed')
    } finally {
      setGenLoading(false)
    }
  }

  const riskColor = { safe: '#34d399', caution: '#fbbf24', illegal: '#f87171' }

  return (
    <div id="doc-decoder-page" className="page-wrapper">
      <div className="mb-6">
        <h1 className="section-title">Document Tools</h1>
        <p className="section-subtitle">Decode legal documents or generate new ones</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-xl mb-6"
        style={{ background: 'rgba(255,255,255,0.05)' }}>
        {(['decode', 'generate'] as const).map((t) => (
          <button
            key={t}
            id={`doc-tab-${t}`}
            onClick={() => setTab(t)}
            className="flex-1 py-2 rounded-lg text-sm font-medium transition-all"
            style={{
              background: tab === t ? 'rgba(245,158,11,0.15)' : 'transparent',
              color: tab === t ? '#f59e0b' : '#64748b',
            }}
          >
            {t === 'decode' ? '🔍 Decode' : '✍️ Generate'}
          </button>
        ))}
      </div>

      {error && (
        <div className="glass-card border border-red-400/30 p-3 mb-4 text-sm text-red-400 flex items-center gap-2">
          <AlertTriangle size={14} />
          {error}
        </div>
      )}

      {/* Decode tab */}
      {tab === 'decode' && (
        <div className="space-y-4">
          {/* Drop zone */}
          <label
            id="doc-upload-zone"
            htmlFor="doc-file-input"
            onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            className="glass-card flex flex-col items-center justify-center gap-3 p-10 cursor-pointer border-2 border-dashed transition-all"
            style={{
              borderColor: dragging ? 'rgba(245,158,11,0.6)' : 'rgba(255,255,255,0.1)',
              background: dragging ? 'rgba(245,158,11,0.05)' : undefined,
            }}
          >
            <input
              id="doc-file-input"
              type="file"
              accept=".pdf,.jpg,.jpeg,.png,.txt"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
            />
            {loading ? (
              <Loader2 size={40} className="text-amber-400 animate-spin" />
            ) : (
              <Upload size={40} className="text-slate-500" />
            )}
            <div className="text-center">
              <p className="text-sm font-medium text-slate-300">
                {loading ? 'Analysing document...' : 'Drop PDF or image here'}
              </p>
              <p className="text-xs text-slate-600 mt-1">PDF · JPG · PNG · TXT</p>
            </div>
          </label>

          {/* Decode results */}
          {decodeResult && (
            <div className="space-y-4 fade-in">
              {/* Summary bar */}
              <div className="glass-card p-4">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm font-semibold text-white capitalize">
                    {decodeResult.document_type.replace(/_/g, ' ')}
                  </p>
                  <span className="text-xs font-bold px-3 py-1 rounded-full"
                    style={{
                      background: `${riskColor[decodeResult.overall_risk as keyof typeof riskColor]}20`,
                      color: riskColor[decodeResult.overall_risk as keyof typeof riskColor],
                    }}>
                    {decodeResult.overall_risk.toUpperCase()}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center">
                  {[
                    { label: 'Illegal', count: decodeResult.illegal_count, color: '#f87171' },
                    { label: 'Caution', count: decodeResult.caution_count, color: '#fbbf24' },
                    { label: 'Safe', count: decodeResult.safe_count, color: '#34d399' },
                  ].map((s) => (
                    <div key={s.label} className="rounded-xl p-2"
                      style={{ background: `${s.color}10`, border: `1px solid ${s.color}20` }}>
                      <p className="text-xl font-black" style={{ color: s.color }}>{s.count}</p>
                      <p className="text-xs text-slate-500">{s.label}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Clauses */}
              <div className="space-y-3">
                <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">
                  {decodeResult.total_clauses} Clauses Analysed
                </p>
                {decodeResult.clauses.map((c, i) => (
                  <ClauseCard key={i} clause={c} index={i} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Generate tab */}
      {tab === 'generate' && (
        <div className="space-y-4">
          <div>
            <label className="text-xs text-slate-500 mb-2 block font-medium">Document Type</label>
            <select
              id="doc-type-select"
              value={docType}
              onChange={(e) => setDocType(e.target.value)}
              className="input-dark"
              style={{ appearance: 'none' }}
            >
              {docTypes.map((d) => (
                <option key={d.value} value={d.value} style={{ background: '#111827' }}>
                  {d.label}
                </option>
              ))}
            </select>
          </div>

          {/* Facts fields */}
          {[
            { key: 'name', label: 'Your Name / Company', placeholder: 'Rahul Sharma' },
            { key: 'address', label: 'Your Address', placeholder: 'Mumbai, Maharashtra' },
            { key: 'issue', label: 'Issue / Facts', placeholder: 'Describe the problem...' },
            { key: 'demand', label: 'Demand / Relief Sought', placeholder: 'Pay ₹50,000 within 15 days' },
          ].map(({ key, label, placeholder }) => (
            <div key={key}>
              <label className="text-xs text-slate-500 mb-2 block font-medium">{label}</label>
              {key === 'issue' ? (
                <textarea
                  id={`doc-facts-${key}`}
                  value={facts[key as keyof typeof facts]}
                  onChange={(e) => setFacts((f) => ({ ...f, [key]: e.target.value }))}
                  placeholder={placeholder}
                  rows={3}
                  className="input-dark resize-none"
                />
              ) : (
                <input
                  id={`doc-facts-${key}`}
                  type="text"
                  value={facts[key as keyof typeof facts]}
                  onChange={(e) => setFacts((f) => ({ ...f, [key]: e.target.value }))}
                  placeholder={placeholder}
                  className="input-dark"
                />
              )}
            </div>
          ))}

          <button
            id="doc-generate-btn"
            onClick={handleGenerate}
            disabled={genLoading || !facts.name || !facts.issue}
            className="btn-gold w-full flex items-center justify-center gap-2"
          >
            {genLoading ? <Loader2 size={18} className="animate-spin" /> : <Wand2 size={18} />}
            {genLoading ? 'Generating...' : 'Generate Document'}
          </button>

          {generated && <DocumentCard doc={generated} />}
        </div>
      )}
    </div>
  )
}
