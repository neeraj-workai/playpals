import Phaser from 'phaser';
import { GAMES } from '../config';
import { Profile, AVATARS } from '../profile/Profile';
import { FamilyProfiles } from '../profile/FamilyProfiles';
import { Session } from '../session/Session';
import { audio } from '../audio/AudioManager';
import { mountOnStage } from '../ui/Stage';
import { ensureSoleActiveScene } from '../ui/NavGuard';
import { PALETTE, FONT_DISPLAY, FONT_BODY, INK, INK_DIM, INK_LABEL, BLOB_RADIUS, cssGradient, hex2css } from '../design';

export class GameDetailScene extends Phaser.Scene {
  private root?: HTMLDivElement;
  private gameKey = '';

  constructor() { super('GameDetail'); }

  init(data: { key?: string }): void {
    this.gameKey = data?.key ?? GAMES[0].key;
  }

  create(): void {
    ensureSoleActiveScene(this);
    const def = GAMES.find((g) => g.key === this.gameKey) ?? GAMES[0];
    let mode: 'ai' | '2p' = '2p';
    let selectedP2Id = '';   // empty = anonymous Player 2

    const root = document.createElement('div');
    root.style.cssText =
      'position:absolute;inset:0;display:flex;flex-direction:column;overflow:hidden;' +
      'padding:14px 20px 14px;font-family:' + FONT_BODY +
      ';background:linear-gradient(180deg,#F3EEFF 0%,#FCF1F7 100%);' +
      'color:' + INK + ';-webkit-tap-highlight-color:transparent;';

    // back button
    const back = document.createElement('button');
    back.innerHTML = '←';
    back.style.cssText =
      'flex:none;width:42px;height:42px;border-radius:50%;border:none;background:#fff;' +
      'box-shadow:0 6px 14px rgba(74,68,102,.08);font-size:18px;cursor:pointer;color:' + INK + ';margin-bottom:8px;';
    back.addEventListener('click', () => { audio.click(); this.scene.start('Hub'); });

    // hero card
    const hero = document.createElement('div');
    hero.style.cssText =
      'flex:none;border-radius:24px;padding:10px;text-align:center;box-shadow:0 8px 20px rgba(80,60,140,.06);' +
      'background:' + def.tint + ';animation:pp-pop .35s ease;overflow:visible;';
    const blob = document.createElement('div');
    blob.style.cssText =
      'width:76px;height:76px;border-radius:36% 64% 60% 40% / 56% 42% 58% 44%;' +
      'background:' + def.cssGrad + ';display:flex;align-items:center;justify-content:center;' +
      'font-size:40px;margin:0 auto;box-shadow:0 10px 20px rgba(74,68,102,.18);' +
      'animation:pp-float 3s ease-in-out infinite;';
    blob.textContent = def.icon;
    const title = document.createElement('div');
    title.style.cssText = 'font-family:' + FONT_DISPLAY + ';font-weight:800;font-size:22px;color:' + INK + ';margin-top:8px;';
    title.textContent = def.title;
    const sub = document.createElement('div');
    sub.style.cssText = 'font-size:13px;color:' + INK_DIM + ';font-weight:800;';
    sub.textContent = def.blurb;
    hero.append(blob, title, sub);

    // stats trio
    const statsRow = document.createElement('div');
    statsRow.style.cssText = 'flex:none;display:flex;gap:8px;margin-top:8px;';
    const stat = (icon: string, txt: string): HTMLDivElement => {
      const d = document.createElement('div');
      d.style.cssText = 'flex:1;background:#fff;border-radius:16px;padding:8px;text-align:center;box-shadow:0 4px 12px rgba(80,60,140,.05);';
      d.innerHTML = '<div style="font-size:17px">' + icon + '</div><div style="font-weight:800;font-size:12px;color:' + INK + ';margin-top:1px">' + txt + '</div>';
      return d;
    };
    statsRow.append(stat('👥', '2 players'), stat('⏱', def.time), stat('⭐', def.diff));

    // howto
    const howtoTitle = document.createElement('div');
    howtoTitle.style.cssText = 'flex:none;font-family:' + FONT_DISPLAY + ';font-weight:800;font-size:15px;color:' + INK + ';margin:8px 0 4px;';
    howtoTitle.textContent = 'How to play';
    const howto = document.createElement('div');
    howto.style.cssText = 'flex:1;min-height:0;display:flex;flex-direction:column;justify-content:flex-start;gap:6px;';
    def.howto.forEach((s) => {
      const row = document.createElement('div');
      row.style.cssText = 'display:flex;align-items:center;gap:12px;background:#fff;border-radius:16px;padding:6px 12px;box-shadow:0 4px 12px rgba(80,60,140,.05);';
      row.innerHTML =
        '<div style="flex:none;width:30px;height:30px;border-radius:50%;background:' + def.cssGrad + ';color:#fff;font-family:' + FONT_DISPLAY + ';font-weight:800;font-size:13px;display:flex;align-items:center;justify-content:center">' + s.n + '</div>' +
        '<div style="font-weight:700;font-size:13px;color:' + INK + ';line-height:1.2">' + s.t + '</div>';
      howto.append(row);
    });

    // mode toggle
    const seg = document.createElement('div');
    seg.style.cssText = 'flex:none;display:flex;gap:6px;margin-top:8px;background:rgba(255,255,255,.7);padding:4px;border-radius:16px;box-shadow:inset 0 0 0 1px rgba(80,60,140,.07);';
    const seg1 = segBtn('1P · vs CPU');
    const seg2 = segBtn('2P · Pass & play');
    seg.append(seg1, seg2);

    // P2 picker section (visible only in 2P mode)
    const p2Section = document.createElement('div');
    p2Section.style.cssText = 'flex:none;margin-top:8px;';

    function renderP2Picker() {
      p2Section.innerHTML = '';
      const members = FamilyProfiles.list();
      if (mode !== '2p') return;
      const lbl = document.createElement('div');
      lbl.style.cssText = 'font-size:11px;color:' + INK_LABEL + ';font-weight:800;letter-spacing:1px;margin-bottom:7px;';
      lbl.textContent = 'SELECT PLAYER 2';
      p2Section.append(lbl);

      const chips = document.createElement('div');
      chips.style.cssText = 'display:flex;gap:8px;flex-wrap:wrap;';

      // "Anyone" chip = anonymous P2
      chips.append(playerChip('', '🐲', 'Player 2'));
      members.forEach(m => chips.append(playerChip(m.id, AVATARS[m.avatarIdx], m.name, PALETTE[m.colorIdx])));
      p2Section.append(chips);
    }

    function playerChip(id: string, emoji: string, name: string, pal?: typeof PALETTE[0]): HTMLButtonElement {
      const b = document.createElement('button');
      const selected = selectedP2Id === id;
      const grad = pal ? cssGradient(pal) : 'linear-gradient(135deg,#B8ADFF,#9775FA)';
      b.style.cssText =
        'display:flex;align-items:center;gap:6px;border:none;border-radius:14px;padding:6px 10px;cursor:pointer;' +
        'background:' + (selected ? grad : '#fff') + ';' +
        'box-shadow:' + (selected ? '0 4px 12px rgba(74,68,102,.18)' : '0 3px 8px rgba(74,68,102,.07)') + ';' +
        'border:2px solid ' + (selected ? 'rgba(74,68,102,.3)' : 'transparent') + ';';
      const av = document.createElement('span');
      av.style.cssText = 'width:26px;height:26px;border-radius:' + BLOB_RADIUS + ';background:' + (selected ? 'rgba(255,255,255,.3)' : grad) + ';display:flex;align-items:center;justify-content:center;font-size:14px;';
      av.textContent = emoji;
      const nm = document.createElement('span');
      nm.style.cssText = 'font-family:' + FONT_DISPLAY + ';font-weight:700;font-size:13px;color:' + (selected ? '#fff' : INK) + ';';
      nm.textContent = name;
      b.append(av, nm);
      b.addEventListener('click', () => {
        selectedP2Id = id;
        audio.click();
        renderP2Picker();
      });
      return b;
    }

    seg1.addEventListener('click', () => { mode = 'ai'; selectedP2Id = ''; styleSeg(); renderP2Picker(); audio.click(); });
    seg2.addEventListener('click', () => { mode = '2p'; styleSeg(); renderP2Picker(); audio.click(); });

    function segBtn(label: string): HTMLButtonElement {
      const b = document.createElement('button');
      b.textContent = label;
      return b;
    }
    function styleSeg() {
      [seg1, seg2].forEach((b, i) => {
        const sel = (i === 0 && mode === 'ai') || (i === 1 && mode === '2p');
        b.style.cssText =
          'flex:1;height:38px;border:none;border-radius:12px;cursor:pointer;font-family:' + FONT_DISPLAY +
          ';font-weight:800;font-size:13px;transition:all .15s;' +
          'background:' + (sel ? '#fff' : 'transparent') + ';' +
          'color:' + (sel ? hex2css(def.accentHex) : INK_DIM) + ';' +
          'box-shadow:' + (sel ? '0 4px 10px rgba(80,60,140,.10)' : 'none') + ';';
      });
    }
    styleSeg();
    renderP2Picker();

    // start button
    const start = document.createElement('button');
    start.textContent = 'Start game ▶';
    start.style.cssText =
      'flex:none;margin-top:8px;width:100%;height:54px;border:none;border-radius:22px;color:#fff;' +
      'font-family:' + FONT_DISPLAY + ';font-weight:800;font-size:18px;cursor:pointer;' +
      'background:' + def.cssGrad + ';' +
      'box-shadow:0 10px 22px rgba(74,68,102,.22);';
    start.addEventListener('click', () => {
      audio.click();
      // Always set session so ResultOverlay can record wins
      Session.setGame(def.key, 'main', mode === '2p' ? selectedP2Id : '');
      if (mode === '2p') this.scene.start('PassPlay', { key: def.key, player2Id: selectedP2Id });
      else this.scene.start(def.scene, { mode });
    });

    root.append(back, hero, statsRow, howtoTitle, howto, seg, p2Section, start);
    mountOnStage(this, root);
    this.root = root;
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => { this.root = undefined; });

    void Profile; void AVATARS; void INK_LABEL;
  }
}
