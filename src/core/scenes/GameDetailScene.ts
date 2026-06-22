import Phaser from 'phaser';
import { GAMES } from '../config';
import { Profile, AVATARS } from '../profile/Profile';
import { FamilyProfiles } from '../profile/FamilyProfiles';
import { Session } from '../session/Session';
import { audio } from '../audio/AudioManager';
import { mountOnStage } from '../ui/Stage';
import { NavBack } from '../ui/NavBack';
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
    let selectedP1Id = 'main'; // 'main' = device owner, else a family member id

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
    const goBack = (): void => { audio.click(); this.scene.start('Hub'); };
    back.addEventListener('click', goBack);
    NavBack.register(goBack);

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

    // tab bar
    let activeTab: 'players' | 'howto' = 'players';
    const tabBar = document.createElement('div');
    tabBar.style.cssText = 'flex:none;display:flex;gap:6px;margin-top:10px;background:rgba(255,255,255,.7);padding:4px;border-radius:16px;box-shadow:inset 0 0 0 1px rgba(80,60,140,.07);';
    const tabPlayers = tabBtn('Players');
    const tabHowto = tabBtn('How to play');
    tabBar.append(tabPlayers, tabHowto);

    function tabBtn(label: string): HTMLButtonElement {
      const b = document.createElement('button');
      b.textContent = label;
      return b;
    }
    function styleTabBar() {
      [tabPlayers, tabHowto].forEach((b, i) => {
        const sel = (i === 0 && activeTab === 'players') || (i === 1 && activeTab === 'howto');
        b.style.cssText =
          'flex:1;height:38px;border:none;border-radius:12px;cursor:pointer;font-family:' + FONT_DISPLAY +
          ';font-weight:800;font-size:13px;transition:all .15s;' +
          'background:' + (sel ? '#fff' : 'transparent') + ';' +
          'color:' + (sel ? hex2css(def.accentHex) : INK_DIM) + ';' +
          'box-shadow:' + (sel ? '0 4px 10px rgba(80,60,140,.10)' : 'none') + ';';
      });
    }

    // tab panel — fills remaining space, clips overflow
    const tabPanel = document.createElement('div');
    tabPanel.style.cssText = 'flex:1;min-height:0;overflow:hidden;margin-top:8px;';

    // Players panel: mode toggle + pickers
    const playersPanel = document.createElement('div');
    playersPanel.style.cssText = 'height:100%;display:flex;flex-direction:column;gap:8px;overflow-y:auto;';

    // mode toggle
    const seg = document.createElement('div');
    seg.style.cssText = 'flex:none;display:flex;gap:6px;background:rgba(255,255,255,.7);padding:4px;border-radius:16px;box-shadow:inset 0 0 0 1px rgba(80,60,140,.07);';
    const seg1 = segBtn('1P · vs CPU');
    const seg2 = segBtn('2P · Pass & play');
    seg.append(seg1, seg2);

    // P1 + P2 picker sections side-by-side (visible only in 2P mode)
    const pickerRow = document.createElement('div');
    pickerRow.style.cssText = 'flex:none;display:flex;gap:10px;';
    const p1Section = document.createElement('div');
    p1Section.style.cssText = 'flex:1;min-width:0;';
    const p2Section = document.createElement('div');
    p2Section.style.cssText = 'flex:1;min-width:0;';
    pickerRow.append(p1Section, p2Section);
    playersPanel.append(seg, pickerRow);

    // How to play panel
    const howtoPanel = document.createElement('div');
    howtoPanel.style.cssText = 'height:100%;display:flex;flex-direction:column;gap:6px;overflow-y:auto;';
    def.howto.forEach((s) => {
      const row = document.createElement('div');
      row.style.cssText = 'display:flex;align-items:center;gap:12px;background:#fff;border-radius:16px;padding:8px 12px;box-shadow:0 4px 12px rgba(80,60,140,.05);';
      row.innerHTML =
        '<div style="flex:none;width:30px;height:30px;border-radius:50%;background:' + def.cssGrad + ';color:#fff;font-family:' + FONT_DISPLAY + ';font-weight:800;font-size:13px;display:flex;align-items:center;justify-content:center">' + s.n + '</div>' +
        '<div style="font-weight:700;font-size:13px;color:' + INK + ';line-height:1.2">' + s.t + '</div>';
      howtoPanel.append(row);
    });

    function switchTab(tab: 'players' | 'howto') {
      activeTab = tab;
      styleTabBar();
      tabPanel.innerHTML = '';
      tabPanel.append(tab === 'players' ? playersPanel : howtoPanel);
    }

    tabPlayers.addEventListener('click', () => { audio.click(); switchTab('players'); });
    tabHowto.addEventListener('click', () => { audio.click(); switchTab('howto'); });

    function renderP1Picker() {
      p1Section.innerHTML = '';
      if (mode !== '2p') return;
      const lbl = document.createElement('div');
      lbl.style.cssText = 'font-size:11px;color:' + INK_LABEL + ';font-weight:800;letter-spacing:1px;margin-bottom:7px;';
      lbl.textContent = 'SELECT PLAYER 1';
      p1Section.append(lbl);
      const chips = document.createElement('div');
      chips.style.cssText = 'display:flex;gap:8px;flex-wrap:wrap;';
      const mainP = Profile.get();
      chips.append(playerChip('main', AVATARS[mainP?.avatarIdx ?? 0], Profile.name(), Profile.pal(), true));
      FamilyProfiles.list().forEach(m => chips.append(playerChip(m.id, AVATARS[m.avatarIdx], m.name, PALETTE[m.colorIdx], true)));
      p1Section.append(chips);
    }

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
      chips.append(playerChip('', '🐲', 'Player 2', undefined, false));
      members.forEach(m => chips.append(playerChip(m.id, AVATARS[m.avatarIdx], m.name, PALETTE[m.colorIdx], false)));
      p2Section.append(chips);
    }

    function playerChip(id: string, emoji: string, name: string, pal: typeof PALETTE[0] | undefined, isP1: boolean): HTMLButtonElement {
      const b = document.createElement('button');
      const selected = isP1 ? selectedP1Id === id : selectedP2Id === id;
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
        if (isP1) selectedP1Id = id; else selectedP2Id = id;
        audio.click();
        if (isP1) renderP1Picker(); else renderP2Picker();
      });
      return b;
    }

    seg1.addEventListener('click', () => { mode = 'ai'; selectedP1Id = 'main'; selectedP2Id = ''; styleSeg(); renderP1Picker(); renderP2Picker(); audio.click(); });
    seg2.addEventListener('click', () => { mode = '2p'; styleSeg(); renderP1Picker(); renderP2Picker(); audio.click(); });

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
    styleTabBar();
    renderP1Picker();
    renderP2Picker();
    switchTab('players');

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
      Session.setGame(def.key, mode === '2p' ? selectedP1Id : 'main', mode === '2p' ? selectedP2Id : '');
      if (mode === '2p') this.scene.start('PassPlay', { key: def.key, player1Id: selectedP1Id, player2Id: selectedP2Id });
      else this.scene.start(def.scene, { mode });
    });

    root.append(back, hero, statsRow, tabBar, tabPanel, start);
    mountOnStage(this, root);
    this.root = root;
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => { this.root = undefined; });

  }
}
