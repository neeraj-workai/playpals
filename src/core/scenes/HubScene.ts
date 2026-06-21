import Phaser from 'phaser';
import { GAMES, GameDef, FEATURED_COUNT } from '../config';
import { Ads } from '../ads/AdManager';
import { audio } from '../audio/AudioManager';
import { Profile, AVATARS } from '../profile/Profile';
import { ensureSoleActiveScene } from '../ui/NavGuard';
import { createShell } from '../ui/Shell';
import { FONT_DISPLAY, FONT_BODY, INK, INK_DIM, hex2css, cssGradient } from '../design';

const SHOW_ALL_KEY = 'hub:showAll';

// "Play" tab — the dashboard. Rendered as HTML (matching the design's home
// screen) so the Baloo font + gradients + scrolling are crisp and native.
export class HubScene extends Phaser.Scene {
  constructor() {
    super('Hub');
  }

  create(): void {
    ensureSoleActiveScene(this);
    const { content } = createShell(this, 'home');
    void Ads.init(); // safe (no-op on web, no user gesture needed on native)

    const pal = Profile.pal();

    // ---------- header ----------
    const header = document.createElement('div');
    header.style.cssText = 'display:flex;align-items:center;gap:12px;margin-bottom:20px;';

    const avatar = document.createElement('div');
    avatar.style.cssText =
      'flex:none;width:54px;height:54px;border-radius:20px;display:flex;align-items:center;' +
      'justify-content:center;font-size:28px;background:' + cssGradient(pal) +
      ';box-shadow:0 8px 16px rgba(74,68,102,.16);';
    avatar.textContent = AVATARS[Profile.get()?.avatarIdx ?? 0];

    const greet = document.createElement('div');
    greet.style.cssText = 'flex:1;';
    greet.innerHTML =
      `<div style="font-family:${FONT_DISPLAY};font-weight:800;font-size:23px;color:${INK};line-height:1.05">Hi, ${esc(Profile.name())}! 👋</div>` +
      `<div style="font-family:${FONT_BODY};font-size:14px;color:${INK_DIM};font-weight:800">Ready to play?</div>`;

    const gear = document.createElement('button');
    gear.textContent = '⚙️';
    gear.style.cssText =
      'flex:none;width:46px;height:46px;border-radius:50%;border:none;background:#fff;' +
      'box-shadow:0 6px 14px rgba(74,68,102,.08);font-size:20px;cursor:pointer;';
    gear.addEventListener('click', () => { audio.click(); this.scene.start('Settings'); });

    header.append(avatar, greet, gear);
    content.append(header);

    // ---------- game list ----------
    const list = document.createElement('div');
    list.style.cssText = 'display:flex;flex-direction:column;gap:12px;';
    content.append(list);

    let showAll = window.localStorage.getItem(SHOW_ALL_KEY) === '1';

    const renderList = (): void => {
      list.innerHTML = '';
      const shown = showAll ? GAMES : GAMES.slice(0, FEATURED_COUNT);
      shown.forEach((def) => list.append(this.tile(def)));
    };

    const toggle = document.createElement('button');
    toggle.style.cssText =
      'margin-top:14px;width:100%;height:50px;border:none;border-radius:18px;background:rgba(255,255,255,.6);' +
      'color:' + hex2css(pal.baseHex) + ';font-family:' + FONT_DISPLAY + ';font-weight:700;font-size:15px;cursor:pointer;';
    const more = GAMES.length - FEATURED_COUNT;
    const refreshToggle = (): void => {
      toggle.textContent = showAll ? '▴  Show fewer' : `▾  ${more} more games`;
    };
    toggle.addEventListener('click', () => {
      audio.click();
      showAll = !showAll;
      window.localStorage.setItem(SHOW_ALL_KEY, showAll ? '1' : '0');
      renderList();
      refreshToggle();
    });

    renderList();
    refreshToggle();
    content.append(toggle);
  }

  private tile(def: GameDef): HTMLButtonElement {
    const btn = document.createElement('button');
    btn.style.cssText =
      'display:flex;align-items:center;gap:14px;background:#fff;border:none;cursor:pointer;' +
      'border-radius:26px;padding:13px;box-shadow:0 8px 18px rgba(80,60,140,.08);text-align:left;width:100%;' +
      'transition:transform .12s;';
    btn.innerHTML =
      `<div style="flex:none;width:58px;height:58px;border-radius:20px;display:flex;align-items:center;` +
      `justify-content:center;font-size:30px;background:${cssGradient({ start: hexc(def.grad[0]), end: hexc(def.grad[1]) })};` +
      `box-shadow:0 6px 14px rgba(74,68,102,.14)">${def.icon}</div>` +
      `<div style="flex:1">` +
      `<div style="font-family:${FONT_DISPLAY};font-weight:700;font-size:18px;color:${INK};line-height:1.1">${esc(def.title)}</div>` +
      `<div style="font-family:${FONT_BODY};font-size:13px;color:${INK_DIM};font-weight:800;margin-top:2px">${esc(def.blurb)} · 👥 2P</div>` +
      `</div>` +
      `<div style="flex:none;width:42px;height:42px;border-radius:50%;background:${def.tint};display:flex;` +
      `align-items:center;justify-content:center;font-size:15px;color:${INK}">▶</div>`;
    btn.addEventListener('pointerdown', () => btn.style.transform = 'scale(.98)');
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
