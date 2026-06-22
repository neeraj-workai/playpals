import Phaser from 'phaser';
import { GAMES } from '../config';
import { Profile, AVATARS } from '../profile/Profile';
import { audio } from '../audio/AudioManager';
import { mountOnStage } from './Stage';
import { FONT_DISPLAY, FONT_BODY, INK, INK_DIM, PALETTE, BLOB_RADIUS, cssGradient, hex2css, P2_RAMP } from '../design';

// Match-end result screen, rendered as a full-screen HTML overlay so the
// confetti + Baloo text + blob avatars stay crisp. Matches the design's
// Results screen. Same API as before — game scenes call `showResult(this,
// { title, subtitle, onRematch, onHome })` and don't need to know any of
// this visual code.

export interface ResultOpts {
  title: string;         // "You win!" / "CPU wins" / "Draw"
  titleColor?: string;   // legacy — ignored; we colour the title with the winner palette
  subtitle?: string;     // usually the score string "3 – 2"
  onRematch: () => void;
  onHome: () => void;
}

// Phaser API expects a GameObjects.Container — return a real (empty) one to
// keep callers happy, but the visual is an HTML overlay we manage ourselves.
export function showResult(scene: Phaser.Scene, opts: ResultOpts): Phaser.GameObjects.Container {
  // Find the GameDef matching the calling scene (HubScene/PassPlay don't call
  // this, so this lookup is always a game scene).
  const def = GAMES.find((g) => g.scene === scene.scene.key);
  const pal = Profile.pal();
  const name = Profile.name();
  const avatar = AVATARS[Profile.get()?.avatarIdx ?? 0];

  // crude winner detection from the title so we don't need a new API param
  const p1Won = /you win|player 1 wins|p1 wins/i.test(opts.title);
  const isDraw = /draw/i.test(opts.title);

  const root = document.createElement('div');
  root.style.cssText =
    'position:absolute;inset:0;padding:24px 24px 28px;text-align:center;font-family:' + FONT_BODY +
    ';color:' + INK + ';-webkit-tap-highlight-color:transparent;overflow:hidden;animation:pp-pop .35s ease;' +
    'display:flex;flex-direction:column;align-items:stretch;' +
    'background:linear-gradient(180deg,#FFF4E0,#FCF1F7);';

  // confetti (14 falling pieces)
  for (let i = 0; i < 14; i++) {
    const c = PALETTE[i % PALETTE.length].base;
    const left = (i * 7 + 3) + '%';
    const dur = (1.6 + (i % 4) * 0.4) + 's';
    const delay = ((i % 6) * 0.18) + 's';
    const piece = document.createElement('span');
    piece.style.cssText = `position:absolute;top:0;left:${left};width:11px;height:14px;border-radius:3px;background:${c};animation:pp-fall ${dur} linear ${delay} forwards;`;
    root.append(piece);
  }

  // trophy
  const trophy = document.createElement('div');
  trophy.style.cssText = 'font-size:74px;margin-top:18px;animation:pp-float 2.6s ease-in-out infinite;';
  trophy.textContent = isDraw ? '🤝' : '🏆';

  const titleEl = document.createElement('div');
  const winColor = isDraw ? INK : (p1Won ? hex2css(pal.baseHex) : P2_RAMP.base);
  titleEl.style.cssText = `font-family:${FONT_DISPLAY};font-weight:800;font-size:34px;color:${winColor};margin-top:6px;`;
  titleEl.textContent = opts.title;

  const game = document.createElement('div');
  game.style.cssText = `font-size:15px;color:${INK_DIM};font-weight:800;`;
  game.textContent = def?.title ?? '';

  // score card
  const card = document.createElement('div');
  card.style.cssText = 'display:flex;align-items:center;justify-content:center;gap:14px;margin-top:26px;background:#fff;border-radius:26px;padding:22px;box-shadow:0 10px 22px rgba(80,60,140,.08);';
  card.append(playerPanel(avatar, name, cssGradient(pal)), scoreText(opts.subtitle || ''), playerPanel('🐲', 'Player 2', cssGradient(P2_RAMP)));

  // buttons
  const again = document.createElement('button');
  again.textContent = 'Play again ↻';
  again.style.cssText =
    'margin-top:26px;width:100%;height:60px;border:none;border-radius:26px;color:#fff;' +
    'font-family:' + FONT_DISPLAY + ';font-weight:800;font-size:19px;cursor:pointer;' +
    'background:' + cssGradient(pal) + ';box-shadow:0 12px 24px rgba(74,68,102,.22);';
  again.addEventListener('click', () => { audio.click(); cleanup(); opts.onRematch(); });

  const home = document.createElement('button');
  home.textContent = 'Back to games';
  home.style.cssText =
    'margin-top:12px;width:100%;height:54px;border:none;border-radius:22px;background:rgba(255,255,255,.7);' +
    'color:' + hex2css(pal.baseHex) + ';font-family:' + FONT_DISPLAY + ';font-weight:700;font-size:16px;cursor:pointer;';
  home.addEventListener('click', () => { audio.click(); cleanup(); opts.onHome(); });

  root.append(trophy, titleEl, game, card, again, home);
  // mountOnStage also removes the layer on scene shutdown, so the overlay can
  // never outlive its game scene.
  mountOnStage(scene, root);

  function cleanup(): void {
    root.remove();
  }

  // return an empty container to satisfy the previous API
  return scene.add.container(0, 0);

  function playerPanel(avEmoji: string, label: string, grad: string): HTMLDivElement {
    const wrap = document.createElement('div');
    wrap.style.cssText = 'text-align:center;flex:1;';
    const av = document.createElement('div');
    av.style.cssText = `width:60px;height:60px;border-radius:${BLOB_RADIUS};background:${grad};display:flex;align-items:center;justify-content:center;font-size:30px;margin:0 auto;`;
    av.textContent = avEmoji;
    const nm = document.createElement('div');
    nm.style.cssText = `font-weight:800;font-size:13px;color:${INK};margin-top:6px;`;
    nm.textContent = label;
    wrap.append(av, nm);
    return wrap;
  }
  function scoreText(t: string): HTMLDivElement {
    const d = document.createElement('div');
    d.style.cssText = `font-family:${FONT_DISPLAY};font-weight:800;font-size:32px;color:${INK};`;
    // accept "3 – 2", "3-2", "3:2"
    d.textContent = t.replace(/-/g, '–').replace(/:/g, '–') || '';
    return d;
  }
}
