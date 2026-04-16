import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ProtectedRoute, AppAuthGuard } from './components/common/ProtectedRoute';

// Public / marketing
import PublicLayout from './components/layouts/PublicLayout';
import LandingPage from './pages/public/LandingPage';
import LoginPage from './pages/public/LoginPage';
import RegisterPage from './pages/public/RegisterPage';

// Customer app (phone-app style)
import AppLayout from './components/layouts/AppLayout';
import AppLoginPage from './pages/app/AppLoginPage';
import AppRegisterPage from './pages/app/AppRegisterPage';
import AppHome from './pages/app/AppHome';
import NewOrderFlow from './pages/app/NewOrderFlow';
import AppOrdersPage from './pages/app/AppOrdersPage';
import AppOrderDetailPage from './pages/app/AppOrderDetailPage';
import AppProfilePage from './pages/app/AppProfilePage';

// Admin
import AdminLayout from './components/layouts/AdminLayout';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminOrdersPage from './pages/admin/AdminOrdersPage';
import AdminOrderDetailPage from './pages/admin/AdminOrderDetailPage';
import AdminUsersPage from './pages/admin/AdminUsersPage';
import AdminUserFormPage from './pages/admin/AdminUserFormPage';
import AdminCategoriesPage from './pages/admin/AdminCategoriesPage';
import AdminVehiclesPage from './pages/admin/AdminVehiclesPage';
import AdminAnalyticsPage from './pages/admin/AdminAnalyticsPage';
import AdminLandingPage from './pages/admin/AdminLandingPage';

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        {/* ─── Public / marketing site ─── */}
        <Route element={<PublicLayout />}>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
        </Route>

        {/* ─── Customer app (separate phone-app flow) ─── */}
        <Route path="/app/login" element={<AppLoginPage />} />
        <Route path="/app/register" element={<AppRegisterPage />} />

        <Route element={<AppAuthGuard />}>
          <Route element={<AppLayout />}>
            <Route path="/app" element={<AppHome />} />
            <Route path="/app/orders" element={<AppOrdersPage />} />
            <Route path="/app/profile" element={<AppProfilePage />} />
          </Route>
          {/* Full-screen pages (no bottom tab) */}
          <Route path="/app/order/new" element={<NewOrderFlow />} />
          <Route path="/app/orders/:id" element={<AppOrderDetailPage />} />
        </Route>

        {/* ─── Admin dashboard ─── */}
        <Route
          element={
            <ProtectedRoute requiredRole="admin">
              <AdminLayout />
            </ProtectedRoute>
          }
        >
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/admin/orders" element={<AdminOrdersPage />} />
          <Route path="/admin/orders/:id" element={<AdminOrderDetailPage />} />
          <Route path="/admin/analytics" element={<AdminAnalyticsPage />} />
          <Route path="/admin/history" element={<AdminOrdersPage historyMode />} />
          <Route path="/admin/users" element={<AdminUsersPage />} />
          <Route path="/admin/users/new" element={<AdminUserFormPage />} />
          <Route path="/admin/users/:id" element={<AdminUserFormPage />} />
          <Route path="/admin/categories" element={<AdminCategoriesPage />} />
          <Route path="/admin/vehicles" element={<AdminVehiclesPage />} />
          <Route path="/admin/landing" element={<AdminLandingPage />} />
        </Route>

        {/* Old dashboard routes redirect to new app */}
        <Route path="/dashboard/*" element={<Navigate to="/app" replace />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
  );
}
