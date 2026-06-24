# Viraasat - B2B Wholesale Heritage Saree Marketplace

Viraasat is a premium, high-end B2B e-commerce platform designed to bridge the gap between authentic Indian handloom weavers (sellers) and luxury boutique owners (retailers). By enabling direct transactions, wholesale pricing, auto-splitting orders, and streamlined logistics, Viraasat preserves local craftsmanship and ensures transparent wholesale trade.

---

## 📖 Table of Contents
1. [Workflow & Business Logic](#-workflow--business-logic)
2. [Key Features & Highlights](#-key-features--highlights)
3. [Technology Stack](#-technology-stack)
4. [Project Structure](#-project-structure)
5. [Getting Started & Local Setup](#-getting-started--local-setup)
6. [Repository Description](#-repository-description)

---

## 🔄 Workflow & Business Logic

The platform implements a complete end-to-end B2B supply chain:

```mermaid
graph TD
    A[Weaver Uploads Saree] --> B[Admin Reviews & Approves]
    B --> C[Retailer Cart Checkout]
    C --> D[Razorpay Payment & Verification]
    D --> E[Orders Split by Weaver]
    E --> F[Weaver Confirms Order]
    F --> G[Logistics Rider Accepts Pickup]
    G --> H[Dropoff & Delivery Completed]
```

1. **Product Seeding & Verification**: Weavers upload authentic saree catalogs with stock details. Platform Admins review and approve product details to make them live.
2. **Bulk Ordering & stock-locking**: Retailers browse the collections, choose batch sizes, enter a shipping address, and add items to a bulk order. The system enforces real-time stock-locking validations.
3. **Razorpay Payment Gateway**: Orders are paid for upfront using the Razorpay test gateway, verified securely on the backend using HMAC-SHA256 signature matching.
4. **Automated Order Splitting**: Checkout automatically splits a mixed cart into individual orders grouped by respective weavers.
5. **Prepaid Weaver Confirmation**: Since orders are prepaid, weavers confirm the order to package it (the reject button is deactivated to ensure transaction consistency).
6. **Logistics Delivery Rider**: Registered riders accept cargo pickups, view the boutique's exact shipping address, and mark shipments "In Transit" and "Delivered".

---

## ✨ Key Features & Highlights

* **Luxury Visual Design**: Premium typography, minimalist bottom-border inputs, glassmorphic credentials cards, and elegant product showcase layouts in a 4:5 portrait frame.
* **Razorpay Payment Gateway**: Fully functional online checkout using Razorpay integration (`rzp_test` key) with secure backend payment signature validation using Node's native `crypto` module.
* **Role-Based Notifications Bell**: A dynamic notification panel built into every user's dashboard (Buyer, Seller, Delivery, Admin) tracking status updates, new orders, and approval requirements.
* **Smart Inventory Control**: If a saree is out of stock, it renders as "Not Available" with a grayscale overlay on the storefront catalog, disabling modal additions and blocking checkout overrides. 
* **Selective Admin Approval**: Modifying product description, title, or pricing triggers a pending approval state. Restocking items or changing bulk thresholds bypasses approval delays, making updates instantly live.

---

## 🛠 Technology Stack

### Frontend
* **Core Framework**: React.js (Vite)
* **Styling**: Custom Vanilla CSS (Luxury theme: Stark charcoal & Champagne gold)
* **Icons**: Lucide React
* **State & Security**: React Context (Auth and Glassmorphic Toasts)

### Backend
* **Runtime & Framework**: Node.js, Express.js, TypeScript
* **Database & ORM**: Prisma ORM with PostgreSQL database hosted on Neon DB
* **Security & Tokens**: JWT (JSON Web Tokens), bcryptjs
* **Payments**: Razorpay API, Node.js Native Crypto signatures

---

## 📁 Project Structure

```
saree-b2b/
├── backend/
│   ├── prisma/             # Schema definitions and database seeds
│   ├── src/
│   │   └── index.ts        # Server routes, controllers, and verification
│   └── package.json
└── frontend/
    ├── public/             # High-end studio saree image assets
    ├── src/
    │   ├── context/        # Auth context & Toast notifications context
    │   ├── pages/
    │   │   ├── buyer/      # Storefront & Checkout drawer
    │   │   ├── seller/     # Weaver catalog & Admin approval panel
    │   │   ├── delivery/   # Logistics route dispatch
    │   │   └── Login.jsx   # Portal login credentials portal
    │   ├── App.jsx         # App routing
    │   └── index.css       # Core styling & transitions
    └── package.json
```

---

## 🚀 Getting Started & Local Setup

### Prerequisites
* Node.js (v18+)
* npm

### 1. Setup Backend
1. Navigate into the backend directory:
   ```bash
   cd backend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Set up environment variables in a `.env` file:
   ```env
   DATABASE_URL="postgresql://username:password@host/neondb?sslmode=require"
   PORT=5000
   JWT_SECRET="your-jwt-secret-key"
   RAZORPAY_KEY_ID="rzp_test_T5S5IktMftvjlY"
   RAZORPAY_KEY_SECRET="3UIVnUgSgFZZDS0ZlojNIBlJ"
   ```
4. Sync database schema and generate Prisma client:
   ```bash
   npx prisma db push
   npx prisma generate
   ```
5. Seed initial categories and products:
   ```bash
   npx prisma db seed
   ```
6. Start the server:
   ```bash
   npm run dev
   ```

### 2. Setup Frontend
1. Navigate into the frontend directory:
   ```bash
   cd ../frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the development client:
   ```bash
   npm run dev
   ```
4. Open the application in your browser at `http://localhost:5173`.

---

## 📝 Repository Description

> "A premium B2B wholesale marketplace connecting handloom weavers directly with boutique retailers. Features secure Razorpay payment signature verification, automated split orders, dynamic role-based notification bells, real-time stock-locking validations, and a clean luxury interface."
