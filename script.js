let VARIANTS = null;

const DESIGN_LIST = [
  { id: "design-1", label: "Embrace the Faith" },
  { id: "design-2", label: "Lift Love" },
  { id: "design-3", label: "Sleeping won't save you" },
  { id: "design-4", label: "Love & Clarity Will" },
  { id: "design-5", label: "Liberty Lives" },
  { id: "design-6", label: "Resist" },
  { id: "design-7", label: "Helping Hands (HH)" },
  { id: "design-8", label: "Newton" },
  { id: "design-9", label: "Halt the Hate" },
  { id: "design-10", label: "Democracy won't fade on us" },
  { id: "design-11", label: "Diversity Earth (Equity) Inclusion" }
];

const GARMENTS = [
  { id: "tee", label: "Tee" },
  { id: "long_sleeve", label: "Long Sleeve" },
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
  el.previewBox = document.getElementById("previewBox");
  el.summary = document.getElementById("summary");

  fill(el.garment, GARMENTS);
  fill(el.size, ["S","M","L","XL","2XL","3XL"].map(x=>({id:x,label:x})));
  fill(el.color, COLORS);
  fill(el.placement, PLACEMENT);
  fill(el.front, DESIGN_LIST);
  fill(el.back, DESIGN_LIST);

  await loadVariants();

  el.placement.addEventListener("change", syncUI);
  el.front.addEventListener("change", syncUI);
  el.back.addEventListener("change", syncUI);

  document.getElementById("previewBtn").onclick = render;
  document.getElementById("cartBtn").onclick = submit;

  syncUI();
  render();
});

function fill(select, items){
  select.innerHTML =
    `<option value="">Select</option>` +
    items.map(i => `<option value="${i.id}">${i.label}</option>`).join("");
}

function syncUI(){
  const mode = el.placement.value;

  if(mode === "front_only"){
    el.backWrap.style.display = "none";
  }

  if(mode === "same"){
    el.backWrap.style.display = "none";
  }

  if(mode === "freestyle"){
    el.backWrap.style.display = "block";
  }
}

function render(){
  const front = el.front.selectedOptions[0]?.textContent || "—";
  const back = el.back.selectedOptions[0]?.textContent || "—";

  const mode = el.placement.value;

  let summary = `
    Garment: ${el.garment.value}<br>
    Size: ${el.size.value}<br>
    Color: ${el.color.value}<br>
    Placement: ${mode}<br>
    Front: ${front}<br>
  `;

  if(mode === "same") summary += `Back: ${front}`;
  if(mode === "freestyle") summary += `Back: ${back}`;

  el.summary.innerHTML = summary;

  el.previewBox.innerHTML = `
    <div>
      <strong>Preview</strong><br>
      ${front}<br>
      ${mode !== "front_only" ? back : ""}
    </div>
  `;
}

async function loadVariants(){
  try{
    const res = await fetch("variants.json");
    VARIANTS = await res.json();
  }catch(e){}
}

function submit(){
  const payload = {
    garment: el.garment.value,
    size: el.size.value,
    color: el.color.value,
    placement: el.placement.value,
    front_design: el.front.value,
    back_design: el.back.value
  };

  console.log(payload);
  window.parent.postMessage({type:"design-selection", payload},"*");
}