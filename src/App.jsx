import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext.jsx'
import { ThemeProvider } from './context/ThemeProvider.jsx'
import { ToastProvider } from './context/ToastProvider.jsx'
import AppLayout from './components/AppLayout.jsx'
import ProtectedRoute from './routes/ProtectedRoute.jsx'
import AdminRoute from './routes/AdminRoute.jsx'
import HomePage from './pages/HomePage.jsx'
import WorkoutCatalogPage from './pages/WorkoutCatalogPage.jsx'
import WorkoutDetailsPage from './pages/WorkoutDetailsPage.jsx'
import RegisterPage from './pages/RegisterPage.jsx'
import LoginPage from './pages/LoginPage.jsx'
import ForgotPasswordPage from './pages/ForgotPasswordPage.jsx'
import DashboardPage from './pages/DashboardPage.jsx'
import WorkoutFormPage from './pages/WorkoutFormPage.jsx'
import SessionPage from './pages/SessionPage.jsx'
import ExplorePage from './pages/ExplorePage.jsx'
import CalendarPage from './pages/CalendarPage.jsx'
import AnalyticsPage from './pages/AnalyticsPage.jsx'
import GoalsPage from './pages/GoalsPage.jsx'
import AchievementsPage from './pages/AchievementsPage.jsx'
import ChallengesPage from './pages/ChallengesPage.jsx'
import PlannerPage from './pages/PlannerPage.jsx'
import ExercisesPage from './pages/ExercisesPage.jsx'
import ExerciseDetailsPage from './pages/ExerciseDetailsPage.jsx'
import ExerciseProgressPage from './pages/ExerciseProgressPage.jsx'
import ProfilePage from './pages/ProfilePage.jsx'
import SettingsPage from './pages/SettingsPage.jsx'
import NotificationsPage from './pages/NotificationsPage.jsx'
import FriendsPage from './pages/FriendsPage.jsx'
import PublicProfilePage from './pages/PublicProfilePage.jsx'
import SharePage from './pages/SharePage.jsx'
import PricingPage from './pages/PricingPage.jsx'
import { AdminChallenges, AdminExercises } from './pages/admin/AdminContent.jsx'
import { AdminDashboard, AdminLayout, AdminUsers, AdminWorkouts } from './pages/admin/AdminPages.jsx'
import { AccessDeniedPage, NotFoundPage } from './pages/ErrorPages.jsx'

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <ToastProvider>
          <BrowserRouter>
            <Routes>
              <Route element={<AppLayout />}>
                <Route index element={<HomePage />} />
                <Route path="workouts" element={<WorkoutCatalogPage />} />
                <Route path="workouts/:id" element={<WorkoutDetailsPage />} />
                <Route path="register" element={<RegisterPage />} />
                <Route path="login" element={<LoginPage />} />
                <Route path="forgot-password" element={<ForgotPasswordPage />} />
                <Route path="explore" element={<ExplorePage />} />
                <Route path="exercises" element={<ExercisesPage />} />
                <Route path="exercises/:id" element={<ExerciseDetailsPage />} />
                <Route path="pricing" element={<PricingPage />} />
                <Route path="share/workout/:id" element={<SharePage />} />
                <Route path="403" element={<AccessDeniedPage />} />
                <Route element={<ProtectedRoute />}>
                  <Route path="dashboard" element={<DashboardPage />} />
                  <Route path="calendar" element={<CalendarPage />} />
                  <Route path="analytics" element={<AnalyticsPage />} />
                  <Route path="goals" element={<GoalsPage />} />
                  <Route path="achievements" element={<AchievementsPage />} />
                  <Route path="challenges" element={<ChallengesPage />} />
                  <Route path="planner" element={<PlannerPage />} />
                  <Route path="profile" element={<ProfilePage />} />
                  <Route path="settings" element={<SettingsPage />} />
                  <Route path="notifications" element={<NotificationsPage />} />
                  <Route path="friends" element={<FriendsPage />} />
                  <Route path="users/:id" element={<PublicProfilePage />} />
                  <Route path="exercises/:id/progress" element={<ExerciseProgressPage />} />
                  <Route path="workouts/new" element={<WorkoutFormPage />} />
                  <Route path="workouts/:id/edit" element={<WorkoutFormPage />} />
                  <Route path="workouts/:id/start" element={<SessionPage />} />
                  <Route element={<AdminRoute />}>
                    <Route path="admin" element={<AdminLayout />}>
                      <Route index element={<AdminDashboard />} />
                      <Route path="users" element={<AdminUsers />} />
                      <Route path="exercises" element={<AdminExercises />} />
                      <Route path="challenges" element={<AdminChallenges />} />
                      <Route path="workouts" element={<AdminWorkouts />} />
                    </Route>
                  </Route>
                </Route>
                <Route path="404" element={<NotFoundPage />} />
                <Route path="*" element={<Navigate to="/404" replace />} />
              </Route>
            </Routes>
          </BrowserRouter>
        </ToastProvider>
      </AuthProvider>
    </ThemeProvider>
  )
}
