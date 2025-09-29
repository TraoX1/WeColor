// ui.js — your UI code

function setColor(hex) {
  selectedcolor = hex;
  var box = document.getElementById("selectedcolor");
  if (box) box.style.backgroundColor = hex;
}

// Saved Colors
const SAVED_COLORS_KEY = 'wecolor_saved_colors';
const MAX_SAVED_COLORS = 16;
let savedColors = [];

function loadSavedColors() {
  try {
    const raw = localStorage.getItem(SAVED_COLORS_KEY);
    const arr = JSON.parse(raw);
    savedColors = Array.isArray(arr) ? arr : [];
  } catch (e) { savedColors = []; }
  renderSavedColors();
}

function persistSavedColors() {
  try { localStorage.setItem(SAVED_COLORS_KEY, JSON.stringify(savedColors)); } catch (e) {}
}

function renderSavedColors() {
  const container = document.getElementById('savedColors');
  if (!container) return;
  container.innerHTML = '';
  savedColors.forEach((hex, i) => {
    const sw = document.createElement('div');
    sw.title = hex + ' (right-click to delete)';
    sw.style.width = '22px';
    sw.style.height = '22px';
    sw.style.border = '1px solid #ffffff66';
    sw.style.borderRadius = '4px';
    sw.style.cursor = 'pointer';
    sw.style.background = hex;
    sw.onclick = () => setColor(hex);
    sw.oncontextmenu = (ev) => { ev.preventDefault(); removeSavedColor(i); };
    container.appendChild(sw);
  });
}

function saveCurrentColor() {
  if (!selectedcolor) return;
  const hex = selectedcolor.toUpperCase();
  if (savedColors.includes(hex)) {
    savedColors = savedColors.filter(c => c !== hex);
  } else if (savedColors.length >= MAX_SAVED_COLORS) {
    savedColors.shift();
  }
  savedColors.push(hex);
  persistSavedColors();
  renderSavedColors();
}

function removeSavedColor(index) {
  if (index < 0 || index >= savedColors.length) return;
  savedColors.splice(index, 1);
  persistSavedColors();
  renderSavedColors();
}

// Hover coords (optional hook)
function updateHoverCoords(x0, y0) {
  var el = document.getElementById('coords');
  if (!el) return;
  if (x0 == null || y0 == null) el.textContent = "Hover: –";
  else el.textContent = "Hover: (" + x0 + ", " + y0 + ")";
}

function initUI() { loadSavedColors(); }

// Expose
window.WeColorUI = { initUI, updateHoverCoords, setColor, saveCurrentColor };
