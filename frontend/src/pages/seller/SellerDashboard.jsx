import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Link, useNavigate } from 'react-router-dom';
import { useToast } from '../../context/ToastContext';
import { 
  Package, ShoppingCart, Users, Layers, TrendingUp, LogOut, CheckCircle, XCircle, 
  Plus, Edit2, Trash2, ShieldAlert, Award, CreditCard, Filter, AlertCircle,
  User, X, Bell
} from 'lucide-react';

export default function SellerDashboard({ isAdmin = false }) {
  const navigate = useNavigate();
  const { user, token, logout, refreshUser } = useAuth();
  const { toast } = useToast();
  
  // Tabs
  const [activeTab, setActiveTab] = useState(isAdmin ? 'stats' : 'products');

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
      const res = await fetch('http://localhost:5000/api/auth/profile', {
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

  // Common Data States
  const [categories, setCategories] = useState([]);
  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]);

  // Notification State
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [readNotifications, setReadNotifications] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('read_notifications_seller') || '[]');
    } catch {
      return [];
    }
  });

  const derivedNotifications = isAdmin 
    ? (products || [])
        .filter(p => !p.isApproved)
        .map(p => ({
          id: `admin-prod-${p.id}`,
          message: `New saree "${p.title}" submitted by weaver ${p.seller?.name || `ID: ${p.sellerId}`} requires approval.`,
          time: new Date(p.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          type: 'approval'
        }))
    : (orders || [])
        .map(o => {
          let msg = '';
          if (o.status === 'PENDING') msg = `New bulk order #ORD-${o.id.toString().padStart(5, '0')} received.`;
          else if (o.status === 'ACCEPTED') msg = `Order #ORD-${o.id.toString().padStart(5, '0')} accepted. Awaiting logistics pickup.`;
          else if (o.status === 'DELIVERED') msg = `Order #ORD-${o.id.toString().padStart(5, '0')} has been delivered. Earnings settled.`;
          return {
            id: `seller-order-${o.id}-${o.status}`,
            message: msg,
            time: new Date(o.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            type: o.status
          };
        })
        .filter(n => n.message !== '');

  const handleMarkAllRead = () => {
    const allIds = derivedNotifications.map(n => n.id);
    setReadNotifications(allIds);
    localStorage.setItem('read_notifications_seller', JSON.stringify(allIds));
  };

  const unreadCount = derivedNotifications.filter(n => !readNotifications.includes(n.id)).length;

  // Admin-Specific States
  const [usersList, setUsersList] = useState([]);
  const [platformStats, setPlatformStats] = useState(null);
  const [newCategoryName, setNewCategoryName] = useState('');

  // Modals & Forms
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [productForm, setProductForm] = useState({
    title: '',
    description: '',
    price: '',
    wholesalePrice: '',
    bulkThreshold: 5,
    stock: 10,
    categoryId: '',
    imageUrl: '/hero.png'
  });

  // Commission Edit State
  const [editingCommissionRate, setEditingCommissionRate] = useState({});

  useEffect(() => {
    fetchCommonData();
    if (isAdmin) {
      fetchAdminData();
    } else {
      fetchSellerProducts();
    }
  }, [activeTab, isAdmin]);

  const fetchCommonData = async () => {
    try {
      // Fetch categories
      const catRes = await fetch('http://localhost:5000/api/categories');
      if (catRes.ok) setCategories(await catRes.json());

      // Fetch orders (filtered by role by backend)
      const orderRes = await fetch('http://localhost:5000/api/orders', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (orderRes.ok) setOrders(await orderRes.json());
      
      // Refresh logged in user profile (balance)
      refreshUser();
    } catch (err) {
      console.error('Error fetching common data:', err);
    }
  };

  const fetchSellerProducts = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/products/seller', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) setProducts(await res.json());
    } catch (err) {
      console.error('Error fetching products:', err);
    }
  };

  const fetchAdminData = async () => {
    try {
      // Fetch stats
      const statsRes = await fetch('http://localhost:5000/api/admin/transactions', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (statsRes.ok) setPlatformStats(await statsRes.json());

      // Fetch users
      const usersRes = await fetch('http://localhost:5000/api/admin/users', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (usersRes.ok) setUsersList(await usersRes.json());

      // Fetch all products for admin view
      const prodRes = await fetch('http://localhost:5000/api/products/seller', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (prodRes.ok) setProducts(await prodRes.json());
    } catch (err) {
      console.error('Error fetching admin data:', err);
    }
  };

  // Product CRUD
  const handleProductSubmit = async (e) => {
    e.preventDefault();
    try {
      const url = editingProduct 
        ? `http://localhost:5000/api/products/${editingProduct.id}` 
        : 'http://localhost:5000/api/products';
      const method = editingProduct ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(productForm)
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save product');

      if (editingProduct) {
        if (data.isApproved) {
          toast.success('Product stock / threshold updated successfully!');
        } else {
          toast.success('Product details updated! (Requires Admin re-approval)');
        }
      } else {
        toast.success('Product added successfully! (Pending Admin approval)');
      }
      setIsProductModalOpen(false);
      setEditingProduct(null);
      resetProductForm();
      fetchSellerProducts();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleEditProductClick = (product) => {
    setEditingProduct(product);
    setProductForm({
      title: product.title,
      description: product.description,
      price: product.price,
      wholesalePrice: product.wholesalePrice,
      bulkThreshold: product.bulkThreshold,
      stock: product.stock,
      categoryId: product.categoryId.toString(),
      imageUrl: product.imageUrl || '/hero.png'
    });
    setIsProductModalOpen(true);
  };

  const handleDeleteProduct = async (id) => {
    if (!window.confirm('Are you sure you want to delete this saree?')) return;
    try {
      const res = await fetch(`http://localhost:5000/api/products/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        toast.success('Product deleted successfully');
        fetchSellerProducts();
      } else {
        const data = await res.json();
        toast.error(data.error || 'Failed to delete product');
      }
    } catch (err) {
      console.error('Error deleting product:', err);
    }
  };

  const resetProductForm = () => {
    setProductForm({
      title: '',
      description: '',
      price: '',
      wholesalePrice: '',
      bulkThreshold: 5,
      stock: 10,
      categoryId: categories[0]?.id.toString() || '',
      imageUrl: '/hero.png'
    });
  };

  // Order Accept / Reject (Seller)
  const handleOrderStatusUpdate = async (orderId, status) => {
    try {
      const res = await fetch(`http://localhost:5000/api/orders/${orderId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update order status');

      toast.success(`Order successfully ${status === 'ACCEPTED' ? 'accepted' : 'rejected'}.`);
      fetchCommonData();
    } catch (err) {
      toast.error(err.message);
    }
  };

  // Admin Actions
  const handleApproveProduct = async (id, approve) => {
    try {
      const res = await fetch(`http://localhost:5000/api/products/${id}/approve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ approve })
      });

      if (res.ok) {
        toast.success(`Product ${approve ? 'approved' : 'rejected'} successfully.`);
        fetchAdminData();
      } else {
        const data = await res.json();
        toast.error(data.error || 'Approval failed');
      }
    } catch (err) {
      console.error('Error approving product:', err);
    }
  };

  const handleApproveUser = async (id, approve, rate) => {
    try {
      const payload = { approve };
      if (rate !== undefined) {
        payload.commissionRate = parseFloat(rate);
      }

      const res = await fetch(`http://localhost:5000/api/admin/users/${id}/approve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        toast.success(`User status updated successfully.`);
        fetchAdminData();
      } else {
        const data = await res.json();
        toast.error(data.error || 'User approval failed');
      }
    } catch (err) {
      console.error('Error approving user:', err);
    }
  };

  const handleAddCategory = async (e) => {
    e.preventDefault();
    if (!newCategoryName.trim()) return;

    try {
      const res = await fetch('http://localhost:5000/api/categories', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ name: newCategoryName })
      });

      if (res.ok) {
        toast.success('New product category created.');
        setNewCategoryName('');
        fetchCommonData();
      } else {
        const data = await res.json();
        toast.error(data.error || 'Failed to create category');
      }
    } catch (err) {
      console.error('Error creating category:', err);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'PENDING': return { bg: '#FFF3CD', text: '#856404' };
      case 'ACCEPTED': return { bg: '#D1ECF1', text: '#0C5460' };
      case 'IN_TRANSIT': return { bg: '#E2E3E5', text: '#383D41' };
      case 'DELIVERED': return { bg: '#D4EDDA', text: '#155724' };
      case 'REJECTED': return { bg: '#F8D7DA', text: '#721C24' };
      default: return { bg: '#E2E3E5', text: '#383D41' };
    }
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--color-background)' }}>
      {/* Sidebar */}
      <aside style={{ 
        width: '260px', 
        background: 'var(--color-primary)', 
        color: 'white', 
        padding: '2.5rem 1.5rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '2.5rem',
        flexShrink: 0
      }}>
        <div style={{ paddingLeft: '0.5rem' }}>
          <h2 style={{ color: 'white', fontSize: '1.6rem', letterSpacing: '2px', textTransform: 'uppercase', margin: 0 }}>
            Viraasat
          </h2>
          <p style={{ color: 'var(--color-secondary)', fontSize: '0.75rem', letterSpacing: '1px', textTransform: 'uppercase', marginTop: '0.25rem' }}>
            {isAdmin ? 'Admin Console' : 'Weaver Dashboard'}
          </p>
        </div>

        <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', flex: 1 }}>
          {isAdmin ? (
            <>
              <button 
                onClick={() => setActiveTab('stats')}
                style={{ 
                  display: 'flex', alignItems: 'center', gap: '1rem', width: '100%', 
                  padding: '0.85rem 1rem', borderRadius: 'var(--radius-sm)', fontSize: '0.85rem',
                  color: activeTab === 'stats' ? 'var(--color-primary)' : 'white',
                  background: activeTab === 'stats' ? 'white' : 'transparent',
                  textAlign: 'left', fontWeight: activeTab === 'stats' ? '600' : '400'
                }}
              >
                <TrendingUp size={18} /> Platform Stats
              </button>
              <button 
                onClick={() => setActiveTab('users')}
                style={{ 
                  display: 'flex', alignItems: 'center', gap: '1rem', width: '100%', 
                  padding: '0.85rem 1rem', borderRadius: 'var(--radius-sm)', fontSize: '0.85rem',
                  color: activeTab === 'users' ? 'var(--color-primary)' : 'white',
                  background: activeTab === 'users' ? 'white' : 'transparent',
                  textAlign: 'left', fontWeight: activeTab === 'users' ? '600' : '400'
                }}
              >
                <Users size={18} /> Manage Partners
              </button>
              <button 
                onClick={() => setActiveTab('products')}
                style={{ 
                  display: 'flex', alignItems: 'center', gap: '1rem', width: '100%', 
                  padding: '0.85rem 1rem', borderRadius: 'var(--radius-sm)', fontSize: '0.85rem',
                  color: activeTab === 'products' ? 'var(--color-primary)' : 'white',
                  background: activeTab === 'products' ? 'white' : 'transparent',
                  textAlign: 'left', fontWeight: activeTab === 'products' ? '600' : '400'
                }}
              >
                <Package size={18} /> Verify Sarees
              </button>
              <button 
                onClick={() => setActiveTab('categories')}
                style={{ 
                  display: 'flex', alignItems: 'center', gap: '1rem', width: '100%', 
                  padding: '0.85rem 1rem', borderRadius: 'var(--radius-sm)', fontSize: '0.85rem',
                  color: activeTab === 'categories' ? 'var(--color-primary)' : 'white',
                  background: activeTab === 'categories' ? 'white' : 'transparent',
                  textAlign: 'left', fontWeight: activeTab === 'categories' ? '600' : '400'
                }}
              >
                <Layers size={18} /> Categories
              </button>
            </>
          ) : (
            <>
              <button 
                onClick={() => setActiveTab('products')}
                style={{ 
                  display: 'flex', alignItems: 'center', gap: '1rem', width: '100%', 
                  padding: '0.85rem 1rem', borderRadius: 'var(--radius-sm)', fontSize: '0.85rem',
                  color: activeTab === 'products' ? 'var(--color-primary)' : 'white',
                  background: activeTab === 'products' ? 'white' : 'transparent',
                  textAlign: 'left', fontWeight: activeTab === 'products' ? '600' : '400'
                }}
              >
                <Package size={18} /> My Saree Inventory
              </button>
              <button 
                onClick={() => setActiveTab('orders')}
                style={{ 
                  display: 'flex', alignItems: 'center', gap: '1rem', width: '100%', 
                  padding: '0.85rem 1rem', borderRadius: 'var(--radius-sm)', fontSize: '0.85rem',
                  color: activeTab === 'orders' ? 'var(--color-primary)' : 'white',
                  background: activeTab === 'orders' ? 'white' : 'transparent',
                  textAlign: 'left', fontWeight: activeTab === 'orders' ? '600' : '400'
                }}
              >
                <ShoppingCart size={18} /> Wholesale Orders ({orders.filter(o => o.status === 'PENDING').length} new)
              </button>
            </>
          )}

          <div style={{ marginTop: 'auto', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '1.5rem' }}>
            <Link to="/" style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.5rem 1rem' }}>
              View Storefront
            </Link>
            <button onClick={logout} style={{ color: '#FF8A80', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '1rem', width: '100%', padding: '0.85rem 1rem', textAlign: 'left' }}>
              <LogOut size={18} /> Log Out
            </button>
          </div>
        </nav>
      </aside>

      {/* Main Content */}
      <main style={{ flex: 1, padding: '3.5rem', overflowY: 'auto' }}>
        
        {/* Header */}
        <header className="flex justify-between items-center" style={{ marginBottom: '3.5rem' }}>
          <div>
            <h1 style={{ fontSize: '2.5rem', margin: 0 }}>
              {isAdmin ? 'Administration Suite' : 'Weaver Dashboard'}
            </h1>
            <p style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-sans)', fontSize: '0.85rem', marginTop: '0.25rem' }}>
              Welcome back,{' '}
              <button 
                onClick={() => {
                  setProfileForm({ name: user.name, email: user.email });
                  setIsProfileModalOpen(true);
                }}
                style={{ 
                  color: 'var(--color-secondary)', 
                  fontWeight: 600, 
                  textDecoration: 'underline',
                  background: 'none',
                  border: 'none',
                  padding: 0,
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  fontSize: 'inherit',
                  display: 'inline'
                }}
              >
                {user?.name}
              </button>.
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
            {/* Bell Icon for Notifications */}
            <div style={{ position: 'relative' }}>
              <button 
                onClick={() => setIsNotificationOpen(!isNotificationOpen)} 
                style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', background: 'none', border: 'none', padding: '8px' }}
              >
                <Bell size={20} style={{ strokeWidth: 1.5, color: 'var(--color-primary)' }} />
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
                    <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>Notifications</span>
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

            {!isAdmin && (
              <div style={{ display: 'flex', gap: '1.5rem' }}>
                <div className="card" style={{ padding: '0.75rem 1.5rem', display: 'flex', alignItems: 'center', gap: '1rem', border: '1px solid var(--color-border)' }}>
                  <CreditCard size={18} style={{ color: 'var(--color-secondary)' }} />
                  <div>
                    <span style={{ fontSize: '0.65rem', textTransform: 'uppercase', color: 'var(--color-text-muted)' }}>Weaver Balance</span>
                    <p style={{ fontWeight: 600, color: 'var(--color-secondary)' }}>₹{user?.balance?.toLocaleString()}</p>
                  </div>
                </div>
                
                <div className="card" style={{ padding: '0.75rem 1.5rem', display: 'flex', alignItems: 'center', gap: '1rem', border: '1px solid var(--color-border)' }}>
                  <Award size={18} style={{ color: 'var(--color-secondary)' }} />
                  <div>
                    <span style={{ fontSize: '0.65rem', textTransform: 'uppercase', color: 'var(--color-text-muted)' }}>Platform Fee</span>
                    <p style={{ fontWeight: 600 }}>{user?.commissionRate}%</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </header>

        {/* ==========================================
            TAB: ADMIN STATS
            ========================================== */}
        {isAdmin && activeTab === 'stats' && platformStats && (
          <div className="animate-fade-in">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '2rem', marginBottom: '4rem' }}>
              <div className="card" style={{ border: '1px solid var(--color-border)', padding: '2rem' }}>
                <h3 style={{ color: 'var(--color-text-muted)', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '1px' }}>Platform Sales</h3>
                <p style={{ fontSize: '2.2rem', fontWeight: 600, color: 'var(--color-secondary)', marginTop: '0.5rem' }}>
                  ₹{platformStats.totalSales.toLocaleString()}
                </p>
              </div>
              <div className="card" style={{ border: '1px solid var(--color-border)', padding: '2rem' }}>
                <h3 style={{ color: 'var(--color-text-muted)', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '1px' }}>Platform Commission</h3>
                <p style={{ fontSize: '2.2rem', fontWeight: 600, color: 'var(--color-secondary)', marginTop: '0.5rem' }}>
                  ₹{platformStats.totalCommission.toLocaleString()}
                </p>
              </div>
              <div className="card" style={{ border: '1px solid var(--color-border)', padding: '2rem' }}>
                <h3 style={{ color: 'var(--color-text-muted)', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '1px' }}>Delivered Orders</h3>
                <p style={{ fontSize: '2.2rem', fontWeight: 600, marginTop: '0.5rem' }}>
                  {platformStats.deliveredOrdersCount} / {platformStats.totalOrdersCount}
                </p>
              </div>
              <div className="card" style={{ border: '1px solid var(--color-border)', padding: '2rem' }}>
                <h3 style={{ color: 'var(--color-text-muted)', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '1px' }}>Pending Bulk Value</h3>
                <p style={{ fontSize: '2.2rem', fontWeight: 600, marginTop: '0.5rem' }}>
                  ₹{platformStats.pendingSales.toLocaleString()}
                </p>
              </div>
            </div>

            <div className="card" style={{ border: '1px solid var(--color-border)', padding: '2.5rem' }}>
              <h2 style={{ marginBottom: '2rem', fontSize: '1.6rem' }}>All Platform Transactions</h2>
              
              {orders.length === 0 ? (
                <p style={{ color: 'var(--color-text-muted)' }}>No transactions recorded.</p>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--color-border)', color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>
                      <th style={{ padding: '1rem 0' }}>Order ID</th>
                      <th style={{ padding: '1rem 0' }}>Date</th>
                      <th style={{ padding: '1rem 0' }}>Weaver</th>
                      <th style={{ padding: '1rem 0' }}>Boutique (Buyer)</th>
                      <th style={{ padding: '1rem 0' }}>Amount</th>
                      <th style={{ padding: '1rem 0' }}>Commission Rate</th>
                      <th style={{ padding: '1rem 0' }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders.map((o) => (
                      <tr key={o.id} style={{ borderBottom: '1px solid #F5F5F5', fontSize: '0.9rem' }}>
                        <td style={{ padding: '1.25rem 0', fontWeight: '500' }}>#ORD-{o.id.toString().padStart(5, '0')}</td>
                        <td style={{ padding: '1.25rem 0' }}>{new Date(o.createdAt).toLocaleDateString()}</td>
                        <td style={{ padding: '1.25rem 0' }}>{o.seller?.name}</td>
                        <td style={{ padding: '1.25rem 0' }}>{o.buyer?.name}</td>
                        <td style={{ padding: '1.25rem 0', fontWeight: '500' }}>₹{o.totalAmount.toLocaleString()}</td>
                        <td style={{ padding: '1.25rem 0' }}>{o.seller?.commissionRate}%</td>
                        <td style={{ padding: '1.25rem 0' }}>
                          <span style={{ 
                            backgroundColor: getStatusColor(o.status).bg, 
                            color: getStatusColor(o.status).text, 
                            padding: '0.25rem 0.5rem', 
                            borderRadius: '2px', 
                            fontSize: '0.75rem',
                            fontWeight: '600'
                          }}>{o.status}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}

        {/* ==========================================
            TAB: ADMIN USER MANAGEMENT (WEAVERS / DELIVERY)
            ========================================== */}
        {isAdmin && activeTab === 'users' && (
          <div className="card animate-fade-in" style={{ border: '1px solid var(--color-border)', padding: '2.5rem' }}>
            <h2 style={{ marginBottom: '2rem', fontSize: '1.6rem' }}>B2B Wholesale Partners</h2>
            
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--color-border)', color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>
                  <th style={{ padding: '1rem 0' }}>Name</th>
                  <th style={{ padding: '1rem 0' }}>Email</th>
                  <th style={{ padding: '1rem 0' }}>Role</th>
                  <th style={{ padding: '1rem 0' }}>Approved State</th>
                  <th style={{ padding: '1rem 0' }}>Balance</th>
                  <th style={{ padding: '1rem 0' }}>Commission Rate</th>
                  <th style={{ padding: '1rem 0', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {usersList.filter(u => u.role !== 'ADMIN').map((partner) => (
                  <tr key={partner.id} style={{ borderBottom: '1px solid #F5F5F5', fontSize: '0.9rem' }}>
                    <td style={{ padding: '1.25rem 0', fontWeight: '500' }}>{partner.name}</td>
                    <td style={{ padding: '1.25rem 0' }}>{partner.email}</td>
                    <td style={{ padding: '1.25rem 0' }}>
                      <span style={{ 
                        fontSize: '0.75rem', fontWeight: 600, padding: '0.1rem 0.4rem', 
                        borderRadius: '2px', backgroundColor: partner.role === 'SELLER' ? '#E1BEE7' : partner.role === 'DELIVERY' ? '#B2DFDB' : '#ECEFF1',
                        color: partner.role === 'SELLER' ? '#4A148C' : partner.role === 'DELIVERY' ? '#004D40' : '#37474F'
                      }}>{partner.role}</span>
                    </td>
                    <td style={{ padding: '1.25rem 0' }}>
                      {partner.isApproved ? (
                        <span style={{ color: 'green', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                          <CheckCircle size={16} /> Approved
                        </span>
                      ) : (
                        <span style={{ color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                          <XCircle size={16} /> Blocked/Pending
                        </span>
                      )}
                    </td>
                    <td style={{ padding: '1.25rem 0' }}>₹{partner.balance.toLocaleString()}</td>
                    <td style={{ padding: '1.25rem 0' }}>
                      {partner.role === 'SELLER' ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <input 
                            type="number"
                            step="0.1"
                            value={editingCommissionRate[partner.id] !== undefined ? editingCommissionRate[partner.id] : partner.commissionRate}
                            onChange={(e) => setEditingCommissionRate({
                              ...editingCommissionRate,
                              [partner.id]: e.target.value
                            })}
                            style={{ width: '60px', padding: '0.25rem', border: '1px solid var(--color-border)', borderRadius: '2px' }}
                          />
                          <span>%</span>
                          <button 
                            onClick={() => handleApproveUser(partner.id, partner.isApproved, editingCommissionRate[partner.id])}
                            style={{ fontSize: '0.75rem', color: 'var(--color-secondary)', textDecoration: 'underline' }}
                          >
                            Save
                          </button>
                        </div>
                      ) : '-'}
                    </td>
                    <td style={{ padding: '1.25rem 0', textAlign: 'right' }}>
                      {partner.isApproved ? (
                        <button 
                          onClick={() => handleApproveUser(partner.id, false)}
                          style={{ padding: '0.4rem 0.85rem', backgroundColor: '#FFEBEE', color: '#C62828', borderRadius: '2px', fontSize: '0.8rem' }}
                        >
                          Revoke Approval
                        </button>
                      ) : (
                        <button 
                          onClick={() => handleApproveUser(partner.id, true)}
                          style={{ padding: '0.4rem 0.85rem', backgroundColor: '#E8F5E9', color: '#2E7D32', borderRadius: '2px', fontSize: '0.8rem', fontWeight: 600 }}
                        >
                          Approve Partner
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* ==========================================
            TAB: ADMIN / SELLER PRODUCTS (INVENTORY)
            ========================================== */}
        {activeTab === 'products' && (
          <div className="animate-fade-in">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
              <h2 style={{ fontSize: '1.6rem' }}>
                {isAdmin ? 'Verify Weaver Saree Additions' : 'My Saree Catalogue'}
              </h2>
              {!isAdmin && (
                <button 
                  onClick={() => { setEditingProduct(null); resetProductForm(); setIsProductModalOpen(true); }}
                  className="btn-primary" 
                  style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 1.5rem', fontSize: '0.75rem' }}
                >
                  <Plus size={16} /> Add New Saree
                </button>
              )}
            </div>

            <div className="card" style={{ border: '1px solid var(--color-border)', padding: '2.5rem' }}>
              {products.length === 0 ? (
                <p style={{ color: 'var(--color-text-muted)' }}>No products found in this category.</p>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--color-border)', color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>
                      <th style={{ padding: '1rem 0' }}>Saree Preview</th>
                      <th style={{ padding: '1rem 0' }}>Title</th>
                      {isAdmin && <th style={{ padding: '1rem 0' }}>Weaver (Seller)</th>}
                      <th style={{ padding: '1rem 0' }}>Category</th>
                      <th style={{ padding: '1rem 0' }}>Stock</th>
                      <th style={{ padding: '1rem 0' }}>Retail price</th>
                      <th style={{ padding: '1rem 0' }}>Wholesale Price</th>
                      <th style={{ padding: '1rem 0' }}>Bulk Min.</th>
                      <th style={{ padding: '1rem 0' }}>Verification Status</th>
                      <th style={{ padding: '1rem 0', textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {products.map((p) => (
                      <tr key={p.id} style={{ borderBottom: '1px solid #F5F5F5', fontSize: '0.9rem' }}>
                        <td style={{ padding: '1rem 0' }}>
                          <div style={{ 
                            width: '45px', 
                            height: '55px', 
                            background: `url("${p.imageUrl || '/hero.png'}") center/cover no-repeat`,
                            border: '1px solid var(--color-border)' 
                          }}></div>
                        </td>
                        <td style={{ padding: '1.25rem 0', fontWeight: '500' }}>{p.title}</td>
                        {isAdmin && <td style={{ padding: '1.25rem 0' }}>{p.seller?.name || `ID: ${p.sellerId}`}</td>}
                        <td style={{ padding: '1.25rem 0' }}>{p.category?.name}</td>
                        <td style={{ padding: '1.25rem 0', fontWeight: p.stock < 10 ? 600 : 400, color: p.stock < 10 ? 'red' : 'inherit' }}>
                          {p.stock} units
                        </td>
                        <td style={{ padding: '1.25rem 0' }}>₹{p.price.toLocaleString()}</td>
                        <td style={{ padding: '1.25rem 0', fontWeight: '600', color: 'var(--color-secondary)' }}>₹{p.wholesalePrice.toLocaleString()}</td>
                        <td style={{ padding: '1.25rem 0' }}>{p.bulkThreshold} sarees</td>
                        <td style={{ padding: '1.25rem 0' }}>
                          {p.isApproved ? (
                            <span style={{ color: 'green', display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.85rem' }}>
                              <CheckCircle size={14} /> Approved
                            </span>
                          ) : (
                            <span style={{ color: '#EF6C00', display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.85rem', fontWeight: 500 }}>
                              <AlertCircle size={14} /> Pending Review
                            </span>
                          )}
                        </td>
                        <td style={{ padding: '1.25rem 0', textAlign: 'right' }}>
                          {isAdmin ? (
                            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                              {p.isApproved ? (
                                <button 
                                  onClick={() => handleApproveProduct(p.id, false)}
                                  style={{ padding: '0.35rem 0.75rem', backgroundColor: '#FFEBEE', color: '#C62828', borderRadius: '2px', fontSize: '0.75rem' }}
                                >
                                  Reject
                                </button>
                              ) : (
                                <button 
                                  onClick={() => handleApproveProduct(p.id, true)}
                                  style={{ padding: '0.35rem 0.75rem', backgroundColor: '#E8F5E9', color: '#2E7D32', borderRadius: '2px', fontSize: '0.75rem', fontWeight: 600 }}
                                >
                                  Approve Saree
                                </button>
                              )}
                            </div>
                          ) : (
                            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', color: 'var(--color-text-muted)' }}>
                              <button onClick={() => handleEditProductClick(p)} style={{ color: 'var(--color-text-main)' }}>
                                <Edit2 size={16} />
                              </button>
                              <button onClick={() => handleDeleteProduct(p.id)} style={{ color: '#D32F2F' }}>
                                <Trash2 size={16} />
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}

        {/* ==========================================
            TAB: SELLER ORDERS MANAGEMENT
            ========================================== */}
        {!isAdmin && activeTab === 'orders' && (
          <div className="card animate-fade-in" style={{ border: '1px solid var(--color-border)', padding: '2.5rem' }}>
            <h2 style={{ marginBottom: '2rem', fontSize: '1.6rem' }}>B2B Wholesale Orders</h2>

            {orders.length === 0 ? (
              <p style={{ color: 'var(--color-text-muted)' }}>No orders placed with your store yet.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                {orders.map((o) => {
                  const statusTheme = getStatusColor(o.status);
                  return (
                    <div key={o.id} style={{ border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', overflow: 'hidden' }}>
                      <div style={{ padding: '1.5rem', background: '#FAFAFA', borderBottom: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                        <div>
                          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.7rem', textTransform: 'uppercase' }}>Order Number</p>
                          <p style={{ fontWeight: 600 }}>#ORD-{o.id.toString().padStart(5, '0')}</p>
                        </div>
                        <div>
                          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.7rem', textTransform: 'uppercase' }}>Date</p>
                          <p>{new Date(o.createdAt).toLocaleDateString()}</p>
                        </div>
                        <div>
                          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.7rem', textTransform: 'uppercase' }}>Boutique Customer</p>
                          <p style={{ fontWeight: 500 }}>{o.buyer?.name} ({o.buyer?.email})</p>
                        </div>
                        {o.address && (
                          <div>
                            <p style={{ color: 'var(--color-text-muted)', fontSize: '0.7rem', textTransform: 'uppercase' }}>Shipping Address</p>
                            <p style={{ fontWeight: 500 }}>{o.address}</p>
                          </div>
                        )}
                        <div>
                          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.7rem', textTransform: 'uppercase' }}>Total Bulk Value</p>
                          <p style={{ fontWeight: 600, color: 'var(--color-secondary)' }}>₹{o.totalAmount.toLocaleString()}</p>
                        </div>
                        <div style={{ display: 'flex', items: 'center', gap: '1rem' }}>
                          <span style={{ 
                            backgroundColor: statusTheme.bg, 
                            color: statusTheme.text, 
                            padding: '0.35rem 0.75rem', 
                            borderRadius: '2px', 
                            fontSize: '0.7rem', 
                            fontWeight: '600',
                            textTransform: 'uppercase'
                          }}>
                            {o.status}
                          </span>
                        </div>
                      </div>

                      <div style={{ padding: '1.5rem' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem', marginBottom: '1.5rem' }}>
                          <thead>
                            <tr style={{ borderBottom: '1px solid var(--color-border)', textAlign: 'left', color: 'var(--color-text-muted)', fontSize: '0.75rem' }}>
                              <th style={{ paddingBottom: '0.75rem' }}>Saree SKU</th>
                              <th style={{ paddingBottom: '0.75rem', textAlign: 'center' }}>Quantity</th>
                              <th style={{ paddingBottom: '0.75rem', textAlign: 'right' }}>Price charged</th>
                              <th style={{ paddingBottom: '0.75rem', textAlign: 'right' }}>Subtotal</th>
                            </tr>
                          </thead>
                          <tbody>
                            {o.items.map((item) => (
                              <tr key={item.id}>
                                <td style={{ padding: '0.75rem 0' }}>{item.product?.title}</td>
                                <td style={{ padding: '0.75rem 0', textAlign: 'center' }}>{item.quantity} units</td>
                                <td style={{ padding: '0.75rem 0', textAlign: 'right' }}>₹{item.priceAtBuy.toLocaleString()}</td>
                                <td style={{ padding: '0.75rem 0', textAlign: 'right', fontWeight: 500 }}>₹{(item.priceAtBuy * item.quantity).toLocaleString()}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>

                        {o.status === 'PENDING' && (
                          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                            {!o.isPaid && (
                              <button 
                                onClick={() => handleOrderStatusUpdate(o.id, 'REJECTED')}
                                className="btn-secondary" 
                                style={{ padding: '0.5rem 1.5rem', fontSize: '0.75rem', color: '#D32F2F', borderColor: '#D32F2F' }}
                              >
                                Reject Order
                              </button>
                            )}
                            <button 
                              onClick={() => handleOrderStatusUpdate(o.id, 'ACCEPTED')}
                              className="btn-primary" 
                              style={{ padding: '0.5rem 1.5rem', fontSize: '0.75rem' }}
                            >
                              Confirm & Accept Order
                            </button>
                          </div>
                        )}

                        {o.status === 'ACCEPTED' && !o.deliveryPartnerId && (
                          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.8rem', textAlign: 'right', fontStyle: 'italic' }}>
                            Waiting for Logistics Partner to pick up package...
                          </p>
                        )}
                        
                        {o.status === 'ACCEPTED' && o.deliveryPartnerId && (
                          <p style={{ color: 'var(--color-secondary)', fontSize: '0.8rem', textAlign: 'right', fontWeight: 500 }}>
                            Logistics claim accepted by {o.deliveryPartner?.name}.
                          </p>
                        )}

                        {o.status === 'IN_TRANSIT' && (
                          <p style={{ color: '#0D47A1', fontSize: '0.8rem', textAlign: 'right', fontWeight: 500 }}>
                            Saree shipment is in transit with logistics.
                          </p>
                        )}

                        {o.status === 'DELIVERED' && (
                          <p style={{ color: 'green', fontSize: '0.8rem', textAlign: 'right', fontWeight: 600 }}>
                            ✓ Order delivered and payment balance settled.
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ==========================================
            TAB: ADMIN CATEGORIES MANAGEMENT
            ========================================== */}
        {isAdmin && activeTab === 'categories' && (
          <div className="animate-fade-in" style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: '3rem' }}>
            <div className="card" style={{ border: '1px solid var(--color-border)', padding: '2.5rem', height: 'fit-content' }}>
              <h3 style={{ marginBottom: '1.5rem' }}>Create Product Category</h3>
              <form onSubmit={handleAddCategory} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.8rem', fontWeight: 500 }}>Category Name</label>
                  <input 
                    type="text" 
                    placeholder="e.g. Linen & Cotton" 
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    required
                    style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)', outline: 'none' }}
                  />
                </div>
                <button type="submit" className="btn-primary" style={{ padding: '0.75rem', fontSize: '0.75rem' }}>Create Category</button>
              </form>
            </div>

            <div className="card" style={{ border: '1px solid var(--color-border)', padding: '2.5rem' }}>
              <h3 style={{ marginBottom: '1.5rem' }}>Available Categories</h3>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--color-border)', color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>
                    <th style={{ padding: '0.75rem 0' }}>ID</th>
                    <th style={{ padding: '0.75rem 0' }}>Category Name</th>
                  </tr>
                </thead>
                <tbody>
                  {categories.map((cat) => (
                    <tr key={cat.id} style={{ borderBottom: '1px solid #F5F5F5', fontSize: '0.9rem' }}>
                      <td style={{ padding: '1rem 0' }}>{cat.id}</td>
                      <td style={{ padding: '1rem 0', fontWeight: '500' }}>{cat.name}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>

      {/* ==========================================
          MODAL: ADD/EDIT PRODUCT
          ========================================== */}
      {isProductModalOpen && (
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
            maxWidth: '650px', 
            padding: '3rem', 
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--color-border)',
            maxHeight: '90vh',
            overflowY: 'auto'
          }}>
            <div className="flex justify-between items-center" style={{ marginBottom: '2rem' }}>
              <h2 style={{ fontSize: '1.8rem', margin: 0 }}>
                {editingProduct ? 'Edit Saree Details' : 'Add Saree to Catalogue'}
              </h2>
              <button onClick={() => { setIsProductModalOpen(false); setEditingProduct(null); }} style={{ color: 'var(--color-text-main)' }}>
                <XCircle size={24} />
              </button>
            </div>

            <form onSubmit={handleProductSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.8rem', fontWeight: 500 }}>Saree Title</label>
                <input 
                  type="text"
                  required
                  placeholder="e.g. Authentic Kanchipuram Silk Saree"
                  value={productForm.title}
                  onChange={(e) => setProductForm({ ...productForm, title: e.target.value })}
                  style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)', outline: 'none' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.8rem', fontWeight: 500 }}>Weave Description</label>
                <textarea 
                  required
                  rows="3"
                  placeholder="Describe the weave history, thread details, border style..."
                  value={productForm.description}
                  onChange={(e) => setProductForm({ ...productForm, description: e.target.value })}
                  style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)', outline: 'none', resize: 'vertical', fontFamily: 'var(--font-sans)', fontSize: '0.9rem' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '1.5rem' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.8rem', fontWeight: 500 }}>Retail Price (₹)</label>
                  <input 
                    type="number"
                    required
                    min="1"
                    placeholder="15000"
                    value={productForm.price}
                    onChange={(e) => setProductForm({ ...productForm, price: e.target.value })}
                    style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)', outline: 'none' }}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.8rem', fontWeight: 500 }}>Wholesale Price (₹)</label>
                  <input 
                    type="number"
                    required
                    min="1"
                    placeholder="12000"
                    value={productForm.wholesalePrice}
                    onChange={(e) => setProductForm({ ...productForm, wholesalePrice: e.target.value })}
                    style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)', outline: 'none' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '1.5rem' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.8rem', fontWeight: 500 }}>Bulk Threshold (Saree Count)</label>
                  <input 
                    type="number"
                    required
                    min="1"
                    value={productForm.bulkThreshold}
                    onChange={(e) => setProductForm({ ...productForm, bulkThreshold: parseInt(e.target.value) })}
                    style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)', outline: 'none' }}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.8rem', fontWeight: 500 }}>Starting Stock</label>
                  <input 
                    type="number"
                    required
                    min="0"
                    value={productForm.stock}
                    onChange={(e) => setProductForm({ ...productForm, stock: parseInt(e.target.value) })}
                    style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)', outline: 'none' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '1.5rem' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.8rem', fontWeight: 500 }}>Category</label>
                  <select 
                    required
                    value={productForm.categoryId}
                    onChange={(e) => setProductForm({ ...productForm, categoryId: e.target.value })}
                    style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)', outline: 'none', backgroundColor: 'white' }}
                  >
                    <option value="">Select Category</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id.toString()}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.8rem', fontWeight: 500 }}>Catalogue Image</label>
                  <select 
                    value={productForm.imageUrl}
                    onChange={(e) => setProductForm({ ...productForm, imageUrl: e.target.value })}
                    style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)', outline: 'none', backgroundColor: 'white' }}
                  >
                    <option value="/hero.png">Artisan Collection (hero.png)</option>
                    <option value="/kanchi.png">Kanchipuram Silk Saree (kanchi.png)</option>
                    <option value="/bridal.png">Bridal Heritage Brocade (bridal.png)</option>
                  </select>
                </div>
              </div>

              <button 
                type="submit" 
                className="btn-primary" 
                style={{ marginTop: '1.5rem', padding: '1rem' }}
              >
                {editingProduct ? 'Save Changes' : 'Submit Saree for Approval'}
              </button>
            </form>
          </div>
        </div>
      )}

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
                
                {user?.role === 'SELLER' && (
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
    </div>
  );
}
