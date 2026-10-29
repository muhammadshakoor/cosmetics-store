// Single source of truth for the store's public contact details
const rawPhone = (process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || '923157320217').replace(/\D/g, '');

/** International format without "+", e.g. 923157320217 (used for wa.me and tel: links) */
export const PHONE_E164 = rawPhone.startsWith('0') ? '92' + rawPhone.slice(1) : rawPhone || '923157320217';

/** Human-friendly format, e.g. +92 315 7320217 */
export const PHONE_DISPLAY = `+${PHONE_E164.slice(0, 2)} ${PHONE_E164.slice(2, 5)} ${PHONE_E164.slice(5)}`;

export const SUPPORT_EMAIL = 'support@lumina.pk';
export const BUSINESS_HOURS = 'Mon–Sat, 10am – 7pm PKT';
export const FREE_SHIPPING_THRESHOLD = 2000;
export const SHIPPING_FEE = 200;

export function whatsappLink(message = 'Hi! I have a question about Lumina Organic Cosmetics.') {
  return `https://wa.me/${PHONE_E164}?text=${encodeURIComponent(message)}`;
}

/**
 * Turn a `?redirect=` value into a safe same-site path.
 * Accepts "checkout" or "/checkout"; anything that could leave the site (//evil.com, https:, \\) falls back to "/".
 */
export function safeRedirectPath(raw: string | null | undefined): string {
  const path = '/' + (raw || '').trim().replace(/^[/\\]+/, '');
  return /^\/[\w\-/?=&.%]*$/.test(path) ? path : '/';
}

/** sessionStorage key: where to send the customer after Google/Facebook sign-in */
export const POST_LOGIN_REDIRECT_KEY = 'postLoginRedirect';

export function rememberPostLoginRedirect(path: string) {
  try { sessionStorage.setItem(POST_LOGIN_REDIRECT_KEY, path); } catch { /* storage unavailable */ }
}
