import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import LandingPage from './pages/buyer/LandingPage';
import SellerDashboard from './pages/seller/SellerDashboard';
import DeliveryDashboard from './pages/delivery/DeliveryDashboard';
import Login from './pages/Login';
import { useAuth } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';

function ProtectedRoute({ children, allowedRoles }) {
  const { user, loading } = useAuth();
  
  if (loading) {
    return null; // splash screen handles the loading visual
  }
  
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    // Redirect to home if they don't have permission
    return <Navigate to="/" replace />;
  }
  
  return children;
}

function App() {
  const [splashDone, setSplashDone] = useState(false);

  useEffect(() => {
    const splash = document.getElementById('splash-screen');
    if (!splash) { setSplashDone(true); return; }

    // Wait at least 2s so the scale-up animation plays fully,
    // then fade-out via CSS transition and remove from DOM.
    const minDelay = setTimeout(() => {
      splash.classList.add('hide');
      // After the 0.6s CSS fade-out transition finishes, remove from DOM
      const cleanup = setTimeout(() => {
        splash.remove();
        setSplashDone(true);
      }, 650);
      return () => clearTimeout(cleanup);
    }, 2000);

    return () => clearTimeout(minDelay);
  }, []);

  return (
    <ToastProvider>
      <Router>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<Login />} />
          
          {/* Protected Routes */}
          <Route 
            path="/seller" 
            element={
              <ProtectedRoute allowedRoles={['SELLER']}>
                <SellerDashboard isAdmin={false} />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/admin" 
            element={
              <ProtectedRoute allowedRoles={['ADMIN']}>
                <SellerDashboard isAdmin={true} />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/delivery" 
            element={
              <ProtectedRoute allowedRoles={['DELIVERY']}>
                <DeliveryDashboard />
              </ProtectedRoute>
            } 
          />
          
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </Router>
    </ToastProvider>
  );
}

export default App;
