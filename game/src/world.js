// CRIMSON VAULT — world.js
// One job: the heist itself — wings, loot and the quota, the keycard and
// the vault door, the alarm meter, the score, the timer, and win / caught.
"use strict";

// World phases.
const PHASE_TITLE = "title";
const PHASE_BRIEFING = "briefing";
const PHASE_PLAY = "play";
const PHASE_CAUGHT = "caught";
const PHASE_WIN = "win";
const PHASE_TIMEUP = "timeup";
const PHASE_PAUSED = "paused";

function makeWorld() {
  return {
    phase: PHASE_TITLE,
    wingIndex: 0,
    level: null,
    player: null,
    guards: [],
    cameras: [],
    alarm: 0,
    alarmMaxed: false,
    alarmPeak: 0,
    lootValue: 0, // loot taken in the current wing
    totalLoot: 0, // loot taken across the whole heist
    score: 0,
    timeLeft: TUNING.heistSeconds,
    hasKeycard: false,
    vaultOpen: false,
    exitOpen: false,
    smokeTimer: 0,
    empTimer: 0,
    coinFlight: null, // {x, y, t} while a thrown coin is in the air
    coinRing: null, // {x, y, t} expanding ring where a coin landed
    safeCracking: null, // safe object being cracked, or null
    ticker: [], // {text, t} event feed lines
    ghost: true, // stays true while the alarm never passed 50
    caughtBy: null,
    winStats: null,
    time: 0,
    onGuardSpotsPlayer: null, // set by main.js (sound + ticker hook)
  };
}

function loadWing(world, index) {
  const wing = WINGS[index];
  world.wingIndex = index;
  world.level = buildLevel(wing);
  world.player = makePlayer(world.level);
  world.guards = wing.guards.map((def, i) => makeGuard(world.level, def, world.level.guardSpawns[i]));
  world.cameras = wing.cameras.map((def, i) => makeCamera(world.level, def, world.level.cameraSpawns[i]));
  world.lootValue = 0;
  world.exitOpen = false;
  world.vaultOpen = false;
  world.smokeTimer = 0;
  world.empTimer = 0;
  world.coinFlight = null;
  world.coinRing = null;
  world.safeCracking = null;
  world.alarm = Math.min(world.alarm, 40); // the heat cools a little between wings
  pushTicker(world, wing.name + " — " + wing.subtitle);
  pushTicker(world, "Quota: $" + wing.quota.toLocaleString("en-US") + " before the east door opens.");
}

function pushTicker(world, text) {
  world.ticker.unshift({ text, t: world.time });
  if (world.ticker.length > 5) world.ticker.pop();
}

function wingQuotaMet(world) {
  return world.lootValue >= WINGS[world.wingIndex].quota;
}

function diamondTaken(world) {
  return world.level.diamond ? world.level.diamond.taken : true;
}

// The exit opens when the wing quota is met — and in the Vault wing, only
// once the Meridian Star itself is in the bag.
function exitShouldOpen(world) {
  if (world.wingIndex === WINGS.length - 1) {
    return wingQuotaMet(world) && diamondTaken(world);
  }
  return wingQuotaMet(world);
}

function nearestLoot(world, maxDistTiles) {
  const pt = playerTile(world.player);
  let best = null;
  let bestDist = Infinity;
  for (const l of world.level.loot) {
    if (l.taken) continue;
    const d = Math.abs(l.x - pt.x) + Math.abs(l.y - pt.y);
    if (d <= maxDistTiles && d < bestDist) {
      bestDist = d;
      best = l;
    }
  }
  return best;
}

function nearestSafe(world, maxDistTiles) {
  const pt = playerTile(world.player);
  let best = null;
  let bestDist = Infinity;
  for (const s of world.level.safes) {
    if (s.taken) continue;
    const d = Math.abs(s.x - pt.x) + Math.abs(s.y - pt.y);
    if (d <= maxDistTiles && d < bestDist) {
      bestDist = d;
      best = s;
    }
  }
  return best;
}

// Interact key (E): grab loot, crack a safe, take the keycard / diamond,
// use a camera panel, open the vault door, or step through the exit.
function interact(world) {
  const player = world.player;
  const pt = playerTile(player);
  const level = world.level;

  const loot = nearestLoot(world, 1);
  if (loot) {
    loot.taken = true;
    world.lootValue += loot.value;
    world.totalLoot += loot.value;
    world.score += loot.value;
    pushTicker(world, "Lifted " + loot.name + " — $" + loot.value.toLocaleString("en-US") + ".");
    return "loot";
  }

  const safe = nearestSafe(world, 1);
  if (safe) {
    if (player.lockpicks > 0) {
      player.lockpicks -= 1;
      safe.taken = true;
      world.lootValue += safe.value;
      world.totalLoot += safe.value;
      world.score += safe.value;
      pushTicker(world, "Lockpick pops the safe — $" + safe.value.toLocaleString("en-US") + " in cash.");
      return "safe-pick";
    }
    world.safeCracking = safe;
    return "safe-start";
  }

  if (level.keycard && !level.keycard.taken && Math.abs(level.keycard.x - pt.x) + Math.abs(level.keycard.y - pt.y) <= 1) {
    level.keycard.taken = true;
    world.hasKeycard = true;
    pushTicker(world, "Vault Keycard taken — the vault door in Wing 3 will open.");
    return "keycard";
  }

  if (level.diamond && !level.diamond.taken && Math.abs(level.diamond.x - pt.x) + Math.abs(level.diamond.y - pt.y) <= 1) {
    level.diamond.taken = true;
    world.lootValue += TUNING.lootDiamond;
    world.totalLoot += TUNING.lootDiamond;
    world.score += TUNING.lootDiamond;
    pushTicker(world, "THE MERIDIAN STAR IS YOURS — $10,000. Get to the van!");
    return "diamond";
  }

  const panel = useDisablePanel(level, world.cameras, player);
  if (panel) {
    pushTicker(world, "Camera dark for " + TUNING.cameraDisableSeconds + "s — panel cut.");
    return "panel";
  }

  if (level.vaultDoor && !world.vaultOpen) {
    const vd = level.vaultDoor;
    if (Math.abs(vd.x - pt.x) + Math.abs(vd.y - pt.y) <= 1) {
      if (world.hasKeycard) {
        world.vaultOpen = true;
        level.grid[vd.y][vd.x] = ".";
        pushTicker(world, "Keycard accepted — THE VAULT IS OPEN.");
        return "vault";
      }
      pushTicker(world, "Vault door: needs the keycard from Wing 2.");
      return "vault-locked";
    }
  }

  if (level.exit && pt.x === level.exit.x && pt.y === level.exit.y) {
    return tryExit(world);
  }

  return null;
}

// Step through the exit: next wing, or the getaway when it is the last.
function tryExit(world) {
  if (!world.exitOpen) {
    pushTicker(world, "East door locked — quota $" + WINGS[world.wingIndex].quota.toLocaleString("en-US") + " not met.");
    return "exit-locked";
  }
  if (world.wingIndex < WINGS.length - 1) {
    loadWing(world, world.wingIndex + 1);
    world.phase = PHASE_BRIEFING;
    return "next-wing";
  }
  return finishHeist(world, true);
}

function finishHeist(world, escaped) {
  const timeBonus = Math.round(world.timeLeft) * TUNING.timeBonusPerSecondLeft;
  const ghostBonus = world.ghost ? TUNING.ghostBonus : 0;
  world.score += timeBonus + ghostBonus;
  world.winStats = {
    totalLoot: world.totalLoot,
    timeBonus,
    ghostBonus,
    score: world.score,
    timeLeft: Math.round(world.timeLeft),
    alarmPeak: Math.round(world.alarmPeak),
  };
  world.phase = escaped ? PHASE_WIN : PHASE_TIMEUP;
  return escaped ? "win" : "timeup";
}

function caught(world, byName) {
  if (world.phase !== PHASE_PLAY) return;
  world.phase = PHASE_CAUGHT;
  world.caughtBy = byName;
  pushTicker(world, "CAUGHT by " + byName + ". The crew leaves no one behind — except tonight.");
}

function updateWorld(world, dt, input) {
  if (world.phase !== PHASE_PLAY) return;
  world.time += dt;
  world.timeLeft -= dt;
  if (world.timeLeft <= 0) {
    world.timeLeft = 0;
    finishHeist(world, false);
    return;
  }
  if (world.smokeTimer > 0) world.smokeTimer -= dt;
  if (world.empTimer > 0) world.empTimer -= dt;

  updatePlayer(world.player, dt, input);

  // Thrown coin: flies, lands, rings, pulls guards.
  if (world.coinFlight) {
    world.coinFlight.t += dt * 3;
    if (world.coinFlight.t >= 1) {
      world.coinRing = { x: world.coinFlight.x, y: world.coinFlight.y, t: 0 };
      for (const g of world.guards) guardHearCoin(g, world.coinFlight.x, world.coinFlight.y);
      pushTicker(world, "Coin clinks on the marble — heads turn.");
      world.coinFlight = null;
    }
  }
  if (world.coinRing) {
    world.coinRing.t += dt;
    if (world.coinRing.t > 1.2) world.coinRing = null;
  }

  // Safe cracking: hold still next to the safe.
  if (world.safeCracking) {
    const safe = world.safeCracking;
    const pt = playerTile(world.player);
    const near = Math.abs(safe.x - pt.x) + Math.abs(safe.y - pt.y) <= 1;
    if (!near || world.player.moving) {
      safe.progress = 0;
      world.safeCracking = null;
      pushTicker(world, "Crack interrupted — the tumblers reset.");
    } else {
      safe.progress += dt;
      if (safe.progress >= TUNING.safeCrackSeconds) {
        safe.taken = true;
        world.lootValue += safe.value;
        world.totalLoot += safe.value;
        world.score += safe.value;
        world.safeCracking = null;
        pushTicker(world, "Safe cracked — $" + safe.value.toLocaleString("en-US") + " in cash.");
      }
    }
  }

  // Guards and cameras.
  const lockdown = world.alarm >= TUNING.alarmLockdownAt;
  let anyoneSees = false;
  let chasing = false;
  for (const g of world.guards) {
    updateGuard(g, dt, world.player, lockdown, world);
    if (guardSpotRate(g, world.player, world.smokeTimer > 0) > 0) anyoneSees = true;
    if (g.state === GUARD_CHASE) chasing = true;
    guardHearFootsteps(g, world.player);
    // Caught: a chasing guard reaches the thief.
    if (g.state === GUARD_CHASE && Math.hypot(g.x - world.player.x, g.y - world.player.y) < TILE * 0.75) {
      caught(world, g.name);
      return;
    }
  }
  for (const cam of world.cameras) {
    updateCamera(cam, dt, world.time);
    if (cameraSeesPlayer(cam, world.player, world.empTimer)) anyoneSees = true;
  }

  // The alarm meter: climbs while seen, cools while hidden.
  if (anyoneSees) {
    world.alarm = Math.min(100, world.alarm + TUNING.alarmPerSecondSpotted * dt);
  } else {
    world.alarm = Math.max(0, world.alarm - TUNING.alarmDecayPerSecond * dt);
  }
  if (chasing) world.alarm = Math.min(100, world.alarm + TUNING.alarmPerSecondChase * dt);
  world.alarmPeak = Math.max(world.alarmPeak, world.alarm);
  if (world.alarmPeak > 50) world.ghost = false;
  if (world.alarm >= TUNING.alarmMaxedAt && !world.alarmMaxed) {
    world.alarmMaxed = true;
    pushTicker(world, "ALARM MAXED — every guard is hunting you. Run or hide!");
  }
  if (world.alarm < TUNING.alarmMaxedAt) world.alarmMaxed = false;

  // The exit opens the moment the quota (and the diamond, in Wing 3) is met.
  if (!world.exitOpen && exitShouldOpen(world)) {
    world.exitOpen = true;
    pushTicker(world, "East door UNLOCKED — get out!");
  }
}
