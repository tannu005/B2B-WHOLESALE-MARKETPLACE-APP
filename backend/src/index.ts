import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';

dotenv.config();

const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'supersecret_saree_b2b_key_change_in_production';

app.use(cors());
app.use(express.json());

// ==========================================
// MIDDLEWARES
// ==========================================

// Authenticate JWT Token
function authenticateToken(req: any, res: any, next: any) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
}

// Require Roles helper
function requireRoles(roles: string[]) {
  return (req: any, res: any, next: any) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Access forbidden: Insufficient permissions' });
    }
    next();
  };
}

// ==========================================
// AUTHENTICATION ENDPOINTS
// ==========================================

// Register User
app.post('/api/auth/register', async (req: any, res: any) => {
  try {
    const { email, password, name, role } = req.body;

    if (!email || !password || !name || !role) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    const validRoles = ['SELLER', 'RETAILER', 'DELIVERY'];
    if (!validRoles.includes(role.toUpperCase())) {
      return res.status(400).json({ error: 'Invalid user role selected' });
    }

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ error: 'User with this email already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Auto-approve RETAILER, but SELLER and DELIVERY require ADMIN approval
    const isApproved = role.toUpperCase() === 'RETAILER';

    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
        role: role.toUpperCase(),
        isApproved,
      },
    });

    // Generate JWT token
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role, isApproved: user.isApproved },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({
      message: 'Registration successful',
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        isApproved: user.isApproved,
      },
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Login User
app.post('/api/auth/login', async (req: any, res: any) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(400).json({ error: 'Invalid email or password' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ error: 'Invalid email or password' });
    }

    // Generate JWT
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role, isApproved: user.isApproved },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        isApproved: user.isApproved,
        balance: user.balance,
        commissionRate: user.commissionRate,
      },
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get profile
app.get('/api/auth/me', authenticateToken, async (req: any, res: any) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isApproved: true,
        balance: true,
        commissionRate: true,
      },
    });
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ user });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Update Profile
app.put('/api/auth/profile', authenticateToken, async (req: any, res: any) => {
  try {
    const { name, email } = req.body;
    
    if (!name || !email) {
      return res.status(400).json({ error: 'Name and email are required' });
    }

    const existingUser = await prisma.user.findFirst({
      where: {
        email,
        NOT: { id: req.user.id }
      }
    });
    if (existingUser) {
      return res.status(400).json({ error: 'Email is already in use by another user' });
    }

    const updatedUser = await prisma.user.update({
      where: { id: req.user.id },
      data: { name, email },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isApproved: true,
        balance: true,
        commissionRate: true
      }
    });

    res.json({ user: updatedUser });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ==========================================
// CATEGORY ENDPOINTS
// ==========================================

// Get Categories
app.get('/api/categories', async (req: any, res: any) => {
  try {
    const categories = await prisma.category.findMany({
      orderBy: { name: 'asc' },
    });
    res.json(categories);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Create Category (Admin only)
app.post('/api/categories', authenticateToken, requireRoles(['ADMIN']), async (req: any, res: any) => {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: 'Category name is required' });

    const category = await prisma.category.create({
      data: { name },
    });
    res.status(201).json(category);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ==========================================
// PRODUCT ENDPOINTS
// ==========================================

// Browse approved products (Retailers / General)
app.get('/api/products', async (req: any, res: any) => {
  try {
    const { category, search } = req.query;

    const whereClause: any = {
      isApproved: true,
    };

    if (category) {
      whereClause.category = {
        name: category as string,
      };
    }

    if (search) {
      whereClause.OR = [
        { title: { contains: search as string, mode: 'insensitive' } },
        { category: { name: { contains: search as string, mode: 'insensitive' } } },
      ];
    }

    const products = await prisma.product.findMany({
      where: whereClause,
      include: {
        category: true,
        seller: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json(products);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get seller's products (Sellers only)
app.get('/api/products/seller', authenticateToken, requireRoles(['SELLER', 'ADMIN']), async (req: any, res: any) => {
  try {
    const products = await prisma.product.findMany({
      where: req.user.role === 'ADMIN' ? {} : { sellerId: req.user.id },
      include: { category: true },
      orderBy: { createdAt: 'desc' },
    });
    res.json(products);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Create product (Sellers / Admins)
app.post('/api/products', authenticateToken, requireRoles(['SELLER', 'ADMIN']), async (req: any, res: any) => {
  try {
    const { title, description, price, wholesalePrice, bulkThreshold, stock, imageUrl, categoryId } = req.body;

    if (!title || !description || !price || !wholesalePrice || !categoryId) {
      return res.status(400).json({ error: 'Title, description, price, wholesalePrice, and categoryId are required' });
    }

    // Admins' uploads are auto-approved, sellers' uploads require admin approval
    const isApproved = req.user.role === 'ADMIN';

    const product = await prisma.product.create({
      data: {
        title,
        description,
        price: parseFloat(price),
        wholesalePrice: parseFloat(wholesalePrice),
        bulkThreshold: parseInt(bulkThreshold) || 10,
        stock: parseInt(stock) || 0,
        imageUrl: imageUrl || '/hero.png',
        categoryId: parseInt(categoryId),
        sellerId: req.user.id,
        isApproved,
      },
    });

    res.status(201).json(product);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Update product (Sellers / Admins)
app.put('/api/products/:id', authenticateToken, requireRoles(['SELLER', 'ADMIN']), async (req: any, res: any) => {
  try {
    const { id } = req.params;
    const { title, description, price, wholesalePrice, bulkThreshold, stock, imageUrl, categoryId } = req.body;

    const existingProduct = await prisma.product.findUnique({ where: { id: parseInt(id) } });
    if (!existingProduct) return res.status(404).json({ error: 'Product not found' });

    // Ensure seller owns the product, or user is Admin
    if (req.user.role !== 'ADMIN' && existingProduct.sellerId !== req.user.id) {
      return res.status(403).json({ error: 'Access forbidden: You do not own this product' });
    }

    const criticalFieldsChanged = 
      (title !== undefined && title !== existingProduct.title) ||
      (description !== undefined && description !== existingProduct.description) ||
      (price !== undefined && parseFloat(price) !== existingProduct.price) ||
      (wholesalePrice !== undefined && parseFloat(wholesalePrice) !== existingProduct.wholesalePrice) ||
      (categoryId !== undefined && parseInt(categoryId) !== existingProduct.categoryId) ||
      (imageUrl !== undefined && imageUrl !== existingProduct.imageUrl);

    const shouldResetApproval = req.user.role !== 'ADMIN' && criticalFieldsChanged;

    const updatedProduct = await prisma.product.update({
      where: { id: parseInt(id) },
      data: {
        title,
        description,
        price: price ? parseFloat(price) : undefined,
        wholesalePrice: wholesalePrice ? parseFloat(wholesalePrice) : undefined,
        bulkThreshold: bulkThreshold ? parseInt(bulkThreshold) : undefined,
        stock: stock !== undefined ? parseInt(stock) : undefined,
        imageUrl,
        categoryId: categoryId ? parseInt(categoryId) : undefined,
        isApproved: shouldResetApproval ? false : undefined,
      },
    });

    res.json(updatedProduct);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Delete product
app.delete('/api/products/:id', authenticateToken, requireRoles(['SELLER', 'ADMIN']), async (req: any, res: any) => {
  try {
    const { id } = req.params;
    const existingProduct = await prisma.product.findUnique({ where: { id: parseInt(id) } });
    if (!existingProduct) return res.status(404).json({ error: 'Product not found' });

    if (req.user.role !== 'ADMIN' && existingProduct.sellerId !== req.user.id) {
      return res.status(403).json({ error: 'Access forbidden: You do not own this product' });
    }

    await prisma.product.delete({ where: { id: parseInt(id) } });
    res.json({ message: 'Product deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Approve/Reject Product (Admin only)
app.post('/api/products/:id/approve', authenticateToken, requireRoles(['ADMIN']), async (req: any, res: any) => {
  try {
    const { id } = req.params;
    const { approve } = req.body; // true or false

    const product = await prisma.product.findUnique({ where: { id: parseInt(id) } });
    if (!product) return res.status(404).json({ error: 'Product not found' });

    const updatedProduct = await prisma.product.update({
      where: { id: parseInt(id) },
      data: { isApproved: approve },
    });

    res.json({
      message: `Product ${approve ? 'approved' : 'rejected'} successfully`,
      product: updatedProduct,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ==========================================
// ORDER ENDPOINTS
// ==========================================

// Get orders
app.get('/api/orders', authenticateToken, async (req: any, res: any) => {
  try {
    const { role, id } = req.user;
    
    let whereClause: any = {};
    if (role === 'RETAILER') {
      whereClause = { buyerId: id };
    } else if (role === 'SELLER') {
      whereClause = { sellerId: id };
    } else if (role === 'DELIVERY') {
      whereClause = {
        OR: [
          { deliveryPartnerId: id },
          { status: 'ACCEPTED', deliveryPartnerId: null }, // Available to pick up
        ],
      };
    }

    const orders = await prisma.order.findMany({
      where: whereClause,
      include: {
        buyer: { select: { id: true, name: true, email: true } },
        seller: { select: { id: true, name: true, email: true } },
        deliveryPartner: { select: { id: true, name: true } },
        items: {
          include: {
            product: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json(orders);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Create Razorpay Order for Cart
app.post('/api/payments/create-order', authenticateToken, requireRoles(['RETAILER']), async (req: any, res: any) => {
  try {
    const { cartItems } = req.body;
    if (!cartItems || cartItems.length === 0) {
      return res.status(400).json({ error: 'Cart is empty' });
    }

    // Retrieve details for all products
    const productIds = cartItems.map((item: any) => parseInt(item.productId));
    const products = await prisma.product.findMany({
      where: { id: { in: productIds } },
    });

    let totalAmount = 0;
    for (const item of cartItems) {
      const dbProduct = products.find((p) => p.id === parseInt(item.productId));
      if (!dbProduct) {
        return res.status(404).json({ error: `Product ID ${item.productId} not found` });
      }
      const price = item.quantity >= dbProduct.bulkThreshold ? dbProduct.wholesalePrice : dbProduct.price;
      totalAmount += price * item.quantity;
    }

    if (totalAmount <= 0) {
      return res.status(400).json({ error: 'Total amount must be greater than zero' });
    }

    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;

    if (!keyId || !keySecret) {
      return res.status(500).json({ error: 'Razorpay API credentials not configured on backend' });
    }

    const auth = Buffer.from(`${keyId}:${keySecret}`).toString('base64');

    const rzpRes = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${auth}`
      },
      body: JSON.stringify({
        amount: Math.round(totalAmount * 100), // amount in paise
        currency: 'INR',
        receipt: `receipt_order_${Date.now()}`
      })
    });

    const rzpOrder: any = await rzpRes.json();
    if (!rzpRes.ok) {
      return res.status(rzpRes.status).json({ error: rzpOrder.error?.description || 'Failed to create Razorpay order' });
    }

    res.json({
      keyId,
      amount: rzpOrder.amount,
      currency: rzpOrder.currency,
      razorpayOrderId: rzpOrder.id
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Checkout Cart and Verify Payment (Retailer only)
app.post('/api/orders', authenticateToken, requireRoles(['RETAILER']), async (req: any, res: any) => {
  try {
    const { cartItems, address, razorpayOrderId, razorpayPaymentId, razorpaySignature } = req.body;

    if (!cartItems || cartItems.length === 0) {
      return res.status(400).json({ error: 'Cart is empty' });
    }

    if (!address || address.trim() === '') {
      return res.status(400).json({ error: 'Delivery address is required' });
    }

    if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
      return res.status(400).json({ error: 'Payment details are required to complete order' });
    }

    // Verify Razorpay Signature
    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    if (!keySecret) {
      return res.status(500).json({ error: 'Razorpay secret key not configured' });
    }

    const generatedSignature = crypto
      .createHmac('sha256', keySecret)
      .update(`${razorpayOrderId}|${razorpayPaymentId}`)
      .digest('hex');

    if (generatedSignature !== razorpaySignature) {
      return res.status(400).json({ error: 'Invalid payment signature. Transaction not verified.' });
    }

    // Retrieve details for all products
    const productIds = cartItems.map((item: any) => parseInt(item.productId));
    const products = await prisma.product.findMany({
      where: { id: { in: productIds } },
    });

    // Group items by Seller ID
    const itemsBySeller: Record<number, Array<{ product: any; quantity: number }>> = {};
    for (const item of cartItems) {
      const dbProduct = products.find((p) => p.id === parseInt(item.productId));
      if (!dbProduct) {
        return res.status(404).json({ error: `Product ID ${item.productId} not found` });
      }
      if (dbProduct.stock < item.quantity) {
        return res.status(400).json({ error: `Insufficient stock for product: ${dbProduct.title}` });
      }

      if (!itemsBySeller[dbProduct.sellerId]) {
        itemsBySeller[dbProduct.sellerId] = [];
      }
      itemsBySeller[dbProduct.sellerId].push({ product: dbProduct, quantity: item.quantity });
    }

    const createdOrders = [];

    // Create an order for each seller
    for (const sellerIdStr in itemsBySeller) {
      const sellerId = parseInt(sellerIdStr);
      const sellerItems = itemsBySeller[sellerId];
      if (!sellerItems) continue;

      let orderTotal = 0;
      const orderItemsToCreate: any[] = [];

      for (const item of sellerItems) {
        const { product, quantity } = item;
        const price = quantity >= product.bulkThreshold ? product.wholesalePrice : product.price;
        const totalItemCost = price * quantity;
        orderTotal += totalItemCost;

        orderItemsToCreate.push({
          productId: product.id,
          quantity,
          priceAtBuy: price,
        });

        // Deduct stock
        await prisma.product.update({
          where: { id: product.id },
          data: { stock: product.stock - quantity },
        });
      }

      const order = await prisma.order.create({
        data: {
          buyerId: req.user.id,
          sellerId: sellerId,
          status: 'PENDING',
          totalAmount: orderTotal,
          address: address.trim(),
          razorpayOrderId,
          razorpayPaymentId,
          razorpaySignature,
          isPaid: true,
          items: {
            create: orderItemsToCreate,
          },
        },
        include: {
          items: {
            include: {
              product: true,
            },
          },
        },
      });

      createdOrders.push(order);
    }

    res.status(201).json({
      message: 'Orders placed and verified successfully',
      orders: createdOrders,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Update Order Status (Seller accepts, Delivery assigns/marks picked up/marks delivered)
app.put('/api/orders/:id/status', authenticateToken, async (req: any, res: any) => {
  try {
    const { id } = req.params;
    const { status } = req.body; // PENDING, ACCEPTED, IN_TRANSIT, DELIVERED, REJECTED
    const { role, id: userId } = req.user;

    const order = await prisma.order.findUnique({
      where: { id: parseInt(id) },
      include: { seller: true, items: { include: { product: true } } },
    });

    if (!order) return res.status(404).json({ error: 'Order not found' });

    // Logic: Role-based status updates
    if (role === 'SELLER') {
      // Seller can only ACCEPT or REJECT a PENDING order that belongs to them
      if (order.sellerId !== userId) {
        return res.status(403).json({ error: 'This order does not belong to your store' });
      }
      if (order.status !== 'PENDING') {
        return res.status(400).json({ error: 'Can only accept/reject pending orders' });
      }
      if (!['ACCEPTED', 'REJECTED'].includes(status)) {
        return res.status(400).json({ error: 'Sellers can only set status to ACCEPTED or REJECTED' });
      }

      // If rejected, restore product stocks
      if (status === 'REJECTED') {
        for (const item of order.items) {
          await prisma.product.update({
            where: { id: item.productId },
            data: { stock: { increment: item.quantity } },
          });
        }
      }

      const updatedOrder = await prisma.order.update({
        where: { id: order.id },
        data: { status },
      });
      return res.json(updatedOrder);

    } else if (role === 'DELIVERY') {
      // Delivery partner can CLAIM order (set status to ACCEPTED and deliveryPartnerId = userId)
      // or update it to IN_TRANSIT (Picked up) or DELIVERED
      if (!['ACCEPTED', 'IN_TRANSIT', 'DELIVERED'].includes(status)) {
        return res.status(400).json({ error: 'Invalid delivery status transition' });
      }

      if (status === 'ACCEPTED') {
        // Delivery partner claims the order
        if (order.status !== 'ACCEPTED') {
          return res.status(400).json({ error: 'Order is not available for pickup claim' });
        }
        if (order.deliveryPartnerId !== null) {
          return res.status(400).json({ error: 'Order already claimed by another delivery partner' });
        }

        const updatedOrder = await prisma.order.update({
          where: { id: order.id },
          data: { deliveryPartnerId: userId },
        });
        return res.json(updatedOrder);
      }

      // For IN_TRANSIT or DELIVERED, verify this partner owns the delivery claim
      if (order.deliveryPartnerId !== userId) {
        return res.status(403).json({ error: 'You are not assigned as the delivery partner for this order' });
      }

      if (status === 'IN_TRANSIT') {
        if (order.status !== 'ACCEPTED') {
          return res.status(400).json({ error: 'Order must be accepted before pickup' });
        }
        const updatedOrder = await prisma.order.update({
          where: { id: order.id },
          data: { status: 'IN_TRANSIT' },
        });
        return res.json(updatedOrder);
      }

      if (status === 'DELIVERED') {
        if (order.status !== 'IN_TRANSIT') {
          return res.status(400).json({ error: 'Order must be in transit before marking delivered' });
        }
        if (!order.seller) {
          return res.status(400).json({ error: 'Seller details are missing for this order' });
        }

        // FINANCIAL SETTLEMENT ON SUCCESSFUL DELIVERY:
        // Flat delivery commission: ₹150 (paid to delivery partner)
        // Platform Commission: seller's commissionRate % of order value.
        // Rest goes to seller's balance.
        const deliveryFee = 150;
        const commissionAmt = (order.totalAmount * order.seller.commissionRate) / 100;
        const sellerEarnings = order.totalAmount - commissionAmt - deliveryFee;

        // Transaction updates in DB
        await prisma.$transaction([
          // Update order status
          prisma.order.update({
            where: { id: order.id },
            data: { status: 'DELIVERED' },
          }),
          // Add earnings to Seller
          prisma.user.update({
            where: { id: order.sellerId },
            data: { balance: { increment: sellerEarnings } },
          }),
          // Add delivery fee to Delivery Partner
          prisma.user.update({
            where: { id: userId },
            data: { balance: { increment: deliveryFee } },
          }),
        ]);

        const updatedOrder = await prisma.order.findUnique({
          where: { id: order.id },
          include: { buyer: true, seller: true, deliveryPartner: true },
        });
        return res.json(updatedOrder);
      }
    } else if (role === 'ADMIN') {
      // Admin can force any status change
      const updatedOrder = await prisma.order.update({
        where: { id: order.id },
        data: { status },
      });
      return res.json(updatedOrder);
    }

    res.status(400).json({ error: 'Unauthorized status transition' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ==========================================
// ADMIN DASHBOARD SPECIAL ENDPOINTS
// ==========================================

// Get Users (Admin only)
app.get('/api/admin/users', authenticateToken, requireRoles(['ADMIN']), async (req: any, res: any) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isApproved: true,
        balance: true,
        commissionRate: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json(users);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Approve/Reject Seller or Delivery Partner (Admin only)
app.post('/api/admin/users/:id/approve', authenticateToken, requireRoles(['ADMIN']), async (req: any, res: any) => {
  try {
    const { id } = req.params;
    const { approve, commissionRate } = req.body; // approve: boolean

    const user = await prisma.user.findUnique({ where: { id: parseInt(id) } });
    if (!user) return res.status(404).json({ error: 'User not found' });

    const updateData: any = { isApproved: approve };
    if (commissionRate !== undefined && user.role === 'SELLER') {
      updateData.commissionRate = parseFloat(commissionRate);
    }

    const updatedUser = await prisma.user.update({
      where: { id: parseInt(id) },
      data: updateData,
      select: { id: true, email: true, name: true, role: true, isApproved: true, commissionRate: true },
    });

    res.json({
      message: `User ${approve ? 'approved' : 'rejected'} successfully`,
      user: updatedUser,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get admin platform transactions overview
app.get('/api/admin/transactions', authenticateToken, requireRoles(['ADMIN']), async (req: any, res: any) => {
  try {
    const orders = await prisma.order.findMany({
      include: { seller: true },
    });

    const totalSales = orders
      .filter((o) => o.status === 'DELIVERED')
      .reduce((sum, o) => sum + o.totalAmount, 0);

    const pendingSales = orders
      .filter((o) => o.status !== 'DELIVERED' && o.status !== 'REJECTED')
      .reduce((sum, o) => sum + o.totalAmount, 0);

    const totalCommission = orders
      .filter((o) => o.status === 'DELIVERED')
      .reduce((sum, o) => sum + (o.totalAmount * o.seller.commissionRate) / 100, 0);

    res.json({
      totalSales,
      pendingSales,
      totalCommission,
      totalOrdersCount: orders.length,
      deliveredOrdersCount: orders.filter((o) => o.status === 'DELIVERED').length,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ==========================================
// SEED ENDPOINT (PostgreSQL auto-seed fallback)
// ==========================================
app.post('/api/seed', async (req, res) => {
  try {
    // Check if admin already exists
    const adminExists = await prisma.user.findFirst({ where: { role: 'ADMIN' } });
    const bcryptObj = require('bcryptjs');
    const hashedPassword = await bcryptObj.hash('admin123', 10);

    let admin;
    if (!adminExists) {
      admin = await prisma.user.create({
        data: {
          email: 'admin@sareeb2b.com',
          password: hashedPassword,
          name: 'Super Admin',
          role: 'ADMIN',
          isApproved: true,
        },
      });
    } else {
      admin = adminExists;
    }

    // Seed defaults if table is empty
    const sellerExists = await prisma.user.findFirst({ where: { email: 'seller@sareeb2b.com' } });
    let seller = sellerExists;
    if (!sellerExists) {
      seller = await prisma.user.create({
        data: {
          email: 'seller@sareeb2b.com',
          password: hashedPassword,
          name: 'Viraasat Weavers Ltd',
          role: 'SELLER',
          isApproved: true,
          commissionRate: 12.5,
        },
      });
    }

    // Seed buyer and delivery if not exist
    const buyerExists = await prisma.user.findFirst({ where: { email: 'buyer@sareeb2b.com' } });
    if (!buyerExists) {
      await prisma.user.create({
        data: {
          email: 'buyer@sareeb2b.com',
          password: hashedPassword,
          name: 'Saree Heritage Boutique',
          role: 'RETAILER',
          isApproved: true,
        },
      });
    }

    const deliveryExists = await prisma.user.findFirst({ where: { email: 'delivery@sareeb2b.com' } });
    if (!deliveryExists) {
      await prisma.user.create({
        data: {
          email: 'delivery@sareeb2b.com',
          password: hashedPassword,
          name: 'Express Logistics',
          role: 'DELIVERY',
          isApproved: true,
        },
      });
    }

    // Seed categories
    const categoriesList = ['Silk Sarees', 'Bridal Heritage', 'Cotton & Linen', 'Designer Georgette'];
    for (const catName of categoriesList) {
      await prisma.category.upsert({
        where: { name: catName },
        update: {},
        create: { name: catName },
      });
    }

    const silkCategory = await prisma.category.findUnique({ where: { name: 'Silk Sarees' } });
    const bridalCategory = await prisma.category.findUnique({ where: { name: 'Bridal Heritage' } });
    const cottonCategory = await prisma.category.findUnique({ where: { name: 'Cotton & Linen' } });

    if (silkCategory && bridalCategory && cottonCategory && seller) {
      const prodCheck = await prisma.product.findFirst();
      if (!prodCheck) {
        await prisma.product.createMany({
          data: [
            {
              title: 'Kanchipuram Silk Saree',
              description: 'Intricately handwoven pure Kanchipuram silk saree featuring traditional gold zari borders, perfect for formal collections.',
              price: 15000,
              wholesalePrice: 12000,
              bulkThreshold: 5,
              stock: 50,
              imageUrl: '/kanchi.png',
              categoryId: silkCategory.id,
              sellerId: seller.id,
              isApproved: true,
            },
            {
              title: 'Banarasi Brocade Saree',
              description: 'Luxury Varanasi handloom heritage saree with rich antique gold brocade patterns and premium silk yarn.',
              price: 25000,
              wholesalePrice: 20000,
              bulkThreshold: 3,
              stock: 30,
              imageUrl: '/bridal.png',
              categoryId: bridalCategory.id,
              sellerId: seller.id,
              isApproved: true,
            },
            {
              title: 'Chanderi Cotton Saree',
              description: 'Lightweight, sheer and elegant Chanderi cotton-silk saree woven with delicate buttis and a sleek golden border.',
              price: 5000,
              wholesalePrice: 4000,
              bulkThreshold: 10,
              stock: 100,
              imageUrl: '/hero.png',
              categoryId: cottonCategory.id,
              sellerId: seller.id,
              isApproved: true,
            }
          ]
        });
      }
    }

    res.json({ message: 'Seed completed successfully!', admin: admin.email });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Start Server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on http://0.0.0.0:${PORT}`);
});
