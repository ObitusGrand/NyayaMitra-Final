// PoliceStationMode — Know your rights at arrest + FIR builder
import { useState } from 'react'
import { Shield, AlertTriangle, FileText, Loader2 } from 'lucide-react'
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
  const [firForm, setFirForm] = useState({
    name: '', address: '', phone: '', date: '', location: '', accused: '', incident: '',
  })

  const handleIdentify = async () => {
    if (!incident.trim()) return
    setLoading(true)
    try {
      const res = await identifyBNSSections(incident, language)
      setSections(res.sections ?? [])
    } catch {
      setSections([
        { section: '302 BNS', title: 'Murder — if death occurred', cognisable: true },
        { section: '115 BNS', title: 'Voluntarily causing hurt', cognisable: true },
        { section: '173 BNSS', title: 'Register FIR at any police station', cognisable: true },
      ])
    } finally { setLoading(false) }
  }

  const handleFIR = async () => {
    setLoading(true)
    try {
      const res = await generateFIR({
        complainant_name: firForm.name,
        complainant_address: firForm.address,
        complainant_phone: firForm.phone,
        incident_description: firForm.incident,
        incident_date: firForm.date,
        incident_location: firForm.location,
        accused_details: firForm.accused,
        bns_sections: sections.map(s => s.section),
        lang: language,
      })
      setFirResult(res.fir_text)
    } catch { setFirResult('Error generating FIR. Please try again or set GROQ_API_KEY.') }
    finally { setLoading(false) }
  }

  return (
    <div id="police-station-page" className="page-wrapper">
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{background:'rgba(248,113,113,0.15)'}}>
            <Shield size={20} style={{color:'#f87171'}} />
          </div>
          <div>
            <h1 className="section-title">Police Station Mode</h1>
            <p className="section-subtitle">Know your rights · File FIR</p>
          </div>
        </div>
      </div>

      {/* Emergency banner */}
      <div className="glass-card p-3 mb-5 border border-red-400/30 flex items-center justify-between"
        style={{background:'rgba(248,113,113,0.05)'}}>
        <div className="flex items-center gap-2">
          <AlertTriangle size={14} className="text-red-400" />
          <span className="text-xs text-red-400 font-medium">Emergency: NALSA Free Legal Aid</span>
        </div>
        <button onClick={() => window.open('tel:15100')}
          className="text-xs font-bold text-white bg-red-500 px-3 py-1 rounded-lg">
          📞 15100
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-xl mb-5" style={{background:'rgba(255,255,255,0.05)'}}>
        {(['rights','fir'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className="flex-1 py-2 rounded-lg text-sm font-medium transition-all"
            style={{background:tab===t?'rgba(248,113,113,0.15)':'transparent', color:tab===t?'#f87171':'#64748b'}}>
            {t === 'rights' ? '🛡 Your Rights' : '📋 File FIR'}
          </button>
        ))}
      </div>

      {tab === 'rights' && (
        <div className="space-y-3">
          {RIGHTS.map((right, i) => (
            <div key={i} className="glass-card p-3 flex items-start gap-3 slide-up" style={{animationDelay:`${i*0.05}s`}}>
              <div className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 text-xs font-bold"
                style={{background:'rgba(248,113,113,0.15)',color:'#f87171'}}>{i+1}</div>
              <p className="text-sm text-slate-300">{right}</p>
            </div>
          ))}
          <div className="glass-card p-4 border border-amber-400/20 mt-4">
            <p className="text-xs font-semibold text-amber-400 mb-2">Identify Applicable BNS Sections</p>
            <textarea value={incident} onChange={e => setIncident(e.target.value)}
              placeholder="Describe the incident briefly..." rows={3} className="input-dark resize-none mb-3" />
            <button onClick={handleIdentify} disabled={loading||!incident.trim()} className="btn-gold w-full flex items-center justify-center gap-2">
              {loading ? <Loader2 size={16} className="animate-spin" /> : <Shield size={16} />}
              Identify BNS Sections
            </button>
            {sections.length > 0 && (
              <div className="mt-3 space-y-2">
                {sections.map((s, i) => (
                  <div key={i} className="flex items-center justify-between text-xs px-3 py-2 rounded-lg"
                    style={{background:'rgba(248,113,113,0.08)'}}>
                    <span className="font-bold text-red-400">{s.section}</span>
                    <span className="text-slate-400 flex-1 ml-3">{s.title}</span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${s.cognisable ? 'text-red-400 bg-red-400/10' : 'text-slate-400 bg-white/5'}`}>
                      {s.cognisable ? 'Cognisable' : 'Non-cog.'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {tab === 'fir' && (
        <div className="space-y-4">
          {[
            {key:'name', label:'Complainant Name', ph:'Your full name'},
            {key:'address', label:'Address', ph:'Your full address'},
            {key:'phone', label:'Phone Number', ph:'+91 XXXXX XXXXX'},
            {key:'date', label:'Incident Date', ph:'DD/MM/YYYY'},
            {key:'location', label:'Incident Location', ph:'Street, City'},
            {key:'accused', label:'Accused Details (optional)', ph:'Name if known'},
          ].map(({key, label, ph}) => (
            <div key={key}>
              <label className="text-xs text-slate-500 mb-2 block font-medium">{label}</label>
              <input type="text" value={firForm[key as keyof typeof firForm]}
                onChange={e => setFirForm(f => ({...f, [key]: e.target.value}))}
                placeholder={ph} className="input-dark" />
            </div>
          ))}
          <div>
            <label className="text-xs text-slate-500 mb-2 block font-medium">Incident Description</label>
            <textarea value={firForm.incident} onChange={e => setFirForm(f => ({...f, incident: e.target.value}))}
              placeholder="Describe what happened in detail..." rows={4} className="input-dark resize-none" />
          </div>
          <button id="generate-fir-btn" onClick={handleFIR}
            disabled={loading||!firForm.name||!firForm.incident}
            className="btn-gold w-full flex items-center justify-center gap-2">
            {loading ? <Loader2 size={16} className="animate-spin" /> : <FileText size={16} />}
            {loading ? 'Generating FIR...' : 'Generate FIR Draft'}
          </button>
          {firResult && (
            <div className="glass-card p-4">
              <p className="text-xs text-slate-500 mb-2 font-medium">FIR Draft — Verify before submission</p>
              <pre className="text-xs text-slate-300 whitespace-pre-wrap leading-relaxed max-h-80 overflow-y-auto">{firResult}</pre>
              <button onClick={() => navigator.clipboard.writeText(firResult)}
                className="btn-ghost text-xs mt-3 w-full">Copy FIR Text</button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
