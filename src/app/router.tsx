import { Navigate, Route, Routes } from 'react-router-dom'
import { AppShell } from '../components/layout/AppShell.tsx'
import { AccountPage } from '../features/account/AccountPage.tsx'
import { AdminPage } from '../features/admin/AdminPage.tsx'
import { ConfiguratorPage } from '../features/configurator/ConfiguratorPage.tsx'
import { DashboardPage } from '../features/dashboard/DashboardPage.tsx'
import { HomePage } from '../features/home/HomePage.tsx'
import { PrintPreviewPage } from '../features/print/PrintPreviewPage.tsx'

export function AppRouter() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/orders" element={<DashboardPage />} />
        <Route path="/account" element={<AccountPage />} />
        <Route path="/admin/users" element={<AdminPage />} />
        <Route path="/quote/:id" element={<ConfiguratorPage />} />
        <Route path="/quote/:id/print/work-order" element={<PrintPreviewPage kind="work-order" />} />
        <Route path="/quote/:id/print/quote" element={<PrintPreviewPage kind="quote" />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}
