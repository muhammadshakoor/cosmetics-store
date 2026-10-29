'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Star, ShoppingCart, Heart } from 'lucide-react';
import { useCart } from '@/context/CartContext';
import { useWishlist } from '@/context/WishlistContext';
import toast from 'react-hot-toast';

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
  skincare:  'bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400',
  soaps:     'bg-rose-50 dark:bg-rose-950 text-rose-700 dark:text-rose-400',
  bodycare:  'bg-teal-50 dark:bg-teal-950 text-teal-700 dark:text-teal-400',
  haircare:  'bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-400',
  fragrance: 'bg-purple-50 dark:bg-purple-950 text-purple-700 dark:text-purple-400',
  makeup:    'bg-pink-50 dark:bg-pink-950 text-pink-700 dark:text-pink-400',
};

export default function ProductCard({ product }: { product: ProductType }) {
  const { addToCart } = useCart();
  const { isWishlisted, toggle } = useWishlist();
  const wishlisted = isWishlisted(product._id);
  const [added, setAdded] = useState(false);

  const handleAddToCart = () => {
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

  const catClass = categoryColors[product.category?.toLowerCase()] || 'bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-gray-400';

  const href = `/products/${product._id}`;
  const fallbackImg = `https://picsum.photos/seed/${product._id}/400/400`;

  // Buttons sit beside the links (not inside them) so the markup stays valid and keyboard-friendly
  return (
    <div className="group relative h-full flex flex-col bg-white dark:bg-gray-800 rounded-3xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 border border-gray-100 dark:border-gray-700 hover:border-rose-100 dark:hover:border-rose-900/40 hover:-translate-y-1.5">

      {/* Image */}
      <div className="relative overflow-hidden bg-[#FFF8F5] dark:bg-gray-700 aspect-square">
        <Link href={href} tabIndex={-1} aria-hidden="true" className="block w-full h-full">
          <img
            src={product.image || fallbackImg}
            alt=""
            loading="lazy"
            decoding="async"
            className="w-full h-full object-cover group-hover:scale-108 transition-transform duration-700"
            onError={(e) => { e.currentTarget.src = fallbackImg; }}
          />
        </Link>

        {/* Out of stock overlay */}
        {product.countInStock === 0 && (
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center pointer-events-none">
            <span className="text-white font-bold text-xs bg-black/60 px-3 py-1.5 rounded-full tracking-wide uppercase">Sold Out</span>
          </div>
        )}

        {/* Category badge */}
        <div className="absolute top-3 left-3 pointer-events-none">
          <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full ${catClass}`}>
            {product.category}
          </span>
        </div>

        {/* Wishlist */}
        <button
          type="button"
          onClick={() => toggle(product._id)}
          aria-label={wishlisted ? `Remove ${product.name} from wishlist` : `Add ${product.name} to wishlist`}
          aria-pressed={wishlisted}
          className="absolute top-3 right-3 w-9 h-9 bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm rounded-full shadow-md flex items-center justify-center hover:scale-110 transition-transform"
        >
          <Heart size={15} className={wishlisted ? 'fill-[#C2185B] text-[#C2185B]' : 'text-gray-500 dark:text-gray-400'} />
        </button>

        {/* Add to Cart — always visible on touch screens, revealed on hover/focus with a mouse */}
        {product.countInStock > 0 && (
          <div className="absolute bottom-0 left-0 right-0 p-3 bg-linear-to-t from-black/20 to-transparent transition-all duration-300 can-hover:opacity-0 can-hover:translate-y-2 can-hover:group-hover:opacity-100 can-hover:group-hover:translate-y-0 can-hover:group-focus-within:opacity-100 can-hover:group-focus-within:translate-y-0">
            <button
              type="button"
              onClick={handleAddToCart}
              aria-label={`Add ${product.name} to cart`}
              className={`w-full flex items-center justify-center gap-2 py-2.5 text-white text-xs font-bold rounded-2xl transition-all ${
                added ? 'bg-green-600' : 'bg-[#C2185B] hover:bg-[#A31555]'
              }`}
            >
              <ShoppingCart size={13} />
              {added ? 'Added!' : 'Add to Cart'}
            </button>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-4 flex-1 flex flex-col">
        <p className="text-[10px] text-[#C2185B] dark:text-rose-400 font-bold uppercase tracking-widest mb-1">{product.brand}</p>
        <h3 className="font-semibold text-[#1A0A0E] dark:text-gray-100 text-sm leading-snug mb-2.5 line-clamp-2 group-hover:text-[#C2185B] dark:group-hover:text-rose-400 transition-colors">
          <Link href={href} className="focus-visible:outline-none focus-visible:underline">{product.name}</Link>
        </h3>

        {/* Stars */}
        <div className="flex items-center gap-1 mb-3" aria-label={`Rated ${product.rating.toFixed(1)} out of 5 from ${product.numReviews} reviews`}>
          {[1, 2, 3, 4, 5].map((s) => (
            <Star key={s} size={11} aria-hidden="true" className={s <= Math.round(product.rating) ? 'fill-amber-400 text-amber-400' : 'fill-gray-200 dark:fill-gray-600 text-gray-200 dark:text-gray-600'} />
          ))}
          <span className="text-[10px] text-gray-500 dark:text-gray-400 ml-0.5" aria-hidden="true">({product.numReviews})</span>
        </div>

        {/* Price row */}
        <div className="mt-auto flex items-center justify-between gap-2">
          <span className="text-lg font-extrabold text-[#1A0A0E] dark:text-gray-100">Rs. {Math.round(product.price).toLocaleString()}</span>
          <span className={`text-[10px] px-2.5 py-1 rounded-full font-bold tracking-wide whitespace-nowrap ${
            product.countInStock > 5  ? 'bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-400' :
            product.countInStock > 0  ? 'bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300 font-extrabold' :
            'bg-red-50 dark:bg-red-950 text-red-600 dark:text-red-400'
          }`}>
            {product.countInStock > 5 ? 'In Stock' : product.countInStock > 0 ? `Only ${product.countInStock} left` : 'Sold Out'}
          </span>
        </div>
      </div>
    </div>
  );
}
