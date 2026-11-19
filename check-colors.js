const id = process.argv[2];

async function main() {
  const r = await fetch(`https://api.printful.com/products/${id}`, {
    headers: { Authorization: `Bearer ${process.env.PRINTFUL_TOKEN}` },
  });
  if (!r.ok) throw new Error(`Printful said ${r.status}`);
  const { result } = await r.json();
  const v = result.variants;
  console.log(result.product.title);
  console.log("Colors:", [...new Set(v.map((x) => x.color))].join(", "));
  console.log("Sizes:", [...new Set(v.map((x) => x.size))].join(", "));
}

main().catch((e) => console.error(e.message));
