import Phaser from 'phaser';
import { DPR, GAME_WIDTH, GAME_HEIGHT } from './config';

// Set up the camera so the scene renders crisp on HiDPI screens.
//
// The Phaser game is created with `width = GAME_WIDTH * DPR` and
// `height = GAME_HEIGHT * DPR` — i.e. the canvas's internal pixel buffer is
// DPR× larger than the logical layout. We then zoom the main camera by DPR
// so coordinate maths in every scene can still use the logical 0..400 /
// 0..700 range. CSS-scaled by `Scale.FIT`, the canvas displays at native
// pixel density and text/edges are sharp.
//
// Pointer events: callers MUST use `pointer.worldX` / `worldY` instead of
// `pointer.x` / `y` — those are canvas pixel coords (×DPR), worldX/Y
// already account for camera zoom and are in logical units.
export function setupSceneScale(scene: Phaser.Scene): void {
  const cam = scene.cameras.main;
  cam.setZoom(DPR);
  // setZoom(DPR) centres the camera at the canvas centre (in world units,
  // which equals canvas-px / 1 ≈ GAME_WIDTH * DPR / 2). We want world
  // 0..GAME_WIDTH to map to canvas 0..GAME_WIDTH*DPR, so re-centre the
  // camera at the logical midpoint.
  cam.centerOn(GAME_WIDTH / 2, GAME_HEIGHT / 2);
}
