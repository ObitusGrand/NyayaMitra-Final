import { Suspense, lazy } from 'react'
import { BrowserRouter, Routes, Route, useLocation, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Loader2 } from 'lucide-react'
import { AuthProvider, useAuth } from '@/store/AuthContext'

const Splash = lazy(() => import('@/pages/Splash'))
const AuthPage = lazy(() => import('@/pages/AuthPage'))
const Home = lazy(() => import('@/pages/Home'))
const VoicePage = lazy(() => import('@/pages/VoicePage'))
const DocDecoder = lazy(() => import('@/pages/DocDecoder'))
const CaseTracker = lazy(() => import('@/pages/CaseTracker'))
const Amendments = lazy(() => import('@/pages/Amendments'))
const NyayaScore = lazy(() => import('@/pages/NyayaScore'))
const PoliceStationMode = lazy(() => import('@/pages/PoliceStationMode'))
const DLSAConnect = lazy(() => import('@/pages/DLSAConnect'))
const NegotiationCoach = lazy(() => import('@/pages/NegotiationCoach'))

import Sidebar from '@/components/Sidebar'
import ProtectedRoute from '@/components/ProtectedRoute'
import { ErrorBoundary } from '@/components/ErrorBoundary'

const queryClient = new QueryClient()

function PageLoader() {
  return (
    <div className="flex h-screen items-center justify-center" style={{ background: 'var(--bg-page, #F0F2F5)' }}>
      <Loader2 className="animate-spin" size={48} style={{ color: 'var(--saffron, #FF9933)' }} />
    </div>
  )
}

function AppLayout() {
  const location = useLocation()
  const { user, loading } = useAuth()

  // Public routes (no sidebar, no auth required)
  const publicPaths = ['/', '/auth']
  const isPublic = publicPaths.includes(location.pathname)

  if (isPublic) {
    return (
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route path="/" element={<Splash />} />
          <Route path="/auth" element={
            // If already logged in, redirect to home
            loading ? <PageLoader /> : user ? <Navigate to="/home" replace /> : <AuthPage />
          } />
        </Routes>
      </Suspense>
    )
  }

  // All other routes require auth
  return (
    <ProtectedRoute>
      <div className="app-layout">
        <Sidebar />
        <main className="main-content">
          <Suspense fallback={<PageLoader />}>
            <Routes>
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
          </Suspense>
        </main>
      </div>
    </ProtectedRoute>
  )
}

function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <BrowserRouter>
            <AppLayout />
          </BrowserRouter>
        </AuthProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  )
}

export default App
