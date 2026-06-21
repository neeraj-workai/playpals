import Phaser from 'phaser';

export interface ButtonOpts {
  w?: number;
  h?: number;
  fontSize?: number;
  textColor?: string;
}

// Reusable pill button used by the hub, mode picker, and result overlays.
export function makeButton(
  scene: Phaser.Scene,
  x: number,
  y: number,
  label: string,
  color: number,
  onClick: () => void,
  opts: ButtonOpts = {},
): Phaser.GameObjects.Container {
  const w = opts.w ?? 240;
  const h = opts.h ?? 54;
  const fs = opts.fontSize ?? 20;

  const c = scene.add.container(x, y);
  const bg = scene.add.rectangle(0, 0, w, h, color, 1).setStrokeStyle(2, 0x000000, 0.18);
  bg.setInteractive({ useHandCursor: true });
  const txt = scene.add
    .text(0, 0, label, { fontFamily: 'Arial Black, Arial', fontSize: `${fs}px`, color: opts.textColor ?? '#ffffff' })
    .setOrigin(0.5);
  c.add([bg, txt]);

  bg.on('pointerover', () => c.setScale(1.04));
  bg.on('pointerout', () => c.setScale(1));
  bg.on('pointerdown', () => {
    scene.tweens.add({ targets: c, scale: 0.94, duration: 60, yoyo: true });
    onClick();
  });
  return c;
}
