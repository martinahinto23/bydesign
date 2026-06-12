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

const el = {};

document.addEventListener("DOMContentLoaded", async () => {
  el.garment = document.getElementById("garment");
  el.placement = document.getElementById("placement");
  el.color = document.getElementById("color");
  el.size = document.getElementById("size");
  el.frontDesign = document.getElementById("frontDesign");
  el.backDesign = document.getElementById("backDesign");
  el.backWrap = document.getElementById("backWrap");
  el.submit = document.getElementById("submit");
  el.status = document.getElementById("status");

  fillSelect(el.garment, GARMENTS);
  fillSelect(el.placement, [
    { id: "", label: "Select placement" },
    { id: "front_only", label: "Front only" },
    { id: "same", label: "Front + Back same design" },
    { id: "split", label: "Front + Back different designs" }
  ]);
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
  selectEl.innerHTML = `<option value="">Select</option>` + items.map(i =>
    `<option value="${i.id}">${i.label}</option>`
  ).join("");
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

  if (placement === "front_only" || placement === "") {
    el.backWrap.style.display = "none";
    el.backDesign.value = "";
    el.backDesign.disabled = true;
    return;
  }

  el.backWrap.style.display = "block";
  el.backDesign.disabled = false;

  if (placement === "same") {
    el.backDesign.value = el.frontDesign.value;
    el.backDesign.disabled = true;
  } else {
    el.backDesign.disabled = false;
    if (el.backDesign.value === el.frontDesign.value) {
      el.backDesign.value = "";
    }
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
  );
}