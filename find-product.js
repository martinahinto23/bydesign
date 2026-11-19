const word = (process.argv[2] || "").toLowerCase();

async function main() {
  const r = await fetch("https://api.printful.com/products", {
    headers: { Authorization: `Bearer ${process.env.PRINTFUL_TOKEN}` },
  });
  if (!r.ok) throw new Error(`Printful said ${r.status}`);
  const { result } = await r.json();

  result
    .filter((p) =>
      `${p.type_name} ${p.brand} ${p.model} ${p.title}`.toLowerCase().includes(word)
    )
    .forEach((p) =>
      console.log(`${p.id}  |  ${p.brand} ${p.model}  |  ${p.type_name}`)
    );
}
main().catch((e) => console.error(e.message));
