import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom'
import './index.css'
import App from './App.tsx'
import AdminDashboard from './components/AdminDashboard'
import HealthCheck from './components/HealthCheck'
import PrivacyPolicy from './components/PrivacyPolicy'
import ResetPasswordPage from './components/ResetPasswordPage.jsx'

// Verify ResetPasswordPage is imported correctly
if (!ResetPasswordPage) {
  console.error('❌ [IMPORT] ResetPasswordPage import failed!');
}
import ErrorBoundary from './components/ErrorBoundary.jsx'
import { ToastProvider } from './components/ui/toast'
import { AuthProvider } from './contexts/AuthContext'

// Service Worker temporarily disabled to avoid MIME type issues
console.log('ℹ️ Service Worker temporarily disabled to avoid MIME type issues');

// Debug component to log route changes
const RouteDebugger = () => {
  const location = useLocation();
  console.log('🔍 [ROUTER] Current location:', location.pathname, location.search);
  return null;
};

// Wrapper component to include ToastContainer
const AppWrapper = () => {
  console.log('🔍 [ROUTER] AppWrapper rendered');
  console.log('🔍 [ROUTER] ResetPasswordPage component:', ResetPasswordPage);
  console.log('🔍 [ROUTER] ResetPasswordPage type:', typeof ResetPasswordPage);
  console.log('🔍 [ROUTER] Available routes:', [
    '/reset-password',
    '/admin',
    '/health',
    '/privacy-policy.html',
    '/* (catch-all)'
  ]);
  
  // Check if ResetPasswordPage is valid
  if (!ResetPasswordPage) {
    console.error('❌ [ROUTER] ResetPasswordPage is not imported correctly!');
  }
  
  return (
    <>
      <RouteDebugger />
      <ErrorBoundary>
        <Routes>
          <Route 
            path="/reset-password" 
            element={
              <ErrorBoundary>
                {ResetPasswordPage ? <ResetPasswordPage /> : <div>Error: ResetPasswordPage not found</div>}
              </ErrorBoundary>
            } 
          />
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/health" element={<HealthCheck />} />
          <Route path="/privacy-policy.html" element={<PrivacyPolicy />} />
          <Route path="/*" element={<App />} />
        </Routes>
      </ErrorBoundary>
    </>
  );
};

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <AppWrapper />
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
)
