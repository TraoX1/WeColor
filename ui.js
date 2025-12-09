//const API_BASE = '';

// Color selection + Saved colors

function setColor(hex) {
  window.selectedcolor = hex;
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

function updateHoverCoords(x0, y0) {
  var el = document.getElementById('coords');
  if (!el) return;
  if (x0 == null || y0 == null) el.textContent = "Hover: –";
  else el.textContent = "Hover: (" + x0 + ", " + y0 + ")";
}

// Auth / user state / admin UI controls
let currentUser = null;
window.currentUser = null;

function setCurrentUser(user) {
  currentUser = user;
  window.currentUser = user;
  updateUserUI();
}

async function fetchCurrentUser() {
  try {
    const res = await fetch(`${API_BASE}/api/me`);
    if (!res.ok) {
      setCurrentUser(null);
      return;
    }
    const data = await res.json();
    setCurrentUser(data.user);
  } catch (e) {
    setCurrentUser(null);
  }
}

function updateUserUI() {
  const display = document.getElementById('currentUserDisplay');
  const logoutBtn = document.getElementById('logoutBtn');
  const loginModal = document.getElementById('loginModal');
  const clearBtn = document.getElementById('clearCanvasBtn');

  if (currentUser) {
    if (display) display.textContent = `Logged in as ${currentUser.username}`;
    if (logoutBtn) logoutBtn.style.display = 'inline-block';
    if (loginModal) loginModal.style.display = 'none';

    if (clearBtn) {
      clearBtn.style.display = currentUser.isAdmin ? 'inline-block' : 'none';
    }
  } else {
    if (display) display.textContent = '';
    if (logoutBtn) logoutBtn.style.display = 'none';
    if (clearBtn) clearBtn.style.display = 'none';
    if (loginModal) loginModal.style.display = 'flex';
  }
}

function setupAuthForms() {
  const loginForm = document.getElementById('loginForm');
  const registerForm = document.getElementById('registerForm');
  const loginError = document.getElementById('loginError');
  const registerError = document.getElementById('registerError');
  const showRegisterBtn = document.getElementById('showRegister');
  const showLoginBtn = document.getElementById('showLogin');
  const logoutBtn = document.getElementById('logoutBtn');

  if (!loginForm || !registerForm) return;

  if (showRegisterBtn) {
    showRegisterBtn.addEventListener('click', () => {
      loginForm.style.display = 'none';
      registerForm.style.display = 'block';
      if (loginError) loginError.textContent = '';
    });
  }

  if (showLoginBtn) {
    showLoginBtn.addEventListener('click', () => {
      registerForm.style.display = 'none';
      loginForm.style.display = 'block';
      if (registerError) registerError.textContent = '';
    });
  }

  loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (loginError) loginError.textContent = '';

  const username = document.getElementById('loginUsername').value.trim();
  const password = document.getElementById('loginPassword').value.trim();

  try {
    const res = await fetch(`${API_BASE}/api/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify({ username, password })
    });

    const data = await res.json();
    if (!res.ok) {
      if (loginError) loginError.textContent = data.error || 'Login failed';
      return;
    }

    setCurrentUser({
      username: data.username,
      isAdmin: data.isAdmin,
      pixelsPlaced: data.pixelsPlaced || 0
    });

    loadTopContributors();
  } catch (err) {
    if (loginError) loginError.textContent = 'Login failed';
  }
});

  registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (registerError) registerError.textContent = '';

    const username = document.getElementById('registerUsername').value.trim();
    const password = document.getElementById('registerPassword').value.trim();

    try {
      const res = await fetch(`${API_BASE}/api/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ username, password })
      });

      const data = await res.json();
      if (!res.ok) {
        if (registerError) registerError.textContent = data.error || 'Could not register';
        return;
      }

      registerForm.style.display = 'none';
      loginForm.style.display = 'block';
    } catch (err) {
      if (registerError) registerError.textContent = 'Could not register';
    }
  });

  if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
      try {
        await fetch(`${API_BASE}/api/logout`, {
          method: 'POST',
          credentials: 'same-origin'
        });
      } catch (e) {}
      setCurrentUser(null);
    });
  }
}

function setupAdminControls() {
  const clearBtn = document.getElementById('clearCanvasBtn');
  if (!clearBtn) return;

  clearBtn.addEventListener('click', async () => {
    const ok = window.confirm('Are you sure you want to clear the entire canvas for everyone?');
    if (!ok) return;

    try {
      const res = await fetch(`${API_BASE}/api/admin/clear-canvas`, {
        method: 'POST',
        credentials: 'same-origin'
      });

      if (res.ok) {
        if (typeof window.fetchAndRenderBoard === 'function') {
          window.fetchAndRenderBoard();
        }
        loadTopContributors();
      } else {
        alert('Could not clear the canvas.');
      }
    } catch (e) {
      alert('Could not clear the canvas.');
    }
  });
}

// Top Contributors (stats UI)
function setupTopContributors() {
  loadTopContributors();
  setInterval(loadTopContributors, 15000);
}

async function loadTopContributors() {
  const list = document.getElementById('topContributorsList');
  if (!list) return;

  try {
    const res = await fetch(`${API_BASE}/api/top-contributors`, { credentials: 'same-origin' });
    if (!res.ok) {
      list.innerHTML = '';
      return;
    }
    const data = await res.json();
    const contributors = data.contributors || [];

    list.innerHTML = '';
    contributors.forEach((c, index) => {
      const li = document.createElement('li');
      li.textContent = `${index + 1}. ${c.username} – ${c.pixelsPlaced} pixels`;
      if (c.isMe) {
        li.style.fontWeight = '700';
      }
      list.appendChild(li);
    });
  } catch (e) {
  }
}

// Timelapse controls (playback UI)
function setupTimelapse() {
  const btn = document.getElementById('playTimelapseBtn');
  if (!btn) return;

  btn.addEventListener('click', playTimelapse);
}

async function playTimelapse() {
  try {
    const res = await fetch(`${API_BASE}/api/timelapse`, { credentials: 'same-origin' });
    if (!res.ok) {
      alert('Could not load timelapse.');
      return;
    }

    const data = await res.json();
    const moves = data.moves || [];
    if (!moves.length) {
      alert('No pixel history to replay yet.');
      return;
    }

    if (typeof window.clearCanvasOnClient === 'function') {
      window.clearCanvasOnClient();
    }

    let i = 0;
    const speed = 5;

    function step() {
      if (i >= moves.length) {
        if (typeof window.fetchAndRenderBoard === 'function') {
          window.fetchAndRenderBoard();
        }
        return;
      }

      const m = moves[i];
      if (typeof window.drawPixelOnClient === 'function') {
        if (typeof m.index === 'number') {
          window.drawPixelOnClient(m.index, m.color);
        } else if (typeof m.x === 'number' && typeof m.y === 'number') {
          const index = m.x * 256 + m.y;
          window.drawPixelOnClient(index, m.color);
        }
      }

      i += 1;
      setTimeout(step, speed);
    }

    step();
  } catch (e) {
    alert('Could not load timelapse.');
  }
}

// Init
function initUI() {
  loadSavedColors();
  fetchCurrentUser();
  setupAuthForms();
  setupAdminControls();
  setupTopContributors();
  setupTimelapse();
}

// Expose
window.WeColorUI = {
  initUI,
  updateHoverCoords,
  setColor,
  saveCurrentColor
};
