'use client';

import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import ComplaintInbox from '@/components/ComplaintInbox';

export default function MyComplaintsPage() {
  const { user, authReady } = useAuth();
  if (!authReady) return <div role="status" className="px-4 py-20 text-center text-gray-600 dark:text-gray-300">Loading your account...</div>;
  if (!user) return <div className="mx-auto max-w-lg px-4 py-20 text-center"><h1 className="mb-3 text-2xl font-bold">Sign in to view your complaints</h1><p className="mb-6 text-gray-600 dark:text-gray-300">Your support history is available in your account.</p><Link href="/login?redirect=complaints/my" className="button-primary inline-flex rounded-xl px-5 py-3 font-semibold">Sign in</Link></div>;
  return <div className="min-h-screen bg-[#FFF8F5] px-4 py-10 dark:bg-gray-950"><div className="mx-auto max-w-3xl"><ComplaintInbox user={user} /></div></div>;
}
