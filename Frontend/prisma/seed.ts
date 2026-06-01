import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const products = [
  {
    name: 'Rose Petal Glow Serum',
    image: 'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=400&h=400&fit=crop',
    brand: 'Lumina', category: 'skincare',
    description: 'A luxurious facial serum infused with rose extract and hyaluronic acid. Brightens skin tone and locks in moisture for a radiant, dewy glow all day long.',
    price: 48, countInStock: 15, rating: 4.8, numReviews: 124,
  },
  {
    name: 'Velvet Matte Lipstick – Ruby Red',
    image: 'https://images.unsplash.com/photo-1586495777744-4e6af5dbaee8?w=400&h=400&fit=crop',
    brand: 'Lumina', category: 'makeup',
    description: 'Long-lasting matte lipstick that stays vibrant for up to 12 hours. Formulated with vitamin E to keep lips moisturized and smooth.',
    price: 24, countInStock: 30, rating: 4.6, numReviews: 87,
  },
  {
    name: 'Hydra-Boost Moisturizer',
    image: 'https://images.unsplash.com/photo-1556228578-8c89e6adf883?w=400&h=400&fit=crop',
    brand: 'Lumina', category: 'skincare',
    description: 'Intense 72-hour hydration moisturizer with ceramides and niacinamide. Suitable for all skin types, absorbs quickly without greasiness.',
    price: 62, countInStock: 8, rating: 4.9, numReviews: 203,
  },
  {
    name: 'Golden Hour Highlighter',
    image: 'https://images.unsplash.com/photo-1599733589046-833deccfe7de?w=400&h=400&fit=crop',
    brand: 'Lumina', category: 'makeup',
    description: 'Buildable, blendable highlighter with a warm golden glow. Perfect for cheekbones, brow bones, and inner corners for a sun-kissed look.',
    price: 35, countInStock: 20, rating: 4.7, numReviews: 56,
  },
  {
    name: 'Midnight Bloom Eau de Parfum',
    image: 'https://images.unsplash.com/photo-1541643600914-78b084683702?w=400&h=400&fit=crop',
    brand: 'Lumina', category: 'fragrance',
    description: 'A captivating floral-musk fragrance with top notes of jasmine and bergamot. Long-lasting 8+ hour wear. 50ml bottle.',
    price: 89, countInStock: 12, rating: 4.9, numReviews: 178,
  },
  {
    name: 'Argan Oil Hair Mask',
    image: 'https://images.unsplash.com/photo-1607006344380-b6775a0824a7?w=400&h=400&fit=crop',
    brand: 'Lumina', category: 'haircare',
    description: 'Deep conditioning hair mask with pure Moroccan argan oil. Restores shine, reduces frizz, and repairs damaged hair in just 10 minutes.',
    price: 38, countInStock: 25, rating: 4.7, numReviews: 92,
  },
  {
    name: 'Vitamin C Brightening Toner',
    image: 'https://images.unsplash.com/photo-1571781926291-c477ebfd024b?w=400&h=400&fit=crop',
    brand: 'Lumina', category: 'skincare',
    description: 'Alcohol-free toner with 10% Vitamin C and green tea extract. Evens skin tone, minimizes pores, and preps skin for serums.',
    price: 32, countInStock: 18, rating: 4.6, numReviews: 65,
  },
  {
    name: 'Volumizing Mascara – Black',
    image: 'https://images.unsplash.com/photo-1512207736890-6ffed8a84e8d?w=400&h=400&fit=crop',
    brand: 'Lumina', category: 'makeup',
    description: 'Buildable, clump-free mascara that volumizes and lengthens lashes. Smudge-proof formula lasts all day.',
    price: 22, countInStock: 40, rating: 4.5, numReviews: 134,
  },
];

async function main() {
  console.log('Clearing existing data...');
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.product.deleteMany();
  await prisma.user.deleteMany();

  console.log('Creating users...');
  const admin = await prisma.user.create({
    data: {
      name: 'Admin User',
      email: 'admin@lumina.com',
      password: await bcrypt.hash('admin123', 10),
      isAdmin: true,
    },
  });

  await prisma.user.create({
    data: {
      name: 'Test User',
      email: 'user@lumina.com',
      password: await bcrypt.hash('user123', 10),
      isAdmin: false,
    },
  });

  console.log('Creating products...');
  for (const p of products) {
    await prisma.product.create({ data: { ...p, userId: admin.id } });
  }

  console.log('\n=== SEEDING COMPLETE ===');
  console.log('Admin:  admin@lumina.com / admin123');
  console.log('User:   user@lumina.com  / user123');
  console.log(`Products created: ${products.length}`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
