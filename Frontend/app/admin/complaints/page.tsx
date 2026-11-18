'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import ComplaintInbox from '@/components/ComplaintInbox';

export default function AdminComplaintsPage() {
  const { user, authReady } = useAuth();
  const router = useRouter();
  useEffect(() => {
    if (!authReady) return;
    if (!user) router.replace('/login?redirect=admin/complaints');
    else if (!user.isAdmin) router.replace('/');
  }, [authReady, user, router]);
  if (!authReady || !user?.isAdmin) return <div role="status" className="px-4 py-20 text-center text-gray-600 dark:text-gray-300">Checking account access...</div>;
  return <div className="min-h-screen bg-gray-50 px-4 py-10 dark:bg-gray-950"><div className="mx-auto max-w-5xl"><Link href="/admin" className="text-brand mb-6 inline-flex min-h-11 items-center gap-2 text-sm font-semibold"><ArrowLeft aria-hidden="true" size={16} />Back to admin</Link><ComplaintInbox user={user} admin /></div></div>;
}
