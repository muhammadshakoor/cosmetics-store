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

export default function ProductCard({ product }: { product: ProductType }) {
  const { addToCart } = useCart();
  const [wishlisted, setWishlisted] = useState(false);

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
    toast.success(`${product.name} added to cart!`);
  };

  return (
    <Link href={`/products/${product._id}`} className="group block">
      <div className="bg-white rounded-3xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 border border-gray-100 hover:border-rose-100 hover:-translate-y-1">
        {/* Image */}
        <div className="relative overflow-hidden bg-gradient-to-br from-rose-50 to-pink-50 h-64">
          <img
            src={product.image || `https://picsum.photos/seed/${product._id}/400/400`}
            alt={product.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
          {product.countInStock === 0 && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
              <span className="text-white font-semibold text-sm bg-black/70 px-3 py-1 rounded-full">Out of Stock</span>
            </div>
          )}
          <button
            onClick={(e) => { e.preventDefault(); setWishlisted(!wishlisted); }}
            className="absolute top-3 right-3 p-2 bg-white/90 backdrop-blur-sm rounded-full shadow-md hover:scale-110 transition-transform"
          >
            <Heart size={14} className={wishlisted ? 'fill-rose-500 text-rose-500' : 'text-gray-400'} />
          </button>
          <div className="absolute bottom-0 left-0 right-0 p-3 translate-y-full group-hover:translate-y-0 transition-transform duration-300">
            <button
              onClick={handleAddToCart}
              disabled={product.countInStock === 0}
              className="w-full flex items-center justify-center gap-2 py-2 bg-rose-500 hover:bg-rose-600 text-white text-sm font-medium rounded-xl transition-colors disabled:opacity-50"
            >
              <ShoppingCart size={14} />
              Add to Cart
            </button>
          </div>
        </div>

        {/* Info */}
        <div className="p-4">
          <p className="text-xs text-rose-500 font-medium uppercase tracking-wide mb-1">{product.brand}</p>
          <h3 className="font-semibold text-gray-900 text-sm leading-tight mb-2 line-clamp-2 group-hover:text-rose-600 transition-colors">
            {product.name}
          </h3>
          <div className="flex items-center gap-1 mb-3">
            {[1, 2, 3, 4, 5].map((s) => (
              <Star
                key={s}
                size={11}
                className={s <= Math.round(product.rating) ? 'text-amber-400 fill-amber-400' : 'text-gray-200 fill-gray-200'}
              />
            ))}
            <span className="text-xs text-gray-400 ml-1">({product.numReviews})</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-lg font-bold text-gray-900">${product.price.toFixed(2)}</span>
            <span className={`text-xs px-2 py-1 rounded-full font-medium ${product.countInStock > 0 ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-500'}`}>
              {product.countInStock > 0 ? 'In Stock' : 'Sold Out'}
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}
