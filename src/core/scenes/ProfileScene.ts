import Phaser from 'phaser';
import { GAMES } from '../config';
import { Profile, AVATARS } from '../profile/Profile';
import { FamilyProfiles } from '../profile/FamilyProfiles';
import { Storage } from '../storage/Storage';
import { ensureSoleActiveScene } from '../ui/NavGuard';
import { createShell, shellTitle } from '../ui/Shell';
import { audio } from '../audio/AudioManager';
import { PALETTE, FONT_DISPLAY, FONT_BODY, INK, INK_DIM, INK_LABEL, BLOB_RADIUS, cssGradient, hex2css } from '../design';

// "Me" tab — player profile with stats and badges.
// Player selector at top lets you view any family member's stats.
export class ProfileScene extends Phaser.Scene {
  constructor() { super('Profile'); }

  create(): void {
    ensureSoleActiveScene(this);
    const { content } = createShell(this, 'profile');

    const mainProfile = Profile.get();
    const mainPal = Profile.pal();

    // Build selectable players list
    const allPlayers = [
      { id: 'main', name: mainProfile?.name ?? 'You', avatarIdx: mainProfile?.avatarIdx ?? 0, colorIdx: mainProfile?.colorIdx ?? 0 },
      ...FamilyProfiles.list(),
    ];

    let selectedId = 'main';

    content.append(shellTitle('My Profile'));

    // ── Player selector row ───────────────────────────────────────────────
    const selectorRow = document.createElement('div');
    selectorRow.style.cssText = 'display:flex;gap:8px;overflow-x:auto;padding-bottom:4px;margin-bottom:12px;-webkit-overflow-scrolling:touch;';

    allPlayers.forEach(p => {
      const pal = PALETTE[p.colorIdx];
      const chip = document.createElement('button');
      const sel = p.id === selectedId;
      chip.style.cssText =
        'flex:none;display:flex;align-items:center;gap:6px;border:none;border-radius:14px;padding:6px 12px;cursor:pointer;' +
        'background:' + (sel ? cssGradient(pal) : '#fff') + ';' +
        'box-shadow:' + (sel ? '0 4px 12px rgba(74,68,102,.18)' : '0 3px 8px rgba(74,68,102,.07)') + ';';
      chip.innerHTML =
        '<span style="font-size:16px">' + AVATARS[p.avatarIdx] + '</span>' +
        '<span style="font-family:' + FONT_DISPLAY + ';font-weight:700;font-size:13px;color:' + (sel ? '#fff' : INK) + '">' + p.name + '</span>';
      chip.dataset.pid = p.id;
      chip.addEventListener('click', () => {
        selectedId = p.id;
        audio.click();
        renderStats();
        // Re-style all chips
        selectorRow.querySelectorAll('button').forEach(b => {
          const pid = (b as HTMLButtonElement).dataset.pid ?? '';
          const isSel = pid === selectedId;
          const pp = allPlayers.find(x => x.id === pid)!;
          const pp2 = PALETTE[pp.colorIdx];
          b.style.background = isSel ? cssGradient(pp2) : '#fff';
          b.style.boxShadow = isSel ? '0 4px 12px rgba(74,68,102,.18)' : '0 3px 8px rgba(74,68,102,.07)';
          b.querySelectorAll('span').forEach((s, i2) => {
            if (i2 === 1) (s as HTMLElement).style.color = isSel ? '#fff' : INK;
          });
        });
      });
      selectorRow.append(chip);
    });

    if (allPlayers.length > 1) content.append(selectorRow);

    // ── Stats container (re-rendered on player change) ─────────────────────
    const statsContainer = document.createElement('div');
    statsContainer.style.cssText = 'flex:1;min-height:0;overflow:hidden;display:flex;flex-direction:column;gap:0;';
    content.append(statsContainer);

    const scene = this; // capture for use inside renderStats
    const renderStats = () => {
      statsContainer.innerHTML = '';
      const player = allPlayers.find(p => p.id === selectedId) ?? allPlayers[0];
      const pal = PALETTE[player.colorIdx];
      const accent = hex2css(pal.baseHex);
      const totalWins = Storage.getWins(player.id);
      const sessions = Storage.getSessions();
      const weekScore = Storage.getWeeklyScore(player.id);
      const xp = Math.min(500, totalWins * 20 + weekScore);
      const level = 1 + Math.floor(xp / 100);

      // avatar blob + name
      const wrap = document.createElement('div');
      wrap.style.cssText = 'text-align:center;';

      const blob = el('div',
        'width:76px;height:76px;border-radius:' + BLOB_RADIUS + ';background:' + cssGradient(pal) + ';' +
        'display:flex;align-items:center;justify-content:center;font-size:38px;margin:0 auto;' +
        'box-shadow:0 12px 26px rgba(74,68,102,.18);animation:pp-float 3.2s ease-in-out infinite;');
      blob.textContent = AVATARS[player.avatarIdx];

      const nameEl = el('div',
        'font-family:' + FONT_DISPLAY + ';font-weight:800;font-size:20px;color:' + INK + ';margin-top:5px;');
      nameEl.textContent = player.name;

      // level bar
      const levelCard = el('div',
        'background:#fff;border-radius:18px;padding:10px 14px;margin-top:9px;box-shadow:0 5px 12px rgba(80,60,140,.06);text-align:left;');
      levelCard.innerHTML =
        '<div style="display:flex;justify-content:space-between;font-weight:800;font-size:12px;color:' + INK + '">' +
        '<span>Level ' + level + '</span><span style="color:' + INK_DIM + '">' + xp + ' / 500 XP</span></div>' +
        '<div style="height:10px;border-radius:6px;background:#EFEAF6;margin-top:7px;overflow:hidden">' +
        '<div style="width:' + Math.round((xp / 500) * 100) + '%;height:100%;border-radius:6px;background:' + cssGradient(pal) + '"></div></div>';

      // stat cards
      const stats = el('div', 'display:flex;gap:8px;margin-top:8px;');
      [
        { n: totalWins, l: 'Wins', c: '#2FB875' },
        { n: weekScore, l: 'Wk Pts', c: '#FF922B' },
        { n: sessions, l: 'Sessions', c: '#4DABF7' },
      ].forEach(s => {
        stats.append(el('div',
          'flex:1;background:#fff;border-radius:18px;padding:10px 6px;box-shadow:0 5px 12px rgba(80,60,140,.06);',
          '<div style="font-family:' + FONT_DISPLAY + ';font-weight:800;font-size:20px;color:' + s.c + '">' + s.n + '</div>' +
          '<div style="font-size:11px;color:' + INK_DIM + ';font-weight:800;margin-top:2px">' + s.l + '</div>'));
      });

      // badges
      const badgeTitle = el('div',
        'font-family:' + FONT_DISPLAY + ';font-weight:800;font-size:15px;color:' + INK + ';text-align:left;margin:10px 0 7px;');
      badgeTitle.textContent = 'Badges';

      const qDrawIdx = GAMES.findIndex(g => g.key === 'quickdraw');
      const bullIdx = GAMES.findIndex(g => g.key === 'bullseye');
      const badges = el('div', 'display:grid;grid-template-columns:1fr 1fr 1fr;gap:7px;');
      [
        { e: '🏆', label: 'First Win', earned: totalWins >= 1 },
        { e: '🔥', label: 'Hot Streak', earned: totalWins >= 5 },
        { e: '⚡', label: 'Speedy', earned: Storage.getGameWins(player.id, qDrawIdx >= 0 ? GAMES[qDrawIdx].key : 'quickdraw') >= 1 },
        { e: '🎯', label: 'Sharp Eye', earned: Storage.getGameWins(player.id, bullIdx >= 0 ? GAMES[bullIdx].key : 'bullseye') >= 1 },
        { e: '🤝', label: 'Good Sport', earned: sessions >= 5 },
        { e: '⭐', label: 'Level ' + level, earned: true },
      ].forEach(b => {
        badges.append(el('div',
          'background:#fff;border-radius:16px;padding:9px 4px;box-shadow:0 5px 12px rgba(80,60,140,.06);opacity:' + (b.earned ? 1 : 0.38) + ';',
          '<div style="font-size:24px">' + b.e + '</div>' +
          '<div style="font-size:10px;color:' + INK_LABEL + ';font-weight:800;margin-top:3px">' + b.label + '</div>'));
      });

      // edit button (only for main profile)
      let editBtn: HTMLButtonElement | null = null;
      if (player.id === 'main') {
        editBtn = document.createElement('button');
        editBtn.textContent = 'Edit player ✎';
        editBtn.style.cssText =
          'margin-top:10px;width:100%;height:42px;border:none;border-radius:14px;' +
          'background:rgba(255,255,255,.7);color:' + accent + ';font-family:' + FONT_DISPLAY + ';' +
          'font-weight:700;font-size:14px;cursor:pointer;';
        editBtn.addEventListener('click', () => { audio.click(); scene.scene.start('Onboarding'); });
      }

      wrap.append(blob, nameEl, levelCard, stats, badgeTitle, badges);
      if (editBtn) wrap.append(editBtn);
      statsContainer.append(wrap);
    }

    renderStats();
    void FONT_BODY; void mainPal;
  }
}

function el(tag: keyof HTMLElementTagNameMap, css: string, html?: string): HTMLElement {
  const e = document.createElement(tag);
  e.style.cssText = css;
  if (html) e.innerHTML = html;
  return e;
}
