/**
 * roadRenderer.js — Dibujo imperativo de la carretera en canvas.
 * Ambiente reactivo a la simulación: oscuridad según hora virtual,
 * faros de noche y lluvia cuando el evento meteorológico está activo.
 * Se mantiene fuera de React: el bucle rAF lo invoca cada frame.
 */
import { getVehicleDef } from "./simulation";

const LANES_Y = [70, 120, 170, 220]; // 2 carriles por sentido
const MAX_SPRITES = 80;
const RAIN_DROPS = 70;

/** Oscuridad 0..1 según hora (amaneceres/atardeceres suaves). */
function darknessAt(hour) {
  if (hour >= 8 && hour <= 19) return 0;
  if (hour > 19 && hour < 22) return (hour - 19) / 3;
  if (hour >= 22 || hour < 5) return 1;
  return 1 - (hour - 5) / 3; // 5h-8h amanece
}

export class RoadRenderer {
  constructor(canvas, reducedMotion) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.W = canvas.width;
    this.H = canvas.height;
    this.reducedMotion = reducedMotion;
    this.vehicles = []; // { emoji, x, y, vx, flip, size }
    this.dashOffset = 0;
    this.drops = Array.from({ length: RAIN_DROPS }, () => ({
      x: Math.random() * this.W,
      y: Math.random() * this.H,
      speed: 300 + Math.random() * 200,
    }));
  }

  spawn(typeId) {
    const def = getVehicleDef(typeId);
    if (!def) return; // tipo desconocido: no romper el bucle
    const lane = Math.floor(Math.random() * LANES_Y.length);
    // Conducción europea (derecha): el sentido izq→der circula por los carriles
    // de abajo (2,3) y el sentido der→izq por los de arriba (0,1).
    const leftToRight = lane >= 2;
    const speed = def.speed[0] + Math.random() * (def.speed[1] - def.speed[0]);
    // Si está lleno, descarta primero los que ya salieron de pantalla; solo si
    // aún sobra se quita el más antiguo. Así no desaparece un coche visible.
    if (this.vehicles.length >= MAX_SPRITES) {
      this.vehicles = this.vehicles.filter((v) => v.x > -60 && v.x < this.W + 60);
      if (this.vehicles.length >= MAX_SPRITES) this.vehicles.shift();
    }
    this.vehicles.push({
      emoji: def.emoji,
      x: leftToRight ? -40 : this.W + 40,
      y: LANES_Y[lane],
      vx: leftToRight ? speed : -speed,
      // El emoji de coche mira a la izquierda por defecto: se voltea cuando
      // viaja hacia la derecha para que apunte en su sentido de marcha.
      flip: leftToRight,
      size: typeId === "camion" || typeId === "autobus" ? 30 : 24,
    });
  }

  draw(dtReal, ambient = { hour: 12, raining: false }) {
    const { ctx, W, H } = this;
    const dark = darknessAt(ambient.hour);
    ctx.clearRect(0, 0, W, H);

    // Cielo/arcén: del gris diurno al azul noche.
    ctx.fillStyle = dark > 0.5 ? "#0a0d16" : "#11141a";
    ctx.fillRect(0, 0, W, H);

    // Calzada
    ctx.fillStyle = "#191d23";
    ctx.fillRect(0, 40, W, 210);

    // Líneas exteriores continuas
    ctx.strokeStyle = "#e8e4d8";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, 48); ctx.lineTo(W, 48);
    ctx.moveTo(0, 242); ctx.lineTo(W, 242);
    ctx.stroke();

    // Mediana central
    ctx.strokeStyle = "#ffb020";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(0, 145); ctx.lineTo(W, 145);
    ctx.stroke();

    // Líneas discontinuas de carril (animadas)
    if (!this.reducedMotion) this.dashOffset = (this.dashOffset + dtReal * 60) % 40;
    ctx.strokeStyle = "rgba(232,228,216,0.5)";
    ctx.lineWidth = 2;
    ctx.setLineDash([22, 18]);
    for (const y of [95, 195]) {
      ctx.beginPath();
      ctx.lineDashOffset = y < 145 ? -this.dashOffset : this.dashOffset;
      ctx.moveTo(0, y); ctx.lineTo(W, y);
      ctx.stroke();
    }
    ctx.setLineDash([]);

    // Penumbra nocturna sobre la calzada (antes de vehículos y faros).
    if (dark > 0) {
      ctx.fillStyle = `rgba(4, 7, 18, ${0.45 * dark})`;
      ctx.fillRect(0, 0, W, H);
    }

    // Vehículos + faros. Se mueven y dibujan; el descarte de los que salen de
    // pantalla se hace DESPUÉS de mover (si no, uno en el borde podía quitarse
    // estando aún visible).
    ctx.textBaseline = "middle";
    for (const v of this.vehicles) {
      v.x += v.vx * dtReal;

      if (dark > 0.3) {
        const dir = Math.sign(v.vx);
        const beam = ctx.createRadialGradient(
          v.x + dir * 14, v.y, 2,
          v.x + dir * 14, v.y, 46
        );
        beam.addColorStop(0, `rgba(255, 225, 140, ${0.28 * dark})`);
        beam.addColorStop(1, "rgba(255, 225, 140, 0)");
        ctx.fillStyle = beam;
        ctx.beginPath();
        ctx.ellipse(v.x + dir * 28, v.y, 40, 14, 0, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.save();
      ctx.translate(v.x, v.y);
      if (v.flip) ctx.scale(-1, 1);
      ctx.font = `${v.size}px serif`;
      ctx.fillText(v.emoji, -v.size / 2, 0);
      ctx.restore();
    }
    // Descarta los que ya cruzaron del todo.
    this.vehicles = this.vehicles.filter((v) => v.x > -60 && v.x < W + 60);

    // Lluvia (evento activo)
    if (ambient.raining) {
      ctx.strokeStyle = "rgba(150, 190, 255, 0.35)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (const drop of this.drops) {
        if (!this.reducedMotion) {
          drop.y += drop.speed * dtReal;
          drop.x -= drop.speed * 0.25 * dtReal;
          if (drop.y > H) {
            drop.y = -8;
            drop.x = Math.random() * (W + 60);
          }
        }
        ctx.moveTo(drop.x, drop.y);
        ctx.lineTo(drop.x - 3, drop.y + 11);
      }
      ctx.stroke();
      // Velo gris de lluvia
      ctx.fillStyle = "rgba(120, 140, 170, 0.07)";
      ctx.fillRect(0, 0, W, H);
    }
  }
}
