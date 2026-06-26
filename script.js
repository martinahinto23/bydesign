let PRODUCT_DATA = [];

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

  fill(el.placement, PLACEMENT);
  fill(el.front, DESIGN_LIST);
  fill(el.back, DESIGN_LIST);

  await loadProducts();
  populateGarments();
  bindEvents();
  syncUI();
  render();
});

function fill(select, items, includeBlank = true) {
  select.innerHTML = (includeBlank ? `<option value="">Select</option>` : "") +
    items.map(i => `<option value="${escapeHtml(i.id)}">${escapeHtml(i.label)}</option>`).join("");
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

async function loadProducts() {
  try {
    const res = await fetch("garments_with_product_ids.json");
    const data = await res.json();
    PRODUCT_DATA = Array.isArray(data) ? data : (data.garments || []);
  } catch (e) {
    console.error("Could not load garments_with_product_ids.json", e);
    PRODUCT_DATA = [];
  }
}

function populateGarments() {
  const garments = PRODUCT_DATA.map(p => ({
    id: p.id,
    label: p.title || p.label || p.id
  }));
  fill(el.garment, garments, true);
}

function bindEvents() {
  el.garment.addEventListener("change", () => {
    populateColorsAndSizes();
    render();
  });
  el.size.addEventListener("change", render);
  el.color.addEventListener("change", render);
  el.placement.addEventListener("change", () => {
    syncUI();
    render();
  });
  el.front.addEventListener("change", render);
  el.back.addEventListener("change", render);

  document.getElementById("previewBtn").addEventListener("click", render);
  document.getElementById("cartBtn").addEventListener("click", submit);
}

function populateColorsAndSizes() {
  const product = PRODUCT_DATA.find(p => p.id === el.garment.value);
  if (!product) {
    fill(el.color, [], true);
    fill(el.size, [], true);
    return;
  }

  const colors = (product.colors || []).map(c => ({ id: c, label: c }));
  const sizes = (product.sizes || []).map(s => ({ id: s, label: s }));

  fill(el.color, colors, true);
  fill(el.size, sizes, true);
}

function syncUI() {
  const mode = el.placement.value;
  el.backWrap.style.display = mode === "freestyle" ? "block" : "none";

  if (mode === "same") {
    el.back.value = el.front.value;
  } else if (mode === "front_only") {
    el.back.value = "";
  }
}

function getDesign(id) {
  return DESIGN_LIST.find(d => d.id === id) || null;
}

function labelFor(list, id) {
  return list.find(x => x.id === id)?.label || "—";
}

function findVariant(product, colorLabel, size) {
  if (!product) return null;
  return (product.variants || []).find(v =>
    String(v.color || "").toLowerCase() === String(colorLabel || "").toLowerCase() &&
    String(v.size || "").toUpperCase() === String(size || "").toUpperCase()
  ) || null;
}

function render() {
  const product = PRODUCT_DATA.find(p => p.id === el.garment.value);
  const garmentLabel = product?.title || product?.label || "—";
  const size = el.size.value || "—";
  const color = el.color.value || "—";
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
        <img src="${frontDesign.image}" alt="${escapeHtml(frontDesign.label)}">
      </div>
    `;
    return;
  }

  if (el.placement.value === "same") {
    el.preview.innerHTML = `
      <div class="preview-pair">
        <img src="${frontDesign.image}" alt="${escapeHtml(frontDesign.label)}">
        <img src="${frontDesign.image}" alt="${escapeHtml(frontDesign.label)}">
      </div>
    `;
    return;
  }

  el.preview.innerHTML = `
    <div class="preview-pair">
      <img src="${frontDesign.image}" alt="${escapeHtml(frontDesign.label)}">
      <img src="${backDesign?.image || ""}" alt="${escapeHtml(backDesign?.label || "")}">
    </div>
  `;
}

function submit() {
  const product = PRODUCT_DATA.find(p => p.id === el.garment.value);
  const colorLabel = el.color.value;
  const size = el.size.value;
  const variant = findVariant(product, colorLabel, size);

  const payload = {
    garment: el.garment.value,
    garment_label: product?.label || "",
    garment_title: product?.title || "",
    printful_product_id: product?.printful_product_id || null,
    color: colorLabel,
    size: size,
    variant_id: variant?.variant_id || null,
    sku: variant?.sku || null,
    price: variant?.price || null,
    placement: el.placement.value,
    front_design_id: el.front.value,
    front_design_label: getDesign(el.front.value)?.label || "",
    back_design_id: el.back.value,
    back_design_label: getDesign(el.back.value)?.label || ""
  };

  console.log("Design payload:", payload);
  window.parent.postMessage({ type: "design-selection", payload }, "*");
}