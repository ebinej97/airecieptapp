const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const targetText = document.getElementById("targetText");
const scoreText = document.getElementById("scoreText");
const ballsText = document.getElementById("ballsText");
const wicketsText = document.getElementById("wicketsText");
const statusText = document.getElementById("statusText");
const restartButton = document.getElementById("restartButton");
const soundButton = document.getElementById("soundButton");

const W = canvas.width;
const H = canvas.height;
const pitchY = 358;
const creaseX = 265;
const batContact = { x: 276, y: 330 };
const target = 55;
const totalBalls = 16;
const totalWickets = 6;

let game;
let audioEnabled = true;

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

function resetGame() {
  game = {
    score: 0,
    ballsLeft: totalBalls,
    wicketsLeft: totalWickets,
    phase: "ready",
    message: "Press Space as the ball reaches the bat.",
    messageTimer: 0,
    ball: null,
    swing: 0,
    swingTimer: 0,
    lastShot: null,
    bowlerTimer: 0,
    over: false,
  };
  updateHud();
  setStatus(game.message);
  serveBall();
}

function setStatus(message) {
  game.message = message;
  statusText.innerHTML = message.replace("Space", "<kbd>Space</kbd>");
}

function updateHud() {
  targetText.textContent = target;
  scoreText.textContent = game.score;
  ballsText.textContent = game.ballsLeft;
  wicketsText.textContent = game.wicketsLeft;
}

function serveBall() {
  if (game.score >= target || game.ballsLeft <= 0 || game.wicketsLeft <= 0) {
    finishGame();
    return;
  }

  game.phase = "bowling";
  game.swing = 0;
  game.swingTimer = 0;
  game.lastShot = null;
  game.ball = {
    x: W + 34,
    y: 315,
    vx: -7.8,
    vy: -0.2,
    r: 8,
    spin: 0,
    bounceX: 420 + Math.random() * 70,
    hasBounced: false,
    contacted: false,
    settled: false,
    trail: [],
  };
  setStatus("Watch the bounce, then press Space for bat-ball connection.");
}

function finishGame() {
  game.phase = "finished";
  game.over = true;
  const won = game.score >= target;
  setStatus(won ? "You chased it! Press Space to play again." : "Innings over. Press Space to retry the chase.");
}

function swingBat() {
  if (game.phase === "finished") {
    resetGame();
    return;
  }
  if (game.phase !== "bowling") return;

  game.swingTimer = 20;
  game.swing = 1;

  const ball = game.ball;
  const dx = ball.x - batContact.x;
  const dy = ball.y - batContact.y;
  const distance = Math.hypot(dx, dy);
  const timingWindow = Math.abs(dx);

  if (distance < 54 && timingWindow < 58) {
    connectShot(ball, dx, dy);
  } else {
    setStatus(timingWindow > 120 ? "Too early. Wait for the pitch bounce before pressing Space." : "Late swing! The ball beat the bat.");
  }
}

function connectShot(ball, dx, dy) {
  const timing = clamp(1 - Math.abs(dx) / 58, 0, 1);
  const heightMatch = clamp(1 - Math.abs(dy) / 45, 0, 1);
  const quality = (timing * 0.7) + (heightMatch * 0.3);
  const late = dx < -14;
  const early = dx > 14;

  ball.contacted = true;
  ball.trail = [];

  let shotType;
  let runs;

  if (quality > 0.9 && ball.hasBounced && ball.y > 310) {
    shotType = "lofted six";
    runs = 6;
    ball.vx = 12.8;
    ball.vy = -13.2;
    setStatus("Perfect connection! The bounce met the bat and it sails for six.");
  } else if (quality > 0.72 && ball.hasBounced) {
    shotType = "ground drive";
    runs = 4;
    ball.vx = 13.5;
    ball.vy = -5.4;
    setStatus("Clean ground shot: pitch bounce, bat face, then a skidding drive.");
  } else if (quality > 0.48) {
    shotType = early ? "checked chip" : late ? "inside edge" : "push";
    runs = early ? 2 : 1;
    ball.vx = early ? 8.2 : 5.4;
    ball.vy = early ? -8.8 : -3.1;
    setStatus(early ? "Slightly early: it jumps off the bat as a chip." : "Not quite middle: it rolls away for a quick run.");
  } else {
    shotType = "miss";
    runs = 0;
    game.wicketsLeft -= late ? 1 : 0;
    ball.vx = late ? -2 : 3;
    ball.vy = late ? 1.2 : -1.2;
    setStatus(late ? "Too late: bowled! The ball clips the stumps." : "Thin contact. No run.");
  }

  game.lastShot = { shotType, runs, quality, timer: 110 };
}

function completeDelivery() {
  if (game.phase !== "bowling") return;

  game.ballsLeft -= 1;
  const runs = game.lastShot?.runs ?? 0;
  if (game.lastShot?.shotType !== "miss") {
    game.score += runs;
  }

  if (!game.ball.contacted) {
    game.wicketsLeft -= 1;
    setStatus("Missed after the bounce: wicket lost.");
  }

  updateHud();
  game.phase = "between";
  game.bowlerTimer = 72;

  if (game.score >= target || game.ballsLeft <= 0 || game.wicketsLeft <= 0) {
    game.bowlerTimer = 45;
  }
}

function updateBall() {
  const ball = game.ball;
  if (!ball || game.phase !== "bowling") return;

  ball.trail.push({ x: ball.x, y: ball.y });
  if (ball.trail.length > 12) ball.trail.shift();

  if (!ball.contacted) {
    if (!ball.hasBounced && ball.x < ball.bounceX) {
      ball.hasBounced = true;
      ball.y = pitchY - ball.r;
      ball.vy = -7.2;
      ball.vx = -6.9;
    }
    ball.vy += ball.hasBounced ? 0.38 : 0.17;
  } else {
    ball.vy += 0.42;
    if (ball.y + ball.r > pitchY && ball.vy > 0) {
      ball.y = pitchY - ball.r;
      ball.vy *= game.lastShot?.shotType === "ground drive" ? -0.34 : -0.55;
      ball.vx *= 0.86;
      if (Math.abs(ball.vy) < 1.5) ball.vy = 0;
    }
  }

  ball.x += ball.vx;
  ball.y += ball.vy;
  ball.spin += ball.vx * 0.05;

  const deliveryEnded = ball.x < 150 || ball.x > W + 80 || ball.y > H + 60 || (ball.contacted && ball.x > W - 80);
  const passedBat = !ball.contacted && ball.x < creaseX - 62;
  if (deliveryEnded || passedBat) completeDelivery();
}

function tick() {
  if (game.swingTimer > 0) {
    game.swingTimer -= 1;
    game.swing = game.swingTimer / 20;
  }

  if (game.phase === "between") {
    game.bowlerTimer -= 1;
    if (game.bowlerTimer <= 0) serveBall();
  }

  if (game.lastShot?.timer > 0) game.lastShot.timer -= 1;
  updateBall();
}

function drawStadium() {
  const sky = ctx.createLinearGradient(0, 0, 0, 230);
  sky.addColorStop(0, "#ffd3d6");
  sky.addColorStop(0.38, "#eef1ff");
  sky.addColorStop(1, "#b8e4ff");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, H);

  ctx.fillStyle = "rgba(255,255,255,0.7)";
  ctx.beginPath();
  ctx.arc(118, 85, 38, 0, Math.PI * 2);
  ctx.fill();
  for (let i = 0; i < 18; i++) {
    const angle = (i / 18) * Math.PI * 2;
    ctx.strokeStyle = "rgba(255,255,255,0.45)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(118 + Math.cos(angle) * 50, 85 + Math.sin(angle) * 50);
    ctx.lineTo(118 + Math.cos(angle) * 78, 85 + Math.sin(angle) * 78);
    ctx.stroke();
  }

  drawStand(120, 260, "#6d3346", "#3f7383");
  drawStand(168, 300, "#344b6b", "#e5f0dd");
  drawStand(215, 335, "#183d62", "#333447");

  ctx.fillStyle = "#73d700";
  ctx.fillRect(0, 330, W, 160);
  for (let y = 335; y < H; y += 35) {
    ctx.fillStyle = y % 70 === 20 ? "#8eff00" : "#5bc400";
    ctx.fillRect(0, y, W, 18);
  }

  ctx.fillStyle = "#e2c765";
  ctx.fillRect(0, pitchY, W, 68);
  ctx.fillStyle = "rgba(255,255,255,0.9)";
  ctx.fillRect(creaseX, 335, 3, 72);
}

function drawStand(y, bottom, band, rail) {
  ctx.fillStyle = band;
  ctx.beginPath();
  ctx.moveTo(0, y);
  ctx.quadraticCurveTo(W / 2, y + 95, W, y + 10);
  ctx.lineTo(W, bottom);
  ctx.quadraticCurveTo(W / 2, bottom + 80, 0, bottom - 16);
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = rail;
  ctx.lineWidth = 8;
  ctx.beginPath();
  ctx.moveTo(0, y + 12);
  ctx.quadraticCurveTo(W / 2, y + 108, W, y + 22);
  ctx.stroke();

  for (let i = 0; i < 900; i += 1) {
    const x = (i * 37) % W;
    const row = Math.floor(i / 70);
    const py = y + 28 + row * 8 + Math.sin((x + row) * 0.03) * 14;
    if (py < bottom - 5) {
      ctx.fillStyle = ["#f7df73", "#ffffff", "#456aa0", "#222d49"][i % 4];
      ctx.fillRect(x, py, 3, 3);
    }
  }
}

function drawStumps() {
  const x = 132;
  for (let i = 0; i < 3; i++) {
    ctx.fillStyle = "#d52927";
    ctx.fillRect(x + i * 7, 302, 5, 59);
    ctx.fillStyle = "#ffb330";
    ctx.fillRect(x + i * 7, 315, 5, 3);
  }
  ctx.fillStyle = "#ffd565";
  ctx.fillRect(x - 1, 300, 21, 3);
}

function drawBatter() {
  const x = 260;
  const y = 300;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  ctx.strokeStyle = "#2a9dff";
  ctx.lineWidth = 16;
  ctx.beginPath();
  ctx.moveTo(x - 4, y + 58);
  ctx.lineTo(x - 18, y + 92);
  ctx.moveTo(x + 12, y + 58);
  ctx.lineTo(x + 32, y + 94);
  ctx.stroke();

  ctx.fillStyle = "#177ddb";
  ctx.beginPath();
  ctx.roundRect(x - 28, y - 5, 50, 70, 14);
  ctx.fill();
  ctx.fillStyle = "#ff9a2c";
  ctx.font = "bold 13px sans-serif";
  ctx.fillText("IND", x - 18, y + 30);

  ctx.fillStyle = "#f4a363";
  ctx.beginPath();
  ctx.arc(x - 3, y - 18, 17, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#228cf4";
  ctx.beginPath();
  ctx.arc(x - 6, y - 25, 19, Math.PI, Math.PI * 2);
  ctx.lineTo(x + 24, y - 25);
  ctx.quadraticCurveTo(x + 8, y - 37, x - 18, y - 31);
  ctx.fill();

  ctx.strokeStyle = "#dcefff";
  ctx.lineWidth = 9;
  ctx.beginPath();
  ctx.moveTo(x - 8, y + 36);
  ctx.lineTo(x + 5, y + 58);
  ctx.moveTo(x + 6, y + 36);
  ctx.lineTo(x + 5, y + 58);
  ctx.stroke();

  const swingAngle = -0.95 + game.swing * 1.7;
  const batX = x + 5;
  const batY = y + 62;
  ctx.save();
  ctx.translate(batX, batY);
  ctx.rotate(swingAngle);
  ctx.fillStyle = "#d3b653";
  ctx.fillRect(-5, 0, 10, 92);
  ctx.fillStyle = "rgba(255,255,255,0.4)";
  ctx.fillRect(-5, 58, 10, 34);
  ctx.restore();
}

function drawBall() {
  const ball = game.ball;
  if (!ball) return;
  ball.trail.forEach((dot, index) => {
    ctx.globalAlpha = index / ball.trail.length / 2;
    ctx.fillStyle = "#9a0c10";
    ctx.beginPath();
    ctx.arc(dot.x, dot.y, ball.r, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.globalAlpha = 1;
  ctx.fillStyle = "#b91118";
  ctx.beginPath();
  ctx.arc(ball.x, ball.y, ball.r, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "rgba(255,255,255,0.7)";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(ball.x, ball.y, ball.r - 2, ball.spin, ball.spin + Math.PI * 0.9);
  ctx.stroke();
}

function drawShotFeedback() {
  if (!game.lastShot || game.lastShot.timer <= 0) return;
  const alpha = clamp(game.lastShot.timer / 45, 0, 1);
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = "rgba(2, 7, 22, 0.74)";
  ctx.strokeStyle = "rgba(201, 247, 0, 0.65)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(390, 78, 270, 62, 14);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "#eaf2ff";
  ctx.font = "900 22px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(`${game.lastShot.shotType.toUpperCase()}  +${game.lastShot.runs}`, 525, 115);
  ctx.restore();
}

function render() {
  drawStadium();
  drawStumps();
  drawBatter();
  drawBall();
  drawShotFeedback();
}

function loop() {
  tick();
  render();
  requestAnimationFrame(loop);
}

window.addEventListener("keydown", (event) => {
  if (event.code === "Space") {
    event.preventDefault();
    swingBat();
  }
});

restartButton.addEventListener("click", resetGame);
soundButton.addEventListener("click", () => {
  audioEnabled = !audioEnabled;
  soundButton.textContent = audioEnabled ? "🔊" : "🔇";
});

resetGame();
loop();
