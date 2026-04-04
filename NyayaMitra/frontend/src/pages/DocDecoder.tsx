// DocDecoder — Upload PDF/Image → clause analysis + evidence scanner + document generator
import { useState, useCallback } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Upload, Loader2, AlertTriangle, CheckCircle, Wand2, Camera, ShieldAlert, Eye } from 'lucide-react'
import ClauseCard from '@/components/ClauseCard'
import DocumentCard from '@/components/DocumentCard'
import { useAppStore } from '@/store/useAppStore'
import {
  decodeDocument,
  generateDocument,
  getDocumentTypes,
  scanEvidence,
  detectHiddenTraps,
  type DecodeResponse,
  type GenerateResponse,
  type TrapItem,
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
  const [scanLoading, setScanLoading] = useState(false)
  const [trapLoading, setTrapLoading] = useState(false)
  const [error, setError] = useState('')
  const [dragging, setDragging] = useState(false)
  const [tab, setTab] = useState<'decode' | 'generate' | 'evidence'>('decode')
  const [traps, setTraps] = useState<TrapItem[]>([])
  const [trapScore, setTrapScore] = useState<number | null>(null)

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
    setTraps([])
    setTrapScore(null)
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

  // Evidence scanner
  const handleEvidenceScan = async (file: File) => {
    setScanLoading(true)
    setError('')
    try {
      const res = await scanEvidence(file)
      // Auto-fill form fields from extracted data
      const af = res.auto_fill_fields
      setFacts({
        name: af.name || facts.name,
        address: af.address || facts.address,
        issue: af.issue || facts.issue,
        demand: af.demand || facts.demand,
      })
      if (res.suggested_doc_type) setDocType(res.suggested_doc_type)
      setTab('generate')
    } catch (e: unknown) {
      const err = e as { response?: { data?: { detail?: string } } }
      setError(err?.response?.data?.detail || 'Evidence scan failed')
    } finally {
      setScanLoading(false)
    }
  }

  // Hidden trap detector
  const runTrapDetection = async () => {
    if (!decodeResult) return
    setTrapLoading(true)
    try {
      const res = await detectHiddenTraps(decodeResult.clauses, decodeResult.document_type)
      setTraps(res.traps)
      setTrapScore(res.safety_score)
    } catch {
      // Non-fatal
    } finally {
      setTrapLoading(false)
    }
  }

  const riskColor = { safe: '#34d399', caution: '#fbbf24', illegal: '#f87171' }
  const trapTypeLabels: Record<string, string> = {
    forced_arbitration: 'Forced Arbitration',
    liability_waiver: 'Liability Waiver',
    automatic_renewal: 'Auto-Renewal Lock',
    unilateral_variation: 'Unilateral Changes',
    rights_waiver: 'Rights Waiver',
  }

  return (
    <div id="doc-decoder-page" className="page-wrapper">
      <div className="mb-6">
        <h1 className="section-title">Document Tools</h1>
        <p className="section-subtitle">Decode, scan evidence, or generate legal documents</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-xl mb-6"
        style={{ background: 'rgba(255,255,255,0.05)' }}>
        {([
          { key: 'decode' as const, label: 'Decode', icon: '🔍' },
          { key: 'evidence' as const, label: 'Scan', icon: '📸' },
          { key: 'generate' as const, label: 'Generate', icon: '✍️' },
        ]).map((t) => (
          <button
            key={t.key}
            id={`doc-tab-${t.key}`}
            onClick={() => setTab(t.key)}
            className="flex-1 py-2 rounded-lg text-sm font-medium transition-all"
            style={{
              background: tab === t.key ? 'rgba(245,158,11,0.15)' : 'transparent',
              color: tab === t.key ? '#f59e0b' : '#64748b',
            }}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {error && (
        <div className="glass-card border border-red-400/30 p-3 mb-4 text-sm text-red-400 flex items-center gap-2">
          <AlertTriangle size={14} />
          {error}
        </div>
      )}

      {/* ═══ DECODE TAB ═══ */}
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

              {/* Hidden trap detector button */}
              <button
                onClick={runTrapDetection}
                disabled={trapLoading}
                className="w-full glass-card p-3 flex items-center justify-center gap-2 text-sm font-semibold transition-all"
                style={{
                  color: traps.length > 0 ? '#f87171' : '#f59e0b',
                  border: traps.length > 0 ? '1px solid rgba(248,113,113,0.3)' : '1px solid rgba(245,158,11,0.2)',
                }}
              >
                {trapLoading ? <Loader2 size={15} className="animate-spin" /> : <ShieldAlert size={15} />}
                {trapLoading ? 'Scanning for hidden traps...' : traps.length > 0 ? `${traps.length} Hidden Trap(s) Found` : 'Scan for Hidden Traps'}
              </button>

              {/* Trap results */}
              {traps.length > 0 && (
                <div className="space-y-2 fade-in">
                  {trapScore !== null && (
                    <div className="glass-card p-3 flex items-center justify-between" style={{ border: '1px solid rgba(248,113,113,0.2)' }}>
                      <span className="text-xs text-slate-400">Contract Safety Score</span>
                      <span className="text-lg font-black" style={{ color: trapScore >= 70 ? '#34d399' : trapScore >= 40 ? '#fbbf24' : '#f87171' }}>
                        {trapScore}/100
                      </span>
                    </div>
                  )}
                  {traps.map((trap, i) => (
                    <div key={i} className="glass-card p-4" style={{ border: `1px solid ${trap.severity === 'critical' ? 'rgba(248,113,113,0.3)' : 'rgba(251,191,36,0.3)'}` }}>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-xs font-bold px-2 py-0.5 rounded-full"
                          style={{ background: trap.severity === 'critical' ? 'rgba(248,113,113,0.15)' : 'rgba(251,191,36,0.15)', color: trap.severity === 'critical' ? '#f87171' : '#fbbf24' }}>
                          {trap.severity.toUpperCase()}
                        </span>
                        <span className="text-xs font-semibold text-white">{trapTypeLabels[trap.trap_type] || trap.trap_type}</span>
                      </div>
                      <p className="text-xs text-slate-300 mb-2">{trap.explanation}</p>
                      <div className="flex items-start gap-1 text-[10px] text-slate-500">
                        <Eye size={10} className="mt-0.5 shrink-0" />
                        <span><strong className="text-slate-400">Right affected:</strong> {trap.affected_right} · <strong className="text-slate-400">Law:</strong> {trap.law_reference}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

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

      {/* ═══ EVIDENCE SCANNER TAB ═══ */}
      {tab === 'evidence' && (
        <div className="space-y-4">
          <div className="glass-card p-6 text-center">
            <Camera size={48} className="text-amber-400 mx-auto mb-4" />
            <h2 className="text-lg font-bold text-white mb-2">Scan Evidence</h2>
            <p className="text-xs text-slate-400 mb-4">
              Photograph your salary slip, termination letter, rent receipt, or any legal document.
              AI will extract all details and auto-fill a legal notice for you.
            </p>
            <label htmlFor="evidence-file" className="btn-gold px-6 py-3 inline-flex items-center gap-2 cursor-pointer">
              {scanLoading ? <Loader2 size={16} className="animate-spin" /> : <Camera size={16} />}
              {scanLoading ? 'Scanning...' : 'Upload Photo'}
            </label>
            <input
              id="evidence-file"
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && handleEvidenceScan(e.target.files[0])}
            />
          </div>

          <div className="glass-card p-4">
            <p className="text-xs text-slate-500 mb-2 font-medium">How it works</p>
            <div className="space-y-2">
              {[
                { step: '1', text: 'Take a photo of any salary slip, notice, or receipt' },
                { step: '2', text: 'AI reads the document and extracts names, dates, amounts' },
                { step: '3', text: 'Form auto-fills → generate a legal notice in seconds' },
              ].map((s) => (
                <div key={s.step} className="flex items-center gap-3">
                  <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-amber-400"
                    style={{ background: 'rgba(245,158,11,0.15)' }}>{s.step}</span>
                  <span className="text-sm text-slate-300">{s.text}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ═══ GENERATE TAB ═══ */}
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
              <label className="text-xs text-slate-500 mb-2 block font-medium">
                {label}
                {facts[key as keyof typeof facts] && (
                  <CheckCircle size={10} className="inline ml-1.5 text-emerald-400" />
                )}
              </label>
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
