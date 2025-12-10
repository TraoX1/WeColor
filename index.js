var cursorx = -1
var cursory = -1
var pixelData = [] 
var knownPixelData = []

const API_BASE = '';

// ===== CAMERA / ZOOM STATE =====
const canvasEl = document.getElementById("canvas");
const ctx = canvasEl.getContext("2d");
ctx.imageSmoothingEnabled = false;

const WORLD_CELLS = 256;
const CELL = 10;
const WORLD_W = WORLD_CELLS * CELL;
const WORLD_H = WORLD_CELLS * CELL;

function centerToFit() {
  const w = canvasEl.width;
  const h = canvasEl.height;
  const s = Math.min(w / WORLD_W, h / WORLD_H);

  scale = s;
  MIN_SCALE = s;
  offsetX = (w - WORLD_W * scale) / 2;
  offsetY = (h - WORLD_H * scale) / 2;
  updateZoomLabel();
  drawPixel();
}

let scale = 1;
let offsetX = 0;
let offsetY = 0;
let MIN_SCALE = 1;
const MAX_SCALE = 8;

let isPanning = false;
let panStartX = 0, panStartY = 0;
let viewStartX = 0, viewStartY = 0;

function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
function updateZoomLabel() {
  const label = document.getElementById('zoomLabel');
  if (label) label.textContent = Math.round(scale * 100) + '%';
}
function getCanvasScreenXY(e) {
  const rect = canvasEl.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  return {
    sx: (e.clientX - rect.left) * dpr,
    sy: (e.clientY - rect.top) * dpr
  };
}
function screenToWorld(sx, sy) {
  return { x: (sx - offsetX) / scale, y: (sy - offsetY) / scale };
}
function worldToScreen(wx, wy) {
  return { x: wx * scale + offsetX, y: wy * scale + offsetY };
}

function delay(time) {
    return new Promise(resolve => setTimeout(resolve, time));
}

for (var i = 0; i < WORLD_CELLS; i ++) { 
    for (var j = 0; j < WORLD_CELLS; j++) { 
        pixelData[i * WORLD_CELLS + j] = "#ffffff"
    }
}

async function drawPixel() {
    const width = canvasEl.width;
    const height = canvasEl.height;

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, width, height);

    ctx.setTransform(scale, 0, 0, scale, offsetX, offsetY);
    ctx.strokeStyle = 'white';

    for (var i = 0; i < WORLD_CELLS; i++) {
        for (var j = 0; j < WORLD_CELLS; j++) {
            ctx.fillStyle = pixelData[i * WORLD_CELLS + j] || "#ffffff";
            ctx.fillRect(i * CELL, j * CELL, CELL, CELL);

            if (i * WORLD_CELLS + j == lastIndex) {
                var x = i + 1;
                var y = j + 1;

            if (pixelData[i * WORLD_CELLS + j] == undefined) continue;

            var lum = getLuminance(HEXToVBColor(pixelData[i * WORLD_CELLS + j] || "#ffffff"));
            ctx.lineWidth = 2;
            ctx.strokeStyle = lum < 20 ? 'white' : 'black';

            ctx.beginPath();
            ctx.moveTo((x * CELL) - 1, (y * CELL) - 1);
            ctx.lineTo(x * CELL - 1, (y - 1) * CELL + 1);
            ctx.stroke();

            ctx.beginPath();
            ctx.moveTo(x * CELL - 1, (y - 1) * CELL + 1);
            ctx.lineTo((x - 1) * CELL + 1, (y - 1) * CELL + 1);
            ctx.stroke();

            ctx.beginPath();
            ctx.moveTo((x - 1) * CELL + 1, (y - 1) * CELL + 1);
            ctx.lineTo((x - 1) * CELL + 1, y * CELL - 1);
            ctx.stroke();

            ctx.beginPath();
            ctx.moveTo((x - 1) * CELL + 1, y * CELL - 1);
            ctx.lineTo(x * CELL - 1, y * CELL - 1);
            ctx.stroke();
            }
        }
    }
}

function keepAlive() {
    fetch(`${API_BASE}/alive`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
    })
    .then(response => response.json())
    .then(json => {
        if (json.status === "success") {
            const onlineEl = document.getElementById("online");
            if (onlineEl) {
                onlineEl.innerHTML = "Users Online: " + json.online;
            }
        }
    })
    .catch(() => {});
}

function hexToRgb(hex) {
    var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : null;
}  

function HEXToVBColor(rrggbb) {
    var bbggrr = rrggbb.substr(4, 2) + rrggbb.substr(2, 2) + rrggbb.substr(0, 2);
    return parseInt(bbggrr, 16);
}

function getLuminance(argb) {
    lum= (   77  * ((argb>>16)&255) 
               + 150 * ((argb>>8)&255) 
               + 29  * ((argb)&255))>>8;
    return lum;
}

var lastIndex = -1

function getPixelPlacePos(event) {
    // 1) convert mouse → screen → world
    const { sx, sy } = getCanvasScreenXY(event);
    const { x: wx, y: wy } = screenToWorld(sx, sy);

    // 2) compute grid indices (0..255)
    const gx = Math.floor(wx / CELL);
    const gy = Math.floor(wy / CELL);

        if (gx < 0 || gx >= WORLD_CELLS || gy < 0 || gy >= WORLD_CELLS) {
            if (lastIndex !== -1 && pixelData[lastIndex] !== undefined) {
            const i1 = Math.floor(lastIndex / WORLD_CELLS);
            const j1 = lastIndex % WORLD_CELLS;
            ctx.fillStyle = pixelData[lastIndex];
            ctx.fillRect(i1 * CELL, j1 * CELL, CELL, CELL);
            lastIndex = -1;
        }
        cursorx = -1; cursory = -1;
        return;
    }

    cursorx = gx + 1;
    cursory = gy + 1;

    const index = gx * WORLD_CELLS + gy;

    // 3) restore previously highlighted cell
    if (lastIndex !== index && lastIndex !== -1 && pixelData[lastIndex] !== undefined) {
        const i1 = Math.floor(lastIndex / WORLD_CELLS);
        const j1 = lastIndex % WORLD_CELLS;
        ctx.fillStyle = pixelData[lastIndex];
        ctx.fillRect(i1 * CELL, j1 * CELL, CELL, CELL);
    }

    // 4) draw hover outline on the new cell
    if (pixelData[index] === undefined) {
        lastIndex = index;
        return;
    }

    const x = cursorx;
    const y = cursory;

    const lum = getLuminance(HEXToVBColor(pixelData[index]));
    ctx.lineWidth = 2;
    ctx.strokeStyle = lum < 20 ? 'white' : 'black';

    ctx.beginPath();
    ctx.moveTo((x * CELL) - 1, (y * CELL) - 1);
    ctx.lineTo(x * CELL - 1, (y - 1) * CELL  + 1);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(x * CELL - 1, (y - 1) * CELL + 1);
    ctx.lineTo((x - 1) * CELL + 1, (y - 1) * CELL + 1);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo((x - 1) * CELL + 1, (y - 1) * CELL + 1);
    ctx.lineTo((x - 1) * CELL + 1, y * CELL - 1);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo((x - 1) * CELL + 1, y * CELL - 1);
    ctx.lineTo(x * CELL - 1, y * CELL - 1);
    ctx.stroke();

    lastIndex = index;
}

function exitPixelCanvas() {
    if (lastIndex !== -1 && pixelData[lastIndex] !== undefined) {
    ctx.fillStyle = pixelData[lastIndex];
    ctx.fillRect((Math.floor(lastIndex / WORLD_CELLS)) * CELL, (lastIndex % WORLD_CELLS) * CELL, CELL, CELL);
}
    down = false;
    cursorx = -1;
    cursory = -1;
    clearInterval(holdInterval);
}

var holdInterval
var down = false

function placePixel(event, down1) {
    down = down1
    const index = lastIndex;
    if (index === -1) return;

    if (down == false) {
        clearInterval(holdInterval)
        return
    } else {
        const data = {
            "color": selectedcolor,
            "index": index
        };
        fetch(`${API_BASE}/place`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data),
        })
        .then(response => {
            return response.json();
        })
        .then(json => {
            if (json.status == "success") {
                pixelData[index] = selectedcolor
                knownPixelData[index] = selectedcolor
                ctx.fillStyle = selectedcolor
                var i1 = Math.floor(index / WORLD_CELLS)
                var j1 = index % WORLD_CELLS
                ctx.fillRect(i1 * CELL, j1 * CELL, CELL, CELL);
            } else {

            }
        });
    }

    var last2 = -1

    holdInterval = setInterval(function() {
        index1 = lastIndex
        if (last2 == lastIndex) return
        const data = {
            "color": selectedcolor,
            "index": index1
        };
        fetch(`${API_BASE}/place`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data),
        })
        .then(response => {
            return response.json();
        })
        .then(json => {
            if (json.status == "success") {
                pixelData[index1] = selectedcolor
                knownPixelData[index1] = selectedcolor
                ctx.fillStyle = selectedcolor
                var i1 = Math.floor(index1 / WORLD_CELLS)
                var j1 = index1 % WORLD_CELLS
                ctx.fillRect(i1 * CELL, j1 * CELL, CELL, CELL);
            } else {

            }
        });
        last2 = lastIndex
    }, 5)
}


function hsvToHex(h, s, v) {
    s /= 256;
    v /= 256;

    let c = v * s;
    let x = c * (1 - Math.abs((h / 60) % 2 - 1));
    let m = v - c;

    let r = 0, g = 0, b = 0;

    if (0 <= h && h < 60) {
        r = c; g = x; b = 0;
    } else if (60 <= h && h < 120) {
        r = x; g = c; b = 0;
    } else if (120 <= h && h < 180) {
        r = 0; g = c; b = x;
    } else if (180 <= h && h < 240) {
        r = 0; g = x; b = c;
    } else if (240 <= h && h < 300) {
        r = x; g = 0; b = c;
    } else if (300 <= h && h < 360) {
        r = c; g = 0; b = x;
    }

    r = Math.round((r + m) * 255);
    g = Math.round((g + m) * 255);
    b = Math.round((b + m) * 255);

    return (
        "#" +
        ((1 << 24) | (r << 16) | (g << 8) | b)
            .toString(16)
            .slice(1)
            .toUpperCase()
    );
}

function updateColorPicker(hue) {
    var canvas = document.getElementById("colorpickercanvas").getContext("2d");
    var width = document.getElementById("colorpickercanvas").width
    var height = document.getElementById("colorpickercanvas").height

    canvas.strokeStyle = 'white';

    for (var i = 0; i < 128; i ++) { 
        for (var j = 0; j < 128; j++) {
            canvas.fillStyle = hsvToHex(hue, i * 2, (128-j) * 2)
            canvas.fillRect(i * 20, j * 20, 20, 20);
        }
    }
}

function updateColorPicker2() {
    var canvas = document.getElementById("colorpickercanvas2").getContext("2d");
    var width = document.getElementById("colorpickercanvas2").width
    var height = document.getElementById("colorpickercanvas2").height

    canvas.strokeStyle = 'white';

    for (var i = 0; i < 360; i ++) { 
        for (var j = 0; j < 360; j++) {
            canvas.fillStyle = hsvToHex(i, 256, 256)
            canvas.fillRect((i / 360 * 256) * 10, (j / 360 * 256) * 10, 10, 10);
        }
    }
}

hue = 0
selectedcolor = "#000000"

function selectColorPicker(event) {
    var rect = event.target.getBoundingClientRect();

    var x = Math.round((event.clientX - 2 - (rect.left - 4)) / document.getElementById("colorpickercanvas").clientWidth * 256)
    var y = Math.round((event.clientY - 2 - (rect.bottom - 4)) / document.getElementById("colorpickercanvas").clientHeight * 256) + 256

    selectedcolor = hsvToHex(hue, x, 256-y)

    document.getElementById("selectedcolor").style.backgroundColor = selectedcolor
    document.getElementById("colorbox").style.marginLeft = "calc(" + (x / 256 * 96) + "% - 0.1vw)"
    document.getElementById("colorbox").style.marginTop = "calc(-" + ((256-y) / 256 * 96) + "% - 0.4vw)"

}

async function getHuePickerPos(event) {
    var rect = event.target.getBoundingClientRect();

    var x = Math.round((event.clientX - 2 - (rect.left - 4)) / document.getElementById("colorpickercanvas2").clientWidth * 254)

    document.getElementById("huebar").style.marginLeft = (x/256 * 98) - 1 +  "%"

    hue = (x / 256 * 360) - 4

    await delay(100).then(() => {})
    updateColorPicker(hue)
}

updateColorPicker(hue)
updateColorPicker2()

// ===== ZOOM: wheel (cursor-centric) =====
canvasEl.addEventListener('wheel', (e) => {
  e.preventDefault();

  const zoomIntensity = 1.1;
  const { sx, sy } = getCanvasScreenXY(e);
  const pre = screenToWorld(sx, sy);

  const direction = e.deltaY > 0 ? -1 : 1;
  const factor = direction > 0 ? zoomIntensity : 1 / zoomIntensity;

  const newScale = clamp(scale * factor, MIN_SCALE, MAX_SCALE);
  if (newScale === scale) return;
  scale = newScale;

  const post = worldToScreen(pre.x, pre.y);
  offsetX += sx - post.x;
  offsetY += sy - post.y;

  updateZoomLabel();
  drawPixel();
}, { passive: false });

// ===== PAN: right-drag or modifier+left-drag =====
canvasEl.addEventListener('mousedown', (e) => {
  const isRight = e.button === 2;
  const isModLeft = e.button === 0 && (e.ctrlKey || e.metaKey || e.shiftKey || e.altKey);
  if (isRight || isModLeft) {
    isPanning = true;
    panStartX = e.clientX;
    panStartY = e.clientY;
    viewStartX = offsetX;
    viewStartY = offsetY;
  }
});

window.addEventListener('mousemove', (e) => {
  if (!isPanning) return;
  offsetX = viewStartX + (e.clientX - panStartX);
  offsetY = viewStartY + (e.clientY - panStartY);
  drawPixel();
});

window.addEventListener('mouseup', () => { isPanning = false; });

canvasEl.addEventListener('contextmenu', (e) => e.preventDefault());

function zoomAtScreenPoint(factor, sx, sy) {
  const pre = screenToWorld(sx, sy);
  scale = clamp(scale * factor, MIN_SCALE, MAX_SCALE);
  const post = worldToScreen(pre.x, pre.y);
  offsetX += sx - post.x;
  offsetY += sy - post.y;
  updateZoomLabel();
  drawPixel();
}
document.getElementById('zoomIn')?.addEventListener('click', () => {
  const r = canvasEl.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  zoomAtScreenPoint(1.2, (r.width * dpr) / 2, (r.height * dpr) / 2);
});
document.getElementById('zoomOut')?.addEventListener('click', () => {
  const r = canvasEl.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  zoomAtScreenPoint(1/1.2, (r.width * dpr) / 2, (r.height * dpr) / 2);
});
document.getElementById('resetView')?.addEventListener('click', () => {
  centerToFit();
});

function resizeCanvasToDisplaySize() {
  const dpr = window.devicePixelRatio || 1;
  const cssW = canvasEl.clientWidth;
  const cssH = canvasEl.clientHeight;
  const needResize = canvasEl.width !== Math.floor(cssW * dpr) || canvasEl.height !== Math.floor(cssH * dpr);
  if (needResize) {
  canvasEl.width = Math.floor(cssW * dpr);
  canvasEl.height = Math.floor(cssH * dpr);
  ctx.imageSmoothingEnabled = false;
}
}
window.addEventListener('resize', () => {
  resizeCanvasToDisplaySize();
  centerToFit();
});
resizeCanvasToDisplaySize();
centerToFit();


setInterval(function() {
  updateColorPicker(hue)
  updateColorPicker2()
  keepAlive()
}, 1000)

setInterval(syncCanvasFromServer, 1000);

syncCanvasFromServer();