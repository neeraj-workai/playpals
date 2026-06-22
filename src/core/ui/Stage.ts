import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../config';

// A fixed GAME_WIDTH×GAME_HEIGHT "stage" scaled to fit the viewport
// (letterboxed + centered) — the HTML twin of the Phaser canvas's
// Scale.FIT + CENTER_BOTH. Every HTML menu/overlay screen mounts into this,
// so each screen is exactly one screenful: the whole layout is always visible,
// nothing ever scrolls, and the framing matches the game canvas exactly.

let stage: HTMLDivElement | null = null;

function applyFit(): void {
  if (!stage) return;
  // Match Phaser's Scale.FIT reference: use #app div size, not raw window size.
  // On mobile, window.innerHeight can differ from the CSS 100vh used by #app,
  // causing a 1-2px offset between the canvas and stage layers.
  const app = document.getElementById('app');
  const w = app ? app.clientWidth : window.innerWidth;
  const h = app ? app.clientHeight : window.innerHeight;
  const s = Math.min(w / GAME_WIDTH, h / GAME_HEIGHT);
  stage.style.transform = `translate(-50%, -50%) scale(${s})`;
}

export function getStage(): HTMLDivElement {
  if (stage) return stage;
  const el = document.createElement('div');
  el.id = 'pp-stage';
  el.style.cssText =
    'position:fixed;left:50%;top:50%;' +
    `width:${GAME_WIDTH}px;height:${GAME_HEIGHT}px;` +
    'transform-origin:center center;overflow:hidden;z-index:40;' +
    // empty stage must not eat taps meant for the game canvas behind it;
    // each mounted layer re-enables pointer events for itself.
    'pointer-events:none;';
  document.body.appendChild(el);
  stage = el;
  applyFit();
  window.addEventListener('resize', applyFit);
  window.addEventListener('orientationchange', applyFit);
  return el;
}

// Mount a full-stage HTML layer (absolute, fills the stage) and auto-remove it
// when the scene shuts down.
export function mountOnStage(scene: Phaser.Scene, layer: HTMLElement): void {
  const st = getStage();
  layer.style.position = 'absolute';
  layer.style.inset = '0';
  layer.style.pointerEvents = 'auto';
  st.appendChild(layer);
  scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => layer.remove());
}
