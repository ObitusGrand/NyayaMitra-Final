// DLSAConnect — Find free legal aid near you
import { useMemo, useState } from 'react'
import { MapPin, Phone, Clock, Search, LocateFixed } from 'lucide-react'
import { getAllDlsaOffices, nearestDLSA, searchDlsaOffices, type DlsaOffice } from '@/utils/dlsa'

export default function DLSAConnect() {
  const [search, setSearch] = useState('')
  const [nearest, setNearest] = useState<(DlsaOffice & { distanceKm: number }) | null>(null)
  const [geoError, setGeoError] = useState('')

  const all = useMemo(() => getAllDlsaOffices(), [])
  const filtered = useMemo(() => searchDlsaOffices(search), [search])

  const detectNearest = () => {
    setGeoError('')
    if (!navigator.geolocation) {
      setGeoError('Geolocation is not supported in this browser.')
      return
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const found = nearestDLSA(pos.coords.latitude, pos.coords.longitude)
        setNearest(found)
      },
      (err) => {
        setGeoError(err.message || 'Unable to fetch your location')
      },
      { enableHighAccuracy: true, timeout: 10000 }
    )
  }

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
          placeholder="Search by city, state, district or pincode..." className="input-dark pl-9" />
      </div>

      <button onClick={detectNearest} className="btn-ghost w-full mb-5 flex items-center justify-center gap-2">
        <LocateFixed size={14} /> Detect nearest DLSA from my location
      </button>

      {geoError && <p className="text-xs text-red-400 mb-3">{geoError}</p>}

      {nearest && (
        <div className="glass-card p-4 mb-5 border border-amber-400/20">
          <p className="text-xs text-amber-400 font-semibold mb-1">Nearest DLSA</p>
          <p className="text-sm text-white">{nearest.city}, {nearest.state}</p>
          <p className="text-xs text-slate-400 mt-1">{nearest.address}</p>
          <p className="text-xs text-slate-500 mt-1">Approx distance: {nearest.distanceKm} km</p>
        </div>
      )}

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
      <p className="text-xs text-slate-500 mb-2">Showing {filtered.length} of {all.length} offices</p>
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
                <MapPin size={12} className="shrink-0 text-slate-600" />
                <span>{d.pincode}</span>
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
