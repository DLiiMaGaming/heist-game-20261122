// CRIMSON VAULT — render.js
// One job: everything the eye sees — the room, the vision cones clipped
// by walls, the thief, the guards, the loot, the dense HUD, the minimap,
// and every screen (title, briefing, paused, caught, win).
"use strict";

// Cast one ray from (ox,oy) at `angle` until it hits an opaque tile or the
// range runs out; returns the hit point in pixels.
function castRay(level, ox, oy, angle, range) {
  const step = 6;
  let x = ox;
  let y = oy;
  for (let d = 0; d < range; d += step) {
    x = ox + Math.cos(angle) * d;
    y = oy + Math.sin(angle) * d;
    if (blocksSight(level, Math.floor(x / TILE), Math.floor(y / TILE))) return { x, y };
  }
  return { x: ox + Math.cos(angle) * range, y: oy + Math.sin(angle) * range };
}

// The cone polygon: fan of rays across the cone, each clipped by walls.
function conePolygon(level, ox, oy, angle, range, halfAngle) {
  const pts = [{ x: ox, y: oy }];
  const rays = 26;
  for (let i = 0; i <= rays; i++) {
    const a = angle - halfAngle + (2 * halfAngle * i) / rays;
    pts.push(castRay(level, ox, oy, a, range));
  }
  return pts;
}

function drawCone(ctx, level, ox, oy, angle, range, halfAngle, color) {
  const pts = conePolygon(level, ox, oy, angle, range, halfAngle);
  ctx.beginPath();
  ctx.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
}

function drawRoom(ctx, world) {
  const level = world.level;
  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      const ch = level.grid[y][x];
      const px = x * TILE;
      const py = y * TILE;
      if (ch === "#") {
        ctx.fillStyle = "#232a3d";
        ctx.fillRect(px, py, TILE, TILE);
        ctx.fillStyle = "#39415e";
        ctx.fillRect(px, py, TILE, 5);
        ctx.fillStyle = "#171c2b";
        ctx.fillRect(px, py + TILE - 4, TILE, 4);
      } else if (ch === ",") {
        ctx.fillStyle = "#1c2438";
        ctx.fillRect(px, py, TILE, TILE);
        ctx.fillStyle = "#232c44";
        ctx.fillRect(px + 3, py + 3, TILE - 6, TILE - 6);
      } else if (ch === "=") {
        ctx.fillStyle = "#5e1f24";
        ctx.fillRect(px, py, TILE, TILE);
        ctx.fillStyle = "#7a2a30";
        ctx.fillRect(px + 4, py, TILE - 8, TILE);
        ctx.fillStyle = "#c9a227";
        ctx.fillRect(px, py, 2, TILE);
        ctx.fillRect(px + TILE - 2, py, 2, TILE);
      } else if (ch === "~") {
        ctx.fillStyle = "#0e2a3d";
        ctx.fillRect(px, py, TILE, TILE);
        ctx.fillStyle = "#2a7fa8";
        ctx.beginPath();
        ctx.arc(px + 16, py + 16, 11, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#bfe8ff";
        ctx.beginPath();
        ctx.arc(px + 12, py + 12, 4, 0, Math.PI * 2);
        ctx.fill();
      } else if (ch === "T") {
        ctx.fillStyle = "#2b2f45";
        ctx.fillRect(px, py, TILE, TILE);
        ctx.fillStyle = "#4a3b28";
        ctx.fillRect(px + 3, py + 5, TILE - 6, TILE - 12);
        ctx.fillStyle = "#c9a227";
        ctx.fillRect(px + 5, py + 7, TILE - 10, 3);
      } else {
        // Marble floor with a faint checker.
        ctx.fillStyle = (x + y) % 2 === 0 ? "#3a3f55" : "#353a4e";
        ctx.fillRect(px, py, TILE, TILE);
        ctx.fillStyle = "rgba(255,255,255,0.03)";
        ctx.fillRect(px, py, TILE, 2);
      }
      if (ch === "+") {
        ctx.fillStyle = "#c9a227";
        ctx.fillRect(px, py, TILE, 3);
        ctx.fillRect(px, py + TILE - 3, TILE, 3);
      }
    }
  }
}

function drawLoot(ctx, world) {
  const level = world.level;
  for (const l of level.loot) {
    if (l.taken) continue;
    const cx = (l.x + 0.5) * TILE;
    const cy = (l.y + 0.5) * TILE;
    ctx.fillStyle = "#8a6d1f";
    ctx.fillRect(cx - 11, cy - 13, 22, 26);
    ctx.fillStyle = "#e8c766";
    ctx.fillRect(cx - 9, cy - 11, 18, 22);
    ctx.fillStyle = "#7a4a8a";
    ctx.fillRect(cx - 6, cy - 8, 12, 12);
    ctx.fillStyle = "#fff3b0";
    ctx.font = "bold 9px monospace";
    ctx.textAlign = "center";
    ctx.fillText("$500", cx, cy + 22);
  }
  for (const s of level.safes) {
    if (s.taken) continue;
    const cx = (s.x + 0.5) * TILE;
    const cy = (s.y + 0.5) * TILE;
    ctx.fillStyle = "#1a1d29";
    ctx.fillRect(cx - 13, cy - 13, 26, 26);
    ctx.strokeStyle = "#c9a227";
    ctx.lineWidth = 2;
    ctx.strokeRect(cx - 13, cy - 13, 26, 26);
    ctx.fillStyle = "#e8c766";
    ctx.beginPath();
    ctx.arc(cx, cy, 5, 0, Math.PI * 2);
    ctx.fill();
    if (s.progress > 0) {
      ctx.fillStyle = "#2a2f45";
      ctx.fillRect(cx - 14, cy + 16, 28, 5);
      ctx.fillStyle = "#ffd94a";
      ctx.fillRect(cx - 14, cy + 16, 28 * (s.progress / TUNING.safeCrackSeconds), 5);
    }
    ctx.fillStyle = "#fff3b0";
    ctx.font = "bold 9px monospace";
    ctx.textAlign = "center";
    ctx.fillText("SAFE $1,500", cx, cy + 26);
  }
  if (level.keycard && !level.keycard.taken) {
    const cx = (level.keycard.x + 0.5) * TILE;
    const cy = (level.keycard.y + 0.5) * TILE;
    const pulse = 0.6 + 0.4 * Math.sin(world.time * 4);
    ctx.fillStyle = "rgba(80,200,255," + (0.25 * pulse) + ")";
    ctx.beginPath();
    ctx.arc(cx, cy, 18, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#50c8ff";
    ctx.fillRect(cx - 9, cy - 6, 18, 12);
    ctx.fillStyle = "#06283d";
    ctx.fillRect(cx - 6, cy - 3, 8, 6);
    ctx.fillStyle = "#bfe8ff";
    ctx.font = "bold 8px monospace";
    ctx.textAlign = "center";
    ctx.fillText("KEYCARD", cx, cy - 20);
  }
  if (level.diamond && !level.diamond.taken) {
    const cx = (level.diamond.x + 0.5) * TILE;
    const cy = (level.diamond.y + 0.5) * TILE;
    const pulse = 0.7 + 0.3 * Math.sin(world.time * 5);
    ctx.fillStyle = "rgba(120,240,255," + (0.3 * pulse) + ")";
    ctx.beginPath();
    ctx.arc(cx, cy, 24, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#8ef2ff";
    ctx.beginPath();
    ctx.moveTo(cx, cy - 13);
    ctx.lineTo(cx + 11, cy);
    ctx.lineTo(cx, cy + 13);
    ctx.lineTo(cx - 11, cy);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.moveTo(cx, cy - 13);
    ctx.lineTo(cx + 5, cy);
    ctx.lineTo(cx, cy + 13);
    ctx.lineTo(cx - 5, cy);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#bff6ff";
    ctx.font = "bold 10px monospace";
    ctx.textAlign = "center";
    ctx.fillText("THE MERIDIAN STAR · $10,000", cx, cy - 26);
  }
  if (level.vaultDoor) {
    const vd = level.vaultDoor;
    const cx = (vd.x + 0.5) * TILE;
    const cy = (vd.y + 0.5) * TILE;
    if (!world.vaultOpen) {
      ctx.fillStyle = "#3d4457";
      ctx.fillRect(cx - 16, cy - 16, 32, 32);
      ctx.strokeStyle = world.hasKeycard ? "#50c8ff" : "#ff5a5a";
      ctx.lineWidth = 3;
      ctx.strokeRect(cx - 16, cy - 16, 32, 32);
      ctx.fillStyle = "#e8c766";
      ctx.beginPath();
      ctx.arc(cx, cy, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#fff3b0";
      ctx.font = "bold 9px monospace";
      ctx.textAlign = "center";
      ctx.fillText(world.hasKeycard ? "VAULT — KEYCARD READY" : "VAULT — NEEDS KEYCARD", cx, cy + 26);
    }
  }
  if (level.exit) {
    const ex = level.exit;
    const cx = (ex.x + 0.5) * TILE;
    const cy = (ex.y + 0.5) * TILE;
    const open = world.exitOpen;
    ctx.fillStyle = open ? "#1d5c2e" : "#4a1d1d";
    ctx.fillRect(cx - 16, cy - 16, 32, 32);
    ctx.strokeStyle = open ? "#4be07a" : "#ff5a5a";
    ctx.lineWidth = 3;
    ctx.strokeRect(cx - 16, cy - 16, 32, 32);
    ctx.fillStyle = open ? "#4be07a" : "#ff8a8a";
    ctx.font = "bold 10px monospace";
    ctx.textAlign = "center";
    ctx.fillText(open ? "EXIT ✓" : "LOCKED", cx, cy + 4);
    ctx.font = "bold 8px monospace";
    ctx.fillText(open ? "GETAWAY" : "QUOTA $" + WINGS[world.wingIndex].quota.toLocaleString("en-US"), cx, cy - 22);
  }
  for (const p of level.panels) {
    const cx = (p.x + 0.5) * TILE;
    const cy = (p.y + 0.5) * TILE;
    ctx.fillStyle = "#20263a";
    ctx.fillRect(cx - 8, cy - 10, 16, 20);
    ctx.fillStyle = "#50c8ff";
    ctx.fillRect(cx - 5, cy - 7, 10, 4);
    ctx.fillStyle = "#bfe8ff";
    ctx.font = "bold 8px monospace";
    ctx.textAlign = "center";
    ctx.fillText("PANEL", cx, cy + 20);
  }
}

function drawGuards(ctx, world) {
  for (const g of world.guards) {
    const range = TUNING.guardConeRange * TILE;
    const color =
      g.state === GUARD_CHASE
        ? "rgba(255,60,60,0.34)"
        : g.state === GUARD_SUSPICIOUS || g.state === GUARD_SEARCH
        ? "rgba(255,190,60,0.30)"
        : "rgba(255,220,90,0.20)";
    drawCone(ctx, world.level, g.x, g.y, g.angle, range, TUNING.guardConeHalfAngle, color);
  }
  for (const cam of world.cameras) {
    if (cam.disabledTimer > 0) continue;
    const range = TUNING.cameraConeRange * TILE;
    drawCone(ctx, world.level, cam.x, cam.y, cam.angle, range, TUNING.cameraConeHalfAngle, "rgba(255,70,70,0.22)");
  }
  for (const cam of world.cameras) {
    ctx.fillStyle = "#141824";
    ctx.fillRect(cam.x - 9, cam.y - 7, 18, 14);
    ctx.fillStyle = cam.disabledTimer > 0 ? "#3a4157" : "#ff3b30";
    ctx.beginPath();
    ctx.arc(cam.x, cam.y, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#39415e";
    ctx.lineWidth = 2;
    ctx.strokeRect(cam.x - 9, cam.y - 7, 18, 14);
  }
  for (const g of world.guards) {
    ctx.fillStyle = g.state === GUARD_CHASE ? "#ff3b30" : "#2b4a8f";
    ctx.beginPath();
    ctx.arc(g.x, g.y, 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#dfe6ff";
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.strokeStyle = "#ffd94a";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(g.x, g.y);
    ctx.lineTo(g.x + Math.cos(g.angle) * 17, g.y + Math.sin(g.angle) * 17);
    ctx.stroke();
    // Suspicion arc above the guard.
    if (g.suspicion > 1) {
      ctx.strokeStyle = g.suspicion >= 100 ? "#ff3b30" : "#ffb43c";
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(g.x, g.y, 17, -Math.PI / 2, -Math.PI / 2 + (Math.PI * 2 * g.suspicion) / 100);
      ctx.stroke();
    }
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 10px monospace";
    ctx.textAlign = "center";
    ctx.fillText(g.name.toUpperCase(), g.x, g.y - 21);
    const stateText = { PATROL: "", SUSPICIOUS: "?", CHASE: "!", SEARCH: "…", RETURN: "" }[g.state];
    if (stateText) {
      ctx.fillStyle = g.state === GUARD_CHASE ? "#ff3b30" : "#ffb43c";
      ctx.font = "bold 16px monospace";
      ctx.fillText(stateText, g.x, g.y - 34);
    }
  }
}

function drawPlayer(ctx, world) {
  const p = world.player;
  if (world.smokeTimer > 0) {
    ctx.fillStyle = "rgba(180,180,190,0.35)";
    ctx.beginPath();
    ctx.arc(p.x, p.y, 70, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = "#0d0d12";
  ctx.beginPath();
  ctx.arc(p.x, p.y, 12, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = p.sneaking ? "#8ef2ff" : "#e8c766";
  ctx.lineWidth = 2;
  ctx.stroke();
  // Hood + mask: two eyes in the direction of travel.
  const ex = Math.cos(p.angle);
  const ey = Math.sin(p.angle);
  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.arc(p.x + ex * 5 - ey * 4, p.y + ey * 5 + ex * 4, 2.2, 0, Math.PI * 2);
  ctx.arc(p.x + ex * 5 + ey * 4, p.y + ey * 5 - ex * 4, 2.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 10px monospace";
  ctx.textAlign = "center";
  ctx.fillText(PLAYER_ALIAS, p.x, p.y - 20);
  if (p.sneaking) {
    ctx.fillStyle = "#8ef2ff";
    ctx.font = "bold 9px monospace";
    ctx.fillText("SNEAKING", p.x, p.y + 24);
  }
  if (world.coinFlight) {
    const c = world.coinFlight;
    const cx = p.x + (c.x - p.x) * c.t;
    const cy = p.y + (c.y - p.y) * c.t - Math.sin(c.t * Math.PI) * 26;
    ctx.fillStyle = "#ffd94a";
    ctx.beginPath();
    ctx.arc(cx, cy, 4, 0, Math.PI * 2);
    ctx.fill();
  }
  if (world.coinRing) {
    ctx.strokeStyle = "rgba(255,217,74," + Math.max(0, 1 - world.coinRing.t) + ")";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(world.coinRing.x, world.coinRing.y, 8 + world.coinRing.t * 40, 0, Math.PI * 2);
    ctx.stroke();
  }
}

function alarmColor(alarm) {
  if (alarm < 30) return "#4be07a";
  if (alarm < 70) return "#ffb43c";
  return "#ff3b30";
}

function drawHud(ctx, world) {
  const wing = WINGS[world.wingIndex];
  ctx.fillStyle = "rgba(8,10,18,0.92)";
  ctx.fillRect(0, 0, VIEW_W, 64);
  ctx.fillStyle = "#c9a227";
  ctx.fillRect(0, 64, VIEW_W, 2);
  ctx.textAlign = "left";
  ctx.fillStyle = "#e8c766";
  ctx.font = "bold 17px monospace";
  ctx.fillText("CRIMSON VAULT", 14, 24);
  ctx.fillStyle = "#9fb2d8";
  ctx.font = "11px monospace";
  ctx.fillText(wing.name, 14, 44);
  ctx.fillText("SCORE " + world.score.toLocaleString("en-US"), 14, 58);

  // Loot / quota.
  const quota = wing.quota;
  ctx.fillStyle = "#9fb2d8";
  ctx.font = "11px monospace";
  ctx.fillText("LOOT " + playerCarryText(world) + " / $" + quota.toLocaleString("en-US"), 430, 24);
  ctx.fillStyle = "#232a3d";
  ctx.fillRect(430, 32, 190, 10);
  ctx.fillStyle = "#ffd94a";
  ctx.fillRect(430, 32, 190 * Math.min(1, world.lootValue / quota), 10);
  ctx.fillStyle = world.exitOpen ? "#4be07a" : "#ffb43c";
  ctx.font = "bold 11px monospace";
  ctx.fillText(world.exitOpen ? "EXIT OPEN — GO!" : "QUOTA " + Math.round((world.lootValue / quota) * 100) + "%", 430, 58);

  // Alarm meter.
  const ax = 680;
  ctx.fillStyle = "#9fb2d8";
  ctx.font = "11px monospace";
  ctx.fillText("ALARM", ax, 24);
  ctx.fillStyle = "#232a3d";
  ctx.fillRect(ax, 32, 220, 14);
  ctx.fillStyle = alarmColor(world.alarm);
  ctx.fillRect(ax, 32, 220 * (world.alarm / 100), 14);
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 11px monospace";
  ctx.fillText(Math.round(world.alarm) + "%" + (world.alarm >= TUNING.alarmLockdownAt ? " — LOCKDOWN" : ""), ax + 4, 43);
  ctx.fillStyle = "#9fb2d8";
  ctx.font = "11px monospace";
  ctx.fillText(world.hasKeycard ? "KEYCARD ✓" : "KEYCARD —", ax, 58);
  ctx.fillText(world.ghost ? "GHOST ✓" : "GHOST ✗", ax + 110, 58);

  // Timer + tools.
  const mm = Math.floor(world.timeLeft / 60);
  const ss = Math.floor(world.timeLeft % 60);
  ctx.fillStyle = world.timeLeft < 60 ? "#ff3b30" : "#ffffff";
  ctx.font = "bold 20px monospace";
  ctx.textAlign = "right";
  ctx.fillText(mm + ":" + String(ss).padStart(2, "0"), VIEW_W - 14, 26);
  ctx.fillStyle = "#9fb2d8";
  ctx.font = "11px monospace";
  const p = world.player;
  ctx.fillText(
    "COIN×" + p.coins + " [click]  SMOKE×" + p.smoke + " [1]  EMP×" + p.emp + " [2]  PICK×" + p.lockpicks + " [3]",
    VIEW_W - 14,
    44
  );
  ctx.fillText("E interact · SHIFT sneak · P pause · M mute", VIEW_W - 14, 58);
  ctx.textAlign = "left";

  // Objective line.
  ctx.fillStyle = "rgba(8,10,18,0.85)";
  ctx.fillRect(0, VIEW_H - 92, 560, 24);
  ctx.fillStyle = "#e8c766";
  ctx.font = "bold 12px monospace";
  const objective =
    world.wingIndex === WINGS.length - 1
      ? "OBJECTIVE: take THE MERIDIAN STAR, $" + wing.quota.toLocaleString("en-US") + " more, reach the van"
      : "OBJECTIVE: lift $" + wing.quota.toLocaleString("en-US") + " of loot, then take the east door";
  ctx.fillText(objective, 14, VIEW_H - 75);

  // Guard status chips.
  let gx = 14;
  const gy = VIEW_H - 62;
  for (const g of world.guards) {
    const label = g.name + ": " + g.state;
    ctx.font = "11px monospace";
    const w = ctx.measureText(label).width + 14;
    ctx.fillStyle = g.state === GUARD_CHASE ? "#5c1a1a" : g.state === GUARD_PATROL ? "#1d2739" : "#4a3410";
    ctx.fillRect(gx, gy, w, 20);
    ctx.fillStyle = g.state === GUARD_CHASE ? "#ff8a8a" : "#dfe6ff";
    ctx.fillText(label, gx + 7, gy + 14);
    gx += w + 6;
  }

  // Ticker feed: the last two crew events (kept narrow so the exit door
  // in the bottom row stays visible).
  ctx.fillStyle = "rgba(8,10,18,0.85)";
  ctx.fillRect(0, VIEW_H - 34, 560, 34);
  world.ticker.slice(0, 2).forEach((line, i) => {
    ctx.fillStyle = i === 0 ? "#ffffff" : "#9fb2d8";
    ctx.font = "11px monospace";
    ctx.fillText("» " + line.text, 14, VIEW_H - 20 + i * 13);
  });
}

function drawMinimap(ctx, world) {
  const scale = 4;
  const mw = COLS * scale;
  const mh = ROWS * scale;
  const ox = VIEW_W - mw - 12;
  const oy = VIEW_H - mh - 12;
  ctx.fillStyle = "rgba(8,10,18,0.88)";
  ctx.fillRect(ox - 6, oy - 6, mw + 12, mh + 26);
  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      const ch = world.level.grid[y][x];
      if (ch === "#") ctx.fillStyle = "#39415e";
      else if (ch === ",") ctx.fillStyle = "#232c44";
      else if (ch === "=") ctx.fillStyle = "#7a2a30";
      else ctx.fillStyle = "#3a3f55";
      ctx.fillRect(ox + x * scale, oy + y * scale, scale, scale);
    }
  }
  for (const l of world.level.loot) {
    if (l.taken) continue;
    ctx.fillStyle = "#ffd94a";
    ctx.fillRect(ox + l.x * scale, oy + l.y * scale, scale, scale);
  }
  if (world.level.diamond && !world.level.diamond.taken) {
    ctx.fillStyle = "#8ef2ff";
    ctx.fillRect(ox + world.level.diamond.x * scale - 1, oy + world.level.diamond.y * scale - 1, scale + 2, scale + 2);
  }
  if (world.level.exit) {
    ctx.fillStyle = world.exitOpen ? "#4be07a" : "#ff5a5a";
    ctx.fillRect(ox + world.level.exit.x * scale - 1, oy + world.level.exit.y * scale - 1, scale + 2, scale + 2);
  }
  for (const g of world.guards) {
    ctx.fillStyle = g.state === GUARD_CHASE ? "#ff3b30" : "#ffb43c";
    ctx.beginPath();
    ctx.arc(ox + (g.x / TILE) * scale, oy + (g.y / TILE) * scale, 3, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.arc(ox + (world.player.x / TILE) * scale, oy + (world.player.y / TILE) * scale, 3.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#9fb2d8";
  ctx.font = "10px monospace";
  ctx.textAlign = "right";
  ctx.fillText("MAP — gold: loot · cyan: Star · green/red: exit", VIEW_W - 14, oy + mh + 12);
  ctx.textAlign = "left";
}

function drawCenterPanel(ctx, title, lines, accent) {
  ctx.fillStyle = "rgba(5,7,14,0.82)";
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  const w = 760;
  const h = 120 + lines.length * 26;
  const x = (VIEW_W - w) / 2;
  const y = (VIEW_H - h) / 2;
  ctx.fillStyle = "#10142a";
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = accent || "#c9a227";
  ctx.lineWidth = 3;
  ctx.strokeRect(x, y, w, h);
  ctx.fillStyle = accent || "#e8c766";
  ctx.font = "bold 34px monospace";
  ctx.textAlign = "center";
  ctx.fillText(title, VIEW_W / 2, y + 56);
  ctx.fillStyle = "#dfe6ff";
  ctx.font = "15px monospace";
  lines.forEach((line, i) => ctx.fillText(line, VIEW_W / 2, y + 96 + i * 26));
  ctx.textAlign = "left";
}

function drawTitle(ctx, world) {
  ctx.fillStyle = "#0a0d1a";
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  // Decorative vault door, below the tagline so the circles never cross it.
  ctx.strokeStyle = "#c9a227";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(VIEW_W / 2, 335, 125, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(VIEW_W / 2, 335, 90, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = "#c9a227";
  ctx.beginPath();
  ctx.arc(VIEW_W / 2, 335, 18, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#e8c766";
  ctx.font = "bold 64px monospace";
  ctx.textAlign = "center";
  ctx.fillText(GAME_TITLE, VIEW_W / 2, 130);
  ctx.fillStyle = "#9fb2d8";
  ctx.font = "17px monospace";
  ctx.fillText(GAME_TAGLINE, VIEW_W / 2, 165);
  ctx.fillStyle = "#dfe6ff";
  ctx.font = "15px monospace";
  ctx.fillText("You are WREN. Three wings of the Meridian Museum stand between you", VIEW_W / 2, 520);
  ctx.fillText("and the Meridian Star — $10,000 of cut glass and bad decisions.", VIEW_W / 2, 544);
  ctx.fillStyle = "#ffd94a";
  ctx.font = "bold 16px monospace";
  ctx.fillText("WASD / arrows move · SHIFT sneak · CLICK toss a coin · E interact", VIEW_W / 2, 600);
  ctx.fillText("1 smoke · 2 EMP · 3 lockpick · P pause · M mute", VIEW_W / 2, 626);
  const blink = Math.sin(world.time * 4) > 0;
  if (blink) {
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 20px monospace";
    ctx.fillText("— PRESS ENTER TO CASE THE JOINT —", VIEW_W / 2, 690);
  }
  ctx.textAlign = "left";
}

function drawBriefing(ctx, world) {
  const wing = WINGS[world.wingIndex];
  drawCenterPanel(
    ctx,
    wing.name,
    [
      wing.subtitle,
      "",
      ...wing.briefing.match(/.{1,88}(\s|$)/g).map((s) => s.trim()),
      "",
      "Guards: " + wing.guards.map((g) => g.name).join(", ") + "  ·  Cameras: " + wing.cameras.length,
      "Loot quota: $" + wing.quota.toLocaleString("en-US") + "  ·  Heist clock: " + Math.floor(world.timeLeft / 60) + ":" + String(Math.floor(world.timeLeft % 60)).padStart(2, "0"),
      "",
      "— PRESS ENTER TO GO IN —",
    ],
    "#e8c766"
  );
}

function drawPaused(ctx) {
  drawCenterPanel(ctx, "PAUSED", ["The crew waits in the dark.", "", "P resume · R restart wing · M mute"], "#9fb2d8");
}

function drawCaught(ctx, world) {
  drawCenterPanel(
    ctx,
    "CAUGHT",
    [
      (world.caughtBy || "Security") + " put the cuffs on WREN.",
      "",
      "Loot banked this wing: " + playerCarryText(world) + "  ·  Alarm peaked at " + Math.round(world.alarmPeak) + "%",
      "Total haul: $" + world.totalLoot.toLocaleString("en-US"),
      "",
      "— PRESS ENTER TO TRY THE WING AGAIN —",
    ],
    "#ff3b30"
  );
}

function drawWin(ctx, world) {
  const s = world.winStats;
  drawCenterPanel(
    ctx,
    "CLEAN GETAWAY",
    [
      "The van pulls away. The Meridian Star rides in WREN's pocket.",
      "",
      "Total loot: $" + s.totalLoot.toLocaleString("en-US") + "  ·  Time bonus: $" + s.timeBonus.toLocaleString("en-US"),
      "Ghost bonus: $" + s.ghostBonus.toLocaleString("en-US") + "  ·  Alarm peaked at " + s.alarmPeak + "%",
      "FINAL SCORE: " + s.score.toLocaleString("en-US"),
      "",
      "— PRESS ENTER TO RUN IT AGAIN —",
    ],
    "#4be07a"
  );
}

function drawTimeup(ctx, world) {
  drawCenterPanel(
    ctx,
    "TOO LATE",
    [
      "The clock hit zero. Sirens close in on the Meridian Museum.",
      "",
      "Total haul: $" + world.totalLoot.toLocaleString("en-US"),
      "",
      "— PRESS ENTER TO TRY AGAIN —",
    ],
    "#ff3b30"
  );
}

function render(ctx, world) {
  if (world.phase === PHASE_TITLE) {
    drawTitle(ctx, world);
    return;
  }
  drawRoom(ctx, world);
  drawLoot(ctx, world);
  drawGuards(ctx, world);
  drawPlayer(ctx, world);
  drawHud(ctx, world);
  drawMinimap(ctx, world);
  if (world.phase === PHASE_BRIEFING) drawBriefing(ctx, world);
  else if (world.phase === PHASE_PAUSED) drawPaused(ctx);
  else if (world.phase === PHASE_CAUGHT) drawCaught(ctx, world);
  else if (world.phase === PHASE_WIN) drawWin(ctx, world);
  else if (world.phase === PHASE_TIMEUP) drawTimeup(ctx, world);
}
