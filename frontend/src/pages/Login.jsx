import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Lock, Mail, User, Shield, AlertCircle, ArrowLeft, Eye, EyeOff, Navigation } from 'lucide-react';
import { Geolocation } from '@capacitor/geolocation';

export default function Login({ appMode = 'web', setAppMode }) {
  const navigate = useNavigate();
  const { login, register } = useAuth();
  const { toast } = useToast();
  
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  
  // App-specific defaults
  const getInitialRole = () => {
    if (appMode === 'seller') return 'SELLER';
    if (appMode === 'delivery') return 'DELIVERY';
    return 'RETAILER';
  };
  const [role, setRole] = useState(getInitialRole());
  
  // Gatekeeper Selected Role ('SELLER' or 'ADMIN') for SellerApp login
  const [gatekeeperRole, setGatekeeperRole] = useState('SELLER');
  
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isRegister) {
        // Enforce role constraints for specific app modes during registration
        let registrationRole = role;
        if (appMode === 'seller') registrationRole = 'SELLER';
        if (appMode === 'delivery') registrationRole = 'DELIVERY';

        const user = await register(name, email, password, registrationRole);
        if (user.role === 'SELLER' || user.role === 'DELIVERY') {
          setError('Registration successful! Please wait for Admin approval before logging in.');
          setIsRegister(false);
        } else {
          navigate('/');
        }
      } else {
        const user = await login(email, password);
        
        // Approve check (Admins are always approved)
        if (user.role !== 'ADMIN' && !user.isApproved) {
          setError('Your account is pending admin approval.');
          setLoading(false);
          return;
        }

        // 1. Role validation based on App Mode / Gatekeeper selection
        if (appMode === 'seller') {
          if (gatekeeperRole === 'ADMIN' && user.role !== 'ADMIN') {
            setError('Access Denied: You do not have administrator credentials.');
            setLoading(false);
            return;
          }
          if (gatekeeperRole === 'SELLER' && user.role !== 'SELLER') {
            setError('Access Denied: You do not have seller credentials.');
            setLoading(false);
            return;
          }
        } else if (appMode === 'delivery') {
          if (user.role !== 'DELIVERY') {
            setError('Access Denied: You do not have delivery partner credentials.');
            setLoading(false);
            return;
          }
        }

        // 2. Request Location Permissions if Delivery Partner
        if (user.role === 'DELIVERY') {
          try {
            toast.info('Requesting GPS location permissions for delivery tracking...');
            const perm = await Geolocation.requestPermissions();
            console.log('GPS Permission Response:', perm);
            if (perm.location !== 'granted') {
              toast.warning('GPS permission is required to accept and track deliveries.');
            }
          } catch (gpsError) {
            console.warn('Geolocation request rejected or not supported on this device:', gpsError);
          }
        }

        // 3. Routing
        if (user.role === 'SELLER') {
          navigate('/seller');
        } else if (user.role === 'ADMIN') {
          navigate('/admin');
        } else if (user.role === 'DELIVERY') {
          navigate('/delivery');
        } else {
          navigate('/');
        }
      }
    } catch (err) {
      setError(err.message || 'An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };


  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(rgba(17, 17, 17, 0.58), rgba(17, 17, 17, 0.58)), url("/hero.png") center/cover no-repeat',
      padding: '3rem 2rem',
      position: 'relative'
    }}>
      {appMode === 'buyer' || appMode === 'web' ? (
        <Link to="/" className="back-to-store-link" style={{
          position: 'absolute',
          top: '2.5rem',
          left: '2.5rem',
        }}>
          <ArrowLeft size={16} style={{ color: 'var(--color-secondary)' }} /> Back to Store
        </Link>
      ) : null}
      
      
      <div className="card animate-fade-in" style={{
        width: '100%',
        maxWidth: '460px',
        padding: '3.5rem 3rem',
        border: '1px solid rgba(197, 160, 89, 0.25)',
        backgroundColor: 'rgba(255, 255, 255, 0.88)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        boxShadow: '0 24px 60px rgba(0, 0, 0, 0.15)',
        borderRadius: '4px'
      }}>
        <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
          <h1 style={{ 
            fontSize: '2.75rem', 
            letterSpacing: '8px', 
            textTransform: 'uppercase', 
            marginBottom: '0.25rem',
            fontFamily: 'var(--font-serif)',
            color: 'var(--color-primary)',
            fontWeight: '400'
          }}>
            VIRAASAT
          </h1>
          <div style={{ 
            width: '40px', 
            height: '1px', 
            background: 'var(--color-secondary)', 
            margin: '0.75rem auto 1rem' 
          }}></div>
          <p style={{ 
            fontFamily: 'var(--font-sans)', 
            fontSize: '0.7rem', 
            color: 'var(--color-text-muted)', 
            letterSpacing: '2px', 
            textTransform: 'uppercase',
            fontWeight: '500'
          }}>
            {appMode === 'seller' ? (
              isRegister ? 'B2B Wholesale Registration' : 'Gatekeeper: Seller & Admin Portal'
            ) : appMode === 'delivery' ? (
              isRegister ? 'Delivery Partner Registration' : 'Logistics Driver Portal'
            ) : (
              isRegister ? 'B2B Wholesale Registration' : 'B2B Wholesale Portal'
            )}
          </p>
        </div>

        {/* Gatekeeper Role Selector Segmented Control */}
        {appMode === 'seller' && !isRegister && (
          <div style={{
            display: 'flex',
            background: '#eee',
            borderRadius: '4px',
            padding: '2px',
            marginBottom: '1.5rem',
            border: '1px solid #ddd'
          }}>
            <button
              type="button"
              onClick={() => setGatekeeperRole('SELLER')}
              style={{
                flex: 1,
                padding: '0.6rem',
                border: 'none',
                borderRadius: '3px',
                background: gatekeeperRole === 'SELLER' ? 'var(--color-primary)' : 'transparent',
                color: gatekeeperRole === 'SELLER' ? 'white' : 'var(--color-text-main)',
                fontSize: '0.75rem',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
            >
              Weaver / Seller
            </button>
            <button
              type="button"
              onClick={() => setGatekeeperRole('ADMIN')}
              style={{
                flex: 1,
                padding: '0.6rem',
                border: 'none',
                borderRadius: '3px',
                background: gatekeeperRole === 'ADMIN' ? 'var(--color-primary)' : 'transparent',
                color: gatekeeperRole === 'ADMIN' ? 'white' : 'var(--color-text-main)',
                fontSize: '0.75rem',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
            >
              Administrator
            </button>
          </div>
        )}

        {error && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            padding: '1rem',
            marginBottom: '1.5rem',
            backgroundColor: error.includes('successful') ? 'rgba(232, 245, 233, 0.9)' : 'rgba(255, 235, 238, 0.9)',
            border: `1px solid ${error.includes('successful') ? '#A5D6A7' : '#FFCDD2'}`,
            borderRadius: 'var(--radius-sm)',
            color: error.includes('successful') ? '#2E7D32' : '#C62828',
            fontSize: '0.85rem'
          }}>
            <AlertCircle size={18} style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {isRegister && (
            <div>
              <label style={{ 
                display: 'block', 
                marginBottom: '0.35rem', 
                fontSize: '0.7rem', 
                textTransform: 'uppercase', 
                letterSpacing: '1.5px', 
                fontWeight: '600',
                color: 'var(--color-text-main)'
              }}>
                Full Name / Business Name
              </label>
              <div style={{ position: 'relative' }}>
                <User size={15} style={{ position: 'absolute', left: '0.5rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} />
                <input 
                  type="text" 
                  placeholder="Enter your name" 
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="luxury-input"
                  style={{ 
                    paddingLeft: '2.25rem',
                    fontSize: '0.9rem'
                  }}
                />
              </div>
            </div>
          )}

          <div>
            <label style={{ 
              display: 'block', 
              marginBottom: '0.35rem', 
              fontSize: '0.7rem', 
              textTransform: 'uppercase', 
              letterSpacing: '1.5px', 
              fontWeight: '600',
              color: 'var(--color-text-main)'
            }}>
              Email Address
            </label>
            <div style={{ position: 'relative' }}>
              <Mail size={15} style={{ position: 'absolute', left: '0.5rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} />
              <input 
                type="email" 
                placeholder="Enter email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="luxury-input"
                style={{ 
                  paddingLeft: '2.25rem',
                  fontSize: '0.9rem'
                }}
              />
            </div>
          </div>

          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '0.35rem' }}>
              <label style={{ 
                fontSize: '0.7rem', 
                textTransform: 'uppercase', 
                letterSpacing: '1.5px', 
                fontWeight: '600',
                color: 'var(--color-text-main)'
              }}>
                Password
              </label>
              {!isRegister && (
                <button 
                  type="button"
                  onClick={() => {
                    if (!email) {
                      toast.warning('Please enter your email address first.');
                    } else {
                      toast.success(`A password reset link has been sent to ${email}.`);
                    }
                  }}
                  style={{
                    fontSize: '0.65rem',
                    textTransform: 'uppercase',
                    letterSpacing: '1px',
                    color: 'var(--color-secondary)',
                    fontWeight: '500',
                    cursor: 'pointer',
                    background: 'none',
                    border: 'none',
                    padding: 0
                  }}
                >
                  Forgot Password?
                </button>
              )}
            </div>
            <div style={{ position: 'relative' }}>
              <Lock size={15} style={{ position: 'absolute', left: '0.5rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} />
              <input 
                type={showPassword ? 'text' : 'password'}
                placeholder="Enter password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="luxury-input"
                style={{ 
                  paddingLeft: '2.25rem',
                  paddingRight: '2.5rem',
                  fontSize: '0.9rem'
                }}
              />
              <button 
                type="button" 
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  right: '0.5rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--color-text-muted)',
                  cursor: 'pointer',
                  padding: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  background: 'none',
                  border: 'none'
                }}
              >
                {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>

          {isRegister && (appMode === 'web' || appMode === 'buyer') && (
            <div>
              <label style={{ 
                display: 'block', 
                marginBottom: '0.35rem', 
                fontSize: '0.7rem', 
                textTransform: 'uppercase', 
                letterSpacing: '1.5px', 
                fontWeight: '600',
                color: 'var(--color-text-main)'
              }}>
                Join As
              </label>
              <div style={{ position: 'relative' }}>
                <Shield size={15} style={{ position: 'absolute', left: '0.5rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} />
                <select 
                  value={role} 
                  onChange={(e) => setRole(e.target.value)}
                  className="luxury-select"
                  style={{ 
                    paddingLeft: '2.25rem',
                    fontSize: '0.9rem'
                  }}
                >
                  <option value="RETAILER">Retailer / Boutique Buyer</option>
                  <option value="SELLER">Weaver / Wholesale Seller</option>
                  <option value="DELIVERY">Delivery Partner</option>
                </select>
              </div>
            </div>
          )}

          <button 
            type="submit" 
            className="btn-primary" 
            disabled={loading}
            style={{ 
              marginTop: '1rem', 
              padding: '1.1rem', 
              fontSize: '0.8rem',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              gap: '0.5rem',
              opacity: loading ? 0.7 : 1
            }}
          >
            {loading ? 'Processing...' : (isRegister ? 'Register Account' : 'Sign In')}
          </button>
        </form>

        <div style={{ 
          marginTop: '2rem', 
          textAlign: 'center', 
          fontSize: '0.85rem', 
          color: 'var(--color-text-muted)',
          fontFamily: 'var(--font-sans)'
        }}>
          {isRegister ? 'Already have a wholesale account? ' : "Don't have an account? "}
          <button 
            type="button" 
            onClick={() => {
              setIsRegister(!isRegister);
              setError('');
            }}
            style={{ 
              color: 'var(--color-secondary)', 
              fontWeight: '500', 
              textDecoration: 'underline',
              display: 'inline',
              marginLeft: '0.25rem',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontSize: '0.85rem',
              padding: 0
            }}
          >
            {isRegister ? 'Sign In' : 'Register Here'}
          </button>
        </div>
      </div>
    </div>
  );
}
