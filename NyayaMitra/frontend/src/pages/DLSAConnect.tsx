// DLSAConnect — Find free legal aid near you
import { useState } from 'react'
import { MapPin, Phone, Clock, ChevronRight, Search } from 'lucide-react'

const DLSA_DATA = [
  { state: 'Maharashtra', city: 'Mumbai', phone: '022-20827100', address: 'City Civil Court Complex, Dhobi Talao', timing: 'Mon-Fri 10AM-5PM', email: 'dlsa.mumbai@example.gov.in' },
  { state: 'Maharashtra', city: 'Pune', phone: '020-12345678', address: 'District Court Complex, Shivajinagar', timing: 'Mon-Fri 10AM-5PM', email: 'dlsa.pune@example.gov.in' },
  { state: 'Delhi', city: 'New Delhi', phone: '011-23070100', address: 'Patiala House Courts, Tilak Marg', timing: 'Mon-Fri 9:30AM-5:30PM', email: 'dlsa.delhi@example.gov.in' },
  { state: 'Karnataka', city: 'Bengaluru', phone: '080-22243100', address: 'High Court Building, Ambedkar Veedhi', timing: 'Mon-Fri 10AM-5PM', email: 'dlsa.bengaluru@example.gov.in' },
  { state: 'Tamil Nadu', city: 'Chennai', phone: '044-25301234', address: 'High Court Complex, Parry\'s Corner', timing: 'Mon-Fri 10AM-5PM', email: 'dlsa.chennai@example.gov.in' },
  { state: 'West Bengal', city: 'Kolkata', phone: '033-22130000', address: 'High Court, Strand Road', timing: 'Mon-Fri 10AM-5PM', email: 'dlsa.kolkata@example.gov.in' },
  { state: 'Gujarat', city: 'Ahmedabad', phone: '079-25506000', address: 'City Civil and Sessions Court, Navrangpura', timing: 'Mon-Fri 10AM-5PM', email: 'dlsa.ahmedabad@example.gov.in' },
  { state: 'Telangana', city: 'Hyderabad', phone: '040-24601234', address: 'City Civil Court Complex, Nampally', timing: 'Mon-Fri 10AM-5PM', email: 'dlsa.hyderabad@example.gov.in' },
]

export default function DLSAConnect() {
  const [search, setSearch] = useState('')
  const filtered = DLSA_DATA.filter(d =>
    d.city.toLowerCase().includes(search.toLowerCase()) ||
    d.state.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div id="dlsa-connect-page" className="page-wrapper">
      <div className="mb-6">
        <h1 className="section-title">DLSA Connect</h1>
        <p className="section-subtitle">Free legal aid near you</p>
      </div>

      {/* NALSA banner */}
      <div className="glass-card p-4 mb-5 border border-emerald-400/20" style={{background:'rgba(52,211,153,0.05)'}}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-emerald-400">NALSA National Helpline</p>
            <p className="text-xs text-slate-400 mt-0.5">Free legal aid for all citizens</p>
          </div>
          <button onClick={() => window.open('tel:15100')}
            className="btn-emerald flex items-center gap-1.5 text-sm px-4">
            <Phone size={15} /> 15100
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="relative mb-5">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
        <input type="text" value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search by city or state..." className="input-dark pl-9" />
      </div>

      {/* Who is eligible */}
      <div className="glass-card p-4 mb-5">
        <p className="text-xs font-semibold text-slate-300 mb-2">Who gets free legal aid?</p>
        <div className="space-y-1">
          {['Women and children','SC/ST communities','Persons with disability','Industrial workmen','Victims of trafficking','Persons in custody','Annual income < ₹3 lakh'].map((e,i) => (
            <div key={i} className="flex items-center gap-2 text-xs text-slate-400">
              <span className="text-emerald-400">✓</span> {e}
            </div>
          ))}
        </div>
      </div>

      {/* DLSA list */}
      <div className="space-y-3">
        {filtered.map((d, i) => (
          <div key={i} id={`dlsa-card-${i}`} className="glass-card p-4 slide-up" style={{animationDelay:`${i*0.05}s`}}>
            <div className="flex items-start justify-between mb-2">
              <div>
                <p className="text-sm font-semibold text-white">{d.city} DLSA</p>
                <p className="text-xs text-slate-500">{d.state}</p>
              </div>
              <button onClick={() => window.open(`tel:${d.phone}`)}
                className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg"
                style={{background:'rgba(52,211,153,0.1)',color:'#34d399',border:'1px solid rgba(52,211,153,0.2)'}}>
                <Phone size={12} /> Call
              </button>
            </div>
            <div className="space-y-1.5 text-xs text-slate-400">
              <div className="flex items-center gap-2">
                <Phone size={12} className="shrink-0 text-slate-600" />
                <span>{d.phone}</span>
              </div>
              <div className="flex items-start gap-2">
                <MapPin size={12} className="shrink-0 text-slate-600 mt-0.5" />
                <span>{d.address}</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock size={12} className="shrink-0 text-slate-600" />
                <span>{d.timing}</span>
              </div>
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="text-center py-10 text-slate-500 text-sm">No results for "{search}"</div>
        )}
      </div>
    </div>
  )
}
