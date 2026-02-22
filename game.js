const STORAGE_KEY = "project_dad_save_v1";
const LEVEL_COUNT = 11;
const LEVEL_LENGTH_M = 2000;
const MINI_BOSS_MARKERS = [500, 1000, 1500];
const DIFFICULTY_COOP_MULT = 2.1;
const PX_PER_M = 3;
const TRASH_SPAWN_INTERVAL_M = 13;
const RESISTANCE_TYPES = ["sword", "fireball", "shield", "arrow"];
const START_LINE_M = 20;
const HEAL_KEY = "h";
const HEAL_MANA_COST = 34;
const HEAL_COOLDOWN_S = 6;
const HEAL_PERCENT = 0.3;

const PERKS = {
  1: "Sprint unlocked (Space)",
  2: "Throwing knives: arrows deal 2x damage",
  3: "Dual swords: sword deals 2x damage",
  4: "Sidekick joins: 10% enemy HP damage every 3s",
  5: "Fireball V: fireball deals 5x damage, costs 2x mana",
  6: "Vitality: +25% max health",
  7: "Explodable TNT arrows: 6x damage + area splash",
  8: "Mana Vessel: +25% max mana",
  9: "Haste: +50% speed",
  10: "Baby dragon: breath deletes trash enemies"
};

const SPELLS = [
  { key: "j", keyP2: "6", type: "sword", name: "Sword", color: "#e3d3ac", damage: 44, mana: 0, cooldown: 0.4, meleeRange: 22, knockback: 15 },
  { key: "i", keyP2: "7", type: "fireball", name: "Fireball", color: "#ff6c4a", damage: 54, mana: 18, cooldown: 0.75, burn: 1.4 },
  { key: "k", keyP2: "8", type: "shield", name: "Shield Bash", color: "#8eb4d8", damage: 26, mana: 12, cooldown: 0.85, meleeRange: 20, selfShield: 28, knockback: 22 },
  { key: "l", keyP2: "9", type: "arrow", name: "Arrow", color: "#bfe091", damage: 39, mana: 10, cooldown: 0.32, projectileSpeed: 290, projectileTtl: 1.45 }
];

const HAIR = {
  short: "#2f2218",
  braided: "#4e3720",
  long: "#191919",
  shaved: "#3f3125"
};

const app = {
  canvas: document.getElementById("gameCanvas"),
  menu: document.getElementById("menuScreen"),
  creator: document.getElementById("creatorScreen"),
  pause: document.getElementById("pauseScreen"),
  end: document.getElementById("endScreen"),
  hud: document.getElementById("hud"),
  meta: document.getElementById("meta"),
  hpBar: document.getElementById("hpBar"),
  mpBar: document.getElementById("mpBar"),
  spellPanel: document.getElementById("spellPanel"),
  pauseStats: document.getElementById("pauseStats"),
  highScoreList: document.getElementById("highScoreList"),
  endTitle: document.getElementById("endTitle"),
  endSummary: document.getElementById("endSummary"),
  touchControls: document.getElementById("touchControls"),
  movePad: document.getElementById("movePad"),
  spellButtons: document.getElementById("spellButtons"),
  touchSprintBtn: document.getElementById("touchSprintBtn"),
  touchHealBtn: document.getElementById("touchHealBtn"),
  touchPauseBtn: document.getElementById("touchPauseBtn"),
  plusModeBtn: document.getElementById("plusModeBtn"),
  coopToggle: document.getElementById("coopToggle")
};

const ctx = app.canvas.getContext("2d");
const input = {
  keys: new Set(),
  codes: new Set(),
  p1TouchDir: { x: 0, y: 0 },
  touchSprint: false
};

let save = loadSave();
let run = null;
let scene = "menu";
let lastTs = 0;
let notice = { text: "", timer: 0, placement: "inline" };
let cameraX = 0;

setupUI();
resizeCanvas();
setScene("menu");
requestAnimationFrame(loop);

function loadSave() {
  const fallback = {
    unlockedPlus: false,
    persistentLevel: 1,
    bestClearTimeSec: null,
    character: {
      skinTone: "#d7a57c",
      facialFeatures: "angular",
      hair: "braided",
      build: "m",
      sex: "0",
      height: "m"
    },
    highScores: []
  };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return fallback;
    return { ...fallback, ...JSON.parse(raw) };
  } catch {
    return fallback;
  }
}

function persistSave() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(save));
}

function setupUI() {
  document.getElementById("startBtn").addEventListener("click", () => startRun(false));
  app.plusModeBtn.addEventListener("click", () => startRun(true));
  document.getElementById("creatorBtn").addEventListener("click", () => setScene("creator"));
  document.getElementById("saveCharacterBtn").addEventListener("click", saveCharacterFromForm);
  document.getElementById("backMenuBtn").addEventListener("click", () => setScene("menu"));
  document.getElementById("resumeBtn").addEventListener("click", () => setScene("playing"));
  document.getElementById("quitBtn").addEventListener("click", () => quitToMenu());
  document.getElementById("restartBtn").addEventListener("click", () => setScene("menu"));

  window.addEventListener("resize", resizeCanvas);
  window.addEventListener("keydown", (e) => {
    input.keys.add(e.key.toLowerCase());
    input.codes.add(e.code.toLowerCase());
    if (e.key === "Escape" && scene === "playing") {
      setScene("pause");
    } else if (e.key === "Escape" && scene === "pause") {
      setScene("playing");
    }
  });
  window.addEventListener("keyup", (e) => {
    input.keys.delete(e.key.toLowerCase());
    input.codes.delete(e.code.toLowerCase());
  });

  SPELLS.forEach((s, i) => {
    const token = document.createElement("div");
    token.className = "spell";
    token.textContent = `P1 ${s.key}: ${s.name} | P2 ${s.keyP2}`;
    app.spellPanel.appendChild(token);

    const b = document.createElement("button");
    b.innerHTML = `<span class="keycap">${s.key.toUpperCase()}</span><span class="touchLabel">${s.name.toUpperCase()}</span>`;
    b.title = s.name;
    b.addEventListener("pointerdown", (e) => {
      e.preventDefault();
      if (scene === "playing" && run) castSpell(run.players[0], i);
    });
    app.spellButtons.appendChild(b);
  });
  const healToken = document.createElement("div");
  healToken.className = "spell";
  healToken.textContent = `P1 ${HEAL_KEY.toUpperCase()}: Heal`;
  app.spellPanel.appendChild(healToken);

  setupTouchPad();
  hydrateCreatorForm();
  refreshMenuState();
}

function setupTouchPad() {
  const state = { active: false, cx: 0, cy: 0 };

  app.movePad.addEventListener("pointerdown", (e) => {
    state.active = true;
    state.cx = e.clientX;
    state.cy = e.clientY;
    app.movePad.setPointerCapture(e.pointerId);
  });

  app.movePad.addEventListener("pointermove", (e) => {
    if (!state.active) return;
    const dx = (e.clientX - state.cx) / 32;
    const dy = (e.clientY - state.cy) / 32;
    input.p1TouchDir.x = clamp(dx, -1, 1);
    input.p1TouchDir.y = clamp(dy, -1, 1);
  });

  const reset = () => {
    state.active = false;
    input.p1TouchDir.x = 0;
    input.p1TouchDir.y = 0;
  };

  app.movePad.addEventListener("pointerup", reset);
  app.movePad.addEventListener("pointercancel", reset);

  if (app.touchSprintBtn) {
    const enableSprint = (e) => {
      e.preventDefault();
      input.touchSprint = true;
    };
    const disableSprint = (e) => {
      e.preventDefault();
      input.touchSprint = false;
    };
    app.touchSprintBtn.addEventListener("pointerdown", enableSprint);
    app.touchSprintBtn.addEventListener("pointerup", disableSprint);
    app.touchSprintBtn.addEventListener("pointercancel", disableSprint);
    app.touchSprintBtn.addEventListener("pointerleave", disableSprint);
  }

  if (app.touchPauseBtn) {
    app.touchPauseBtn.addEventListener("pointerdown", (e) => {
      e.preventDefault();
      if (scene === "playing") setScene("pause");
      else if (scene === "pause") setScene("playing");
    });
  }

  if (app.touchHealBtn) {
    app.touchHealBtn.addEventListener("pointerdown", (e) => {
      e.preventDefault();
      if (scene === "playing" && run?.players?.[0]) tryHeal(run.players[0]);
    });
  }
}

function hydrateCreatorForm() {
  const c = save.character;
  document.getElementById("skinTone").value = c.skinTone;
  document.getElementById("facialFeatures").value = c.facialFeatures;
  document.getElementById("hair").value = c.hair;
  document.getElementById("build").value = c.build;
  document.getElementById("sex").value = c.sex;
  document.getElementById("height").value = c.height;
}

function saveCharacterFromForm() {
  save.character = {
    skinTone: document.getElementById("skinTone").value,
    facialFeatures: document.getElementById("facialFeatures").value,
    hair: document.getElementById("hair").value,
    build: document.getElementById("build").value,
    sex: document.getElementById("sex").value,
    height: document.getElementById("height").value
  };
  persistSave();
  setNotice("Character saved.", 1.5);
  setScene("menu");
}

function refreshMenuState() {
  app.plusModeBtn.disabled = !save.unlockedPlus;
  app.plusModeBtn.textContent = save.unlockedPlus ? "+Mode (Keep Levels)" : "+Mode (Locked)";
}

function resizeCanvas() {
  const dpr = Math.min(3, window.devicePixelRatio || 1);
  app.canvas.width = Math.floor(window.innerWidth * dpr);
  app.canvas.height = Math.floor(window.innerHeight * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

function setScene(next) {
  scene = next;
  if (next !== "playing") {
    input.touchSprint = false;
    input.p1TouchDir.x = 0;
    input.p1TouchDir.y = 0;
  }
  for (const overlay of [app.menu, app.creator, app.pause, app.end]) {
    overlay.classList.remove("visible");
  }
  app.hud.classList.toggle("hidden", next !== "playing" && next !== "pause");
  app.touchControls.classList.toggle("hidden", !isTouchDevice() || (next !== "playing" && next !== "pause"));

  if (next === "menu") app.menu.classList.add("visible");
  if (next === "creator") app.creator.classList.add("visible");
  if (next === "pause") {
    app.pause.classList.add("visible");
    fillPauseScreen();
  }
  if (next === "end") app.end.classList.add("visible");
}

function startRun(plusMode) {
  run = {
    plusMode,
    coop: app.coopToggle.checked,
    levelIndex: 1,
    players: [],
    enemies: [],
    projectiles: [],
    pickups: [],
    combatLog: { kills: 0, bosses: 0 },
    totalDistance: 0,
    startMs: null,
    levelState: null
  };

  const baseLevel = plusMode ? clamp(save.persistentLevel, 1, 10) : 1;
  run.players.push(createPlayer(1, save.character, baseLevel, 0));
  if (run.coop) run.players.push(createPlayer(2, save.character, baseLevel, 1));
  run.players.forEach((p) => applyPerkStatBonuses(p, p.level));

  initLevel(1);
  setScene("playing");
  setNotice(run.coop ? "Co-op active. Enemy power is 2.1x." : "Campaign started.", 2.5);
}

function createPlayer(id, character, level, laneOffset) {
  const buildScale = character.build === "s" ? 0.86 : character.build === "l" ? 1.22 : 1;
  const heightScale = character.height === "s" ? 0.9 : character.height === "l" ? 1.12 : 1;
  const hpBase = 220 * buildScale;
  const mpBase = 150 * heightScale;

  return {
    id,
    character,
    level,
    x: 0,
    y: laneOffset === 0 ? -12 : 12,
    radius: 7.5 * buildScale,
    maxHp: hpBase + (level - 1) * 28,
    hp: hpBase + (level - 1) * 28,
    maxMp: mpBase + (level - 1) * 18,
    mp: mpBase + (level - 1) * 18,
    speed: 58 + (level - 1) * 1.9,
    cooldowns: SPELLS.map(() => 0),
    healCooldown: 0,
    appliedPerks: new Set(),
    alive: true
  };
}

function initLevel(levelIndex) {
  run.levelIndex = levelIndex;
  run.enemies = [];
  run.projectiles = [];
  run.pickups = [];

  run.players.forEach((p, i) => {
    p.x = 0;
    p.y = i === 0 ? -10 : 10;
    p.hp = Math.min(p.maxHp, p.hp + p.maxHp * 0.4);
    p.mp = Math.min(p.maxMp, p.mp + p.maxMp * 0.5);
  });

  run.levelState = {
    nextTrashSpawnM: START_LINE_M + TRASH_SPAWN_INTERVAL_M,
    miniSpawned: new Set(),
    miniDefeated: new Set(),
    bigSpawned: false,
    bigDefeated: false,
    finalDefeated: false,
    journeyStarted: false,
    startLineM: START_LINE_M,
    levelStartMs: performance.now()
  };
}

function loop(ts) {
  const dt = Math.min(0.05, (ts - lastTs) / 1000 || 0);
  lastTs = ts;

  if ((scene === "playing" || scene === "pause") && run) {
    if (scene === "playing") {
      tickGame(dt);
    }
    renderGame(dt);
    updateHud();
  } else {
    renderMenuBackdrop(dt);
  }

  if (notice.timer > 0) {
    notice.timer -= dt;
  }

  requestAnimationFrame(loop);
}

function tickGame(dt) {
  const alivePlayers = run.players.filter((p) => p.alive);
  if (!alivePlayers.length) {
    endRun(false, "Your party was defeated.");
    return;
  }

  updatePlayers(dt);
  updateJourneyState();
  updateSpawns();
  updateEnemies(dt);
  updateCompanions(dt);
  updateProjectiles(dt);
  updatePickups(dt);

  const leadX = Math.max(...alivePlayers.map((p) => p.x));
  run.totalDistance += Math.max(0, leadX - run.totalDistance);

  if (run.levelIndex < LEVEL_COUNT) {
    if (leadX >= LEVEL_LENGTH_M - 20 && !run.levelState.bigDefeated) {
      clampPartyAtGate();
      setNotice("The level guardian blocks your path.", 0.35);
    }
    if (leadX >= LEVEL_LENGTH_M && run.levelState.bigDefeated) {
      completeCurrentLevel();
    }
  } else {
    if (leadX >= LEVEL_LENGTH_M - 20 && !run.levelState.finalDefeated) {
      clampPartyAtGate();
      setNotice("Final boss still stands.", 0.35);
    }
    if (leadX >= LEVEL_LENGTH_M && run.levelState.finalDefeated) {
      endRun(true, "Olympian Ascension complete. +Mode unlocked.");
    }
  }

  cameraX = leadX * PX_PER_M - window.innerWidth * 0.36;
}

function clampPartyAtGate() {
  run.players.forEach((p) => {
    p.x = Math.min(p.x, LEVEL_LENGTH_M - 21);
  });
}

function completeCurrentLevel() {
  const clearedForLevel = run.levelState.miniDefeated.size === MINI_BOSS_MARKERS.length && run.levelState.bigDefeated;

  if (clearedForLevel) {
    run.players.forEach((p) => {
      if (p.level < 10) {
        p.level += 1;
        p.maxHp += 28;
        p.maxMp += 18;
        p.hp = p.maxHp;
        p.mp = p.maxMp;
        p.speed += 1.8;
        applyPerkStatBonuses(p, p.level);
        if (PERKS[p.level] && p.id === 1) {
          setNotice(`Perk ${p.level}: ${PERKS[p.level]}`, 3.2, "top");
        }
      }
    });
    save.persistentLevel = Math.max(save.persistentLevel, run.players[0].level);
    setNotice(`Level clear complete. Party leveled to ${run.players[0].level}.`, 3);
  } else {
    setNotice("Level completed without full boss clear. No level gained.", 3);
  }

  initLevel(run.levelIndex + 1);
}

function endRun(victory, summary) {
  const startedAt = run.startMs || performance.now();
  const elapsedSec = Math.floor((performance.now() - startedAt) / 1000);
  const score = calcScore(victory, elapsedSec);

  save.highScores.push({
    score,
    date: new Date().toISOString().slice(0, 10),
    level: run.levelIndex,
    coop: run.coop,
    plus: run.plusMode
  });

  save.highScores = save.highScores.sort((a, b) => b.score - a.score).slice(0, 10);

  if (victory) {
    save.unlockedPlus = true;
    if (!save.bestClearTimeSec || elapsedSec < save.bestClearTimeSec) save.bestClearTimeSec = elapsedSec;
  }

  persistSave();
  refreshMenuState();

  app.endTitle.textContent = victory ? "Victory" : "Defeat";
  app.endSummary.textContent = `${summary} Score: ${score}. Duration: ${elapsedSec}s.`;
  setScene("end");
}

function calcScore(victory, elapsedSec) {
  let score = 0;
  score += run.combatLog.kills * 20;
  score += run.combatLog.bosses * 880;
  score += Math.floor(run.totalDistance * 1.75);
  score += (run.players[0]?.level || 1) * 600;
  if (run.plusMode) score += 1500;
  if (run.coop) score += 1200;
  if (victory) score += 4000;
  score -= elapsedSec * 2;
  return Math.max(0, Math.floor(score));
}

function updatePlayers(dt) {
  const p1 = run.players[0];
  const p2 = run.players[1];

  if (p1?.alive) {
    const dir = movementFromInputP1();
    movePlayer(p1, dir, dt);
    handleSpellInput(p1, false);
    if (input.keys.has(HEAL_KEY)) tryHeal(p1);
  }

  if (p2?.alive) {
    const dir2 = movementFromInputP2();
    movePlayer(p2, dir2, dt);
    handleSpellInput(p2, true);
  }

  run.players.forEach((p) => {
    p.mp = clamp(p.mp + dt * 6.5, 0, p.maxMp);
    p.cooldowns = p.cooldowns.map((c) => Math.max(0, c - dt));
    p.healCooldown = Math.max(0, p.healCooldown - dt);
    if (p.hp <= 0) p.alive = false;
  });
}

function movementFromInputP1() {
  let x = 0;
  let y = 0;
  if (input.keys.has("w")) y -= 1;
  if (input.keys.has("s")) y += 1;
  if (input.keys.has("a")) x -= 1;
  if (input.keys.has("d")) x += 1;

  x += input.p1TouchDir.x;
  y += input.p1TouchDir.y;

  return normalizeVec(x, y);
}

function movementFromInputP2() {
  let x = 0;
  let y = 0;
  if (input.keys.has("arrowup")) y -= 1;
  if (input.keys.has("arrowdown")) y += 1;
  if (input.keys.has("arrowleft")) x -= 1;
  if (input.keys.has("arrowright")) x += 1;
  return normalizeVec(x, y);
}

function movePlayer(player, dir, dt) {
  const sprintActive = input.codes.has("space") || input.touchSprint;
  const sprintMul = hasPerk(1) && sprintActive && player.id === 1 ? 1.65 : 1;
  player.x = clamp(player.x + dir.x * player.speed * sprintMul * dt, 0, LEVEL_LENGTH_M + 2);
  player.y = clamp(player.y + dir.y * player.speed * dt, -62, 62);
}

function handleSpellInput(player, isP2) {
  SPELLS.forEach((spell, idx) => {
    const key = isP2 ? spell.keyP2 : spell.key;
    if (input.keys.has(key)) castSpell(player, idx);
  });
}

function castSpell(player, spellIdx) {
  if (!player?.alive) return;
  const spell = SPELLS[spellIdx];
  const manaCost = effectiveManaCost(spell);
  if (player.cooldowns[spellIdx] > 0 || player.mp < manaCost) return;

  const target = nearestEnemy(player, 240);
  const dir = target ? normalizeVec(target.x - player.x, target.y - player.y) : { x: 1, y: 0 };

  player.mp -= manaCost;
  player.cooldowns[spellIdx] = spell.cooldown;

  if (spell.selfShield) {
    player.hp = Math.min(player.maxHp, player.hp + spell.selfShield);
  }

  if (spell.meleeRange) {
    for (const enemy of run.enemies) {
      if (!enemy.alive) continue;
      if (distance(player.x, player.y, enemy.x, enemy.y) <= spell.meleeRange + enemy.radius) {
        applySpellHit(enemy, spell, player);
        if (spell.knockback) enemy.x += spell.knockback;
      }
    }
    return;
  }

  run.projectiles.push({
    owner: player.id,
    spellIdx,
    x: player.x,
    y: player.y,
    vx: dir.x * (spell.projectileSpeed || 220),
    vy: dir.y * (spell.projectileSpeed || 220),
    ttl: spell.projectileTtl || 1.3
  });
}

function tryHeal(player) {
  if (!player?.alive) return;
  if (player.healCooldown > 0) return;
  if (player.mp < HEAL_MANA_COST) return;
  if (player.hp >= player.maxHp) return;
  player.mp -= HEAL_MANA_COST;
  player.healCooldown = HEAL_COOLDOWN_S;
  player.hp = Math.min(player.maxHp, player.hp + player.maxHp * HEAL_PERCENT);
  if (player.id === 1) setNotice("Heal activated.", 0.9, "top");
}

function updateSpawns() {
  if (!run.levelState.journeyStarted) return;
  const lead = Math.max(...run.players.filter((p) => p.alive).map((p) => p.x));

  while (run.levelState.nextTrashSpawnM <= Math.min(lead + 170, LEVEL_LENGTH_M - 15)) {
    spawnEnemy("trash", run.levelState.nextTrashSpawnM, rand(-55, 55));
    run.levelState.nextTrashSpawnM += TRASH_SPAWN_INTERVAL_M;
  }

  for (const marker of MINI_BOSS_MARKERS) {
    if (!run.levelState.miniSpawned.has(marker) && lead >= marker - 40 && run.levelIndex <= 10) {
      spawnEnemy("mini", marker, rand(-28, 28));
      run.levelState.miniSpawned.add(marker);
      setNotice(`Mini-boss sighted at ${marker}m.`, 1.8);
    }
  }

  if (run.levelIndex <= 10 && !run.levelState.bigSpawned && lead >= LEVEL_LENGTH_M - 70) {
    spawnEnemy("big", LEVEL_LENGTH_M - 6, 0);
    run.levelState.bigSpawned = true;
    setNotice("Level boss engaged.", 2.2);
  }

  if (run.levelIndex === 11 && !run.levelState.bigSpawned && lead >= LEVEL_LENGTH_M - 120) {
    spawnEnemy("final", LEVEL_LENGTH_M - 8, 0);
    run.levelState.bigSpawned = true;
    setNotice("Final boss: Archon of Olympus.", 2.4);
  }

  run.enemies = run.enemies.filter((e) => e.alive && e.x > lead - 130);
}

function spawnEnemy(type, x, y) {
  const lvl = run.levelIndex;
  const baseScale = run.coop ? DIFFICULTY_COOP_MULT : 1;

  const template = {
    trash: { hp: 34 + lvl * 6, speed: 28 + lvl * 0.8, damage: 16 + lvl * 1.2, radius: 6.2, color: "#a26a52", score: 1 },
    mini: { hp: 760 + lvl * 130, speed: 20 + lvl * 0.4, damage: 72 + lvl * 4.2, radius: 10.8, color: "#b67a3c", score: 40 },
    big: { hp: 700 + lvl * 130, speed: 19 + lvl * 0.5, damage: 52 + lvl * 3.8, radius: 13, color: "#bd4a4a", score: 120 },
    final: { hp: 4100, speed: 26, damage: 84, radius: 18, color: "#d4c977", score: 500 }
  }[type];

  run.enemies.push({
    type,
    x,
    y,
    hp: template.hp * baseScale,
    maxHp: template.hp * baseScale,
    speed: template.speed,
    damage: template.damage * baseScale,
    radius: template.radius,
    color: template.color,
    score: template.score,
    alive: true,
    slowTimer: 0,
    burnTimer: 0,
    resistanceType: type === "trash" ? pickRandom(RESISTANCE_TYPES) : null,
    spawnX: x,
    borderMinX: type === "mini" ? x - 25 : null,
    borderMaxX: type === "mini" ? x + 25 : null
  });
}

function updateEnemies(dt) {
  for (const enemy of run.enemies) {
    if (!enemy.alive) continue;
    if (enemy.slowTimer > 0) enemy.slowTimer -= dt;
    if (enemy.burnTimer > 0) {
      enemy.burnTimer -= dt;
      enemy.hp -= dt * 8;
    }

    const target = nearestPlayer(enemy);
    if (!target) continue;

    const dir = normalizeVec(target.x - enemy.x, target.y - enemy.y);
    const slowMul = enemy.slowTimer > 0 ? 0.55 : 1;
    enemy.x += dir.x * enemy.speed * slowMul * dt;
    enemy.y += dir.y * enemy.speed * slowMul * dt;
    if (enemy.type === "mini") {
      enemy.x = clamp(enemy.x, enemy.borderMinX, enemy.borderMaxX);
    }

    const dist = distance(enemy.x, enemy.y, target.x, target.y);
    if (dist < enemy.radius + target.radius + 2.5) {
      target.hp -= enemy.damage * dt;
      if (enemy.type !== "trash") {
        target.mp = Math.max(0, target.mp - 5 * dt);
      }
    }
  }
}

function updateProjectiles(dt) {
  for (const projectile of run.projectiles) {
    projectile.x += projectile.vx * dt;
    projectile.y += projectile.vy * dt;
    projectile.ttl -= dt;

    const spell = SPELLS[projectile.spellIdx];

    for (const enemy of run.enemies) {
      if (!enemy.alive) continue;
      const hitDist = distance(projectile.x, projectile.y, enemy.x, enemy.y);
      if (hitDist <= enemy.radius + 2) {
        const owner = run.players.find((p) => p.id === projectile.owner);
        applySpellHit(enemy, spell, owner);

        if (spell.knockback) enemy.x += spell.knockback;

        if (spell.chain) {
          for (const chained of run.enemies) {
            if (chained === enemy || !chained.alive) continue;
            if (distance(enemy.x, enemy.y, chained.x, chained.y) < 22) {
              const ownerLevel = 1 + (((owner?.level || 1) - 1) * 0.12);
              const baseDamage = spell.damage * spell.chain * ownerLevel;
              chained.hp -= applyEnemyResistance(chained, spell.type, baseDamage);
            }
          }
        }

        projectile.ttl = 0;
        break;
      }
    }
  }

  run.projectiles = run.projectiles.filter((p) => p.ttl > 0);

  for (const enemy of run.enemies) {
    if (!enemy.alive && enemy.hp > 0) continue;
    if (enemy.alive && enemy.hp <= 0) {
      enemy.alive = false;
      run.combatLog.kills += enemy.score;
      if (enemy.type === "mini") run.levelState.miniDefeated.add(findClosestMarker(enemy.x));
      if (enemy.type === "big") {
        run.levelState.bigDefeated = true;
        run.combatLog.bosses += 1;
      }
      if (enemy.type === "final") {
        run.levelState.finalDefeated = true;
        run.combatLog.bosses += 3;
      }

      if (enemy.type !== "trash") run.combatLog.bosses += enemy.type === "mini" ? 0.4 : 0;

      const dropRoll = Math.random();
      if (dropRoll < 0.58 || enemy.type !== "trash") {
        run.pickups.push({
          x: enemy.x,
          y: enemy.y,
          kind: dropRoll < 0.45 ? "hp" : "mp",
          amount: enemy.type === "trash" ? 24 : 80,
          ttl: 20
        });
      }
    }
  }
}

function updatePickups(dt) {
  for (const pickup of run.pickups) {
    pickup.ttl -= dt;

    for (const p of run.players) {
      if (!p.alive) continue;
      if (distance(p.x, p.y, pickup.x, pickup.y) <= p.radius + 4) {
        if (pickup.kind === "hp") p.hp = Math.min(p.maxHp, p.hp + pickup.amount);
        if (pickup.kind === "mp") p.mp = Math.min(p.maxMp, p.mp + pickup.amount);
        pickup.ttl = 0;
      }
    }
  }

  run.pickups = run.pickups.filter((p) => p.ttl > 0);
}

function updateJourneyState() {
  if (!run?.levelState) return;
  if (run.levelState.journeyStarted) return;
  const leadX = Math.max(...run.players.filter((p) => p.alive).map((p) => p.x));
  if (leadX >= run.levelState.startLineM) {
    run.levelState.journeyStarted = true;
    if (!run.startMs) run.startMs = performance.now();
    setNotice("Journey started. Enemies advancing.", 2.2);
  }
}

function updateCompanions(dt) {
  if (!run.levelState.journeyStarted) return;

  if (hasPerk(4)) {
    run.levelState.sidekickTimer = (run.levelState.sidekickTimer || 3) - dt;
    if (run.levelState.sidekickTimer <= 0) {
      run.levelState.sidekickTimer = 3;
      const target = findCompanionTarget();
      if (target) target.hp -= target.maxHp * 0.1;
    }
  }

  if (hasPerk(10)) {
    run.levelState.dragonTimer = (run.levelState.dragonTimer || 4) - dt;
    if (run.levelState.dragonTimer <= 0) {
      run.levelState.dragonTimer = 4;
      const leadX = Math.max(...run.players.filter((p) => p.alive).map((p) => p.x));
      for (const enemy of run.enemies) {
        if (!enemy.alive || enemy.type !== "trash") continue;
        if (enemy.x >= leadX - 40 && enemy.x <= leadX + 180) {
          enemy.hp = 0;
        }
      }
    }
  }
}

function nearestPlayer(enemy) {
  let best = null;
  let bestDist = Infinity;
  for (const p of run.players) {
    if (!p.alive) continue;
    const d = distance(enemy.x, enemy.y, p.x, p.y);
    if (d < bestDist) {
      bestDist = d;
      best = p;
    }
  }
  return best;
}

function nearestEnemy(player, maxDist) {
  let best = null;
  let bestDist = maxDist;
  for (const enemy of run.enemies) {
    if (!enemy.alive) continue;
    const d = distance(enemy.x, enemy.y, player.x, player.y);
    if (d < bestDist) {
      bestDist = d;
      best = enemy;
    }
  }
  return best;
}

function findClosestMarker(x) {
  let winner = MINI_BOSS_MARKERS[0];
  let best = Infinity;
  for (const m of MINI_BOSS_MARKERS) {
    const d = Math.abs(m - x);
    if (d < best) {
      best = d;
      winner = m;
    }
  }
  return winner;
}

function renderGame(dt) {
  const w = window.innerWidth;
  const h = window.innerHeight;

  ctx.clearRect(0, 0, w, h);

  drawWorld(w, h);

  for (const pickup of run.pickups) drawPickup(pickup);
  for (const enemy of run.enemies) drawEnemy(enemy);
  for (const projectile of run.projectiles) drawProjectile(projectile);
  for (const p of run.players) drawPlayer(p);

  if (notice.timer > 0) {
    ctx.fillStyle = "rgba(8, 12, 19, 0.8)";
    const topMode = notice.placement === "top";
    const bannerY = topMode ? 8 : 72;
    const bannerW = topMode ? w * 0.62 : w * 0.44;
    const bannerX = (w - bannerW) * 0.5;
    ctx.fillRect(bannerX, bannerY, bannerW, 32);
    ctx.fillStyle = "#f5e8b5";
    ctx.font = "600 16px Cinzel";
    ctx.textAlign = "center";
    ctx.fillText(notice.text, w * 0.5, bannerY + 21);
  }

  if (scene === "pause") {
    ctx.fillStyle = "rgba(8, 11, 18, 0.55)";
    ctx.fillRect(0, 0, w, h);
  }

  if (scene === "playing") {
    const p1 = run.players[0];
    if (p1 && p1.hp / p1.maxHp < 0.22) {
      ctx.fillStyle = "rgba(214, 92, 92, 0.14)";
      ctx.fillRect(0, 0, w, h);
    }
  }
}

function drawWorld(w, h) {
  const roadY = h * 0.58;
  const roadH = h * 0.33;

  const grad = ctx.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0, "#2b425f");
  grad.addColorStop(0.5, "#1a2433");
  grad.addColorStop(1, "#141921");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);

  ctx.fillStyle = "#41566f";
  for (let i = -1; i <= 8; i += 1) {
    const x = ((i * 220 - (cameraX * 0.18) % 220) + w) % (w + 240) - 120;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x + 40, 0);
    ctx.lineTo(x - 30, h * 0.48);
    ctx.lineTo(x - 90, h * 0.48);
    ctx.closePath();
    ctx.fill();
  }

  ctx.fillStyle = "#2f3a28";
  ctx.fillRect(0, roadY, w, roadH);

  ctx.strokeStyle = "rgba(234, 218, 172, 0.35)";
  ctx.lineWidth = 2;
  for (let x = -((cameraX * PX_PER_M) % 60); x < w; x += 60) {
    ctx.beginPath();
    ctx.moveTo(x, roadY + roadH * 0.5);
    ctx.lineTo(x + 28, roadY + roadH * 0.5);
    ctx.stroke();
  }

  drawMarkers(roadY + 20);
  drawStartLine(roadY + 18);
  drawMiniBossBorders(roadY + 16);
}

function drawMarkers(screenY) {
  if (!run) return;
  ctx.font = "12px Marcellus";
  ctx.textAlign = "center";

  for (const marker of MINI_BOSS_MARKERS) {
    const x = worldToScreenX(marker);
    if (x < -40 || x > window.innerWidth + 40) continue;
    const defeated = run.levelState.miniDefeated.has(marker);
    ctx.fillStyle = defeated ? "#74cc83" : "#e3c177";
    ctx.fillRect(x - 2, screenY - 30, 4, 30);
    ctx.fillText(`${marker}m`, x, screenY - 34);
  }

  const bossX = worldToScreenX(LEVEL_LENGTH_M);
  if (bossX > -80 && bossX < window.innerWidth + 80) {
    ctx.fillStyle = run.levelIndex === 11 ? "#dbcf85" : "#d56e6e";
    ctx.fillRect(bossX - 3, screenY - 38, 6, 38);
    ctx.fillText(run.levelIndex === 11 ? "Final" : "Boss", bossX, screenY - 42);
  }
}

function drawStartLine(screenY) {
  const x = worldToScreenX(run.levelState.startLineM);
  if (x < -80 || x > window.innerWidth + 80) return;
  ctx.fillStyle = run.levelState.journeyStarted ? "#70bf77" : "#eacb7a";
  ctx.fillRect(x - 4, screenY - 36, 8, 36);
  ctx.fillStyle = "#f3e9cb";
  ctx.font = "10px Cinzel";
  ctx.textAlign = "center";
  ctx.fillText(run.levelState.journeyStarted ? "START CLEARED" : "START", x, screenY - 40);
}

function drawMiniBossBorders(screenY) {
  for (const enemy of run.enemies) {
    if (!enemy.alive || enemy.type !== "mini") continue;
    const minX = worldToScreenX(enemy.borderMinX);
    const maxX = worldToScreenX(enemy.borderMaxX);
    ctx.strokeStyle = "rgba(215, 121, 78, 0.65)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(minX, screenY - 28);
    ctx.lineTo(minX, screenY + 10);
    ctx.moveTo(maxX, screenY - 28);
    ctx.lineTo(maxX, screenY + 10);
    ctx.stroke();
  }
}

function drawPlayer(p) {
  if (!p.alive) return;
  const x = worldToScreenX(p.x);
  const y = worldToScreenY(p.y);
  const hair = HAIR[p.character.hair] || "#2c2118";

  ctx.beginPath();
  ctx.arc(x, y, p.radius + 1.5, 0, Math.PI * 2);
  ctx.fillStyle = p.id === 1 ? "#a4d8ff" : "#ffd4a4";
  ctx.fill();

  ctx.beginPath();
  ctx.arc(x, y, p.radius, 0, Math.PI * 2);
  ctx.fillStyle = p.character.skinTone;
  ctx.fill();

  ctx.fillStyle = hair;
  ctx.fillRect(x - p.radius, y - p.radius - 4, p.radius * 2, 4);

  if (p.character.facialFeatures === "scarred") {
    ctx.strokeStyle = "#6d2b2b";
    ctx.beginPath();
    ctx.moveTo(x - 2, y - 3);
    ctx.lineTo(x + 2, y + 2);
    ctx.stroke();
  }

  ctx.fillStyle = "#f5ead6";
  ctx.font = "11px Marcellus";
  ctx.textAlign = "center";
  ctx.fillText(`P${p.id} Lv${p.level}`, x, y - p.radius - 10);
}

function drawEnemy(e) {
  if (!e.alive) return;
  const x = worldToScreenX(e.x);
  const y = worldToScreenY(e.y);

  ctx.beginPath();
  ctx.arc(x, y, e.radius, 0, Math.PI * 2);
  ctx.fillStyle = e.color;
  ctx.fill();

  ctx.fillStyle = "rgba(8, 11, 18, 0.8)";
  ctx.fillRect(x - e.radius, y - e.radius - 7, e.radius * 2, 4);
  ctx.fillStyle = "#cd5f5f";
  ctx.fillRect(x - e.radius, y - e.radius - 7, (e.hp / e.maxHp) * e.radius * 2, 4);

  if (e.type !== "trash") {
    ctx.fillStyle = "#f7e5c2";
    ctx.font = "10px Cinzel";
    ctx.textAlign = "center";
    ctx.fillText(e.type.toUpperCase(), x, y + e.radius + 11);
  } else if (e.resistanceType) {
    ctx.fillStyle = "rgba(12, 16, 24, 0.7)";
    ctx.fillRect(x - e.radius, y + e.radius + 2, e.radius * 2, 10);
    ctx.fillStyle = "#f7e5c2";
    ctx.font = "9px Cinzel";
    ctx.textAlign = "center";
    ctx.fillText(`RES ${e.resistanceType[0].toUpperCase()}`, x, y + e.radius + 10);
  }
}

function drawProjectile(p) {
  const spell = SPELLS[p.spellIdx];
  const x = worldToScreenX(p.x);
  const y = worldToScreenY(p.y);
  ctx.beginPath();
  ctx.arc(x, y, 3.4, 0, Math.PI * 2);
  ctx.fillStyle = spell.color;
  ctx.fill();
}

function drawPickup(p) {
  const x = worldToScreenX(p.x);
  const y = worldToScreenY(p.y);
  ctx.fillStyle = p.kind === "hp" ? "#e06a6a" : "#6bbde0";
  ctx.fillRect(x - 4, y - 4, 8, 8);
}

function renderMenuBackdrop(dt) {
  const w = window.innerWidth;
  const h = window.innerHeight;
  ctx.clearRect(0, 0, w, h);

  ctx.fillStyle = "#111721";
  ctx.fillRect(0, 0, w, h);

  const t = performance.now() * 0.00023;
  for (let i = 0; i < 80; i += 1) {
    const x = ((i * 97.7 + t * 80) % (w + 200)) - 100;
    const y = 40 + (i * 41.3) % (h - 80);
    ctx.fillStyle = `rgba(236, 216, 164, ${0.1 + ((i % 6) / 11)})`;
    ctx.fillRect(x, y, 2, 2);
  }

  if (notice.timer > 0) {
    ctx.fillStyle = "#f6e2a2";
    ctx.font = "16px Cinzel";
    ctx.textAlign = "center";
    ctx.fillText(notice.text, w * 0.5, h - 30);
  }
}

function worldToScreenX(xMeters) {
  return xMeters * PX_PER_M - cameraX;
}

function worldToScreenY(yMeters) {
  return window.innerHeight * 0.72 + yMeters * 2.3;
}

function fillPauseScreen() {
  if (!run) return;
  const alive = run.players.filter((p) => p.alive).length;
  app.pauseStats.textContent = `Level ${run.levelIndex}/11 | Distance ${Math.floor(run.totalDistance)}m | Party alive: ${alive}/${run.players.length}`;

  app.highScoreList.innerHTML = "";
  if (!save.highScores.length) {
    const li = document.createElement("li");
    li.textContent = "No scores yet.";
    app.highScoreList.appendChild(li);
    return;
  }

  save.highScores.forEach((item) => {
    const li = document.createElement("li");
    li.textContent = `${item.score} pts | L${item.level} | ${item.plus ? "+" : "Base"} | ${item.coop ? "Co-op" : "Solo"} | ${item.date}`;
    app.highScoreList.appendChild(li);
  });
}

function updateHud() {
  if (!run || !run.players[0]) return;
  const p1 = run.players[0];
  app.hpBar.style.width = `${Math.max(0, (p1.hp / p1.maxHp) * 100)}%`;
  app.mpBar.style.width = `${Math.max(0, (p1.mp / p1.maxMp) * 100)}%`;

  const mini = run.levelState.miniDefeated.size;
  const bossState = run.levelIndex === 11 ? run.levelState.finalDefeated : run.levelState.bigDefeated;
  const sprintState = hasPerk(1) ? "Sprint:Space/Touch" : "No Sprint";
  const started = run.levelState.journeyStarted ? "On Route" : "Cross Start Line";
  app.meta.textContent = `L${run.levelIndex}/11 | Player Lv ${p1.level}/10 | ${started} | ${sprintState} | Distance ${Math.floor(p1.x)}/${LEVEL_LENGTH_M}m | Mini ${mini}/3 | Boss ${bossState ? "down" : "up"}`;
}

function quitToMenu() {
  run = null;
  setScene("menu");
}

function setNotice(text, duration, placement = "inline") {
  notice.text = text;
  notice.timer = duration;
  notice.placement = placement;
}

function normalizeVec(x, y) {
  const mag = Math.hypot(x, y);
  if (mag === 0) return { x: 0, y: 0 };
  return { x: x / mag, y: y / mag };
}

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

function distance(ax, ay, bx, by) {
  return Math.hypot(ax - bx, ay - by);
}

function rand(min, max) {
  return min + Math.random() * (max - min);
}

function pickRandom(values) {
  return values[Math.floor(Math.random() * values.length)];
}

function applySpellHit(enemy, spell, owner) {
  const baseDamage = effectiveSpellDamage(spell, owner);
  const dealt = applyEnemyResistance(enemy, spell.type, baseDamage);
  enemy.hp -= dealt;

  if (spell.slow) enemy.slowTimer = Math.max(enemy.slowTimer, spell.slow);
  if (spell.burn) enemy.burnTimer = Math.max(enemy.burnTimer, spell.burn);
  if (spell.type === "arrow" && hasPerk(7)) {
    for (const nearby of run.enemies) {
      if (!nearby.alive || nearby === enemy) continue;
      if (distance(enemy.x, enemy.y, nearby.x, nearby.y) <= 18) {
        nearby.hp -= applyEnemyResistance(nearby, spell.type, dealt * 0.5);
      }
    }
  }
}

function applyEnemyResistance(enemy, attackType, damage) {
  if (enemy.type === "trash" && enemy.resistanceType === attackType) {
    return damage * 0.35;
  }
  return damage;
}

function isTouchDevice() {
  return window.matchMedia("(pointer: coarse)").matches;
}

function hasPerk(level) {
  return (run?.players?.[0]?.level || 1) >= level;
}

function effectiveSpellDamage(spell, owner) {
  const levelMult = 1 + ((owner?.level || 1) - 1) * 0.12;
  let mult = 1;
  if (spell.type === "arrow") {
    if (hasPerk(7)) mult *= 6;
    else if (hasPerk(2)) mult *= 2;
  }
  if (spell.type === "sword" && hasPerk(3)) mult *= 2;
  if (spell.type === "fireball" && hasPerk(5)) mult *= 5;
  return spell.damage * levelMult * mult;
}

function effectiveManaCost(spell) {
  if (spell.type === "fireball" && hasPerk(5)) return spell.mana * 2;
  return spell.mana;
}

function applyPerkStatBonuses(player, targetLevel) {
  for (let level = 1; level <= targetLevel; level += 1) {
    if (player.appliedPerks.has(level)) continue;
    if (level === 6) {
      player.maxHp *= 1.25;
      player.hp = player.maxHp;
    }
    if (level === 8) {
      player.maxMp *= 1.25;
      player.mp = player.maxMp;
    }
    if (level === 9) {
      player.speed *= 1.5;
    }
    player.appliedPerks.add(level);
  }
}

function findCompanionTarget() {
  let best = null;
  let bestDist = Infinity;
  const lead = run.players.filter((p) => p.alive).sort((a, b) => b.x - a.x)[0];
  if (!lead) return null;
  for (const enemy of run.enemies) {
    if (!enemy.alive) continue;
    const d = distance(enemy.x, enemy.y, lead.x, lead.y);
    if (d < bestDist && d < 220) {
      bestDist = d;
      best = enemy;
    }
  }
  return best;
}
