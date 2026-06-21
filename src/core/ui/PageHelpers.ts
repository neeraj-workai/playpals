import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../config';
import { PAGE_BG_HEX, FONT_DISPLAY, FONT_BODY, INK, INK_DIM } from '../design';

// Shared visual primitives for the kid-friendly "shell" scenes (Hub, Profile,
// Leaderboard, Settings). All scenes use the same pastel page background +
// title + scroll area, so they feel like one app.

export const STATUS_H = 30;
export const HEADER_H = 80; // for hub-style scenes that have an avatar header
export const TITLE_H = 56;  // for "centered title" scenes (Profile/Ranks/Settings)

export function paintPageBg(scene: Phaser.Scene): void {
  scene.cameras.main.setBackgroundColor(PAGE_BG_HEX);
  // soft top-to-bottom gradient overlay by two rectangles (cheap fake gradient)
  const top = scene.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT * 0.25, GAME_WIDTH, GAME_HEIGHT * 0.5, 0xf3eeff, 1).setDepth(-10);
  const bot = scene.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT * 0.75, GAME_WIDTH, GAME_HEIGHT * 0.5, 0xfcf1f7, 1).setDepth(-10);
  void top; void bot;
}

export function centredTitle(scene: Phaser.Scene, text: string, y = 50): Phaser.GameObjects.Text {
  return scene.add
    .text(GAME_WIDTH / 2, y, text, { fontFamily: FONT_DISPLAY, fontStyle: '800', fontSize: '24px', color: INK })
    .setOrigin(0.5);
}

export function subText(scene: Phaser.Scene, text: string, y: number): Phaser.GameObjects.Text {
  return scene.add
    .text(GAME_WIDTH / 2, y, text, { fontFamily: FONT_BODY, fontStyle: '800', fontSize: '13px', color: INK_DIM })
    .setOrigin(0.5);
}

// Rounded white card with a soft shadow underneath.
export function roundedCard(
  scene: Phaser.Scene,
  x: number,
  y: number,
  w: number,
  h: number,
  radius = 22,
  fill = 0xffffff,
): Phaser.GameObjects.Graphics {
  const g = scene.add.graphics();
  g.fillStyle(0x000000, 0.04);
  g.fillRoundedRect(x - w / 2, y - h / 2 + 4, w, h, radius);
  g.fillStyle(fill, 1);
  g.fillRoundedRect(x - w / 2, y - h / 2, w, h, radius);
  return g;
}
