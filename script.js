const garmentType = document.getElementById('garmentType');
const size = document.getElementById('size');
const color = document.getElementById('color');
const placementMode = document.getElementById('placementMode');
const frontDesign = document.getElementById('frontDesign');
const backDesign = document.getElementById('backDesign');
const backWrap = document.getElementById('backWrap');
const previewBtn = document.getElementById('previewBtn');
const cartBtn = document.getElementById('cartBtn');
const previewBox = document.getElementById('previewBox');
const summary = document.getElementById('summary');

function updateBackDesignVisibility() {
  const showBack = placementMode.value === 'back' || placementMode.value === 'front-back';
  backWrap.classList.toggle('show', showBack);
  if (!showBack) backDesign.value = '';
}

function getSummaryHTML() {
  return `
    <strong>Selection summary</strong><br />
    Garment: ${garmentType.value || '—'}<br />
    Size: ${size.value || '—'}<br />
    Color: ${color.value || '—'}<br />
    Placement: ${placementMode.value || '—'}<br />
    Front design: ${frontDesign.value || '—'}<br />
    Back design: ${backDesign.value || '—'}
  `;
}

function renderPreview() {
  const garment = garmentType.value || 'Garment';
  const clr = color.value || 'Color';
  const s = size.value || 'Size';
  const place = placementMode.value || 'Placement';

  previewBox.innerHTML = `
    <div>
      <strong>${garment} Preview</strong>
      ${clr} · ${s} · ${place}
    </div>
  `;

  summary.innerHTML = getSummaryHTML();
}

placementMode.addEventListener('change', () => {
  updateBackDesignVisibility();
  renderPreview();
});

previewBtn.addEventListener('click', renderPreview);

cartBtn.addEventListener('click', () => {
  const payload = {
    garmentType: garmentType.value,
    size: size.value,
    color: color.value,
    placementMode: placementMode.value,
    frontDesign: frontDesign.value,
    backDesign: backDesign.value || null
  };

  console.log('Add to cart payload:', payload);
  alert('Add-to-cart payload logged to console.');
});

[garmentType, size, color, frontDesign, backDesign].forEach(el => {
  el.addEventListener('change', () => {
    updateBackDesignVisibility();
    renderPreview();
  });
});

updateBackDesignVisibility();
renderPreview();