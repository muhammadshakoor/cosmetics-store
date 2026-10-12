import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const sampleProducts = [
  {
    name: 'Manjistha & Rose Pure Organic Soap',
    image: '/products/organic/manjistha-rose-organic-soap.jpeg',
    brand: 'Lumina Botanicals',
    category: 'soaps',
    description: 'Handcrafted with Ayurvedic Manjistha root extract and cold-pressed damask rose essential oils. Naturally evens skin tone, fades pigmentation, and leaves a luminous herbal glow. 100% organic, chemical & paraben free.',
    price: 499,
    countInStock: 35,
    rating: 4.9,
    numReviews: 84
  },
  {
    name: 'Activated Charcoal Detox Rose Soap',
    image: '/products/organic/charcoal-detox-rose-soap.jpeg',
    brand: 'Lumina Botanicals',
    category: 'soaps',
    description: 'Artisan rose-carved detox bar formulated with medical-grade activated bamboo charcoal and organic tea tree oil. Deeply pulls impurities and excess oil from pores without stripping essential skin hydration.',
    price: 450,
    countInStock: 40,
    rating: 4.8,
    numReviews: 95
  },
  {
    name: 'Pure Goat Milk & Coconut Pearl Rose Soap',
    image: '/products/organic/goat-milk-coconut-rose-soap.jpeg',
    brand: 'Lumina Botanicals',
    category: 'soaps',
    description: 'Ultra-gentle nourishing rose bar handcrafted with farm-fresh goat milk and cold-pressed extra virgin coconut oil. Rich in lactic acid and vitamins A & D for soft, supple, intensely hydrated skin.',
    price: 490,
    countInStock: 25,
    rating: 4.9,
    numReviews: 110
  },
  {
    name: 'Aloe Vera & Neem Soothing Rose Soap',
    image: '/products/organic/aloe-neem-rose-soap.jpeg',
    brand: 'Lumina Botanicals',
    category: 'soaps',
    description: 'Translucent botanical green soap enriched with fresh organic aloe vera gel and antibacterial wild neem extract. Calms redness, soothes acne, and restores natural moisture balance.',
    price: 450,
    countInStock: 30,
    rating: 4.7,
    numReviews: 62
  },
  {
    name: 'Raw Honey & Turmeric Glow Rose Soap',
    image: '/products/organic/honey-turmeric-rose-soap.jpeg',
    brand: 'Lumina Botanicals',
    category: 'soaps',
    description: 'Golden amber handcrafted bar crafted with unpasteurized wild forest honey and wild kasturi turmeric. Packed with natural antioxidants to brighten dark spots and protect the skin barrier.',
    price: 450,
    countInStock: 35,
    rating: 4.9,
    numReviews: 78
  },
  {
    name: 'Lavender & Wildberry Relaxing Rose Soap',
    image: '/products/organic/lavender-berry-rose-soap.jpeg',
    brand: 'Lumina Botanicals',
    category: 'soaps',
    description: 'Artisan purple rose bar infused with French lavender essential oil and antioxidant-rich wildberry extracts. Eases tension, calms irritated skin, and promotes relaxing nighttime rejuvenation.',
    price: 450,
    countInStock: 28,
    rating: 4.8,
    numReviews: 57
  },
  {
    name: 'French Rose Clay & Hibiscus Firming Soap',
    image: '/products/organic/french-rose-clay-soap.jpeg',
    brand: 'Lumina Botanicals',
    category: 'soaps',
    description: 'Mineral-rich French pink clay bar combined with organic hibiscus flower extract. Gently clarifies, improves skin elasticity, and leaves a silky, velvety smooth texture.',
    price: 470,
    countInStock: 32,
    rating: 4.7,
    numReviews: 43
  },
  {
    name: 'Sandalwood & Amber Swirl Artisan Soap',
    image: '/products/organic/sandalwood-amber-rose-soap.jpeg',
    brand: 'Lumina Botanicals',
    category: 'soaps',
    description: 'Luxurious swirled bar combining precious sandalwood oil and warm organic amber extracts. Delivers deep moisture, reduces blemishes, and envelops the senses in a natural woody aroma.',
    price: 520,
    countInStock: 20,
    rating: 4.8,
    numReviews: 64
  },
  {
    name: 'Botanical Neem & Spirulina Purifying Bar',
    image: '/products/organic/herbal-neem-spirulina-soap.jpeg',
    brand: 'Lumina Botanicals',
    category: 'soaps',
    description: 'Deep green botanical cleansing bar infused with spirulina microalgae and concentrated neem oil. A powerhouse purifying formula for troubled or congested skin.',
    price: 460,
    countInStock: 24,
    rating: 4.6,
    numReviews: 39
  },
  {
    name: 'Coffee & Walnut Dual-Layer Scrub Bar',
    image: '/products/organic/coffee-scrub-layer-soap.jpeg',
    brand: 'Lumina Botanicals',
    category: 'bodycare',
    description: 'Two-in-one exfoliating body bar featuring finely ground Arabica coffee and crushed walnut shells on the bottom layer, topped with a creamy moisturizing herbal soap relief. Polishes away dead skin cells.',
    price: 550,
    countInStock: 30,
    rating: 4.9,
    numReviews: 91
  },
  {
    name: 'Pure Almond & Rose Homemade Botanical Lotion',
    image: '/products/organic/homemade-almond-rose-lotion.jpeg',
    brand: 'Lumina Botanicals',
    category: 'bodycare',
    description: '100% natural, handcrafted lotion enriched with sweet almond oil, pure damask rose water, and organic shea butter. Lightweight, fast-absorbing formula that deeply hydrates dry skin for 48 hours without feeling sticky.',
    price: 850,
    countInStock: 45,
    rating: 4.9,
    numReviews: 132
  },
  {
    name: 'Artisan Organic Soaps Collection Gift Set',
    image: '/products/organic/artisan-organic-soaps-collection.jpeg',
    brand: 'Lumina Botanicals',
    category: 'soaps',
    description: 'A luxurious gift box featuring an assortment of our signature handcrafted organic soaps — Manjistha Rose, Activated Charcoal, Goat Milk Coconut, Honey Turmeric, Lavender Berry, and Coffee Scrub.',
    price: 2499,
    countInStock: 15,
    rating: 5.0,
    numReviews: 44
  },
  {
    name: 'Rose Petal Glow Serum',
    image: 'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=400&h=400&fit=crop',
    brand: 'Lumina Botanicals',
    category: 'skincare',
    description: 'A luxurious facial serum infused with organic damask rose extract and plant hyaluronic acid. Brightens skin tone and locks in moisture for a radiant, dewy glow all day long.',
    price: 2499,
    countInStock: 15,
    rating: 4.8,
    numReviews: 124
  },
  {
    name: 'Hydra-Boost Botanical Moisturizer',
    image: 'https://images.unsplash.com/photo-1556228578-8c89e6adf883?w=400&h=400&fit=crop',
    brand: 'Lumina Botanicals',
    category: 'skincare',
    description: 'Intense 72-hour hydration moisturizer with ceramides and niacinamide. Suitable for all skin types, absorbs quickly without greasiness.',
    price: 3299,
    countInStock: 8,
    rating: 4.9,
    numReviews: 203
  },
  {
    name: 'Vitamin C Brightening Herbal Toner',
    image: 'https://images.unsplash.com/photo-1571781926291-c477ebfd024b?w=400&h=400&fit=crop',
    brand: 'Lumina Botanicals',
    category: 'skincare',
    description: 'Alcohol-free toner with 10% Vitamin C and green tea extract. Evens skin tone, minimizes pores, and preps skin for organic serums.',
    price: 1599,
    countInStock: 18,
    rating: 4.6,
    numReviews: 65
  },
  {
    name: 'Organic Moroccan Argan Hair Mask',
    image: 'https://images.unsplash.com/photo-1607006344380-b6775a0824a7?w=400&h=400&fit=crop',
    brand: 'Lumina Botanicals',
    category: 'haircare',
    description: 'Deep conditioning hair mask with pure Moroccan argan oil and botanical keratin. Restores shine, reduces frizz, and repairs damaged hair in just 10 minutes.',
    price: 1999,
    countInStock: 25,
    rating: 4.7,
    numReviews: 92
  },
  {
    name: 'Midnight Bloom Natural Eau de Parfum',
    image: 'https://images.unsplash.com/photo-1541643600914-78b084683702?w=400&h=400&fit=crop',
    brand: 'Lumina Botanicals',
    category: 'fragrance',
    description: 'A captivating botanical floral-musk fragrance with top notes of pure jasmine and Italian bergamot essential oils. 50ml glass flacon.',
    price: 4999,
    countInStock: 12,
    rating: 4.9,
    numReviews: 178
  },
];

const seedData = async () => {
  try {
    const now = new Date().toISOString();

    // Clear existing data
    await supabase.from('OrderItem').delete().neq('id', '');
    await supabase.from('Order').delete().neq('id', '');
    await supabase.from('Product').delete().neq('id', '');
    await supabase.from('User').delete().neq('id', '');
    console.log('Cleared existing data');

    // Create admin user
    const adminId = crypto.randomUUID();
    const { error: adminError } = await supabase.from('User').insert({
      id: adminId,
      name: 'Admin User',
      email: 'admin@lumina.com',
      password: await bcrypt.hash('admin123', 10),
      isAdmin: true,
      emailVerified: true,
      createdAt: now, updatedAt: now,
    });
    if (adminError) throw new Error(adminError.message);
    console.log('Admin user created: admin@lumina.com');

    // Create regular test user
    const { error: userError } = await supabase.from('User').insert({
      id: crypto.randomUUID(),
      name: 'Test User',
      email: 'user@lumina.com',
      password: await bcrypt.hash('user123', 10),
      isAdmin: false,
      emailVerified: true,
      createdAt: now, updatedAt: now,
    });
    if (userError) throw new Error(userError.message);
    console.log('Test user created: user@lumina.com');

    // Create products linked to admin user
    const products = sampleProducts.map((p) => ({
      id: crypto.randomUUID(),
      ...p,
      userId: adminId,
      createdAt: now, updatedAt: now,
    }));

    const { error: productsError } = await supabase.from('Product').insert(products);
    if (productsError) throw new Error(productsError.message);
    console.log(`${products.length} products seeded`);

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
