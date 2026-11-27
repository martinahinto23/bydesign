let PRODUCT_DATA = null;
let VARIANTS = [];
const cart = [];
const BACK_UPCHARGE_CENTS = 700; // must match api/checkout.js

const DESIGN_LIST = [
  { id: "design-1", label: "Embrace the Faith", image: "images/design-1.png" },
  { id: "design-2", label: "Lift Love", image: "images/design-2.png" },
  { id: "design-3", label: "Sleeping won't save you", image: "images/design-3.png" },
  { id: "design-4", label: "Love & Clarity Will", image: "images/design-4.png" },
  { id: "design-5", label: "Liberty Lives", image: "images/design-5.png" },
  { id: "design-6", label: "Resist", image: "images/design-6.png" },
  { id: "design-7", label: "Helping Hands (HH)", image: "images/design-7.png" },
  { id: "design-8", label: "Newton", image: "images/design-8.png" },
  { id: "design-9", label: "Halt the Hate", image: "images/design-9.png" },
  { id: "design-10", label: "Democracy won't fade on us", image: "images/design-10.png" },
  { id: "design-11", label: "Diversity Earth (Equity) Inclusion", image: "images/design-11.png" },
    { id: "design-12", label: "Rising Tide Lifts All Boats", image: "images/design-12.png", frontOnly: true },
  { id: "design-13", label: "All Politics is Personal", image: "images/design-13.png", frontOnly: true },
  { id: "design-14", label: "Blue Wave in November", image: "images/design-14.png", frontOnly: true },
];

const GARMENTS = [
  { id: "tee", label: "Tee" },
  { id: "long_sleeve", label: "Long Sleeve" },
  { id: "hoodie", label: "Hoodie" },
  { id: "sweatshirt", label: "Sweatshirt" }
];

// Only the colors Printful really makes for each garment
const GARMENT_COLORS = {
  tee: ["Black", "White", "Navy", "Red"],
  long_sleeve: ["Black", "White", "Navy"],
  hoodie: ["Black", "White", "Grey"],
  sweatshirt: ["Black", "White", "Crimson"]
};

const PLACEMENT = [
  { id: "front_only", label: "Front Only" },
  { id: "same", label: "Same Design Front + Back" },
  { id: "freestyle", label: "Front + Back Freestyle" }
];

const SIZES = ["S", "M", "L", "XL", "2XL", "3XL"].map(x => ({ id: x, label: x }));

const el = {};

function money(cents) {
  return "$" + (cents / 100).toFixed(2);
}

function unitPriceCents(payload, variant) {
  const hasBack = payload.placement === "same" || payload.placement === "freestyle";
  return variant.price_cents + (hasBack ? BACK_UPCHARGE_CENTS : 0);
}

function colorsFor(garment) {
  return (GARMENT_COLORS[garment] || []).map(n => ({ id: n.toLowerCase(), label: n }));
}

function updateColors() {
  const keep = el.color.value;
  const list = colorsFor(el.garment.value);
  fill(el.color, list);
  if (list.some(c => c.id === keep)) el.color.value = keep;
}

// Front-only designs: lock placement to "Front Only" and show a note
function applyFrontOnly() {
  const d = getDesign(el.front.value);
  const frontOnly = !!(d && d.frontOnly);
  const note = document.getElementById("frontOnlyNote");
  if (note) note.hidden = !frontOnly;
  for (const opt of el.placement.options) {
    opt.disabled = frontOnly && opt.value !== "front_only";
  }
  if (frontOnly && el.placement.value !== "front_only") {
    el.placement.value = "front_only";
    el.placement.dispatchEvent(new Event("change"));
  }
}

document.addEventListener("DOMContentLoaded", async () => {
  el.garment = document.getElementById("garment");
  el.size = document.getElementById("size");
  el.color = document.getElementById("color");
  el.placement = document.getElementById("placement");
  el.front = document.getElementById("frontDesign");
  el.backWrap = document.getElementById("backWrap");
  el.back = document.getElementById("backDesign");
  el.preview = document.getElementById("previewBox");
  el.summary = document.getElementById("summary");
  el.variantId = document.getElementById("printful_variant_id");
  el.productId = document.getElementById("printful_product_id");
  el.shippingCard = document.getElementById("shippingCard");
  el.shippingForm = document.getElementById("shippingForm");
  el.cartSummary = document.getElementById("cartSummary");
  el.orderMessage = document.getElementById("orderMessage");

  fill(el.garment, GARMENTS);
  fill(el.size, SIZES);
  fill(el.placement, PLACEMENT);
  fill(el.front, DESIGN_LIST);
  fill(el.back, DESIGN_LIST.filter(d => !d.frontOnly));
  updateColors();

  el.garment.addEventListener("change", () => { updateColors(); render(); });
  el.size.addEventListener("change", render);
  el.color.addEventListener("change", render);
  el.placement.addEventListener("change", sync);
  el.front.addEventListener("change", sync);
  el.back.addEventListener("change", sync);
  el.front.addEventListener("change", applyFrontOnly);
  applyFrontOnly();

  document.getElementById("previewBtn").addEventListener("click", render);
  document.getElementById("cartBtn").addEventListener("click", submit);
  if (el.shippingForm) el.shippingForm.addEventListener("submit", placeOrder);

  // Message when Stripe sends the customer back
  const params = new URLSearchParams(window.location.search);
  const banner = document.createElement("p");
  if (params.get("paid") === "1") {
    banner.textContent = "Thank you! Your payment went through and your order is being prepared.";
    document.getElementById("designerApp").prepend(banner);
  } else if (params.get("canceled") === "1") {
    banner.textContent = "Payment was canceled. Your order was not placed.";
    document.getElementById("designerApp").prepend(banner);
  }

  await loadVariants();
  sync();
  render();
});

function fill(select, items) {
  select.innerHTML =
    `<option value="">Select</option>` +
    items.map(i => `<option value="${i.id}">${i.label}</option>`).join("");
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
  if (mode !== "freestyle") {
    el.back.value = mode === "same" ? el.front.value : "";
  }
  render();
}

function getCurrentPayload() {
  const placement = el.placement.value;
  return {
    garment: el.garment.value,
    size: el.size.value,
    color: el.color.value,
    placement,
    front_design: el.front.value,
    back_design:
      placement === "front_only" ? "" : placement === "same" ? el.front.value : el.back.value
  };
}

function updateHiddenIds() {
  const matched = findVariant(getCurrentPayload());
  el.variantId.value = matched?.printful_variant_id || "";
  el.productId.value = matched?.printful_product_id || "";
}

function render() {
  const payload = getCurrentPayload();
  const garment = labelFor(GARMENTS, el.garment.value);
  const size = el.size.value || "—";
  const color = labelFor(colorsFor(el.garment.value), el.color.value);
  const mode = labelFor(PLACEMENT, el.placement.value);
  const frontDesign = getDesign(el.front.value);
  const backDesign =
    el.placement.value === "same" ? frontDesign : getDesign(el.back.value);

  updateHiddenIds();

  const matched = findVariant(payload);
  const priceLine = matched
    ? `<br>Price: ${money(unitPriceCents(payload, matched))} (shipping added at checkout)`
    : "";

  el.summary.innerHTML =
    `Garment: ${garment}<br>` +
    `Size: ${size}<br>` +
    `Color: ${color}<br>` +
    `Placement: ${mode}<br>` +
    `Front: ${frontDesign?.label || "—"}<br>` +
    `Back: ${el.placement.value === "front_only" ? "—" : (backDesign?.label || "—")}` +
    priceLine +
    (VARIANTS.length ? `<br>Loaded variants: ${VARIANTS.length}` : "");

  if (!frontDesign) {
    el.preview.innerHTML = `<div><strong>Preview Area</strong><p>Your design preview will appear here.</p></div>`;
    return;
  }

  if (el.placement.value === "front_only") {
    el.preview.innerHTML = `<div class="preview-stack"><img src="${frontDesign.image}" alt="${frontDesign.label}"></div>`;
    return;
  }

  el.preview.innerHTML = `
    <div class="preview-pair">
      <img src="${frontDesign.image}" alt="${frontDesign.label}">
      <img src="${backDesign?.image || frontDesign.image}" alt="${backDesign?.label || frontDesign.label}">
    </div>
  `;
}

async function loadVariants() {
  try {
    const res = await fetch("variants.json");
    PRODUCT_DATA = await res.json();
    VARIANTS = PRODUCT_DATA.variants || [];
  } catch (e) {
    PRODUCT_DATA = null;
    VARIANTS = [];
  }
}

// The variant only depends on garment + color + size.
// The design is a separate image file, so any design works.
function findVariant(payload) {
  return (
    VARIANTS.find(
      v =>
        v.garment === payload.garment &&
        v.color === payload.color &&
        v.size === payload.size
    ) || null
  );
}

const PUBLIC_BASE = "https://bydesign-mocha.vercel.app/";

function fullUrl(path) {
  return new URL(path, PUBLIC_BASE).href;
}

// Draws the cart, with a price and Remove button on every item
function renderCart() {
  if (!el.cartSummary) return;
  el.cartSummary.innerHTML = "";

  if (cart.length === 0) {
    el.cartSummary.textContent = "Your cart is empty.";
    return;
  }

  const title = document.createElement("div");
  title.textContent = "In your cart:";
  el.cartSummary.append(title);

  cart.forEach((item, index) => {
    const row = document.createElement("div");
    const text = document.createElement("span");
    text.textContent = `${item.label} — ${money(item.price_cents * item.quantity)} `;
    const btn = document.createElement("button");
    btn.type = "button";
    btn.textContent = "Remove";
    btn.addEventListener("click", () => {
      cart.splice(index, 1);
      renderCart();
    });
    row.append(text, btn);
    el.cartSummary.append(row);
  });

  const total = cart.reduce((sum, i) => sum + i.price_cents * i.quantity, 0);
  const sub = document.createElement("div");
  sub.textContent = `Items: ${money(total)} (shipping is added at checkout)`;
  el.cartSummary.append(sub);
}

function submit() {
  const payload = getCurrentPayload();

  if (!payload.garment || !payload.size || !payload.color || !payload.placement || !payload.front_design) {
    alert("Please choose a garment, size, color, placement, and front design.");
    return;
  }

  // Front-only designs can't go on the back
  const fd = getDesign(payload.front_design);
  const bd = getDesign(payload.back_design);
  if ((fd && fd.frontOnly && payload.placement !== "front_only") || (bd && bd.frontOnly)) {
    alert("Rising Tides is a front print only. It can't be used on the back.");
    return;
  }

  if (payload.placement === "freestyle" && !payload.back_design) {
    alert("Please choose a back design.");
    return;
  }

  const matched = findVariant(payload);
  if (!matched) {
    alert("That garment, size, and color combination isn't available.");
    return;
  }

  el.variantId.value = matched.printful_variant_id || "";
  el.productId.value = matched.printful_product_id || "";

  // Build the design files Printful needs (public https links)
  const files = [];
  const front = getDesign(payload.front_design);
  if (front) files.push({ type: "default", url: fullUrl(front.image) });
  if (payload.placement !== "front_only") {
    const back = getDesign(payload.back_design);
    if (back) files.push({ type: "back", url: fullUrl(back.image) });
  }

  cart.push({
    variant_id: matched.printful_variant_id,
    quantity: 1,
    files,
    price_cents: unitPriceCents(payload, matched),
    label: `${labelFor(GARMENTS, payload.garment)}, ${labelFor(colorsFor(payload.garment), payload.color)}, ${payload.size} — ${front?.label || ""}`
  });

  renderCart();
  if (el.orderMessage) el.orderMessage.textContent = "";

  if (el.shippingCard) {
    el.shippingCard.style.display = "block";
    el.shippingCard.scrollIntoView({ behavior: "smooth" });
  }

  window.parent.postMessage(
    {
      type: "design-selection",
      payload: {
        ...payload,
        printful_variant_id: matched.printful_variant_id,
        printful_product_id: matched.printful_product_id
      }
    },
    "*"
  );
}

async function placeOrder(e) {
  e.preventDefault();
  if (cart.length === 0) {
    el.orderMessage.textContent = "Your cart is empty.";
    return;
  }

  const sendBtn = el.shippingForm.querySelector('button[type="submit"]');
  if (sendBtn) sendBtn.disabled = true;
  el.orderMessage.textContent = "Preparing secure payment...";

  const recipient = Object.fromEntries(new FormData(el.shippingForm));
  const items = cart.map(i => ({
    variant_id: i.variant_id,
    quantity: i.quantity,
    files: i.files
  }));

  try {
    const r = await fetch("/api/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ recipient, items })
    });
    const text = await r.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      data = { error: "Server said (" + r.status + "): " + text.slice(0, 120) };
    }
    if (!r.ok) throw new Error(data.error);

    // Stripe's page can't open inside the iframe, so go to the full window
    el.orderMessage.textContent = "Taking you to secure payment... ";
    const link = document.createElement("a");
    link.href = data.url;
    link.target = "_top";
    link.textContent = "Click here if nothing happens";
    el.orderMessage.append(link);
    try { window.top.location.href = data.url; } catch {}
  } catch (err) {
    el.orderMessage.textContent = "Something went wrong: " + err.message;
  } finally {
    if (sendBtn) sendBtn.disabled = false;
  }
}