import React, { useState, useEffect } from 'react';
import { Truck, MapPin, CheckCircle, LogOut, Package, Clipboard, DollarSign, Calendar, User, X, Bell } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';

export default function DeliveryDashboard() {
  const navigate = useNavigate();
  const { user, token, logout, refreshUser } = useAuth();
  const { toast } = useToast();

  // Profile Modal State
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState({ name: '', email: '' });
  const [profileError, setProfileError] = useState('');
  const [profileSaving, setProfileSaving] = useState(false);

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    setProfileError('');
    setProfileSaving(true);
    try {
      const res = await fetch('http://192.168.1.2:5000/api/auth/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(profileForm)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update profile');
      
      toast.success('Profile updated successfully!');
      refreshUser();
      setIsEditingProfile(false);
    } catch (err) {
      setProfileError(err.message);
    } finally {
      setProfileSaving(false);
    }
  };
  
  // Data States
  const [activeTab, setActiveTab] = useState('available'); // 'available', 'active', 'history'
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Active/Online toggling state
  const [isOnline, setIsOnline] = useState(true);

  // Delivery confirmation modal states
  const [isDeliveryModalOpen, setIsDeliveryModalOpen] = useState(false);
  const [selectedOrderIdForDelivery, setSelectedOrderIdForDelivery] = useState(null);
  const [otpCode, setOtpCode] = useState('');
  const [photoProofUploaded, setPhotoProofUploaded] = useState(false);
  const [signatureDrawn, setSignatureDrawn] = useState(false);
  const [canvasCleared, setCanvasCleared] = useState(true);


  // Notification State
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [readNotifications, setReadNotifications] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('read_notifications_delivery') || '[]');
    } catch {
      return [];
    }
  });

  const derivedNotifications = (orders || [])
    .filter(o => o.status === 'ACCEPTED' && !o.deliveryPartnerId)
    .map(o => ({
      id: `delivery-order-${o.id}`,
      message: `New shipment #ORD-${o.id.toString().padStart(5, '0')} is ready for pickup at ${o.seller?.name || 'Weaver'}.`,
      time: new Date(o.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      type: 'pickup'
    }));

  const handleMarkAllRead = () => {
    const allIds = derivedNotifications.map(n => n.id);
    setReadNotifications(allIds);
    localStorage.setItem('read_notifications_delivery', JSON.stringify(allIds));
  };

  const unreadCount = derivedNotifications.filter(n => !readNotifications.includes(n.id)).length;

  useEffect(() => {
    fetchOrders();
    refreshUser();
  }, [activeTab]);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const res = await fetch('http://192.168.1.2:5000/api/orders', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setOrders(data);
      }
    } catch (err) {
      console.error('Error fetching delivery orders:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (orderId, newStatus) => {
    try {
      const res = await fetch(`http://192.168.1.2:5000/api/orders/${orderId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status: newStatus })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update delivery status');

      toast.success(
        newStatus === 'ACCEPTED' 
          ? 'Delivery job claimed successfully!' 
          : newStatus === 'IN_TRANSIT' 
            ? 'Package marked as Picked Up!' 
            : 'Delivery completed successfully! Commission added to your balance.'
      );
      fetchOrders();
      refreshUser();
    } catch (err) {
      toast.error(err.message);
    }
  };

  // Filter orders based on tab
  const getFilteredOrders = () => {
    switch (activeTab) {
      case 'available':
        // Accepted by seller, but no delivery partner assigned yet. Hide if offline.
        if (!isOnline) return [];
        return orders.filter((o) => o.status === 'ACCEPTED' && !o.deliveryPartnerId);
      case 'active':
        // Claimed by this partner and not delivered yet
        return orders.filter(
          (o) => o.deliveryPartnerId === user?.id && ['ACCEPTED', 'IN_TRANSIT'].includes(o.status)
        );
      case 'history':
        // Claimed by this partner and delivered
        return orders.filter((o) => o.deliveryPartnerId === user?.id && o.status === 'DELIVERED');
      default:
        return [];
    }
  };

  const filteredOrders = getFilteredOrders();

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-background)', display: 'flex', flexDirection: 'column' }}>
      
      {/* Header bar */}
      <header style={{ background: 'var(--color-primary)', color: 'white', padding: '1.5rem 0', boxShadow: 'var(--shadow-sm)' }}>
        <div className="container flex justify-between items-center">
          <div className="flex items-center gap-3">
            <Truck size={28} style={{ color: 'var(--color-secondary)' }} />
            <div>
              <h1 style={{ fontSize: '1.4rem', margin: 0, color: 'white', letterSpacing: '1px' }}>Logistics Partner</h1>
              <p style={{ fontSize: '0.75rem', color: '#ccc', margin: 0, fontFamily: 'var(--font-sans)' }}>Viraasat Supply Chain Network</p>
            </div>
          </div>
          
          <div className="flex items-center gap-6" style={{ fontFamily: 'var(--font-sans)', fontSize: '0.85rem', flexWrap: 'wrap' }}>
            {/* Active/Online Toggler */}
            <div 
              onClick={() => {
                setIsOnline(!isOnline);
                toast.success(`You are now ${!isOnline ? 'Online' : 'Offline'}`);
              }}
              style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '0.5rem', 
                background: isOnline ? 'rgba(76, 175, 80, 0.15)' : 'rgba(244, 67, 54, 0.15)', 
                padding: '0.5rem 1rem', 
                border: `1px solid ${isOnline ? '#4CAF50' : '#F44336'}`, 
                borderRadius: '2px', 
                cursor: 'pointer',
                transition: 'all 0.3s ease'
              }}
            >
              <div style={{ 
                width: '8px', 
                height: '8px', 
                borderRadius: '50%', 
                background: isOnline ? '#4CAF50' : '#F44336',
                boxShadow: isOnline ? '0 0 8px #4CAF50' : 'none'
              }}></div>
              <span style={{ fontSize: '0.75rem', fontWeight: 600, color: isOnline ? '#81C784' : '#E57373' }}>
                {isOnline ? 'ONLINE' : 'OFFLINE'}
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(255,255,255,0.1)', padding: '0.5rem 1rem', borderRadius: '2px' }}>
              <DollarSign size={16} style={{ color: 'var(--color-secondary)' }} />
              <span>Earnings Balance: <strong>₹{user?.balance?.toLocaleString()}</strong></span>
            </div>

            {/* Bell Icon for Notifications */}
            <div style={{ position: 'relative' }}>
              <button 
                onClick={() => setIsNotificationOpen(!isNotificationOpen)} 
                style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', background: 'none', border: 'none', padding: '8px' }}
              >
                <Bell size={20} style={{ strokeWidth: 1.5, color: 'white' }} />
                {unreadCount > 0 && (
                  <span style={{ 
                    position: 'absolute', 
                    top: '2px', 
                    right: '2px', 
                    background: '#D32F2F', 
                    color: 'white', 
                    borderRadius: '50%', 
                    width: '16px', 
                    height: '16px', 
                    fontSize: '0.6rem', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    fontWeight: '600'
                  }}>
                    {unreadCount}
                  </span>
                )}
              </button>

              {/* Notifications Dropdown */}
              {isNotificationOpen && (
                <div className="card animate-fade-in" style={{
                  position: 'absolute',
                  top: '2.5rem',
                  right: 0,
                  width: '320px',
                  backgroundColor: 'white',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-sm)',
                  boxShadow: 'var(--shadow-md)',
                  zIndex: 1000,
                  padding: '1.25rem',
                  maxHeight: '400px',
                  overflowY: 'auto',
                  textAlign: 'left'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--color-border)', paddingBottom: '0.75rem', marginBottom: '0.75rem' }}>
                    <span style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--color-text-main)' }}>Notifications</span>
                    {unreadCount > 0 && (
                      <button onClick={handleMarkAllRead} style={{ fontSize: '0.75rem', color: 'var(--color-secondary)', fontWeight: 500, background: 'none', border: 'none', cursor: 'pointer', outline: 'none' }}>Mark all as read</button>
                    )}
                  </div>
                  {derivedNotifications.length === 0 ? (
                    <p style={{ color: 'var(--color-text-muted)', fontSize: '0.8rem', textAlign: 'center', margin: '2rem 0' }}>No notifications yet</p>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                      {derivedNotifications.map((n) => {
                        const isUnread = !readNotifications.includes(n.id);
                        return (
                          <div key={n.id} style={{
                            padding: '0.75rem',
                            backgroundColor: isUnread ? '#FDFBF7' : 'transparent',
                            borderLeft: isUnread ? '3px solid var(--color-secondary)' : '1px solid var(--color-border)',
                            borderRadius: '2px',
                            fontSize: '0.8rem',
                            position: 'relative'
                          }}>
                            <p style={{ margin: 0, color: 'var(--color-text-main)', fontWeight: isUnread ? 500 : 300, lineHeight: 1.4 }}>{n.message}</p>
                            <span style={{ fontSize: '0.65rem', color: 'var(--color-text-muted)', marginTop: '0.25rem', display: 'block' }}>{n.time}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>

            <span style={{ color: '#ccc' }}>|</span>
            <button 
              onClick={() => {
                setProfileForm({ name: user.name, email: user.email });
                setIsProfileModalOpen(true);
              }}
              style={{ 
                color: 'var(--color-secondary)', 
                fontWeight: 600, 
                background: 'none',
                border: 'none',
                padding: 0,
                cursor: 'pointer',
                fontFamily: 'inherit',
                fontSize: 'inherit',
                display: 'flex',
                alignItems: 'center',
                gap: '0.25rem'
              }}
            >
              <User size={14} /> {user?.name}
            </button>
            <button onClick={logout} style={{ color: '#FF8A80', cursor: 'pointer' }}><LogOut size={20} /></button>
          </div>
        </div>
      </header>

      {/* Tab select bar */}
      <div style={{ borderBottom: '1px solid var(--color-border)', backgroundColor: 'var(--color-surface)' }}>
        <div className="container flex gap-6" style={{ padding: 0 }}>
          <button 
            onClick={() => setActiveTab('available')}
            style={{ 
              padding: '1.25rem 2rem', 
              fontSize: '0.8rem', 
              textTransform: 'uppercase', 
              letterSpacing: '1px',
              borderBottom: activeTab === 'available' ? '2px solid var(--color-secondary)' : 'none',
              fontWeight: activeTab === 'available' ? 600 : 400,
              color: activeTab === 'available' ? 'var(--color-secondary)' : 'var(--color-text-main)'
            }}
          >
            Available Shipments ({orders.filter(o => o.status === 'ACCEPTED' && !o.deliveryPartnerId).length})
          </button>
          <button 
            onClick={() => setActiveTab('active')}
            style={{ 
              padding: '1.25rem 2rem', 
              fontSize: '0.8rem', 
              textTransform: 'uppercase', 
              letterSpacing: '1px',
              borderBottom: activeTab === 'active' ? '2px solid var(--color-secondary)' : 'none',
              fontWeight: activeTab === 'active' ? 600 : 400,
              color: activeTab === 'active' ? 'var(--color-secondary)' : 'var(--color-text-main)'
            }}
          >
            My Active Deliveries ({orders.filter(o => o.deliveryPartnerId === user?.id && ['ACCEPTED', 'IN_TRANSIT'].includes(o.status)).length})
          </button>
          <button 
            onClick={() => setActiveTab('history')}
            style={{ 
              padding: '1.25rem 2rem', 
              fontSize: '0.8rem', 
              textTransform: 'uppercase', 
              letterSpacing: '1px',
              borderBottom: activeTab === 'history' ? '2px solid var(--color-secondary)' : 'none',
              fontWeight: activeTab === 'history' ? 600 : 400,
              color: activeTab === 'history' ? 'var(--color-secondary)' : 'var(--color-text-main)'
            }}
          >
            Earnings History ({orders.filter(o => o.deliveryPartnerId === user?.id && o.status === 'DELIVERED').length})
          </button>
        </div>
      </div>

      {/* Main Panel */}
      <main className="container" style={{ padding: '3rem 2rem 8rem', flex: 1 }}>
        
        {loading ? (
          <div style={{ textAlign: 'center', padding: '5rem 0', fontSize: '1.2rem', fontFamily: 'var(--font-serif)' }}>
            Loading shipments data...
          </div>
        ) : filteredOrders.length === 0 ? (
          <div style={{ 
            textAlign: 'center', 
            padding: '5rem 0', 
            border: '1px dashed var(--color-border)', 
            borderRadius: 'var(--radius-sm)',
            backgroundColor: 'var(--color-surface)'
          }}>
            <Clipboard size={48} style={{ color: 'var(--color-text-muted)', strokeWidth: 1, marginBottom: '1rem' }} />
            <p style={{ color: 'var(--color-text-muted)' }}>
              {activeTab === 'available' 
                ? 'No new saree packages ready for logistics pickup at this moment.' 
                : activeTab === 'active'
                  ? 'You do not have any active claimed shipments. Claim jobs in the Available tab!'
                  : 'You have not completed any deliveries yet. Completed jobs will accumulate earnings here.'}
            </p>
          </div>
        ) : (
          <div className="shipment-grid" style={{ gap: '2.5rem' }}>
            {filteredOrders.map((order) => (
              <div key={order.id} className="card" style={{ 
                border: '1px solid var(--color-border)', 
                borderRadius: 'var(--radius-sm)', 
                backgroundColor: 'var(--color-surface)',
                display: 'flex',
                flexDirection: 'column',
                boxShadow: 'var(--shadow-sm)'
              }}>
                {/* Header */}
                <div style={{ 
                  padding: '1.5rem', 
                  borderBottom: '1px solid var(--color-border)', 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center',
                  background: '#FAFAFA' 
                }}>
                  <div>
                    <span style={{ fontSize: '0.65rem', textTransform: 'uppercase', color: 'var(--color-text-muted)' }}>Batch Shipment</span>
                    <h3 style={{ fontSize: '1.15rem', margin: 0, fontFamily: 'var(--font-serif)' }}>
                      #ORD-{order.id.toString().padStart(5, '0')}
                    </h3>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span style={{ fontSize: '0.65rem', textTransform: 'uppercase', color: 'var(--color-text-muted)' }}>Logistics Pay</span>
                    <p style={{ fontSize: '1.15rem', fontWeight: 600, color: 'var(--color-secondary)', margin: 0 }}>₹150.00</p>
                  </div>
                </div>

                {/* Content Details */}
                <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem', flex: 1 }}>
                  
                  {/* Address cards */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', borderBottom: '1px solid var(--color-border)', paddingBottom: '1.25rem' }}>
                    <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
                      <MapPin size={18} style={{ color: 'var(--color-secondary)', flexShrink: 0, marginTop: '0.15rem' }} />
                      <div style={{ fontSize: '0.85rem' }}>
                        <strong style={{ textTransform: 'uppercase', fontSize: '0.7rem', color: 'var(--color-text-muted)', display: 'block' }}>Pickup Warehouse</strong>
                        <p style={{ fontWeight: 500, margin: '0.15rem 0' }}>{order.seller?.name}</p>
                        <p style={{ color: 'var(--color-text-muted)', fontSize: '0.8rem' }}>Varanasi Handloom Cluster, Uttar Pradesh</p>
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
                       <MapPin size={18} style={{ color: '#0D47A1', flexShrink: 0, marginTop: '0.15rem' }} />
                       <div style={{ fontSize: '0.85rem' }}>
                         <strong style={{ textTransform: 'uppercase', fontSize: '0.7rem', color: 'var(--color-text-muted)', display: 'block' }}>Delivery Dropoff</strong>
                         <p style={{ fontWeight: 500, margin: '0.15rem 0' }}>{order.buyer?.name}</p>
                         <p style={{ color: 'var(--color-text-main)', fontSize: '0.85rem', fontWeight: 500, marginTop: '0.25rem' }}>
                           {order.address || 'Boutique Retail Point (Customer)'}
                         </p>
                       </div>
                     </div>
                  </div>

                  {/* Saree cargo description */}
                  <div>
                    <strong style={{ textTransform: 'uppercase', fontSize: '0.7rem', color: 'var(--color-text-muted)', display: 'block', marginBottom: '0.5rem' }}>
                      Shipment Cargo
                    </strong>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', background: '#F9F9F9', padding: '0.75rem 1rem', borderRadius: '2px' }}>
                      {order.items?.map((item) => (
                        <div key={item.id} className="flex justify-between" style={{ fontSize: '0.85rem' }}>
                          <span>{item.product?.title}</span>
                          <span style={{ fontWeight: 600 }}>x {item.quantity}</span>
                        </div>
                      ))}
                      <div className="flex justify-between" style={{ borderTop: '1px solid var(--color-border)', paddingTop: '0.5rem', fontSize: '0.85rem', fontWeight: 600 }}>
                        <span>Total Weight Category:</span>
                        <span>Bulk Box ({order.items?.reduce((sum, i) => sum + i.quantity, 0)} sarees)</span>
                      </div>
                    </div>
                  </div>

                  {/* Date details */}
                  <div className="flex justify-between" style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginTop: 'auto', paddingTop: '0.5rem' }}>
                    <span className="flex items-center gap-1"><Calendar size={14} /> Created: {new Date(order.createdAt).toLocaleDateString()}</span>
                    <span>Status: <strong style={{ color: 'var(--color-text-main)', textTransform: 'uppercase' }}>{order.status}</strong></span>
                  </div>
                </div>

                {/* Actions */}
                <div style={{ padding: '1.5rem', borderTop: '1px solid var(--color-border)', background: '#FAFAFA' }}>
                  {activeTab === 'available' && (
                    <button 
                      onClick={() => handleUpdateStatus(order.id, 'ACCEPTED')}
                      className="btn-primary" 
                      style={{ width: '100%', padding: '0.85rem' }}
                    >
                      Accept Logistics Claim
                    </button>
                  )}

                  {activeTab === 'active' && order.status === 'ACCEPTED' && (
                    <button 
                      onClick={() => handleUpdateStatus(order.id, 'IN_TRANSIT')}
                      className="btn-primary" 
                      style={{ width: '100%', padding: '0.85rem', backgroundColor: 'var(--color-secondary)', borderColor: 'var(--color-secondary)' }}
                    >
                      Confirm Package Picked Up
                    </button>
                  )}

                  {activeTab === 'active' && order.status === 'IN_TRANSIT' && (
                    <button 
                      onClick={() => {
                        setSelectedOrderIdForDelivery(order.id);
                        setOtpCode('');
                        setPhotoProofUploaded(false);
                        setSignatureDrawn(false);
                        setCanvasCleared(true);
                        setIsDeliveryModalOpen(true);
                      }}
                      className="btn-primary" 
                      style={{ width: '100%', padding: '0.85rem', backgroundColor: 'green', borderColor: 'green' }}
                    >
                      Confirm Package Delivered
                    </button>
                  )}

                  {activeTab === 'history' && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'green', fontSize: '0.85rem', fontWeight: 600, justifyContent: 'center' }}>
                      <CheckCircle size={18} /> Delivery Completed & Settled
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Profile Modal */}
      {isProfileModalOpen && (
        <div style={{ 
          position: 'fixed', 
          inset: 0, 
          backgroundColor: 'rgba(0,0,0,0.5)', 
          zIndex: 200, 
          display: 'flex', 
          justifyContent: 'center',
          alignItems: 'center',
          backdropFilter: 'blur(3px)',
          padding: '2rem'
        }}>
          <div className="card animate-fade-in" style={{ 
            width: '100%', 
            maxWidth: '450px', 
            padding: '3rem', 
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--color-border)',
            position: 'relative'
          }}>
            <button 
              onClick={() => { setIsProfileModalOpen(false); setIsEditingProfile(false); }} 
              style={{ position: 'absolute', right: '1.5rem', top: '1.5rem', color: 'var(--color-text-main)' }}
            >
              <X size={20} />
            </button>
            
            <h2 style={{ fontSize: '1.8rem', marginBottom: '1.5rem', textTransform: 'uppercase', letterSpacing: '1px' }}>
              My Profile
            </h2>
            
            {profileError && (
              <div style={{ color: 'red', fontSize: '0.85rem', marginBottom: '1rem', padding: '0.5rem', background: '#FEEBEE', border: '1px solid #FFCDD2' }}>
                {profileError}
              </div>
            )}

            {!isEditingProfile ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', fontSize: '0.9rem', color: 'var(--color-text-main)', textAlign: 'left' }}>
                <div>
                  <span style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Full Name</span>
                  <p style={{ fontWeight: 500, fontSize: '1.1rem', margin: '0.25rem 0 0 0' }}>{user?.name}</p>
                </div>
                
                <div>
                  <span style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Email Address</span>
                  <p style={{ fontWeight: 500, margin: '0.25rem 0 0 0' }}>{user?.email}</p>
                </div>

                <div>
                  <span style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Account Role</span>
                  <p style={{ fontWeight: 500, margin: '0.25rem 0 0 0' }}>{user?.role}</p>
                </div>
                
                {user?.role === 'DELIVERY' && (
                  <div>
                    <span style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Earnings Balance</span>
                    <p style={{ fontWeight: 600, color: 'var(--color-secondary)', fontSize: '1.2rem', margin: '0.25rem 0 0 0' }}>₹{user.balance?.toLocaleString()}</p>
                  </div>
                )}

                <button 
                  onClick={() => setIsEditingProfile(true)} 
                  className="btn-primary" 
                  style={{ marginTop: '1.5rem', padding: '0.85rem', width: '100%' }}
                >
                  Edit Profile
                </button>
              </div>
            ) : (
              <form onSubmit={handleProfileSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', textAlign: 'left' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.75rem', fontWeight: 500, textTransform: 'uppercase' }}>Full Name</label>
                  <input 
                    type="text" 
                    required
                    value={profileForm.name}
                    onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
                    style={{ width: '100%', padding: '0.75rem', border: '1px solid var(--color-border)', outline: 'none' }}
                  />
                </div>
                
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.75rem', fontWeight: 500, textTransform: 'uppercase' }}>Email Address</label>
                  <input 
                    type="email" 
                    required
                    value={profileForm.email}
                    onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
                    style={{ width: '100%', padding: '0.75rem', border: '1px solid var(--color-border)', outline: 'none' }}
                  />
                </div>

                <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
                  <button 
                    type="button" 
                    onClick={() => setIsEditingProfile(false)} 
                    className="btn-secondary" 
                    style={{ flex: 1, padding: '0.85rem', fontSize: '0.75rem' }}
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    className="btn-primary" 
                    disabled={profileSaving}
                    style={{ flex: 1, padding: '0.85rem', fontSize: '0.75rem', opacity: profileSaving ? 0.7 : 1 }}
                  >
                    {profileSaving ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </form>
             )}
          </div>
        </div>
      )}

      {/* Delivery Proof & Verification Modal */}
      {isDeliveryModalOpen && (
        <div style={{ 
          position: 'fixed', 
          inset: 0, 
          backgroundColor: 'rgba(0,0,0,0.6)', 
          zIndex: 300, 
          display: 'flex', 
          justifyContent: 'center',
          alignItems: 'center',
          backdropFilter: 'blur(4px)',
          padding: '1.5rem'
        }}>
          <div className="card animate-fade-in" style={{ 
            width: '100%', 
            maxWidth: '480px', 
            padding: '2.5rem 2rem', 
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--color-border)',
            position: 'relative',
            backgroundColor: 'white',
            maxHeight: '90vh',
            overflowY: 'auto'
          }}>
            <button 
              onClick={() => setIsDeliveryModalOpen(false)} 
              style={{ position: 'absolute', right: '1.5rem', top: '1.5rem', color: 'var(--color-text-main)', background: 'none', border: 'none', cursor: 'pointer' }}
            >
              <X size={20} />
            </button>
            
            <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
              <Truck size={36} style={{ color: 'var(--color-secondary)', marginBottom: '0.5rem' }} />
              <h2 style={{ fontSize: '1.5rem', fontFamily: 'var(--font-serif)', margin: 0 }}>
                Delivery Completion Proof
              </h2>
              <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', margin: '0.25rem 0 0 0' }}>
                Verify package handover for Batch #ORD-{selectedOrderIdForDelivery?.toString().padStart(5, '0')}
              </p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', textAlign: 'left' }}>
              
              {/* Step 1: Photo proof */}
              <div style={{ borderBottom: '1px solid #eee', paddingBottom: '1.25rem' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '0.5rem' }}>
                  Step 1: Handover Photo Proof
                </span>
                {!photoProofUploaded ? (
                  <button
                    type="button"
                    onClick={() => {
                      setPhotoProofUploaded(true);
                      toast.success('Mock photo proof captured successfully!');
                    }}
                    style={{
                      width: '100%',
                      padding: '1rem',
                      border: '1px dashed var(--color-secondary)',
                      background: 'rgba(197, 160, 89, 0.05)',
                      color: 'var(--color-secondary)',
                      fontWeight: 600,
                      fontSize: '0.8rem',
                      cursor: 'pointer',
                      borderRadius: '4px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.5rem'
                    }}
                  >
                    Take Photo / Upload Image proof
                  </button>
                ) : (
                  <div style={{
                    padding: '0.75rem 1rem',
                    background: '#E8F5E9',
                    border: '1px solid #A5D6A7',
                    borderRadius: '4px',
                    color: '#2E7D32',
                    fontSize: '0.8rem',
                    fontWeight: 500,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                  }}>
                    <span>✓ Photo proof captured (mock_saree_handover.jpg)</span>
                    <button 
                      onClick={() => setPhotoProofUploaded(false)}
                      style={{ background: 'none', border: 'none', color: '#D32F2F', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer' }}
                    >
                      Retake
                    </button>
                  </div>
                )}
              </div>

              {/* Step 2: OTP Verification */}
              <div style={{ borderBottom: '1px solid #eee', paddingBottom: '1.25rem' }}>
                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '0.5rem' }}>
                  Step 2: Retailer Security OTP
                </label>
                <input
                  type="text"
                  maxLength={4}
                  placeholder="Enter 4-digit code (Use 1234)"
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                  style={{
                    width: '100%',
                    padding: '0.85rem',
                    fontSize: '0.9rem',
                    border: '1px solid var(--color-border)',
                    outline: 'none',
                    borderRadius: '2px',
                    letterSpacing: '4px',
                    textAlign: 'center'
                  }}
                />
              </div>

              {/* Step 3: Draw digital signature */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>
                    Step 3: Retailer Digital Signature
                  </span>
                  {signatureDrawn && (
                    <button 
                      onClick={() => {
                        const canvas = document.getElementById('signature-canvas');
                        if (canvas) {
                          const ctx = canvas.getContext('2d');
                          ctx.clearRect(0, 0, canvas.width, canvas.height);
                          setSignatureDrawn(false);
                          setCanvasCleared(true);
                        }
                      }}
                      style={{ background: 'none', border: 'none', color: '#D32F2F', fontSize: '0.7rem', fontWeight: 600, cursor: 'pointer' }}
                    >
                      Clear
                    </button>
                  )}
                </div>
                
                <div style={{ border: '1px solid var(--color-border)', borderRadius: '4px', overflow: 'hidden', background: '#FAFAFA' }}>
                  <canvas
                    id="signature-canvas"
                    width={400}
                    height={120}
                    onMouseDown={(e) => {
                      const canvas = e.target;
                      const ctx = canvas.getContext('2d');
                      ctx.lineWidth = 3;
                      ctx.lineCap = 'round';
                      ctx.strokeStyle = '#1A1A1A';
                      const rect = canvas.getBoundingClientRect();
                      ctx.beginPath();
                      ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
                      canvas.isDrawing = true;
                    }}
                    onMouseMove={(e) => {
                      const canvas = e.target;
                      if (!canvas.isDrawing) return;
                      const ctx = canvas.getContext('2d');
                      const rect = canvas.getBoundingClientRect();
                      ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
                      ctx.stroke();
                      setSignatureDrawn(true);
                      setCanvasCleared(false);
                    }}
                    onMouseUp={(e) => { e.target.isDrawing = false; }}
                    onMouseLeave={(e) => { e.target.isDrawing = false; }}
                    onTouchStart={(e) => {
                      const canvas = e.target;
                      const ctx = canvas.getContext('2d');
                      ctx.lineWidth = 3;
                      ctx.lineCap = 'round';
                      ctx.strokeStyle = '#1A1A1A';
                      const rect = canvas.getBoundingClientRect();
                      const touch = e.touches[0];
                      ctx.beginPath();
                      ctx.moveTo(touch.clientX - rect.left, touch.clientY - rect.top);
                      canvas.isDrawing = true;
                    }}
                    onTouchMove={(e) => {
                      const canvas = e.target;
                      if (!canvas.isDrawing) return;
                      const ctx = canvas.getContext('2d');
                      const rect = canvas.getBoundingClientRect();
                      const touch = e.touches[0];
                      ctx.lineTo(touch.clientX - rect.left, touch.clientY - rect.top);
                      ctx.stroke();
                      setSignatureDrawn(true);
                      setCanvasCleared(false);
                    }}
                    onTouchEnd={(e) => { e.target.isDrawing = false; }}
                    style={{ width: '100%', height: '120px', display: 'block', cursor: 'crosshair' }}
                  />
                </div>
                <p style={{ fontSize: '0.65rem', color: 'var(--color-text-muted)', marginTop: '0.35rem', textAlign: 'center' }}>
                  Draw signature inside the box using touch or mouse pointer
                </p>
              </div>

              {/* Action buttons */}
              <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                <button 
                  type="button" 
                  onClick={() => setIsDeliveryModalOpen(false)} 
                  className="btn-secondary" 
                  style={{ flex: 1, padding: '0.85rem', fontSize: '0.75rem' }}
                >
                  Cancel
                </button>
                <button 
                  type="button" 
                  onClick={() => {
                    if (!photoProofUploaded) {
                      toast.error('Please capture/upload photo proof of delivery.');
                      return;
                    }
                    if (otpCode !== '1234') {
                      toast.error('Invalid security OTP code. Please ask the retailer for the correct OTP (1234).');
                      return;
                    }
                    if (!signatureDrawn) {
                      toast.error('Please have the retailer sign to confirm delivery.');
                      return;
                    }
                    
                    // Call update status
                    handleUpdateStatus(selectedOrderIdForDelivery, 'DELIVERED');
                    setIsDeliveryModalOpen(false);
                  }}
                  className="btn-primary" 
                  style={{ flex: 1, padding: '0.85rem', fontSize: '0.75rem', backgroundColor: 'green', borderColor: 'green' }}
                >
                  Verify & Settle Payout
                </button>
              </div>

            </div>
          </div>
        </div>
      )}
    </div>
  );
}
