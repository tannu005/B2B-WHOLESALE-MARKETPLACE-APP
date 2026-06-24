import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const hashedPassword = await bcrypt.hash('admin123', 10);
  
  // 1. Create Users
  const admin = await prisma.user.upsert({
    where: { email: 'admin@sareeb2b.com' },
    update: { isApproved: true },
    create: {
      email: 'admin@sareeb2b.com',
      password: hashedPassword,
      name: 'Super Admin',
      role: 'ADMIN',
      isApproved: true,
    },
  });

  const seller = await prisma.user.upsert({
    where: { email: 'seller@sareeb2b.com' },
    update: { isApproved: true },
    create: {
      email: 'seller@sareeb2b.com',
      password: hashedPassword,
      name: 'Viraasat Weavers Ltd',
      role: 'SELLER',
      isApproved: true,
      commissionRate: 12.5,
    },
  });

  const retailer = await prisma.user.upsert({
    where: { email: 'buyer@sareeb2b.com' },
    update: { isApproved: true },
    create: {
      email: 'buyer@sareeb2b.com',
      password: hashedPassword,
      name: 'Saree Heritage Boutique',
      role: 'RETAILER',
      isApproved: true,
    },
  });

  const delivery = await prisma.user.upsert({
    where: { email: 'delivery@sareeb2b.com' },
    update: { isApproved: true },
    create: {
      email: 'delivery@sareeb2b.com',
      password: hashedPassword,
      name: 'Express Logistics',
      role: 'DELIVERY',
      isApproved: true,
    },
  });

  // 2. Create Categories
  const silkCategory = await prisma.category.upsert({
    where: { name: 'Silk Sarees' },
    update: {},
    create: { name: 'Silk Sarees' },
  });

  const bridalCategory = await prisma.category.upsert({
    where: { name: 'Bridal Heritage' },
    update: {},
    create: { name: 'Bridal Heritage' },
  });

  const cottonCategory = await prisma.category.upsert({
    where: { name: 'Cotton & Linen' },
    update: {},
    create: { name: 'Cotton & Linen' },
  });

  const georgetteCategory = await prisma.category.upsert({
    where: { name: 'Designer Georgette' },
    update: {},
    create: { name: 'Designer Georgette' },
  });

  // 3. Create Products
  const productsData = [
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
      imageUrl: '/chanderi.png',
      categoryId: cottonCategory.id,
      sellerId: seller.id,
      isApproved: true,
    },
    {
      title: 'Designer Georgette Saree',
      description: 'Exquisite modern georgette saree featuring sequin embellishments and contemporary borders for luxury evening wear.',
      price: 9000,
      wholesalePrice: 7500,
      bulkThreshold: 8,
      stock: 60,
      imageUrl: '/georgette.png',
      categoryId: georgetteCategory.id,
      sellerId: seller.id,
      isApproved: true,
    },
    {
      title: 'Mysore Crepe Silk Saree',
      description: 'Pure Mysore crepe silk saree with elegant gold zari check patterns and soft, rich pallu, dyed in heritage colors.',
      price: 18000,
      wholesalePrice: 14500,
      bulkThreshold: 4,
      stock: 40,
      imageUrl: '/mysore.png',
      categoryId: silkCategory.id,
      sellerId: seller.id,
      isApproved: true,
    },
    {
      title: 'Kashmiri Pashmina Silk Saree',
      description: 'Handwoven Pashmina wool and silk blend saree featuring intricate Kashmiri Tilla embroidery on royal maroon base.',
      price: 32000,
      wholesalePrice: 26000,
      bulkThreshold: 2,
      stock: 25,
      imageUrl: '/kashmiri.png',
      categoryId: bridalCategory.id,
      sellerId: seller.id,
      isApproved: true,
    },
    {
      title: 'Jamdani Muslin Saree',
      description: 'Superfine Bengal Muslin Cotton saree with traditional geometric Jamdani motifs handwoven with golden thread.',
      price: 12000,
      wholesalePrice: 9800,
      bulkThreshold: 5,
      stock: 75,
      imageUrl: '/jamdani.png',
      categoryId: cottonCategory.id,
      sellerId: seller.id,
      isApproved: true,
    },
    {
      title: 'Organza Silk Saree',
      description: 'Delicate and sheer handloom organza silk saree detailed with pastel floral hand-painted motifs and silver borders.',
      price: 11000,
      wholesalePrice: 8800,
      bulkThreshold: 6,
      stock: 50,
      imageUrl: '/organza.png',
      categoryId: georgetteCategory.id,
      sellerId: seller.id,
      isApproved: true,
    }
  ];
  for (const product of productsData) {
    const existingProduct = await prisma.product.findFirst({
      where: { title: product.title },
    });

    if (!existingProduct) {
      await prisma.product.create({
        data: product,
      });
    } else {
      await prisma.product.update({
        where: { id: existingProduct.id },
        data: { imageUrl: product.imageUrl },
      });
    }
  }

  console.log('Seed completed successfully!', {
    admin: admin.email,
    seller: seller.email,
    retailer: retailer.email,
    delivery: delivery.email,
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
