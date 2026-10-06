import { Navigate, Route, Routes } from 'react-router-dom'
import { RequireAuth } from '../auth/RequireAuth.tsx'
import { AppShell } from '../components/layout/AppShell.tsx'
import { AccountPage } from '../features/account/AccountPage.tsx'
import { AdminPage } from '../features/admin/AdminPage.tsx'
import { AdminOrdersPage } from '../features/admin/OrdersPage.tsx'
import { CatalogPage } from '../features/admin/CatalogPage.tsx'
import { PricesPage } from '../features/admin/PricesPage.tsx'
import { ConfiguratorPage } from '../features/configurator/ConfiguratorPage.tsx'
import { DashboardPage } from '../features/dashboard/DashboardPage.tsx'
import { HomePage } from '../features/home/HomePage.tsx'
import { LoginPage } from '../features/login/LoginPage.tsx'
import { PrintPreviewPage } from '../features/print/PrintPreviewPage.tsx'

export function AppRouter() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<RequireAuth />}>
        <Route element={<AppShell />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/orders" element={<DashboardPage />} />
          <Route path="/account" element={<AccountPage />} />
          <Route path="/admin/users" element={<AdminPage />} />
          <Route path="/admin/prices" element={<PricesPage />} />
          <Route path="/admin/catalog" element={<CatalogPage />} />
          <Route path="/admin/orders" element={<AdminOrdersPage />} />
          <Route path="/quote/:id" element={<ConfiguratorPage />} />
          <Route path="/quote/:id/print/work-order" element={<PrintPreviewPage kind="work-order" />} />
          <Route path="/quote/:id/print/quote" element={<PrintPreviewPage kind="quote" />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Route>
    </Routes>
  )
}
