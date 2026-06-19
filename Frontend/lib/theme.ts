// Brand color palette and semantic design tokens for Lumina

export const brandColors = {
  rose: {
    50:  '#fff1f2',
    100: '#ffe4e6',
    200: '#fecdd3',
    300: '#fda4af',
    400: '#fb7185',
    500: '#f43f5e',
    600: '#e11d48',
    700: '#be123c',
  },
  pink: {
    500: '#ec4899',
    600: '#db2777',
  },
} as const;

export const lightTheme = {
  background:   '#FFF8F5',
  foreground:   '#1A0A0E',
  surface:      '#FFFFFF',
  surfaceHover: '#F9F0F2',
  border:       '#E5E7EB',
  muted:        '#6B7280',
  mutedBg:      '#F9FAFB',
} as const;

export const darkTheme = {
  background:   '#0F0A0B',
  foreground:   '#F5ECF0',
  surface:      '#1C1317',
  surfaceHover: '#251A1E',
  border:       '#2D2025',
  muted:        '#9CA3AF',
  mutedBg:      '#1C1317',
} as const;

// Category badge colors (used in ProductCard)
export const categoryColors = {
  skincare:  { bg: 'bg-emerald-50 dark:bg-emerald-950', text: 'text-emerald-700 dark:text-emerald-400' },
  makeup:    { bg: 'bg-pink-50 dark:bg-pink-950',       text: 'text-pink-700 dark:text-pink-400'       },
  fragrance: { bg: 'bg-purple-50 dark:bg-purple-950',   text: 'text-purple-700 dark:text-purple-400'   },
  haircare:  { bg: 'bg-amber-50 dark:bg-amber-950',     text: 'text-amber-700 dark:text-amber-400'     },
  jewelry:   { bg: 'bg-yellow-50 dark:bg-yellow-950',   text: 'text-yellow-700 dark:text-yellow-400'   },
} as const;
