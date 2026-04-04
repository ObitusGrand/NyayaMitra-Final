// Amendments — Government light theme
import { useQuery } from '@tanstack/react-query'
import { Bell, RefreshCcw, Filter } from 'lucide-react'
import AmendmentCard from '@/components/AmendmentCard'
import { getLatestAmendments } from '@/services/api'

const MOCK_AMENDMENTS = [
  { title: 'BNS 2023 replaces IPC — All criminal offences updated', affected_act: 'BNS 2023 (replacing IPC 1860)', date: '01 Jul 2024', gazette_number: 'Vol. 45 of 2023', summary_hindi: 'भारतीय दंड संहिता (IPC) को 1 जुलाई 2024 से भारतीय न्याय संहिता (BNS) 2023 ने बदल दिया है।', summary_english: 'The Indian Penal Code (IPC 1860) was replaced by Bharatiya Nyaya Sanhita (BNS) 2023 from July 1, 2024.', affected_case_types: ['criminal'], source_url: 'https://www.indiacode.nic.in/handle/123456789/16510', old_text: 'IPC Section 302 — Murder: imprisonment for life or death', new_text: 'BNS Section 101 — Murder: death or imprisonment for life, and fine' },
  { title: 'BNSS 2023 — FIR can be filed at any police station', affected_act: 'BNSS 2023 (replacing CrPC 1973)', date: '01 Jul 2024', gazette_number: 'Vol. 46 of 2023', summary_hindi: 'अब कोई भी FIR किसी भी पुलिस स्टेशन में दर्ज की जा सकती है।', summary_english: 'Zero FIR: Any police station must register FIR regardless of jurisdiction.', affected_case_types: ['criminal'], source_url: 'https://www.indiacode.nic.in/handle/123456789/16511', old_text: 'CrPC Section 154 — FIR must be filed in police station with jurisdiction', new_text: 'BNSS Section 173 — Zero FIR accepted at any police station' },
  { title: 'DPDP Act 2023 — Data protection rights for all citizens', affected_act: 'Digital Personal Data Protection Act 2023', date: '11 Aug 2023', gazette_number: 'Vol. 22 of 2023', summary_hindi: 'अब नागरिकों को अपने व्यक्तिगत डेटा के बारे में जानने, सुधारने और मिटाने का अधिकार है।', summary_english: 'Citizens now have right to know, correct, and erase personal data held by companies.', affected_case_types: ['cyber'], source_url: 'https://www.indiacode.nic.in/handle/123456789/17693', old_text: 'No comprehensive data protection law', new_text: 'DPDP Act 2023 — consent required, breach penalties up to ₹250 Cr' },
]

export default function Amendments() {
  const { data, isLoading, refetch } = useQuery({ queryKey: ['amendments'], queryFn: () => getLatestAmendments(10), retry: 1 })
  const amendments = data?.amendments ?? MOCK_AMENDMENTS

  return (
    <div id="amendments-page" className="page-wrapper">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="section-title">Amendments</h1>
          <p className="section-subtitle">Latest Indian law changes</p>
        </div>
        <button id="refresh-amendments-btn" onClick={() => refetch()} style={{ width: 40, height: 40, borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-card)', border: '1px solid var(--border)', cursor: 'pointer' }}>
          <RefreshCcw size={16} className={isLoading ? 'animate-spin' : ''} style={{ color: 'var(--text-secondary)' }} />
        </button>
      </div>

      <div className="alert-warning mb-5 flex-col items-start">
        <div className="flex items-center gap-2.5 mb-2">
          <Bell size={16} style={{ color: 'var(--saffron-dark)' }} />
          <span style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--saffron-dark)' }}>Major Change: 1 July 2024</span>
        </div>
        <p className="text-caption" style={{ lineHeight: 1.5 }}>IPC → BNS | CrPC → BNSS | Evidence Act → BSA. All criminal law references must now use the new codes.</p>
      </div>

      <div className="flex items-center gap-2 mb-5 overflow-x-auto pb-1">
        <Filter size={14} style={{ color: 'var(--text-muted)' }} className="shrink-0" />
        {['All', 'Criminal', 'Labour', 'Consumer', 'Cyber'].map(f => (
          <button key={f} className={`btn-pill shrink-0 ${f === 'All' ? 'active' : ''}`}>{f}</button>
        ))}
      </div>

      {isLoading ? (
        <div className="space-y-3">{[1, 2, 3].map(i => <div key={i} className="h-24 shimmer" style={{ borderRadius: 'var(--radius-lg)' }} />)}</div>
      ) : (
        <div className="space-y-3">{amendments.map((a, i) => <AmendmentCard key={i} amendment={a} index={i} />)}</div>
      )}
    </div>
  )
}
