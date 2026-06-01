'use client';

import Link from 'next/link';
import { Star, ShoppingCart, Heart } from 'lucide-react';
import { useCart } from '@/context/CartContext';
import toast from 'react-hot-toast';
import { useState } from 'react';

export interface ProductType {
  _id: string;
  name: string;
  image: string;
  brand: string;
  category: string;
  description: string;
  rating: number;
  numReviews: number;
  price: number;
  countInStock: number;
}

const categoryColors: Record<string, string> = {
  skincare:  'bg-emerald-50 text-emerald-700',
  makeup:    'bg-pink-50 text-pink-700',
  fragrance: 'bg-purple-50 text-purple-700',
  haircare:  'bg-amber-50 text-amber-700',
};

export default function ProductCard({ product }: { product: ProductType }) {
  const { addToCart } = useCart();
  const [wishlisted, setWishlisted] = useState(false);
  const [added, setAdded] = useState(false);

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    if (product.countInStock === 0) return;
    addToCart({
      product: product._id,
      name: product.name,
      image: product.image,
      price: product.price,
      qty: 1,
      countInStock: product.countInStock,
    });
    setAdded(true);
    toast.success(`${product.name} added!`, { duration: 1800 });
    setTimeout(() => setAdded(false), 1800);
  };

  const catClass = categoryColors[product.category?.toLowerCase()] || 'bg-gray-50 text-gray-600';

  return (
    <Link href={`/products/${product._id}`} className="group block">
      <div className="bg-white rounded-3xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 border border-gray-100 hover:border-rose-100 hover:-translate-y-1.5">

        {/* Image */}
        <div className="relative overflow-hidden bg-[#FFF8F5] aspect-square">
          <img
            src={product.image || `https://picsum.photos/seed/${product._id}/400/400`}
            alt={product.name}
            className="w-full h-full object-cover group-hover:scale-108 transition-transform duration-700"
            onError={(e) => { e.currentTarget.src = `https://picsum.photos/seed/${product._id}/400/400`; }}
          />

          {/* Out of stock overlay */}
          {product.countInStock === 0 && (
            <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
              <span className="text-white font-bold text-xs bg-black/60 px-3 py-1.5 rounded-full tracking-wide uppercase">Sold Out</span>
            </div>
          )}

          {/* Category badge */}
          <div className="absolute top-3 left-3">
            <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full ${catClass}`}>
              {product.category}
            </span>
          </div>

          {/* Wishlist */}
          <button
            onClick={(e) => { e.preventDefault(); setWishlisted(!wishlisted); }}
            className="absolute top-3 right-3 w-8 h-8 bg-white/95 backdrop-blur-sm rounded-full shadow-md flex items-center justify-center hover:scale-110 transition-transform"
          >
            <Heart size={13} className={wishlisted ? 'fill-[#C2185B] text-[#C2185B]' : 'text-gray-400'} />
          </button>

          {/* Add to Cart — slides up on hover */}
          {product.countInStock > 0 && (
            <div className="absolute bottom-0 left-0 right-0 p-3 translate-y-full group-hover:translate-y-0 transition-transform duration-300">
              <button
                onClick={handleAddToCart}
                className={`w-full flex items-center justify-center gap-2 py-2.5 text-white text-xs font-bold rounded-2xl transition-all ${
                  added ? 'bg-green-500' : 'bg-[#C2185B] hover:bg-[#A31555]'
                }`}
              >
                <ShoppingCart size={13} />
                {added ? 'Added!' : 'Add to Cart'}
              </button>
            </div>
          )}
        </div>

        {/* Info */}
        <div className="p-4">
          <p className="text-[10px] text-[#C2185B] font-bold uppercase tracking-widest mb-1">{product.brand}</p>
          <h3 className="font-semibold text-[#1A0A0E] text-sm leading-snug mb-2.5 line-clamp-2 group-hover:text-[#C2185B] transition-colors">
            {product.name}
          </h3>

          {/* Stars */}
          <div className="flex items-center gap-1 mb-3">
            {[1, 2, 3, 4, 5].map((s) => (
              <Star key={s} size={11} className={s <= Math.round(product.rating) ? 'fill-amber-400 text-amber-400' : 'fill-gray-200 text-gray-200'} />
            ))}
            <span className="text-[10px] text-gray-400 ml-0.5">({product.numReviews})</span>
          </div>

          {/* Price row */}
          <div className="flex items-center justify-between">
            <span className="text-lg font-extrabold text-[#1A0A0E]">${product.price.toFixed(2)}</span>
            <span className={`text-[10px] px-2.5 py-1 rounded-full font-bold tracking-wide ${
              product.countInStock > 5  ? 'bg-green-50 text-green-700' :
              product.countInStock > 0  ? 'bg-amber-50 text-amber-700' :
              'bg-red-50 text-red-600'
            }`}>
              {product.countInStock > 5 ? 'In Stock' : product.countInStock > 0 ? `${product.countInStock} left` : 'Sold Out'}
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}
