import Phaser from 'phaser';
import { GAMES } from '../config';
import { Profile, AVATARS } from '../profile/Profile';
import { audio } from '../audio/AudioManager';
import { mountOnStage } from '../ui/Stage';
import { ensureSoleActiveScene } from '../ui/NavGuard';
import { FONT_DISPLAY, FONT_BODY, INK, INK_DIM, BLOB_RADIUS, cssGradient, hex2css } from '../design';

// Per-game detail page (Hub → here → game). Big hero blob with the game icon,
// stats trio (2 players / time / difficulty), numbered "How to play" steps,
// 1P/2P segmented mode toggle, and a single "Start game ▶" button — matches
// the design's Detail screen exactly, plus the mode toggle the design omits
// but the app supports.
export class GameDetailScene extends Phaser.Scene {
  private root?: HTMLDivElement;
  private gameKey = '';

  constructor() {
    super('GameDetail');
  }

  init(data: { key?: string }): void {
    this.gameKey = data?.key ?? GAMES[0].key;
  }

  create(): void {
    ensureSoleActiveScene(this);
    const def = GAMES.find((g) => g.key === this.gameKey) ?? GAMES[0];
    let mode: 'ai' | '2p' = '2p';

    const root = document.createElement('div');
    root.style.cssText =
      'position:absolute;inset:0;display:flex;flex-direction:column;overflow:hidden;' +
      'padding:16px 20px 16px;font-family:' + FONT_BODY +
      ';background:linear-gradient(180deg,#F3EEFF 0%,#FCF1F7 100%);' +
      'color:' + INK + ';-webkit-tap-highlight-color:transparent;';

    // back button
    const back = document.createElement('button');
    back.innerHTML = '←';
    back.style.cssText =
      'flex:none;width:44px;height:44px;border-radius:50%;border:none;background:#fff;box-shadow:0 6px 14px rgba(74,68,102,.08);' +
      'font-size:19px;cursor:pointer;color:' + INK + ';margin-bottom:10px;';
    back.addEventListener('click', () => { audio.click(); this.scene.start('Hub'); });

    // hero card
    const hero = document.createElement('div');
    hero.style.cssText =
      'flex:none;border-radius:26px;padding:18px;text-align:center;box-shadow:0 10px 22px rgba(80,60,140,.06);' +
      'background:' + def.tint + ';animation:pp-pop .35s ease;';
    const blob = document.createElement('div');
    blob.style.cssText =
      'width:84px;height:84px;border-radius:36% 64% 60% 40% / 56% 42% 58% 44%;' +
      'background:' + def.cssGrad + ';display:flex;align-items:center;justify-content:center;' +
      'font-size:44px;margin:0 auto;box-shadow:0 12px 24px rgba(74,68,102,.18);' +
      'animation:pp-float 3s ease-in-out infinite;';
    blob.textContent = def.icon;
    const title = document.createElement('div');
    title.style.cssText = `font-family:${FONT_DISPLAY};font-weight:800;font-size:24px;color:${INK};margin-top:10px;`;
    title.textContent = def.title;
    const sub = document.createElement('div');
    sub.style.cssText = `font-size:14px;color:${INK_DIM};font-weight:800;`;
    sub.textContent = def.blurb;
    hero.append(blob, title, sub);

    // stats trio
    const statsRow = document.createElement('div');
    statsRow.style.cssText = 'flex:none;display:flex;gap:10px;margin-top:10px;';
    const stat = (icon: string, txt: string): HTMLDivElement => {
      const d = document.createElement('div');
      d.style.cssText = 'flex:1;background:#fff;border-radius:18px;padding:10px;text-align:center;box-shadow:0 6px 14px rgba(80,60,140,.05);';
      d.innerHTML = `<div style="font-size:19px">${icon}</div><div style="font-weight:800;font-size:12.5px;color:${INK};margin-top:2px">${txt}</div>`;
      return d;
    };
    statsRow.append(stat('👥', '2 players'), stat('⏱', def.time), stat('⭐', def.diff));

    // howto (flexes to fill leftover space between stats and the toggle)
    const howtoTitle = document.createElement('div');
    howtoTitle.style.cssText = `flex:none;font-family:${FONT_DISPLAY};font-weight:800;font-size:17px;color:${INK};margin:12px 0 8px;`;
    howtoTitle.textContent = 'How to play';
    const howto = document.createElement('div');
    howto.style.cssText = 'flex:1;min-height:0;display:flex;flex-direction:column;justify-content:center;gap:8px;';
    def.howto.forEach((s) => {
      const row = document.createElement('div');
      row.style.cssText = 'display:flex;align-items:center;gap:14px;background:#fff;border-radius:18px;padding:11px 13px;box-shadow:0 6px 14px rgba(80,60,140,.05);';
      row.innerHTML =
        `<div style="flex:none;width:34px;height:34px;border-radius:50%;background:${def.cssGrad};color:#fff;font-family:${FONT_DISPLAY};font-weight:800;font-size:15px;display:flex;align-items:center;justify-content:center">${s.n}</div>` +
        `<div style="font-weight:700;font-size:14px;color:${INK};line-height:1.2">${s.t}</div>`;
      howto.append(row);
    });

    // mode segmented toggle (1P vs CPU / 2 Players)
    const seg = document.createElement('div');
    seg.style.cssText = 'flex:none;display:flex;gap:8px;margin-top:10px;background:rgba(255,255,255,.7);padding:5px;border-radius:18px;box-shadow:inset 0 0 0 1px rgba(80,60,140,.07);';
    const seg1 = segBtn('1P · vs CPU', true);
    const seg2 = segBtn('2P · Pass & play', false);
    seg.append(seg1, seg2);
    seg1.addEventListener('click', () => { mode = 'ai'; styleSeg(); audio.click(); });
    seg2.addEventListener('click', () => { mode = '2p'; styleSeg(); audio.click(); });
    function segBtn(label: string, _active: boolean): HTMLButtonElement {
      const b = document.createElement('button');
      b.textContent = label;
      return b;
    }
    function styleSeg(): void {
      [seg1, seg2].forEach((b, i) => {
        const sel = (i === 0 && mode === 'ai') || (i === 1 && mode === '2p');
        b.style.cssText =
          'flex:1;height:42px;border:none;border-radius:14px;cursor:pointer;font-family:' + FONT_DISPLAY +
          ';font-weight:800;font-size:14px;transition:all .15s;' +
          'background:' + (sel ? '#fff' : 'transparent') + ';' +
          'color:' + (sel ? hex2css(def.accentHex) : INK_DIM) + ';' +
          'box-shadow:' + (sel ? '0 4px 12px rgba(80,60,140,.10)' : 'none') + ';';
      });
    }
    styleSeg();

    // start button
    const start = document.createElement('button');
    start.textContent = 'Start game ▶';
    start.style.cssText =
      'flex:none;margin-top:10px;width:100%;height:58px;border:none;border-radius:24px;color:#fff;' +
      'font-family:' + FONT_DISPLAY + ';font-weight:800;font-size:19px;cursor:pointer;' +
      'background:' + def.cssGrad + ';' +
      'box-shadow:0 12px 24px rgba(74,68,102,.22);';
    start.addEventListener('click', () => {
      audio.click();
      if (mode === '2p') this.scene.start('PassPlay', { key: def.key });
      else this.scene.start(def.scene, { mode });
    });

    root.append(back, hero, statsRow, howtoTitle, howto, seg, start);
    mountOnStage(this, root);
    this.root = root;
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => { this.root = undefined; });

    void Profile; void AVATARS; // reserved for future personalised hints
  }
}
