import { Link, Navigate } from 'react-router-dom'
import { useAuthStore } from '../../auth/session.ts'

export function AdminPage() {
  const profile = useAuthStore((state) => state.profile)
  if (!profile) return <p className="boot">Checking login…</p>
  if (profile.role !== 'admin') return <Navigate to="/" replace />

  return (
    <div className="page">
      <h1>Admin</h1>
      <nav className="page-links" aria-label="Admin">
        <Link to="/admin/prices">Prices</Link>
        <Link to="/admin/orders">All orders</Link>
      </nav>
    </div>
  )
}
