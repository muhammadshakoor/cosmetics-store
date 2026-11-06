-- Adds the handmade soap + body care catalog WITHOUT touching existing data.
-- Safe to run more than once: a product is only inserted if no product with the same name exists.
-- Run in Supabase -> SQL Editor. It never deletes, updates or resets anything.
begin;

with owner as (
  select id from public."User" where "isAdmin" order by "createdAt" limit 1
),
new_products(name, image, brand, category, description, price, "countInStock", rating, "numReviews") as (
  values
  ('Manjistha & Rose Pure Organic Soap', '/products/organic/manjistha-rose-organic-soap.jpeg', 'Lumina Botanicals', 'soaps', 'Handcrafted with Ayurvedic Manjistha root extract and cold-pressed damask rose essential oils. Naturally evens skin tone, fades pigmentation, and leaves a luminous herbal glow. 100% organic, chemical & paraben free.', 499, 35, 4.9, 84),
  ('Activated Charcoal Detox Rose Soap', '/products/organic/charcoal-detox-rose-soap.jpeg', 'Lumina Botanicals', 'soaps', 'Artisan rose-carved detox bar formulated with medical-grade activated bamboo charcoal and organic tea tree oil. Deeply pulls impurities and excess oil from pores without stripping essential skin hydration.', 450, 40, 4.8, 95),
  ('Pure Goat Milk & Coconut Pearl Rose Soap', '/products/organic/goat-milk-coconut-rose-soap.jpeg', 'Lumina Botanicals', 'soaps', 'Ultra-gentle nourishing rose bar handcrafted with farm-fresh goat milk and cold-pressed extra virgin coconut oil. Rich in lactic acid and vitamins A & D for soft, supple, intensely hydrated skin.', 490, 25, 4.9, 110),
  ('Aloe Vera & Neem Soothing Rose Soap', '/products/organic/aloe-neem-rose-soap.jpeg', 'Lumina Botanicals', 'soaps', 'Translucent botanical green soap enriched with fresh organic aloe vera gel and antibacterial wild neem extract. Calms redness, soothes acne, and restores natural moisture balance.', 450, 30, 4.7, 62),
  ('Raw Honey & Turmeric Glow Rose Soap', '/products/organic/honey-turmeric-rose-soap.jpeg', 'Lumina Botanicals', 'soaps', 'Golden amber handcrafted bar crafted with unpasteurized wild forest honey and wild kasturi turmeric. Packed with natural antioxidants to brighten dark spots and protect the skin barrier.', 450, 35, 4.9, 78),
  ('Lavender & Wildberry Relaxing Rose Soap', '/products/organic/lavender-berry-rose-soap.jpeg', 'Lumina Botanicals', 'soaps', 'Artisan purple rose bar infused with French lavender essential oil and antioxidant-rich wildberry extracts. Eases tension, calms irritated skin, and promotes relaxing nighttime rejuvenation.', 450, 28, 4.8, 57),
  ('French Rose Clay & Hibiscus Firming Soap', '/products/organic/french-rose-clay-soap.jpeg', 'Lumina Botanicals', 'soaps', 'Mineral-rich French pink clay bar combined with organic hibiscus flower extract. Gently clarifies, improves skin elasticity, and leaves a silky, velvety smooth texture.', 470, 32, 4.7, 43),
  ('Sandalwood & Amber Swirl Artisan Soap', '/products/organic/sandalwood-amber-rose-soap.jpeg', 'Lumina Botanicals', 'soaps', 'Luxurious swirled bar combining precious sandalwood oil and warm organic amber extracts. Delivers deep moisture, reduces blemishes, and envelops the senses in a natural woody aroma.', 520, 20, 4.8, 64),
  ('Botanical Neem & Spirulina Purifying Bar', '/products/organic/herbal-neem-spirulina-soap.jpeg', 'Lumina Botanicals', 'soaps', 'Deep green botanical cleansing bar infused with spirulina microalgae and concentrated neem oil. A powerhouse purifying formula for troubled or congested skin.', 460, 24, 4.6, 39),
  ('Coffee & Walnut Dual-Layer Scrub Bar', '/products/organic/coffee-scrub-layer-soap.jpeg', 'Lumina Botanicals', 'bodycare', 'Two-in-one exfoliating body bar featuring finely ground Arabica coffee and crushed walnut shells on the bottom layer, topped with a creamy moisturizing herbal soap relief. Polishes away dead skin cells.', 550, 30, 4.9, 91),
  ('Pure Almond & Rose Homemade Botanical Lotion', '/products/organic/homemade-almond-rose-lotion.jpeg', 'Lumina Botanicals', 'bodycare', '100% natural, handcrafted lotion enriched with sweet almond oil, pure damask rose water, and organic shea butter. Lightweight, fast-absorbing formula that deeply hydrates dry skin for 48 hours without feeling sticky.', 850, 45, 4.9, 132),
  ('Artisan Organic Soaps Collection Gift Set', '/products/organic/artisan-organic-soaps-collection.jpeg', 'Lumina Botanicals', 'soaps', 'A luxurious gift box featuring an assortment of our signature handcrafted organic soaps — Manjistha Rose, Activated Charcoal, Goat Milk Coconut, Honey Turmeric, Lavender Berry, and Coffee Scrub.', 2499, 15, 5, 44)
)
insert into public."Product" (id, name, image, brand, category, description, price, "countInStock", rating, "numReviews", "userId", "createdAt", "updatedAt")
select gen_random_uuid()::text, n.name, n.image, n.brand, n.category, n.description, n.price, n."countInStock", n.rating, n."numReviews", owner.id, now(), now()
from new_products n
cross join owner
where not exists (select 1 from public."Product" p where p.name = n.name);

commit;

-- Check the result (expect soaps = 10, bodycare = 2 on a first run):
select category, count(*) from public."Product" group by category order by category;
