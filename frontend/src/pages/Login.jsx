import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Lock, Mail, User, Shield, AlertCircle, ArrowLeft, Eye, EyeOff } from 'lucide-react';

export default function Login() {
  const navigate = useNavigate();
  const { login, register } = useAuth();
  const { toast } = useToast();
  
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState('RETAILER');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isRegister) {
        const user = await register(name, email, password, role);
        if (user.role === 'SELLER' || user.role === 'DELIVERY') {
          setError('Registration successful! Please wait for Admin approval before logging in.');
          setIsRegister(false);
        } else {
          navigate('/');
        }
      } else {
        const user = await login(email, password);
        if (!user.isApproved) {
          setError('Your account is pending admin approval.');
          setLoading(false);
          return;
        }

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
      <Link to="/" className="back-to-store-link" style={{
        position: 'absolute',
        top: '2.5rem',
        left: '2.5rem',
      }}>
        <ArrowLeft size={16} style={{ color: 'var(--color-secondary)' }} /> Back to Store
      </Link>
      
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
            {isRegister ? 'B2B Wholesale Registration' : 'B2B Wholesale Portal'}
          </p>
        </div>

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
