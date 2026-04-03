// Amendments — Latest Indian law changes (BNS/BNSS/BSA + others)
import { useQuery } from '@tanstack/react-query'
import { Bell, RefreshCcw, Filter } from 'lucide-react'
import AmendmentCard from '@/components/AmendmentCard'
import { getLatestAmendments } from '@/services/api'

// Mock data for when backend is offline
const MOCK_AMENDMENTS = [
  {
    title: 'BNS 2023 replaces IPC — All criminal offences updated',
    affected_act: 'BNS 2023 (replacing IPC 1860)',
    date: '01 Jul 2024',
    gazette_number: 'Vol. 45 of 2023',
    summary_hindi: 'भारतीय दंड संहिता (IPC) को 1 जुलाई 2024 से भारतीय न्याय संहिता (BNS) 2023 ने बदल दिया है। हत्या अब धारा 101 BNS में है।',
    summary_english: 'The Indian Penal Code (IPC 1860) was replaced by Bharatiya Nyaya Sanhita (BNS) 2023 from July 1, 2024. Murder is now Section 101, Rape is Section 63.',
    affected_case_types: ['criminal'],
    source_url: 'https://www.indiacode.nic.in/handle/123456789/16510',
    old_text: 'IPC Section 302 — Murder: imprisonment for life or death',
    new_text: 'BNS Section 101 — Murder: death or imprisonment for life, and fine',
  },
  {
    title: 'BNSS 2023 — FIR can be filed at any police station',
    affected_act: 'BNSS 2023 (replacing CrPC 1973)',
    date: '01 Jul 2024',
    gazette_number: 'Vol. 46 of 2023',
    summary_hindi: 'अब कोई भी FIR किसी भी पुलिस स्टेशन में दर्ज की जा सकती है चाहे अपराध कहीं भी हुआ हो। यह BNSS धारा 173 के तहत है।',
    summary_english: 'Zero FIR: Any police station must register FIR regardless of jurisdiction. Police cannot refuse to register FIR. BNSS Section 173.',
    affected_case_types: ['criminal'],
    source_url: 'https://www.indiacode.nic.in/handle/123456789/16511',
    old_text: 'CrPC Section 154 — FIR must be filed in police station with jurisdiction',
    new_text: 'BNSS Section 173 — Zero FIR accepted at any police station',
  },
  {
    title: 'DPDP Act 2023 — Data protection rights for all citizens',
    affected_act: 'Digital Personal Data Protection Act 2023',
    date: '11 Aug 2023',
    gazette_number: 'Vol. 22 of 2023',
    summary_hindi: 'अब नागरिकों को अपने व्यक्तिगत डेटा के बारे में जानने, सुधारने और मिटाने का अधिकार है। डेटा उल्लंघन पर ₹250 करोड़ तक का जुर्माना।',
    summary_english: 'Citizens now have right to know, correct, and erase personal data held by companies. Data breaches attract penalties up to ₹250 crore.',
    affected_case_types: ['cyber'],
    source_url: 'https://www.indiacode.nic.in/handle/123456789/17693',
    old_text: 'No comprehensive data protection law',
    new_text: 'DPDP Act 2023 — consent required, breach penalties up to ₹250 Cr',
  },
]

export default function Amendments() {
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['amendments'],
    queryFn: () => getLatestAmendments(10),
    retry: 1,
  })

  const amendments = data?.amendments ?? MOCK_AMENDMENTS

  return (
    <div id="amendments-page" className="page-wrapper">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="section-title">Amendments</h1>
          <p className="section-subtitle">Latest Indian law changes</p>
        </div>
        <button
          id="refresh-amendments-btn"
          onClick={() => refetch()}
          className="p-2 rounded-xl transition-colors"
          style={{ background: 'rgba(255,255,255,0.05)' }}
        >
          <RefreshCcw size={16} className={`text-slate-400 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* BNS/BNSS highlight banner */}
      <div className="glass-card p-4 mb-6 border border-amber-400/20"
        style={{ background: 'rgba(245,158,11,0.05)' }}>
        <div className="flex items-center gap-2 mb-2">
          <Bell size={16} className="text-amber-400" />
          <span className="text-sm font-semibold text-amber-400">Major Change: 1 July 2024</span>
        </div>
        <p className="text-xs text-slate-400 leading-relaxed">
          IPC → BNS | CrPC → BNSS | Evidence Act → BSA<br />
          All criminal law references must now use the new codes.
        </p>
      </div>

      {/* Filter chips */}
      <div className="flex items-center gap-2 mb-4 overflow-x-auto pb-1">
        <Filter size={14} className="text-slate-500 shrink-0" />
        {['All', 'Criminal', 'Labour', 'Consumer', 'Cyber'].map((f) => (
          <button
            key={f}
            className="shrink-0 text-xs px-3 py-1 rounded-full border transition-colors"
            style={{
              borderColor: f === 'All' ? 'rgba(245,158,11,0.5)' : 'rgba(255,255,255,0.1)',
              color: f === 'All' ? '#f59e0b' : '#64748b',
              background: f === 'All' ? 'rgba(245,158,11,0.1)' : 'transparent',
            }}
          >
            {f}
          </button>
        ))}
      </div>

      {/* List */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="glass-card h-20 shimmer" />
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {amendments.map((a, i) => (
            <AmendmentCard key={i} amendment={a} index={i} />
          ))}
        </div>
      )}
    </div>
  )
}
