
import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from '@/contexts/SupabaseAuthContext';
import { Toaster } from '@/components/ui/toaster';
import IpChecker from '@/components/IpChecker';
import ErrorBoundary from '@/components/ErrorBoundary';

// Pages
import HomePage from '@/pages/HomePage';
import NovelDetailPage from '@/pages/NovelDetailPage';
import ChapterReaderPage from '@/pages/ChapterReaderPage';
import LoginPage from '@/pages/LoginPage';
import ForgotPasswordPage from '@/pages/ForgotPasswordPage';
import AdminLoginPage from '@/pages/AdminLoginPage';
import RegisterPage from '@/pages/RegisterPage';
import ProfilePage from '@/pages/ProfilePage';
import SubscriptionPage from '@/pages/SubscriptionPage';
import AdminDashboard from '@/pages/AdminDashboard';
import AdminNovels from '@/pages/AdminNovels';
import AdminNovelDetail from '@/pages/AdminNovelDetail';
import AdminChapters from '@/pages/AdminChapters';
import AdminUsers from '@/pages/AdminUsers';
import AdminComments from '@/pages/AdminComments';
import AdminSettings from '@/pages/AdminSettings';
import AdminIpWhitelist from '@/pages/AdminIpWhitelist';
import AdminAnalytics from '@/pages/AdminAnalytics';
import AdminNotifications from '@/pages/AdminNotifications';
import BrowsePage from '@/pages/BrowsePage';
import LeaderboardPage from '@/pages/LeaderboardPage';
import FreePage from '@/pages/FreePage';
import PromotionPage from '@/pages/PromotionPage';
import AccessDeniedPage from '@/pages/AccessDeniedPage';

// Routes
import ProtectedRoute from '@/components/ProtectedRoute';
import AdminRoute from '@/components/AdminRoute';

function App() {
  return (
    <ErrorBoundary>
      <Router>
        <AuthProvider>
          {/* CRITICAL: IpChecker wraps EVERYTHING inside AuthProvider. 
              It prevents any route rendering until IP is verified. */}
          <IpChecker>
            <Routes>
              {/* Public Routes */}
              <Route path="/" element={<HomePage />} />
              <Route path="/browse" element={<BrowsePage />} />
              <Route path="/free" element={<FreePage />} />
              <Route path="/leaderboard" element={<LeaderboardPage />} />
              <Route path="/novel/:id" element={<NovelDetailPage />} />
              <Route path="/novel/:novelId/chapter/:chapterId" element={<ChapterReaderPage />} />
              
              <Route path="/login" element={<LoginPage />} />
              <Route path="/forgot-password" element={<ForgotPasswordPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/subscription" element={<SubscriptionPage />} />
              <Route path="/access-denied" element={<AccessDeniedPage />} />
              
              <Route path="/admin/login" element={<AdminLoginPage />} />
              
              {/* User Protected Routes */}
              <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
              <Route path="/promotion" element={<ProtectedRoute><PromotionPage /></ProtectedRoute>} />
              
              {/* Admin Protected Routes */}
              <Route path="/admin" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
              <Route path="/admin/novels" element={<AdminRoute><AdminNovels /></AdminRoute>} />
              <Route path="/admin/novels/:id" element={<AdminRoute><AdminNovelDetail /></AdminRoute>} />
              <Route path="/admin/novels/:novelId/chapters" element={<AdminRoute><AdminChapters /></AdminRoute>} />
              <Route path="/admin/users" element={<AdminRoute><AdminUsers /></AdminRoute>} />
              <Route path="/admin/comments" element={<AdminRoute><AdminComments /></AdminRoute>} />
              <Route path="/admin/settings" element={<AdminRoute><AdminSettings /></AdminRoute>} />
              <Route path="/admin/whitelist" element={<AdminRoute><AdminIpWhitelist /></AdminRoute>} />
              <Route path="/admin/notifications" element={<AdminRoute><AdminNotifications /></AdminRoute>} />
              <Route path="/admin/analytics" element={<AdminRoute><AdminAnalytics /></AdminRoute>} />
              
              {/* Fallback */}
              <Route path="*" element={<div className="min-h-screen bg-slate-950 flex items-center justify-center text-white">404 - Page Not Found</div>} />
            </Routes>
          </IpChecker>
        </AuthProvider>
        {/* Toaster moved outside AuthProvider to ensure it's available globally and not dependent on Auth context */}
        <Toaster />
      </Router>
    </ErrorBoundary>
  );
}

export default App;
