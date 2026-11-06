'use client';

import Link from 'next/link';
import { Star, ShoppingCart, Heart } from 'lucide-react';
import { useCart } from '@/context/CartContext';
import { useAuth } from '@/context/AuthContext';
import { useWishlist } from '@/context/WishlistContext';
import ProductImage from './ProductImage';
import toast from 'react-hot-toast';
import type { Product } from '@/types/api';

export type ProductType = Product;

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
  const { user } = useAuth();
  const { isWishlisted, toggle } = useWishlist();
  const wishlisted = isWishlisted(product._id);

  const handleAddToCart = () => {
    if (product.countInStock === 0) return;
    if (user?.isAdmin) { toast.error('Use a customer account to shop.'); return; }
    addToCart({
      product: product._id,
      name: product.name,
      image: product.image,
      price: product.price,
      qty: 1,
      countInStock: product.countInStock,
    });
    toast.success(`${product.name} added!`, { duration: 1800 });
  };

  const catClass = categoryColors[product.category?.toLowerCase()] || 'bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-gray-400';

  return (
    <article className="group block h-full rounded-3xl bg-white dark:bg-gray-800 shadow-sm hover:shadow-xl transition-all duration-300 border border-gray-100 dark:border-gray-700 hover:border-rose-100 dark:hover:border-rose-900/40 hover:-translate-y-1.5">

        {/* Image Container with Next/Image */}
        <div className="relative overflow-hidden rounded-t-3xl bg-[#FFF8F5] dark:bg-gray-700 aspect-square">
          <Link href={`/products/${product._id}`} aria-label={`View ${product.name}`} className="absolute inset-0">
          <ProductImage
            src={product.image}
            alt={product.name}
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            className="object-cover group-hover:scale-108 transition-transform duration-700"
          />
          </Link>

          {/* Out of stock overlay */}
          {product.countInStock === 0 && (
            <div className="pointer-events-none absolute inset-0 bg-black/40 flex items-center justify-center z-10">
              <span className="text-white font-bold text-xs bg-black/60 px-3 py-1.5 rounded-full tracking-wide uppercase">Sold Out</span>
            </div>
          )}

          {/* Category badge */}
          <div className="pointer-events-none absolute top-3 left-3 z-10">
            <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full ${catClass}`}>
              {product.category}
            </span>
          </div>

          {/* Wishlist */}
          <button
            onClick={() => toggle(product._id)}
            aria-label={wishlisted ? `Remove ${product.name} from wishlist` : `Add ${product.name} to wishlist`}
            aria-pressed={wishlisted}
            className="absolute top-3 right-3 z-10 w-8 h-8 bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm rounded-full shadow-md flex items-center justify-center hover:scale-110 transition-transform"
          >
            <Heart size={13} className={wishlisted ? 'fill-[#C2185B] text-[#C2185B]' : 'text-gray-400'} />
          </button>

          {/* Add to Cart — always visible */}
          {product.countInStock > 0 && (
            <div className="absolute bottom-0 left-0 right-0 p-3 bg-linear-to-t from-black/20 to-transparent z-10">
              <button
                onClick={handleAddToCart}
                aria-label={`Add ${product.name} to cart`}
                className="w-full flex items-center justify-center gap-2 py-2.5 text-white text-xs font-bold rounded-2xl transition-all bg-[#C2185B] hover:bg-[#A31555]"
              >
                <ShoppingCart size={13} />
                Add to Cart
              </button>
            </div>
          )}
        </div>

        {/* Info */}
        <div className="p-4">
          <p className="text-[10px] text-[#C2185B] font-bold uppercase tracking-widest mb-1">{product.brand}</p>
          <h3 className="font-semibold text-[#1A0A0E] dark:text-gray-100 text-sm leading-snug mb-2.5 line-clamp-2 group-hover:text-[#C2185B] transition-colors">
            <Link href={`/products/${product._id}`}>{product.name}</Link>
          </h3>

          {/* Stars */}
          <div aria-label={`${product.rating.toFixed(1)} out of 5 from ${product.numReviews} reviews`} className="flex items-center gap-1 mb-3">
            {[1, 2, 3, 4, 5].map((s) => (
              <Star aria-hidden="true" key={s} size={11} className={s <= Math.round(product.rating) ? 'fill-amber-400 text-amber-400' : 'fill-gray-200 dark:fill-gray-600 text-gray-200 dark:text-gray-600'} />
            ))}
            <span className="text-[10px] text-gray-400 dark:text-gray-500 ml-0.5">({product.numReviews})</span>
          </div>

          {/* Price row */}
          <div className="flex items-center justify-between">
            <span className="text-lg font-extrabold text-[#1A0A0E] dark:text-gray-100">Rs. {product.price.toLocaleString('en-PK', { maximumFractionDigits: 2 })}</span>
            <span className={`text-[10px] px-2.5 py-1 rounded-full font-bold tracking-wide ${
              product.countInStock > 5  ? 'bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-400' :
              product.countInStock > 0  ? 'bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300 font-extrabold animate-pulse' :
              'bg-red-50 dark:bg-red-950 text-red-600 dark:text-red-400'
            }`}>
              {product.countInStock > 5 ? 'In Stock' : product.countInStock > 0 ? `${product.countInStock} left` : 'Sold Out'}
            </span>
          </div>
        </div>
    </article>
  );
}
