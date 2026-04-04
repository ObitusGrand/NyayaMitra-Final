// DocDecoder — Government light theme
import { useState, useCallback } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Upload, Loader2, AlertTriangle, CheckCircle, Wand2, Camera, ShieldAlert, Eye } from 'lucide-react'
import ClauseCard from '@/components/ClauseCard'
import DocumentCard from '@/components/DocumentCard'
import { useAppStore } from '@/store/useAppStore'
import { decodeDocument, generateDocument, getDocumentTypes, scanEvidence, detectHiddenTraps, type DecodeResponse, type GenerateResponse, type TrapItem } from '@/services/api'

const FALLBACK_DOC_TYPES = [
  { value: 'legal_notice', label: 'Legal Notice' }, { value: 'salary_notice', label: 'Salary Notice' }, { value: 'rti', label: 'RTI Application' }, { value: 'eviction_reply', label: 'Eviction Reply' }, { value: 'consumer_complaint', label: 'Consumer Complaint' },
]

export default function DocDecoder() {
  const { language } = useAppStore()
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
  const [docType, setDocType] = useState('legal_notice')
  const [facts, setFacts] = useState({ name: '', address: '', issue: '', demand: '' })

  const { data: docTypesData } = useQuery({ queryKey: ['doc-types'], queryFn: getDocumentTypes, retry: 1 })
  const docTypes = docTypesData?.types?.length ? docTypesData.types.map(t => ({ value: t.value, label: `${t.label} (${t.category})` })) : FALLBACK_DOC_TYPES

  const handleFile = async (file: File) => {
    setLoading(true); setError(''); setDecodeResult(null); setTraps([]); setTrapScore(null)
    try { const res = await decodeDocument(file); setDecodeResult(res); useAppStore.getState().addDecodedClauses(res.clauses); useAppStore.getState().incrementDocumentsDecoded(); useAppStore.getState().logActivity({ type: 'doc_decoded', title: `Document decoded (${res.clauses?.length || 0} clauses)`, xpEarned: 100 }) }
    catch (e: unknown) { const err = e as { response?: { data?: { detail?: string } } }; setError(err?.response?.data?.detail || 'Failed to decode document') }
    finally { setLoading(false) }
  }

  const handleDrop = useCallback((e: React.DragEvent) => { e.preventDefault(); setDragging(false); const file = e.dataTransfer.files[0]; if (file) handleFile(file) }, [])

  const handleGenerate = async () => {
    setGenLoading(true); setError('')
    try { const res = await generateDocument(docType, facts, language); setGenerated(res) }
    catch (e: unknown) { const err = e as { response?: { data?: { detail?: string } } }; setError(err?.response?.data?.detail || 'Generation failed') }
    finally { setGenLoading(false) }
  }

  const handleEvidenceScan = async (file: File) => {
    setScanLoading(true); setError('')
    try { const res = await scanEvidence(file); const af = res.auto_fill_fields; setFacts({ name: af.name || facts.name, address: af.address || facts.address, issue: af.issue || facts.issue, demand: af.demand || facts.demand }); if (res.suggested_doc_type) setDocType(res.suggested_doc_type); setTab('generate') }
    catch (e: unknown) { const err = e as { response?: { data?: { detail?: string } } }; setError(err?.response?.data?.detail || 'Evidence scan failed') }
    finally { setScanLoading(false) }
  }

  const runTrapDetection = async () => {
    if (!decodeResult) return; setTrapLoading(true)
    try { const res = await detectHiddenTraps(decodeResult.clauses, decodeResult.document_type); setTraps(res.traps); setTrapScore(res.safety_score) }
    catch { /* non-fatal */ }
    finally { setTrapLoading(false) }
  }

  const riskColor = { safe: 'var(--green-success)', caution: 'var(--saffron)', illegal: 'var(--red-danger)' }
  const trapTypeLabels: Record<string, string> = { forced_arbitration: 'Forced Arbitration', liability_waiver: 'Liability Waiver', automatic_renewal: 'Auto-Renewal Lock', unilateral_variation: 'Unilateral Changes', rights_waiver: 'Rights Waiver' }

  return (
    <div id="doc-decoder-page" className="page-wrapper content-narrow">
      <div className="mb-5">
        <h1 className="section-title">Document Tools</h1>
        <p className="section-subtitle">Decode, scan evidence, or generate legal documents</p>
      </div>

      <div className="tab-bar mb-5">
        {([{ key: 'decode' as const, label: 'Decode', icon: '🔍' }, { key: 'evidence' as const, label: 'Scan', icon: '📸' }, { key: 'generate' as const, label: 'Generate', icon: '✍️' }]).map(t => (
          <button key={t.key} id={`doc-tab-${t.key}`} onClick={() => setTab(t.key)} className={`tab-item ${tab === t.key ? 'active' : ''}`}>{t.icon} {t.label}</button>
        ))}
      </div>

      {error && <div className="alert-danger mb-4"><AlertTriangle size={15} style={{ color: 'var(--red-danger)' }} /><p style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--red-danger)' }}>{error}</p></div>}

      {tab === 'decode' && (
        <div className="space-y-4">
          <label id="doc-upload-zone" htmlFor="doc-file-input" onDragOver={e => { e.preventDefault(); setDragging(true) }} onDragLeave={() => setDragging(false)} onDrop={handleDrop}
            className="gov-card-static flex flex-col items-center justify-center gap-3 p-10 cursor-pointer border-2 border-dashed transition-all"
            style={{ borderColor: dragging ? 'var(--saffron)' : 'var(--border)', background: dragging ? 'var(--saffron-light)' : 'var(--bg-card)' }}>
            <input id="doc-file-input" type="file" accept=".pdf,.jpg,.jpeg,.png,.txt" className="hidden" onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])} />
            {loading ? <Loader2 size={40} className="animate-spin" style={{ color: 'var(--saffron)' }} /> : <Upload size={40} style={{ color: 'var(--text-muted)' }} />}
            <div className="text-center">
              <p style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--text-primary)' }}>{loading ? 'Analysing document...' : 'Drop PDF or image here'}</p>
              <p className="text-caption" style={{ marginTop: 4 }}>PDF · JPG · PNG · TXT</p>
            </div>
          </label>

          {decodeResult && (
            <div className="space-y-4 fade-in">
              <div className="gov-card-static p-5">
                <div className="flex items-center justify-between mb-3">
                  <p style={{ fontSize: '0.9375rem', fontWeight: 700, color: 'var(--text-primary)', textTransform: 'capitalize' }}>{decodeResult.document_type.replace(/_/g, ' ')}</p>
                  <span className={`badge-${decodeResult.overall_risk === 'safe' ? 'safe' : decodeResult.overall_risk === 'caution' ? 'caution' : 'illegal'}`}>{decodeResult.overall_risk.toUpperCase()}</span>
                </div>
                <div className="grid grid-cols-3 gap-2.5 text-center">
                  {[{ label: 'Illegal', count: decodeResult.illegal_count, color: 'var(--red-danger)', bg: 'var(--red-light)' }, { label: 'Caution', count: decodeResult.caution_count, color: 'var(--saffron)', bg: 'var(--saffron-light)' }, { label: 'Safe', count: decodeResult.safe_count, color: 'var(--green-success)', bg: 'var(--green-light)' }].map(s => (
                    <div key={s.label} className="rounded-xl p-2.5" style={{ background: s.bg, border: `1px solid ${s.color}20` }}>
                      <p style={{ fontSize: '1.25rem', fontWeight: 800, color: s.color }}>{s.count}</p>
                      <p className="text-caption">{s.label}</p>
                    </div>
                  ))}
                </div>
              </div>

              <button onClick={runTrapDetection} disabled={trapLoading} className="w-full gov-card-static p-4 flex items-center justify-center gap-2.5 font-bold transition-all" style={{ fontSize: '0.875rem', color: traps.length > 0 ? 'var(--red-danger)' : 'var(--saffron-dark)', border: traps.length > 0 ? '1px solid rgba(211,47,47,0.25)' : '1px solid rgba(255,153,51,0.2)', cursor: 'pointer', background: 'var(--bg-card)' }}>
                {trapLoading ? <Loader2 size={15} className="animate-spin" /> : <ShieldAlert size={15} />}
                {trapLoading ? 'Scanning…' : traps.length > 0 ? `${traps.length} Hidden Trap(s) Found` : 'Scan for Hidden Traps'}
              </button>

              {traps.length > 0 && (
                <div className="space-y-2.5 fade-in">
                  {trapScore !== null && (
                    <div className="gov-card-static p-4 flex items-center justify-between" style={{ border: '1px solid rgba(211,47,47,0.2)' }}>
                      <span className="text-caption">Contract Safety Score</span>
                      <span style={{ fontSize: '1.125rem', fontWeight: 800, color: trapScore >= 70 ? 'var(--green-success)' : trapScore >= 40 ? 'var(--saffron)' : 'var(--red-danger)' }}>{trapScore}/100</span>
                    </div>
                  )}
                  {traps.map((trap, i) => (
                    <div key={i} className="gov-card-static p-4" style={{ border: `1px solid ${trap.severity === 'critical' ? 'rgba(211,47,47,0.25)' : 'rgba(255,153,51,0.25)'}` }}>
                      <div className="flex items-center gap-2.5 mb-2">
                        <span className={trap.severity === 'critical' ? 'badge-illegal' : 'badge-caution'}>{trap.severity.toUpperCase()}</span>
                        <span style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-primary)' }}>{trapTypeLabels[trap.trap_type] || trap.trap_type}</span>
                      </div>
                      <p style={{ fontSize: '0.875rem', color: 'var(--text-primary)', marginBottom: 8 }}>{trap.explanation}</p>
                      <div className="flex items-start gap-1.5" style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                        <Eye size={12} className="mt-0.5 shrink-0" />
                        <span><strong style={{ color: 'var(--text-primary)' }}>Right affected:</strong> {trap.affected_right} · <strong style={{ color: 'var(--text-primary)' }}>Law:</strong> {trap.law_reference}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="space-y-3">
                <p className="text-label">{decodeResult.total_clauses} Clauses Analysed</p>
                {decodeResult.clauses.map((c, i) => <ClauseCard key={i} clause={c} index={i} />)}
              </div>
            </div>
          )}
        </div>
      )}

      {tab === 'evidence' && (
        <div className="space-y-4">
          <div className="gov-card-static p-6 text-center">
            <Camera size={48} className="mx-auto mb-4" style={{ color: 'var(--saffron)' }} />
            <h2 style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8 }}>Scan Evidence</h2>
            <p className="text-caption" style={{ marginBottom: 20 }}>Photograph your salary slip, termination letter, rent receipt, or any legal document. AI will extract details and auto-fill a legal notice.</p>
            <label htmlFor="evidence-file" className="btn-primary px-6 py-3 inline-flex items-center gap-2.5 cursor-pointer">
              {scanLoading ? <Loader2 size={16} className="animate-spin" /> : <Camera size={16} />}
              {scanLoading ? 'Scanning...' : 'Upload Photo'}
            </label>
            <input id="evidence-file" type="file" accept="image/*" capture="environment" className="hidden" onChange={e => e.target.files?.[0] && handleEvidenceScan(e.target.files[0])} />
          </div>
          <div className="gov-card-static p-5">
            <p className="text-label mb-3">How it works</p>
            <div className="space-y-2.5">
              {[{ step: '1', text: 'Take a photo of any salary slip, notice, or receipt' }, { step: '2', text: 'AI reads the document and extracts names, dates, amounts' }, { step: '3', text: 'Form auto-fills → generate a legal notice in seconds' }].map(s => (
                <div key={s.step} className="flex items-center gap-3">
                  <span style={{ width: 28, height: 28, borderRadius: 'var(--radius-sm)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 700, background: 'var(--saffron-light)', color: 'var(--saffron-dark)' }}>{s.step}</span>
                  <span style={{ fontSize: '0.875rem', color: 'var(--text-primary)' }}>{s.text}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {tab === 'generate' && (
        <div className="space-y-4">
          <div>
            <label className="text-label mb-2 block">Document Type</label>
            <select id="doc-type-select" value={docType} onChange={e => setDocType(e.target.value)} className="input-gov" style={{ appearance: 'none' }}>
              {docTypes.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
            </select>
          </div>
          {[{ key: 'name', label: 'Your Name / Company', placeholder: 'Rahul Sharma' }, { key: 'address', label: 'Your Address', placeholder: 'Mumbai, Maharashtra' }, { key: 'issue', label: 'Issue / Facts', placeholder: 'Describe the problem...' }, { key: 'demand', label: 'Demand / Relief Sought', placeholder: 'Pay ₹50,000 within 15 days' }].map(({ key, label, placeholder }) => (
            <div key={key}>
              <label className="text-label mb-2 block">{label}{facts[key as keyof typeof facts] && <CheckCircle size={11} className="inline ml-1.5" style={{ color: 'var(--green-success)' }} />}</label>
              {key === 'issue' ? <textarea id={`doc-facts-${key}`} value={facts[key as keyof typeof facts]} onChange={e => setFacts(f => ({ ...f, [key]: e.target.value }))} placeholder={placeholder} rows={3} className="input-gov resize-none" /> : <input id={`doc-facts-${key}`} type="text" value={facts[key as keyof typeof facts]} onChange={e => setFacts(f => ({ ...f, [key]: e.target.value }))} placeholder={placeholder} className="input-gov" />}
            </div>
          ))}
          <button id="doc-generate-btn" onClick={handleGenerate} disabled={genLoading || !facts.name || !facts.issue} className="btn-primary w-full flex items-center justify-center gap-2">
            {genLoading ? <Loader2 size={18} className="animate-spin" /> : <Wand2 size={18} />}
            {genLoading ? 'Generating...' : 'Generate Document'}
          </button>
          {generated && <DocumentCard doc={generated} />}
        </div>
      )}
    </div>
  )
}
