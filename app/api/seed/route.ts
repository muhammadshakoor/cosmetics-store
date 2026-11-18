import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { supabase } from '@/lib/supabase';

export async function GET() {
  if (process.env.NODE_ENV === 'production') return NextResponse.json({ message: 'Not found' }, { status: 404 });
  return NextResponse.json({ message: 'Use POST with the x-seed-secret header to seed a disposable local database.' }, { status: 405, headers: { Allow: 'POST' } });
}

export async function POST(request: NextRequest) {
  if (process.env.NODE_ENV === 'production') return NextResponse.json({ message: 'Not found' }, { status: 404 });
  return handleSeed(request);
}

const products = [
  {
    name: 'Manjistha & Rose Pure Organic Soap',
    image: '/products/organic/manjistha-rose-organic-soap.jpeg',
    brand: 'Lumina Botanicals',
    category: 'soaps',
    description: 'Handcrafted with Ayurvedic Manjistha root extract and cold-pressed damask rose essential oils. Naturally evens skin tone, fades pigmentation, and leaves a luminous herbal glow. 100% organic, chemical & paraben free.',
    price: 499,
    countInStock: 35,
    rating: 0,
    numReviews: 0
  },
  {
    name: 'Activated Charcoal Detox Rose Soap',
    image: '/products/organic/charcoal-detox-rose-soap.jpeg',
    brand: 'Lumina Botanicals',
    category: 'soaps',
    description: 'Artisan rose-carved detox bar formulated with medical-grade activated bamboo charcoal and organic tea tree oil. Deeply pulls impurities and excess oil from pores without stripping essential skin hydration.',
    price: 450,
    countInStock: 40,
    rating: 0,
    numReviews: 0
  },
  {
    name: 'Pure Goat Milk & Coconut Pearl Rose Soap',
    image: '/products/organic/goat-milk-coconut-rose-soap.jpeg',
    brand: 'Lumina Botanicals',
    category: 'soaps',
    description: 'Ultra-gentle nourishing rose bar handcrafted with farm-fresh goat milk and cold-pressed extra virgin coconut oil. Rich in lactic acid and vitamins A & D for soft, supple, intensely hydrated skin.',
    price: 490,
    countInStock: 25,
    rating: 0,
    numReviews: 0
  },
  {
    name: 'Aloe Vera & Neem Soothing Rose Soap',
    image: '/products/organic/aloe-neem-rose-soap.jpeg',
    brand: 'Lumina Botanicals',
    category: 'soaps',
    description: 'Translucent botanical green soap enriched with fresh organic aloe vera gel and antibacterial wild neem extract. Calms redness, soothes acne, and restores natural moisture balance.',
    price: 450,
    countInStock: 30,
    rating: 0,
    numReviews: 0
  },
  {
    name: 'Raw Honey & Turmeric Glow Rose Soap',
    image: '/products/organic/honey-turmeric-rose-soap.jpeg',
    brand: 'Lumina Botanicals',
    category: 'soaps',
    description: 'Golden amber handcrafted bar crafted with unpasteurized wild forest honey and wild kasturi turmeric. Packed with natural antioxidants to brighten dark spots and protect the skin barrier.',
    price: 450,
    countInStock: 35,
    rating: 0,
    numReviews: 0
  },
  {
    name: 'Lavender & Wildberry Relaxing Rose Soap',
    image: '/products/organic/lavender-berry-rose-soap.jpeg',
    brand: 'Lumina Botanicals',
    category: 'soaps',
    description: 'Artisan purple rose bar infused with French lavender essential oil and antioxidant-rich wildberry extracts. Eases tension, calms irritated skin, and promotes relaxing nighttime rejuvenation.',
    price: 450,
    countInStock: 28,
    rating: 0,
    numReviews: 0
  },
  {
    name: 'French Rose Clay & Hibiscus Firming Soap',
    image: '/products/organic/french-rose-clay-soap.jpeg',
    brand: 'Lumina Botanicals',
    category: 'soaps',
    description: 'Mineral-rich French pink clay bar combined with organic hibiscus flower extract. Gently clarifies, improves skin elasticity, and leaves a silky, velvety smooth texture.',
    price: 470,
    countInStock: 32,
    rating: 0,
    numReviews: 0
  },
  {
    name: 'Sandalwood & Amber Swirl Artisan Soap',
    image: '/products/organic/sandalwood-amber-rose-soap.jpeg',
    brand: 'Lumina Botanicals',
    category: 'soaps',
    description: 'Luxurious swirled bar combining precious sandalwood oil and warm organic amber extracts. Delivers deep moisture, reduces blemishes, and envelops the senses in a natural woody aroma.',
    price: 520,
    countInStock: 20,
    rating: 0,
    numReviews: 0
  },
  {
    name: 'Botanical Neem & Spirulina Purifying Bar',
    image: '/products/organic/herbal-neem-spirulina-soap.jpeg',
    brand: 'Lumina Botanicals',
    category: 'soaps',
    description: 'Deep green botanical cleansing bar infused with spirulina microalgae and concentrated neem oil. A powerhouse purifying formula for troubled or congested skin.',
    price: 460,
    countInStock: 24,
    rating: 0,
    numReviews: 0
  },
  {
    name: 'Coffee & Walnut Dual-Layer Scrub Bar',
    image: '/products/organic/coffee-scrub-layer-soap.jpeg',
    brand: 'Lumina Botanicals',
    category: 'bodycare',
    description: 'Two-in-one exfoliating body bar featuring finely ground Arabica coffee and crushed walnut shells on the bottom layer, topped with a creamy moisturizing herbal soap relief. Polishes away dead skin cells.',
    price: 550,
    countInStock: 30,
    rating: 0,
    numReviews: 0
  },
  {
    name: 'Pure Almond & Rose Homemade Botanical Lotion',
    image: '/products/organic/homemade-almond-rose-lotion.jpeg',
    brand: 'Lumina Botanicals',
    category: 'bodycare',
    description: '100% natural, handcrafted lotion enriched with sweet almond oil, pure damask rose water, and organic shea butter. Lightweight, fast-absorbing formula that deeply hydrates dry skin for 48 hours without feeling sticky.',
    price: 850,
    countInStock: 45,
    rating: 0,
    numReviews: 0
  },
  {
    name: 'Artisan Organic Soaps Collection Gift Set',
    image: '/products/organic/artisan-organic-soaps-collection.jpeg',
    brand: 'Lumina Botanicals',
    category: 'soaps',
    description: 'A luxurious gift box featuring an assortment of our signature handcrafted organic soaps — Manjistha Rose, Activated Charcoal, Goat Milk Coconut, Honey Turmeric, Lavender Berry, and Coffee Scrub.',
    price: 2499,
    countInStock: 15,
    rating: 0,
    numReviews: 0
  },
  // ── Botanical Skincare & Haircare Essentials ──
  {
    name: 'Rose Petal Glow Serum',
    image: 'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=400&h=400&fit=crop&auto=format',
    brand: 'Lumina Botanicals',
    category: 'skincare',
    description: 'A luxurious facial serum infused with organic damask rose extract and plant hyaluronic acid. Brightens skin tone and locks in moisture for a radiant, dewy glow all day long.',
    price: 2499,
    countInStock: 15,
    rating: 0,
    numReviews: 0
  },
  {
    name: 'Hydra-Boost Botanical Moisturizer',
    image: 'https://images.unsplash.com/photo-1556228578-8c89e6adf883?w=400&h=400&fit=crop&auto=format',
    brand: 'Lumina Botanicals',
    category: 'skincare',
    description: 'Intense 72-hour hydration moisturizer with ceramides and niacinamide. Suitable for all skin types, absorbs quickly without greasiness.',
    price: 3299,
    countInStock: 8,
    rating: 0,
    numReviews: 0
  },
  {
    name: 'Vitamin C Brightening Herbal Toner',
    image: 'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=400&h=400&fit=crop&auto=format',
    brand: 'Lumina Botanicals',
    category: 'skincare',
    description: 'Alcohol-free toner with 10% Vitamin C and green tea extract. Evens skin tone, minimizes pores, and preps skin for organic serums.',
    price: 1599,
    countInStock: 18,
    rating: 0,
    numReviews: 0
  },
  {
    name: 'Organic Moroccan Argan Hair Mask',
    image: 'https://images.unsplash.com/photo-1526045612212-70caf35c14df?w=400&h=400&fit=crop&auto=format',
    brand: 'Lumina Botanicals',
    category: 'haircare',
    description: 'Deep conditioning hair mask with pure Moroccan argan oil and botanical keratin. Restores shine, reduces frizz, and repairs damaged hair in just 10 minutes.',
    price: 1999,
    countInStock: 25,
    rating: 0,
    numReviews: 0
  },
  {
    name: 'Midnight Bloom Natural Eau de Parfum',
    image: 'https://images.unsplash.com/photo-1592945403244-b3fbafd7f539?w=400&h=400&fit=crop&auto=format',
    brand: 'Lumina Botanicals',
    category: 'fragrance',
    description: 'A captivating botanical floral-musk fragrance with top notes of pure jasmine and Italian bergamot essential oils. 50ml glass flacon.',
    price: 4999,
    countInStock: 12,
    rating: 0,
    numReviews: 0
  },
];

async function handleSeed(request: NextRequest) {
  let target: URL;
  try { target = new URL(process.env.SUPABASE_URL || ''); }
  catch { return NextResponse.json({ message: 'Not found' }, { status: 404 }); }
  if (process.env.NODE_ENV !== 'development' || process.env.ALLOW_DESTRUCTIVE_SEED !== 'disposable-local-only'
    || target.protocol !== 'http:' || !['localhost', '127.0.0.1', '[::1]'].includes(target.hostname)
    || target.username || target.password || target.pathname !== '/' || target.search || target.hash) {
    return NextResponse.json({ message: 'Not found' }, { status: 404 });
  }

  const seedSecret = process.env.SEED_SECRET;
  const authHeader = request.headers.get('x-seed-secret');
  if (!seedSecret || seedSecret.length < 32 || authHeader !== seedSecret) {
    return NextResponse.json(
      { message: 'Unauthorized: A configured secret of at least 32 characters and matching x-seed-secret header are required.' },
      { status: 401 }
    );
  }

  try {
    // Clear existing data
    for (const table of ['Review', 'Complaint', 'OrderItem', 'Order', 'Product', 'User']) {
      const { error } = await supabase.from(table).delete().neq('id', 'none');
      if (error) throw new Error(`Could not clear ${table}`);
    }

    // Create admin user
    const adminId = crypto.randomUUID();
    const now = new Date().toISOString();
    const { error: adminError } = await supabase.from('User').insert({
      id: adminId, name: 'Admin User', email: 'admin@lumina.com',
      password: await bcrypt.hash('admin123', 10),
      isAdmin: true, emailVerified: true, createdAt: now, updatedAt: now,
    });
    if (adminError) throw new Error('Could not create demo administrator');

    // Create test user (pre-verified for development)
    const { error: userError } = await supabase.from('User').insert({
      id: crypto.randomUUID(), name: 'Test User', email: 'user@lumina.com',
      password: await bcrypt.hash('user123', 10),
      isAdmin: false, emailVerified: true, createdAt: now, updatedAt: now,
    });
    if (userError) throw new Error('Could not create demo customer');

    // Create products
    const productRows = products.map(p => ({
      id: crypto.randomUUID(), ...p, userId: adminId,
      rating: 0, numReviews: 0,
      createdAt: now, updatedAt: now,
    }));
    const { error: productError } = await supabase.from('Product').insert(productRows);
    if (productError) throw new Error('Could not create demo products');

    return NextResponse.json({
      message: 'Seeded successfully',
      admin: 'admin@lumina.com / admin123',
      user: 'user@lumina.com / user123',
      products: products.length,
    });
  } catch (e) {
    return NextResponse.json({ message: e instanceof Error ? e.message : 'Seed failed' }, { status: 500 });
  }
}
