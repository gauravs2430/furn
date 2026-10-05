import { Navigate, Outlet } from 'react-router-dom'
import { useAuthStore } from './session.ts'

export function RequireAuth() {
  const loading = useAuthStore((state) => state.loading)
  const session = useAuthStore((state) => state.session)

  if (loading) return <p className="boot">Checking login…</p>
  if (!session) return <Navigate to="/login" replace />
  return <Outlet />
}
