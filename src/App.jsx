import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext.jsx'
import AppLayout from './components/AppLayout.jsx'
import ProtectedRoute from './routes/ProtectedRoute.jsx'
import HomePage from './pages/HomePage.jsx'
import WorkoutCatalogPage from './pages/WorkoutCatalogPage.jsx'
import WorkoutDetailsPage from './pages/WorkoutDetailsPage.jsx'
import RegisterPage from './pages/RegisterPage.jsx'
import LoginPage from './pages/LoginPage.jsx'
import DashboardPage from './pages/DashboardPage.jsx'
import WorkoutFormPage from './pages/WorkoutFormPage.jsx'
import ExplorePage from './pages/ExplorePage.jsx'
import { AccessDeniedPage, NotFoundPage } from './pages/ErrorPages.jsx'

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<AppLayout />}>
            <Route index element={<HomePage />} />
            <Route path="workouts" element={<WorkoutCatalogPage />} />
            <Route path="workouts/:id" element={<WorkoutDetailsPage />} />
            <Route path="register" element={<RegisterPage />} />
            <Route path="login" element={<LoginPage />} />
            <Route path="explore" element={<ExplorePage />} />
            <Route path="403" element={<AccessDeniedPage />} />
            <Route element={<ProtectedRoute />}>
              <Route path="dashboard" element={<DashboardPage />} />
              <Route path="workouts/new" element={<WorkoutFormPage />} />
              <Route path="workouts/:id/edit" element={<WorkoutFormPage />} />
            </Route>
            <Route path="404" element={<NotFoundPage />} />
            <Route path="*" element={<Navigate to="/404" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
