const Stripe = require("stripe");

const PF = "https://api.printful.com";
const cents = (n) => Math.round(Number(n) * 100);

module.exports = async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

  // Stripe's signature needs the exact raw body
  const chunks = [];
  for await (const c of req) chunks.push(c);
  const raw = Buffer.concat(chunks);

  let event;
  try {
    event = stripe.webhooks.constructEvent(
      raw,
      req.headers["stripe-signature"],
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    return res.status(400).send(`Webhook error: ${err.message}`);
  }

  const headers = {
    Authorization: `Bearer ${process.env.PRINTFUL_TOKEN}`,
    "X-PF-Store-Id": process.env.PRINTFUL_STORE_ID,
  };
  const session = event.data.object;
  const orderId = session?.metadata?.printful_order_id;

  // Checkout expired unpaid: clean up the draft
  if (event.type === "checkout.session.expired") {
    if (orderId) {
      const g = await fetch(`${PF}/orders/${orderId}`, { headers });
      if (g.ok) {
        const o = (await g.json()).result;
        if (o.status === "draft") await fetch(`${PF}/orders/${orderId}`, { method: "DELETE", headers });
      }
    }
    return res.status(200).json({ cleaned: true });
  }

  if (event.type !== "checkout.session.completed") {
    return res.status(200).json({ received: true });
  }
  if (session.payment_status !== "paid") return res.status(200).json({ ignored: "not paid" });
  if (!orderId) return res.status(200).json({ ignored: "no order id" });

  // SAFETY: a test-mode payment must never confirm a real Printful order
  if (!event.livemode) {
    console.log("TEST MODE: would confirm Printful order", orderId);
    return res.status(200).json({ test: true });
  }

  const get = await fetch(`${PF}/orders/${orderId}`, { headers });
  if (!get.ok) return res.status(500).json({ error: "Couldn't read Printful order" });
  const order = (await get.json()).result;

  if (order.status !== "draft") {
    return res.status(200).json({ ignored: "already handled", status: order.status });
  }

  // SAFETY: only confirm if the customer paid at least what Printful will charge us
  const costCents = cents(order.costs?.total);
  if (Number.isFinite(costCents) && session.amount_total < costCents) {
    console.error("UNDERPAID, NOT CONFIRMING", { orderId, paid: session.amount_total, costCents });
    return res.status(200).json({ ignored: "underpaid" });
  }

  const confirm = await fetch(`${PF}/orders/${orderId}/confirm`, { method: "POST", headers });
  if (!confirm.ok) {
    console.error("CONFIRM FAILED", orderId, await confirm.text());
    return res.status(500).json({ error: "Confirm failed" }); // Stripe will retry
  }

  return res.status(200).json({ confirmed: true });
};

module.exports.config = { api: { bodyParser: false } };