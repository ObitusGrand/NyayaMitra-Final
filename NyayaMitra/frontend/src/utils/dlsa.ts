// DLSA location utilities
import dlsaOffices from '@/offline/dlsaOffices.json'

export interface DlsaOffice {
  state: string
  city: string
  district: string
  pincode: string
  phone: string
  address: string
  timing: string
  email: string
  lat: number
  lon: number
}

const offices = dlsaOffices as DlsaOffice[]

const toRad = (deg: number) => (deg * Math.PI) / 180

const distanceKm = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const earth = 6371
  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lon2 - lon1)
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return earth * c
}

export const nearestDLSA = (lat: number, lon: number): (DlsaOffice & { distanceKm: number }) | null => {
  if (!offices.length) return null
  let best: (DlsaOffice & { distanceKm: number }) | null = null
  for (const office of offices) {
    const d = distanceKm(lat, lon, office.lat, office.lon)
    if (!best || d < best.distanceKm) {
      best = { ...office, distanceKm: Number(d.toFixed(1)) }
    }
  }
  return best
}

export const searchDlsaOffices = (query: string): DlsaOffice[] => {
  const q = query.trim().toLowerCase()
  if (!q) return offices
  return offices.filter((d) =>
    d.city.toLowerCase().includes(q) ||
    d.state.toLowerCase().includes(q) ||
    d.district.toLowerCase().includes(q) ||
    d.pincode.includes(q)
  )
}

export const getAllDlsaOffices = (): DlsaOffice[] => offices
