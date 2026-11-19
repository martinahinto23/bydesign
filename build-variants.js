const PRODUCTS = { tee: 586, long_sleeve: 753, hoodie: 969, sweatshirt: 971 };

const GARMENT_COLORS = {
  tee: ["Black", "White", "Navy", "Red"],
  long_sleeve: ["Black", "White", "Navy"],
  hoodie: ["Black", "White", "Grey"],
  sweatshirt: ["Black", "White", "Crimson"],
};

const SIZES = ["S", "M", "L", "XL", "2XL", "3XL"];
const fs = require("fs");

async function main() {
  const out = [];
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
        if (v) {
          out.push({
            garment,
            color: color.toLowerCase(),
            size,
            printful_product_id: productId,
            printful_variant_id: v.id,
          });
        } else {
          console.log(`MISSING: ${garment} / ${color} / ${size}`);
        }
      }
    }
  }
  fs.writeFileSync("variants.json", JSON.stringify({ variants: out }, null, 2));
  console.log(`Saved ${out.length} variants`);
}

main().catch((e) => console.error(e.message));