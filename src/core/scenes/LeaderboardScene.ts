import Phaser from 'phaser';
import { GAMES } from '../config';
import { Profile, AVATARS } from '../profile/Profile';
import { Storage } from '../storage/Storage';
import { ensureSoleActiveScene } from '../ui/NavGuard';
import { createShell, shellTitle } from '../ui/Shell';
import { FONT_DISPLAY, INK, INK_DIM, cssGradient, hex2css } from '../design';

// "Ranks" tab — a fun "Family Ranks" board. The player slots in alongside fake
// family members; their own score is real (sum of stored per-game bests).
interface Row {
  e: string;
  name: string;
  score: number;
  grad: { start: string; end: string };
  you?: boolean;
}

const FAKES: Row[] = [
  { e: '🦊', name: 'Mom', score: 128, grad: { start: '#FF9DC4', end: '#F0639E' } },
  { e: '🐲', name: 'Dad', score: 97, grad: { start: '#74C0FC', end: '#4DABF7' } },
  { e: '🐸', name: 'Sam', score: 64, grad: { start: '#7FE6B5', end: '#2FB875' } },
  { e: '🐼', name: 'Grandpa', score: 40, grad: { start: '#C5B3FF', end: '#9775FA' } },
];
const MEDALS = ['🥇', '🥈', '🥉'];

export class LeaderboardScene extends Phaser.Scene {
  constructor() {
    super('Leaderboard');
  }

  create(): void {
    ensureSoleActiveScene(this);
    const { content } = createShell(this, 'leaderboard');

    const pal = Profile.pal();
    const accent = hex2css(pal.baseHex);
    const youScore = GAMES.reduce((sum, g) => sum + Storage.getBest(g.key), 0) * 5 + 60;
    const rows: Row[] = [
      ...FAKES,
      { e: AVATARS[Profile.get()?.avatarIdx ?? 0], name: 'You', score: youScore, grad: { start: pal.start, end: pal.end }, you: true },
    ].sort((a, b) => b.score - a.score);

    content.append(shellTitle('🏆 Family Ranks', 'This week'));

    const listWrap = document.createElement('div');
    listWrap.style.cssText = 'display:flex;flex-direction:column;gap:10px;';
    rows.forEach((r, i) => {
      const row = document.createElement('div');
      row.style.cssText =
        'display:flex;align-items:center;gap:12px;border-radius:22px;padding:12px 14px;' +
        'box-shadow:0 6px 14px rgba(80,60,140,.05);' +
        'background:' + (r.you ? accent + '14' : '#fff') + ';' +
        'border:2px solid ' + (r.you ? accent : 'rgba(0,0,0,0)') + ';';
      const medal = i < 3 ? MEDALS[i] : `#${i + 1}`;
      row.innerHTML =
        `<div style="flex:none;width:30px;font-family:${FONT_DISPLAY};font-weight:800;font-size:18px;color:${INK_DIM};text-align:center">${medal}</div>` +
        `<div style="width:44px;height:44px;border-radius:16px;background:${cssGradient(r.grad)};display:flex;align-items:center;justify-content:center;font-size:23px">${r.e}</div>` +
        `<div style="flex:1;font-family:${FONT_DISPLAY};font-weight:700;font-size:16px;color:${INK}">${r.name}</div>` +
        `<div style="font-family:${FONT_DISPLAY};font-weight:800;font-size:17px;color:${INK}">${r.score}<span style="font-size:11px;color:${INK_DIM};font-weight:800"> pts</span></div>`;
      listWrap.append(row);
    });
    content.append(listWrap);
  }
}
