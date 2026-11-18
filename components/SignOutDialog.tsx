'use client';

import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { LogOut } from 'lucide-react';

interface SignOutDialogProps {
  open: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

/** Confirmation popup shown before signing the customer out. */
export default function SignOutDialog({ open, onCancel, onConfirm }: SignOutDialogProps) {
  const cancelRef = useRef<HTMLButtonElement>(null);
  const confirmRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    cancelRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { onCancel(); return; }
      if (event.key !== 'Tab') return;
      // Keep keyboard focus inside the two-button dialog
      const first = cancelRef.current;
      const last = confirmRef.current;
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    };
    document.addEventListener('keydown', onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
      previouslyFocused?.focus?.();
    };
  }, [open, onCancel]);

  if (!open) return null;

  // Rendered in <body> so the sticky/blurred navbar cannot clip or offset the overlay
  return createPortal(
    <div
      className="fixed inset-0 z-100 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4"
      onMouseDown={(event) => { if (event.target === event.currentTarget) onCancel(); }}
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="signout-title"
        aria-describedby="signout-description"
        className="w-full max-w-sm rounded-3xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 shadow-2xl p-6 text-center"
      >
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-rose-50 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400">
          <LogOut size={22} aria-hidden="true" />
        </div>
        <h2 id="signout-title" className="text-lg font-bold text-gray-900 dark:text-gray-100">Sign out?</h2>
        <p id="signout-description" className="mt-1.5 text-sm text-gray-600 dark:text-gray-300">
          Are you sure you want to sign out of your Lumina account?
        </p>
        <div className="mt-6 grid grid-cols-2 gap-3">
          <button
            ref={cancelRef}
            type="button"
            onClick={onCancel}
            className="px-4 py-2.5 rounded-2xl border border-gray-200 dark:border-gray-600 text-sm font-semibold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-rose-300 transition-colors"
          >
            Cancel
          </button>
          <button
            ref={confirmRef}
            type="button"
            onClick={onConfirm}
            className="px-4 py-2.5 rounded-2xl bg-[#C2185B] hover:bg-[#A31555] text-sm font-semibold text-white focus:outline-none focus:ring-2 focus:ring-rose-300 transition-colors"
          >
            Sign out
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
