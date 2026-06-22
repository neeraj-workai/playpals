import Phaser from 'phaser';
import { GAMES, GameDef } from '../config';
import { Ads } from '../ads/AdManager';
import { audio } from '../audio/AudioManager';
import { Profile, AVATARS } from '../profile/Profile';
import { ensureSoleActiveScene } from '../ui/NavGuard';
import { createShell } from '../ui/Shell';
import { FONT_DISPLAY, FONT_BODY, INK, INK_DIM, cssGradient } from '../design';

// "Play" tab — the dashboard. Rendered as HTML so the Baloo font + gradients
// are crisp. Every game shows at once in a compact grid that fills the screen,
// so nothing scrolls.
export class HubScene extends Phaser.Scene {
  constructor() {
    super('Hub');
  }

  create(): void {
    ensureSoleActiveScene(this);
    const { content } = createShell(this, 'home');
    void Ads.init(); // safe (no-op on web, no user gesture needed on native)

    const pal = Profile.pal();

    // ---------- header (fixed height) ----------
    const header = document.createElement('div');
    header.style.cssText = 'flex:none;display:flex;align-items:center;gap:11px;margin-bottom:12px;';

    const avatar = document.createElement('div');
    avatar.style.cssText =
      'flex:none;width:46px;height:46px;border-radius:16px;display:flex;align-items:center;' +
      'justify-content:center;font-size:24px;background:' + cssGradient(pal) +
      ';box-shadow:0 6px 14px rgba(74,68,102,.16);';
    avatar.textContent = AVATARS[Profile.get()?.avatarIdx ?? 0];

    const greet = document.createElement('div');
    greet.style.cssText = 'flex:1;min-width:0;';
    greet.innerHTML =
      `<div style="font-family:${FONT_DISPLAY};font-weight:800;font-size:20px;color:${INK};line-height:1.05;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">Hi, ${esc(Profile.name())}! 👋</div>` +
      `<div style="font-family:${FONT_BODY};font-size:13px;color:${INK_DIM};font-weight:800">Pick a game to play</div>`;

    const gear = document.createElement('button');
    gear.textContent = '⚙️';
    gear.style.cssText =
      'flex:none;width:42px;height:42px;border-radius:50%;border:none;background:#fff;' +
      'box-shadow:0 6px 14px rgba(74,68,102,.08);font-size:18px;cursor:pointer;';
    gear.addEventListener('click', () => { audio.click(); this.scene.start('Settings'); });

    header.append(avatar, greet, gear);
    content.append(header);

    // ---------- game grid (fills the rest, no scroll) ----------
    // grid-auto-rows:1fr divides the remaining height into equal rows so all
    // games always fit, whatever the count.
    const grid = document.createElement('div');
    grid.style.cssText =
      'flex:1;min-height:0;display:grid;grid-template-columns:repeat(3,1fr);' +
      'grid-auto-rows:1fr;gap:9px;';
    GAMES.forEach((def) => grid.append(this.tile(def)));
    content.append(grid);
  }

  private tile(def: GameDef): HTMLButtonElement {
    const btn = document.createElement('button');
    btn.style.cssText =
      'display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;' +
      'background:#fff;border:none;cursor:pointer;border-radius:20px;padding:6px 4px;' +
      'box-shadow:0 6px 14px rgba(80,60,140,.08);overflow:hidden;min-height:0;transition:transform .12s;';
    btn.innerHTML =
      `<div style="flex:none;width:44px;height:44px;border-radius:15px;display:flex;align-items:center;` +
      `justify-content:center;font-size:24px;background:${cssGradient({ start: hexc(def.grad[0]), end: hexc(def.grad[1]) })};` +
      `box-shadow:0 5px 12px rgba(74,68,102,.16)">${def.icon}</div>` +
      `<div style="font-family:${FONT_DISPLAY};font-weight:700;font-size:12px;color:${INK};line-height:1.05;` +
      `text-align:center;max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(def.title)}</div>`;
    btn.addEventListener('pointerdown', () => btn.style.transform = 'scale(.95)');
    btn.addEventListener('pointerup', () => btn.style.transform = 'scale(1)');
    btn.addEventListener('pointercancel', () => btn.style.transform = 'scale(1)');
    btn.addEventListener('click', () => {
      audio.click();
      this.scene.start('GameDetail', { key: def.key });
    });
    return btn;
  }
}

function hexc(n: number): string {
  return '#' + n.toString(16).padStart(6, '0');
}
function esc(s: string): string {
  return s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c] as string));
}
