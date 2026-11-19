const clean = (v, max = 100) => String(v || "").trim().slice(0, max);
const isHttps = (u) => {
  try { return new URL(u).protocol === "https:"; } catch { return false; }
};
const FILE_TYPES = ["default", "back"]; // default = front

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Use POST" });
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

  const needed = ["name", "address1", "city", "zip", "country_code"];
  if (needed.some((k) => !to[k])) {
    return res.status(400).json({ error: "Please fill in all shipping fields" });
  }
  if (!Array.isArray(items) || items.length === 0 || items.length > 20) {
    return res.status(400).json({ error: "Cart is empty or too big" });
  }

  const cleanItems = items.map((i) => ({
    variant_id: Number(i.variant_id),
    quantity: Math.min(Math.max(Number(i.quantity) || 1, 1), 10),
    files: (Array.isArray(i.files) ? i.files : [])
      .filter((f) => FILE_TYPES.includes(f.type) && isHttps(f.url))
      .slice(0, 2)
      .map((f) => ({ type: f.type, url: f.url })),
  }));

  if (cleanItems.some((i) => !i.variant_id || i.files.length === 0)) {
    return res.status(400).json({ error: "Each item needs a variant and a design file" });
  }

  try {
    // confirm=false means DRAFT: nothing is printed, shipped, or charged
    const r = await fetch("https://api.printful.com/orders?confirm=false", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.PRINTFUL_TOKEN}`,
        "X-PF-Store-Id": process.env.PRINTFUL_STORE_ID,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ recipient: to, items: cleanItems }),
    });
    const body = await r.json();
    if (!r.ok) throw new Error(body?.error?.message || `Printful said ${r.status}`);

    res.status(200).json({ orderId: body.result.id, status: body.result.status });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}