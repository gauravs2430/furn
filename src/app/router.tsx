import { Navigate, Route, Routes } from 'react-router-dom'
import { AppShell } from '../components/layout/AppShell.tsx'
import { DashboardPage } from '../features/dashboard/DashboardPage.tsx'
import { ConfiguratorPage } from '../features/configurator/ConfiguratorPage.tsx'
import { PrintPreviewPage } from '../features/print/PrintPreviewPage.tsx'

export function AppRouter() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/quote/:id" element={<ConfiguratorPage />} />
        <Route path="/quote/:id/print/work-order" element={<PrintPreviewPage kind="work-order" />} />
        <Route path="/quote/:id/print/quote" element={<PrintPreviewPage kind="quote" />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}
