'use client';

import { useCart } from '@/context/CartContext';
import { useAuth } from '@/context/AuthContext';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Trash2, ArrowRight, ShoppingBag } from 'lucide-react';

export default function CartPage() {
  const { cartItems, removeFromCart, updateQty, itemCount, totalPrice, clearCart } = useCart();
  const { user } = useAuth();
  const router = useRouter();

  const shipping = totalPrice > 50 ? 0 : 9.99;
  const tax = totalPrice * 0.08;
  const grandTotal = totalPrice + shipping + tax;

  if (cartItems.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="text-center">
          <div className="w-24 h-24 bg-rose-50 rounded-full flex items-center justify-center mx-auto mb-6">
            <ShoppingBag size={36} className="text-rose-300" />
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Your cart is empty</h2>
          <p className="text-gray-500 mb-6">Looks like you haven&apos;t added anything yet!</p>
          <Link
            href="/products"
            className="inline-flex items-center gap-2 px-6 py-3 bg-rose-500 hover:bg-rose-600 text-white font-semibold rounded-2xl transition-colors shadow-md"
          >
            Start Shopping <ArrowRight size={16} />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-extrabold text-gray-900">
            Shopping Cart <span className="text-lg font-medium text-gray-400">({itemCount} items)</span>
          </h1>
          <button onClick={clearCart} className="text-sm text-red-400 hover:text-red-600 transition-colors">Clear cart</button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Cart Items */}
          <div className="lg:col-span-2 space-y-4">
            {cartItems.map((item) => (
              <div key={item.product} className="bg-white rounded-3xl shadow-sm border border-gray-100 p-4 flex gap-4">
                <img
                  src={item.image || `https://picsum.photos/seed/${item.product}/160/160`}
                  alt={item.name}
                  className="w-24 h-24 object-cover rounded-2xl flex-shrink-0 bg-gray-100"
                />
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-gray-900 text-sm leading-tight mb-1 line-clamp-2">{item.name}</h3>
                  <p className="text-rose-600 font-bold text-lg mb-3">${item.price.toFixed(2)}</p>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center border border-gray-200 rounded-xl overflow-hidden">
                      <button
                        onClick={() => updateQty(item.product, Math.max(1, item.qty - 1))}
                        className="px-3 py-1.5 text-gray-600 hover:bg-gray-50 font-bold"
                      >−</button>
                      <span className="px-3 py-1.5 text-sm font-semibold border-x border-gray-200">{item.qty}</span>
                      <button
                        onClick={() => updateQty(item.product, Math.min(item.countInStock, item.qty + 1))}
                        className="px-3 py-1.5 text-gray-600 hover:bg-gray-50 font-bold"
                      >+</button>
                    </div>
                    <span className="text-sm text-gray-400">= ${(item.price * item.qty).toFixed(2)}</span>
                  </div>
                </div>
                <button
                  onClick={() => removeFromCart(item.product)}
                  className="p-2 text-gray-300 hover:text-red-500 transition-colors self-start"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6 sticky top-24">
              <h2 className="text-lg font-bold text-gray-900 mb-6">Order Summary</h2>
              <div className="space-y-3 text-sm mb-6">
                <div className="flex justify-between text-gray-600">
                  <span>Subtotal ({itemCount} items)</span>
                  <span>${totalPrice.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>Shipping</span>
                  <span className={shipping === 0 ? 'text-green-600 font-medium' : ''}>
                    {shipping === 0 ? 'FREE' : `$${shipping.toFixed(2)}`}
                  </span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>Tax (8%)</span>
                  <span>${tax.toFixed(2)}</span>
                </div>
                {shipping > 0 && (
                  <p className="text-xs text-rose-500 bg-rose-50 rounded-xl px-3 py-2">
                    Add ${(50 - totalPrice).toFixed(2)} more for free shipping!
                  </p>
                )}
                <div className="border-t border-gray-100 pt-3 flex justify-between font-bold text-gray-900 text-base">
                  <span>Total</span>
                  <span>${grandTotal.toFixed(2)}</span>
                </div>
              </div>
              <button
                onClick={() => router.push(user ? '/checkout' : '/login?redirect=checkout')}
                className="w-full flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-rose-500 to-pink-600 text-white font-semibold rounded-2xl shadow-lg hover:shadow-rose-200 hover:-translate-y-0.5 transition-all"
              >
                Checkout <ArrowRight size={16} />
              </button>
              <Link href="/products" className="block text-center text-sm text-rose-500 hover:text-rose-700 mt-4 transition-colors">
                Continue shopping
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
