// CRIMSON VAULT — camera.js
// One job: the wall cameras — their sweeping vision cone, the alarm they
// feed, and the wall panels / EMP that shut them down.
"use strict";

function makeCamera(level, def, spawn) {
  return {
    x: (spawn.x + 0.5) * TILE,
    y: (spawn.y + 0.5) * TILE,
    baseAngle: def.baseAngle,
    sweep: def.sweep,
    speed: def.speed,
    phase: Math.random() * Math.PI * 2,
    angle: def.baseAngle,
    disabledTimer: 0,
    level,
  };
}

function cameraSeesPlayer(cam, player, empTimer) {
  if (cam.disabledTimer > 0 || empTimer > 0) return false;
  const pt = { x: Math.floor(player.x / TILE), y: Math.floor(player.y / TILE) };
  const ct = { x: Math.floor(cam.x / TILE), y: Math.floor(cam.y / TILE) };
  return insideCone(cam.level, ct.x + 0.5, ct.y + 0.5, cam.angle, TUNING.cameraConeRange, TUNING.cameraConeHalfAngle, pt.x, pt.y);
}

function updateCamera(cam, dt, time) {
  if (cam.disabledTimer > 0) cam.disabledTimer -= dt;
  cam.angle = cam.baseAngle + Math.sin(time * cam.speed + cam.phase) * cam.sweep;
}

// Stand at a wall panel and press E: its camera goes dark for 20 seconds.
// Panels are wired left to right: panel i kills camera i (extra panels
// kill the nearest live camera).
function useDisablePanel(level, cameras, player) {
  const pt = { x: Math.floor(player.x / TILE), y: Math.floor(player.y / TILE) };
  for (let i = 0; i < level.panels.length; i++) {
    const p = level.panels[i];
    if (Math.abs(p.x - pt.x) + Math.abs(p.y - pt.y) > 1) continue;
    const target = cameras[i] || nearestLiveCamera(cameras, p);
    if (!target) return null;
    target.disabledTimer = TUNING.cameraDisableSeconds;
    return { panel: p, camera: target };
  }
  return null;
}

function nearestLiveCamera(cameras, panel) {
  let best = null;
  let bestDist = Infinity;
  for (const cam of cameras) {
    if (cam.disabledTimer > 0) continue;
    const d = Math.hypot(cam.x - (panel.x + 0.5) * TILE, cam.y - (panel.y + 0.5) * TILE);
    if (d < bestDist) {
      bestDist = d;
      best = cam;
    }
  }
  return best;
}
