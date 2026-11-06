import { supabase } from '@/lib/supabase';
import { escapeHtml, sendEmail } from '@/lib/email';

/** A database lease prevents concurrent product updates from sending the same batch. */
export async function deliverRestockAlerts(product: { id: string; name: string; countInStock: number }, limit = 5) {
  if (product.countInStock <= 0 || !process.env.RESEND_API_KEY) return;
  const { data, error } = await supabase.rpc('claim_restock_alerts', { p_product_id: product.id, p_limit: limit });
  if (error) { console.error('[restock] Unable to claim pending alerts'); return; }
  const site = (process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3001').replace(/\/$/, '');
  await Promise.all((data || []).map(async (subscription: { id: string; email: string; unsubscribeToken: string }) => {
    try {
      await sendEmail({ to: subscription.email, subject: `${product.name} is back in stock — Lumina`,
        html: `<p>${escapeHtml(product.name)} is available again.</p><p><a href="${escapeHtml(site)}/products/${encodeURIComponent(product.id)}">View product and current availability</a></p><p>Stock is not reserved until your order is confirmed.</p><p><a href="${escapeHtml(site)}/unsubscribe?token=${encodeURIComponent(subscription.unsubscribeToken)}">Cancel this alert</a></p>` });
      const { error: updateError } = await supabase.from('RestockSubscription').update({ notifiedAt: new Date().toISOString(), leaseUntil: null }).eq('id', subscription.id);
      if (updateError) console.error('[restock] Unable to record alert delivery');
    } catch {
      await supabase.from('RestockSubscription').update({ leaseUntil: null }).eq('id', subscription.id);
    }
  }));
}
