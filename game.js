const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
const scoreEl = document.getElementById("score");
const bestEl = document.getElementById("best");
const overlay = document.getElementById("overlay");
const overlayEyebrow = document.getElementById("overlayEyebrow");
const overlayTitle = document.getElementById("overlayTitle");
const overlayText = document.getElementById("overlayText");
const startButton = document.getElementById("startButton");
const startLabel = document.getElementById("startLabel");
const soundButton = document.getElementById("soundButton");

const GRID = 24;
const CELL = canvas.width / GRID;
const COLORS = {
  snake: "#b9f34a",
  snakeDark: "#8abf32",
  food: "#ff5e68",
  foodGlow: "rgba(255, 94, 104, 0.32)"
};

let snake;
let food;
let direction;
let nextDirection;
let score;
let best = Number(localStorage.getItem("neon-snake-best") || 0);
let running = false;
let paused = false;
let gameOver = false;
let muted = false;
let lastStep = 0;
let animationFrame;
let particles = [];

bestEl.textContent = formatScore(best);

function formatScore(value) {
  return String(value).padStart(3, "0");
}

function resetGame() {
  snake = [
    { x: 11, y: 12 },
    { x: 10, y: 12 },
    { x: 9, y: 12 }
  ];
  direction = { x: 1, y: 0 };
  nextDirection = { x: 1, y: 0 };
  score = 0;
  particles = [];
  scoreEl.textContent = "000";
  gameOver = false;
  paused = false;
  placeFood();
  draw();
}

function placeFood() {
  do {
    food = {
      x: Math.floor(Math.random() * GRID),
      y: Math.floor(Math.random() * GRID)
    };
  } while (snake && snake.some(part => part.x === food.x && part.y === food.y));
}

function startGame() {
  resetGame();
  running = true;
  overlay.classList.add("hidden");
  lastStep = performance.now();
  cancelAnimationFrame(animationFrame);
  animationFrame = requestAnimationFrame(loop);
}

function endGame() {
  running = false;
  gameOver = true;
  if (score > best) {
    best = score;
    localStorage.setItem("neon-snake-best", String(best));
    bestEl.textContent = formatScore(best);
  }
  overlayEyebrow.textContent = "RUN ENDED";
  overlayTitle.textContent = formatScore(score) + " points";
  overlayText.textContent = score >= best && score > 0
    ? "New personal record. Ready for another run?"
    : "The grid got you. Reset and run it back.";
  startLabel.textContent = "TRY AGAIN";
  overlay.classList.remove("hidden");
  playTone("over");
}

function togglePause() {
  if (!running && !gameOver) return;
  if (gameOver) return;
  paused = !paused;
  if (paused) {
    overlayEyebrow.textContent = "GAME PAUSED";
    overlayTitle.textContent = "Take a breath";
    overlayText.textContent = "Press space or continue when you're ready.";
    startLabel.textContent = "CONTINUE";
    overlay.classList.remove("hidden");
  } else {
    overlay.classList.add("hidden");
    lastStep = performance.now();
  }
}

function loop(timestamp) {
  if (!running) return;
  if (!paused) {
    const interval = Math.max(68, 128 - score * 2);
    if (timestamp - lastStep >= interval) {
      step();
      lastStep = timestamp;
    }
  }
  draw();
  animationFrame = requestAnimationFrame(loop);
}

function step() {
  direction = nextDirection;
  const head = snake[0];
  const newHead = { x: head.x + direction.x, y: head.y + direction.y };

  if (newHead.x < 0 || newHead.x >= GRID || newHead.y < 0 || newHead.y >= GRID ||
      snake.some(part => part.x === newHead.x && part.y === newHead.y)) {
    endGame();
    return;
  }

  snake.unshift(newHead);

  if (newHead.x === food.x && newHead.y === food.y) {
    score++;
    scoreEl.textContent = formatScore(score);
    createParticles(food.x, food.y);
    placeFood();
    playTone("eat");
  } else {
    snake.pop();
  }
}

function setDirection(newDirection) {
  if (direction.x + newDirection.x === 0 && direction.y + newDirection.y === 0) return;
  nextDirection = newDirection;
}

function createParticles(gridX, gridY) {
  const centerX = (gridX + 0.5) * CELL;
  const centerY = (gridY + 0.5) * CELL;
  for (let i = 0; i < 10; i++) {
    const angle = (Math.PI * 2 * i) / 10;
    particles.push({
      x: centerX,
      y: centerY,
      vx: Math.cos(angle) * (1.5 + Math.random() * 2),
      vy: Math.sin(angle) * (1.5 + Math.random() * 2),
      life: 1
    });
  }
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#0d1018";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.strokeStyle = "rgba(255, 255, 255, 0.035)";
  ctx.lineWidth = 1;
  for (let i = 1; i < GRID; i++) {
    const pos = i * CELL + 0.5;
    ctx.beginPath();
    ctx.moveTo(pos, 0);
    ctx.lineTo(pos, canvas.height);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, pos);
    ctx.lineTo(canvas.width, pos);
    ctx.stroke();
  }

  const pulse = 0.75 + Math.sin(performance.now() / 220) * 0.15;
  ctx.save();
  ctx.shadowBlur = 24 * pulse;
  ctx.shadowColor = COLORS.foodGlow;
  ctx.fillStyle = COLORS.food;
  ctx.beginPath();
  ctx.arc((food.x + 0.5) * CELL, (food.y + 0.5) * CELL, CELL * 0.29, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  snake.forEach((part, index) => {
    const inset = index === 0 ? 2 : 3;
    const x = part.x * CELL + inset;
    const y = part.y * CELL + inset;
    const size = CELL - inset * 2;
    ctx.save();
    ctx.shadowBlur = index === 0 ? 12 : 5;
    ctx.shadowColor = "rgba(185, 243, 74, 0.28)";
    ctx.fillStyle = index === 0 ? COLORS.snake : index % 2 ? COLORS.snake : COLORS.snakeDark;
    ctx.beginPath();
    ctx.roundRect(x, y, size, size, index === 0 ? 7 : 5);
    ctx.fill();
    ctx.restore();
  });

  particles = particles.filter(particle => particle.life > 0);
  particles.forEach(particle => {
    particle.x += particle.vx;
    particle.y += particle.vy;
    particle.life -= 0.04;
    ctx.globalAlpha = Math.max(0, particle.life);
    ctx.fillStyle = COLORS.food;
    ctx.fillRect(particle.x - 2, particle.y - 2, 4, 4);
  });
  ctx.globalAlpha = 1;
}

let audioContext;
function playTone(kind) {
  if (muted) return;
  try {
    audioContext ||= new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();
    oscillator.type = "sine";
    oscillator.frequency.value = kind === "eat" ? 520 : 120;
    gain.gain.setValueAtTime(0.045, audioContext.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + (kind === "eat" ? 0.08 : 0.28));
    oscillator.connect(gain).connect(audioContext.destination);
    oscillator.start();
    oscillator.stop(audioContext.currentTime + (kind === "eat" ? 0.08 : 0.28));
  } catch (_) {}
}

document.addEventListener("keydown", event => {
  const key = event.key.toLowerCase();
  const controls = {
    arrowup: { x: 0, y: -1 }, w: { x: 0, y: -1 },
    arrowdown: { x: 0, y: 1 }, s: { x: 0, y: 1 },
    arrowleft: { x: -1, y: 0 }, a: { x: -1, y: 0 },
    arrowright: { x: 1, y: 0 }, d: { x: 1, y: 0 }
  };
  if (controls[key]) {
    event.preventDefault();
    setDirection(controls[key]);
  }
  if (key === " " && !event.repeat) {
    event.preventDefault();
    if (!running) startGame();
    else togglePause();
  }
});

document.querySelectorAll("[data-direction]").forEach(button => {
  button.addEventListener("pointerdown", event => {
    event.preventDefault();
    const directions = {
      up: { x: 0, y: -1 },
      down: { x: 0, y: 1 },
      left: { x: -1, y: 0 },
      right: { x: 1, y: 0 }
    };
    setDirection(directions[button.dataset.direction]);
  });
});

startButton.addEventListener("click", () => {
  if (paused) togglePause();
  else startGame();
});

soundButton.addEventListener("click", () => {
  muted = !muted;
  soundButton.setAttribute("aria-pressed", String(muted));
  soundButton.setAttribute("aria-label", muted ? "Enable sound" : "Mute sound");
});

resetGame();
