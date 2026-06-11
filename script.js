let COMBOS = null;
let VARIANTS = null;

const DESIGN_LIST = [
  { id: "Faith", label: "Embrace the Faith" },
  { id: "LiftLove", label: "Lift Love" },
  { id: "Sleepin", label: "Sleeping won't save you" },
  { id: "LCW", label: "Love & Clarity Will" },
  { id: "LeftLives", label: "Liberty Lives" },
  { id: "RTR", label: "Resist" },
  { id: "HH", label: "Helping Hands (HH)" },
  { id: "Newton", label: "Newton" },
  { id: "Halt", label: "Halt the Hate" },
  { id: "Demo", label: "Democracy won't fade on us" },
  { id: "DEI", label: "Diversity Earth (Equity) Inclusion" }
];

const GARMENTS = [
  { id: "tee", label: "tee" },
  { id: "long_sleeve", label: "long sleeve" },
  { id: "hoodie", label: "hoodie" },
  { id: "sweatshirt", label: "sweatshirt" }
];

const COLORS = ["blue", "black", "red", "grey", "white"];
const SIZES = ["S", "M", "L", "XL", "2XL", "3XL"];
const PLACEMENTS = ["same", "split", "front_only"];

const el = {};
document.addEventListener("DOMContentLoaded", async () => {
  el.garment = document.getElementById("garment");
  el.placement = document.getElementById("placement");
  el.color = document.getElementById("color");
  el.size = document.getElementById("size");
  el.frontDesign = document.getElementById("frontDesign");
  el.backDesign = document.getElementById("backDesign");
  el.submit = document.getElementById("submit");
  el.status = document.getElementById("status");

  fillSelect(el.garment, GARMENTS);
  fillSelect(el.placement, PLACEMENTS.map(v => ({ id: v, label: v })));
  fillSelect(el.color, COLORS.map(v => ({ id: v, label: v })));
  fillSelect(el.size, SIZES.map(v => ({ id: v, label: v })));
  fillSelect(el.frontDesign, DESIGN_LIST);
  fillSelect(el.backDesign, DESIGN_LIST);

  COMBOS = buildCombos();
  loadVariants();

  el.placement.addEventListener("change", syncBackDesign);
  el.frontDesign.addEventListener("change", syncBackDesign);
  el.submit.addEventListener("click", submitSelection);

  syncBackDesign();
});

function fillSelect(selectEl, items) {
  selectEl.innerHTML = items.map(i => `<option value="${i.id}">${i.label}</option>`).join("");
}

function buildCombos() {
  const combos = [];
  for (const front of DESIGN_LIST) {
    combos.push({
      combo_id: `SB-${front.id}`,
      placement_mode: "same",
      front_design: front.id,
      back_design: front.id
    });

    combos.push({
      combo_id: `${front.id}-FRONT`,
      placement_mode: "front_only",
      front_design: front.id,
      back_design: null
    });

    for (const back of DESIGN_LIST) {
      if (back.id === front.id) continue;
      combos.push({
        combo_id: `${front.id}-${back.id}`,
        placement_mode: "split",
        front_design: front.id,
        back_design: back.id
      });
    }
  }
  return combos;
}

function syncBackDesign() {
  const placement = el.placement.value;
  const front = el.frontDesign.value;

  if (placement === "front_only") {
    el.backDesign.disabled = true;
    el.backDesign.innerHTML = `<option value="">None</option>`;
    return;
  }

  if (placement === "same") {
    el.backDesign.disabled = true;
    el.backDesign.innerHTML = `<option value="${front}">${front}</option>`;
    el.backDesign.value = front;
    return;
  }
const placementMode = document.getElementById('placementMode');
const backWrap = document.getElementById('backWrap');
const backDesign = document.getElementById('backDesign');

function toggleBackDesign() {
  const showBack = placementMode.value === 'front-back';
  backWrap.style.display = showBack ? 'block' : 'none';

  if (!showBack) {
    backDesign.value = '';
  }
}

placementMode.addEventListener('change', toggleBackDesign);
window.addEventListener('DOMContentLoaded', toggleBackDesign);
}

function findCombo() {
  const placement = el.placement.value;
  const front = el.frontDesign.value;
  const back = placement === "front_only" ? null : el.backDesign.value;

  return COMBOS.find(c => {
    if (c.placement_mode !== placement) return false;
    if (c.front_design !== front) return false;
    if (placement === "same") return c.back_design === front;
    if (placement === "split") return c.back_design === back;
    return true;
  });
}

function findVariant() {
  if (!VARIANTS) return null;

  const garmentId = el.garment.value;
  const color = el.color.value;
  const size = el.size.value;

  const garment = VARIANTS.garments.find(g => g.id === garmentId);
  if (!garment) return null;

  const variant = (garment.variants || []).find(v =>
    v.color === color && v.size === size
  );

  if (!variant) {
    return {
      garment_id: garmentId,
      printful_product_id: garment.printful_product_id,
      color,
      size,
      variant_id: null
    };
  }

  return {
    garment_id: garmentId,
    printful_product_id: garment.printful_product_id,
    color,
    size,
    variant_id: variant.variant_id
  };
}

async function loadVariants() {
  try {
    const res = await fetch("variants.json");
    VARIANTS = await res.json();
    setStatus("Ready.");
  } catch (e) {
    setStatus("Could not load variants.json");
  }
}

function submitSelection() {
  const combo = findCombo();
  const variant = findVariant();

  if (!combo) {
    setStatus("No matching combo found.");
    return;
  }

  if (!variant || !variant.variant_id) {
    setStatus("No matching Printful variant found.");
    return;
  }

  const payload = {
    combo_id: combo.combo_id,
    placement_mode: combo.placement_mode,
    front_design: combo.front_design,
    back_design: combo.back_design,
    garment_id: variant.garment_id,
    printful_product_id: variant.printful_product_id,
    variant_id: variant.variant_id,
    color: variant.color,
    size: variant.size
  };

  setStatus("Selection ready.");
  window.parent.postMessage({ type: "design-selection", payload }, "*");
  console.log(payload);
}

function setStatus(msg) {
  if (el.status) el.status.textContent = msg;
}