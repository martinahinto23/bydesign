let PRODUCT_DATA = null;
let VARIANTS = null; // legacy name kept for compatibility

const DESIGN_LIST = [
  { id: "design-1", label: "Embrace the Faith", image: "images/design-1.png" },
  { id: "design-2", label: "Lift Love", image: "images/design-2.png" },
  { id: "design-3", label: "Sleeping won't save you", image: "images/design-3.png" },
  { id: "design-4", label: "Love & Clarity Will", image: "images/design-4.png" },
  { id: "design-5", label: "Liberty Lives", image: "images/design-5.jpg" },
  { id: "design-6", label: "Resist", image: "images/design-6.jpg" },
  { id: "design-7", label: "Helping Hands (HH)", image: "images/design-7.png" },
  { id: "design-8", label: "Newton", image: "images/design-8.png" },
  { id: "design-9", label: "Halt the Hate", image: "images/design-9.png" },
  { id: "design-10", label: "Democracy won't fade on us", image: "images/design-10.png" },
  { id: "design-11", label: "Diversity Earth (Equity) Inclusion", image: "images/design-11.png" }
];

const PLACEMENT = [
  { id: "front_only", label: "Front Only" },
  { id: "same", label: "Front + Back Same" },
  { id: "freestyle", label: "Front + Back Freestyle" }
];

const SIZES = ["S", "M", "L", "XL", "2XL", "3XL"].map(x => ({ id: x, label: x }));

const el = {};

document.addEventListener("DOMContentLoaded", async () => {
  el.garment = document.getElementById("garment");
  el.size = document.getElementById("size");
  el.color = document.getElementById("color");
  el.placement = document.getElementById("placement");
  el.front = document.getElementById("frontDesign");
  el.back = document.getElementById("backDesign");
  el.backWrap = document.getElementById("backWrap");
  el.preview = document.getElementById("previewBox");
  el.summary = document.getElementById("summary");

  // populate static lists
  fill(el.placement, PLACEMENT);
  fill(el.front, DESIGN_LIST);
  fill(el.back, DESIGN_LIST);

  el.placement.addEventListener("change", sync);
  el.front.addEventListener("change", sync);
  el.back.addEventListener("change", sync);

  document.getElementById("previewBtn").addEventListener("click", render);
  document.getElementById("cartBtn").addEventListener("click", submit);

  // load products JSON and then init UI
  await loadProductData();
  initGarmentDropdown();
  sync();
  render();
});

function fill(select, items, includeBlank = true) {
  const blank = includeBlank ? `<option value="">Select</option>` : "";
  select.innerHTML = blank + items.map(i => `<option value="${i.id}">${i.label}</option>`).join("");
}

function labelFor(list, id) {
  return list.find(x => x.id === id)?.label || "—";
}

function getDesign(id) {
  return DESIGN_LIST.find(d => d.id === id) || null;
}

function sync() {
  const mode = el.placement.value;
  el.backWrap.style.display = mode === "freestyle" ? "block" : "none";

  if (mode === "same") {
    el.back.value = el.front.value;
  }

  if (mode !== "freestyle") {
    el.back.value = mode === "same" ? el.front.value : "";
  }

  // when garment changes we populate colors & sizes based on product selection
  // also keep preview info up to date
  const garmentId = el.garment?.value;
  if (garmentId) {
    populateColorsAndSizes(garmentId);
  }
}

function render() {
  const garmentLabel = PRODUCT_DATA?.find(p => p.id === el.garment.value)?.title || labelFor([], el.garment.value);
  const size = el.size.value || "—";
  const color = el.color.options[el.color.selectedIndex]?.text || "—";
  const mode = labelFor(PLACEMENT, el.placement.value);

  const frontDesign = getDesign(el.front.value);
  const backDesign = el.placement.value === "same" ? frontDesign : getDesign(el.back.value);

  el.summary.innerHTML = `
    Garment: ${garmentLabel}<br>
    Size: ${size}<br>
    Color: ${color}<br>
    Placement: ${mode}<br>
    Front: ${frontDesign?.label || "—"}<br>
    Back: ${el.placement.value === "front_only" ? "—" : (backDesign?.label || "—")}
  `;

  if (!frontDesign) {
    el.preview.innerHTML = `<div><strong>Preview Area</strong></div>`;
    return;
  }

  if (el.placement.value === "front_only") {
    el.preview.innerHTML = `
      <div class="preview-stack">
        <img src="${frontDesign.image}" alt="${frontDesign.label}">
      </div>
    `;
    return;
  }

  el.preview.innerHTML = `
    <div class="preview-pair">
      <img src="${frontDesign.image}" alt="${frontDesign.label}">
      <img src="${backDesign.image}" alt="${backDesign.label}">
    </div>
  `;
}

async function loadProductData() {
  try {
    const res = await fetch("garments_with_product_ids.json");
    PRODUCT_DATA = await res.json();
    // keep VARIANTS reference for backward compatibility if other code expects it
    VARIANTS = PRODUCT_DATA;
  } catch (e) {
    console.error("Failed to load product data:", e);
    PRODUCT_DATA = [];
  }
}

function initGarmentDropdown() {
  if (!PRODUCT_DATA || PRODUCT_DATA.length === 0) {
    // fallback to your earlier GARMENTS if product file missing
    const FALLBACK_GARMENTS = [
      { id: "tee", label: "Tee" },
      { id: "long_sleeve", label: "Long Sleeve" },
      { id: "hoodie", label: "Hoodie" },
      { id: "sweatshirt", label: "Sweatshirt" }
    ];
    fill(el.garment, FALLBACK_GARMENTS);
    return;
  }

  // build garment dropdown from PRODUCT_DATA
  const garmentOptions = PRODUCT_DATA.map(p => ({ id: p.id, label: p.title || p.label || p.id }));
  fill(el.garment, garmentOptions);

  // when garment selection changes, repopulate color/size
  el.garment.addEventListener("change", () => {
    populateColorsAndSizes(el.garment.value);
    render();
  });

  // also update render when color/size change
  el.color.addEventListener("change", render);
  el.size.addEventListener("change", render);
}

function populateColorsAndSizes(garmentId) {
  const product = PRODUCT_DATA.find(p => p.id === garmentId);
  if (!product) {
    fill(el.color, [], false);
    fill(el.size, SIZES);
    return;
  }

  // colors and sizes in the file may already be listed; use them if present
  const colors = (product.colors && product.colors.length)
    ? product.colors.map(c => ({ id: slugify(c), label: c }))
    : deriveColorsFromVariants(product);

  const sizes = (product.sizes && product.sizes.length)
    ? product.sizes.map(s => ({ id: s, label: s }))
    : SIZES;

  fill(el.color, colors);
  fill(el.size, sizes);
}

function deriveColorsFromVariants(product) {
  const seen = new Set();
  const out = [];
  (product.variants || []).forEach(v => {
    const c = v.color || v.color_name || v.colorName;
    if (!c) return;
    if (!seen.has(c.toLowerCase())) {
      seen.add(c.toLowerCase());
      out.push({ id: slugify(c), label: c });
    }
  });
  return out;
}

function slugify(str) {
  if (!str) return "";
  return String(str).trim().toLowerCase().replace(/\s+/g, "-");
}

function findProductById(id) {
  return PRODUCT_DATA?.find(p => p.id === id) || null;
}

function findVariant(product, colorSlug, size) {
  if (!product) return null;
  const variants = product.variants || [];
  // Try matching by normalized color and size fields (some entries use 'variantid' / 'color' / 'size')
  const colorNormalized = (colorSlug || "").replace(/-/g, " ").toLowerCase();
  return variants.find(v => {
    const vColor = (v.color || v.color_name || "").toString().toLowerCase();
    const vSize = (v.size || v.size_name || "").toString();
    return vColor === colorNormalized || vColor.replace(/\s+/g, "-") === colorSlug;
  })?.filterBySize?.bind ? null : variants.find(v => {
    const vColor = (v.color || v.color_name || "").toString().toLowerCase();
    const vSize = (v.size || v.size_name || "").toString();
    return (vColor === colorNormalized || vColor.replace(/\s+/g, "-") === colorSlug) && vSize === size;
  }) || variants.find(v => {
    const vSize = (v.size || v.size_name || "").toString();
    return vSize === size; // fallback to size-only match
  }) || null;
}

// Simpler variant finder which handles the JSON shape found in your file:
function findVariantSimple(product, color, size) {
  if (!product) return null;
  const variants = product.variants || [];
  const colorLower = (color || "").toString().toLowerCase();
  const sizeStr = (size || "").toString();
  return variants.find(v => {
    const vColor = (v.color || "").toString().toLowerCase();
    const vSize = (v.size || "").toString();
    return vColor === colorLower && vSize === sizeStr;
  }) || null;
}

async function submit() {
  const garmentId = el.garment.value;
  const colorId = el.color.value;
  const size = el.size.value;
  const frontDesign = getDesign(el.front.value);
  const backDesign = el.placement.value === "same" ? frontDesign : getDesign(el.back.value);

  const product = findProductById(garmentId);
  if (!product) {
    alert("Selected garment not found in product data.");
    return;
  }

  // colorId is slugified; convert back to label for matching
  const colorLabel = (product.colors || []).find(c => slugify(c) === colorId) || colorId.replace(/-/g, " ");

  // Find matching variant
  const variant = findVariantSimple(product, colorLabel, size);

  if (!variant) {
    // helpful debug message with available options
    console.warn("No variant matched. Product:", product.printfulproductid, "Available variants:", product.variants || []);
    alert("No matching variant found for that color/size. Check console for details.");
    return;
  }

  // Build the payload you want to return or send to Printful
  const payload = {
    garment: garmentId,
    title: product.title || product.label || garmentId,
    printfulproductid: product.printfulproductid || null,
    variantid: variant.variantid || variant.variant_id || null,
    sku: variant.sku || null,
    price: variant.price || null,
    color: variant.color || colorLabel,
    size: variant.size || size,
    placement: el.placement.value,
    front_design: frontDesign?.id || "",
    back_design: el.placement.value === "front_only" ? "" : (backDesign?.id || "")
  };

  // Keep existing parent postMessage behavior so embedding stays compatible
  window.parent.postMessage({ type: "design-selection", payload }, "*");
  console.log("Design selection payload:", payload);