import { useNavigate, Navigate, Outlet } from 'react-router-dom'
import { BlockingDialog } from '../components/ui/Dialog.tsx'
import { signOut, useAuthStore } from './session.ts'

export function RequireAuth() {
  const navigate = useNavigate()
  const loading = useAuthStore((state) => state.loading)
  const session = useAuthStore((state) => state.session)
  const accountLocked = useAuthStore((state) => state.accountLocked)

  if (loading) return <p className="boot">Checking login…</p>
  if (!session) return <Navigate to="/login" replace />
  if (accountLocked) {
    return (
      <BlockingDialog
        open
        title="Account locked"
        description="Contact the admin to get full access of your account."
        actionLabel="Log out"
        onAction={() => {
          void signOut().then(() => navigate('/login', { replace: true }))
        }}
      />
    )
  }
  return <Outlet />
}
