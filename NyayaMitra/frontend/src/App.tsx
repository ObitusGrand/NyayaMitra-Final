import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

import Splash from '@/pages/Splash'
import Home from '@/pages/Home'
import VoicePage from '@/pages/VoicePage'
import DocDecoder from '@/pages/DocDecoder'
import CaseTracker from '@/pages/CaseTracker'
import Amendments from '@/pages/Amendments'
import NyayaScore from '@/pages/NyayaScore'
import PoliceStationMode from '@/pages/PoliceStationMode'
import DLSAConnect from '@/pages/DLSAConnect'
import NegotiationCoach from '@/pages/NegotiationCoach'
import BottomNav from '@/components/BottomNav'

const queryClient = new QueryClient()

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Splash />} />
          <Route path="/home" element={<Home />} />
          <Route path="/voice" element={<VoicePage />} />
          <Route path="/decode" element={<DocDecoder />} />
          <Route path="/case" element={<CaseTracker />} />
          <Route path="/amendments" element={<Amendments />} />
          <Route path="/score" element={<NyayaScore />} />
          <Route path="/police" element={<PoliceStationMode />} />
          <Route path="/dlsa" element={<DLSAConnect />} />
          <Route path="/negotiate" element={<NegotiationCoach />} />
        </Routes>
        <BottomNav />
      </BrowserRouter>
    </QueryClientProvider>
  )
}

export default App
