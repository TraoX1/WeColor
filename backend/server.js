const express = require('express');
const fs = require('fs');
const path = require('path');
const cookieParser = require('cookie-parser');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares
app.use(cors({
  origin: '*',
  methods: ['GET','POST'],
}));
app.use(express.json());
app.use(cookieParser());

// Canvas size (must match frontend)
const WORLD_CELLS = 256;

//USER STORAGE (for login, admin, contributors)
const usersPath = path.join(__dirname, 'data', 'users.json');

function ensureUsersFile() {
  if (!fs.existsSync(usersPath)) {
    const seed = [
      {
        id: '1',
        username: 'admin',
        password: 'admin123', // CHANGE THIS LATER
        isAdmin: true,
        pixelsPlaced: 0
      }
    ];
    fs.mkdirSync(path.dirname(usersPath), { recursive: true });
    fs.writeFileSync(usersPath, JSON.stringify(seed, null, 2), 'utf-8');
  }
}

function loadUsers() {
  ensureUsersFile();
  const raw = fs.readFileSync(usersPath, 'utf-8');
  return JSON.parse(raw);
}

function saveUsers(users) {
  fs.writeFileSync(usersPath, JSON.stringify(users, null, 2), 'utf-8');
}

function findUserById(id) {
  const users = loadUsers();
  return users.find(u => u.id === id);
}

function findUserByUsername(username) {
  const users = loadUsers();
  return users.find(u => u.username === username);
}

function generateUserId() {
  return Date.now().toString() + Math.floor(Math.random() * 1000);
}

// MOVE STORAGE (for timelapse)
const movesPath = path.join(__dirname, 'data', 'moves.json');

function ensureMovesFile() {
  if (!fs.existsSync(movesPath)) {
    fs.mkdirSync(path.dirname(movesPath), { recursive: true });
    fs.writeFileSync(movesPath, '[]', 'utf-8');
  }
}

function loadMoves() {
  ensureMovesFile();
  const raw = fs.readFileSync(movesPath, 'utf-8');
  return JSON.parse(raw);
}

function saveMoves(moves) {
  fs.writeFileSync(movesPath, JSON.stringify(moves, null, 2), 'utf-8');
}

function logMove(move) {
  const moves = loadMoves();
  moves.push(move);
  saveMoves(moves);
}

function clearMoveHistory() {
  saveMoves([]);
}

function resetAllPixelCounts() {
  const users = loadUsers();
  users.forEach(u => (u.pixelsPlaced = 0));
  saveUsers(users);
}

//CANVAS STORAGE
const canvasPath = path.join(__dirname, 'data', 'canvas.json');

function ensureCanvasFile() {
  if (!fs.existsSync(canvasPath)) {
    fs.mkdirSync(path.dirname(canvasPath), { recursive: true });
    const blank = Array(WORLD_CELLS * WORLD_CELLS).fill('#ffffff');
    fs.writeFileSync(canvasPath, JSON.stringify(blank), 'utf-8');
  }
}

function loadCanvas() {
  ensureCanvasFile();
  const raw = fs.readFileSync(canvasPath, 'utf-8');
  return JSON.parse(raw);
}

function saveCanvas(canvas) {
  fs.writeFileSync(canvasPath, JSON.stringify(canvas), 'utf-8');
}

function clearCanvas() {
  const blank = Array(WORLD_CELLS * WORLD_CELLS).fill('#ffffff');
  saveCanvas(blank);
}

// ===== AUTH MIDDLEWARE =====
function authMiddleware(req, res, next) {
  const userId = req.cookies.userId;
  if (!userId) {
    req.user = null;
    return next();
  }
  const user = findUserById(userId);
  req.user = user || null;
  next();
}

app.use(authMiddleware);

//AUTH ROUTES

// Register a new user
app.post('/api/register', (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Missing username or password' });
  }

  const existing = findUserByUsername(username);
  if (existing) {
    return res.status(400).json({ error: 'Username already taken' });
  }

  const users = loadUsers();
  const newUser = {
    id: generateUserId(),
    username,
    password,
    isAdmin: false,
    pixelsPlaced: 0
  };

  users.push(newUser);
  saveUsers(users);

  return res.status(201).json({ success: true });
});

// Log in
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Missing username or password' });
  }

  const user = findUserByUsername(username);
  if (!user || user.password !== password) {
    return res.status(401).json({ error: 'Invalid username or password' });
  }

  // Set cookie so the browser stays logged in
  res.cookie('userId', user.id, {
    httpOnly: true
  });

  return res.json({
    username: user.username,
    isAdmin: user.isAdmin,
    pixelsPlaced: user.pixelsPlaced || 0
  });
});

// Get current logged-in user
app.get('/api/me', (req, res) => {
  if (!req.user) {
    return res.json({ user: null });
  }

  const { id, username, isAdmin, pixelsPlaced } = req.user;
  return res.json({
    user: { id, username, isAdmin, pixelsPlaced: pixelsPlaced || 0 }
  });
});

// Log out
app.post('/api/logout', (req, res) => {
  res.clearCookie('userId');
  return res.json({ success: true });
});

//CANVAS + GAME ROUTES

app.post('/getcanvas', (req, res) => {
  try {
    const canvas = loadCanvas();
    return res.json({
      status: 'success',
      canvas
    });
  } catch (e) {
    console.error('Error in /getcanvas', e);
    return res.status(500).json({ status: 'error' });
  }
});

// Place a pixel (temporarily allow without login)
app.post('/place', (req, res) => {
  const { color, index } = req.body;

  // Basic validation
  if (typeof color !== 'string' || typeof index !== 'number') {
    return res.status(400).json({
      status: 'error',
      error: 'Invalid payload'
    });
  }

  if (index < 0 || index >= WORLD_CELLS * WORLD_CELLS) {
    return res.status(400).json({
      status: 'error',
      error: 'Index out of range'
    });
  }

  try {
    // 1) Update canvas
    const canvas = loadCanvas();
    canvas[index] = color;
    saveCanvas(canvas);

    // 2) If logged in, increment user pixel count
    const user = req.user;
    if (user) {
      const users = loadUsers();
      const idx = users.findIndex(u => u.id === user.id);
      if (idx !== -1) {
        if (typeof users[idx].pixelsPlaced !== 'number') {
          users[idx].pixelsPlaced = 0;
        }
        users[idx].pixelsPlaced += 1;
        saveUsers(users);
      }
    }

    // 3) Log move for timelapse (userId can be null)
    logMove({
      index,
      color,
      userId: user ? user.id : null,
      timestamp: Date.now()
    });

    return res.json({ status: 'success' });
  } catch (e) {
    console.error('Error in /place', e);
    return res.status(500).json({ status: 'error' });
  }
});

app.post('/alive', (req, res) => {
  const tokens = 999;
  const online = 1;
  return res.json({
    status: 'success',
    tokens,
    online
  });
});

//STATS: TOP CONTRIBUTORS
app.get('/api/top-contributors', (req, res) => {
  try {
    const users = loadUsers();
    const meId = req.user ? req.user.id : null;

    const contributors = users
      .map(u => ({
        username: u.username,
        pixelsPlaced: typeof u.pixelsPlaced === 'number' ? u.pixelsPlaced : 0,
        isMe: meId && u.id === meId
      }))
      .sort((a, b) => b.pixelsPlaced - a.pixelsPlaced)
      .slice(0, 20);

    return res.json({ contributors });
  } catch (e) {
    console.error('Error in /api/top-contributors', e);
    return res.status(500).json({ contributors: [] });
  }
});

//ADMIN: CLEAR CANVAS
app.post('/api/admin/clear-canvas', (req, res) => {
  if (!req.user || !req.user.isAdmin) {
    return res.status(403).json({ error: 'Not allowed' });
  }

  try {
    clearCanvas();
    clearMoveHistory();
    resetAllPixelCounts();

    return res.json({ success: true });
  } catch (e) {
    console.error('Error in /api/admin/clear-canvas', e);
    return res.status(500).json({ error: 'Failed to clear canvas' });
  }
});

// TIMELAPSE: RETURN MOVE HISTORY
app.get('/api/timelapse', (req, res) => {
  try {
    let moves = loadMoves();

    const MAX_MOVES = 5000;
    if (moves.length > MAX_MOVES) {
      moves = moves.slice(moves.length - MAX_MOVES);
    }

    return res.json({ moves });
  } catch (e) {
    console.error('Error in /api/timelapse', e);
    return res.status(500).json({ moves: [] });
  }
});


app.listen(PORT, () => {
  console.log(`WeColor backend running on port ${PORT}`);
});
