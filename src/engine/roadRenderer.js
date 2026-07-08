import { getVehicleDef } from "./simulation";

const LANES_Y = [70, 120, 170, 220];
const MAX_SPRITES = 80;
const RAIN_DROPS = 120;

const VEHICLE_SIZES = {
  coche: 26, moto: 20, camion: 30, autobus: 30, especial: 26,
};

function darknessAt(hour) {
  if (hour >= 8 && hour <= 19) return 0;
  if (hour > 19 && hour < 22) return (hour - 19) / 3;
  if (hour >= 22 || hour < 5) return 1;
  return 1 - (hour - 5) / 3;
}

function drawSky(ctx, W, H, dark, hour) {
  let top, bottom;
  if (dark > 0.5) {
    top = "#0a0d16";
    bottom = "#141b2d";
  } else if (dark > 0) {
    const t = dark;
    const r1 = 20 + t * 10, g1 = 30 + t * 13, b1 = 60 + t * 16;
    const r2 = 100 - t * 60, g2 = 130 - t * 80, b2 = 180 - t * 100;
    top = `rgb(${r1},${g1},${b1})`;
    bottom = `rgb(${r2},${g2},${b2})`;
  } else if (hour >= 6 && hour < 8) {
    const t = (hour - 6) / 2;
    top = `rgb(${40 + t * 20},${50 + t * 40},${90 + t * 60})`;
    bottom = `rgb(${180 + t * 40},${160 + t * 20},${120 - t * 60})`;
  } else if (hour >= 19 && hour < 20) {
    bottom = "#e8a87c";
    top = "#2b3a67";
  } else {
    top = "#4a90d9";
    bottom = "#87ceeb";
  }

  const grad = ctx.createLinearGradient(0, 0, 0, 50);
  grad.addColorStop(0, top);
  grad.addColorStop(1, bottom);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, 50);

  if (dark < 0.5) {
    ctx.fillStyle = `rgba(255,255,255,${0.03 + (1 - dark) * 0.04})`;
    const cx = W * 0.7, cy = 15;
    const cloud = ctx.createRadialGradient(cx, cy, 2, cx, cy, 50);
    cloud.addColorStop(0, "rgba(255,255,255,0.15)");
    cloud.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = cloud;
    ctx.beginPath();
    ctx.ellipse(cx, cy, 60, 16, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawTrees(ctx, trees, dark, roadTop) {
  const trunkC = dark > 0.3 ? "#1a1410" : "#3d2b1f";
  const leafC = dark > 0.3 ? "#0a1a0a" : "#2d5a27";

  for (const t of trees) {
    ctx.fillStyle = trunkC;
    ctx.fillRect(t.x - t.bw / 2, roadTop - t.h, t.bw, t.h);

    ctx.fillStyle = leafC;
    ctx.beginPath();
    ctx.ellipse(t.x, roadTop - t.h - t.lr * 0.4, t.lr, t.lr * 0.8, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawRoadSurface(ctx, W, dark) {
  const roadTop = 40, roadBottom = 250;
  const roadH = roadBottom - roadTop;

  const baseBrightness = dark > 0.5 ? 16 : 25;
  ctx.fillStyle = `rgb(${baseBrightness},${baseBrightness + 3},${baseBrightness + 8})`;
  ctx.fillRect(0, roadTop, W, roadH);

  ctx.fillStyle = `rgba(255,255,255,0.015)`;
  for (let i = 0; i < 30; i++) {
    const tx = Math.random() * W;
    const ty = roadTop + Math.random() * roadH;
    ctx.fillRect(tx, ty, 2 + Math.random() * 4, 1);
  }

  if (dark > 0.2) {
    const edgeGlow = ctx.createLinearGradient(0, roadTop, 0, roadTop + 8);
    edgeGlow.addColorStop(0, `rgba(255,255,255,${0.04 * dark})`);
    edgeGlow.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = edgeGlow;
    ctx.fillRect(0, roadTop, W, 8);
    ctx.fillRect(0, roadBottom - 8, W, 8);
  }
}

function drawRoadMarkings(ctx, W, dark, dashOffset) {
  ctx.strokeStyle = dark > 0.3 ? "rgba(200,195,180,0.7)" : "#e8e4d8";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(0, 48); ctx.lineTo(W, 48);
  ctx.moveTo(0, 242); ctx.lineTo(W, 242);
  ctx.stroke();

  ctx.strokeStyle = dark > 0.3 ? "#d4891a" : "#ffb020";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(0, 145); ctx.lineTo(W, 145);
  ctx.stroke();

  ctx.strokeStyle = dark > 0.3 ? "rgba(200,195,180,0.35)" : "rgba(232,228,216,0.55)";
  ctx.lineWidth = 2;
  ctx.setLineDash([20, 16]);
  for (const y of [95, 195]) {
    ctx.beginPath();
    ctx.lineDashOffset = y < 145 ? -dashOffset : dashOffset;
    ctx.moveTo(0, y); ctx.lineTo(W, y);
    ctx.stroke();
  }
  ctx.setLineDash([]);

  ctx.fillStyle = dark > 0.3 ? "rgba(255,255,255,0.04)" : "rgba(255,255,255,0.06)";
  for (let x = 0; x < W; x += 14) {
    ctx.fillRect(x, 44, 7, 3);
    ctx.fillRect(x, 238, 7, 3);
  }
}



function drawHeadlight(ctx, x, y, dirX, dark) {
  const beam = ctx.createRadialGradient(
    x + dirX * 14, y, 2,
    x + dirX * 14, y, 50
  );
  beam.addColorStop(0, `rgba(255, 225, 140, ${0.3 * dark})`);
  beam.addColorStop(1, "rgba(255, 225, 140, 0)");
  ctx.fillStyle = beam;
  ctx.beginPath();
  ctx.ellipse(x + dirX * 30, y, 44, 16, 0, 0, Math.PI * 2);
  ctx.fill();

  // Secondary outer glow
  const glow = ctx.createRadialGradient(
    x + dirX * 10, y, 1,
    x + dirX * 10, y, 28
  );
  glow.addColorStop(0, `rgba(255, 240, 200, ${0.15 * dark})`);
  glow.addColorStop(1, "rgba(255, 240, 200, 0)");
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.ellipse(x + dirX * 22, y, 30, 12, 0, 0, Math.PI * 2);
  ctx.fill();
}

function drawRain(ctx, W, H, drops, dt, reducedMotion) {
  ctx.strokeStyle = "rgba(150, 190, 255, 0.25)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (const drop of drops) {
    if (!reducedMotion) {
      drop.y += drop.speed * dt;
      drop.x -= drop.speed * 0.2 * dt;
      if (drop.y > H) {
        drop.y = -6;
        drop.x = Math.random() * (W + 40);
      }
    }
    ctx.moveTo(drop.x, drop.y);
    ctx.lineTo(drop.x - 2, drop.y + 8);
  }
  ctx.stroke();

  ctx.fillStyle = "rgba(120, 140, 170, 0.04)";
  for (let i = 0; i < 20; i++) {
    const sx = Math.random() * W;
    const sy = 40 + Math.random() * 210;
    ctx.beginPath();
    ctx.ellipse(sx, sy, 3 + Math.random() * 4, 1, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}

export class RoadRenderer {
  constructor(canvas, reducedMotion) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.W = canvas.width;
    this.H = canvas.height;
    this.reducedMotion = reducedMotion;
    this.vehicles = [];
    this.dashOffset = 0;
    this.drops = Array.from({ length: RAIN_DROPS }, () => ({
      x: Math.random() * this.W,
      y: Math.random() * this.H,
      speed: 250 + Math.random() * 250,
    }));

    this.trees = [
      { x: 20,  h: 22 + Math.random() * 8,  bw: 4 + Math.random() * 2, lr: 8 + Math.random() * 6 },
      { x: 140, h: 18 + Math.random() * 6,  bw: 4 + Math.random() * 2, lr: 8 + Math.random() * 5 },
      { x: 260, h: 25 + Math.random() * 10, bw: 4 + Math.random() * 2, lr: 8 + Math.random() * 7 },
      { x: 400, h: 20 + Math.random() * 8,  bw: 4 + Math.random() * 2, lr: 8 + Math.random() * 6 },
      { x: 540, h: 15 + Math.random() * 5,  bw: 4 + Math.random() * 2, lr: 8 + Math.random() * 5 },
      { x: 680, h: 22 + Math.random() * 10, bw: 4 + Math.random() * 2, lr: 8 + Math.random() * 7 },
      { x: 820, h: 18 + Math.random() * 6,  bw: 4 + Math.random() * 2, lr: 8 + Math.random() * 6 },
    ];
  }

  spawn(typeId) {
    const def = getVehicleDef(typeId);
    if (!def) return;
    const lane = Math.floor(Math.random() * LANES_Y.length);
    const leftToRight = lane >= 2;
    const speed = def.speed[0] + Math.random() * (def.speed[1] - def.speed[0]);

    if (this.vehicles.length >= MAX_SPRITES) {
      this.vehicles = this.vehicles.filter((v) => v.x > -80 && v.x < this.W + 80);
      if (this.vehicles.length >= MAX_SPRITES) this.vehicles.shift();
    }

    this.vehicles.push({
      emoji: def.emoji,
      x: leftToRight ? -50 : this.W + 50,
      y: LANES_Y[lane],
      vx: leftToRight ? speed : -speed,
      flip: leftToRight,
      size: VEHICLE_SIZES[typeId] || 24,
    });
  }

  draw(dtReal, ambient = { hour: 12, raining: false }) {
    const { ctx, W, H } = this;
    const dark = darknessAt(ambient.hour);

    if (!this.reducedMotion) {
      this.dashOffset = (this.dashOffset + dtReal * 80) % 36;
    }

    ctx.clearRect(0, 0, W, H);

    // 1. Sky
    drawSky(ctx, W, H, dark, ambient.hour);

    // 2. Road surface
    const roadTop = 40, roadBottom = 250;
    drawRoadSurface(ctx, W, dark);

    // 3. Ground / grass above and below road
    ctx.fillStyle = dark > 0.3 ? "#0d1f0d" : "#3a5a3a";
    ctx.fillRect(0, roadTop - 8, W, 8);
    ctx.fillRect(0, roadBottom, W, H - roadBottom);

    // 4. Road markings
    drawRoadMarkings(ctx, W, dark, this.dashOffset);

    // 5. Trees (on the grass above the road)
    drawTrees(ctx, this.trees, dark, roadTop);

    // 6. Night dim overlay (behind vehicles)
    if (dark > 0) {
      ctx.fillStyle = `rgba(4, 7, 18, ${0.4 * dark})`;
      ctx.fillRect(0, roadTop, W, roadBottom - roadTop);
    }

    // 7. Vehicles + headlights
    ctx.textBaseline = "middle";
    for (const v of this.vehicles) {
      v.x += v.vx * dtReal;

      if (dark > 0.3) {
        const dir = Math.sign(v.vx);
        drawHeadlight(ctx, v.x, v.y, dir, dark);
      }

      ctx.save();
      ctx.translate(v.x, v.y);
      if (v.flip) ctx.scale(-1, 1);
      ctx.font = `${v.size}px serif`;
      ctx.fillText(v.emoji, -v.size / 2, 0);
      ctx.restore();
    }

    this.vehicles = this.vehicles.filter((v) => v.x > -80 && v.x < W + 80);

    // 8. Rain
    if (ambient.raining) {
      drawRain(ctx, W, H, this.drops, dtReal, this.reducedMotion);
    }
  }
}
