// ProtectedRoute — redirect to /auth if not authenticated
import { Navigate } from 'react-router-dom'
import { useAuth } from '@/store/AuthContext'
import { Loader2 } from 'lucide-react'

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center" style={{ background: 'var(--bg-page)' }}>
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="animate-spin" size={40} style={{ color: 'var(--saffron)' }} />
          <p style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-muted)' }}>Loading...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/auth" replace />
  }

  return <>{children}</>
}
