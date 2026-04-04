// DLSAConnect — Government light theme
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
    if (!navigator.geolocation) { setGeoError('Geolocation not supported.'); return }
    navigator.geolocation.getCurrentPosition(
      (pos) => setNearest(nearestDLSA(pos.coords.latitude, pos.coords.longitude)),
      (err) => setGeoError(err.message || 'Unable to fetch location'),
      { enableHighAccuracy: true, timeout: 10000 }
    )
  }

  return (
    <div id="dlsa-connect-page" className="page-wrapper content-narrow">
      <div className="mb-5">
        <h1 className="section-title">DLSA Connect</h1>
        <p className="section-subtitle">Free legal aid near you</p>
      </div>

      <div className="alert-success mb-5 justify-between">
        <div>
          <p style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--green-success)' }}>NALSA National Helpline</p>
          <p className="text-caption" style={{ marginTop: 2 }}>Free legal aid for all citizens</p>
        </div>
        <a href="tel:15100" className="btn-secondary flex items-center gap-1.5 text-sm px-4" style={{ minHeight: 40, fontSize: '0.8125rem' }}>
          <Phone size={15} /> 15100
        </a>
      </div>

      <div className="relative mb-5">
        <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
        <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by city, state, district or pincode..." className="input-gov" style={{ paddingLeft: 40 }} />
      </div>

      <button onClick={detectNearest} className="btn-ghost w-full mb-5 flex items-center justify-center gap-2">
        <LocateFixed size={15} /> Detect nearest DLSA from my location
      </button>

      {geoError && <p style={{ fontSize: '0.875rem', color: 'var(--red-danger)', marginBottom: 12 }}>{geoError}</p>}

      {nearest && (
        <div className="gov-card-static p-4 mb-5" style={{ border: '1px solid rgba(255,153,51,0.2)' }}>
          <p style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--saffron-dark)', marginBottom: 4 }}>Nearest DLSA</p>
          <p style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)' }}>{nearest.city}, {nearest.state}</p>
          <p className="text-caption" style={{ marginTop: 4 }}>{nearest.address}</p>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 4 }}>Approx distance: {nearest.distanceKm} km</p>
        </div>
      )}

      <div className="gov-card-static p-4 mb-5">
        <p style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 10 }}>Who gets free legal aid?</p>
        <div className="space-y-1.5">
          {['Women and children', 'SC/ST communities', 'Persons with disability', 'Industrial workmen', 'Victims of trafficking', 'Persons in custody', 'Annual income < ₹3 lakh'].map((e, i) => (
            <div key={i} className="flex items-center gap-2.5" style={{ fontSize: '0.875rem', color: 'var(--text-primary)' }}>
              <span style={{ color: 'var(--green-success)' }}>✓</span> {e}
            </div>
          ))}
        </div>
      </div>

      <p className="text-caption mb-3">Showing {filtered.length} of {all.length} offices</p>
      <div className="space-y-3">
        {filtered.map((d, i) => (
          <div key={i} id={`dlsa-card-${i}`} className="gov-card-static p-4 slide-up" style={{ animationDelay: `${i * 0.04}s` }}>
            <div className="flex items-start justify-between mb-3">
              <div>
                <p style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-primary)' }}>{d.city} DLSA</p>
                <p className="text-caption">{d.state}</p>
              </div>
              <a href={`tel:${d.phone}`} className="flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-xl" style={{ background: 'var(--green-light)', color: 'var(--green-success)', border: '1px solid rgba(46,125,50,0.2)', textDecoration: 'none' }}>
                <Phone size={12} /> Call
              </a>
            </div>
            <div className="space-y-2" style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
              <div className="flex items-center gap-2.5"><Phone size={13} className="shrink-0" style={{ color: 'var(--text-muted)' }} /><span>{d.phone}</span></div>
              <div className="flex items-start gap-2.5"><MapPin size={13} className="shrink-0 mt-0.5" style={{ color: 'var(--text-muted)' }} /><span>{d.address}</span></div>
              <div className="flex items-center gap-2.5"><MapPin size={13} className="shrink-0" style={{ color: 'var(--text-muted)' }} /><span>{d.pincode}</span></div>
              <div className="flex items-center gap-2.5"><Clock size={13} className="shrink-0" style={{ color: 'var(--text-muted)' }} /><span>{d.timing}</span></div>
            </div>
          </div>
        ))}
        {filtered.length === 0 && <div className="text-center py-10" style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>No results for "{search}"</div>}
      </div>
    </div>
  )
}
