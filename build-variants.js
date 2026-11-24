const fs = require("fs");

const PRODUCTS = { tee: 586, long_sleeve: 753, hoodie: 969, sweatshirt: 971 };

const GARMENT_COLORS = {
  tee: ["Black", "White", "Navy", "Red"],
  long_sleeve: ["Black", "White", "Navy"],
  hoodie: ["Black", "White", "Grey"],
  sweatshirt: ["Black", "White", "Crimson"],
};

const SIZES = ["S", "M", "L", "XL", "2XL", "3XL"];
const REVENUE = 18; // Printful "revenue": your price minus Printful's item price

async function main() {
  const out = [];
  const report = [];
  const costs = {}; // to check that colors cost the same at each size

  for (const [garment, productId] of Object.entries(PRODUCTS)) {
    const r = await fetch(`https://api.printful.com/products/${productId}`, {
      headers: { Authorization: `Bearer ${process.env.PRINTFUL_TOKEN}` },
    });
    if (!r.ok) throw new Error(`${garment}: Printful said ${r.status}`);
    const { result } = await r.json();

    for (const color of GARMENT_COLORS[garment]) {
      for (const size of SIZES) {
        const v = result.variants.find(
          (x) => String(x.color).toLowerCase() === color.toLowerCase() && x.size === size
        );
        if (!v) { console.log(`MISSING: ${garment} / ${color} / ${size}`); continue; }

        const cost = Number(v.price);
        if (!Number.isFinite(cost)) { console.log(`NO PRICE: ${garment} / ${color} / ${size}`); continue; }

        const price = Math.ceil(Math.round((cost + REVENUE) * 100) / 100);
        out.push({
          garment,
          color: color.toLowerCase(),
          size,
          printful_product_id: productId,
          printful_variant_id: v.id,
          price_cents: price * 100,
        });

        const key = `${garment} ${size}`;
        costs[key] = costs[key] || new Set();
        costs[key].add(cost.toFixed(2));
        if (color === "Black") report.push(`${key}: Printful $${cost.toFixed(2)} -> price $${price}`);
      }
    }
  }

  fs.writeFileSync("variants.json", JSON.stringify({ variants: out }, null, 2));
  console.log(`Saved ${out.length} variants`);
  console.log(report.join("\n"));
  for (const [key, set] of Object.entries(costs)) {
    if (set.size > 1) console.log(`COLORS COST DIFFERENT: ${key}: ${[...set].join(", ")}`);
  }
}

main().catch((e) => console.error(e.message));