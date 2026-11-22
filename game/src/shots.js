// CRIMSON VAULT — shots.js
// One job: stage the four screenshots. Each scene puts the thief, the
// guards, the cameras, the loot and the alarm meter in one frame, exactly
// as the game itself renders them — no compositing, no borrowed pixels.
// Scenes are chosen with ?shot=cover|gallery|alarm|vault.
"use strict";

const SHOT_SCENES = {
  // Wing 1, mid-sneak: WREN on the red carpet inside a sweeping cone,
  // guards patrolling, cameras live, loot glowing, alarm at 35%.
  cover: { wing: 0, alarm: 35, player: { x: 19, y: 14 }, sneak: true },
  // Wing 2, deep in the Gallery: keycard in sight, safes cracked open,
  // alarm low, the haul already fat.
  gallery: { wing: 1, alarm: 12, player: { x: 20, y: 12 }, sneak: true },
  // Wing 3, alarm maxed: every guard hunting, cones red, WREN sprinting
  // for the vault with the Star in reach.
  alarm: { wing: 2, alarm: 96, player: { x: 20, y: 20 }, sneak: false },
  // Wing 3, the payoff: the Star taken, the vault open, the exit green.
  vault: { wing: 2, alarm: 58, player: { x: 10, y: 21 }, sneak: false },
};

function stageShot(world, sceneName) {
  const scene = SHOT_SCENES[sceneName];
  if (!scene) return false;
  loadWing(world, scene.wing);
  world.phase = PHASE_PLAY;
  world.alarm = scene.alarm;
  world.alarmPeak = scene.alarm;
  world.player.x = (scene.player.x + 0.5) * TILE;
  world.player.y = (scene.player.y + 0.5) * TILE;
  world.player.sneaking = scene.sneak;
  world.player.angle = -Math.PI / 2;

  // Pose the guards mid-patrol with cones sweeping across the room.
  world.guards.forEach((g, i) => {
    const wp = g.waypoints[i % g.waypoints.length];
    g.x = wp.x;
    g.y = wp.y;
    g.angle = Math.PI / 2 + (i % 2 === 0 ? 0.5 : -0.5);
    g.state = sceneName === "alarm" ? GUARD_CHASE : GUARD_PATROL;
    g.suspicion = sceneName === "alarm" ? 100 : 25 + i * 12;
    if (sceneName === "alarm") g.lastSeen = { x: world.player.x, y: world.player.y };
  });
  // Cameras mid-sweep, cones crossing the carpet.
  world.cameras.forEach((cam, i) => {
    cam.angle = cam.baseAngle + (i % 2 === 0 ? 0.6 : -0.6);
  });

  if (sceneName === "gallery") {
    // A fat haul already in the bag, one safe cracked.
    world.lootValue = 5200;
    world.totalLoot = 5200;
    world.score = 5200;
    world.level.loot[0].taken = true;
    world.level.loot[1].taken = true;
    world.level.safes[0].taken = true;
    world.exitOpen = true;
    pushTicker(world, "East door UNLOCKED — get out!");
  }
  if (sceneName === "vault") {
    world.level.diamond.taken = true;
    world.vaultOpen = true;
    world.level.grid[world.level.vaultDoor.y][world.level.vaultDoor.x] = ".";
    world.lootValue = 12500;
    world.totalLoot = 18500;
    world.score = 18500;
    world.hasKeycard = true;
    world.exitOpen = true;
    pushTicker(world, "THE MERIDIAN STAR IS YOURS — $10,000. Get to the van!");
    pushTicker(world, "East door UNLOCKED — get out!");
  }
  if (sceneName === "cover") {
    world.lootValue = 1500;
    world.totalLoot = 1500;
    world.score = 1500;
    world.level.loot[0].taken = true;
    pushTicker(world, "Lifted Portrait of a Lady in Red — $500.");
    pushTicker(world, "Sofia is getting curious. Stay in the shadows.");
  }
  if (sceneName === "alarm") {
    world.alarmMaxed = false;
    pushTicker(world, "ALARM MAXED — every guard is hunting you. Run or hide!");
    pushTicker(world, "Petra spotted WREN by the vault!");
  }
  return true;
}
