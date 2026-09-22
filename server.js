// Widerstandsbarometer — Systemisches Konsensieren, Mehrgeräte-Version
// Einfacher Express-Server: dient das Frontend aus /public aus und stellt
// eine kleine REST-API bereit. Daten liegen in data/boards.json (Datei-DB) -
// ausreichend für Workshop-Größenordnungen, kein externer Dienst nötig.

const express = require("express");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_DIR = path.join(__dirname, "data");
const DATA_FILE = path.join(DATA_DIR, "boards.json");
const STATUS_QUO_LABEL = "Null-Lösung / Status Quo";

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// Schöne, sprechende URLs für Admin- und Teilnehmer-Seite
app.get("/admin/:id", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "admin.html"));
});
app.get("/vote/:id", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "vote.html"));
});

// ---------- Persistenz ----------
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

let boards = {};
try {
  if (fs.existsSync(DATA_FILE)) {
    boards = JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
  }
} catch (e) {
  console.error("Konnte boards.json nicht laden, starte leer:", e.message);
  boards = {};
}

let saveScheduled = false;
function saveBoards() {
  if (saveScheduled) return;
  saveScheduled = true;
  setTimeout(() => {
    saveScheduled = false;
    try {
      fs.writeFileSync(DATA_FILE, JSON.stringify(boards, null, 2));
    } catch (e) {
      console.error("Konnte boards.json nicht schreiben:", e.message);
    }
  }, 150);
}

// ---------- Helfer ----------
function genId(bytes) {
  return crypto.randomBytes(bytes).toString("base64url");
}

function publicOption(opt) {
  return { id: opt.id, name: opt.name, isNull: !!opt.isNull };
}

function computeResults(board) {
  const ballots = Object.values(board.votes); // [{optionId: score, ...}, ...]
  const rows = board.options.map((opt) => {
    const scores = ballots
      .map((b) => b[opt.id])
      .filter((v) => typeof v === "number");
    const sum = scores.reduce((a, b) => a + b, 0);
    const avg = scores.length ? sum / scores.length : 0;
    return { id: opt.id, name: opt.name, isNull: !!opt.isNull, sum, avg, count: scores.length };
  });
  rows.sort((a, b) => (a.avg !== b.avg ? a.avg - b.avg : a.sum - b.sum));
  return { rows, voterCount: ballots.length };
}

function publicBoardView(board, { includeResults }) {
  const view = {
    id: board.id,
    question: board.question,
    options: board.options.map(publicOption),
    status: board.status, // 'voting' | 'results'
    voterCount: Object.keys(board.votes).length,
    createdAt: board.createdAt
  };
  if (includeResults) {
    view.results = computeResults(board);
  }
  return view;
}

function requireAdmin(req, res, board) {
  const token = req.query.token || (req.body && req.body.token);
  if (!token || token !== board.adminToken) {
    res.status(403).json({ error: "Ungültiger oder fehlender Admin-Token." });
    return false;
  }
  return true;
}

// ---------- API ----------

// Neue Abstimmung anlegen
app.post("/api/boards", (req, res) => {
  const question = (req.body.question || "").trim();
  let optionNames = Array.isArray(req.body.options) ? req.body.options : [];
  optionNames = optionNames.map((n) => String(n || "").trim()).filter(Boolean);

  if (!question) {
    return res.status(400).json({ error: "Bitte eine Fragestellung angeben." });
  }
  if (optionNames.length < 1) {
    return res.status(400).json({ error: "Bitte mindestens eine Lösungsoption angeben." });
  }

  const id = genId(6);
  const adminToken = genId(18);

  const options = optionNames.map((name) => ({ id: genId(4), name, isNull: false }));
  options.push({ id: genId(4), name: STATUS_QUO_LABEL, isNull: true });

  const board = {
    id,
    adminToken,
    question,
    options,
    status: "voting",
    votes: {}, // voterId -> { optionId: score }
    createdAt: new Date().toISOString()
  };

  boards[id] = board;
  saveBoards();

  res.json({ id, adminToken });
});

// Öffentliche/Admin-Ansicht eines Boards
app.get("/api/boards/:id", (req, res) => {
  const board = boards[req.params.id];
  if (!board) return res.status(404).json({ error: "Abstimmung nicht gefunden." });

  const isAdmin = req.query.token && req.query.token === board.adminToken;
  const includeResults = isAdmin || board.status === "results";
  const view = publicBoardView(board, { includeResults });
  view.isAdmin = !!isAdmin;
  res.json(view);
});

// Stimme abgeben (jede:r mit Link, kein Admin-Token nötig)
app.post("/api/boards/:id/vote", (req, res) => {
  const board = boards[req.params.id];
  if (!board) return res.status(404).json({ error: "Abstimmung nicht gefunden." });
  if (board.status !== "voting") {
    return res.status(409).json({ error: "Die Abstimmung ist bereits beendet." });
  }

  const voterId = req.get("X-Voter-Id");
  if (!voterId || typeof voterId !== "string" || voterId.length > 100) {
    return res.status(400).json({ error: "Fehlende Voter-Kennung." });
  }

  const scores = req.body.scores || {};
  const validIds = new Set(board.options.map((o) => o.id));
  const ballot = {};
  for (const opt of board.options) {
    const v = scores[opt.id];
    if (typeof v !== "number" || !Number.isFinite(v) || v < 0 || v > 10) {
      return res.status(400).json({ error: "Ungültiger Wert für Option: " + opt.name });
    }
    ballot[opt.id] = Math.round(v);
  }
  for (const key of Object.keys(scores)) {
    if (!validIds.has(key)) {
      return res.status(400).json({ error: "Unbekannte Option in Stimme." });
    }
  }

  board.votes[voterId] = ballot;
  saveBoards();

  res.json({ ok: true, voterCount: Object.keys(board.votes).length });
});

// Admin-Aktionen: Abstimmung beenden / wieder öffnen / zurücksetzen
app.post("/api/boards/:id/admin/:action", (req, res) => {
  const board = boards[req.params.id];
  if (!board) return res.status(404).json({ error: "Abstimmung nicht gefunden." });
  if (!requireAdmin(req, res, board)) return;

  const action = req.params.action;
  if (action === "finish") {
    board.status = "results";
  } else if (action === "reopen") {
    board.status = "voting";
  } else if (action === "reset") {
    board.votes = {};
    board.status = "voting";
  } else {
    return res.status(400).json({ error: "Unbekannte Aktion." });
  }

  saveBoards();
  res.json(publicBoardView(board, { includeResults: true }));
});

// Board löschen (nur Admin)
app.delete("/api/boards/:id", (req, res) => {
  const board = boards[req.params.id];
  if (!board) return res.status(404).json({ error: "Abstimmung nicht gefunden." });
  if (!requireAdmin(req, res, board)) return;
  delete boards[req.params.id];
  saveBoards();
  res.json({ ok: true });
});

app.listen(PORT, () => {
  console.log(`Widerstandsbarometer läuft auf Port ${PORT}`);
});
