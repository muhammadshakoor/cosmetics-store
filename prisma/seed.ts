import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

function assertDisposableLocalSeed() {
  if (process.env.NODE_ENV !== 'development' || process.env.ALLOW_DESTRUCTIVE_SEED !== 'disposable-local-only') {
    throw new Error('Seeding requires NODE_ENV=development and ALLOW_DESTRUCTIVE_SEED=disposable-local-only.');
  }
  for (const name of ['DATABASE_URL', 'DIRECT_URL'] as const) {
    if (name === 'DIRECT_URL' && !process.env[name]) continue;
    let target: URL;
    try { target = new URL(process.env[name] || ''); }
    catch { throw new Error(`${name} must point to the disposable local lumina_seed database.`); }
    if (!['postgres:', 'postgresql:'].includes(target.protocol)
      || !['localhost', '127.0.0.1', '[::1]'].includes(target.hostname)
      || target.pathname !== '/lumina_seed' || target.search || target.hash) {
      throw new Error(`${name} must point to the disposable local lumina_seed database without URL options.`);
    }
  }
}

assertDisposableLocalSeed();
const prisma = new PrismaClient();

const products = [
  {
    name: 'Rose Petal Glow Serum',
    image: 'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=400&h=400&fit=crop',
    brand: 'Lumina', category: 'skincare',
    description: 'A luxurious facial serum infused with rose extract and hyaluronic acid. Brightens skin tone and locks in moisture for a radiant, dewy glow all day long.',
    price: 48, countInStock: 15, rating: 0, numReviews: 0,
  },
  {
    name: 'Velvet Matte Lipstick – Ruby Red',
    image: 'https://images.unsplash.com/photo-1586495777744-4e6af5dbaee8?w=400&h=400&fit=crop',
    brand: 'Lumina', category: 'makeup',
    description: 'Long-lasting matte lipstick that stays vibrant for up to 12 hours. Formulated with vitamin E to keep lips moisturized and smooth.',
    price: 24, countInStock: 30, rating: 0, numReviews: 0,
  },
  {
    name: 'Hydra-Boost Moisturizer',
    image: 'https://images.unsplash.com/photo-1556228578-8c89e6adf883?w=400&h=400&fit=crop',
    brand: 'Lumina', category: 'skincare',
    description: 'Intense 72-hour hydration moisturizer with ceramides and niacinamide. Suitable for all skin types, absorbs quickly without greasiness.',
    price: 62, countInStock: 8, rating: 0, numReviews: 0,
  },
  {
    name: 'Golden Hour Highlighter',
    image: 'https://images.unsplash.com/photo-1599733589046-833deccfe7de?w=400&h=400&fit=crop',
    brand: 'Lumina', category: 'makeup',
    description: 'Buildable, blendable highlighter with a warm golden glow. Perfect for cheekbones, brow bones, and inner corners for a sun-kissed look.',
    price: 35, countInStock: 20, rating: 0, numReviews: 0,
  },
  {
    name: 'Midnight Bloom Eau de Parfum',
    image: 'https://images.unsplash.com/photo-1541643600914-78b084683702?w=400&h=400&fit=crop',
    brand: 'Lumina', category: 'fragrance',
    description: 'A captivating floral-musk fragrance with top notes of jasmine and bergamot. Long-lasting 8+ hour wear. 50ml bottle.',
    price: 89, countInStock: 12, rating: 0, numReviews: 0,
  },
  {
    name: 'Argan Oil Hair Mask',
    image: 'https://images.unsplash.com/photo-1607006344380-b6775a0824a7?w=400&h=400&fit=crop',
    brand: 'Lumina', category: 'haircare',
    description: 'Deep conditioning hair mask with pure Moroccan argan oil. Restores shine, reduces frizz, and repairs damaged hair in just 10 minutes.',
    price: 38, countInStock: 25, rating: 0, numReviews: 0,
  },
  {
    name: 'Vitamin C Brightening Toner',
    image: 'https://images.unsplash.com/photo-1571781926291-c477ebfd024b?w=400&h=400&fit=crop',
    brand: 'Lumina', category: 'skincare',
    description: 'Alcohol-free toner with 10% Vitamin C and green tea extract. Evens skin tone, minimizes pores, and preps skin for serums.',
    price: 32, countInStock: 18, rating: 0, numReviews: 0,
  },
  {
    name: 'Volumizing Mascara – Black',
    image: 'https://images.unsplash.com/photo-1512207736890-6ffed8a84e8d?w=400&h=400&fit=crop',
    brand: 'Lumina', category: 'makeup',
    description: 'Buildable, clump-free mascara that volumizes and lengthens lashes. Smudge-proof formula lasts all day.',
    price: 22, countInStock: 40, rating: 0, numReviews: 0,
  },
];

async function main() {
  console.log('Clearing existing data...');
  await prisma.review.deleteMany();
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
    await prisma.product.create({ data: { ...p, rating: 0, numReviews: 0, userId: admin.id } });
  }

  console.log('\n=== SEEDING COMPLETE ===');
  console.log('Admin:  admin@lumina.com / admin123');
  console.log('User:   user@lumina.com  / user123');
  console.log(`Products created: ${products.length}`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
