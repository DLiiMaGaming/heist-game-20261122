// CRIMSON VAULT — guard.js
// One job: one guard's brain — patrol waypoints, vision cone, suspicion,
// and the PATROL / SUSPICIOUS / CHASE / SEARCH / RETURN state machine.
"use strict";

// Guard states.
const GUARD_PATROL = "PATROL";
const GUARD_SUSPICIOUS = "SUSPICIOUS";
const GUARD_CHASE = "CHASE";
const GUARD_SEARCH = "SEARCH";
const GUARD_RETURN = "RETURN";

function makeGuard(level, def, spawn) {
  return {
    name: def.name,
    x: (spawn.x + 0.5) * TILE,
    y: (spawn.y + 0.5) * TILE,
    waypoints: def.waypoints.map(([wx, wy]) => ({ x: (wx + 0.5) * TILE, y: (wy + 0.5) * TILE })),
    waypointIndex: 1,
    angle: Math.PI / 2,
    state: GUARD_PATROL,
    suspicion: 0,
    speed: TUNING.guardWalkSpeed,
    pauseTimer: 0,
    searchTimer: 0,
    lastSeen: null,
    investigate: null,
    stuckTimer: 0,
    level,
  };
}

function guardTile(g) {
  return { x: Math.floor(g.x / TILE), y: Math.floor(g.y / TILE) };
}

// How fast this guard's suspicion of the player grows right now.
// 0 when the player is out of the cone, in smoke, or behind a wall.
function guardSpotRate(g, player, smoked) {
  if (smoked) return 0;
  const pt = { x: Math.floor(player.x / TILE), y: Math.floor(player.y / TILE) };
  const gt = guardTile(g);
  const dx = pt.x - gt.x;
  const dy = pt.y - gt.y;
  const dist = Math.hypot(dx, dy);
  if (dist > TUNING.guardConeRange) return 0;
  if (dist >= 0.6) {
    const targetAngle = Math.atan2(dy, dx);
    if (Math.abs(angleDifference(targetAngle, g.angle)) > TUNING.guardConeHalfAngle) return 0;
  }
  if (!hasLineOfSight(g.level, gt.x, gt.y, pt.x, pt.y)) return 0;
  // Closer = faster. Standing still in the open at 1 tile is ~55/s.
  const closeness = 1 - dist / (TUNING.guardConeRange + 1);
  let rate = TUNING.suspicionPerSecondFar + (TUNING.suspicionPerSecondClose - TUNING.suspicionPerSecondFar) * closeness;
  if (player.sneaking) rate *= TUNING.sneakFactor;
  if (isShadow(g.level, pt.x, pt.y)) rate *= TUNING.shadowFactor;
  if (player.running) rate *= TUNING.runFactor;
  return rate;
}

function moveToward(g, tx, ty, dt, speed) {
  const dx = tx - g.x;
  const dy = ty - g.y;
  const dist = Math.hypot(dx, dy);
  if (dist < 2) return true;
  const step = speed * TILE * dt;
  const nx = g.x + (dx / dist) * Math.min(step, dist);
  const ny = g.y + (dy / dist) * Math.min(step, dist);
  if (circleFits(g.level, nx, ny, 11)) {
    g.x = nx;
    g.y = ny;
  } else if (circleFits(g.level, nx, g.y, 11)) {
    g.x = nx;
  } else if (circleFits(g.level, g.x, ny, 11)) {
    g.y = ny;
  } else {
    g.stuckTimer += dt;
    return false;
  }
  g.stuckTimer = 0;
  g.angle = Math.atan2(dy, dx);
  return dist <= step + 2;
}

function updateGuard(g, dt, player, alarmRaising, world) {
  const rate = guardSpotRate(g, player, world.smokeTimer > 0);
  if (rate > 0) {
    g.suspicion = Math.min(100, g.suspicion + rate * dt);
    g.lastSeen = { x: player.x, y: player.y };
    if (g.suspicion >= 100 && g.state !== GUARD_CHASE) {
      g.state = GUARD_CHASE;
      if (world.onGuardSpotsPlayer) world.onGuardSpotsPlayer(g);
    } else if (g.suspicion >= 45 && g.state === GUARD_PATROL) {
      g.state = GUARD_SUSPICIOUS;
    }
  } else {
    g.suspicion = Math.max(0, g.suspicion - TUNING.suspicionDecayPerSecond * dt);
    if (g.state === GUARD_SUSPICIOUS && g.suspicion < 20) g.state = GUARD_PATROL;
  }

  switch (g.state) {
    case GUARD_PATROL: {
      if (g.pauseTimer > 0) {
        g.pauseTimer -= dt;
        break;
      }
      const target = g.waypoints[g.waypointIndex];
      if (moveToward(g, target.x, target.y, dt, TUNING.guardWalkSpeed)) {
        g.waypointIndex = (g.waypointIndex + 1) % g.waypoints.length;
        g.pauseTimer = 0.8;
      }
      if (g.stuckTimer > 1.5) {
        g.waypointIndex = (g.waypointIndex + 1) % g.waypoints.length;
        g.stuckTimer = 0;
      }
      break;
    }
    case GUARD_SUSPICIOUS: {
      // Freeze, stare at where the glimpse was, then walk over to look.
      if (g.lastSeen) {
        g.angle = Math.atan2(g.lastSeen.y - g.y, g.lastSeen.x - g.x);
        if (moveToward(g, g.lastSeen.x, g.lastSeen.y, dt, TUNING.guardWalkSpeed)) {
          g.state = GUARD_SEARCH;
          g.searchTimer = 4;
        }
      }
      break;
    }
    case GUARD_CHASE: {
      moveToward(g, player.x, player.y, dt, TUNING.guardChaseSpeed);
      if (rate <= 0) {
        // Lost sight: search where the thief was last seen.
        g.state = GUARD_SEARCH;
        g.searchTimer = 5;
      }
      break;
    }
    case GUARD_SEARCH: {
      g.searchTimer -= dt;
      if (g.lastSeen) {
        if (!moveToward(g, g.lastSeen.x, g.lastSeen.y, dt, TUNING.guardSearchSpeed)) {
          // Wander a little around the last-seen spot.
          const a = Math.random() * Math.PI * 2;
          g.lastSeen = { x: g.lastSeen.x + Math.cos(a) * TILE, y: g.lastSeen.y + Math.sin(a) * TILE };
        }
      }
      if (g.searchTimer <= 0) g.state = GUARD_RETURN;
      break;
    }
    case GUARD_RETURN: {
      const spawn = g.waypoints[0];
      if (moveToward(g, spawn.x, spawn.y, dt, TUNING.guardWalkSpeed)) {
        g.state = GUARD_PATROL;
        g.waypointIndex = 1;
        g.suspicion = 0;
      }
      break;
    }
  }

  // Lockdown: every guard converges on the player's position.
  if (alarmRaising && g.state === GUARD_PATROL) {
    g.state = GUARD_SUSPICIOUS;
    g.lastSeen = { x: player.x, y: player.y };
  }
}

// A thrown coin lands: guards in earshot turn to investigate the clink.
function guardHearCoin(g, cx, cy) {
  const dist = Math.hypot(cx - g.x, cy - g.y) / TILE;
  if (dist > TUNING.guardHearingRadius) return;
  if (g.state === GUARD_CHASE) return;
  g.state = GUARD_SUSPICIOUS;
  g.lastSeen = { x: cx, y: cy };
  g.suspicion = Math.max(g.suspicion, 30);
}

// Running footsteps are heard the same way, at the player's feet.
function guardHearFootsteps(g, player) {
  if (!player.running || player.sneaking) return;
  const dist = Math.hypot(player.x - g.x, player.y - g.y) / TILE;
  if (dist > TUNING.guardHearingRadius * 0.6) return;
  if (g.state === GUARD_PATROL) {
    g.state = GUARD_SUSPICIOUS;
    g.lastSeen = { x: player.x, y: player.y };
    g.suspicion = Math.max(g.suspicion, 25);
  }
}
