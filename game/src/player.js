// CRIMSON VAULT — player.js
// One job: the thief WREN — movement (walk / sneak / run), the coin toss,
// and the three tools (smoke, EMP, lockpick) with their costs.
"use strict";

function makePlayer(level) {
  const s = level.playerStart;
  return {
    x: (s.x + 0.5) * TILE,
    y: (s.y + 0.5) * TILE,
    angle: -Math.PI / 2,
    moving: false,
    sneaking: false,
    running: false,
    coins: TUNING.coinsPerWing,
    smoke: TUNING.smokePerWing,
    emp: TUNING.empPerWing,
    lockpicks: TUNING.lockpicksPerWing,
    level,
  };
}

// A coin toss: the coin flies to the clicked tile and clinks there.
// Returns the landing pixel position, or null when out of range / no coins.
function throwCoin(player, targetTileX, targetTileY) {
  if (player.coins <= 0) return null;
  const tx = (targetTileX + 0.5) * TILE;
  const ty = (targetTileY + 0.5) * TILE;
  const dist = Math.hypot(tx - player.x, ty - player.y) / TILE;
  if (dist > TUNING.coinThrowRange) return null;
  player.coins -= 1;
  return { x: tx, y: ty };
}

function updatePlayer(player, dt, input) {
  let mx = 0;
  let my = 0;
  if (input.left) mx -= 1;
  if (input.right) mx += 1;
  if (input.up) my -= 1;
  if (input.down) my += 1;
  player.moving = mx !== 0 || my !== 0;
  player.sneaking = !!input.sneak && player.moving;
  player.running = !!input.run && player.moving && !player.sneaking;
  if (!player.moving) return;

  const len = Math.hypot(mx, my);
  mx /= len;
  my /= len;
  const speed = (player.sneaking ? TUNING.sneakSpeed : player.running ? TUNING.runSpeed : TUNING.walkSpeed) * TILE;
  const nx = player.x + mx * speed * dt;
  const ny = player.y + my * speed * dt;
  if (circleFits(player.level, nx, ny, 11)) {
    player.x = nx;
    player.y = ny;
  } else if (circleFits(player.level, nx, player.y, 11)) {
    player.x = nx;
  } else if (circleFits(player.level, player.x, ny, 11)) {
    player.y = ny;
  }
  player.angle = Math.atan2(my, mx);
}

function playerTile(player) {
  return { x: Math.floor(player.x / TILE), y: Math.floor(player.y / TILE) };
}

// The thief's carry: what the HUD shows as the haul so far.
function playerCarryText(world) {
  return "$" + world.lootValue.toLocaleString("en-US");
}
