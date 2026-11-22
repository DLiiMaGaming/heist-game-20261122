// CRIMSON VAULT — level.js
// One job: turn a wing's hand-drawn map into a grid the game can query
// (walkable? blocks sight? is it shadow?) and prove the level is solvable.
"use strict";

// Tiles that stop movement.
const SOLID = new Set(["#", "~", "T", "V"]);
// Tiles that stop a line of sight (walls, tables, fountains, closed vault).
const OPAQUE = new Set(["#", "~", "T", "V"]);
// Tiles that halve how fast a guard spots you.
const SHADOW_TILES = new Set([","]);
// Tiles that count as floor for movement purposes.
const WALKABLE = new Set([".", ",", "=", "+", "P", "G", "C", "X", "L", "S", "K", "D", "E", "V"]);

// Build the level object for one wing definition from config.js.
function buildLevel(wing) {
  const grid = wing.map.map((row) => row.split(""));
  const level = {
    wing,
    grid,
    playerStart: null,
    exit: null,
    vaultDoor: null,
    guardSpawns: [],
    cameraSpawns: [],
    panels: [],
    loot: [],
    safes: [],
    keycard: null,
    diamond: null,
  };
  let lootIndex = 0;
  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      const ch = grid[y][x];
      if (ch === "P") level.playerStart = { x, y };
      else if (ch === "E") level.exit = { x, y };
      else if (ch === "V") level.vaultDoor = { x, y };
      else if (ch === "G") level.guardSpawns.push({ x, y });
      else if (ch === "C") level.cameraSpawns.push({ x, y });
      else if (ch === "X") level.panels.push({ x, y, disabled: false });
      else if (ch === "K") level.keycard = { x, y, taken: false };
      else if (ch === "D") level.diamond = { x, y, taken: false };
      else if (ch === "L") {
        level.loot.push({
          x,
          y,
          taken: false,
          value: TUNING.lootPainting,
          name: LOOT_NAMES[lootIndex++ % LOOT_NAMES.length],
        });
      } else if (ch === "S") {
        level.safes.push({ x, y, taken: false, value: TUNING.lootSafe, progress: 0 });
      }
    }
  }
  return level;
}

function inBounds(x, y) {
  return x >= 0 && y >= 0 && x < COLS && y < ROWS;
}

function tileAt(level, x, y) {
  if (!inBounds(x, y)) return "#";
  return level.grid[y][x];
}

function isSolid(level, x, y) {
  return SOLID.has(tileAt(level, x, y));
}

function blocksSight(level, x, y) {
  return OPAQUE.has(tileAt(level, x, y));
}

function isShadow(level, x, y) {
  return SHADOW_TILES.has(tileAt(level, x, y));
}

// A circle (the thief, a guard) may stand at pixel position px,py when the
// four tiles its radius touches are all walkable.
function circleFits(level, px, py, radius) {
  const pts = [
    [px - radius, py - radius],
    [px + radius, py - radius],
    [px - radius, py + radius],
    [px + radius, py + radius],
  ];
  for (const [x, y] of pts) {
    const tx = Math.floor(x / TILE);
    const ty = Math.floor(y / TILE);
    if (isSolid(level, tx, ty)) return false;
  }
  return true;
}

// Bresenham line of sight between two tile centres, in tile space.
function hasLineOfSight(level, x0, y0, x1, y1) {
  let dx = Math.abs(x1 - x0);
  let dy = Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1;
  const sy = y0 < y1 ? 1 : -1;
  let err = dx - dy;
  let x = x0;
  let y = y0;
  for (let guard = 0; guard < 200; guard++) {
    if (x === x1 && y === y1) return true;
    if (!(x === x0 && y === y0) && blocksSight(level, x, y)) return false;
    const e2 = 2 * err;
    if (e2 > -dy) {
      err -= dy;
      x += sx;
    }
    if (e2 < dx) {
      err += dx;
      y += sy;
    }
  }
  return false;
}

function angleDifference(a, b) {
  let d = a - b;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
}

// Is tile (tx,ty) inside a vision cone from (ox,oy) facing `angle`?
function insideCone(level, ox, oy, angle, range, halfAngle, tx, ty) {
  const dx = tx - ox;
  const dy = ty - oy;
  const dist = Math.hypot(dx, dy);
  if (dist > range) return false;
  if (dist < 0.6) return true;
  const targetAngle = Math.atan2(dy, dx);
  if (Math.abs(angleDifference(targetAngle, angle)) > halfAngle) return false;
  return hasLineOfSight(level, Math.floor(ox), Math.floor(oy), tx, ty);
}

// Flood fill from the player start over walkable tiles. Returns the set of
// reached "x,y" keys. Doors, loot, keycards and the exit must all be reached
// for a wing to be solvable; the vault door counts as a wall here, so the
// diamond tile itself is checked separately through the door's neighbour.
function floodReachable(level) {
  const start = level.playerStart;
  const seen = new Set();
  if (!start) return seen;
  const queue = [[start.x, start.y]];
  seen.add(start.x + "," + start.y);
  while (queue.length) {
    const [x, y] = queue.pop();
    for (const [nx, ny] of [[x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]]) {
      if (!inBounds(nx, ny) || seen.has(nx + "," + ny)) continue;
      if (!WALKABLE.has(tileAt(level, nx, ny))) continue;
      seen.add(nx + "," + ny);
      queue.push([nx, ny]);
    }
  }
  return seen;
}

// Validate one wing: row lengths, legend, counts, reachability.
// Returns an array of problem strings (empty = the wing is sound).
function validateWing(wing) {
  const problems = [];
  if (wing.map.length !== ROWS) {
    problems.push(wing.id + ": " + wing.map.length + " rows, expected " + ROWS);
  }
  wing.map.forEach((row, i) => {
    if (row.length !== COLS) {
      problems.push(wing.id + " row " + i + ": length " + row.length + ", expected " + COLS);
    }
    for (const ch of row) {
      if (!LEGEND.includes(ch)) problems.push(wing.id + " row " + i + ": bad char '" + ch + "'");
    }
  });
  const level = buildLevel(wing);
  if (!level.playerStart) problems.push(wing.id + ": no player start P");
  if (!level.exit) problems.push(wing.id + ": no exit E");
  if (level.guardSpawns.length !== wing.guards.length) {
    problems.push(
      wing.id + ": " + level.guardSpawns.length + " G spawns but " + wing.guards.length + " guard defs"
    );
  }
  if (level.cameraSpawns.length !== wing.cameras.length) {
    problems.push(
      wing.id + ": " + level.cameraSpawns.length + " C spawns but " + wing.cameras.length + " camera defs"
    );
  }
  const reached = floodReachable(level);
  const need = (label, obj) => {
    if (obj && !reached.has(obj.x + "," + obj.y)) problems.push(wing.id + ": " + label + " unreachable");
  };
  need("exit", level.exit);
  need("keycard", level.keycard);
  for (const l of level.loot) need("loot at " + l.x + "," + l.y, l);
  for (const s of level.safes) need("safe at " + s.x + "," + s.y, s);
  for (const p of level.panels) need("panel at " + p.x + "," + p.y, p);
  for (const g of level.guardSpawns) need("guard spawn " + g.x + "," + g.y, g);
  if (level.diamond) {
    // The diamond sits behind the vault door: at least one neighbour must
    // be reachable, and the vault door itself must border the open hall.
    const near = [
      [level.diamond.x + 1, level.diamond.y],
      [level.diamond.x - 1, level.diamond.y],
      [level.diamond.x, level.diamond.y + 1],
      [level.diamond.x, level.diamond.y - 1],
    ].some(([x, y]) => reached.has(x + "," + y));
    if (!near) problems.push(wing.id + ": diamond has no reachable neighbour");
  }
  if (level.vaultDoor) {
    const near = [
      [level.vaultDoor.x + 1, level.vaultDoor.y],
      [level.vaultDoor.x - 1, level.vaultDoor.y],
      [level.vaultDoor.x, level.vaultDoor.y + 1],
      [level.vaultDoor.x, level.vaultDoor.y - 1],
    ].some(([x, y]) => reached.has(x + "," + y));
    if (!near) problems.push(wing.id + ": vault door has no reachable neighbour");
  }
  return problems;
}
