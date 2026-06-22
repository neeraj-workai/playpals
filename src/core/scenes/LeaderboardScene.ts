import Phaser from 'phaser';
import { Profile, AVATARS } from '../profile/Profile';
import { FamilyProfiles } from '../profile/FamilyProfiles';
import { Storage } from '../storage/Storage';
import { ensureSoleActiveScene } from '../ui/NavGuard';
import { createShell, shellTitle } from '../ui/Shell';
import { PALETTE, FONT_DISPLAY, INK, INK_DIM, cssGradient, hex2css } from '../design';

// "Ranks" tab — weekly family leaderboard. Scores reset each Monday.
// All players (main profile + family members) are shown with real weekly scores.
const MEDALS = ['🥇', '🥈', '🥉'];

export class LeaderboardScene extends Phaser.Scene {
  constructor() { super('Leaderboard'); }

  create(): void {
    ensureSoleActiveScene(this);
    const { content } = createShell(this, 'leaderboard');

    const mainProfile = Profile.get();
    const pal = Profile.pal();

    // Build player list: main user + family members
    const allPlayers = [
      {
        id: 'main',
        name: mainProfile?.name ?? 'You',
        avatarIdx: mainProfile?.avatarIdx ?? 0,
        colorIdx: mainProfile?.colorIdx ?? 0,
        isMain: true,
      },
      ...FamilyProfiles.list().map(m => ({ ...m, isMain: false })),
    ];

    // Current week scores
    const ranked = allPlayers
      .map(p => ({ ...p, score: Storage.getWeeklyScore(p.id) }))
      .sort((a, b) => b.score - a.score);

    // Previous week winner
    const prevRanked = allPlayers
      .map(p => ({ ...p, score: Storage.getWeeklyScore(p.id, -1) }))
      .sort((a, b) => b.score - a.score);
    const prevWinner = prevRanked[0]?.score > 0 ? prevRanked[0] : null;

    // Week label (e.g. "Jun 16 – 22")
    const weekLabel = getWeekRangeLabel();

    content.append(shellTitle('🏆 Family Ranks', weekLabel));

    // ── Previous week winner chip ─────────────────────────────────────────
    if (prevWinner) {
      const chip = document.createElement('div');
      chip.style.cssText =
        'display:flex;align-items:center;gap:10px;background:#fff;border-radius:18px;' +
        'padding:10px 14px;margin-bottom:12px;box-shadow:0 6px 14px rgba(80,60,140,.06);';
      const prevPal = PALETTE[prevWinner.colorIdx];
      chip.innerHTML =
        '<div style="font-size:20px">🏅</div>' +
        '<div style="flex:1">' +
        '<div style="font-family:' + FONT_DISPLAY + ';font-weight:800;font-size:13px;color:' + INK + '">Last Week\'s Champion</div>' +
        '<div style="font-size:12px;color:' + INK_DIM + ';font-weight:800">' + prevWinner.name + ' · ' + prevWinner.score + ' pts</div>' +
        '</div>' +
        '<div style="width:36px;height:36px;border-radius:12px;background:' + cssGradient(prevPal) + ';display:flex;align-items:center;justify-content:center;font-size:19px">' +
        AVATARS[prevWinner.avatarIdx] + '</div>';
      content.append(chip);
    }

    // ── This week label ───────────────────────────────────────────────────
    const weekTitle = document.createElement('div');
    weekTitle.style.cssText = 'font-size:11px;color:' + INK_DIM + ';font-weight:800;letter-spacing:1px;margin-bottom:10px;';
    weekTitle.textContent = 'THIS WEEK';
    content.append(weekTitle);

    // ── Rankings ──────────────────────────────────────────────────────────
    const accent = hex2css(pal.baseHex);
    const listWrap = document.createElement('div');
    listWrap.style.cssText = 'display:flex;flex-direction:column;gap:8px;';

    if (ranked.every(r => r.score === 0)) {
      const empty = document.createElement('div');
      empty.style.cssText =
        'text-align:center;padding:24px 16px;background:#fff;border-radius:22px;' +
        'box-shadow:0 6px 14px rgba(80,60,140,.05);';
      empty.innerHTML =
        '<div style="font-size:36px;margin-bottom:8px">🎮</div>' +
        '<div style="font-family:' + FONT_DISPLAY + ';font-weight:800;font-size:16px;color:' + INK + '">No scores yet this week</div>' +
        '<div style="font-size:13px;color:' + INK_DIM + ';font-weight:800;margin-top:4px">Play games to earn points!</div>';
      listWrap.append(empty);
    } else {
      ranked.forEach((r, i) => {
        const isMain = r.isMain;
        const rowPal = PALETTE[r.colorIdx];
        const row = document.createElement('div');
        row.style.cssText =
          'display:flex;align-items:center;gap:12px;border-radius:20px;padding:12px 14px;' +
          'box-shadow:0 6px 14px rgba(80,60,140,.05);' +
          'background:' + (isMain ? accent + '14' : '#fff') + ';' +
          'border:2px solid ' + (isMain ? accent : 'rgba(0,0,0,0)') + ';';
        const medal = i < 3 ? MEDALS[i] : '#' + (i + 1);
        row.innerHTML =
          '<div style="flex:none;width:28px;font-family:' + FONT_DISPLAY + ';font-weight:800;font-size:17px;color:' + INK_DIM + ';text-align:center">' + medal + '</div>' +
          '<div style="width:42px;height:42px;border-radius:14px;background:' + cssGradient(rowPal) + ';display:flex;align-items:center;justify-content:center;font-size:22px">' + AVATARS[r.avatarIdx] + '</div>' +
          '<div style="flex:1;font-family:' + FONT_DISPLAY + ';font-weight:700;font-size:15px;color:' + INK + '">' + r.name + (isMain ? ' (you)' : '') + '</div>' +
          '<div style="font-family:' + FONT_DISPLAY + ';font-weight:800;font-size:16px;color:' + INK + '">' + r.score + '<span style="font-size:11px;color:' + INK_DIM + ';font-weight:800"> pts</span></div>';
        listWrap.append(row);
      });
    }

    content.append(listWrap);

    // ── How points work ───────────────────────────────────────────────────
    const hint = document.createElement('div');
    hint.style.cssText = 'text-align:center;font-size:12px;color:' + INK_DIM + ';font-weight:800;margin-top:12px;';
    hint.textContent = '🏆 Win a game = +10 pts · Resets every Monday';
    content.append(hint);
  }
}

function getWeekRangeLabel(): string {
  const now = new Date();
  const day = now.getDay();
  const monday = new Date(now);
  monday.setDate(now.getDate() + (day === 0 ? -6 : 1 - day));
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const fmt = (d: Date) => months[d.getMonth()] + ' ' + d.getDate();
  return fmt(monday) + ' – ' + fmt(sunday);
}
