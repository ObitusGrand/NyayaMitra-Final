// PoliceStationMode — Government light theme
import { useState } from 'react'
import { Shield, AlertTriangle, FileText, Loader2, Phone } from 'lucide-react'
import { useAppStore } from '@/store/useAppStore'
import { identifyBNSSections, generateFIR } from '@/services/api'

const RIGHTS = [
  'Right to know grounds of arrest (BNSS Section 40)',
  'Right to inform someone about arrest (BNSS Section 40)',
  'Right to be presented before Magistrate within 24 hours (BNSS Section 44)',
  'Right to free legal aid (Legal Services Authorities Act)',
  'Right to medical examination on arrest (BNSS Section 53)',
  'Women can only be arrested by female police officer',
  'Police cannot detain without producing before Magistrate',
]

export default function PoliceStationMode() {
  const { language } = useAppStore()
  const [tab, setTab] = useState<'rights' | 'fir'>('rights')
  const [incident, setIncident] = useState('')
  const [sections, setSections] = useState<{section:string;title:string;cognisable:boolean}[]>([])
  const [firResult, setFirResult] = useState('')
  const [loading, setLoading] = useState(false)
  const [firForm, setFirForm] = useState({ name: '', address: '', phone: '', date: '', location: '', accused: '', incident: '' })

  const handleIdentify = async () => {
    if (!incident.trim()) return; setLoading(true)
    try { const res = await identifyBNSSections(incident, language); setSections(res.sections ?? []) }
    catch { setSections([{ section: '302 BNS', title: 'Murder — if death occurred', cognisable: true }, { section: '115 BNS', title: 'Voluntarily causing hurt', cognisable: true }, { section: '173 BNSS', title: 'Register FIR at any police station', cognisable: true }]) }
    finally { setLoading(false) }
  }

  const handleFIR = async () => {
    setLoading(true)
    try { const res = await generateFIR({ complainant_name: firForm.name, complainant_address: firForm.address, complainant_phone: firForm.phone, incident_description: firForm.incident, incident_date: firForm.date, incident_location: firForm.location, accused_details: firForm.accused, bns_sections: sections.map(s => s.section), lang: language }); setFirResult(res.fir_text) }
    catch { setFirResult('Error generating FIR. Please try again or set GROQ_API_KEY.') }
    finally { setLoading(false) }
  }

  return (
    <div id="police-station-page" className="page-wrapper">
      <div className="flex items-center gap-3 mb-5">
        <div style={{ width: 48, height: 48, borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--red-light)' }}>
          <Shield size={22} style={{ color: 'var(--red-danger)' }} />
        </div>
        <div>
          <h1 className="section-title">Police Station Mode</h1>
          <p className="section-subtitle">Know your rights · File FIR</p>
        </div>
      </div>

      <div className="alert-danger mb-5 justify-between">
        <div className="flex items-center gap-2.5">
          <AlertTriangle size={16} style={{ color: 'var(--red-danger)' }} />
          <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--red-danger)' }}>Emergency: NALSA Free Legal Aid</span>
        </div>
        <a href="tel:15100" className="btn-danger flex items-center gap-1.5 text-xs px-3" style={{ minHeight: 36, fontSize: '0.75rem' }}>
          <Phone size={12} /> 15100
        </a>
      </div>

      <div className="tab-bar mb-5">
        {(['rights', 'fir'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)} className={`tab-item ${tab === t ? 'active' : ''}`}>
            {t === 'rights' ? '🛡 Your Rights' : '📋 File FIR'}
          </button>
        ))}
      </div>

      {tab === 'rights' && (
        <div className="space-y-3">
          {RIGHTS.map((right, i) => (
            <div key={i} className="gov-card-static p-4 flex items-start gap-3 slide-up" style={{ animationDelay: `${i * 0.04}s` }}>
              <div style={{ width: 28, height: 28, borderRadius: 'var(--radius-sm)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 700, background: 'var(--red-light)', color: 'var(--red-danger)', flexShrink: 0 }}>{i + 1}</div>
              <p style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-primary)' }}>{right}</p>
            </div>
          ))}

          <div className="gov-card-static p-5 mt-4" style={{ border: '1px solid rgba(255,153,51,0.2)' }}>
            <p style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--saffron-dark)', marginBottom: 12 }}>Identify Applicable BNS Sections</p>
            <textarea value={incident} onChange={e => setIncident(e.target.value)} placeholder="Describe the incident briefly..." rows={3} className="input-gov resize-none mb-3" />
            <button onClick={handleIdentify} disabled={loading || !incident.trim()} className="btn-primary w-full flex items-center justify-center gap-2">
              {loading ? <Loader2 size={16} className="animate-spin" /> : <Shield size={16} />} Identify BNS Sections
            </button>
            {sections.length > 0 && (
              <div className="mt-4 space-y-2">
                {sections.map((s, i) => (
                  <div key={i} className="flex items-center justify-between text-sm px-3 py-2.5 rounded-xl" style={{ background: 'var(--red-light)' }}>
                    <span style={{ fontWeight: 700, color: 'var(--red-danger)' }}>{s.section}</span>
                    <span className="flex-1 ml-3" style={{ color: 'var(--text-secondary)' }}>{s.title}</span>
                    <span style={{ padding: '2px 8px', borderRadius: 'var(--radius-full)', fontSize: '0.75rem', fontWeight: 600, background: s.cognisable ? 'rgba(211,47,47,0.1)' : 'rgba(0,0,0,0.04)', color: s.cognisable ? 'var(--red-danger)' : 'var(--text-muted)' }}>{s.cognisable ? 'Cognisable' : 'Non-cog.'}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {tab === 'fir' && (
        <div className="space-y-4">
          {[{ key: 'name', label: 'Complainant Name', ph: 'Full name' }, { key: 'address', label: 'Address', ph: 'Full address' }, { key: 'phone', label: 'Phone Number', ph: '+91 XXXXX XXXXX' }, { key: 'date', label: 'Incident Date', ph: 'DD/MM/YYYY' }, { key: 'location', label: 'Incident Location', ph: 'Street, City' }, { key: 'accused', label: 'Accused Details (optional)', ph: 'Name if known' }].map(({ key, label, ph }) => (
            <div key={key}>
              <label className="text-label mb-2 block">{label}</label>
              <input type="text" value={firForm[key as keyof typeof firForm]} onChange={e => setFirForm(f => ({ ...f, [key]: e.target.value }))} placeholder={ph} className="input-gov" />
            </div>
          ))}
          <div>
            <label className="text-label mb-2 block">Incident Description</label>
            <textarea value={firForm.incident} onChange={e => setFirForm(f => ({ ...f, incident: e.target.value }))} placeholder="Describe what happened in detail..." rows={4} className="input-gov resize-none" />
          </div>
          <button id="generate-fir-btn" onClick={handleFIR} disabled={loading || !firForm.name || !firForm.incident} className="btn-primary w-full flex items-center justify-center gap-2">
            {loading ? <Loader2 size={16} className="animate-spin" /> : <FileText size={16} />}
            {loading ? 'Generating FIR...' : 'Generate FIR Draft'}
          </button>
          {firResult && (
            <div className="gov-card-static p-5">
              <p className="text-label mb-2">FIR Draft — Verify before submission</p>
              <pre style={{ fontSize: '0.875rem', whiteSpace: 'pre-wrap', lineHeight: 1.6, maxHeight: 320, overflowY: 'auto', color: 'var(--text-primary)' }}>{firResult}</pre>
              <button onClick={() => navigator.clipboard.writeText(firResult)} className="btn-ghost text-sm mt-4 w-full">Copy FIR Text</button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
