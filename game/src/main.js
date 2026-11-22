// CRIMSON VAULT — main.js
// One job: wire everything together — the game loop, keyboard and mouse,
// the screen state machine, the pause / mute / restart keys, and the
// ?shot= staging hook the screenshots use.
"use strict";

const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
canvas.width = VIEW_W;
canvas.height = VIEW_H;

const world = makeWorld();
const audio = makeAudio();
world.onGuardSpotsPlayer = (g) => {
  playSpotted(audio);
  pushTicker(world, g.name + " spotted WREN — run or break line of sight!");
};
const input = {
  up: false,
  down: false,
  left: false,
  right: false,
  sneak: false,
  run: false,
};

let lastTime = 0;
let footstepTimer = 0;

function startWing(index) {
  loadWing(world, index);
  world.phase = PHASE_BRIEFING;
}

function startHeist() {
  world.timeLeft = TUNING.heistSeconds;
  world.totalLoot = 0;
  world.score = 0;
  world.hasKeycard = false;
  world.ghost = true;
  world.alarmPeak = 0;
  world.alarm = 0;
  world.ticker = [];
  startWing(0);
}

function useTool(kind) {
  if (world.phase !== PHASE_PLAY) return;
  const p = world.player;
  if (kind === "smoke" && p.smoke > 0) {
    p.smoke -= 1;
    world.smokeTimer = TUNING.smokeSeconds;
    pushTicker(world, "Smoke out — cones blind for " + TUNING.smokeSeconds + "s.");
    playClick(audio);
  } else if (kind === "emp" && p.emp > 0) {
    p.emp -= 1;
    world.empTimer = TUNING.empSeconds;
    pushTicker(world, "EMP burst — every camera dark for " + TUNING.empSeconds + "s.");
    playClick(audio);
  } else if (kind === "lockpick" && p.lockpicks > 0) {
    const safe = nearestSafe(world, 1);
    if (safe) {
      interact(world);
    } else {
      pushTicker(world, "No safe in reach — save the pick.");
    }
  }
}

function onKeyDown(e) {
  const key = e.key.toLowerCase();
  if (["arrowup", "arrowdown", "arrowleft", "arrowright", " "].includes(key)) e.preventDefault();
  ensureAudio(audio);
  if (key === "m") {
    audio.muted = !audio.muted;
    return;
  }
  if (world.phase === PHASE_TITLE) {
    if (key === "enter") {
      playClick(audio);
      startHeist();
    }
    return;
  }
  if (world.phase === PHASE_BRIEFING) {
    if (key === "enter") {
      playClick(audio);
      world.phase = PHASE_PLAY;
    }
    return;
  }
  if (world.phase === PHASE_PAUSED) {
    if (key === "p" || key === "enter") world.phase = PHASE_PLAY;
    if (key === "r") startWing(world.wingIndex);
    return;
  }
  if (world.phase === PHASE_CAUGHT || world.phase === PHASE_WIN || world.phase === PHASE_TIMEUP) {
    if (key === "enter") startHeist();
    return;
  }
  if (world.phase !== PHASE_PLAY) return;
  switch (key) {
    case "arrowup":
    case "w":
      input.up = true;
      break;
    case "arrowdown":
    case "s":
      input.down = true;
      break;
    case "arrowleft":
    case "a":
      input.left = true;
      break;
    case "arrowright":
    case "d":
      input.right = true;
      break;
    case "shift":
      input.sneak = true;
      break;
    case " ":
      input.run = true;
      break;
    case "e": {
      const result = interact(world);
      if (result === "loot") playLoot(audio);
      else if (result === "diamond") playDiamond(audio);
      else if (result === "keycard") playKeycard(audio);
      else if (result === "vault") playVault(audio);
      else if (result === "safe-pick") playLoot(audio);
      else if (result === "panel") playClick(audio);
      else if (result === "next-wing") playVault(audio);
      break;
    }
    case "1":
      useTool("smoke");
      break;
    case "2":
      useTool("emp");
      break;
    case "3":
      useTool("lockpick");
      break;
    case "p":
      world.phase = PHASE_PAUSED;
      break;
  }
}

function onKeyUp(e) {
  const key = e.key.toLowerCase();
  switch (key) {
    case "arrowup":
    case "w":
      input.up = false;
      break;
    case "arrowdown":
    case "s":
      input.down = false;
      break;
    case "arrowleft":
    case "a":
      input.left = false;
      break;
    case "arrowright":
    case "d":
      input.right = false;
      break;
    case "shift":
      input.sneak = false;
      break;
    case " ":
      input.run = false;
      break;
  }
}

function onClick(e) {
  if (world.phase !== PHASE_PLAY) return;
  ensureAudio(audio);
  const rect = canvas.getBoundingClientRect();
  const mx = ((e.clientX - rect.left) / rect.width) * VIEW_W;
  const my = ((e.clientY - rect.top) / rect.height) * VIEW_H;
  const tx = Math.floor(mx / TILE);
  const ty = Math.floor(my / TILE);
  const landing = throwCoin(world.player, tx, ty);
  if (landing) {
    world.coinFlight = { x: landing.x, y: landing.y, t: 0 };
    playCoin(audio);
  }
}

function loop(timestamp) {
  const dt = Math.min(0.05, (timestamp - lastTime) / 1000 || 0);
  lastTime = timestamp;
  if (world.phase === PHASE_PLAY) {
    updateWorld(world, dt, input);
    updateAlarmSound(audio, world.alarm);
    if (world.player.moving) {
      footstepTimer -= dt;
      if (footstepTimer <= 0) {
        playFootstep(audio, world.player.running);
        footstepTimer = world.player.running ? 0.28 : 0.45;
      }
    }
  } else {
    world.time += dt;
    if (world.phase === PHASE_TITLE) updateAlarmSound(audio, 0);
  }
  render(ctx, world);
  requestAnimationFrame(loop);
}

document.addEventListener("keydown", onKeyDown);
document.addEventListener("keyup", onKeyUp);
canvas.addEventListener("click", onClick);

// Screenshot staging: ?shot=cover|gallery|alarm|vault renders one fixed
// scene and freezes it (no input, no timer) so the capture is exact.
const shotParam = new URLSearchParams(window.location.search).get("shot");
if (shotParam && SHOT_SCENES[shotParam]) {
  startHeist();
  world.timeLeft = TUNING.heistSeconds;
  stageShot(world, shotParam);
  // Freeze the staged frame: stop the clock and the guards.
  world.phase = PHASE_PLAY;
  const frozenRender = () => render(ctx, world);
  frozenRender();
  window.__shotReady = true;
} else {
  world.phase = PHASE_TITLE;
  requestAnimationFrame(loop);
}
