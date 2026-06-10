import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { supabase } from '@/lib/supabase';

const products = [
  { name: 'Rose Petal Glow Serum',        image: 'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=400&h=400&fit=crop&auto=format', brand: 'Lumina', category: 'skincare',   description: 'A luxurious facial serum infused with rose extract and hyaluronic acid. Brightens skin tone and locks in moisture for a radiant, dewy glow all day long.',    price: 2499, countInStock: 15, rating: 4.8, numReviews: 124 },
  { name: 'Velvet Matte Lipstick',         image: 'https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=400&h=400&fit=crop&auto=format', brand: 'Lumina', category: 'makeup',     description: 'Long-lasting matte lipstick that stays vibrant for up to 12 hours. Formulated with vitamin E to keep lips moisturized and smooth.',                          price: 1199, countInStock: 30, rating: 4.6, numReviews: 87  },
  { name: 'Hydra-Boost Moisturizer',       image: 'https://images.unsplash.com/photo-1556228578-8c89e6adf883?w=400&h=400&fit=crop&auto=format', brand: 'Lumina', category: 'skincare',   description: 'Intense 72-hour hydration moisturizer with ceramides and niacinamide. Suitable for all skin types, absorbs quickly without greasiness.',                     price: 3299, countInStock: 8,  rating: 4.9, numReviews: 203 },
  { name: 'Golden Hour Highlighter',       image: 'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=400&h=400&fit=crop&auto=format', brand: 'Lumina', category: 'makeup',     description: 'Buildable, blendable highlighter with a warm golden glow. Perfect for cheekbones, brow bones, and inner corners for a sun-kissed look.',                    price: 1799, countInStock: 20, rating: 4.7, numReviews: 56  },
  { name: 'Midnight Bloom Eau de Parfum',  image: 'https://images.unsplash.com/photo-1592945403244-b3fbafd7f539?w=400&h=400&fit=crop&auto=format', brand: 'Lumina', category: 'fragrance', description: 'A captivating floral-musk fragrance with top notes of jasmine and bergamot. Long-lasting 8+ hour wear. 50ml bottle.',                                         price: 4999, countInStock: 12, rating: 4.9, numReviews: 178 },
  { name: 'Argan Oil Hair Mask',           image: 'https://images.unsplash.com/photo-1526045612212-70caf35c14df?w=400&h=400&fit=crop&auto=format', brand: 'Lumina', category: 'haircare',  description: 'Deep conditioning hair mask with pure Moroccan argan oil. Restores shine, reduces frizz, and repairs damaged hair in just 10 minutes.',                     price: 1999, countInStock: 25, rating: 4.7, numReviews: 92  },
  { name: 'Vitamin C Brightening Toner',   image: 'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=400&h=400&fit=crop&auto=format', brand: 'Lumina', category: 'skincare',   description: 'Alcohol-free toner with 10% Vitamin C and green tea extract. Evens skin tone, minimizes pores, and preps skin for serums.',                                price: 1599, countInStock: 18, rating: 4.6, numReviews: 65  },
  { name: 'Volumizing Mascara',            image: 'https://images.unsplash.com/photo-1512207736890-6ffed8a84e8d?w=400&h=400&fit=crop&auto=format', brand: 'Lumina', category: 'makeup',     description: 'Buildable, clump-free mascara that volumizes and lengthens lashes. Smudge-proof formula lasts all day. Removes easily with warm water.',                   price: 1099, countInStock: 40, rating: 4.5, numReviews: 134 },
  { name: 'Pearl Drop Earrings',           image: 'https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?w=400&h=400&fit=crop&auto=format', brand: 'Lumina', category: 'jewelry',    description: 'Elegant freshwater pearl drop earrings with gold-plated hooks. Lightweight and versatile — perfect for everyday wear or special occasions.',                price: 899,  countInStock: 35, rating: 4.7, numReviews: 48  },
  { name: 'Kundan Choker Set',             image: 'https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=400&h=400&fit=crop&auto=format', brand: 'Lumina', category: 'jewelry',    description: 'Traditional Kundan choker necklace with matching earrings. Intricate stone work set in gold-tone metal. Ideal for weddings and festive occasions.',          price: 2499, countInStock: 15, rating: 4.8, numReviews: 62  },
  { name: 'Gold-Plated Bangles Set',       image: 'https://images.unsplash.com/photo-1573408301185-9519f94bf0a5?w=400&h=400&fit=crop&auto=format', brand: 'Lumina', category: 'jewelry',    description: 'Set of 6 gold-plated bangles with intricate carved patterns. Tarnish-resistant coating for long-lasting shine. Available in standard Pakistani sizes.',      price: 1299, countInStock: 28, rating: 4.5, numReviews: 73  },
  { name: 'Crystal Jhumka Earrings',       image: 'https://images.unsplash.com/photo-1588444837495-c6cfeb53f32d?w=400&h=400&fit=crop&auto=format', brand: 'Lumina', category: 'jewelry',    description: 'Classic Pakistani jhumka earrings adorned with sparkling crystals and beaded tassels. Lightweight design with secure screw backs.',                          price: 999,  countInStock: 42, rating: 4.6, numReviews: 91  },
  { name: 'Stone-Studded Ring Set',        image: 'https://images.unsplash.com/photo-1605100804763-247f67b3557e?w=400&h=400&fit=crop&auto=format', brand: 'Lumina', category: 'jewelry',    description: 'Set of 3 stackable rings with colourful semi-precious stones. Adjustable size fits most fingers. Mix and match for a trendy layered look.',                 price: 699,  countInStock: 50, rating: 4.4, numReviews: 38  },
];

export async function GET() {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ message: 'Seed not allowed in production' }, { status: 403 });
  }

  try {
    // Clear existing data
    await supabase.from('OrderItem').delete().neq('id', 'none');
    await supabase.from('Order').delete().neq('id', 'none');
    await supabase.from('Product').delete().neq('id', 'none');
    await supabase.from('User').delete().neq('id', 'none');

    // Create admin user
    const adminId = crypto.randomUUID();
    const now = new Date().toISOString();
    await supabase.from('User').insert({
      id: adminId, name: 'Admin User', email: 'admin@lumina.com',
      password: await bcrypt.hash('admin123', 10),
      isAdmin: true, createdAt: now, updatedAt: now,
    });

    // Create test user
    await supabase.from('User').insert({
      id: crypto.randomUUID(), name: 'Test User', email: 'user@lumina.com',
      password: await bcrypt.hash('user123', 10),
      isAdmin: false, createdAt: now, updatedAt: now,
    });

    // Create products
    const productRows = products.map(p => ({
      id: crypto.randomUUID(), ...p, userId: adminId,
      createdAt: now, updatedAt: now,
    }));
    await supabase.from('Product').insert(productRows);

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
