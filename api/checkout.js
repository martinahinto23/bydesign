const Stripe = require("stripe");
const VARIANTS = require("../variants.json").variants;

const PF = "https://api.printful.com";
const IMAGE_BASE = "https://bydesign-mocha.vercel.app";
const SITE_URL = process.env.SITE_URL || IMAGE_BASE;
const BACK_PRINT_UPCHARGE_CENTS = 700; // must match script.js

// Countries you accept. Add one only after testing a draft order to it.
const ALLOWED_COUNTRIES = ["US", "CA", "GB", "AU"];
// Countries where Printful needs a state or province code
const STATE_REQUIRED = ["US", "CA", "AU"];
// Refuse any order that would net less than this after Printful's cost and Stripe's fee
const MIN_PROFIT_CENTS = 800;

const clean = (v, max = 100) => String(v || "").trim().slice(0, max);
const cents = (n) => Math.round(Number(n) * 100);
const pfHeaders = () => ({
  Authorization: `Bearer ${process.env.PRINTFUL_TOKEN}`,
  "X-PF-Store-Id": process.env.PRINTFUL_STORE_ID,
  "Content-Type": "application/json",
});

module.exports = async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Use POST" });
  if (process.env.ORDERING_OPEN !== "true") {
    return res.status(503).json({ error: "Ordering opens soon. Thanks for your interest!" });
  }

  const { recipient, items } = req.body || {};
  const to = {
    name: clean(recipient?.name),
    address1: clean(recipient?.address1),
    address2: clean(recipient?.address2),
    city: clean(recipient?.city),
    state_code: clean(recipient?.state_code, 10),
    zip: clean(recipient?.zip, 20),
    country_code: clean(recipient?.country_code, 2).toUpperCase(),
    email: clean(recipient?.email),
    phone: clean(recipient?.phone, 30),
  };
  if (["name", "address1", "city", "zip", "country_code"].some((k) => !to[k])) {
    return res.status(400).json({ error: "Please fill in all shipping fields" });
  }
  if (!ALLOWED_COUNTRIES.includes(to.country_code)) {
    return res.status(400).json({ error: "We don't ship to that country yet." });
  }
  if (STATE_REQUIRED.includes(to.country_code) && !to.state_code) {
    return res.status(400).json({ error: "Please enter your state or province code." });
  }
  if (!Array.isArray(items) || items.length === 0 || items.length > 20) {
    return res.status(400).json({ error: "Cart is empty or too big" });
  }

  // Rebuild every item on the server. Prices never come from the browser.
  const lineItems = [];
  const pfItems = [];
  let itemsCents = 0;

  for (const i of items) {
    const variant = VARIANTS.find((v) => v.printful_variant_id === Number(i.variant_id));
    if (!variant || !variant.price_cents) return res.status(400).json({ error: "Unknown product" });

    const qty = Math.min(Math.max(Number(i.quantity) || 1, 1), 10);

    const files = (Array.isArray(i.files) ? i.files : [])
      .filter((f) => ["default", "back"].includes(f.type))
      .slice(0, 2)
      .map((f) => {
        let path;
        try { path = new URL(f.url).pathname; } catch { return null; }
        return /^\/images\/design-\d{1,2}\.png$/.test(path)
          ? { type: f.type, url: IMAGE_BASE + path }
          : null;
      })
      .filter(Boolean);
    if (!files.some((f) => f.type === "default")) {
      return res.status(400).json({ error: "Missing front design file" });
    }

    const hasBack = files.some((f) => f.type === "back");
    const unit = variant.price_cents + (hasBack ? BACK_PRINT_UPCHARGE_CENTS : 0);

    pfItems.push({
      variant_id: variant.printful_variant_id,
      quantity: qty,
      retail_price: (unit / 100).toFixed(2), // declared value for customs
      files,
    });
    itemsCents += unit * qty;
    lineItems.push({
      quantity: qty,
      price_cents_each: unit,
      price_data: {
        currency: "usd",
        unit_amount: unit,
        product_data: {
          name: `${variant.garment.replace("_", " ")} (${variant.color}, ${variant.size})${hasBack ? " + back print" : ""}`,
        },
      },
    });
  }

  let draftId = null;
  try {
    // 1. Create the Printful DRAFT (nothing is charged or printed)
    const pf = await fetch(`${PF}/orders?confirm=false`, {
      method: "POST",
      headers: pfHeaders(),
      body: JSON.stringify({ recipient: to, items: pfItems }),
    });
    const pfBody = await pf.json();
    if (!pf.ok) throw new Error(pfBody?.error?.message || `Printful said ${pf.status}`);
    const order = pfBody.result;
    draftId = order.id;

    // 2. Read Printful's real cost and check the profit floor
    const costs = order.costs || {};
    const shippingCents = cents(costs.shipping);
    let printfulCostCents = cents(costs.total);
    if (!Number.isFinite(printfulCostCents)) {
      printfulCostCents = cents(costs.subtotal) + shippingCents;
    }
    if (!Number.isFinite(printfulCostCents) || !Number.isFinite(shippingCents)) {
      throw new Error("Couldn't price this order. Please try again.");
    }

    const chargeCents = itemsCents + shippingCents;
    const feeRate = 0.029 + (to.country_code === "US" ? 0 : 0.015); // international cards cost more
    const feeCents = Math.round(chargeCents * feeRate + 30);
    const profitCents = chargeCents - feeCents - printfulCostCents;
    if (profitCents < MIN_PROFIT_CENTS) {
      console.error("PROFIT TOO LOW", {
        country: to.country_code, chargeCents, feeCents, printfulCostCents, profitCents,
      });
      throw new Error("Sorry, we can't ship this item to your location right now.");
    }

    // 3. Send the customer to Stripe (cards only)
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      allowed_payment_method_types: ["card"],
      line_items: [
        ...lineItems.map(({ price_cents_each, ...rest }) => rest),
        ...(shippingCents > 0
          ? [{
              quantity: 1,
              price_data: {
                currency: "usd",
                unit_amount: shippingCents,
                product_data: { name: "Shipping" },
              },
            }]
          : []),
      ],
      customer_email: to.email || undefined,
      client_reference_id: String(draftId),
      metadata: { printful_order_id: String(draftId) },
      success_url: `${SITE_URL}/?paid=1`,
      cancel_url: `${SITE_URL}/?canceled=1`,
    });

    return res.status(200).json({ url: session.url });
  } catch (err) {
    if (draftId) {
      try { await fetch(`${PF}/orders/${draftId}`, { method: "DELETE", headers: pfHeaders() }); } catch {}
    }
    return res.status(500).json({ error: err.message });
  }
};