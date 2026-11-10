// ==========================================
// Chrome Dino Game with Web Audio API
// ==========================================

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const scoreText = document.getElementById('scoreText');
const hiScoreText = document.getElementById('hiScoreText');
const overlay = document.getElementById('overlay');
const overlayTitle = document.getElementById('overlayTitle');
const overlaySubtitle = document.getElementById('overlaySubtitle');
const startBtn = document.getElementById('startBtn');
const soundToggle = document.getElementById('soundToggle');

// ---------------- Sound System (Web Audio API) ----------------
let audioCtx = null;
let soundEnabled = true;

function initAudio() {
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
}

soundToggle.addEventListener('change', (e) => {
  soundEnabled = e.target.checked;
});

function playJumpSound() {
  if (!soundEnabled) return;
  initAudio();
  if (!audioCtx) return;

  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();

  const now = audioCtx.currentTime;
  osc.type = 'square';
  osc.frequency.setValueAtTime(150, now);
  osc.frequency.exponentialRampToValueAtTime(600, now + 0.12);

  gain.gain.setValueAtTime(0.18, now);
  gain.gain.exponentialRampToValueAtTime(0.01, now + 0.12);

  osc.connect(gain);
  gain.connect(audioCtx.destination);

  osc.start(now);
  osc.stop(now + 0.12);
}

function playScoreSound() {
  if (!soundEnabled) return;
  initAudio();
  if (!audioCtx) return;

  const now = audioCtx.currentTime;
  
  // High beep 1
  const osc1 = audioCtx.createOscillator();
  const gain1 = audioCtx.createGain();
  osc1.type = 'sine';
  osc1.frequency.setValueAtTime(880, now);
  gain1.gain.setValueAtTime(0.15, now);
  gain1.gain.exponentialRampToValueAtTime(0.01, now + 0.08);
  osc1.connect(gain1);
  gain1.connect(audioCtx.destination);
  osc1.start(now);
  osc1.stop(now + 0.08);

  // High beep 2
  const osc2 = audioCtx.createOscillator();
  const gain2 = audioCtx.createGain();
  osc2.type = 'sine';
  osc2.frequency.setValueAtTime(1320, now + 0.09);
  gain2.gain.setValueAtTime(0.15, now + 0.09);
  gain2.gain.exponentialRampToValueAtTime(0.01, now + 0.22);
  osc2.connect(gain2);
  gain2.connect(audioCtx.destination);
  osc2.start(now + 0.09);
  osc2.stop(now + 0.22);
}

function playGameOverSound() {
  if (!soundEnabled) return;
  initAudio();
  if (!audioCtx) return;

  const now = audioCtx.currentTime;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();

  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(220, now);
  osc.frequency.linearRampToValueAtTime(80, now + 0.35);

  gain.gain.setValueAtTime(0.22, now);
  gain.gain.linearRampToValueAtTime(0.01, now + 0.35);

  osc.connect(gain);
  gain.connect(audioCtx.destination);

  osc.start(now);
  osc.stop(now + 0.35);
}

// ---------------- Game Physics & Constants ----------------
const CANVAS_WIDTH = canvas.width;
const CANVAS_HEIGHT = canvas.height;
const GROUND_Y = 200;
const GRAVITY = 0.65;
const JUMP_STRENGTH = -12.5;

let isPlaying = false;
let isGameOver = false;
let score = 0;
let hiScore = localStorage.getItem('dino_hi_score') ? parseInt(localStorage.getItem('dino_hi_score'), 10) : 0;
let gameSpeed = 5;
let animationFrameId = null;
let lastObstacleSpawn = 0;
let minObstacleDistance = 85;

// Update UI High Score
function updateHiScoreDisplay() {
  hiScoreText.innerText = 'HI ' + String(hiScore).padStart(5, '0');
}
updateHiScoreDisplay();

// ---------------- Dino Entity ----------------
const dino = {
  x: 50,
  y: GROUND_Y - 45,
  width: 44,
  height: 47,
  duckHeight: 28,
  velocityY: 0,
  isJumping: false,
  isDucking: false,
  legTimer: 0,
  legStep: false,

  reset() {
    this.x = 50;
    this.y = GROUND_Y - 45;
    this.velocityY = 0;
    this.isJumping = false;
    this.isDucking = false;
    this.legTimer = 0;
  },

  jump() {
    if (!this.isJumping && !this.isDucking) {
      this.velocityY = JUMP_STRENGTH;
      this.isJumping = true;
      playJumpSound();
    }
  },

  update() {
    // Jump mechanics
    if (this.isJumping) {
      this.velocityY += GRAVITY;
      this.y += this.velocityY;

      const currentH = this.isDucking ? this.duckHeight : this.height;
      if (this.y >= GROUND_Y - currentH) {
        this.y = GROUND_Y - currentH;
        this.isJumping = false;
        this.velocityY = 0;
      }
    } else {
      const currentH = this.isDucking ? this.duckHeight : this.height;
      this.y = GROUND_Y - currentH;
    }

    // Running animation
    this.legTimer++;
    if (this.legTimer > 6) {
      this.legStep = !this.legStep;
      this.legTimer = 0;
    }
  },

  draw() {
    ctx.fillStyle = '#535353';

    if (this.isDucking) {
      // Ducking Dino
      const dw = 55;
      const dh = this.duckHeight;
      const dx = this.x;
      const dy = this.y;

      // Low elongated body
      ctx.fillRect(dx + 5, dy + 10, dw - 10, dh - 15);
      // Head
      ctx.fillRect(dx + dw - 20, dy + 2, 20, 15);
      // Eye
      ctx.fillStyle = '#fafafa';
      ctx.fillRect(dx + dw - 12, dy + 4, 3, 3);
      ctx.fillStyle = '#535353';

      // Ducking Legs
      if (!this.isJumping) {
        if (this.legStep) {
          ctx.fillRect(dx + 12, dy + dh - 6, 6, 6);
          ctx.fillRect(dx + 30, dy + dh - 4, 6, 4);
        } else {
          ctx.fillRect(dx + 12, dy + dh - 4, 6, 4);
          ctx.fillRect(dx + 30, dy + dh - 6, 6, 6);
        }
      } else {
        ctx.fillRect(dx + 15, dy + dh - 5, 8, 5);
      }
    } else {
      // Standing / Jumping Dino
      const dx = this.x;
      const dy = this.y;

      // Head
      ctx.fillRect(dx + 22, dy, 22, 17);
      // Snout
      ctx.fillRect(dx + 34, dy + 6, 10, 11);
      // Eye
      ctx.fillStyle = '#fafafa';
      ctx.fillRect(dx + 28, dy + 3, 3, 3);
      ctx.fillStyle = '#535353';

      // Neck & Chest
      ctx.fillRect(dx + 18, dy + 14, 14, 10);
      // Body
      ctx.fillRect(dx + 10, dy + 18, 22, 18);
      // Small Arm
      ctx.fillRect(dx + 30, dy + 22, 6, 4);
      // Tail
      ctx.fillRect(dx + 2, dy + 18, 9, 8);
      ctx.fillRect(dx, dy + 22, 4, 7);

      // Legs
      if (this.isJumping) {
        // Legs tucked slightly
        ctx.fillRect(dx + 12, dy + 36, 5, 8);
        ctx.fillRect(dx + 24, dy + 36, 5, 8);
      } else {
        // Alternating steps
        if (this.legStep) {
          ctx.fillRect(dx + 12, dy + 36, 5, 11);
          ctx.fillRect(dx + 24, dy + 36, 5, 6);
          ctx.fillRect(dx + 24, dy + 42, 8, 5);
        } else {
          ctx.fillRect(dx + 12, dy + 36, 5, 6);
          ctx.fillRect(dx + 12, dy + 42, 8, 5);
          ctx.fillRect(dx + 24, dy + 36, 5, 11);
        }
      }
    }
  },

  getHitbox() {
    const margin = 4;
    if (this.isDucking) {
      return {
        x: this.x + margin,
        y: this.y + margin,
        width: 55 - margin * 2,
        height: this.duckHeight - margin
      };
    }
    return {
      x: this.x + margin + 4,
      y: this.y + margin,
      width: this.width - margin * 2 - 4,
      height: this.height - margin * 2
    };
  }
};

// ---------------- Obstacles (Cacti & Birds) ----------------
let obstacles = [];

class Obstacle {
  constructor() {
    this.type = (score > 120 && Math.random() < 0.35) ? 'bird' : 'cactus';
    this.x = CANVAS_WIDTH + Math.random() * 50;

    if (this.type === 'cactus') {
      const isBig = Math.random() > 0.45;
      const isGroup = Math.random() > 0.6;
      this.width = isGroup ? (isBig ? 45 : 35) : (isBig ? 24 : 16);
      this.height = isBig ? (38 + Math.floor(Math.random() * 10)) : 28;
      this.y = GROUND_Y - this.height;
      this.variant = isGroup ? 'group' : (isBig ? 'big' : 'small');
    } else {
      // Bird / Pterodactyl
      this.width = 38;
      this.height = 24;
      // High (duck underneath) or Mid (jump over)
      const birdLevels = [GROUND_Y - 32, GROUND_Y - 55];
      this.y = birdLevels[Math.floor(Math.random() * birdLevels.length)];
      this.wingState = false;
      this.wingTimer = 0;
    }
  }

  update() {
    this.x -= gameSpeed;

    if (this.type === 'bird') {
      this.wingTimer++;
      if (this.wingTimer > 8) {
        this.wingState = !this.wingState;
        this.wingTimer = 0;
      }
    }
  }

  draw() {
    ctx.fillStyle = '#535353';

    if (this.type === 'cactus') {
      if (this.variant === 'group') {
        // Double cactus
        const w1 = this.width * 0.45;
        ctx.fillRect(this.x, this.y + 4, w1, this.height - 4);
        ctx.fillRect(this.x + w1 + 6, this.y, w1, this.height);
      } else {
        // Single Cactus with small branches
        ctx.fillRect(this.x + this.width * 0.3, this.y, this.width * 0.4, this.height);
        // Left arm
        ctx.fillRect(this.x, this.y + this.height * 0.3, this.width * 0.35, 4);
        ctx.fillRect(this.x, this.y + this.height * 0.15, 4, this.height * 0.2);
        // Right arm
        ctx.fillRect(this.x + this.width * 0.6, this.y + this.height * 0.4, this.width * 0.35, 4);
        ctx.fillRect(this.x + this.width * 0.9, this.y + this.height * 0.25, 4, this.height * 0.2);
      }
    } else if (this.type === 'bird') {
      // Bird body
      ctx.fillRect(this.x + 8, this.y + 8, 20, 8);
      // Head & Beak
      ctx.fillRect(this.x, this.y + 6, 8, 6);
      ctx.fillRect(this.x - 4, this.y + 8, 4, 3);

      // Wings flap up / down
      if (this.wingState) {
        ctx.fillRect(this.x + 12, this.y, 8, 9);
      } else {
        ctx.fillRect(this.x + 12, this.y + 14, 8, 8);
      }
    }
  }

  getHitbox() {
    const m = 3;
    return {
      x: this.x + m,
      y: this.y + m,
      width: this.width - m * 2,
      height: this.height - m * 2
    };
  }
}

// ---------------- Clouds & Ground Terrain ----------------
let clouds = [
  { x: 180, y: 35, speed: 0.6 },
  { x: 480, y: 55, speed: 0.8 },
  { x: 720, y: 30, speed: 0.5 }
];

let groundX = 0;

function updateEnvironment() {
  // Move clouds
  for (let c of clouds) {
    c.x -= c.speed;
    if (c.x < -60) {
      c.x = CANVAS_WIDTH + Math.random() * 80;
      c.y = 25 + Math.random() * 50;
    }
  }

  // Move ground
  groundX = (groundX - gameSpeed) % 24;
}

function drawEnvironment() {
  // Clear screen
  ctx.fillStyle = '#fafafa';
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  // Draw Clouds
  ctx.fillStyle = '#d3d3d3';
  for (let c of clouds) {
    ctx.fillRect(c.x, c.y, 44, 12);
    ctx.fillRect(c.x + 10, c.y - 6, 22, 6);
  }

  // Draw Ground Line
  ctx.fillStyle = '#535353';
  ctx.fillRect(0, GROUND_Y, CANVAS_WIDTH, 2);

  // Draw Ground Speckles
  ctx.fillStyle = '#777';
  for (let x = groundX; x < CANVAS_WIDTH; x += 24) {
    ctx.fillRect(x + 4, GROUND_Y + 5, 3, 2);
    ctx.fillRect(x + 14, GROUND_Y + 9, 2, 2);
    ctx.fillRect(x + 20, GROUND_Y + 4, 4, 1);
  }
}

// ---------------- Collision Detection ----------------
function checkCollision(r1, r2) {
  return (
    r1.x < r2.x + r2.width &&
    r1.x + r1.width > r2.x &&
    r1.y < r2.y + r2.height &&
    r1.y + r1.height > r2.y
  );
}

// ---------------- Game Loop & Mechanics ----------------
function resetGame() {
  dino.reset();
  obstacles = [];
  score = 0;
  gameSpeed = 5;
  lastObstacleSpawn = 0;
  isGameOver = false;
  isPlaying = true;

  scoreText.innerText = '00000';
  overlay.classList.add('hidden');

  if (animationFrameId) {
    cancelAnimationFrame(animationFrameId);
  }
  animationFrameId = requestAnimationFrame(gameLoop);
}

function triggerGameOver() {
  isGameOver = true;
  isPlaying = false;
  playGameOverSound();

  if (score > hiScore) {
    hiScore = Math.floor(score);
    localStorage.setItem('dino_hi_score', hiScore);
    updateHiScoreDisplay();
  }

  overlayTitle.innerText = 'GAME OVER';
  overlaySubtitle.innerText = `You scored ${Math.floor(score)} points! Press Space to try again.`;
  startBtn.innerText = 'PLAY AGAIN';
  overlay.classList.remove('hidden');
}

function gameLoop() {
  if (!isPlaying) return;

  // 1. Update Game State
  score += 0.15;
  scoreText.innerText = String(Math.floor(score)).padStart(5, '0');

  // Milestone beep every 100 points
  if (Math.floor(score) > 0 && Math.floor(score) % 100 === 0 && Math.floor(score - 0.15) % 100 !== 0) {
    playScoreSound();
  }

  // Gradually increase speed
  gameSpeed = 5 + Math.min(Math.floor(score / 100) * 0.6, 7);

  updateEnvironment();
  dino.update();

  // 2. Spawn Obstacles
  lastObstacleSpawn++;
  if (lastObstacleSpawn > minObstacleDistance) {
    // Random chance after minimum safe distance
    if (Math.random() < 0.04) {
      obstacles.push(new Obstacle());
      lastObstacleSpawn = 0;
      // Adjust safe gap as speed increases
      minObstacleDistance = Math.max(50, 85 - Math.floor(gameSpeed * 2));
    }
  }

  // 3. Update & Clean Obstacles
  for (let i = obstacles.length - 1; i >= 0; i--) {
    obstacles[i].update();

    // Check collision
    if (checkCollision(dino.getHitbox(), obstacles[i].getHitbox())) {
      drawEnvironment();
      dino.draw();
      obstacles.forEach(o => o.draw());
      triggerGameOver();
      return;
    }

    // Remove offscreen
    if (obstacles[i].x + obstacles[i].width < 0) {
      obstacles.splice(i, 1);
    }
  }

  // 4. Render
  drawEnvironment();
  dino.draw();
  for (let obstacle of obstacles) {
    obstacle.draw();
  }

  animationFrameId = requestAnimationFrame(gameLoop);
}

// ---------------- Input Handling ----------------
const keys = {};

window.addEventListener('keydown', (e) => {
  // Prevent page scroll when pressing Space or ArrowUp / Down
  if (['Space', 'ArrowUp', 'ArrowDown', ' '].includes(e.key)) {
    e.preventDefault();
  }

  if (e.code === 'Space' || e.key === ' ' || e.key === 'ArrowUp') {
    if (!isPlaying) {
      resetGame();
    } else {
      dino.jump();
    }
  }

  if (e.key === 'ArrowDown') {
    if (isPlaying) {
      dino.isDucking = true;
    }
  }
});

window.addEventListener('keyup', (e) => {
  if (e.key === 'ArrowDown') {
    dino.isDucking = false;
  }
});

// Click / Touch Controls
canvas.addEventListener('pointerdown', (e) => {
  initAudio();
  if (!isPlaying) {
    resetGame();
  } else {
    dino.jump();
  }
});

startBtn.addEventListener('click', () => {
  initAudio();
  resetGame();
});

// Initial Render for preview before starting
drawEnvironment();
dino.draw();

