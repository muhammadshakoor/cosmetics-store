export const FREE_SHIPPING_THRESHOLD = 2000;
export const SHIPPING_FEE = 200;
export const COD_PAYMENT_METHOD = 'Cash on Delivery (COD)';

export const formatPrice = (value: number) => `Rs. ${value.toLocaleString('en-PK', { maximumFractionDigits: 2 })}`;

export function normalizePakistanPhone(value: string): string | null {
  const digits = value.replace(/[\s()+-]/g, '');
  if (/^03\d{9}$/.test(digits)) return `+92${digits.slice(1)}`;
  if (/^923\d{9}$/.test(digits)) return `+${digits}`;
  return null;
}

const configuredPhone = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || '';
export const SUPPORT_PHONE = normalizePakistanPhone(configuredPhone);
export const WHATSAPP_URL = SUPPORT_PHONE ? `https://wa.me/${SUPPORT_PHONE.slice(1)}` : null;
export const SUPPORT_EMAIL = process.env.NEXT_PUBLIC_SUPPORT_EMAIL || '';
