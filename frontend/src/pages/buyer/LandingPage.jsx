import React, { useState, useEffect } from 'react';
import { ShoppingBag, Search, Menu, X, Plus, Minus, Trash2, ArrowRight, User as UserIcon, Clock, CheckCircle, Truck, RefreshCw, Bell } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';

export default function LandingPage() {
  const navigate = useNavigate();
  const { user, token, logout, refreshUser } = useAuth();
  const { toast } = useToast();
  
  // States
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  
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
  
  // Cart State
  const [cart, setCart] = useState([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [address, setAddress] = useState('');
  
  // Notification State
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [readNotifications, setReadNotifications] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('read_notifications') || '[]');
    } catch {
      return [];
    }
  });

  const notifications = (orders || [])
    .filter(o => o.status !== 'PENDING')
    .map(o => {
      let msg = '';
      if (o.status === 'ACCEPTED') msg = `Order #ORD-${o.id.toString().padStart(5, '0')} has been accepted by the weaver.`;
      else if (o.status === 'IN_TRANSIT') msg = `Order #ORD-${o.id.toString().padStart(5, '0')} is now in transit.`;
      else if (o.status === 'DELIVERED') msg = `Order #ORD-${o.id.toString().padStart(5, '0')} has been delivered.`;
      else if (o.status === 'REJECTED') msg = `Order #ORD-${o.id.toString().padStart(5, '0')} was rejected.`;
      return {
        id: `order-${o.id}-${o.status}`,
        message: msg,
        time: new Date(o.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        type: o.status
      };
    });

  const handleMarkAllRead = () => {
    const allIds = notifications.map(n => n.id);
    setReadNotifications(allIds);
    localStorage.setItem('read_notifications', JSON.stringify(allIds));
  };

  const unreadCount = notifications.filter(n => !readNotifications.includes(n.id)).length;
  
  // Modal / Detail State
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [detailQty, setDetailQty] = useState(1);

  // Orders State
  const [orders, setOrders] = useState([]);
  const [viewingOrders, setViewingOrders] = useState(false);
  const [orderLoading, setOrderLoading] = useState(false);

  // Fetch categories once on mount
  useEffect(() => {
    fetchCategories();
  }, []);

  // Fetch products with a 300ms debounce when search query or category changes
  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      fetchProducts();
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [selectedCategory, searchQuery]);

  useEffect(() => {
    if (user && user.role === 'RETAILER') {
      fetchOrders();
    }
  }, [user]);

  const fetchCategories = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/categories');
      if (res.ok) {
        const data = await res.json();
        setCategories(data);
      }
    } catch (err) {
      console.error('Error fetching categories:', err);
    }
  };

  const fetchProducts = async () => {
    setLoading(true);
    try {
      let url = 'http://localhost:5000/api/products';
      const params = [];
      if (selectedCategory) params.push(`category=${encodeURIComponent(selectedCategory)}`);
      if (searchQuery) params.push(`search=${encodeURIComponent(searchQuery)}`);
      if (params.length > 0) url += `?${params.join('&')}`;

      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setProducts(data);
      }
    } catch (err) {
      console.error('Error fetching products:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchOrders = async () => {
    if (!token) return;
    setOrderLoading(true);
    try {
      const res = await fetch('http://localhost:5000/api/orders', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setOrders(data);
      }
    } catch (err) {
      console.error('Error fetching orders:', err);
    } finally {
      setOrderLoading(false);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
  };

  // Cart operations
  const addToCart = (product, quantity) => {
    if (product.stock <= 0) {
      toast.error('This item is currently out of stock.');
      return;
    }
    let success = true;
    setCart((prevCart) => {
      const existing = prevCart.find((item) => item.product.id === product.id);
      if (existing) {
        if (existing.quantity + quantity > product.stock) {
          toast.error(`Cannot add more. Only ${product.stock} items are available in stock.`);
          success = false;
          return prevCart;
        }
        return prevCart.map((item) =>
          item.product.id === product.id ? { ...item, quantity: item.quantity + quantity } : item
        );
      }
      if (quantity > product.stock) {
        toast.error(`Only ${product.stock} items are available in stock.`);
        success = false;
        return prevCart;
      }
      return [...prevCart, { product, quantity }];
    });
    if (success) {
      setIsCartOpen(true);
      setSelectedProduct(null);
    }
  };

  const updateCartQty = (productId, change) => {
    let success = true;
    setCart((prevCart) => {
      const updated = prevCart.map((item) => {
        if (item.product.id === productId) {
          const newQty = item.quantity + change;
          if (change > 0 && newQty > item.product.stock) {
            toast.error(`Only ${item.product.stock} items are available in stock.`);
            success = false;
            return item;
          }
          return newQty > 0 ? { ...item, quantity: newQty } : null;
        }
        return item;
      }).filter(Boolean);
      return success ? updated : prevCart;
    });
  };

  const removeFromCart = (productId) => {
    setCart((prevCart) => prevCart.filter((item) => item.product.id !== productId));
  };

  // Helper: calculate total and unit price with wholesale thresholds
  const calculateCartTotals = () => {
    let subtotal = 0;
    const items = cart.map((item) => {
      const { product, quantity } = item;
      const isWholesale = quantity >= product.bulkThreshold;
      const price = isWholesale ? product.wholesalePrice : product.price;
      const total = price * quantity;
      subtotal += total;
      return {
        ...item,
        unitPrice: price,
        isWholesale,
        total
      };
    });
    return { items, subtotal };
  };

  const { items: processedCartItems, subtotal: cartSubtotal } = calculateCartTotals();

  // Checkout
  const handleCheckout = async () => {
    if (!user) {
      navigate('/login');
      return;
    }
    if (user.role !== 'RETAILER') {
      toast.error('Only Retailer accounts can purchase wholesale goods.');
      return;
    }
    if (!address || address.trim() === '') {
      toast.error('Please provide a delivery address for shipping.');
      return;
    }

    // Check if any cart items exceed stock
    for (const item of cart) {
      if (item.quantity > item.product.stock) {
        toast.error(`Cannot place order: "${item.product.title}" exceeds available stock (${item.product.stock} available). Please reduce quantity.`);
        return;
      }
    }

    try {
      const cartItemsPayload = cart.map((item) => ({
        productId: item.product.id,
        quantity: item.quantity
      }));

      // 1. Create Razorpay order on backend
      const paymentRes = await fetch('http://localhost:5000/api/payments/create-order', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ cartItems: cartItemsPayload })
      });

      const paymentData = await paymentRes.json();
      if (!paymentRes.ok) {
        throw new Error(paymentData.error || 'Failed to initiate payment');
      }

      // 2. Open Razorpay Checkout Modal
      const options = {
        key: paymentData.keyId,
        amount: paymentData.amount,
        currency: paymentData.currency,
        name: "Crafted Legacies",
        description: "B2B Bulk Wholesale Order Payment",
        order_id: paymentData.razorpayOrderId,
        handler: async function (response) {
          try {
            // 3. Verify payment and place split orders
            const checkoutRes = await fetch('http://localhost:5000/api/orders', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
              },
              body: JSON.stringify({
                cartItems: cartItemsPayload,
                address: address.trim(),
                razorpayOrderId: response.razorpay_order_id,
                razorpayPaymentId: response.razorpay_payment_id,
                razorpaySignature: response.razorpay_signature
              })
            });

            const checkoutData = await checkoutRes.json();
            if (!checkoutRes.ok) {
              throw new Error(checkoutData.error || 'Order placement verification failed');
            }

            toast.success('Wholesale order placed and paid successfully! Split orders created for respective weavers.');
            setCart([]);
            setAddress('');
            setIsCartOpen(false);
            fetchOrders();
            setViewingOrders(true);
          } catch (checkoutErr) {
            toast.error(checkoutErr.message);
          }
        },
        prefill: {
          name: user.name,
          email: user.email
        },
        theme: {
          color: "#9A7536"
        }
      };

      const rzp = new window.Razorpay(options);
      rzp.on('payment.failed', function (response) {
        toast.error('Payment failed: ' + response.error.description);
      });
      rzp.open();
    } catch (err) {
      toast.error(err.message);
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
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--color-background)' }}>
      {/* Minimalist Top Promotion Nav */}
      <div style={{ 
        background: 'var(--color-primary)', 
        color: 'white', 
        fontSize: '0.7rem', 
        textTransform: 'uppercase', 
        letterSpacing: '2px', 
        padding: '0.65rem 0', 
        textAlign: 'center',
        fontWeight: '500'
      }}>
        Complimentary Shipping on Bulk Orders Over ₹50,000 | Weaver-Direct Wholesale
      </div>
      
      {/* Navigation Header */}
      <nav style={{ 
        padding: '1.5rem 0', 
        background: 'rgba(250, 248, 245, 0.12)', 
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        borderBottom: '1px solid rgba(0, 0, 0, 0.04)',
        position: 'sticky', 
        top: 0, 
        zIndex: 100 
      }}>
        <div className="container flex items-center justify-between">
          {/* Left: Collections + Search */}
          <div className="flex items-center gap-6" style={{ flex: 1, fontFamily: 'var(--font-sans)', fontSize: '0.8rem' }}>
            <button 
              onClick={() => { setSelectedCategory(''); setSearchQuery(''); setViewingOrders(false); }}
              style={{ 
                textTransform: 'uppercase', 
                letterSpacing: '1px', 
                color: !selectedCategory && !viewingOrders ? 'var(--color-secondary)' : 'var(--color-text-main)',
                fontWeight: !selectedCategory && !viewingOrders ? '600' : '400'
              }}
            >
              Collections
            </button>
            {user && user.role === 'RETAILER' && (
              <button 
                onClick={() => setViewingOrders(true)}
                style={{ 
                  textTransform: 'uppercase', 
                  letterSpacing: '1px', 
                  color: viewingOrders ? 'var(--color-secondary)' : 'var(--color-text-main)',
                  fontWeight: viewingOrders ? '600' : '400'
                }}
              >
                My Orders
              </button>
            )}
            
            <form onSubmit={handleSearchSubmit} className="flex items-center" style={{ 
              borderBottom: '1px solid var(--color-border)', 
              paddingBottom: '0.25rem',
              marginLeft: '1rem',
              display: viewingOrders ? 'none' : 'flex'
            }}>
              <input 
                type="text" 
                placeholder="Search..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ 
                  border: 'none', 
                  background: 'transparent', 
                  outline: 'none', 
                  fontSize: '0.8rem',
                  fontFamily: 'var(--font-sans)',
                  width: '120px' 
                }} 
              />
              <button type="submit"><Search size={14} style={{ color: 'var(--color-text-muted)' }} /></button>
            </form>
          </div>
          
          {/* Center: Viraasat Logo */}
          <div style={{ flex: 1, textAlign: 'center' }}>
            <h2 
              onClick={() => { setSelectedCategory(''); setSearchQuery(''); setViewingOrders(false); }}
              style={{ margin: 0, fontSize: '2rem', letterSpacing: '4px', textTransform: 'uppercase', cursor: 'pointer', display: 'inline-block' }}
            >
              Viraasat
            </h2>
          </div>

          {/* Right: User / Auth / Cart */}
          <div className="flex items-center justify-end gap-6" style={{ flex: 1 }}>
            {user ? (
              <div className="flex items-center gap-4" style={{ fontFamily: 'var(--font-sans)', fontSize: '0.85rem' }}>
                <button 
                  onClick={() => {
                    setProfileForm({ name: user.name, email: user.email });
                    setIsProfileModalOpen(true);
                  }}
                  className="flex items-center gap-1" 
                  style={{ 
                    color: 'var(--color-text-main)', 
                    fontWeight: 500,
                    cursor: 'pointer',
                    background: 'none',
                    border: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.25rem'
                  }}
                >
                  <UserIcon size={14} style={{ color: 'var(--color-secondary)' }} /> {user.name}
                </button>
                
                {user.role !== 'RETAILER' && (
                  <Link 
                    to={user.role === 'ADMIN' ? '/admin' : user.role === 'SELLER' ? '/seller' : '/delivery'} 
                    style={{ color: 'var(--color-secondary)', fontWeight: 500 }}
                  >
                    Dashboard
                  </Link>
                )}

                <button onClick={logout} style={{ color: '#D32F2F', fontWeight: 500 }}>Sign Out</button>
              </div>
            ) : (
              <Link to="/login" className="nav-link">Sign In</Link>
            )}
            
            {/* Bell Icon for Notifications */}
            {user && (
              <div style={{ position: 'relative' }}>
                <button 
                  onClick={() => setIsNotificationOpen(!isNotificationOpen)} 
                  style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', background: 'none', border: 'none', padding: 0 }}
                >
                  <Bell size={20} style={{ strokeWidth: 1.5 }} />
                  {unreadCount > 0 && (
                    <span style={{ 
                      position: 'absolute', 
                      top: '-6px', 
                      right: '-6px', 
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
                    {notifications.length === 0 ? (
                      <p style={{ color: 'var(--color-text-muted)', fontSize: '0.8rem', textAlign: 'center', margin: '2rem 0' }}>No notifications yet</p>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        {notifications.map((n) => {
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
            )}

            <button onClick={() => setIsCartOpen(true)} style={{ position: 'relative' }}>
              <ShoppingBag size={20} style={{ strokeWidth: 1.5 }} />
              {cart.length > 0 && (
                <span style={{ 
                  position: 'absolute', 
                  top: '-8px', 
                  right: '-8px', 
                  background: 'var(--color-secondary)', 
                  color: 'white', 
                  borderRadius: '50%', 
                  width: '18px', 
                  height: '18px', 
                  fontSize: '0.65rem', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  fontWeight: '600'
                }}>
                  {cart.reduce((sum, item) => sum + item.quantity, 0)}
                </span>
              )}
            </button>
          </div>
        </div>
      </nav>

      {/* Main Content Area */}
      {!viewingOrders ? (
        <>
          {/* Hero Banner */}
          {!selectedCategory && !searchQuery && (
            <header style={{ 
              height: '80vh', 
              width: '100%',
              background: 'url("/hero.png") center/cover no-repeat',
              position: 'relative',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginTop: '-88px'
            }}>
              <div style={{ position: 'absolute', inset: 0, background: 'rgba(0, 0, 0, 0.18)' }}></div>
              <div className="animate-fade-in" style={{ 
                position: 'relative', 
                zIndex: 1, 
                textAlign: 'center', 
                backgroundColor: 'rgba(255, 255, 255, 0.65)', 
                padding: '4rem 5rem', 
                backdropFilter: 'blur(20px)',
                WebkitBackdropFilter: 'blur(20px)',
                maxWidth: '700px',
                border: '1px solid rgba(197, 160, 89, 0.45)',
                boxShadow: '0 30px 60px rgba(0, 0, 0, 0.12)'
              }}>
                <p style={{ fontSize: '0.75rem', letterSpacing: '5px', textTransform: 'uppercase', marginBottom: '1.25rem', color: '#9A7536', fontWeight: 600 }}>
                  Crafted Legacies
                </p>
                <h1 style={{ fontSize: '3.5rem', lineHeight: 1.15, marginBottom: '1.5rem', letterSpacing: '1px', color: 'var(--color-primary)' }}>
                  Woven Elegance
                </h1>
                <p style={{ fontSize: '0.9rem', color: 'var(--color-text-main)', marginBottom: '0rem', fontWeight: 300, lineHeight: 1.6 }}>
                  Direct access to authentic, handloomed Indian heritage sarees. Wholesale pricing, custom bulk discounts, and streamlined logistics.
                </p>
              </div>
            </header>
          )}

          {/* Category Tabs & Grid */}
          <section id="collections-section" style={{ background: 'linear-gradient(180deg, #FFFFFF 0%, #F9F7F2 100%)', padding: '5rem 0 8rem 0' }}>
            <main className="container" style={{ padding: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '1.5rem', marginBottom: '3rem', flexWrap: 'wrap' }}>
              <button 
                onClick={() => { setSelectedCategory(''); setSearchQuery(''); }}
                className={!selectedCategory ? 'btn-primary' : 'btn-secondary'}
                style={{ padding: '0.75rem 1.75rem', fontSize: '0.7rem' }}
              >
                All Collections
              </button>
              {categories.map((cat) => (
                <button 
                  key={cat.id}
                  onClick={() => { setSelectedCategory(cat.name); setSearchQuery(''); }}
                  className={selectedCategory === cat.name ? 'btn-primary' : 'btn-secondary'}
                  style={{ padding: '0.75rem 1.75rem', fontSize: '0.7rem' }}
                >
                  {cat.name}
                </button>
              ))}
            </div>

            <div style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontSize: '2rem', letterSpacing: '1px' }}>
                {selectedCategory || 'Our Heritage Showcase'}
              </h2>
              <p style={{ fontFamily: 'var(--font-sans)', fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
                Showing {products.length} products
              </p>
            </div>

            {loading ? (
              <div style={{ textAlign: 'center', padding: '5rem 0', fontFamily: 'var(--font-serif)', fontSize: '1.5rem' }}>
                Loading Collection...
              </div>
            ) : products.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '5rem 0', border: '1px dashed var(--color-border)', borderRadius: 'var(--radius-sm)' }}>
                <p style={{ color: 'var(--color-text-muted)', marginBottom: '1rem' }}>No sarees match your criteria.</p>
                <button onClick={() => { setSelectedCategory(''); setSearchQuery(''); }} className="btn-secondary" style={{ padding: '0.5rem 1rem' }}>Clear Filters</button>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '4rem 3rem' }}>
                {products.map((product) => (
                  <div 
                    key={product.id} 
                    className="luxury-product-card" 
                    onClick={() => { setSelectedProduct(product); setDetailQty(product.bulkThreshold); }}
                  >
                    <div className="luxury-product-image-container">
                      <img 
                        src={product.imageUrl || '/hero.png'} 
                        alt={product.title} 
                        className="luxury-product-image"
                        style={{ filter: product.stock <= 0 ? 'grayscale(80%) opacity(0.6)' : 'none' }}
                      />
                      {product.stock <= 0 ? (
                        <div style={{
                          position: 'absolute',
                          top: '1rem',
                          left: '1rem',
                          backgroundColor: '#D32F2F',
                          color: 'white',
                          padding: '0.4rem 0.8rem',
                          fontSize: '0.65rem',
                          fontWeight: '600',
                          textTransform: 'uppercase',
                          letterSpacing: '1px',
                          borderRadius: '2px',
                          zIndex: 2
                        }}>
                          Not Available
                        </div>
                      ) : (
                        <div className="luxury-product-badge">
                          Min: {product.bulkThreshold}
                        </div>
                      )}
                    </div>
                    
                    <div className="luxury-product-info">
                      <p className="luxury-product-category">
                        {product.category?.name}
                      </p>
                      <h3 className="luxury-product-title">{product.title}</h3>
                      <p className="luxury-product-description">
                        {product.description}
                      </p>
                      
                      <div className="luxury-product-price-row">
                        <div>
                          <span className="luxury-price-label">Retail </span>
                          <span className="luxury-price-amount">₹{product.price.toLocaleString()}</span>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <span className="luxury-price-label" style={{ color: 'var(--color-secondary)', fontWeight: 500 }}>Wholesale </span>
                          <span className="luxury-price-wholesale-amount">₹{product.wholesalePrice.toLocaleString()}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </main>
        </section>
      </>
      ) : (
        /* Order History Page */
        <main className="container animate-fade-in" style={{ padding: '4rem 2rem 8rem', flex: 1 }}>
          <div className="flex justify-between items-center" style={{ marginBottom: '3rem' }}>
            <div>
              <h1 style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>Order History</h1>
              <p style={{ color: 'var(--color-text-muted)', margin: 0 }}>View and track your pending and past bulk wholesale orders</p>
            </div>
            <button 
              onClick={() => setViewingOrders(false)} 
              className="btn-secondary" 
              style={{ padding: '0.75rem 1.5rem', fontSize: '0.7rem', height: 'fit-content', alignSelf: 'center' }}
            >
              Back To Catalog
            </button>
          </div>

          {orderLoading ? (
            <div style={{ textAlign: 'center', padding: '5rem 0' }}>Loading your orders...</div>
          ) : orders.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '5rem 0', border: '1px dashed var(--color-border)' }}>
              <p style={{ color: 'var(--color-text-muted)', marginBottom: '1.5rem' }}>You haven't placed any orders yet.</p>
              <button onClick={() => setViewingOrders(false)} className="btn-primary">Browse Saree Collections</button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
              {orders.map((order) => {
                const statusTheme = getStatusColor(order.status);
                return (
                  <div key={order.id} style={{ 
                    backgroundColor: 'var(--color-surface)', 
                    border: '1px solid var(--color-border)', 
                    borderRadius: 'var(--radius-sm)',
                    overflow: 'hidden'
                  }}>
                    {/* Order header */}
                    <div style={{ 
                      padding: '1.5rem 2rem', 
                      background: '#FAFAFA', 
                      borderBottom: '1px solid var(--color-border)',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      flexWrap: 'wrap',
                      gap: '1rem'
                    }}>
                      <div style={{ display: 'flex', gap: '2rem', fontSize: '0.85rem' }}>
                        <div>
                          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.75rem', textTransform: 'uppercase' }}>Order Number</p>
                          <p style={{ fontWeight: '600' }}>#ORD-{order.id.toString().padStart(5, '0')}</p>
                        </div>
                        <div>
                          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.75rem', textTransform: 'uppercase' }}>Placed On</p>
                          <p>{new Date(order.createdAt).toLocaleDateString()}</p>
                        </div>
                        <div>
                          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.75rem', textTransform: 'uppercase' }}>Weaver / Seller</p>
                          <p style={{ fontWeight: '500' }}>{order.seller?.name}</p>
                        </div>
                        {order.deliveryPartner && (
                          <div>
                            <p style={{ color: 'var(--color-text-muted)', fontSize: '0.75rem', textTransform: 'uppercase' }}>Delivery Partner</p>
                            <p>{order.deliveryPartner.name}</p>
                          </div>
                        )}
                        {order.address && (
                          <div>
                            <p style={{ color: 'var(--color-text-muted)', fontSize: '0.75rem', textTransform: 'uppercase' }}>Shipping Address</p>
                            <p style={{ fontWeight: '500' }}>{order.address}</p>
                          </div>
                        )}
                      </div>
                      
                      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <span style={{ 
                          backgroundColor: statusTheme.bg, 
                          color: statusTheme.text, 
                          padding: '0.4rem 1rem', 
                          borderRadius: '2px', 
                          fontSize: '0.75rem', 
                          fontWeight: '600',
                          textTransform: 'uppercase',
                          letterSpacing: '1px'
                        }}>
                          {order.status}
                        </span>
                        
                        <div style={{ textAlign: 'right' }}>
                          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.75rem', textTransform: 'uppercase' }}>Total Amount</p>
                          <p style={{ fontWeight: '600', color: 'var(--color-secondary)', fontSize: '1.1rem' }}>₹{order.totalAmount.toLocaleString()}</p>
                        </div>
                      </div>
                    </div>

                    {/* Order items */}
                    <div style={{ padding: '2rem' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                        <thead>
                          <tr style={{ borderBottom: '1px solid var(--color-border)', textAlign: 'left', color: 'var(--color-text-muted)', fontSize: '0.8rem', textTransform: 'uppercase' }}>
                            <th style={{ paddingBottom: '1rem' }}>Saree Item</th>
                            <th style={{ paddingBottom: '1rem', textAlign: 'center' }}>Quantity</th>
                            <th style={{ paddingBottom: '1rem', textAlign: 'right' }}>Unit price</th>
                            <th style={{ paddingBottom: '1rem', textAlign: 'right' }}>Total</th>
                          </tr>
                        </thead>
                        <tbody>
                          {order.items.map((item) => (
                            <tr key={item.id} style={{ borderBottom: '1px solid #FAFAFA' }}>
                              <td style={{ padding: '1rem 0', display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                                <div style={{ 
                                  width: '50px', 
                                  height: '60px', 
                                  background: `url("${item.product?.imageUrl || '/hero.png'}") center/cover no-repeat`,
                                  border: '1px solid var(--color-border)' 
                                }}></div>
                                <div>
                                  <p style={{ fontWeight: 500 }}>{item.product?.title}</p>
                                  <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>{item.product?.description.slice(0, 50)}...</p>
                                </div>
                              </td>
                              <td style={{ padding: '1rem 0', textAlign: 'center' }}>{item.quantity}</td>
                              <td style={{ padding: '1rem 0', textAlign: 'right' }}>₹{item.priceAtBuy.toLocaleString()}</td>
                              <td style={{ padding: '1rem 0', textAlign: 'right', fontWeight: 500 }}>₹{(item.priceAtBuy * item.quantity).toLocaleString()}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </main>
      )}

      {/* Footer */}
      <footer style={{ marginTop: 'auto', background: '#111', color: 'white', padding: '4rem 0', borderTop: '1px solid var(--color-primary)' }}>
        <div className="container" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '4rem', fontSize: '0.85rem', fontFamily: 'var(--font-sans)' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <h3 style={{ color: 'white', letterSpacing: '4px', textTransform: 'uppercase', marginBottom: '1rem' }}>Viraasat</h3>
            <p style={{ color: '#aaa', lineHeight: 1.6 }}>
              Preserving Indian handloom legacies by connecting authentic weavers and boutique retailers. Fully automated B2B wholesale commerce.
            </p>
          </div>
          <div>
            <h4 style={{ color: 'var(--color-secondary)', textTransform: 'uppercase', letterSpacing: '2px', marginBottom: '1.5rem' }}>Role Access</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <Link to="/login" style={{ color: '#aaa' }}>Admin Portal</Link>
              <Link to="/login" style={{ color: '#aaa' }}>Weaver Dashboard</Link>
              <Link to="/login" style={{ color: '#aaa' }}>Retailer Lounge</Link>
              <Link to="/login" style={{ color: '#aaa' }}>Logistics Partner app</Link>
            </div>
          </div>
          <div>
            <h4 style={{ color: 'var(--color-secondary)', textTransform: 'uppercase', letterSpacing: '2px', marginBottom: '1.5rem' }}>Core Office</h4>
            <p style={{ color: '#aaa', lineHeight: 1.6 }}>
              Viraasat Textiles & Crafts Association<br />
              Varanasi Handloom Cluster, Uttar Pradesh<br />
              Support: wholesale@viraasat.com
            </p>
          </div>
        </div>
      </footer>

      {/* Cart Sliding Drawer */}
      {isCartOpen && (
        <div style={{ 
          position: 'fixed', 
          inset: 0, 
          backgroundColor: 'rgba(0,0,0,0.5)', 
          zIndex: 200, 
          display: 'flex', 
          justifyContent: 'flex-end',
          backdropFilter: 'blur(3px)'
        }}>
          <div className="animate-fade-in" style={{ 
            width: '100%', 
            maxWidth: '500px', 
            background: 'var(--color-surface)', 
            height: '100%', 
            display: 'flex', 
            flexDirection: 'column', 
            padding: '2.5rem' 
          }}>
            <div className="flex justify-between items-center" style={{ marginBottom: '2rem' }}>
              <h2 style={{ fontSize: '1.8rem', margin: 0 }}>Wholesale Cart</h2>
              <button onClick={() => setIsCartOpen(false)} style={{ color: 'var(--color-text-main)' }}>
                <X size={24} />
              </button>
            </div>

            {cart.length === 0 ? (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', gap: '1rem', color: 'var(--color-text-muted)' }}>
                <ShoppingBag size={48} style={{ strokeWidth: 1 }} />
                <p>Your wholesale cart is empty.</p>
                <button onClick={() => setIsCartOpen(false)} className="btn-primary" style={{ padding: '0.75rem 1.5rem' }}>Browse Catalog</button>
              </div>
            ) : (
              <>
                {/* Cart items */}
                <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1.5rem', paddingRight: '0.5rem' }}>
                  {processedCartItems.map((item) => (
                    <div key={item.product.id} style={{ 
                      display: 'flex', 
                      gap: '1rem', 
                      paddingBottom: '1.5rem', 
                      borderBottom: '1px solid var(--color-border)' 
                    }}>
                      <div style={{ 
                        width: '80px', 
                        height: '100px', 
                        background: `url("${item.product.imageUrl || '/hero.png'}") center/cover no-repeat`,
                        border: '1px solid var(--color-border)',
                        flexShrink: 0
                      }}></div>
                      
                      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, gap: '0.25rem' }}>
                        <div className="flex justify-between" style={{ alignItems: 'flex-start' }}>
                          <h4 style={{ fontSize: '1.05rem', margin: 0, fontWeight: 500 }}>{item.product.title}</h4>
                          <button onClick={() => removeFromCart(item.product.id)} style={{ color: 'var(--color-text-muted)' }}>
                            <Trash2 size={16} />
                          </button>
                        </div>
                        
                        <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>
                          Min Wholesale: {item.product.bulkThreshold}
                        </p>

                        <div className="flex justify-between items-center" style={{ marginTop: 'auto' }}>
                          {/* Quantity adjustments */}
                          <div className="flex items-center" style={{ border: '1px solid var(--color-border)', borderRadius: '2px' }}>
                            <button onClick={() => updateCartQty(item.product.id, -1)} style={{ padding: '0.25rem 0.5rem' }}><Minus size={12} /></button>
                            <span style={{ padding: '0.25rem 0.75rem', fontSize: '0.85rem', fontFamily: 'var(--font-sans)', fontWeight: 600 }}>{item.quantity}</span>
                            <button onClick={() => updateCartQty(item.product.id, 1)} style={{ padding: '0.25rem 0.5rem' }}><Plus size={12} /></button>
                          </div>

                          <div style={{ textAlign: 'right' }}>
                            {item.isWholesale ? (
                              <>
                                <span style={{ 
                                  display: 'inline-block', 
                                  backgroundColor: '#FFF3CD', 
                                  color: '#856404', 
                                  fontSize: '0.6rem', 
                                  padding: '0.1rem 0.3rem', 
                                  borderRadius: '2px', 
                                  fontWeight: 600,
                                  marginBottom: '0.25rem',
                                  textTransform: 'uppercase'
                                }}>
                                  Wholesale Active
                                </span>
                                <p style={{ fontWeight: 600, color: 'var(--color-secondary)', fontSize: '0.95rem' }}>
                                  ₹{item.total.toLocaleString()}
                                </p>
                                <p style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', textDecoration: 'line-through' }}>
                                  Retail: ₹{(item.product.price * item.quantity).toLocaleString()}
                                </p>
                              </>
                            ) : (
                              <>
                                <p style={{ fontWeight: 500, fontSize: '0.95rem' }}>
                                  ₹{item.total.toLocaleString()}
                                </p>
                                <p style={{ fontSize: '0.7rem', color: 'var(--color-secondary)', fontWeight: 500 }}>
                                  Add {item.product.bulkThreshold - item.quantity} more for Wholesale!
                                </p>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Shipping Address Input */}
                <div style={{ padding: '1.5rem 0 0.5rem 0', borderTop: '1px solid var(--color-border)' }}>
                  <label htmlFor="shipping-address" style={{ display: 'block', fontSize: '0.7rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: '0.5rem', color: 'var(--color-primary)' }}>
                    Delivery Shipping Address <span style={{ color: '#D32F2F' }}>*</span>
                  </label>
                  <textarea
                    id="shipping-address"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="Enter complete shipping address (Street, City, State, PIN code)..."
                    required
                    style={{
                      width: '100%',
                      minHeight: '70px',
                      padding: '0.75rem',
                      fontSize: '0.85rem',
                      border: '1px solid var(--color-border)',
                      borderRadius: 'var(--radius-sm)',
                      outline: 'none',
                      resize: 'none',
                      fontFamily: 'var(--font-sans)',
                      background: 'white',
                      transition: 'var(--transition)'
                    }}
                  />
                </div>

                {/* Subtotal and checkout */}
                <div style={{ paddingTop: '1.5rem', borderTop: '1px solid var(--color-border)' }}>
                  <div className="flex justify-between items-center" style={{ marginBottom: '1.5rem' }}>
                    <span style={{ fontSize: '1.1rem', fontWeight: 500 }}>Est. Subtotal</span>
                    <span style={{ fontSize: '1.4rem', fontWeight: 600, color: 'var(--color-secondary)' }}>₹{cartSubtotal.toLocaleString()}</span>
                  </div>
                  
                  <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginBottom: '1.5rem', lineHeight: 1.5 }}>
                    * Taxes and shipping fees will be computed dynamically during processing. Orders containing items from different weavers will be split automatically.
                  </p>

                  <button 
                    onClick={handleCheckout} 
                    className="btn-primary" 
                    style={{ width: '100%', padding: '1.1rem', display: 'flex', justifyContent: 'center', itemsCenter: 'center', gap: '0.5rem' }}
                  >
                    Place Wholesale Order <ArrowRight size={16} />
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Product Detail Modal */}
      {selectedProduct && (
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
            maxWidth: '900px', 
            maxHeight: '90vh', 
            overflowY: 'auto', 
            display: 'flex', 
            flexDirection: 'row', 
            padding: 0,
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--color-border)'
          }}>
            {/* Left Image */}
            <div style={{ 
              flex: 1, 
              minHeight: '500px',
              background: `url("${selectedProduct.imageUrl || '/hero.png'}") center/cover no-repeat` 
            }}></div>

            {/* Right details */}
            <div style={{ flex: 1.2, padding: '3rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div className="flex justify-between items-start">
                <div>
                  <p style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--color-text-muted)', marginBottom: '0.25rem' }}>
                    {selectedProduct.category?.name}
                  </p>
                  <h2 style={{ fontSize: '2.2rem', margin: 0 }}>{selectedProduct.title}</h2>
                </div>
                <button onClick={() => setSelectedProduct(null)} style={{ color: 'var(--color-text-main)' }}>
                  <X size={24} />
                </button>
              </div>

              <div style={{ display: 'flex', gap: '2rem', padding: '1rem', border: '1px solid var(--color-border)', backgroundColor: '#FAFAFA' }}>
                <div style={{ flex: 1 }}>
                  <span style={{ fontSize: '0.65rem', textTransform: 'uppercase', color: 'var(--color-text-muted)' }}>Retail Price</span>
                  <p style={{ fontSize: '1.25rem', fontWeight: '500' }}>₹{selectedProduct.price.toLocaleString()}</p>
                </div>
                <div style={{ flex: 1, borderLeft: '1px solid var(--color-border)', paddingLeft: '2rem' }}>
                  <span style={{ fontSize: '0.65rem', textTransform: 'uppercase', color: 'var(--color-secondary)', fontWeight: 600 }}>Wholesale Price</span>
                  <p style={{ fontSize: '1.4rem', fontWeight: '600', color: 'var(--color-secondary)' }}>₹{selectedProduct.wholesalePrice.toLocaleString()}</p>
                </div>
              </div>

              <p style={{ fontSize: '0.9rem', lineHeight: 1.7, color: 'var(--color-text-main)' }}>
                {selectedProduct.description}
              </p>

              <div style={{ 
                backgroundColor: '#FFF3CD', 
                color: '#856404', 
                border: '1px solid #FFEBAA', 
                padding: '1rem', 
                fontSize: '0.85rem',
                borderRadius: '2px'
              }}>
                <strong>Bulk Wholesale Offer:</strong> Unlock the wholesale price of <strong>₹{selectedProduct.wholesalePrice.toLocaleString()}</strong> by ordering <strong>{selectedProduct.bulkThreshold}</strong> or more pieces. Perfect for stocking boutique collections.
              </div>

              <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {selectedProduct.stock <= 0 ? (
                  <div style={{ 
                    backgroundColor: '#FEEBEE', 
                    color: '#C62828', 
                    border: '1px solid #FFCDD2', 
                    padding: '1rem', 
                    fontSize: '0.85rem',
                    borderRadius: '2px',
                    textAlign: 'center',
                    fontWeight: 500
                  }}>
                    This legacy saree is currently unavailable (Out of Stock).
                  </div>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <span style={{ fontSize: '0.85rem', fontFamily: 'var(--font-sans)', fontWeight: 500 }}>Select Batch Size:</span>
                    <div className="flex items-center" style={{ border: '1px solid var(--color-border)', borderRadius: '2px' }}>
                      <button onClick={() => setDetailQty(Math.max(1, detailQty - 1))} style={{ padding: '0.5rem 1rem' }}><Minus size={14} /></button>
                      <span style={{ padding: '0.5rem 1.5rem', fontSize: '1rem', fontFamily: 'var(--font-sans)', fontWeight: 600 }}>{detailQty}</span>
                      <button onClick={() => setDetailQty(detailQty + 1)} style={{ padding: '0.5rem 1rem' }}><Plus size={14} /></button>
                    </div>
                    
                    {detailQty >= selectedProduct.bulkThreshold ? (
                      <span style={{ color: 'green', fontSize: '0.85rem', fontWeight: '600' }}>✓ Wholesale active!</span>
                    ) : (
                      <span style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>Add {selectedProduct.bulkThreshold - detailQty} more for Wholesale</span>
                    )}
                  </div>
                )}

                <div className="flex justify-between items-center" style={{ paddingTop: '1rem', borderTop: '1px solid var(--color-border)' }}>
                  <div>
                    <span style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: 'var(--color-text-muted)' }}>Estimated Batch Value</span>
                    <p style={{ fontSize: '1.5rem', fontWeight: '600', color: 'var(--color-secondary)' }}>
                      ₹{selectedProduct.stock <= 0 ? '0' : ((detailQty >= selectedProduct.bulkThreshold ? selectedProduct.wholesalePrice : selectedProduct.price) * detailQty).toLocaleString()}
                    </p>
                  </div>
                  <button 
                    onClick={() => addToCart(selectedProduct, detailQty)} 
                    disabled={selectedProduct.stock <= 0}
                    className="btn-primary"
                    style={{ 
                      padding: '1rem 2rem',
                      opacity: selectedProduct.stock <= 0 ? 0.5 : 1,
                      cursor: selectedProduct.stock <= 0 ? 'not-allowed' : 'pointer'
                    }}
                  >
                    {selectedProduct.stock <= 0 ? 'Out of Stock' : 'Add To Bulk Order'}
                  </button>
                </div>
              </div>
            </div>
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
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', fontSize: '0.9rem' }}>
                <div>
                  <span style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Full Name</span>
                  <p style={{ fontWeight: 500, fontSize: '1.1rem' }}>{user?.name}</p>
                </div>
                
                <div>
                  <span style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Email Address</span>
                  <p style={{ fontWeight: 500 }}>{user?.email}</p>
                </div>

                <div>
                  <span style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Account Role</span>
                  <p style={{ fontWeight: 500 }}>{user?.role}</p>
                </div>
                
                {user?.role === 'SELLER' && (
                  <div>
                    <span style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Earnings Balance</span>
                    <p style={{ fontWeight: 600, color: 'var(--color-secondary)', fontSize: '1.2rem' }}>₹{user.balance?.toLocaleString()}</p>
                  </div>
                )}

                <button 
                  onClick={() => setIsEditingProfile(true)} 
                  className="btn-primary" 
                  style={{ marginTop: '1.5rem', padding: '0.85rem' }}
                >
                  Edit Profile
                </button>
              </div>
            ) : (
              <form onSubmit={handleProfileSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
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
