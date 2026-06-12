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
  { id: "tee", label: "Tee" },
  { id: "long_sleeve", label: "Long sleeve" },
  { id: "hoodie", label: "Hoodie" },
  { id: "sweatshirt", label: "Sweatshirt" }
];

const COLORS = [
  { id: "blue", label: "Blue" },
  { id: "black", label: "Black" },
  { id: "red", label: "Red" },
  { id: "grey", label: "Grey" },
  { id: "white", label: "White" }
];

const SIZES = [
  { id: "S", label: "S" },
  { id: "M", label: "M" },
  { id: "L", label: "L" },
  { id: "XL", label: "XL" },
  { id: "2XL", label: "2XL" },
  { id: "3XL", label: "3XL" }
];

const el = {};

document.addEventListener("DOMContentLoaded", async () => {
  el.garment = document.getElementById("garment");
  el.placement = document.getElementById("placement");
  el.color = document.getElementById("color");
  el.size = document.getElementById("size");
  el.frontDesign = document.getElementById("frontDesign");
  el.backDesign = document.getElementById("backDesign");
  el.backWrap = document.getElementById("backWrap");
  el.previewBtn = document.getElementById("previewBtn");
  el.cartBtn = document.getElementById("cartBtn");
  el.summary = document.getElementById("summary");
  el.previewBox = document.getElementById("previewBox");

  fillSelect(el.garment, GARMENTS);
  fillSelect(el.color, COLORS);
  fillSelect(el.size, SIZES);
  fillSelect(el.frontDesign, DESIGN_LIST);
  fillSelect(el.backDesign, DESIGN_LIST);

  COMBOS = buildCombos();
  await loadVariants();

  el.placement.addEventListener("change", syncBackDesign);
  el.frontDesign.addEventListener("change", syncBackDesign);
  el.previewBtn.addEventListener("click", renderPreviewAndSummary);
  el.cartBtn.addEventListener("click", submitSelection);

  syncBackDesign();
  renderPreviewAndSummary();
});

function fillSelect(selectEl, items) {
  selectEl.innerHTML = `<option value="">Select</option>` + items.map(i =>
    `<option value="${i.id}">${i.label}</option>`
  ).join("");
}

function buildCombos() {
  const combos = [];
  for (const front of DESIGN_LIST) {
    combos.push({
      combo_id: `FRONT-${front.id}`,
      placement_mode: "front_only",
      front_design: front.id,
      back_design: null
    });

    combos.push({
      combo_id: `SAME-${front.id}`,
      placement_mode: "same",
      front_design: front.id,
      back_design: front.id
    });

    for (const back of DESIGN_LIST) {
      if (back.id === front.id) continue;
      combos.push({
        combo_id: `FREE-${front.id}-${back.id}`,
        placement_mode: "freestyle",
        front_design: front.id,
        back_design: back.id
      });
    }
  }
  return combos;
}

function syncBackDesign() {
  const placement = el.placement.value;

  if (placement === "freestyle") {
    el.backWrap.style.display = "block";
    el.backDesign.disabled = false;
    return;
  }

  el.backWrap.style.display = "none";
  el.backDesign.value = "";
  el.backDesign.disabled = true;

  if (placement === "same") {
    el.backDesign.value = el.frontDesign.value;
  }
}

function findCombo() {
  const placement = el.placement.value;
  const front = el.frontDesign.value;
  const back = placement === "same" ? front : el.backDesign.value;

  return COMBOS.find(c =>
    c.placement_mode === placement &&
    c.front_design === front &&
    (placement === "same" ? c.back_design === front : c.back_design === back)
  ) || null;
}

function findVariant() {
  if (!VARIANTS) return null;

  const garmentId = el.garment.value;
  const color = el.color.value;
  const size = el.size.value;

  const garment = VARIANTS.garments.find(g => g.id === garmentId);
  if (!garment) return null;

  const variant = (garment.variants || []).find(v => v.color === color && v.size === size);

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
  } catch (e) {
    console.error("Could not load variants.json", e);
  }
}

function renderPreviewAndSummary() {
  const garmentLabel = el.garment.selectedOptions[0]?.textContent || "—";
  const colorLabel = el.color.selectedOptions[0]?.textContent || "—";
  const sizeLabel = el.size.value || "—";
  const placement = el.placement.value || "—";
  const frontLabel = el.frontDesign.selectedOptions[0]?.textContent || "—";
  const backLabel = el.backDesign.selectedOptions[0]?.textContent || "—";

  const backText =
    el.placement.value === "same" ? frontLabel :
    el.placement.value === "freestyle" ? backLabel :
    "—";

  el.summary.innerHTML = `
    <strong>Selection summary</strong><br />
    Garment: ${garmentLabel}<br />
    Size: ${sizeLabel}<br />
    Color: ${colorLabel}<br />
    Placement: ${placement}<br />
    Front design: ${frontLabel}<br />
    Back design: ${backText}
  `;

  el.previewBox.innerHTML = `
    <div>
      <strong>Preview Area</strong><br />
      ${garmentLabel}<br />
      ${colorLabel}<br />
      ${el.placement.value === "front_only" ? `Front: ${frontLabel}` : ""}
      ${el.placement.value === "same" ? `Front: ${frontLabel}<br />Back: ${frontLabel}` : ""}
      ${el.placement.value === "freestyle" ? `Front: ${frontLabel}<br />Back: ${backLabel}` : ""}
    </div>
  `;
}

function submitSelection() {
  const combo = findCombo();
  const variant = findVariant();

  if (!combo) {
    alert("No matching combo found.");
    return;
  }

  if (!variant || !variant.variant_id) {
    alert("No matching Printful variant found.");
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

  window.parent.postMessage({ type: "design-selection", payload }, "*");
  console.log(payload);
}