import Phaser from 'phaser';

const CONFETTI_COLORS = [0xff6b9d, 0xffd93d, 0x6bcb77, 0x4d96ff, 0xff9843, 0xc77dff, 0xff6b6b, 0x00e5ff];

/** Burst of confetti pieces at (cx, cy). Call on win. */
export function spawnConfetti(scene: Phaser.Scene, cx = 200, cy = 300, count = 36): void {
  for (let i = 0; i < count; i++) {
    const g = scene.add
      .rectangle(
        cx + Phaser.Math.Between(-80, 80),
        cy,
        Phaser.Math.Between(6, 14),
        Phaser.Math.Between(6, 14),
        Phaser.Utils.Array.GetRandom(CONFETTI_COLORS),
      )
      .setDepth(20);
    scene.tweens.add({
      targets: g,
      x: g.x + Phaser.Math.Between(-160, 160),
      y: g.y + Phaser.Math.Between(-260, 80),
      angle: Phaser.Math.Between(-360, 360),
      alpha: 0,
      duration: Phaser.Math.Between(700, 1400),
      ease: 'Power2',
      onComplete: () => g.destroy(),
    });
  }
}

/** Two-pass background gradient via layered rectangles — top/bottom colors. */
export function drawBgGradient(
  scene: Phaser.Scene,
  topColor: number,
  bottomColor: number,
  width = 400,
  height = 700,
): void {
  const steps = 6;
  for (let i = 0; i < steps; i++) {
    const t = i / (steps - 1);
    const r = Phaser.Math.Linear((topColor >> 16) & 0xff, (bottomColor >> 16) & 0xff, t);
    const g = Phaser.Math.Linear((topColor >> 8) & 0xff, (bottomColor >> 8) & 0xff, t);
    const b = Phaser.Math.Linear(topColor & 0xff, bottomColor & 0xff, t);
    const col = (Math.round(r) << 16) | (Math.round(g) << 8) | Math.round(b);
    const y = (height / steps) * i + height / steps / 2;
    scene.add.rectangle(width / 2, y, width, height / steps + 2, col, 1).setDepth(-10);
  }
}

/** Pulse a text/GameObject on score change. */
export function pulseTween(scene: Phaser.Scene, target: Phaser.GameObjects.GameObject): void {
  scene.tweens.add({ targets: target, scale: 1.35, duration: 80, yoyo: true, ease: 'Power2' });
}

/** Status text style shared across games. */
export const STATUS_STYLE: Phaser.Types.GameObjects.Text.TextStyle = {
  fontFamily: 'Arial Black, Arial',
  fontSize: '22px',
  color: '#ffffff',
  stroke: '#00000066',
  strokeThickness: 5,
};
