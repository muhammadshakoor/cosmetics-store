'use client';

import { useEffect, useRef, type ReactNode } from 'react';

interface AccessibleDialogProps {
  isOpen: boolean;
  onClose: () => void;
  labelledBy: string;
  describedBy?: string;
  className?: string;
  children: ReactNode;
}

/** Native modal dialogs keep focus inside, make the page inert, and support Escape. */
export default function AccessibleDialog({ isOpen, onClose, labelledBy, describedBy, className = '', children }: AccessibleDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog || !isOpen) return;
    const previousFocus = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    dialog.showModal();
    document.body.style.overflow = 'hidden';
    return () => {
      dialog.close();
      document.body.style.overflow = previousOverflow;
      if (previousFocus instanceof HTMLElement && previousFocus.isConnected) previousFocus.focus();
    };
  }, [isOpen]);
  return (
    <dialog ref={dialogRef} aria-modal="true" aria-labelledby={labelledBy} aria-describedby={describedBy}
      onCancel={(event) => { event.preventDefault(); onClose(); }}
      onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}
      className={`m-auto w-[calc(100%-2rem)] max-h-[90dvh] overflow-y-auto rounded-3xl border border-rose-100 bg-white p-0 text-gray-900 shadow-2xl backdrop:bg-black/60 backdrop:backdrop-blur-sm dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 ${className}`}>
      {isOpen && children}
    </dialog>
  );
}
