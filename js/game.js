document.addEventListener('DOMContentLoaded', () => {
  const gameContainer = document.getElementById('game-container');
  const dialogueText = document.getElementById('dialogue-text');
  const dialogueBox = document.querySelector('.dialogue-box');
  const buttons = Array.from(document.querySelectorAll('.ui-btn'));
  const startScreen = document.getElementById('start-screen');
  const encounterOverlay = document.getElementById('encounter-overlay');
  const encounterSoul = document.getElementById('encounter-soul');
  const attackArena = document.getElementById('attack-arena');

  const FRISK_TARGET = { x: 450, y: 200 };

  const isMobile = (() => {
    const coarse = !!(window.matchMedia && window.matchMedia('(pointer: coarse)').matches);
    const touch = navigator.maxTouchPoints > 0;
    const ua = /Android|iPhone|iPad|iPod|Mobi/i.test(navigator.userAgent);
    return (coarse && touch) || ua;
  })();

  const joystick = { x: 0, y: 0 };
  document.documentElement.classList.toggle('is-mobile', isMobile);

  function fitGameToScreen() {
    const vv = window.visualViewport;
    const w = vv ? vv.width : window.innerWidth;
    const h = vv ? vv.height : window.innerHeight;
    const fit = Math.min(w / gameContainer.offsetWidth, h / gameContainer.offsetHeight);
    const scale = isMobile ? fit : Math.min(1, fit);
    const short = Math.min(w, h);
    const rs = document.documentElement.style;
    rs.setProperty('--game-scale', String(scale));
    rs.setProperty('--joy-size', `${Math.round(Math.max(110, Math.min(200, short * 0.34)))}px`);
    rs.setProperty('--btn-size', `${Math.round(Math.max(60, Math.min(100, short * 0.17)))}px`);
  }

  fitGameToScreen();
  window.addEventListener('resize', fitGameToScreen);
  window.addEventListener('load', fitGameToScreen);
  window.addEventListener('orientationchange', () => setTimeout(fitGameToScreen, 150));
  if (window.visualViewport) window.visualViewport.addEventListener('resize', fitGameToScreen);

  function sendKey(key) {
    gameContainer.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: false, cancelable: true }));
  }

  function setupMobileControls() {
    const root = document.createElement('div');
    root.className = 'mobile-controls';
    root.innerHTML =
      '<div class="joy-zone" id="joy-zone">' +
        '<img class="joy-base" src="assets/sprites/JOYSTICK_BASE.png" alt="" draggable="false">' +
        '<img class="joy-knob" src="assets/sprites/JOYSTICK.png" alt="" draggable="false">' +
      '</div>' +
      '<button class="pad-btn pad-x" id="pad-x" aria-label="X"><img src="assets/sprites/BUTTON_X.png" alt="" draggable="false"></button>' +
      '<button class="pad-btn pad-z" id="pad-z" aria-label="Z"><img src="assets/sprites/BUTTON_Z.png" alt="" draggable="false"></button>';
    document.body.appendChild(root);

    document.addEventListener('touchmove', (e) => e.preventDefault(), { passive: false });
    document.addEventListener('contextmenu', (e) => e.preventDefault());
    document.addEventListener('gesturestart', (e) => e.preventDefault());

    const zone = root.querySelector('#joy-zone');
    const knob = root.querySelector('.joy-knob');
    let joyPointer = null;
    let menuDir = null;
    let menuNextAt = 0;

    const dirFromStick = () => {
      if (Math.hypot(joystick.x, joystick.y) < 0.55) return null;
      if (Math.abs(joystick.x) > Math.abs(joystick.y)) return joystick.x > 0 ? 'ArrowRight' : 'ArrowLeft';
      return joystick.y > 0 ? 'ArrowDown' : 'ArrowUp';
    };

    const moveStick = (e) => {
      const rect = zone.getBoundingClientRect();
      const half = rect.width / 2;
      const dx = e.clientX - (rect.left + half);
      const dy = e.clientY - (rect.top + half);
      const travel = half * 0.5;
      const dist = Math.hypot(dx, dy);
      const clamped = Math.min(dist, travel);
      const nx = dist > 0 ? dx / dist : 0;
      const ny = dist > 0 ? dy / dist : 0;
      knob.style.transform = `translate(${nx * clamped}px, ${ny * clamped}px)`;
      const raw = Math.min(1, dist / travel);
      const mag = raw < 0.15 ? 0 : (raw - 0.15) / 0.85;
      joystick.x = nx * mag;
      joystick.y = ny * mag;

      const dir = dirFromStick();
      if (dir !== menuDir) {
        menuDir = dir;
        menuNextAt = performance.now() + 380;
        if (dir) sendKey(dir);
      }
    };

    const releaseStick = () => {
      joyPointer = null;
      joystick.x = 0;
      joystick.y = 0;
      menuDir = null;
      knob.style.transform = '';
      zone.classList.remove('held');
    };

    zone.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      if (joyPointer !== null) return;
      joyPointer = e.pointerId;
      zone.setPointerCapture(e.pointerId);
      zone.classList.add('held');
      moveStick(e);
    });
    zone.addEventListener('pointermove', (e) => {
      if (e.pointerId === joyPointer) moveStick(e);
    });
    ['pointerup', 'pointercancel', 'lostpointercapture'].forEach((type) => {
      zone.addEventListener(type, (e) => {
        if (e.pointerId === joyPointer) releaseStick();
      });
    });

    setInterval(() => {
      if (menuDir && performance.now() >= menuNextAt) {
        sendKey(menuDir);
        menuNextAt = performance.now() + 170;
      }
    }, 30);

    const bindPad = (el, key) => {
      el.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        el.setPointerCapture(e.pointerId);
        el.classList.add('held');
        sendKey(key);
        if (key === 'z') {
          window.dispatchEvent(new KeyboardEvent('keydown', { key }));
          window.dispatchEvent(new KeyboardEvent('keyup', { key }));
        }
      });
      ['pointerup', 'pointercancel', 'lostpointercapture'].forEach((type) => {
        el.addEventListener(type, () => el.classList.remove('held'));
      });
    };
    bindPad(root.querySelector('#pad-z'), 'z');
    bindPad(root.querySelector('#pad-x'), 'x');
  }

  if (isMobile) {
    setupMobileControls();
    const startText = startScreen.querySelector('p');
    if (startText) startText.textContent = 'TOUCH TO BEGIN';
  }

  function resizeBulletBox(width, height) {
    if (!dialogueBox) return;
    dialogueBox.style.width = typeof width === 'number' ? `${width}px` : width;
    dialogueBox.style.height = typeof height === 'number' ? `${height}px` : height;
  }

  function resetBulletBox() {
    if (!dialogueBox) return;
    dialogueBox.style.width = '100%';
    dialogueBox.style.height = '175px';
    dialogueBox.style.overflow = 'hidden';
    const lingeringElements = dialogueBox.querySelectorAll('.dodge-soul, .human-projectile, .knife-trail, .locket-spinner-clip');
    lingeringElements.forEach(el => el.remove());
    document.querySelectorAll('.slash-layer').forEach(el => el.remove());
  }

  let friskMaxHP = 92;
  let friskCurrentHP = 92;
  let friskKR = 0;
  let hpBarTimeout = null;

  function showFriskHPBar(duration = 2500) {
    const hpBox = document.getElementById('frisk-hp-box');
    if (!hpBox) return;

    hpBox.classList.add('show');

    if (hpBarTimeout) clearTimeout(hpBarTimeout);
    hpBarTimeout = setTimeout(() => {
      if (friskKR <= 0) {
        hpBox.classList.remove('show');
      }
    }, duration);
  }

  function updateFriskHPDisplay() {
    const hpFill = document.getElementById('frisk-hp-fill');
    const hpKR = document.getElementById('frisk-hp-kr');
    if (!hpFill || !hpKR) return;

    const safeHP = Math.max(0, friskCurrentHP - friskKR);
    const yellowPct = Math.max(0, (safeHP / friskMaxHP) * 100);
    const krPct = Math.max(0, (friskKR / friskMaxHP) * 100);

    hpFill.style.width = `${yellowPct}%`;
    hpKR.style.left = `${yellowPct}%`;
    hpKR.style.width = `${krPct}%`;
  }

  function damageFrisk(amount = 1) {
    if (currentState === STATES.GAME_OVER) return;
    if (friskCurrentHP <= 1) {
      killHuman();
      return;
    }

    friskCurrentHP = Math.max(1, friskCurrentHP - amount);
    friskKR = Math.min(30, friskKR + amount);

    updateFriskHPDisplay();
    showFriskHPBar(2500);

    sounds.play('hurt', 0.8);

    const friskEl = document.getElementById('frisk');
    if (friskEl) {
      friskEl.classList.add('hit-shake');
      setTimeout(() => friskEl.classList.remove('hit-shake'), 180);
    }

    spawnDamageNumber(amount);
  }

  function tickDamage(amountPerTick, intervalMs, durationMs) {
    let elapsed = 0;
    const id = setInterval(() => {
      if (currentState === STATES.GAME_OVER) {
        clearInterval(id);
        return;
      }
      damageFrisk(amountPerTick);
      elapsed += intervalMs;
      if (elapsed >= durationMs) clearInterval(id);
    }, intervalMs);
    return id;
  }

  function spawnDamageNumber(amount) {
    if (!attackArena) return;

    const dmg = document.createElement('div');
    dmg.className = 'damage-number';
    dmg.textContent = amount;

    const offsetX = (Math.random() - 0.5) * 24;
    dmg.style.left = `${FRISK_TARGET.x + offsetX}px`;
    dmg.style.top = `${FRISK_TARGET.y - 60}px`;

    attackArena.appendChild(dmg);

    setTimeout(() => {
      dmg.remove();
    }, 800);
  }

  const HEAL_NUMBER_MS = 1600;

  function healFrisk(amount) {
    const actualHeal = Math.min(friskMaxHP - friskCurrentHP, amount);
    friskCurrentHP += actualHeal;
    updateFriskHPDisplay();
    showFriskHPBar(2500);
    return actualHeal;
  }

  function spawnHealNumber(amount) {
    if (!attackArena) return;

    const heal = document.createElement('div');
    heal.className = 'damage-number heal-number';
    heal.textContent = `${amount}`;

    const offsetX = (Math.random() - 0.5) * 24;
    heal.style.left = `${FRISK_TARGET.x + offsetX}px`;
    heal.style.top = `${FRISK_TARGET.y - 60}px`;

    attackArena.appendChild(heal);

    setTimeout(() => {
      heal.remove();
    }, HEAL_NUMBER_MS);
  }

  const SPR = 'assets/sprites/';
  const friskEl = document.getElementById('frisk');
  const friskHeadEl = document.querySelector('.frisk-head');
  const friskTorsoEl = document.querySelector('.frisk-torso');
  const friskLegsEl = document.querySelector('.frisk-legs');

  const FRISK_IDLE_SPRITES = {
    head: `${SPR}FRISK_HEAD_IDLE.png`,
    torso: `${SPR}FRISK_TORSO_IDLE.png`,
    legs: `${SPR}FRISK_LEGS_IDLE.png`
  };

  const FRISK_DODGE_SPRITES = {
    left:  { head: `${SPR}FRISK_HEAD_DODGING_SIDES.png`, torso: `${SPR}FRISK_TORSO_DODGING_LEFT.png`,  legs: `${SPR}FRISK_LEGS_DODGING_SIDES.png`, flip: false },
    right: { head: `${SPR}FRISK_HEAD_DODGING_SIDES.png`, torso: `${SPR}FRISK_TORSO_DODGING_RIGHT.png`, legs: `${SPR}FRISK_LEGS_DODGING_SIDES.png`, flip: true },
    back:  { head: `${SPR}FRISK_HEAD_DOWN.png`,          torso: `${SPR}FRISK_TORSO_DODGING_BACK.png`,  legs: `${SPR}FRISK_LEGS_DODGING_BACK.png`, flip: false }
  };

  const DODGE_ANIM_MS = 480;
  const MISS_ANIM_MS = 700;

  (function applyFriskDodgeCssVars() {
    document.documentElement.style.setProperty('--dodge-ms', `${DODGE_ANIM_MS}ms`);
    document.documentElement.style.setProperty('--miss-ms', `${MISS_ANIM_MS}ms`);
  })();

  let dodgeResetTimeoutId = null;

  function rollFriskDodge() {
    const baseChance = Math.min(0.35, humanDeathCount * 0.05);
    if (humanSpdBuffRounds > 0) {
      const buffedChance = Math.min(0.85, HUMAN_DODGE_CHANCE + humanDeathCount * 0.06);
      return Math.random() < Math.max(baseChance, buffedChance);
    }
    return Math.random() < baseChance;
  }

  function spawnMissGraphic() {
    if (!attackArena) return;
    const miss = document.createElement('img');
    miss.src = `${SPR}MISS.png`;
    miss.alt = 'Miss';
    miss.className = 'miss-graphic';
    miss.style.left = `${FRISK_TARGET.x - 20}px`;
    miss.style.top = `${FRISK_TARGET.y - 70}px`;
    attackArena.appendChild(miss);
    setTimeout(() => miss.remove(), MISS_ANIM_MS);
  }

  function playFriskDodge(direction) {
    const pose = FRISK_DODGE_SPRITES[direction];
    if (!pose || !friskEl || !friskHeadEl || !friskTorsoEl || !friskLegsEl) return;

    friskHeadEl.src = pose.head;
    friskTorsoEl.src = pose.torso;
    friskLegsEl.src = pose.legs;
    friskHeadEl.style.transform = pose.flip ? 'translateX(-50%) scaleX(-1)' : '';
    friskTorsoEl.style.transform = pose.flip ? 'translateX(-50%) scaleX(-1)' : '';
    friskLegsEl.style.transform = pose.flip ? 'translateX(-50%) scaleX(-1)' : '';

    friskEl.classList.remove('frisk-dodge-left', 'frisk-dodge-right', 'frisk-dodge-back');
    void friskEl.offsetWidth;
    friskEl.classList.add(`frisk-dodge-${direction}`);

    spawnMissGraphic();

    clearTimeout(dodgeResetTimeoutId);
    dodgeResetTimeoutId = setTimeout(() => {
      friskHeadEl.src = FRISK_IDLE_SPRITES.head;
      friskTorsoEl.src = FRISK_IDLE_SPRITES.torso;
      friskLegsEl.src = FRISK_IDLE_SPRITES.legs;
      friskHeadEl.style.transform = '';
      friskTorsoEl.style.transform = '';
      friskLegsEl.style.transform = '';
      friskEl.classList.remove('frisk-dodge-left', 'frisk-dodge-right', 'frisk-dodge-back');
    }, DODGE_ANIM_MS);
  }


  setInterval(() => {
    if (friskKR > 0 && currentState !== STATES.GAME_OVER) {
      friskKR--;
      if (friskCurrentHP > 1) {
        friskCurrentHP--;
      }
      updateFriskHPDisplay();
      showFriskHPBar(1200);
    }
  }, 400);

  function getGroundY() {
    return dialogueBox ? dialogueBox.offsetTop : 336;
  }

  class SoundManager {
    constructor() {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioCtx();
      this.buffers = {};
      this.pending = {};
      this.bgmSource = null;
      this.soundPath = 'assets/sounds/';
    }

    resume() {
      if (this.ctx.state === 'suspended') {
        this.ctx.resume().catch(() => {});
      }
    }

    loadSound(name, ext = 'wav') {
      if (this.buffers[name] || this.pending[name]) return this.pending[name] || Promise.resolve(this.buffers[name]);

      const promise = fetch(`${this.soundPath}${name}.${ext}`)
        .then(res => res.arrayBuffer())
        .then(data => this.ctx.decodeAudioData(data))
        .then(buffer => {
          this.buffers[name] = buffer;
          return buffer;
        })
        .catch(() => null);

      this.pending[name] = promise;
      return promise;
    }

    play(name, volume = 1.0) {
      this.resume();
      const buffer = this.buffers[name];
      if (buffer) {
        this._playBuffer(buffer, volume);
      } else {
        this.loadSound(name).then(buf => { if (buf) this._playBuffer(buf, volume); });
      }
    }

    _playBuffer(buffer, volume) {
      const source = this.ctx.createBufferSource();
      const gainNode = this.ctx.createGain();
      gainNode.gain.value = volume;
      source.buffer = buffer;
      source.connect(gainNode).connect(this.ctx.destination);
      source.start(0);
    }

    playBGM(name, ext = 'wav', volume = 0.6) {
      this.resume();
      this.stopBGM();
      this.loadSound(name, ext).then(buffer => {
        if (!buffer || this.bgmSource) return;
        const source = this.ctx.createBufferSource();
        const gainNode = this.ctx.createGain();
        source.buffer = buffer;
        source.loop = true;
        gainNode.gain.value = volume;
        source.connect(gainNode).connect(this.ctx.destination);
        source.start(0);
        this.bgmSource = source;
        this.bgmGain = gainNode;
      });
    }

    fadeOutBGM(durationMs) {
      if (this.bgmGain && this.ctx) {
        this.bgmGain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + (durationMs / 1000));
        setTimeout(() => {
          this.stopBGM();
        }, durationMs);
      } else {
        this.stopBGM();
      }
    }

    fadeInBGM(name, ext = 'wav', targetVolume = 0.6, durationMs = 2000) {
      this.resume();
      this.stopBGM();
      this.loadSound(name, ext).then(buffer => {
        if (!buffer || this.bgmSource) return;
        const source = this.ctx.createBufferSource();
        const gainNode = this.ctx.createGain();
        source.buffer = buffer;
        source.loop = true;
        gainNode.gain.value = 0;
        source.connect(gainNode).connect(this.ctx.destination);
        source.start(0);
        this.bgmSource = source;
        this.bgmGain = gainNode;
        gainNode.gain.linearRampToValueAtTime(targetVolume, this.ctx.currentTime + durationMs / 1000);
      });
    }

    stopBGM() {
      if (this.bgmSource) {
        try { this.bgmSource.stop(); } catch (e) {}
        this.bgmSource = null;
        this.bgmGain = null;
      }
    }
  }

  const sounds = new SoundManager();
  window.soundManager = sounds;

  [
    'encounter', 'flicker', 'enter_battle', 'menu_text', 'sans', 'change', 'ding',
    'phswoo', 'blast_charge', 'blast', 'bone_zone', 'pchew', 'hurt',
    'hphw', 'blip', 'slice', 'slash', 'hit', 'hit2', 'switch', 'heal', 'dingding', 'soul_split', 'soul_shatter', 'static', 'save', 'dust', 'papyrus'
  ].forEach(sfx => sounds.loadSound(sfx));

  const PRELOAD_SPRITES = [
    'FRISK_HEAD_IDLE', 'FRISK_TORSO_IDLE', 'FRISK_LEGS_IDLE',
    'FRISK_HEAD_DODGING_SIDES', 'FRISK_TORSO_DODGING_LEFT', 'FRISK_TORSO_DODGING_RIGHT', 'FRISK_LEGS_DODGING_SIDES',
    'FRISK_HEAD_DOWN', 'FRISK_TORSO_DODGING_BACK', 'FRISK_LEGS_DODGING_BACK', 'FRISK_TORSO_DEAD', 'MISS',
    'FRISK_HEAD_SLICE', 'FRISK_HEAD_SLICE_1',
    'FRISK_TORSO_SLICE_UP', 'FRISK_TORSO_SLICE_UP_1', 'FRISK_TORSO_SLICE_UP_2', 'FRISK_TORSO_SLICE_UP_3',
    'FRISK_TORSO_SLICE_SIDES', 'FRISK_TORSO_SLICE_SIDES_2', 'FRISK_TORSO_SLICE_SIDES_3', 'FRISK_LEGS_SLASH',
    'SLASH', 'SLASH_1', 'SLASH_2', 'SLASH_3', 'SLASH_4', 'SLASH_5',
    'GASTER_BLASTER', 'GASTER_BLASTER_1', 'GASTER_BLASTER_2', 'GASTER_BLASTER_3',
    'GASTER_BLASTER_4', 'GASTER_BLASTER_5', 'GASTER_BLASTER_6',
    'SOUL', 'SOUL_LEFT', 'SOUL_RIGHT', 'SOUL_MONSTER', 'SOUL_MONSTER_LEFT',
    'HEART_LOCKET', 'KNIFE', 'BONE_TOP', 'BONE_MIDDLE',
    'btn_fight', 'btn_fight_hovered', 'btn_act', 'btn_act_hovered',
    'btn_item', 'btn_item_hovered', 'btn_mercy', 'btn_mercy_hovered',
    'GAME_OVER_TEXT'
  ];
  const PRELOAD_FILES = [...PRELOAD_SPRITES.map(n => `${SPR}${n}.png`), `${SPR}static.gif`];
  const preloadedImages = [];
  let staticGifOk = false;

  function playStaticEffect(durationMs = 600) {
    const overlay = document.createElement('div');
    overlay.style.position = 'absolute';
    overlay.style.top = '0';
    overlay.style.left = '0';
    overlay.style.width = '100%';
    overlay.style.height = '100%';
    overlay.style.zIndex = '9999';
    overlay.style.pointerEvents = 'none';
    overlay.style.opacity = '1';
    overlay.style.transition = `opacity ${durationMs}ms ease-out`;

    let running = true;
    if (staticGifOk) {
      overlay.style.backgroundImage = "url('assets/sprites/static.gif')";
      overlay.style.backgroundSize = 'cover';
    } else {
      const cv = document.createElement('canvas');
      cv.width = 160;
      cv.height = 120;
      cv.style.width = '100%';
      cv.style.height = '100%';
      cv.style.display = 'block';
      cv.style.imageRendering = 'pixelated';
      overlay.appendChild(cv);
      const ctx = cv.getContext('2d');
      const frame = ctx.createImageData(cv.width, cv.height);
      const draw = () => {
        if (!running) return;
        const d = frame.data;
        for (let i = 0; i < d.length; i += 4) {
          const v = Math.random() * 256;
          d[i] = v;
          d[i + 1] = v;
          d[i + 2] = v;
          d[i + 3] = 255;
        }
        ctx.putImageData(frame, 0, 0);
        requestAnimationFrame(draw);
      };
      draw();
    }

    gameContainer.appendChild(overlay);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        overlay.style.opacity = '0';
      });
    });
    setTimeout(() => {
      running = false;
      overlay.remove();
    }, durationMs);
  }

  function preloadAssets() {
    const images = PRELOAD_FILES.map(src => new Promise(resolve => {
      const img = new Image();
      preloadedImages.push(img);
      img.onload = () => {
        if (src.endsWith('static.gif')) staticGifOk = true;
        (img.decode ? img.decode().catch(() => {}) : Promise.resolve()).then(resolve);
      };
      img.onerror = resolve;
      img.src = src;
    }));

    const fonts = document.fonts
      ? ['Pixel Comic Sans', 'Papyrus', '8BitOperator', 'hachiro'].map(f => document.fonts.load(`16px "${f}"`).catch(() => {}))
      : [];

    const music = [sounds.loadSound('no_hope', 'mp3'), sounds.loadSound('game_over', 'mp3')];

    return Promise.all([...images, ...fonts, ...music]);
  }

  const assetsReady = preloadAssets();
  let encounterStarting = false;

  const STATES = {
    INTRO: 'INTRO',
    MAIN_MENU: 'MAIN_MENU',
    SUB_MENU: 'SUB_MENU',
    TEXT_DISPLAY: 'TEXT_DISPLAY',
    ATTACKING: 'ATTACKING',
    HUMAN_ATTACK: 'HUMAN_ATTACK',
    GAME_OVER: 'GAME_OVER'
  };

  let currentState = STATES.INTRO;
  let currentBtnIndex = 0;
  let currentOptionIndex = 0;
  let isTyping = false;
  let typingTimeout = null;
  let currentResultText = '';
  let dialogueQueue = [];

  let maxSP = 10;
  let currentSP = 10;

  const sansMaxHP = 1;
  let sansHP = 1;

  const REST_SPEED_MULT = 0.8;
  let restSlowNextTurn = false;

  const inventory = [
    { id: 'hotdog',  name: 'Hot Dog', qty: 2, consumable: true },
    { id: 'ketchup', name: 'Ketchup', qty: 1, consumable: true },
    { id: 'pie',     name: 'Pie',     qty: 1, consumable: false }
  ];

  function restoreSansItems() {
    inventory.forEach(item => {
      if (item.id === 'hotdog') item.qty = 2;
      if (item.id === 'ketchup') item.qty = 1;
      if (item.id === 'pie') item.qty = 1;
    });
  }

  function getItemList() {
    return inventory.filter(item => item.qty > 0);
  }

  function getSubMenuOptions(menuIndex) {
    const menuName = SUB_MENUS[menuIndex].name;

    if (menuName === 'ITEM') {
      return getItemList().map(item =>
        `* ${item.name}${item.consumable && item.qty > 1 ? ` (x${item.qty})` : ''}`
      );
    }

    if (menuName === 'ACT') {
      const options = ['* Check', '* Talk', '* Threaten', '* Rest'];
      if (humanDeathCount > 0) {
        options.push('* Taunt');
      }
      return options;
    }

    return SUB_MENUS[menuIndex].options;
  }

  let humanDeathCount = 0;

    const HUMAN_ITEM_POOL = [
    { id: 'candy',      name: 'Monster Candy',   heal: 10, tier: 1 },
    { id: 'donut',      name: 'Spider Donut',    heal: 12, tier: 1 },
    { id: 'nicecream',  name: 'Nice Cream',      heal: 15, tier: 1 },
    { id: 'junk',       name: 'Junk Food',       heal: 17, tier: 1 },
    { id: 'astro',      name: 'Astronaut Food',  heal: 21, tier: 1 },
    { id: 'bunny',      name: 'Cinnamon Bunny',  heal: 22, tier: 1 },
    { id: 'glamburger', name: 'Glamburger',      heal: 27, tier: 2 },
    { id: 'hero',       name: 'Legendary Hero',  heal: 40, atkBuff: true, tier: 2 },
    { id: 'snowman',    name: 'Snowman Piece',   heal: 45, tier: 2 },
    { id: 'steak',      name: 'Face Steak',      heal: 60, tier: 2 },
    { id: 'noodles',    name: 'Instant Noodles', heal: 90, tier: 3 },
    { id: 'pie',        name: 'Butterscotch Pie',heal: 92, tier: 3 },
    { id: 'seatea',     name: 'Sea Tea',         heal: 10, spdBuff: true, tier: 2 }
  ];

  function rollHumanInventory() {
    const commonPool = HUMAN_ITEM_POOL.filter(i => i.id !== 'seatea');

    const weightedPool = commonPool.map(item => {
      let weight = 10;
      if (item.tier === 1) {
        weight = Math.max(1, 14 - humanDeathCount * 4);
      } else if (item.tier === 2) {
        weight = 6 + humanDeathCount * 3;
      } else if (item.tier === 3) {
        weight = Math.min(18, 1 + humanDeathCount * 5);
      }
      return { item, weight };
    });

    const picks = [];
    const poolCopy = [...weightedPool];

    while (picks.length < 3 && poolCopy.length > 0) {
      const totalWeight = poolCopy.reduce((sum, entry) => sum + entry.weight, 0);
      let random = Math.random() * totalWeight;
      let selectedIndex = 0;

      for (let i = 0; i < poolCopy.length; i++) {
        if (random < poolCopy[i].weight) {
          selectedIndex = i;
          break;
        }
        random -= poolCopy[i].weight;
      }

      const chosen = poolCopy[selectedIndex].item;
      poolCopy.splice(selectedIndex, 1);

      picks.push({
        ...chosen,
        qty: (chosen.id === 'pie' || chosen.id === 'noodles' || chosen.id === 'steak') ? 1 : 1 + Math.floor(Math.random() * 2)
      });
    }

    const seaTeaChance = Math.min(0.85, 0.4 + humanDeathCount * 0.15);
    if (Math.random() < seaTeaChance) {
      const seaTea = HUMAN_ITEM_POOL.find(i => i.id === 'seatea');
      picks.push({ ...seaTea, qty: 1 });
    }

    return picks;
  }

  const humanInventory = rollHumanInventory();

  const ATK_BUFF_ROUNDS = 3;
  const SPD_BUFF_ROUNDS = 3;
  const HUMAN_DODGE_CHANCE = 0.35;
  let humanAtkBuffRounds = 0;
  let humanSpdBuffRounds = 0;
  let healedLastRound = false;

  let nextTextAction = 'humanTurn';

  function decrementHumanBuffs() {
    if (humanAtkBuffRounds > 0) humanAtkBuffRounds--;
    if (humanSpdBuffRounds > 0) humanSpdBuffRounds--;
  }


  const FLAVOR_TEXTS = [
    "* it's a beautiful day outside.\n* birds are singing, flowers are blooming.\n* on days like these... kids like them.",
    "* The human is staring through you with cold, empty eyes.",
    "* i can feel their sins crawling on their back...\n * this is why i never make promises.",
    "* it's the anomaly themselves.",
    "* The smell of hot dogs fills you with... something.",
    "* what? i'm not just gonna stand there and take it.",
    "* they know i can't dodge forever. but that doesn't matter.",
    "* The human readies their movements menacingly.",
    "* all this fighting really is starting to tire me up."
  ];
  let flavorIndex = 0;

  function getCurrentFlavorText() {
    return FLAVOR_TEXTS[flavorIndex];
  }

  function advanceFlavorText() {
    flavorIndex = (flavorIndex + 1) % FLAVOR_TEXTS.length;
  }

  function startDialogueSequence(pages) {
    if (!pages || pages.length === 0) return;
    dialogueQueue = [...pages];
    currentResultText = dialogueQueue.shift();
    currentState = STATES.TEXT_DISPLAY;
    updateButtonState();
    typeText(currentResultText);
  }

    function getTauntDialogue(deaths) {
    if (deaths === 1) {
        return [
        "* i read their expression...",
        "* that's the face of someone who's died once.",
        "* let's see if we can make it two."
        ];
    } else if (deaths === 2) {
        return [
        "* i read their expression...",
        "* that's the face of someone who's died twice.",
        "* let's make it three."
        ];
    } else if (deaths === 3) {
        return [
        "* i read their expression...",
        "* that's the face of someone who's died thrice.",
        "* ...a bit repetitive, isn't it?"
        ];
    } else if (deaths === 4) {
        return [
        "* i read their expression...",
        "* that's the face of someone who's died four times in a row.",
        "* hey, that's my lucky number."
        ];
    } else if (deaths === 5) {
        return [
        "* i read their expression...",
        "* that's the face of someone who's died five times.",
        "* that's one whole hand's worth of deaths."
        ];
    } else if (deaths >= 6 && deaths <= 9) {
        return [
        "* i read their expression...",
        `* that's the face of someone who's died ${deaths} times.`,
        "* you're really dedicated to this, huh?"
        ];
    } else if (deaths === 10) {
        return [
        "* i read their expression...",
        "* that's the face of someone who's died ten times.",
        "* hey, welcome to double digits."
        ];
    } else if (deaths >= 11 && deaths <= 14) {
        return [
        "* i read their expression...",
        `* that's the face of someone who's died... uh, ${deaths} times?`,
        "* honestly, i'm starting to lose count.",
        "* and looking at them... they don't really seem to care anymore either."
        ];
    } else {
        return [
        "* i try to read their expression...",
        "* ...",
        "* nothing.",
        "* total blankness. no frustration, no fear, no determination.",
        "* guess at this point... deaths are just numbers to them."
        ];
    }
  }

  const ATTACKS = [
    { name: 'Bone Barrage', cost: 2 },
    { name: 'Blasters', cost: 4 },
    { name: 'Ground Bones', cost: 3 },
    { name: 'Combination', cost: 6 }
  ];

  const SUB_MENUS = [
    { name: 'FIGHT', options: ATTACKS.map(a => `* ${a.name} (${a.cost}SP)`) },
    { name: 'ACT', options: ['* Check', '* Talk', '* Threaten', '* Rest'] },
    { name: 'ITEM', options: ['* Hot Dog', '* Ketchup', '* Pie'] },
    { name: 'MERCY', options: ['* Spare', '* Flee'] }
  ];

  const BLASTER_FRAMES = [
    'assets/sprites/GASTER_BLASTER.png',
    'assets/sprites/GASTER_BLASTER_1.png',
    'assets/sprites/GASTER_BLASTER_2.png',
    'assets/sprites/GASTER_BLASTER_3.png',
    'assets/sprites/GASTER_BLASTER_4.png',
    'assets/sprites/GASTER_BLASTER_5.png',
    'assets/sprites/GASTER_BLASTER_6.png'
  ];

  function clearFriskHPBar() {
    if (hpBarTimeout) {
      clearTimeout(hpBarTimeout);
      hpBarTimeout = null;
    }
    const hpBox = document.getElementById('frisk-hp-box');
    if (hpBox) {
      hpBox.classList.remove('show');
    }
    if (attackArena) {
      const numbers = attackArena.querySelectorAll('.damage-number, .heal-number');
      numbers.forEach(el => el.remove());
    }
  }

  function updateSPDisplay(instant = false) {
    const spFill = document.getElementById('sp-fill');
    const spText = document.getElementById('sp-text');
    const percentage = Math.max(0, Math.min(100, (currentSP / maxSP) * 100));
    if (spFill) {
      if (instant) spFill.style.transition = 'none';
      spFill.style.width = `${percentage}%`;
      if (instant) {
        void spFill.offsetWidth;
        spFill.style.transition = '';
      }
    }
    if (spText) spText.textContent = `${currentSP} / ${maxSP}`;
  }

  function createBone(height = 110, isGround = false, colorFilter = null) {
    const bone = document.createElement('div');
    bone.className = `bone-entity ${isGround ? 'ground-bone' : ''}`;
    
    if (colorFilter === 'blue') {
      bone.classList.add('blue-bone');
    }
    
    bone.style.height = `${height}px`;

    const top = document.createElement('div');
    top.className = 'bone-cap bone-top';

    const mid = document.createElement('div');
    mid.className = 'bone-mid';

    bone.appendChild(top);
    bone.appendChild(mid);

    if (!isGround) {
      const bot = document.createElement('div');
      bot.className = 'bone-cap bone-bot';
      bone.appendChild(bot);
    }

    return bone;
  }

  function spawnBoneBarrageOnFrisk(onComplete) {
    const waveCount = 8;
    let finished = 0;
    
    let barrageDodged = false;
    let dodgeDetermined = false;

    for (let i = 0; i < waveCount; i++) {
    setTimeout(() => {
        const fromRight = i % 2 === 0;
        const boneHeight = 140; 
        const isBlue = Math.random() < 0.35; 
        const bone = createBone(boneHeight, false, isBlue ? 'blue' : null);

        const spawnY = 150 + (i % 2) * 25;
        bone.style.top = `${spawnY}px`;

        let posX = fromRight ? 920 : -40;
        const targetX = fromRight ? -40 : 920;
        const speed = fromRight ? -10 : 10;

        bone.style.left = `${posX}px`;
        attackArena.appendChild(bone);

        let hitTriggered = false;

        const interval = setInterval(() => {
          posX += speed;
          bone.style.left = `${posX}px`;

          if (!hitTriggered && Math.abs(posX - FRISK_TARGET.x) < 25) {
            hitTriggered = true;
            
            if (!dodgeDetermined) {
              dodgeDetermined = true;
              barrageDodged = rollFriskDodge();
            }
            
            if (barrageDodged) {
              if (isBlue) {
                spawnMissGraphic();
              } else {
                playFriskDodge('back');
              }
            } else {
              if (!isBlue) {
                damageFrisk(1); 
              }
            }
          }

          if (currentState === STATES.GAME_OVER) {
            clearInterval(interval);
            bone.remove();
            return;
          }

          if ((fromRight && posX < targetX) || (!fromRight && posX > targetX)) {
            clearInterval(interval);
            bone.remove();
            finished++;
            if (finished === waveCount && onComplete) onComplete();
          }
        }, 16);
      }, i * 220);
    }
  }

  function spawnGroundBonesUnderFrisk(onComplete) {
    const groundY = getGroundY();
    const boxWidth = 280;
    const boxHeight = 130;
    const startX = 310;

    const warnBox = document.createElement('div');
    warnBox.className = 'warning-box';
    warnBox.style.left = `${startX}px`;
    warnBox.style.top = `${groundY - boxHeight}px`;
    warnBox.style.width = `${boxWidth}px`;
    warnBox.style.height = `${boxHeight}px`;
    attackArena.appendChild(warnBox);

    sounds.play('bone_zone');

    setTimeout(() => {
      warnBox.remove();
      sounds.play('pchew');

      const groundWrapper = document.createElement('div');
      groundWrapper.style.position = 'absolute';
      groundWrapper.style.left = '0px';
      groundWrapper.style.top = '0px';
      groundWrapper.style.width = '100%';
      groundWrapper.style.height = `${groundY}px`;
      groundWrapper.style.overflow = 'hidden';
      groundWrapper.style.pointerEvents = 'none';
      groundWrapper.style.zIndex = '82';
      attackArena.appendChild(groundWrapper);

      const boneSpacing = 22;
      const boneCount = Math.floor(boxWidth / boneSpacing);
      const groundBones = [];

      for (let i = 0; i < boneCount; i++) {
        const bone = createBone(boxHeight, true);
        const posX = startX + (i * boneSpacing) + 2;

        bone.style.position = 'absolute';
        bone.style.left = `${posX}px`;
        bone.style.bottom = '0px';
        bone.style.transform = 'translateY(100%)';
        bone.style.transition = 'transform 0.12s cubic-bezier(0.1, 0.9, 0.2, 1)';

        groundWrapper.appendChild(bone);
        groundBones.push(bone);
      }

      const holdDuration = 2650;

      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          groundBones.forEach(bone => {
            bone.style.transform = 'translateY(0%)';
          });
          if (rollFriskDodge()) {
            playFriskDodge('back');
          } else {
            tickDamage(1, 250, holdDuration);
          }
        });
      });

      setTimeout(() => {
        groundBones.forEach(bone => {
          bone.style.transform = 'translateY(100%)';
        });

        setTimeout(() => {
          groundWrapper.remove();
          if (onComplete) onComplete();
        }, 200);
      }, holdDuration);

    }, 400);
  }

  function spawnGasterBlaster(x, y, targetX = FRISK_TARGET.x, targetY = FRISK_TARGET.y, delay = 0, onComplete = null) {
    setTimeout(() => {
      const blaster = document.createElement('div');
      blaster.className = 'gaster-blaster';
      blaster.style.backgroundImage = `url('${BLASTER_FRAMES[0]}')`;

      const beamContainer = document.createElement('div');
      beamContainer.className = 'blaster-beam-container';

      const beamDome = document.createElement('div');
      beamDome.className = 'blaster-beam-dome';

      const beamBody = document.createElement('div');
      beamBody.className = 'blaster-beam-body';

      beamContainer.appendChild(beamDome);
      beamContainer.appendChild(beamBody);
      blaster.appendChild(beamContainer);

      const deltaX = targetX - x;
      const deltaY = targetY - y;
      const angleRad = Math.atan2(deltaY, deltaX);
      const angleDeg = (angleRad * 180) / Math.PI;

      const spriteRotation = angleDeg - 90;

      const entryDistance = 260;
      const entryAngleOffset = 0.85; 
      const startX = x - Math.cos(angleRad - entryAngleOffset) * entryDistance;
      const startY = y - Math.sin(angleRad - entryAngleOffset) * entryDistance;
      const startRotation = spriteRotation - 120;

      blaster.style.left = `${startX}px`;
      blaster.style.top = `${startY}px`;
      blaster.style.opacity = '0';
      blaster.style.transform = `rotate(${startRotation}deg) scale(0.6)`;

      attackArena.appendChild(blaster);
      sounds.play('phswoo');

      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          blaster.style.opacity = '1';
          blaster.style.left = `${x}px`;
          blaster.style.top = `${y}px`;
          blaster.style.transform = `rotate(${spriteRotation}deg) scale(1)`;
        });
      });

      setTimeout(() => {
        sounds.play('blast_charge');
        let frameIdx = 0;

        const animInterval = setInterval(() => {
          frameIdx++;
          if (frameIdx < 4) {
            blaster.style.backgroundImage = `url('${BLASTER_FRAMES[frameIdx]}')`;
          } else {
            clearInterval(animInterval);

            blaster.style.backgroundImage = `url('${BLASTER_FRAMES[6]}')`;
            sounds.play('blast');

            beamContainer.style.opacity = '1';
            beamContainer.style.height = '1200px';
            beamContainer.style.width = '8px';

            const dodgeThisBlast = rollFriskDodge();
            const horizontalDominant = Math.abs(deltaX) > Math.abs(deltaY) * 1.15;
            const beamFromLeft = deltaX > 0;
            const dodgeDir = !horizontalDominant ? 'back' : (beamFromLeft ? 'right' : 'left');

            setTimeout(() => {
              beamContainer.style.width = '105px';
              if (dodgeThisBlast) {
                playFriskDodge(dodgeDir);
              } else {
                tickDamage(1, 60, 120);
              }
            }, 30);

            setTimeout(() => {
              beamContainer.style.width = '45px';
              if (!dodgeThisBlast) {
                tickDamage(1, 80, 170);
              }
            }, 150);

            setTimeout(() => {
              beamContainer.style.width = '0px';
              beamContainer.style.opacity = '0';
            }, 320);

            blaster.classList.add('recoil-receding');
            const recoilDistance = 400;
            const endX = x - Math.cos(angleRad) * recoilDistance;
            const endY = y - Math.sin(angleRad) * recoilDistance;

            blaster.style.left = `${endX}px`;
            blaster.style.top = `${endY}px`;
            blaster.style.opacity = '0';

            setTimeout(() => {
              blaster.remove();
              if (onComplete) onComplete();
            }, 500);
          }
        }, 65);
      }, 550);
    }, delay);
  }

  function executeAttackPattern(patternIndex) {
    const attack = ATTACKS[patternIndex];

    if (currentSP < attack.cost) {
      stopTyping();
      currentState = STATES.TEXT_DISPLAY;
      currentResultText = `* i need to take a break... (${attack.cost} SP required)`;
      typeText(currentResultText);
      return;
    }

    currentSP -= attack.cost;
    updateSPDisplay();

    currentState = STATES.ATTACKING;
    updateButtonState();

    const finishAttack = () => {
      if (currentState === STATES.GAME_OVER) return;
      currentState = STATES.TEXT_DISPLAY;
      advanceFlavorText();
      currentResultText = "* The human barely dodged... but KR is taking hold.";
      typeText(currentResultText);
    };

    switch (patternIndex) {
      case 0:
        typeText("* Bone Barrage summoned!", () => {
          spawnBoneBarrageOnFrisk(finishAttack);
        });
        break;

      case 1:
        typeText("* Gaster Blasters summoned!", () => {
          spawnGasterBlaster(180, 50, FRISK_TARGET.x, FRISK_TARGET.y, 0);
          spawnGasterBlaster(720, 50, FRISK_TARGET.x, FRISK_TARGET.y, 650);
          spawnGasterBlaster(450, 20, FRISK_TARGET.x, FRISK_TARGET.y, 1300, finishAttack);
        });
        break;

      case 2:
        typeText("* Bones Rise from the ground!", () => {
          spawnGroundBonesUnderFrisk(finishAttack);
        });
        break;

      case 3:
        typeText("* You decided to try putting some effort on this turn...", () => {
          spawnGroundBonesUnderFrisk();
          spawnGasterBlaster(140, 40, FRISK_TARGET.x, FRISK_TARGET.y, 0);
          spawnGasterBlaster(760, 40, FRISK_TARGET.x, FRISK_TARGET.y, 500);
          spawnGasterBlaster(800, 240, FRISK_TARGET.x, FRISK_TARGET.y, 1000);
          spawnGasterBlaster(100, 240, FRISK_TARGET.x, FRISK_TARGET.y, 1500, finishAttack);
        });
        break;
    }
  }

  function isSansDialogue(text) {
    const lower = text.toLowerCase();
    return (
      lower.includes("sans:") || 
      lower.includes("pal") || 
      lower.includes("geez") || 
      lower.includes("kid") || 
      lower.includes("tire me up") ||
      lower.includes(" i am not") ||
      lower.includes(" my friends") ||
      lower.includes(" bad time") ||
      lower.includes("read their expression") ||
      lower.includes("face of someone") ||
      lower.startsWith("* i tell") || 
      lower.startsWith("* they know i can't") || 
      lower.startsWith("* it's the anomaly themselves.") ||
      lower.startsWith("* what? i'm not just gonna stand there and take it.") || 
      lower.startsWith("* i ate") || 
      lower.startsWith("* i drank") || 
      lower.startsWith("* i offered") ||
      lower.startsWith("* i can") ||
      lower.startsWith("* i need") ||
      lower.startsWith("* i am here to make em quit") ||
      lower.startsWith("* i take") ||
      lower.startsWith("* i attempt") ||
      lower.startsWith("* i read their expression...") ||
      lower.startsWith("* that's the face of someone who's died once.") ||
      lower.startsWith("* let's see if we can make it two.") ||
      lower.startsWith("* i read their expression...") ||
      lower.startsWith("* that's the face of someone who's died twice.") ||
      lower.startsWith("* let's make it three.") ||
      lower.startsWith("* i read their expression...") ||
      lower.startsWith("* that's the face of someone who's died thrice.") ||
      lower.startsWith("* ...a bit repetitive, isn't it?") ||
      lower.startsWith("* i read their expression...") ||
      lower.startsWith("* that's the face of someone who's died four times in a row.") ||
      lower.startsWith("* hey, that's my lucky number.") ||
      lower.startsWith("* i read their expression...") ||
      lower.startsWith("* that's the face of someone who's died five times.") ||
      lower.startsWith("* that's one whole hand's worth of deaths.") ||
      lower.startsWith("* i read their expression...") ||
      lower.startsWith("* that's the face of someone who's died ${deaths} times.") ||
      lower.startsWith("* you're really dedicated to this, huh?") ||
      lower.startsWith("* i read their expression...") ||
      lower.startsWith("* that's the face of someone who's died ten times.") ||
      lower.startsWith("* hey, welcome to double digits.") ||
      lower.startsWith("* i read their expression...") ||
      lower.startsWith("* that's the face of someone who's died... uh, ${deaths} times?") ||
      lower.startsWith("* honestly, i'm starting to lose count.") ||
      lower.startsWith("* and looking at them... they don't really seem to care anymore either.") ||
      lower.startsWith("* i try to read their expression...") ||
      lower.startsWith("* nothing.") ||
      lower.startsWith("* total blankness. no frustration, no fear, no determination.") ||
      lower.startsWith("* guess at this point... deaths are just numbers to them.")
    );
  }

  function startEncounterSequence() {
    if (encounterStarting) return;
    encounterStarting = true;
    sounds.resume();
    Promise.race([assetsReady, new Promise(resolve => setTimeout(resolve, 6000))]).then(beginEncounterSequence);
  }

  function beginEncounterSequence() {
    encounterStarting = false;
    sounds.resume();
    startScreen.style.display = 'none';
    encounterOverlay.classList.remove('hidden');

    sounds.play('encounter');
    encounterSoul.classList.add('soul-flashing');
    sounds.play('flicker');
    setTimeout(() => {
        sounds.play('flicker');
        setTimeout(() => {
            sounds.play('flicker');
            setTimeout(() => {
                sounds.play('flicker');
            }, 200);
        }, 250);
    }, 300);
    setTimeout(() => {
      encounterSoul.classList.remove('soul-flashing');
      sounds.play('enter_battle');

      setTimeout(() => {
        encounterOverlay.classList.add('hidden');
        currentState = STATES.MAIN_MENU;
        resetBulletBox();
        updateButtonState();
        updateSPDisplay();
        updateFriskHPDisplay();

        sounds.playBGM('no_hope', 'mp3', 0.5);
        typeText(getCurrentFlavorText());
      }, 400);
    }, 810);
  }

  function handleInitStart() {
    if (currentState === STATES.INTRO) {
      startEncounterSequence();
    }
  }

  startScreen.addEventListener('click', handleInitStart);

  function updateButtonState() {
    buttons.forEach((btn, idx) => {
      if (idx === currentBtnIndex && currentState === STATES.MAIN_MENU) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });
  }

  function openSubMenu(btnIndex) {
    stopTyping();
    resetBulletBox();
    sounds.play('change');
    currentState = STATES.SUB_MENU;
    currentOptionIndex = 0;
    updateButtonState();
    renderSubMenu();
  }

  function renderSubMenu() {
    stopTyping();
    const menuData = SUB_MENUS[currentBtnIndex];
    let html = '<div class="dialogue-menu-grid">';
    getSubMenuOptions(currentBtnIndex).forEach((opt, idx) => {
      const isActive = idx === currentOptionIndex ? 'active' : '';
      html += `<div class="menu-option ${isActive}" data-index="${idx}">${opt}</div>`;
    });
    html += '</div>';
    dialogueText.innerHTML = html;

    const optionEls = dialogueText.querySelectorAll('.menu-option');
    if (!isMobile) optionEls.forEach((el) => {
      const idx = parseInt(el.getAttribute('data-index'), 10);
      el.addEventListener('mouseenter', () => {
        if (currentOptionIndex !== idx) {
          currentOptionIndex = idx;
          sounds.play('change');
          updateSubMenuHighlight();
        }
      });
      el.addEventListener('click', (e) => {
        e.stopPropagation();
        executeSubMenuOption(idx);
      });
    });
  }

  function updateSubMenuHighlight() {
    const optionEls = dialogueText.querySelectorAll('.menu-option');
    optionEls.forEach((el, idx) => {
      if (idx === currentOptionIndex) {
        el.classList.add('active');
      } else {
        el.classList.remove('active');
      }
    });
  }

  function cancelSubMenu() {
    stopTyping();
    resetBulletBox();
    sounds.play('change');
    currentState = STATES.MAIN_MENU;
    updateButtonState();
    typeText(getCurrentFlavorText());
  }

  function executeSubMenuOption(optionIndex) {
    sounds.play('change');
    const menuName = SUB_MENUS[currentBtnIndex].name;

    if (menuName === 'FIGHT') {
      executeAttackPattern(optionIndex);
      return;
    }

    currentState = STATES.TEXT_DISPLAY;
    updateButtonState();

    if (menuName === 'ACT') {
        switch (optionIndex) {
            case 0:
              currentResultText = humanAtkBuffRounds > 0
                  ? "* CHARA - ATK 99 (+4) DEF 99\n* Their determination is still burning. They're hitting harder than usual."
                  : "* CHARA - ATK 99 DEF 99\n* The human is looking dangerous.";
              break;
            case 1:
              currentResultText = "* i tell the human that this is pointless.\n* they remain silent.";
              break;
            case 2:
              currentResultText = "* i tell the human they're gonna have a bad time.\n* they smile.";
              break;
            case 3:
              const restoredSP = Math.min(4, maxSP - currentSP);
              currentSP = Math.min(maxSP, currentSP + 4);
              updateSPDisplay();
              restSlowNextTurn = true;
              currentResultText = restoredSP > 0
                  ? `* i take a brief pause... a nap would be nice right now.\n* Recovered ${restoredSP} SP!\n* ...but my legs feel heavy.`
                  : "* i take a brief pause.\n* SP is already full, but my legs feel heavy.";
              break;
            case 4: {
              const tauntPages = getTauntDialogue(humanDeathCount);
              startDialogueSequence(tauntPages);
              return;
            }
        }
    } else if (menuName === 'ITEM') {
      const item = getItemList()[optionIndex];

      if (!item) {
        currentResultText = "* You have nothing left to use.";
      } else {
        if (item.consumable) {
          item.qty--;
          sounds.play('heal', 0.9);
        }

        switch (item.id) {
          case 'hotdog': {
            const restored = Math.min(2, maxSP - currentSP);
            currentSP = Math.min(maxSP, currentSP + 2);
            updateSPDisplay();
            currentResultText = restored > 0
              ? `* You ate the Hot Dog.\n* Recovered 0 HP & ${restored} SP!`
              : "* You ate the Hot Dog. Recovered 0 HP (HP already full).";
            break;
          }
          case 'ketchup': {
            const restored = Math.min(5, maxSP - currentSP);
            currentSP = Math.min(maxSP, currentSP + 5);
            updateSPDisplay();
            currentResultText = restored > 0
              ? `* You drank the bottle of Ketchup. Delicious!\n* Recovered ${restored} SP!`
              : "* You drank the bottle of Ketchup. Delicious!";
            break;
          }
          case 'pie':
            currentResultText = "* You don't actually have a pie on you.";
            break;
        }
      }
    } else if (menuName === 'MERCY') {
      switch (optionIndex) {
        case 0:
          currentResultText = "* i am not sparing them.";
          break;
        case 1:
          currentResultText = "* i am here to make em quit.\n* there is no point in running.";
          break;
      }
    }

    typeText(currentResultText);
  }

  function stopTyping() {
    if (typingTimeout) {
      clearTimeout(typingTimeout);
      typingTimeout = null;
    }
    isTyping = false;
  }

  function typeText(text, onComplete) {
    stopTyping();
    isTyping = true;
    dialogueText.innerHTML = '';

    const useSansVoice = isSansDialogue(text);
    const soundToPlay = useSansVoice ? 'sans' : 'menu_text';

    let charIndex = 0;

    function processNextChar() {
      if (!isTyping || charIndex >= text.length) {
        stopTyping();
        if (onComplete) onComplete();
        return;
      }

      const char = text.charAt(charIndex);

      if (char === '\n') {
        dialogueText.appendChild(document.createElement('br'));
      } else {
        dialogueText.appendChild(document.createTextNode(char));
      }

      if (![' ', '\n', '.', ',', '!', '?', ':', ';'].includes(char)) {
        sounds.play(soundToPlay, 0.7);
      }

      let delay = 30;

      if (char === ',') {
        delay = 180;
      } else if (char === ':' || char === ';') {
        delay = 200;
      } else if (char === '.' || char === '!' || char === '?') {
        const isEllipsisEnd = text.substring(charIndex - 2, charIndex + 1) === '...';
        const isEllipsisMid = text.substring(charIndex - 1, charIndex + 2) === '...' || 
                              text.substring(charIndex, charIndex + 3) === '...';

        if (isEllipsisEnd) {
          delay = 450;
        } else if (isEllipsisMid) {
          delay = 150;
        } else {
          delay = 320;
        }
      }

      charIndex++;
      typingTimeout = setTimeout(processNextChar, delay);
    }

    processNextChar();
  }

  function finishTypingInstantly(fullText) {
    stopTyping();
    dialogueText.innerHTML = '';
    const lines = fullText.split('\n');
    lines.forEach((line, i) => {
      if (i > 0) dialogueText.appendChild(document.createElement('br'));
      dialogueText.appendChild(document.createTextNode(line));
    });
  }

  function updateHPDisplay() {
    const hpFill = document.getElementById('hp-fill');
    const hpText = document.getElementById('hp-text');
    if (hpFill) hpFill.style.width = `${Math.max(0, (sansHP / sansMaxHP) * 100)}%`;
    if (hpText) hpText.textContent = `${sansHP} / ${sansMaxHP}`;
  }

  const screenFlash = document.createElement('div');
  screenFlash.id = 'screen-flash';
  screenFlash.className = 'screen-flash';
  gameContainer.appendChild(screenFlash);

  function killSans() {
    if (currentState === STATES.GAME_OVER) return; 
    currentState = STATES.GAME_OVER; 
    stopTyping();

    if (typeof sounds.fadeOutBGM === 'function') {
        sounds.fadeOutBGM(2500);
    } else {
        sounds.stopBGM();
    }

    const blackOut = document.createElement('div');
    blackOut.style.position = 'absolute';
    blackOut.style.top = '0';
    blackOut.style.left = '0';
    blackOut.style.width = '100%';
    blackOut.style.height = '100%';
    blackOut.style.backgroundColor = 'black';
    blackOut.style.opacity = '0';
    blackOut.style.transition = 'opacity 1.5s ease-in';
    blackOut.style.zIndex = '140'; 
    gameContainer.appendChild(blackOut);

    blackOut.id = 'sans-death-blackout';
    setTimeout(() => {
        blackOut.style.opacity = '1';
    }, 100);

    setTimeout(() => {
        const soulSize = 20;
        const chestRect = { 
            x: gameContainer.offsetWidth / 2 - soulSize / 2, 
            y: gameContainer.offsetHeight / 2 - soulSize / 2 
        };

        const isolatedSoul = document.createElement('div');
        isolatedSoul.style.position = 'absolute';
        isolatedSoul.style.left = chestRect.x + 'px'; 
        isolatedSoul.style.top = chestRect.y + 'px';
        isolatedSoul.style.width = `${soulSize}px`;
        isolatedSoul.style.height = `${soulSize}px`;
        isolatedSoul.style.backgroundImage = "url('assets/sprites/SOUL_MONSTER.png')";
        isolatedSoul.style.backgroundSize = 'contain';
        isolatedSoul.style.backgroundRepeat = 'no-repeat';
        isolatedSoul.style.zIndex = '150'; 
        gameContainer.appendChild(isolatedSoul);

        sounds.play('dust', 1.0);

        setTimeout(() => {
            isolatedSoul.remove();
            
            shatterSoul(chestRect.x, chestRect.y, {
                size: 20,
                tint: null,
                onShatterStart: () => sounds.fadeInBGM('game_over', 'mp3', 0.8, 2200),
                onDone: () => {
                    setTimeout(() => {
                        showPapyrusGameOver();
                    }, 1500);
                }
            });
        }, 1800);
    }, 1600);
  }

  function restartFullEncounter() {
    const screen = document.getElementById('papyrus-game-over-screen');
    const blackOut = document.getElementById('sans-death-blackout');

    sounds.fadeOutBGM(800);

    if (screen) {
      screen.style.transition = 'opacity 0.8s ease-out';
      screen.style.opacity = '0';
    }

    setTimeout(() => {
      if (screen) screen.remove();
      if (blackOut) blackOut.remove();
      resetFullGameState();
      startEncounterSequence();
    }, 850);
  }

  function resetFullGameState() {
    sansHP = 1;
    updateHPDisplay();

    currentSP = maxSP;
    updateSPDisplay();

    friskCurrentHP = friskMaxHP;
    friskKR = 0;
    updateFriskHPDisplay();
    clearFriskHPBar();

    humanAtkBuffRounds = 0;
    humanSpdBuffRounds = 0;
    healedLastRound = false;
    humanDeathCount = 0;

    humanInventory.length = 0;
    humanInventory.push(...rollHumanInventory());

    restoreSansItems();
    restSlowNextTurn = false;

    currentBtnIndex = 0;
    currentOptionIndex = 0;
    flavorIndex = 0;
    nextTextAction = 'humanTurn';

    stopTyping();
    dialogueQueue = [];
    currentResultText = '';

    resetBulletBox();

    currentState = STATES.INTRO;
  }

  function showPapyrusGameOver() {
    const gameOverScreen = document.createElement('div');
    gameOverScreen.id = 'papyrus-game-over-screen';
    gameOverScreen.style.position = 'absolute';
    gameOverScreen.style.top = '0';
    gameOverScreen.style.left = '0';
    gameOverScreen.style.width = '100%';
    gameOverScreen.style.height = '100%';
    gameOverScreen.style.backgroundColor = 'black';
    gameOverScreen.style.color = 'white';
    gameOverScreen.style.zIndex = '160';
    gameOverScreen.style.display = 'flex';
    gameOverScreen.style.flexDirection = 'column';
    gameOverScreen.style.overflow = 'hidden';

    const gameOverImg = document.createElement('img');
    gameOverImg.src = 'assets/sprites/GAME_OVER_TEXT.png';
    gameOverImg.style.position = 'absolute';
    gameOverImg.style.top = '60px';
    gameOverImg.style.left = '50%';
    gameOverImg.style.transform = 'translateX(-50%)';
    gameOverImg.style.width = '380px';
    gameOverImg.style.imageRendering = 'pixelated';
    gameOverImg.style.opacity = '0';
    gameOverImg.style.transition = 'opacity 2s ease-in';
    gameOverScreen.appendChild(gameOverImg);

    const textContainer = document.createElement('div');
    textContainer.className = 'papyrus-text';
    textContainer.style.position = 'absolute';
    textContainer.style.top = '320px';
    textContainer.style.left = '50%';
    textContainer.style.transform = 'translateX(-50%)';
    textContainer.style.width = '520px';
    gameOverScreen.appendChild(textContainer);

    gameContainer.appendChild(gameOverScreen);

    requestAnimationFrame(() => {
        gameOverImg.style.opacity = '1';
    });

    setTimeout(() => {
        typePapyrusText(textContainer, "SANS! SANS! WAKE UP YOU LAZYBONES!\nWE ARE GOING TO GRILLBY'S LIKE YOU PROMISED!");
    }, 2500);
  }

  function typePapyrusText(element, text) {
    let charIndex = 0;
    
    function processNextChar() {
        if (charIndex >= text.length) {
            setTimeout(() => {
                const restartHint = document.createElement('div');
                restartHint.style.fontFamily = "'8BitOperator', monospace";
                restartHint.style.fontSize = '16px';
                restartHint.style.marginTop = '40px';
                restartHint.style.color = '#888';
                restartHint.textContent = isMobile ? 'TOUCH TO TRY AGAIN' : 'PRESS [Z / ENTER] TO TRY AGAIN';
                element.appendChild(restartHint);
                
                window.addEventListener('keydown', (e) => {
                    if (e.key === 'z' || e.key === 'Z' || e.key === 'Enter') restartFullEncounter();
                }, { once: true });
                element.parentElement.addEventListener('click', () => restartFullEncounter(), { once: true });
            }, 1500);
            return;
        }

        const char = text.charAt(charIndex);
        
        if (char === '\n') {
            element.appendChild(document.createElement('br'));
        } else {
            element.appendChild(document.createTextNode(char));
        }

        if (![' ', '\n', '.', ',', '!', '?', ':', ';'].includes(char)) {
            sounds.play('papyrus', 0.9);
        }

        let delay = 45; 
        if (char === '!' || char === ',' || char === '.') delay = 250; 

        charIndex++;
        setTimeout(processNextChar, delay);
    }

    processNextChar();
  }

  const SOUL_SPLIT_MS = 380;
  const SOUL_SHATTER_MS = 900;
  const RED_TINT_FILTER = 'brightness(0) saturate(100%) invert(11%) sepia(96%) saturate(6478%) hue-rotate(358deg) brightness(102%) contrast(115%)';

  function elementPosInGameContainer(el) {
    const parentRect = gameContainer.getBoundingClientRect();
    const rect = el.getBoundingClientRect();
    const k = gameContainer.offsetWidth ? parentRect.width / gameContainer.offsetWidth : 1;
    return { x: (rect.left - parentRect.left) / k, y: (rect.top - parentRect.top) / k, w: rect.width / k, h: rect.height / k };
  }

  function spawnSoulShards(cx, cy, tint) {
    const shardCount = 12;
    for (let i = 0; i < shardCount; i++) {
      const shard = document.createElement('div');
      shard.className = 'soul-shard';
      const shardSize = 3 + Math.random() * 4;
      shard.style.width = `${shardSize}px`;
      shard.style.height = `${shardSize}px`;
      shard.style.left = `${cx}px`;
      shard.style.top = `${cy}px`;
      shard.style.backgroundColor = tint === 'red' ? '#ff0000' : '#ffffff';
      gameContainer.appendChild(shard);

      const angle = (Math.PI * 2 * i) / shardCount + (Math.random() - 0.5) * 0.5;
      const speed = 2 + Math.random() * 3;
      const vx = Math.cos(angle) * speed;
      let vy = Math.sin(angle) * speed - 2; 
      let px = cx, py = cy;
      let life = 0;
      const gravity = 0.18;
      const maxLife = 40 + Math.random() * 20;

      const step = () => {
        life++;
        vy += gravity;
        px += vx;
        py += vy;
        shard.style.left = `${px}px`;
        shard.style.top = `${py}px`;
        shard.style.opacity = String(Math.max(0, 1 - life / maxLife));
        if (life < maxLife) {
          requestAnimationFrame(step);
        } else {
          shard.remove();
        }
      };
      requestAnimationFrame(step);
    }
  }

  
  function shatterSoul(x, y, { size = 20, tint = null, onDone = null, onShatterStart = null } = {}) {
    if (!gameContainer) {
      if (onDone) onDone();
      return;
    }

    sounds.play('soul_split', 1.0);

    const makeHalf = (side) => {
      const half = document.createElement('div');
      half.className = 'soul-half';
      half.style.position = 'absolute';
      half.style.width = `${size}px`;
      half.style.height = `${size}px`;
      half.style.left = `${x}px`;
      half.style.top = `${y}px`;
      half.style.backgroundSize = 'contain';
      half.style.backgroundRepeat = 'no-repeat';
      if (tint === 'red') {
        half.style.backgroundImage = side === 'l'
          ? "url('assets/sprites/SOUL_LEFT.png')"
          : "url('assets/sprites/SOUL_RIGHT.png')";
        half.style.filter = RED_TINT_FILTER;
      } else {
        half.style.backgroundImage = "url('assets/sprites/SOUL_MONSTER.png')";
        half.style.clipPath = side === 'l'
          ? 'polygon(0 0, 50% 0, 50% 100%, 0 100%)'
          : 'polygon(50% 0, 100% 0, 100% 100%, 50% 100%)';
      }
      gameContainer.appendChild(half);
      return half;
    };

    const leftHalf = makeHalf('l');
    const rightHalf = makeHalf('r');

    requestAnimationFrame(() => {
      leftHalf.style.transform = `translateX(-${size * 0.6}px) rotate(-14deg)`;
      rightHalf.style.transform = `translateX(${size * 0.6}px) rotate(14deg)`;
    });

    setTimeout(() => {
      leftHalf.remove();
      rightHalf.remove();

      sounds.play('soul_shatter', 1.0);
      if (onShatterStart) onShatterStart();
      spawnSoulShards(x + size / 2, y + size / 2, tint);

      setTimeout(() => {
        if (onDone) onDone();
      }, SOUL_SHATTER_MS);
    }, SOUL_SPLIT_MS);
  }

  const SOUL_SIZE = 20;
  const SOUL_HIT_INSET = 6;
  const KNIFE_W = 30, KNIFE_H = 75;
  const LOCKET_W = 34, LOCKET_H = 80;
  const BOX_BORDER = 5;
  const HUMAN_BOX_OUTER = 210;
  const HUMAN_BOX_INNER = HUMAN_BOX_OUTER - BOX_BORDER * 2;
  const KNIFE_TRACK_FRAMES = 36;
  const KNIFE_LOCK_FRAMES = 24;
  const KNIFE_FLASH_SLOW = 12;
  const KNIFE_FLASH_FAST = 2;
  const KNIFE_SPAWN_MS = 270;
//const LOCKET_SPAWN_MS = 380;
  const MAX_ACTIVE_KNIVES = 5;
  const KNIFE_SPAWN_CUTOFF = 110;
  const HIT_SP_COST = 1;
  const IV_DURATION_MS = 620;
  const IV_FLICKER_MS = 90;
  const IV_DIM_OPACITY = 0.4;
  const TELEPORT_BLACKOUT_MS = 140;
  const TELEPORT_FADE_MS = 120;
  const KNIFE_FLY_SPEED = 10.5;

  const LOCKET_SPIN = {
    LENGTH: 132,
    PIVOT_X: 0.5,
    PIVOT_Y: 0.34,
    PIVOT_FRAC: 0.06,
    FADE_IN: 60,
    FADE_OUT: 30,
    GRAVITY: 0.001,
    PUSH_KEYS: [[0, 0.05], [95, 0.97], [125, 1.17], [200, 1.17], [235, 0], [275, 0], [305, 0.9], [330, 1.17], [420, 1.17], [455, 0]],
    DAMP_KEYS: [[0, 0], [200, 0], [225, 0.02], [295, 0.02], [325, 0], [420, 0], [445, 0.012]],
    MIN_FRAMES: 455,
    MAX_FRAMES: 650,
    GHOST_MS: 300,
    SPRITE_FLIPPED: true,
    CORNER_ZONE: 48,
    CORNER_CAMP_FRAMES: 12,
    CORNER_KNIFE_COOLDOWN: 40,
    CORNER_KNIFE_TRACK: 18,
    CORNER_CLIP: false 
  };

  const locketSprite = new Image();
  locketSprite.src = 'assets/sprites/HEART_LOCKET.png';
  function getLocketAspect() {
    return locketSprite.naturalWidth > 0 ? locketSprite.naturalWidth / locketSprite.naturalHeight : 0.26;
  }

  function buildSpinPath() {
    const SP = LOCKET_SPIN;
    const K = SP.GRAVITY;
    const ease = (keys, t) => {
      if (t <= keys[0][0]) return keys[0][1];
      for (let i = 0; i < keys.length - 1; i++) {
        const [t0, v0] = keys[i], [t1, v1] = keys[i + 1];
        if (t <= t1) {
          const u = 0.5 - 0.5 * Math.cos(Math.PI * (t - t0) / (t1 - t0));
          return v0 + (v1 - v0) * u;
        }
      }
      return keys[keys.length - 1][1];
    };
    const path = [];
    let th = 0, w = 0, dir = 1, prev = 0;
    for (let f = 0; f < SP.MAX_FRAMES; f++) {
      const drag = ease(SP.DAMP_KEYS, f);
      const floor = ease(SP.PUSH_KEYS, f) * 2 * Math.sqrt(K);
      w += -K * Math.sin(th) - drag * w;
      if (w !== 0) dir = w > 0 ? 1 : -1;
      th += w;
      const potential = 2 * K * (1 - Math.cos(th));
      if (w * w + potential < floor * floor) {
        w = dir * Math.sqrt(Math.max(floor * floor - potential, 0));
      }
      path.push(th);
      if (f > SP.MIN_FRAMES && prev !== 0 && (w > 0) !== (prev > 0) && Math.abs(w) < 0.02) break;
      prev = w;
    }
    return path;
  }

  const SLASH = {
    BEATS: 4,
    FIRST_DELAY: 30,
    TRACK: 34,
    LOCK: 10,
    WINDUP: 8,
    RECOVER: 26,
    GAP: 10,
    LINE_THICKNESS: 3,
    LINE_LENGTH: 1400,
    BEAM_MAX: 40,
    BEAM_TAIL: 16,
    BEAM_FRAMES: 14,
    BEAM_HIT_FRAMES: 11,
    MARK_SCALE: 4,
    MARK_TICKS: 2,
    HAND_X: 46,
    HAND_Y: 50
  };

  SLASH.ANIM_START = SLASH.TRACK + SLASH.LOCK;
  SLASH.STRIKE_AT = SLASH.ANIM_START + SLASH.WINDUP + 6 * SLASH.MARK_TICKS;
  SLASH.BEAT_FRAMES = SLASH.STRIKE_AT + SLASH.RECOVER + SLASH.GAP;
  SLASH.TURN_FRAMES = SLASH.FIRST_DELAY + SLASH.BEATS * SLASH.BEAT_FRAMES + 15;

  const FRISK_SLASH_POSES = {
    down: {
      windup: [
        { torso: 'FRISK_TORSO_SLICE_UP',   handX: 47, handY: 57, yOff: -2, head: 'FRISK_HEAD_SLICE', legs: 'FRISK_LEGS_SLASH', backLegs: false },
        { torso: 'FRISK_TORSO_SLICE_UP_1', handX: 47, handY: 57, yOff: -2, head: 'FRISK_HEAD_SLICE', legs: 'FRISK_LEGS_SLASH', backLegs: false }
      ],
      strike: [
        { torso: 'FRISK_TORSO_SLICE_UP_2', handX: 47, handY: 57, yOff: 1, head: null,                 backLegs: true  },
        { torso: 'FRISK_TORSO_SLICE_UP_3', handX: 47, handY: 58, yOff: 2, head: 'FRISK_HEAD_SLICE_1', backLegs: false }
      ]
    },
    sides: {
      windup: [
        { torso: 'FRISK_TORSO_SLICE_SIDES', handX: 47, handY: 50, yOff: -2, head: 'FRISK_HEAD_SLICE', legs: 'FRISK_LEGS_SLASH', backLegs: false }
      ],
      strike: [
        { torso: 'FRISK_TORSO_SLICE_SIDES_2', handX: 47, handY: 33, yOff: 1, head: null,                 backLegs: true  },
        { torso: 'FRISK_TORSO_SLICE_SIDES_3', handX: 66, handY: 33, yOff: 2, head: 'FRISK_HEAD_SLICE_1', backLegs: false }
      ]
    }
  };

  const SLASH_MARK_FILES = ['SLASH', 'SLASH_1', 'SLASH_2', 'SLASH_3', 'SLASH_4', 'SLASH_5'];
  const slashMarkSrcs = SLASH_MARK_FILES.map(f => `${SPR}${f}.png`);
  SLASH_MARK_FILES.forEach((file, i) => {
    const img = new Image();
    img.onload = () => {
      try {
        const cv = document.createElement('canvas');
        cv.width = img.naturalWidth;
        cv.height = img.naturalHeight;
        const cx = cv.getContext('2d');
        cx.drawImage(img, 0, 0);
        const data = cx.getImageData(0, 0, cv.width, cv.height);
        for (let p = 0; p < data.data.length; p += 4) {
          if (data.data[p] > 245 && data.data[p + 1] > 245 && data.data[p + 2] > 245) data.data[p + 3] = 0;
        }
        cx.putImageData(data, 0, 0);
        slashMarkSrcs[i] = cv.toDataURL();
      } catch (e) {}
    };
    img.src = `${SPR}${file}.png`;
  });

  Object.values(FRISK_SLASH_POSES).flatMap(p => [...p.windup, ...p.strike]).forEach(f => {
    new Image().src = `${SPR}${f.torso}.png`;
    if (f.head) new Image().src = `${SPR}${f.head}.png`;
    if (f.legs) new Image().src = `${SPR}${f.legs}.png`;
  });

  let friskPoseSaved = null;

  function applyFriskSlashPose(frame, flip) {
    if (!friskHeadEl || !friskTorsoEl || !friskLegsEl) return;
    if (!friskPoseSaved) {
      friskPoseSaved = {
        head: friskHeadEl.getAttribute('src'),
        torso: friskTorsoEl.getAttribute('src'),
        legs: friskLegsEl.getAttribute('src')
      };
    }

    friskHeadEl.style.animation = 'none';
    friskTorsoEl.style.animation = 'none';

    friskHeadEl.src = frame.head ? `${SPR}${frame.head}.png` : FRISK_IDLE_SPRITES.head;
    friskHeadEl.style.visibility = 'visible';
    friskHeadEl.style.top = `${-7 + (frame.yOff || 0)}px`;
    friskHeadEl.style.transform = flip ? 'translateX(-50%) scaleX(-1)' : 'translateX(-50%)';

    const left = SLASH.HAND_X - frame.handX - 1;
    const top = SLASH.HAND_Y - frame.handY - 1 + (frame.yOff || 0);
    friskTorsoEl.src = `${SPR}${frame.torso}.png`;
    friskTorsoEl.style.left = `${left}px`;
    friskTorsoEl.style.top = `${top}px`;
    friskTorsoEl.style.transformOrigin = `${26 - left}px 0`;
    friskTorsoEl.style.transform = flip ? 'scaleX(-1)' : 'none';

    if (frame.backLegs) {
      friskLegsEl.src = FRISK_DODGE_SPRITES.back.legs;
    } else if (frame.legs) {
      friskLegsEl.src = `${SPR}${frame.legs}.png`;
    } else {
      friskLegsEl.src = friskPoseSaved.legs || FRISK_IDLE_SPRITES.legs;
    }
    friskLegsEl.style.transform = frame.legs && flip ? 'translateX(-50%) scaleX(-1)' : '';
  }

  function resetFriskSlashPose() {
    if (!friskPoseSaved || !friskHeadEl || !friskTorsoEl || !friskLegsEl) return;
    friskHeadEl.setAttribute('src', friskPoseSaved.head);
    friskTorsoEl.setAttribute('src', friskPoseSaved.torso);
    friskLegsEl.setAttribute('src', friskPoseSaved.legs);
    friskLegsEl.style.transform = '';
    [friskHeadEl, friskTorsoEl].forEach(el => {
      el.style.animation = '';
      el.style.transform = '';
      el.style.transformOrigin = '';
      el.style.left = '';
      el.style.top = '';
      el.style.visibility = '';
    });
    friskPoseSaved = null;
  }

  function distPointToSegment(px, py, ax, ay, bx, by) {
    const abx = bx - ax, aby = by - ay;
    const t = Math.max(0, Math.min(1, ((px - ax) * abx + (py - ay) * aby) / (abx * abx + aby * aby)));
    return Math.hypot(px - (ax + abx * t), py - (ay + aby * t));
  }

  (function applyHumanTurnCssVars() {
    const s = document.documentElement.style;
    s.setProperty('--soul-size', `${SOUL_SIZE}px`);
    s.setProperty('--knife-w', `${KNIFE_W}px`);
    s.setProperty('--knife-h', `${KNIFE_H}px`);
    s.setProperty('--locket-w', `${LOCKET_W}px`);
    s.setProperty('--locket-h', `${LOCKET_H}px`);
  })();

  function isTightCollision(soulPos, p) {
    const isKnife = p.type === 'knife';
    const insetX = isKnife ? 0.30 : 0.22;
    const insetY = isKnife ? 0.08 : 0.12;

    let halfW = (p.w * (1 - 2 * insetX)) / 2;
    let halfH = (p.h * (1 - 2 * insetY)) / 2;

    if (isKnife && (p.dir === 'left' || p.dir === 'right')) {
      [halfW, halfH] = [halfH, halfW];
    }

    const pHit = {
      left: p.cx - halfW,
      right: p.cx + halfW,
      top: p.cy - halfH,
      bottom: p.cy + halfH
    };

    const soulHit = {
      left: soulPos.x + SOUL_HIT_INSET,
      right: soulPos.x + SOUL_SIZE - SOUL_HIT_INSET,
      top: soulPos.y + SOUL_HIT_INSET,
      bottom: soulPos.y + SOUL_SIZE - SOUL_HIT_INSET
    };

    return !(
      soulHit.right < pHit.left ||
      soulHit.left > pHit.right ||
      soulHit.bottom < pHit.top ||
      soulHit.top > pHit.bottom
    );
  }

  function spawnKnifeTrail(p) {
    if (!dialogueBox) return;
    const trail = document.createElement('div');
    trail.className = 'knife-trail';
    trail.style.left = `${p.cx - p.w / 2}px`;
    trail.style.top = `${p.cy - p.h / 2}px`;
    trail.style.transform = `rotate(${p.rotation}deg)`;
    dialogueBox.appendChild(trail);

    requestAnimationFrame(() => {
      trail.style.opacity = '0';
    });

    setTimeout(() => {
      trail.remove();
    }, 220);
  }

  function updateKnifeFlash(p) {
    const total = (p.trackFrames || KNIFE_TRACK_FRAMES) + KNIFE_LOCK_FRAMES;
    p.age++;
    p.flashCountdown--;
    if (p.flashCountdown <= 0) {
      p.flashOn = !p.flashOn;
      p.el.classList.toggle('flash-red', p.flashOn);
      if (p.flashOn) sounds.play('blip', 0.5);
      const t = Math.min(1, p.age / total);
      const half = KNIFE_FLASH_SLOW - (KNIFE_FLASH_SLOW - KNIFE_FLASH_FAST) * t * t;
      p.flashCountdown = Math.max(KNIFE_FLASH_FAST, Math.round(half));
    }
  }

  function placeProjectile(p) {
    p.el.style.left = `${p.cx - p.w / 2}px`;
    p.el.style.top = `${p.cy - p.h / 2}px`;
    p.el.style.transform = `rotate(${p.rotation}deg)`;
  }

function shouldHumanHeal() {
    if (healedLastRound) return false;
    if (friskCurrentHP >= friskMaxHP) return false;

    const usable = humanInventory.filter(i => i.qty > 0);
    if (usable.length === 0) return false;

    const missing = friskMaxHP - friskCurrentHP;

    const minHealAvailable = Math.min(...usable.map(i => i.heal));
    if (missing < 12 && friskCurrentHP > 30) return false;
    if (missing < minHealAvailable * 0.35 && friskCurrentHP > 30) return false;

    const missingRatio = missing / friskMaxHP;
    const chance = Math.min(0.85, 0.2 + missingRatio * 0.7);
    return Math.random() < chance;
  }

  function pickHealItem() {
    const usable = humanInventory.filter(i => i.qty > 0);
    if (usable.length === 0) return null;

    const missing = friskMaxHP - friskCurrentHP;
    let bestItem = usable[0];
    let bestScore = Infinity;

    usable.forEach(item => {
      const overheal = Math.max(0, item.heal - missing);
      const underheal = Math.max(0, missing - item.heal);

      let score = overheal * (friskCurrentHP > 30 ? 2.0 : 0.5) + underheal * 0.5;

      if (item.atkBuff && humanAtkBuffRounds === 0) score -= 25;
      if (item.spdBuff && humanSpdBuffRounds === 0) score -= 20;

      if (score < bestScore) {
        bestScore = score;
        bestItem = item;
      }
    });

    return bestItem;
  }

  function performHumanHeal() {
    const item = pickHealItem();
    if (!item) return;

    item.qty--;
    healedLastRound = true;

    const actualHeal = healFrisk(item.heal);
    spawnHealNumber(actualHeal);
    sounds.play('heal', 0.9);

    let flavor = `* The human quickly eats the ${item.name}.\n* Healed ${actualHeal} HP!`;

    if (item.atkBuff) {
      humanAtkBuffRounds = ATK_BUFF_ROUNDS;
      setTimeout(() => sounds.play('dingding', 0.9), 300);
      flavor += `\n* Their determination burns brighter... ATK is rising!`;
    }
    if (item.spdBuff) {
      humanSpdBuffRounds = SPD_BUFF_ROUNDS;
      flavor += `\n* They feel lighter on their feet...`;
    }

    nextTextAction = 'mainMenu';
    currentState = STATES.TEXT_DISPLAY;
    updateButtonState();
    currentResultText = flavor;
    typeText(currentResultText);
  }

  function decideAndRunHumanTurn() {
    if (shouldHumanHeal()) {
      performHumanHeal();
      return;
    }
    healedLastRound = false;
    startHumanTurn();
  }

  function killHuman() {
    if (currentState === STATES.GAME_OVER) return; 
    currentState = STATES.GAME_OVER; 
    stopTyping();

    friskCurrentHP = 0;
    friskKR = 0;
    updateFriskHPDisplay();
    clearFriskHPBar();
    document.getElementById('frisk-hp-box')?.classList.remove('show');
    
    if (typeof sounds.fadeOutBGM === 'function') {
        sounds.fadeOutBGM(2500);
    } else {
        sounds.stopBGM();
    }

    const friskEl = document.getElementById('frisk');
    const friskHeadEl = document.querySelector('.frisk-head');
    const friskTorsoEl = document.querySelector('.frisk-torso');
    const friskLegsEl = document.querySelector('.frisk-legs');

    if (friskHeadEl) {
        friskHeadEl.src = SPR + 'FRISK_HEAD_DOWN.png';
        friskHeadEl.style.transform = '';
    }
    if (friskTorsoEl) {
        friskTorsoEl.src = SPR + 'FRISK_TORSO_DEAD.png';
        friskTorsoEl.style.transform = '';
    }
    if (friskLegsEl) {
        friskLegsEl.src = SPR + 'FRISK_LEGS_DODGING_BACK.png';
        friskLegsEl.style.transform = '';
    }
    if (friskEl) {
        friskEl.classList.remove('frisk-dodge-left', 'frisk-dodge-right', 'frisk-dodge-back');
        friskEl.classList.add('hit-shake-continuous');
    }

    const shakeSoundInterval = setInterval(() => {
        sounds.play('hurt', 0.8);
    }, 300);

    const chestSoul = document.createElement('div');
    chestSoul.style.backgroundImage = "url('assets/sprites/SOUL.png')";
    chestSoul.style.filter = RED_TINT_FILTER;
    chestSoul.style.position = 'absolute';
    chestSoul.style.left = '50%';
    chestSoul.style.top = '15px';
    chestSoul.style.transform = 'translateX(-50%) scale(0.333)';
    chestSoul.style.width = '20px';
    chestSoul.style.height = '20px';
    chestSoul.style.backgroundSize = 'contain';
    chestSoul.style.opacity = '0';
    chestSoul.style.transition = 'opacity 2.5s ease-in';
    chestSoul.style.zIndex = '10';
    
    if (friskEl) {
        friskEl.appendChild(chestSoul);
        requestAnimationFrame(() => chestSoul.style.opacity = '1');
    }

    const blackOut = document.createElement('div');
    blackOut.style.position = 'absolute';
    blackOut.style.top = '0';
    blackOut.style.left = '0';
    blackOut.style.width = '100%';
    blackOut.style.height = '100%';
    blackOut.style.backgroundColor = 'black';
    blackOut.style.opacity = '0';
    blackOut.style.transition = 'opacity 3.5s ease-in';
    blackOut.style.zIndex = '140'; 
    gameContainer.appendChild(blackOut);

    setTimeout(() => {
        blackOut.style.opacity = '1';
    }, 400);

    setTimeout(() => {
        clearInterval(shakeSoundInterval); 

        if (friskEl) friskEl.classList.remove('hit-shake-continuous');
        
        const chestRect = elementPosInGameContainer(chestSoul);
        chestSoul.remove(); 

        const isolatedSoul = document.createElement('div');
        isolatedSoul.style.position = 'absolute';
        isolatedSoul.style.left = chestRect.x + 'px'; 
        isolatedSoul.style.top = chestRect.y + 'px';
        isolatedSoul.style.width = '20px';
        isolatedSoul.style.height = '20px';
        isolatedSoul.style.backgroundImage = "url('assets/sprites/SOUL.png')";
        isolatedSoul.style.filter = RED_TINT_FILTER;
        isolatedSoul.style.backgroundSize = 'contain';
        isolatedSoul.style.backgroundRepeat = 'no-repeat'
        isolatedSoul.style.zIndex = '150'; 
        isolatedSoul.classList.add('slow-shake'); 
        gameContainer.appendChild(isolatedSoul);

        setTimeout(() => {
            isolatedSoul.remove();
            
            const originalZIndex = attackArena.style.zIndex;

            shatterSoul(chestRect.x, chestRect.y, {
                size: 20,
                tint: 'red',
                onDone: () => {    
                    setTimeout(() => {
                        sounds.play('static', 0.8);
                        playStaticEffect(600);
                        
                        const now = new Date();
                        const hrs = now.getHours();
                        const mins = now.getMinutes().toString().padStart(2, '0');
                        const timeStr = hrs + ':' + mins; 
                        
                        const saveScreen = document.createElement('div');
                        saveScreen.id = 'save-continue-screen';
                        saveScreen.style.position = 'absolute';
                        saveScreen.style.top = '0';
                        saveScreen.style.left = '0';
                        saveScreen.style.width = '100%';
                        saveScreen.style.height = '100%';
                        saveScreen.style.backgroundColor = 'black';
                        saveScreen.style.color = 'white';
                        saveScreen.style.fontFamily = "'8BitOperator', monospace";
                        saveScreen.style.zIndex = '9998'; 
                        saveScreen.style.display = 'flex';
                        saveScreen.style.flexDirection = 'column';
                        saveScreen.style.alignItems = 'center';
                        saveScreen.style.justifyContent = 'center';

                        saveScreen.innerHTML = 
                            '\x3Cdiv style="width: 480px; text-align: left; font-size: 32px; margin-bottom: 60px;"\x3E' +
                                '\x3Cdiv style="display: flex; justify-content: space-between;"\x3E' +
                                    '\x3Cspan\x3EChara\x3C/span\x3E' +
                                    '\x3Cspan\x3ELV 19\x3C/span\x3E' +
                                    '\x3Cspan\x3E' + timeStr + '\x3C/span\x3E' +
                                '\x3C/div\x3E' +
                            '\x3C/div\x3E' +
                            '\x3Cdiv style="display: flex; gap: 120px; font-size: 32px; margin-left: 30px;"\x3E' +
                                '\x3Cdiv style="color: #ffff00; position: relative;"\x3E' +
                                    '\x3Cdiv style="position: absolute; left: -35px; top: 6px; width: 22px; height: 22px; background-image: url(\'assets/sprites/SOUL.png\'); background-size: contain; background-repeat: no-repeat; filter: brightness(0) saturate(100%) invert(11%) sepia(96%) saturate(6478%) hue-rotate(358deg) brightness(102%) contrast(115%);"\x3E\x3C/div\x3E' +
                                    'Continue' +
                                '\x3C/div\x3E' +
                                '\x3Cdiv style="color: white; opacity: 0.8;"\x3EReset\x3C/div\x3E' +
                            '\x3C/div\x3E';

                        gameContainer.appendChild(saveScreen);

                        setTimeout(() => {
                            sounds.play('save', 1.0);
                            
                            blackOut.remove();
                            saveScreen.remove();
                            attackArena.style.zIndex = originalZIndex;
                            
                            if (friskHeadEl) friskHeadEl.src = FRISK_IDLE_SPRITES.head;
                            if (friskTorsoEl) friskTorsoEl.src = FRISK_IDLE_SPRITES.torso;
                            if (friskLegsEl) friskLegsEl.src = FRISK_IDLE_SPRITES.legs;
                            
                            attackArena.style.zIndex = originalZIndex;
                            
                            startHumanRematch(); 
                        }, 1600);
                    }, 2500); 
                }
            });
        }, 2500); 
    }, 3900); 
}

  function startHumanRematch() {
    humanDeathCount++;

    friskCurrentHP = friskMaxHP;
    friskKR = 0;
    updateFriskHPDisplay();

    currentSP = maxSP;
    updateSPDisplay(true);

    humanAtkBuffRounds = 0;
    humanSpdBuffRounds = 0;
    healedLastRound = false;
    nextTextAction = 'humanTurn';

    stopTyping();
    dialogueQueue = [];
    currentResultText = '';

    humanInventory.length = 0;
    humanInventory.push(...rollHumanInventory());

    restoreSansItems();

    currentBtnIndex = 0;
    flavorIndex = 0;
    resetBulletBox();

    sounds.playBGM('no_hope', 'mp3', 0.5);

    currentState = STATES.MAIN_MENU;
    updateButtonState();
    currentResultText = getCurrentFlavorText();
    typeText(currentResultText);
  }
  
  function advanceFromTextDisplay() {
    if (dialogueQueue.length > 0) {
        currentResultText = dialogueQueue.shift();
        typeText(currentResultText);
        return;
    }

    if (nextTextAction === 'mainMenu') {
        nextTextAction = 'humanTurn';
        decrementHumanBuffs();
        currentState = STATES.MAIN_MENU;
        updateButtonState();
        advanceFlavorText();
        typeText(getCurrentFlavorText());
        return;
    }
    decideAndRunHumanTurn();
  }

  let keysPressed = {};
  let soulPos = { x: 0, y: 0 };
  //let humanLoopId = null;

  function startHumanTurn() {
    currentState = STATES.HUMAN_ATTACK;
    dialogueText.innerHTML = '';

    dialogueBox.style.overflow = 'visible';

    resizeBulletBox(HUMAN_BOX_OUTER, HUMAN_BOX_OUTER);
    const BOX = HUMAN_BOX_INNER;

    soulPos = { x: BOX / 2 - SOUL_SIZE / 2, y: BOX / 2 - SOUL_SIZE / 2 };

    const soul = document.createElement('div');
    soul.className = 'dodge-soul';
    soul.id = 'dodge-soul';
    soul.style.left = `${soulPos.x}px`;
    soul.style.top = `${soulPos.y}px`;
    dialogueBox.appendChild(soul);

    const soulCenterX = () => soulPos.x + SOUL_SIZE / 2;
    const soulCenterY = () => soulPos.y + SOUL_SIZE / 2;

    const activeProjectiles = [];
    let spinner = null;
    const slashes = [];
    let spinnerClip = null;

    const moveMult = restSlowNextTurn ? REST_SPEED_MULT : 1;
    restSlowNextTurn = false;

    let invincibleUntil = 0;
    let ivStart = 0;
    let teleporting = false;
    const isInvincible = () => performance.now() < invincibleUntil;

    function spriteHalfExtents(p) {
      let hw = p.w / 2, hh = p.h / 2;
      if (p.type === 'knife' && (p.dir === 'left' || p.dir === 'right')) [hw, hh] = [hh, hw];
      return { hw, hh };
    }

    function getDangerRects() {
      const rects = [];
      const pad = SOUL_SIZE / 2 + 8;
      const lookahead = 50;
      activeProjectiles.forEach(p => {
        if (p.type === 'knife' && p.state === 'tracking') return;
        const { hw, hh } = spriteHalfExtents(p);

        if (p.type === 'knife' && p.state === 'locked') {
          if (p.dir === 'top' || p.dir === 'bottom') {
            rects.push({ l: p.cx - hw - pad, r: p.cx + hw + pad, t: -1e4, b: 1e4 });
          } else {
            rects.push({ l: -1e4, r: 1e4, t: p.cy - hh - pad, b: p.cy + hh + pad });
          }
        } else {
          const ex = p.cx + p.vx * lookahead;
          const ey = p.cy + p.vy * lookahead;
          rects.push({
            l: Math.min(p.cx, ex) - hw - pad,
            r: Math.max(p.cx, ex) + hw + pad,
            t: Math.min(p.cy, ey) - hh - pad,
            b: Math.max(p.cy, ey) + hh + pad
          });
        }
      });
      return rects;
    }

    function spinnerClearance(px, py) {
      const s = spinner;
      if (inCornerZone(px, py)) return 500;
      let best = 500;
      for (const ahead of [0, 12, 24]) {
        const a = s.angle + s.omega * ahead;
        const tx = s.pivotX - Math.sin(a) * s.len;
        const ty = s.pivotY + Math.cos(a) * s.len;
        best = Math.min(best, distPointToSegment(px, py, s.pivotX, s.pivotY, tx, ty) - s.wid * 0.3);
      }
      return best;
    }

    function slashClearance(px, py) {
      let best = 500;
      for (const s of slashes) {
        if (!s.locked || s.done) continue;
        const d = s.dir === 'down' ? Math.abs(px - s.lockX) : Math.abs(py - s.lockY);
        best = Math.min(best, d - SLASH.BEAM_MAX / 2);
      }
      return best;
    }

    function pickSafePosition() {
      const rects = getDangerRects();
      const margin = 6;
      const minP = margin;
      const maxP = BOX - SOUL_SIZE - margin;
      let best = { x: soulPos.x, y: soulPos.y };
      let bestScore = -1;

      for (let i = 0; i < 80; i++) {
        const x = minP + Math.random() * (maxP - minP);
        const y = minP + Math.random() * (maxP - minP);
        const cx = x + SOUL_SIZE / 2;
        const cy = y + SOUL_SIZE / 2;

        let clearance = 500;
        for (const r of rects) {
          const dx = Math.max(r.l - cx, 0, cx - r.r);
          const dy = Math.max(r.t - cy, 0, cy - r.b);
          clearance = Math.min(clearance, Math.hypot(dx, dy));
        }
        if (spinner) clearance = Math.min(clearance, spinnerClearance(cx, cy));
        if (slashes.length) clearance = Math.min(clearance, slashClearance(cx, cy));

        const score = clearance + 0.1 * Math.hypot(x - soulPos.x, y - soulPos.y);
        if (score > bestScore) {
          bestScore = score;
          best = { x, y };
        }
      }
      return best;
    }

    function handleSoulHit() {
      const hitCost = HIT_SP_COST + (humanAtkBuffRounds > 0 ? 1 : 0);
      if (currentSP >= hitCost) {
        currentSP -= hitCost;
        updateSPDisplay();

        const now = performance.now();
        ivStart = now;
        invincibleUntil = now + IV_DURATION_MS;
        teleporting = true;

        sounds.play('switch', 0.9);
        screenFlash.style.transition = 'none';
        screenFlash.style.opacity = '1';

        setTimeout(() => {
          teleporting = false;
          if (currentState === STATES.HUMAN_ATTACK) {
            soulPos = pickSafePosition();
            soul.style.left = `${soulPos.x}px`;
            soul.style.top = `${soulPos.y}px`;
          }
          sounds.play('switch', 0.9);
          screenFlash.style.transition = `opacity ${TELEPORT_FADE_MS}ms linear`;
          screenFlash.style.opacity = '0';
        }, TELEPORT_BLACKOUT_MS);
      } else {
        resetFriskSlashPose();
        killSans();
      }
    }

    let turnTimeLeft = 360;

    const pattern = Math.floor(Math.random() * 3);

    let spawnTimeout = null;

    function spawnKnife(dir, trackFrames = KNIFE_TRACK_FRAMES) {
      sounds.play('hphw', 0.85);

      const proj = document.createElement('div');
      proj.className = 'human-projectile knife';

      let cx = 0, cy = 0, rotation = 0;
      const edge = KNIFE_H / 2 + 5;

      if (dir === 'top') {
        cx = soulCenterX();
        cy = -edge;
        rotation = 0;
      } else if (dir === 'bottom') {
        cx = soulCenterX();
        cy = BOX + edge;
        rotation = 180;
      } else if (dir === 'left') {
        cx = -edge;
        cy = soulCenterY();
        rotation = 270;
      } else {
        cx = BOX + edge;
        cy = soulCenterY();
        rotation = 90;
      }

      const p = {
        el: proj,
        type: 'knife',
        dir,
        state: 'tracking',
        timer: trackFrames,
        trackFrames,
        blipTimer: 0,
        age: 0,
        flashCountdown: 0,
        flashOn: false,
        frameCount: 0,
        w: KNIFE_W,
        h: KNIFE_H,
        cx,
        cy,
        vx: 0,
        vy: 0,
        rotation
      };

      placeProjectile(p);
      dialogueBox.appendChild(proj);
      activeProjectiles.push(p);
    }

    const countWarningKnives = () =>
      activeProjectiles.filter(k => k.type === 'knife' && k.state !== 'firing').length;

    const spawnOne = () => {
      if (turnTimeLeft <= 40 || currentState !== STATES.HUMAN_ATTACK) return;

      if (turnTimeLeft <= KNIFE_SPAWN_CUTOFF || countWarningKnives() >= MAX_ACTIVE_KNIVES) {
        spawnTimeout = setTimeout(spawnOne, 100);
        return;
      }

      const directions = ['top', 'bottom', 'left', 'right'];
      spawnKnife(directions[Math.floor(Math.random() * directions.length)]);
      spawnTimeout = setTimeout(spawnOne, KNIFE_SPAWN_MS);
    };

    const SP = LOCKET_SPIN;
    const spinPath = pattern === 1 ? buildSpinPath() : null;
    const SPIN_END = SP.FADE_IN + (spinPath ? spinPath.length : 0);
    const SPRITE_ROT = SP.SPRITE_FLIPPED ? Math.PI : 0;
    const PIVOT_ORIGIN_Y = SP.SPRITE_FLIPPED ? 1 - SP.PIVOT_FRAC : SP.PIVOT_FRAC;
    let cornerCampFrames = 0;
    let cornerCooldown = 0;

    function spawnSpinnerGhost(s, angle, strength) {
      const g = document.createElement('div');
      g.className = 'locket-spinner-ghost';
      g.style.width = `${s.wid}px`;
      g.style.height = `${s.len}px`;
      g.style.left = `${s.pivotX - s.wid / 2}px`;
      g.style.top = `${s.pivotY - s.len * PIVOT_ORIGIN_Y}px`;
      g.style.transformOrigin = `50% ${PIVOT_ORIGIN_Y * 100}%`;
      g.style.transform = `rotate(${angle + SPRITE_ROT}rad)`;
      g.style.transition = `opacity ${SP.GHOST_MS}ms ease-out`;
      g.style.opacity = String(0.18 + 0.4 * strength);
      spinnerClip.appendChild(g);
      void g.offsetWidth;
      g.style.opacity = '0';
      setTimeout(() => g.remove(), SP.GHOST_MS + 50);
    }

    function inCornerZone(cx, cy) {
      const z = SP.CORNER_ZONE;
      return (cx < z || cx > BOX - z) && (cy < z || cy > BOX - z);
    }

    function spinnerHitsSoul() {
      const s = spinner;
      const sx = soulCenterX(), sy = soulCenterY();
      if (inCornerZone(sx, sy)) return false;
      const soulR = SOUL_SIZE / 2 - SOUL_HIT_INSET;
      const ax = -Math.sin(s.angle), ay = Math.cos(s.angle);
      const hit = (d, r) => Math.hypot(sx - (s.pivotX + ax * d), sy - (s.pivotY + ay * d)) < r + soulR;

      const chainR = s.wid * 0.12;
      for (let d = 0; d <= s.len * 0.7; d += 6) if (hit(d, chainR)) return true;
      return hit(s.len * 0.76, s.wid * 0.28) ||
             hit(s.len * 0.83, s.wid * 0.34) ||
             hit(s.len * 0.90, s.wid * 0.26);
    }

    function updateSpinner() {
      const s = spinner;
      const f = s.frame++;
      let alpha = 1;
      let omega = 0;

      if (f < SP.FADE_IN) {
        alpha = f / SP.FADE_IN;
      } else if (f < SPIN_END) {
        omega = s.dirSign * spinPath[f - SP.FADE_IN] - s.angle;
      } else {
        alpha = Math.max(0, 1 - (f - SPIN_END) / SP.FADE_OUT);
      }

      const speed = Math.min(1, Math.abs(omega) / 0.075);
      if (speed > 0.06) spawnSpinnerGhost(s, s.angle, speed);

      s.omega = omega;
      s.angle += omega;
      s.el.style.opacity = String(alpha);
      s.el.style.transform = `rotate(${s.angle + SPRITE_ROT}rad)`;

      const armed = f >= SP.FADE_IN && f < SPIN_END;
      if (armed && !isInvincible() && !teleporting && spinnerHitsSoul()) {
        handleSoulHit();
      }
    }

    function updateCornerCamp() {
      const inCorner = inCornerZone(soulCenterX(), soulCenterY());

      if (cornerCooldown > 0) cornerCooldown--;
      if (!inCorner) { cornerCampFrames = 0; return; }

      cornerCampFrames++;
      if (cornerCampFrames >= SP.CORNER_CAMP_FRAMES &&
          cornerCooldown <= 0 &&
          spinner.frame > SP.FADE_IN &&
          turnTimeLeft > 70 &&
          countWarningKnives() < MAX_ACTIVE_KNIVES) {
        const dirs = ['top', 'left', 'right'];
        spawnKnife(dirs[Math.floor(Math.random() * dirs.length)], SP.CORNER_KNIFE_TRACK);
        cornerCooldown = SP.CORNER_KNIFE_COOLDOWN;
      }
    }

    const SL = SLASH;
    const ANIM_AT = SL.ANIM_START;
    const MARK_AT = ANIM_AT + SL.WINDUP;
    const STRIKE_AT = SL.STRIKE_AT;
    let slashLayer = null;
    let slashTick = 0;
    let slashBeatCount = 0;
    let slashNextStart = SL.FIRST_DELAY;
    let slashLastDir = null;
    let slashBeat = null;

    function placeSlashLayer() {
      const a = attackArena.getBoundingClientRect();
      const b = dialogueBox.getBoundingClientRect();
      const k = attackArena.offsetWidth ? a.width / attackArena.offsetWidth : 1;
      slashLayer.style.left = `${(b.left - a.left) / k + BOX_BORDER}px`;
      slashLayer.style.top = `${(b.top - a.top) / k + BOX_BORDER}px`;
    }

    function startSlashBeat() {
      const options = ['down', 'left', 'right'].filter(d => d !== slashLastDir);
      const dir = options[Math.floor(Math.random() * options.length)];
      slashLastDir = dir;

      const poses = dir === 'down' ? FRISK_SLASH_POSES.down : FRISK_SLASH_POSES.sides;
      const line = document.createElement('div');
      line.className = 'slash-line';
      slashLayer.appendChild(line);

      slashBeat = {
        dir, age: 0, poses,
        flip: dir === 'right',
        lineEl: line, beamEl: null, markEl: null,
        axis: 0, lockX: 0, lockY: 0,
        locked: false, struck: false, done: false,
        flashCountdown: 0, flashOn: false
      };
      slashes.length = 0;
      slashes.push(slashBeat);
    }

    function updateSlashFlash(s) {
      s.flashCountdown--;
      if (s.flashCountdown > 0) return;
      s.flashOn = !s.flashOn;
      s.lineEl.style.backgroundColor = s.flashOn ? '#ff2a2a' : '#ffe600';
      if (s.flashOn) sounds.play('blip', 0.5);
      const t = Math.min(1, s.age / STRIKE_AT);
      const half = KNIFE_FLASH_SLOW - (KNIFE_FLASH_SLOW - KNIFE_FLASH_FAST) * t * t;
      s.flashCountdown = Math.max(KNIFE_FLASH_FAST, Math.round(half));
    }

    function slashBeamWidth(t) {
      if (t < 1) return 8;
      if (t < 2) return 8 + (SL.BEAM_MAX - 8) * (t - 1);
      if (t < 5) return SL.BEAM_MAX;
      if (t < 9) return SL.BEAM_MAX - (SL.BEAM_MAX - SL.BEAM_TAIL) * ((t - 5) / 4);
      return Math.max(0, SL.BEAM_TAIL * (1 - (t - 9) / (SL.BEAM_FRAMES - 9)));
    }

    function finishSlashBeat(s) {
      if (s.lineEl) s.lineEl.remove();
      if (s.beamEl) s.beamEl.remove();
      if (s.markEl) s.markEl.remove();
      s.done = true;
      slashes.length = 0;
      slashBeat = null;
      slashBeatCount++;
      slashNextStart = slashTick + SL.GAP;
      resetFriskSlashPose();
    }

    function updateSlashes() {
      if (!slashBeat && slashBeatCount < SL.BEATS && slashTick >= slashNextStart) startSlashBeat();
      slashTick++;
      if (!slashBeat) return;

      const s = slashBeat;
      const vertical = s.dir === 'down';
      s.age++;
      placeSlashLayer();

      if (s.age === ANIM_AT) {
        applyFriskSlashPose(s.poses.windup[0], s.flip);
        sounds.play('slash', 0.9);
      }
      if (s.age === ANIM_AT + SL.WINDUP / 2 && s.poses.windup[1]) applyFriskSlashPose(s.poses.windup[1], s.flip);
      if (s.age === MARK_AT) applyFriskSlashPose(s.poses.strike[0], s.flip);
      if (s.age === STRIKE_AT) applyFriskSlashPose(s.poses.strike[1], s.flip);

      if (s.age < STRIKE_AT) {
        if (s.age < SL.TRACK) {
          s.axis = vertical ? soulCenterX() : soulCenterY();
        } else if (!s.locked) {
          s.locked = true;
          s.lockX = soulCenterX();
          s.lockY = soulCenterY();
          s.axis = vertical ? s.lockX : s.lockY;
        }
        updateSlashFlash(s);
        const st = s.lineEl.style;
        if (vertical) {
          st.width = `${SL.LINE_THICKNESS}px`;
          st.height = `${SL.LINE_LENGTH}px`;
          st.left = `${s.axis - SL.LINE_THICKNESS / 2}px`;
          st.top = `${BOX / 2 - SL.LINE_LENGTH / 2}px`;
        } else {
          st.width = `${SL.LINE_LENGTH}px`;
          st.height = `${SL.LINE_THICKNESS}px`;
          st.left = `${BOX / 2 - SL.LINE_LENGTH / 2}px`;
          st.top = `${s.axis - SL.LINE_THICKNESS / 2}px`;
        }
      }

      if (s.age === MARK_AT) {
        const w = 32 * SL.MARK_SCALE, h = 31 * SL.MARK_SCALE;
        const mark = document.createElement('img');
        mark.className = 'slash-sprite';
        mark.style.width = `${w}px`;
        mark.style.height = `${h}px`;
        mark.style.left = `${s.lockX - w / 2}px`;
        mark.style.top = `${s.lockY - h / 2}px`;
        mark.style.transform = `rotate(${vertical ? 0 : s.dir === 'left' ? 90 : -90}deg)`;
        mark.src = slashMarkSrcs[0];
        slashLayer.appendChild(mark);
        s.markEl = mark;
      }
      if (s.markEl) {
        const frame = Math.floor((s.age - MARK_AT) / SL.MARK_TICKS);
        if (frame >= SLASH_MARK_FILES.length) {
          s.markEl.remove();
          s.markEl = null;
        } else {
          s.markEl.src = slashMarkSrcs[frame];
        }
      }

      if (s.age === STRIKE_AT) {
        s.lineEl.remove();
        s.lineEl = null;
        sounds.play(Math.random() < 0.5 ? 'hit' : 'hit2', 0.9);

        const beam = document.createElement('div');
        beam.className = 'slash-beam';
        slashLayer.appendChild(beam);
        s.beamEl = beam;
      }

      if (s.age >= STRIKE_AT) {
        const t = s.age - STRIKE_AT;

        if (s.beamEl) {
          if (t >= SL.BEAM_FRAMES) {
            s.beamEl.remove();
            s.beamEl = null;
          } else {
            const width = slashBeamWidth(t);
            const tint = t < 9 ? 0 : (t - 9) / (SL.BEAM_FRAMES - 9);
            const gb = Math.round(255 - 190 * tint);
            const st = s.beamEl.style;
            st.backgroundColor = `rgb(255, ${gb}, ${gb})`;
            if (vertical) {
              st.width = `${width}px`;
              st.height = `${SL.LINE_LENGTH}px`;
              st.left = `${s.lockX - width / 2}px`;
              st.top = `${BOX / 2 - SL.LINE_LENGTH / 2}px`;
            } else {
              st.width = `${SL.LINE_LENGTH}px`;
              st.height = `${width}px`;
              st.left = `${BOX / 2 - SL.LINE_LENGTH / 2}px`;
              st.top = `${s.lockY - width / 2}px`;
            }

            if (!s.struck && t < SL.BEAM_HIT_FRAMES && width > 4 && !isInvincible() && !teleporting) {
              const r = SOUL_SIZE / 2 - SOUL_HIT_INSET;
              const off = vertical ? Math.abs(soulCenterX() - s.lockX) : Math.abs(soulCenterY() - s.lockY);
              if (off < width / 2 + r) {
                s.struck = true;
                handleSoulHit();
                if (currentState !== STATES.HUMAN_ATTACK) return;
              }
            }
          }
        }

        if (s.age >= STRIKE_AT + SL.RECOVER) finishSlashBeat(s);
      }
    }

    if (pattern === 0) {
      spawnTimeout = setTimeout(spawnOne, 380);
    } else if (pattern === 2) {
      resetFriskSlashPose();
      slashLayer = document.createElement('div');
      slashLayer.className = 'slash-layer';
      slashLayer.style.width = `${BOX}px`;
      slashLayer.style.height = `${BOX}px`;
      attackArena.appendChild(slashLayer);
      placeSlashLayer();
      turnTimeLeft = SL.TURN_FRAMES;
    } else {
      const len = SP.LENGTH;
      const wid = len * getLocketAspect();

      spinnerClip = document.createElement('div');
      spinnerClip.className = 'locket-spinner-clip';
      spinnerClip.style.width = `${BOX}px`;
      spinnerClip.style.height = `${BOX}px`;
      if (SP.CORNER_CLIP) {
        const n = SP.CORNER_ZONE + 8, B = BOX;
        spinnerClip.style.clipPath =
          `polygon(${n}px 0, ${B - n}px 0, ${B - n}px ${n}px, ${B}px ${n}px, ${B}px ${B - n}px, ${B - n}px ${B - n}px, ${B - n}px ${B}px, ${n}px ${B}px, ${n}px ${B - n}px, 0 ${B - n}px, 0 ${n}px, ${n}px ${n}px)`;
      }

      const el = document.createElement('div');
      el.className = 'human-projectile locket-spinner';
      const pivotX = BOX * SP.PIVOT_X;
      const pivotY = BOX * SP.PIVOT_Y;
      el.style.width = `${wid}px`;
      el.style.height = `${len}px`;
      el.style.left = `${pivotX - wid / 2}px`;
      el.style.top = `${pivotY - len * PIVOT_ORIGIN_Y}px`;
      el.style.transformOrigin = `50% ${PIVOT_ORIGIN_Y * 100}%`;
      el.style.opacity = '0';

      turnTimeLeft = SPIN_END + SP.FADE_OUT;
      spinnerClip.appendChild(el);
      dialogueBox.appendChild(spinnerClip);
      sounds.play('hphw', 0.85);

      spinner = {
        el, len, wid, pivotX, pivotY,
        angle: 0,
        omega: 0,
        frame: 0,
        dirSign: Math.random() < 0.5 ? 1 : -1
      };
    }

    function updateHumanTurn() {
      if (currentState !== STATES.HUMAN_ATTACK) return;

      const speed = 2.2 * moveMult;
      const canMove = !teleporting;
      if (canMove && keysPressed['ArrowLeft'] || keysPressed['a'] || keysPressed['A']) soulPos.x -= speed;
      if (canMove && keysPressed['ArrowRight'] || keysPressed['d'] || keysPressed['D']) soulPos.x += speed;
      if (canMove && keysPressed['ArrowUp'] || keysPressed['w'] || keysPressed['W']) soulPos.y -= speed;
      if (canMove && keysPressed['ArrowDown'] || keysPressed['s'] || keysPressed['S']) soulPos.y += speed;
      if (canMove) {
        soulPos.x += joystick.x * speed;
        soulPos.y += joystick.y * speed;
      }

      const margin = 4;
      soulPos.x = Math.max(margin, Math.min(BOX - SOUL_SIZE - margin, soulPos.x));
      soulPos.y = Math.max(margin, Math.min(BOX - SOUL_SIZE - margin, soulPos.y));

      soul.style.left = `${soulPos.x}px`;
      soul.style.top = `${soulPos.y}px`;

      if (isInvincible()) {
        const phase = Math.floor((performance.now() - ivStart) / IV_FLICKER_MS) % 2;
        soul.style.opacity = phase === 0 ? String(IV_DIM_OPACITY) : '1';
      } else {
        soul.style.opacity = '1';
      }

      for (let i = activeProjectiles.length - 1; i >= 0; i--) {
        const p = activeProjectiles[i];

        if (p.type === 'knife' && p.state === 'tracking') {
          if (p.dir === 'top' || p.dir === 'bottom') {
            p.cx += (soulCenterX() - p.cx) * 0.16;
          } else {
            p.cy += (soulCenterY() - p.cy) * 0.16;
          }
          placeProjectile(p);

          updateKnifeFlash(p);

          p.timer--;
          if (p.timer <= 0) {
            p.state = 'locked';
            p.timer = KNIFE_LOCK_FRAMES;
            p.blipTimer = 0;
          }
        } else if (p.type === 'knife' && p.state === 'locked') {
          updateKnifeFlash(p);

          p.timer--;
          if (p.timer <= 0) {
            p.state = 'firing';
            p.el.classList.remove('flash-red');
            sounds.play('slice', 0.85);

            if (p.dir === 'top') {
              p.vx = 0;
              p.vy = KNIFE_FLY_SPEED;
            } else if (p.dir === 'bottom') {
              p.vx = 0;
              p.vy = -KNIFE_FLY_SPEED;
            } else if (p.dir === 'left') {
              p.vx = KNIFE_FLY_SPEED;
              p.vy = 0;
            } else {
              p.vx = -KNIFE_FLY_SPEED;
              p.vy = 0;
            }
          }
        } else {
          p.cx += p.vx;
          p.cy += p.vy;
          placeProjectile(p);
          if (p.type === 'knife') {
            p.frameCount++;
            if (p.frameCount % 2 === 0) {
              spawnKnifeTrail(p);
            }
          }

          if (!isInvincible() && !teleporting && isTightCollision(soulPos, p)) {
            handleSoulHit();
            if (currentState !== STATES.HUMAN_ATTACK) return;
          }

          const m = 40 + Math.max(p.w, p.h);
          if (p.cy > BOX + m || p.cx < -m || p.cx > BOX + m || p.cy < -m) {
            p.el.remove();
            activeProjectiles.splice(i, 1);
          }
        }
      }

      if (pattern === 2) {
        updateSlashes();
        if (currentState !== STATES.HUMAN_ATTACK) return;
      }

      if (spinner) {
        updateSpinner();
        if (currentState !== STATES.HUMAN_ATTACK) return;
        updateCornerCamp();
      }

      turnTimeLeft--;

      if (turnTimeLeft <= 0) {
        clearTimeout(spawnTimeout);
        activeProjectiles.forEach(p => p.el.remove());
        if (spinnerClip) spinnerClip.remove();
        if (slashLayer) slashLayer.remove();
        resetFriskSlashPose();
        soul.remove();

        resetBulletBox();

        decrementHumanBuffs();
        currentState = STATES.MAIN_MENU;
        updateButtonState();
        advanceFlavorText();
        typeText(getCurrentFlavorText());
      } else {
        humanLoopId = requestAnimationFrame(updateHumanTurn);
      }
    }

    humanLoopId = requestAnimationFrame(updateHumanTurn);
  }

  window.addEventListener('keydown', (e) => {
    keysPressed[e.key] = true;
  });

  window.addEventListener('keyup', (e) => {
    keysPressed[e.key] = false;
  });

  gameContainer.addEventListener('keydown', (e) => {
    if (e.repeat && currentState !== STATES.HUMAN_ATTACK) return;

    if (currentState === STATES.GAME_OVER) {
      return;
    }

    if (currentState === STATES.INTRO) {
      if (e.key === 'Enter' || e.key === 'z' || e.key === 'Z') {
        startEncounterSequence();
      }
      return;
    }

    const key = e.key;

    if (currentState === STATES.MAIN_MENU) {
      if (key === 'ArrowRight' || key === 'd' || key === 'D') {
        currentBtnIndex = (currentBtnIndex + 1) % buttons.length;
        sounds.play('change');
        updateButtonState();
      } else if (key === 'ArrowLeft' || key === 'a' || key === 'A') {
        currentBtnIndex = (currentBtnIndex - 1 + buttons.length) % buttons.length;
        sounds.play('change');
        updateButtonState();
      } else if (key === 'Enter' || key === 'z' || key === 'Z') {
        openSubMenu(currentBtnIndex);
      }
    } 
    else if (currentState === STATES.SUB_MENU) {
      const optionsCount = getSubMenuOptions(currentBtnIndex).length;
      let moved = false;

      if (key === 'ArrowRight' || key === 'd' || key === 'D') {
        if (currentOptionIndex % 2 === 0 && currentOptionIndex + 1 < optionsCount) {
          currentOptionIndex += 1;
          moved = true;
        }
      } else if (key === 'ArrowLeft' || key === 'a' || key === 'A') {
        if (currentOptionIndex % 2 === 1) {
          currentOptionIndex -= 1;
          moved = true;
        }
      } else if (key === 'ArrowDown' || key === 's' || key === 'S') {
        if (currentOptionIndex + 2 < optionsCount) {
          currentOptionIndex += 2;
          moved = true;
        }
      } else if (key === 'ArrowUp' || key === 'w' || key === 'W') {
        if (currentOptionIndex - 2 >= 0) {
          currentOptionIndex -= 2;
          moved = true;
        }
      } else if (key === 'Enter' || key === 'z' || key === 'Z') {
        executeSubMenuOption(currentOptionIndex);
        return;
      } else if (key === 'x' || key === 'X' || key === 'Shift' || key === 'Escape') {
        cancelSubMenu();
        return;
      }

      if (moved) {
        sounds.play('change');
        updateSubMenuHighlight();
      }
    } 
    else if (currentState === STATES.TEXT_DISPLAY) {
      if (key === 'Enter' || key === 'z' || key === 'Z' || key === 'x' || key === 'X' || key === 'Shift') {
        if (isTyping) {
          finishTypingInstantly(currentResultText);
        } else {
          advanceFromTextDisplay();
        }
      }
    }
  });

  if (!isMobile) dialogueBox.addEventListener('click', () => {
    if (currentState === STATES.TEXT_DISPLAY) {
      if (isTyping) {
        finishTypingInstantly(currentResultText);
      } else {
        advanceFromTextDisplay();
      }
    }
  });

  if (!isMobile) buttons.forEach((btn, idx) => {
    btn.addEventListener('mouseenter', () => {
      if (currentState === STATES.MAIN_MENU && currentBtnIndex !== idx) {
        currentBtnIndex = idx;
        sounds.play('change');
        updateButtonState();
      }
    });

    btn.addEventListener('click', () => {
      if (currentState === STATES.MAIN_MENU) {
        currentBtnIndex = idx;
        openSubMenu(idx);
      }
    });
  });
});