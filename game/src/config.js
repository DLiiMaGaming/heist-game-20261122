// CRIMSON VAULT — config.js
// Tuning, level maps and named content for the whole heist.
// One job: hold every number and every hand-drawn room so the other
// modules never hard-code a value or a layout.
"use strict";

// Canvas / grid. The whole room fits in one frame: 40 x 25 tiles at 32px.
const TILE = 32;
const COLS = 40;
const ROWS = 25;
const VIEW_W = COLS * TILE; // 1280
const VIEW_H = ROWS * TILE; // 800

// Map legend (every character a map row may use):
//   # wall        . marble floor      , shadow carpet (half detection)
//   = red carpet  ~ fountain (solid)  T display table (solid, blocks sight)
//   + doorway     P player start      G guard spawn
//   C camera      X disable panel     L loot painting ($500)
//   S safe ($1500, crack with E)     K keycard       D the Meridian Star diamond
//   V vault door (needs keycard)      E exit / getaway door
const LEGEND = "#.,=~T+P G C X L S K D V E".replace(/ /g, "");

const TUNING = {
  heistSeconds: 600, // whole-heist timer: 10:00, then the police arrive
  walkSpeed: 4.6, // tiles per second
  sneakSpeed: 2.6,
  runSpeed: 6.2,
  guardWalkSpeed: 2.1,
  guardChaseSpeed: 3.9,
  guardSearchSpeed: 2.6,
  guardConeRange: 7.2, // tiles
  guardConeHalfAngle: 0.61, // radians (~35 deg each side)
  cameraConeRange: 8.0,
  cameraConeHalfAngle: 0.52,
  suspicionPerSecondClose: 55, // at 1 tile, standing, lit
  suspicionPerSecondFar: 14, // at cone edge
  suspicionDecayPerSecond: 26,
  sneakFactor: 0.45, // sneaking multiplies suspicion gain
  shadowFactor: 0.5, // standing on shadow carpet multiplies suspicion gain
  runFactor: 1.6, // running multiplies suspicion gain (and makes noise)
  alarmPerSecondSpotted: 16, // global alarm while any guard/camera sees you
  alarmPerSecondChase: 9, // extra while a guard is chasing
  alarmDecayPerSecond: 5,
  alarmLockdownAt: 70, // exit locks, guards converge
  alarmMaxedAt: 100,
  guardHearingRadius: 5.5, // tiles: coin clink / running heard this far
  coinThrowRange: 6.0,
  coinsPerWing: 5,
  smokePerWing: 2,
  smokeSeconds: 4,
  empPerWing: 2,
  empSeconds: 6,
  lockpicksPerWing: 1,
  safeCrackSeconds: 2.0,
  cameraDisableSeconds: 20,
  ghostBonus: 500, // score bonus if the alarm never passed 50
  timeBonusPerSecondLeft: 5,
  lootPainting: 500,
  lootSafe: 1500,
  lootDiamond: 10000,
};

const WINGS = [
  {
    id: "atrium",
    name: "WING 1 — THE ATRIUM",
    subtitle: "Meridian Museum of Fine Arts · 21:47 · rain on the skylight",
    quota: 3000,
    briefing:
      "Lift $3,000 of art from the atrium, then slip out the east door. " +
      "Three guards walk the hall, two cameras sweep the carpet. " +
      "Stay in the shadows, toss a coin to pull a guard away.",
    map: [
      "########################################",
      "#......#......====......#......#.......#",
      "#.L....#..,,,,====,,,,..#..,,,,#.L..S..#",
      "#......#..,,,,====,,,,..#..,,,,#.......#",
      "#..TT..#..,,,,====,,,,..#..,,,,#..TT...#",
      "#......+..,,,,====,,,,..+..,,,,+.......#",
      "#......#..,,,,====,,,,..#..,,,,#.......#",
      "#.C....#..,,,,====,,,,..#..,,,,#....C..#",
      "#......#..,,,,====,,,,..#..,,,,#.......#",
      "###+####..,,,,====,,,,..####+####+####.#",
      "#........,,,,,====,,,,,................#",
      "#..G.....,,,,,====,,,,,......G.........#",
      "#........,,,,,====,,,,,................#",
      "#..,,,,..,,,,,====,,G,,....,,,,........#",
      "#..,,,,..,,,,,====,,,,,....,,,,........#",
      "#........,,,,,====,,,,,................#",
      "###+####..,,,,====,,,,..####+####+####.#",
      "#......#..,,,,====,,,,..#..,,,,#.......#",
      "#.L....#..,,,,====,,,,..#..,,,,#.L..S..#",
      "#......#..,,,,====,,,,..#..,,,,#.......#",
      "#..TT..#..,,,,====,,,,..#..,,,,#..TT...#",
      "#......+..,,,,====,,,,..+..,,,,+.......#",
      "#......#..,,,,====,,,,..#..,,,,#....L..#",
      "#......#P.,,,,====,,,,..#..,,,,#.......#",
      "###################E####################",
    ],
    guards: [
      {
        name: "Bram",
        waypoints: [[5, 11], [20, 11], [34, 11], [20, 11]],
      },
      {
        name: "Sofia",
        waypoints: [[34, 13], [10, 13], [10, 11], [34, 11]],
      },
      {
        name: "Dmitri",
        waypoints: [[20, 10], [20, 15], [20, 10]],
      },
    ],
    cameras: [
      { baseAngle: Math.PI / 2, sweep: 0.9, speed: 0.55 },
      { baseAngle: Math.PI / 2, sweep: 0.9, speed: 0.55 },
    ],
  },
  {
    id: "gallery",
    name: "WING 2 — THE GALLERY",
    subtitle: "Hall of Masters · 22:05 · the night guard changes shift",
    quota: 5000,
    briefing:
      "The Gallery holds the big canvases — $5,000 before the far door opens. " +
      "Four guards, three cameras, and the Vault Keycard hangs in the north study. " +
      "Take the keycard: the vault door in Wing 3 will not open without it.",
    map: [
      "########################################",
      "#......#....,,,,,,,,....#..............#",
      "#..L...#....,,,,,,,,....#......L....L..#",
      "#..TT..#..,,========,,..#..TT....TT....#",
      "#......#..,,========,,..#..............#",
      "#..C...+..,,========,,..+...C......L...#",
      "#......#..,,========,,..#..............#",
      "###+####..,,========,,..####+#####+#####",
      "#.........,,========,,.................#",
      "#....G....,,========,,......G..........#",
      "#.........,,========,,.................#",
      "#..,,,,...,,========,,...,,,,......L...#",
      "#..,,,,...,,========,,...,,,,..........#",
      "#.........,,========,,.................#",
      "#....G....,,========,,......G..........#",
      "#.........,,========,,.................#",
      "###+####..,,========,,..####+#####+#####",
      "#......#..,,========,,..#......#.......#",
      "#..L...#..,,========,,..#..S..S#.KX.L..#",
      "#......#..,,========,,..#......#...C...#",
      "#..TT..#..,,========,,..#..TT..#..TT...#",
      "#......#..,,========,,..#......#.......#",
      "#......+..,,========,,..+......+.......#",
      "#......#P.,,,,,,,,,,....#......#.......#",
      "###################E####################",
    ],
    guards: [
      {
        name: "Anya",
        waypoints: [[5, 9], [20, 9], [34, 9], [20, 9]],
      },
      {
        name: "Kofi",
        waypoints: [[34, 9], [34, 14], [10, 14], [10, 9]],
      },
      {
        name: "Mara",
        waypoints: [[5, 14], [20, 14], [20, 9], [5, 9]],
      },
      {
        name: "Jules",
        waypoints: [[28, 14], [15, 14], [15, 9], [28, 9]],
      },
    ],
    cameras: [
      { baseAngle: Math.PI / 2, sweep: 1.0, speed: 0.6 },
      { baseAngle: Math.PI / 2, sweep: 1.0, speed: 0.6 },
      { baseAngle: -Math.PI / 2, sweep: 1.0, speed: 0.6 },
    ],
  },
  {
    id: "vault",
    name: "WING 3 — THE VAULT",
    subtitle: "The Meridian Vault · 22:31 · the Star is behind one door",
    quota: 2000,
    briefing:
      "The Meridian Star waits behind the vault door — it needs the keycard " +
      "from Wing 2. Three guards, three cameras, and the getaway van idles " +
      "past the east door. Take the Star, grab $2,000 more, and run.",
    map: [
      "########################################",
      "#......#....,,,,,,,,....#..............#",
      "#..L...#....,,,,,,,,....#......L.......#",
      "#..TT..#..,,========,,..#..TT....TT....#",
      "#......#..,,========,,..#..............#",
      "#..C...+..,,========,,..+...C......L...#",
      "#......#..,,========,,..#..............#",
      "###+####..,,========,,..####+#####+#####",
      "#.........,,========,,.................#",
      "#....G....,,========,,......G..........#",
      "#.........,,========,,.................#",
      "#..,,,,...,,========,,...,,,,......L...#",
      "#..,,,,...,,========,,...,,,,..........#",
      "#.........,,========,,.................#",
      "#....G....,,========,,.................#",
      "#.........,,========,,.................#",
      "########..,,========,,..####+#####+#####",
      "#......#..,,========,,..#......#.......#",
      "#..S...#..,,========,,..#..S...#..X....#",
      "#......#..,,========,,..#......#...C...#",
      "#..TT..#..,,========,,..#..TT..#..TT...#",
      "#..D...#..,,========,,..#......#.......#",
      "#......V..,,========,,..+......+.......#",
      "#......#P.,,,,,,,,,,....#......#.......#",
      "###################E####################",
    ],
    guards: [
      {
        name: "Petra",
        waypoints: [[5, 9], [20, 9], [34, 9], [20, 9]],
      },
      {
        name: "Omar",
        waypoints: [[34, 9], [34, 14], [10, 14], [10, 9]],
      },
      {
        name: "Lena",
        waypoints: [[5, 14], [20, 14], [20, 9], [5, 9]],
      },
    ],
    cameras: [
      { baseAngle: Math.PI / 2, sweep: 1.0, speed: 0.65 },
      { baseAngle: Math.PI / 2, sweep: 1.0, speed: 0.65 },
      { baseAngle: -Math.PI / 2, sweep: 1.0, speed: 0.65 },
    ],
  },
];

// Loot flavour names, cycled per painting so the HUD ticker reads like a haul.
const LOOT_NAMES = [
  "Portrait of a Lady in Red",
  "The Rainy Canal",
  "Still Life with Lemons",
  "The Brass Astrolabe",
  "Moon over the Harbour",
  "The Duchess's Fan",
  "A Study in Blue",
  "The Jade Horse",
  "Winter at the Docks",
  "The Gilded Mirror",
];

const GAME_TITLE = "CRIMSON VAULT";
const GAME_TAGLINE =
  "3 wings · 10 guards · 8 cameras · 22 loot · 1 diamond — a top-down heist";
const PLAYER_ALIAS = "WREN";
