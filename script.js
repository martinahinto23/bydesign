let VARIANTS = null;

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

const COLORS = [
  { id: "black", label: "Black" },
  { id: "white", label: "White" },
  { id: "forest-green", label: "Forest Green" },
  { id: "red", label: "Red" },
  { id: "gold", label: "Gold" },
  { id: "team-royal", label: "Team Royal" },
  { id: "graphite-heather", label: "Graphite Heather" }
];

const GARMENTS = [
  { id: "tee", label: "Tee" },
  { id: "long_sleeve", label: "Long Sleeve" },
  { id: "hoodie", label: "Hoodie" },
  { id: "sweatshirt", label: "Sweatshirt" }
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

  fill(el.garment, GARMENTS);
  fill(el.size, SIZES);
  fill(el.color, COLORS);
  fill(el.placement, PLACEMENT);
  fill(el.front, DESIGN_LIST);
  fill(el.back, DESIGN_LIST);

  el.placement.addEventListener("change", sync);
  el.front.addEventListener("change", sync);
  el.back.addEventListener("change", sync);

  document.getElementById("previewBtn").addEventListener("click", render);
  document.getElementById("cartBtn").addEventListener("click", submit);

  await loadVariants();
  sync();
  render();
});

function fill(select, items) {
  select.innerHTML = `<option value="">Select</option>` + items.map(i => `<option value="${i.id}">${i.label}</option>`).join("");
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
}

function render() {
  const garment = labelFor(GARMENTS, el.garment.value);
  const size = el.size.value || "—";
  const color = labelFor(COLORS, el.color.value);
  const mode = labelFor(PLACEMENT, el.placement.value);

  const frontDesign = getDesign(el.front.value);
  const backDesign = el.placement.value === "same" ? frontDesign : getDesign(el.back.value);

  el.summary.innerHTML = `
    Garment: ${garment}<br>
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

async function loadVariants() {
  try {
    const res = await fetch("variants.json");
    VARIANTS = await res.json();
  } catch (e) {
    VARIANTS = null;
  }
}

function submit() {
  const placement = el.placement.value;
  const payload = {
    garment: el.garment.value,
    size: el.size.value,
    color: el.color.value,
    placement,
    front_design: el.front.value,
    back_design: placement === "front_only" ? "" : placement === "same" ? el.front.value : el.back.value
  };

  console.log(payload);
  window.parent.postMessage({ type: "design-selection", payload }, "*");
}