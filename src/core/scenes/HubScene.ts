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

    // ---------- scrollable game grid ----------
    // Scroller sits between the fixed header and the bottom nav.
    // grid-auto-rows gives each card a natural size instead of squishing to fit.
    const scroller = document.createElement('div');
    scroller.style.cssText =
      'flex:1;overflow-y:auto;margin:0 -20px;padding:0 20px 12px;';

    const grid = document.createElement('div');
    grid.style.cssText =
      'display:grid;grid-template-columns:repeat(2,1fr);' +
      'grid-auto-rows:160px;gap:10px;';
    GAMES.forEach((def) => grid.append(this.tile(def)));
    scroller.append(grid);
    content.append(scroller);
  }

  private tile(def: GameDef): HTMLButtonElement {
    const btn = document.createElement('button');
    const grad = `linear-gradient(145deg,${hexc(def.grad[0])},${hexc(def.grad[1])})`;
    btn.style.cssText =
      'position:relative;display:flex;flex-direction:column;align-items:center;justify-content:flex-end;' +
      `padding:0 0 12px;border:none;cursor:pointer;border-radius:22px;overflow:hidden;min-height:0;` +
      `background:${grad};box-shadow:0 8px 20px rgba(0,0,0,.18);transition:transform .12s;`;

    // inner highlight strip at top for depth
    const shine = document.createElement('div');
    shine.style.cssText =
      'position:absolute;top:0;left:0;right:0;height:40%;' +
      'background:linear-gradient(180deg,rgba(255,255,255,.22) 0%,rgba(255,255,255,0) 100%);' +
      'pointer-events:none;';

    // 1P/2P badge top-right
    const badge = document.createElement('div');
    badge.textContent = '1P · 2P';
    badge.style.cssText =
      'position:absolute;top:10px;right:10px;' +
      'background:rgba(0,0,0,.28);backdrop-filter:blur(4px);' +
      'color:#fff;font-family:' + FONT_BODY + ';font-weight:800;font-size:9px;' +
      'letter-spacing:.4px;padding:3px 7px;border-radius:20px;line-height:1;';

    // big emoji
    const icon = document.createElement('div');
    icon.textContent = def.icon;
    icon.style.cssText =
      'flex:1;display:flex;align-items:center;justify-content:center;font-size:48px;' +
      'filter:drop-shadow(0 4px 8px rgba(0,0,0,.25));';

    // title
    const title = document.createElement('div');
    title.textContent = def.title;
    title.style.cssText =
      `font-family:${FONT_DISPLAY};font-weight:800;font-size:14px;color:#fff;` +
      'text-align:center;line-height:1.1;text-shadow:0 2px 6px rgba(0,0,0,.3);' +
      'max-width:90%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;flex:none;';

    btn.append(shine, badge, icon, title);

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
