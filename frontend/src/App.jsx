import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import LandingPage from './pages/buyer/LandingPage';
import SellerDashboard from './pages/seller/SellerDashboard';
import DeliveryDashboard from './pages/delivery/DeliveryDashboard';
import Login from './pages/Login';
import { useAuth } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { App as CapApp } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';

function ProtectedRoute({ children, allowedRoles }) {
  const { user, loading } = useAuth();
  
  if (loading) {
    return null; // splash screen handles the loading visual
  }
  
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    // Redirect to home or login based on user role
    if (user.role === 'SELLER') return <Navigate to="/seller" replace />;
    if (user.role === 'ADMIN') return <Navigate to="/admin" replace />;
    if (user.role === 'DELIVERY') return <Navigate to="/delivery" replace />;
    return <Navigate to="/" replace />;
  }
  
  return children;
}

// A Gatekeeper component to check if the current user/guest should be routed somewhere based on the app mode.
function Gatekeeper({ children, appMode }) {
  const { user, loading } = useAuth();

  if (loading) return null;

  if (appMode === 'seller') {
    if (!user) {
      return <Navigate to="/login" replace />;
    }
    if (user.role === 'SELLER') {
      return <Navigate to="/seller" replace />;
    }
    if (user.role === 'ADMIN') {
      return <Navigate to="/admin" replace />;
    }
    return <Navigate to="/login" replace />;
  }

  if (appMode === 'delivery') {
    if (!user) {
      return <Navigate to="/login" replace />;
    }
    if (user.role === 'DELIVERY') {
      return <Navigate to="/delivery" replace />;
    }
    return <Navigate to="/login" replace />;
  }

  // Otherwise, default to whatever route children specify (e.g. LandingPage for buyer)
  return children;
}

function App() {
  const [splashDone, setSplashDone] = useState(false);
  const [appMode, setAppMode] = useState('web'); // 'buyer', 'seller', 'delivery', 'web'

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

  useEffect(() => {
    async function detectApp() {
      if (Capacitor.isNativePlatform()) {
        try {
          const info = await CapApp.getInfo();
          console.log("App Info id:", info.id);
          if (info.id === 'com.viraasat.seller') {
            setAppMode('seller');
          } else if (info.id === 'com.viraasat.delivery') {
            setAppMode('delivery');
          } else {
            setAppMode('buyer');
          }
        } catch (e) {
          console.error("Failed to get app info", e);
          setAppMode('buyer');
        }
      } else {
        // Fallback for localhost testing
        const path = window.location.pathname;
        const storedMode = localStorage.getItem('dev_app_mode');
        
        if (storedMode) {
          setAppMode(storedMode);
        } else if (path.startsWith('/seller') || path.startsWith('/admin')) {
          setAppMode('seller');
          localStorage.setItem('dev_app_mode', 'seller');
        } else if (path.startsWith('/delivery')) {
          setAppMode('delivery');
          localStorage.setItem('dev_app_mode', 'delivery');
        } else {
          setAppMode('buyer');
        }
      }
    }
    detectApp();
  }, []);

  return (
    <ToastProvider>
      <Router>
        <Routes>
          <Route 
            path="/" 
            element={
              <Gatekeeper appMode={appMode}>
                <LandingPage />
              </Gatekeeper>
            } 
          />
          <Route path="/login" element={<Login appMode={appMode} setAppMode={setAppMode} />} />
          
          {/* Protected Routes */}
          <Route 
            path="/seller" 
            element={
              <ProtectedRoute allowedRoles={['SELLER', 'ADMIN']}>
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
