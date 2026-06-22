import Phaser from 'phaser';
import { GAMES } from '../config';
import { Profile, AVATARS } from '../profile/Profile';
import { Storage } from '../storage/Storage';
import { ensureSoleActiveScene } from '../ui/NavGuard';
import { createShell, shellTitle } from '../ui/Shell';
import { audio } from '../audio/AudioManager';
import { FONT_DISPLAY, FONT_BODY, INK, INK_DIM, INK_LABEL, BLOB_RADIUS, cssGradient, hex2css } from '../design';

// "Me" tab — player profile: blob avatar, name, Level/XP, stat cards, badges.
// Stats derive from stored per-game bests so the page feels alive (no backend).
export class ProfileScene extends Phaser.Scene {
  constructor() {
    super('Profile');
  }

  create(): void {
    ensureSoleActiveScene(this);
    const { content } = createShell(this, 'profile');

    const pal = Profile.pal();
    const name = Profile.name();
    const avatar = AVATARS[Profile.get()?.avatarIdx ?? 0];

    const bests = GAMES.map((g) => Storage.getBest(g.key));
    const games = bests.filter((n) => n > 0).length * 4 + Storage.getSessions();
    const wins = bests.reduce((a, b) => a + b, 0);
    const streak = Math.min(9, Math.max(0, Math.floor(wins / 3)));
    const xp = Math.min(500, wins * 15);
    const level = 1 + Math.floor(xp / 100);

    content.append(shellTitle('My Profile'));

    const wrap = document.createElement('div');
    wrap.style.cssText = 'text-align:center;';

    const blob = el('div', `width:82px;height:82px;border-radius:${BLOB_RADIUS};background:${cssGradient(pal)};display:flex;align-items:center;justify-content:center;font-size:42px;margin:0 auto;box-shadow:0 14px 28px rgba(74,68,102,.18);animation:pp-float 3.2s ease-in-out infinite;`);
    blob.textContent = avatar;
    const nameEl = el('div', `font-family:${FONT_DISPLAY};font-weight:800;font-size:22px;color:${INK};margin-top:6px;`);
    nameEl.textContent = name;

    const levelCard = el('div', `background:#fff;border-radius:20px;padding:12px 16px;margin-top:10px;box-shadow:0 6px 14px rgba(80,60,140,.06);text-align:left;`);
    levelCard.innerHTML =
      `<div style="display:flex;justify-content:space-between;font-weight:800;font-size:13px;color:${INK}"><span>Level ${level}</span><span style="color:${INK_DIM}">${xp} / 500 XP</span></div>` +
      `<div style="height:12px;border-radius:8px;background:#EFEAF6;margin-top:8px;overflow:hidden"><div style="width:${Math.round((xp / 500) * 100)}%;height:100%;border-radius:8px;background:${cssGradient(pal)}"></div></div>`;

    const stats = el('div', 'display:flex;gap:10px;margin-top:10px;');
    [
      { n: games, l: 'Games', c: '#4DABF7' },
      { n: wins, l: 'Wins', c: '#2FB875' },
      { n: streak + '🔥', l: 'Streak', c: '#FF922B' },
    ].forEach((s) => {
      stats.append(el('div', `flex:1;background:#fff;border-radius:20px;padding:12px 8px;box-shadow:0 6px 14px rgba(80,60,140,.06);`,
        `<div style="font-family:${FONT_DISPLAY};font-weight:800;font-size:22px;color:${s.c}">${s.n}</div><div style="font-size:12px;color:${INK_DIM};font-weight:800;margin-top:2px">${s.l}</div>`));
    });

    const badgeTitle = el('div', `font-family:${FONT_DISPLAY};font-weight:800;font-size:16px;color:${INK};text-align:left;margin:14px 0 8px;`);
    badgeTitle.textContent = 'Badges';
    const badges = el('div', 'display:grid;grid-template-columns:1fr 1fr 1fr;gap:9px;');
    [
      { e: '🏆', label: 'First Win', earned: wins >= 1 },
      { e: '🔥', label: 'Hot Streak', earned: streak >= 3 },
      { e: '⚡', label: 'Speedy', earned: bests[GAMES.findIndex((g) => g.key === 'quickdraw')] >= 1 },
      { e: '🎯', label: 'Sharp Eye', earned: bests[GAMES.findIndex((g) => g.key === 'bullseye')] >= 1 },
      { e: '🤝', label: 'Good Sport', earned: games >= 5 },
      { e: '⭐', label: `Level ${level}`, earned: true },
    ].forEach((b) => {
      badges.append(el('div', `background:#fff;border-radius:18px;padding:10px 4px;box-shadow:0 6px 14px rgba(80,60,140,.06);opacity:${b.earned ? 1 : 0.42};`,
        `<div style="font-size:26px">${b.e}</div><div style="font-size:11px;color:${INK_LABEL};font-weight:800;margin-top:3px">${b.label}</div>`));
    });

    const edit = el('button', `margin-top:12px;width:100%;height:46px;border:none;border-radius:16px;background:rgba(255,255,255,.7);color:${hex2css(pal.baseHex)};font-family:${FONT_DISPLAY};font-weight:700;font-size:15px;cursor:pointer;`);
    edit.textContent = 'Edit player ✎';
    edit.addEventListener('click', () => { audio.click(); this.scene.start('Onboarding'); });

    wrap.append(blob, nameEl, levelCard, stats, badgeTitle, badges, edit);
    content.append(wrap);
  }
}

function el(tag: keyof HTMLElementTagNameMap, css: string, html?: string): HTMLElement {
  const e = document.createElement(tag);
  e.style.cssText = css;
  if (html) e.innerHTML = html;
  return e;
}
