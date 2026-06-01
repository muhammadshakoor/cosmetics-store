import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './models/user.model';
import Product from './models/product.model';
import Order from './models/order.model';

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/cosmetics-store';

const sampleProducts = [
  {
    name: 'Rose Petal Glow Serum',
    image: 'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=400&h=400&fit=crop',
    brand: 'Lumina',
    category: 'skincare',
    description: 'A luxurious facial serum infused with rose extract and hyaluronic acid. Brightens skin tone and locks in moisture for a radiant, dewy glow all day long.',
    price: 48.00,
    countInStock: 15,
    rating: 4.8,
    numReviews: 124,
  },
  {
    name: 'Velvet Matte Lipstick – Ruby Red',
    image: 'https://images.unsplash.com/photo-1586495777744-4e6af5dbaee8?w=400&h=400&fit=crop',
    brand: 'Lumina',
    category: 'makeup',
    description: 'Long-lasting matte lipstick that stays vibrant for up to 12 hours. Formulated with vitamin E to keep lips moisturized and smooth.',
    price: 24.00,
    countInStock: 30,
    rating: 4.6,
    numReviews: 87,
  },
  {
    name: 'Hydra-Boost Moisturizer',
    image: 'https://images.unsplash.com/photo-1556228578-8c89e6adf883?w=400&h=400&fit=crop',
    brand: 'Lumina',
    category: 'skincare',
    description: 'Intense 72-hour hydration moisturizer with ceramides and niacinamide. Suitable for all skin types, absorbs quickly without greasiness.',
    price: 62.00,
    countInStock: 8,
    rating: 4.9,
    numReviews: 203,
  },
  {
    name: 'Golden Hour Highlighter',
    image: 'https://images.unsplash.com/photo-1599733589046-833deccfe7de?w=400&h=400&fit=crop',
    brand: 'Lumina',
    category: 'makeup',
    description: 'Buildable, blendable highlighter with a warm golden glow. Perfect for cheekbones, brow bones, and inner corners for a sun-kissed look.',
    price: 35.00,
    countInStock: 20,
    rating: 4.7,
    numReviews: 56,
  },
  {
    name: 'Midnight Bloom Eau de Parfum',
    image: 'https://images.unsplash.com/photo-1541643600914-78b084683702?w=400&h=400&fit=crop',
    brand: 'Lumina',
    category: 'fragrance',
    description: 'A captivating floral-musk fragrance with top notes of jasmine and bergamot. Long-lasting 8+ hour wear. 50ml bottle.',
    price: 89.00,
    countInStock: 12,
    rating: 4.9,
    numReviews: 178,
  },
  {
    name: 'Argan Oil Hair Mask',
    image: 'https://images.unsplash.com/photo-1607006344380-b6775a0824a7?w=400&h=400&fit=crop',
    brand: 'Lumina',
    category: 'haircare',
    description: 'Deep conditioning hair mask with pure Moroccan argan oil. Restores shine, reduces frizz, and repairs damaged hair in just 10 minutes.',
    price: 38.00,
    countInStock: 25,
    rating: 4.7,
    numReviews: 92,
  },
  {
    name: 'Vitamin C Brightening Toner',
    image: 'https://images.unsplash.com/photo-1571781926291-c477ebfd024b?w=400&h=400&fit=crop',
    brand: 'Lumina',
    category: 'skincare',
    description: 'Alcohol-free toner with 10% Vitamin C and green tea extract. Evens skin tone, minimizes pores, and preps skin for serums.',
    price: 32.00,
    countInStock: 18,
    rating: 4.6,
    numReviews: 65,
  },
  {
    name: 'Volumizing Mascara – Black',
    image: 'https://images.unsplash.com/photo-1512207736890-6ffed8a84e8d?w=400&h=400&fit=crop',
    brand: 'Lumina',
    category: 'makeup',
    description: 'Buildable, clump-free mascara that volumizes and lengthens lashes. Smudge-proof formula lasts all day. Removes easily with warm water.',
    price: 22.00,
    countInStock: 40,
    rating: 4.5,
    numReviews: 134,
  },
];

const seedData = async () => {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('MongoDB Connected');

    // Clear existing data
    await Order.deleteMany({});
    await Product.deleteMany({});
    await User.deleteMany({});
    console.log('Cleared existing data');

    // Create admin user
    const adminUser = await User.create({
      name: 'Admin User',
      email: 'admin@lumina.com',
      password: 'admin123',
      isAdmin: true,
    });
    console.log(`Admin user created: ${adminUser.email}`);

    // Create regular test user
    await User.create({
      name: 'Test User',
      email: 'user@lumina.com',
      password: 'user123',
      isAdmin: false,
    });
    console.log('Test user created: user@lumina.com');

    // Create products linked to admin user
    const productsWithUser = sampleProducts.map((p) => ({
      ...p,
      user: adminUser._id,
    }));

    await Product.insertMany(productsWithUser);
    console.log(`${sampleProducts.length} products seeded`);

    console.log('\n=== SEEDING COMPLETE ===');
    console.log('Admin login: admin@lumina.com / admin123');
    console.log('User login:  user@lumina.com  / user123');
    process.exit(0);
  } catch (error: any) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
};

seedData();
