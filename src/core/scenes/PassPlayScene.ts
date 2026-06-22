import Phaser from 'phaser';
import { GAMES } from '../config';
import { Profile, AVATARS } from '../profile/Profile';
import { FamilyProfiles } from '../profile/FamilyProfiles';
import { PALETTE } from '../design';
import { audio } from '../audio/AudioManager';
import { mountOnStage } from '../ui/Stage';
import { NavBack } from '../ui/NavBack';
import { ensureSoleActiveScene } from '../ui/NavGuard';
import { FONT_DISPLAY, FONT_BODY, INK, INK_DIM, BLOB_RADIUS, cssGradient, P2_RAMP, INK_TERTIARY } from '../design';

// Brief "Pass & Play" interstitial before a 2P game launches. Shows both
// players as blob avatars with a "YOUR TURN" badge on the starting player —
// from the design, this is the moment that frames the social play.
export class PassPlayScene extends Phaser.Scene {
  private root?: HTMLDivElement;
  private gameKey = '';
  private player1Id = 'main';
  private player2Id = '';

  constructor() {
    super('PassPlay');
  }

  init(data: { key?: string; player1Id?: string; player2Id?: string }): void {
    this.gameKey = data?.key ?? GAMES[0].key;
    this.player1Id = data?.player1Id ?? 'main';
    this.player2Id = data?.player2Id ?? '';
  }

  create(): void {
    ensureSoleActiveScene(this);
    const def = GAMES.find((g) => g.key === this.gameKey) ?? GAMES[0];

    // Resolve Player 1 — family member if selected, else main profile
    const p1Member = this.player1Id !== 'main' ? FamilyProfiles.getById(this.player1Id) : undefined;
    const pal = p1Member ? PALETTE[p1Member.colorIdx] : Profile.pal();
    const name = p1Member ? p1Member.name : Profile.name();
    const avatar = p1Member ? AVATARS[p1Member.avatarIdx] : AVATARS[Profile.get()?.avatarIdx ?? 0];

    // Resolve Player 2 info — real family member or anonymous
    const p2Member = this.player2Id ? FamilyProfiles.getById(this.player2Id) : undefined;
    const p2Avatar = p2Member ? AVATARS[p2Member.avatarIdx] : '🐲';
    const p2Name = p2Member ? p2Member.name : 'Player 2';
    const p2Grad = p2Member ? cssGradient(PALETTE[p2Member.colorIdx]) : cssGradient(P2_RAMP);

    const root = document.createElement('div');
    root.style.cssText =
      'position:absolute;inset:0;padding:20px 24px 20px;text-align:center;font-family:' + FONT_BODY +
      ';background:linear-gradient(180deg,#F3EEFF 0%,#FCF1F7 100%);overflow:hidden;' +
      'color:' + INK + ';-webkit-tap-highlight-color:transparent;display:flex;flex-direction:column;';

    const back = document.createElement('button');
    back.innerHTML = '←';
    back.style.cssText =
      'width:46px;height:46px;border-radius:50%;border:none;background:#fff;box-shadow:0 6px 14px rgba(74,68,102,.08);' +
      'font-size:19px;cursor:pointer;color:' + INK + ';float:left;';
    const goBack = (): void => { audio.click(); this.scene.start('GameDetail', { key: def.key }); };
    back.addEventListener('click', goBack);
    NavBack.register(goBack);

    const clear = document.createElement('div');
    clear.style.clear = 'both';

    const title = document.createElement('div');
    title.style.cssText = `font-family:${FONT_DISPLAY};font-weight:800;font-size:28px;color:${INK};margin-top:14px;`;
    title.textContent = 'Pass & Play';
    const tag = document.createElement('div');
    tag.style.cssText = `font-size:15px;color:${INK_DIM};font-weight:800;margin-top:4px;`;
    tag.textContent = 'Share one device — take turns!';

    const row = document.createElement('div');
    row.style.cssText = 'display:flex;align-items:center;justify-content:center;gap:8px;margin-top:30px;';

    const p1Card = playerCard({ avatar, name, sub: 'Player 1', grad: cssGradient(pal), youTurn: true, badgeBg: cssGradient(pal) });
    const vs = document.createElement('div');
    vs.style.cssText = `font-family:${FONT_DISPLAY};font-weight:800;font-size:22px;color:${INK_TERTIARY};`;
    vs.textContent = 'VS';
    const p2Card = playerCard({ avatar: p2Avatar, name: p2Name, sub: 'Pass it over!', grad: p2Grad });
    row.append(p1Card, vs, p2Card);

    // status pill
    const pill = document.createElement('div');
    pill.style.cssText = 'margin-top:28px;display:inline-flex;align-items:center;gap:8px;background:#fff;padding:10px 18px;border-radius:16px;box-shadow:0 6px 14px rgba(80,60,140,.07);align-self:center;';
    pill.innerHTML =
      '<span style="position:relative;width:10px;height:10px">' +
      '<span style="position:absolute;inset:0;border-radius:50%;background:#2FB875;animation:pp-pulse 1.6s ease-out infinite"></span>' +
      '<span style="position:absolute;inset:0;border-radius:50%;background:#2FB875"></span></span>' +
      `<span style="font-weight:800;font-size:13.5px;color:${INK}">${name} goes first!</span>`;
    const pillWrap = document.createElement('div');
    pillWrap.style.cssText = 'text-align:center;';
    pillWrap.append(pill);

    // ready button
    const ready = document.createElement('button');
    ready.textContent = "I'm ready! →";
    ready.style.cssText =
      'margin-top:auto;width:100%;height:62px;border:none;border-radius:26px;color:#fff;' +
      'font-family:' + FONT_DISPLAY + ';font-weight:800;font-size:20px;cursor:pointer;' +
      'background:' + cssGradient(pal) + ';' +
      'box-shadow:0 12px 24px rgba(74,68,102,.22);';
    ready.addEventListener('click', () => { audio.click(); this.scene.start(def.scene, { mode: '2p' }); });

    root.append(back, clear, title, tag, row, pillWrap, ready);
    mountOnStage(this, root);
    this.root = root;
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => { this.root = undefined; });

    function playerCard(o: { avatar: string; name: string; sub: string; grad: string; youTurn?: boolean; badgeBg?: string }): HTMLDivElement {
      const card = document.createElement('div');
      card.style.cssText = 'flex:1;background:#fff;border-radius:26px;padding:22px 10px;box-shadow:0 10px 22px rgba(80,60,140,.08);position:relative;overflow:visible;';
      if (o.youTurn) {
        const badge = document.createElement('div');
        badge.textContent = 'YOUR TURN';
        badge.style.cssText =
          'position:absolute;top:-10px;left:50%;transform:translateX(-50%);' +
          'color:#fff;font-family:' + FONT_DISPLAY + ';font-weight:800;font-size:11px;' +
          'padding:3px 12px;border-radius:10px;white-space:nowrap;background:' + (o.badgeBg ?? '#7E5BEF') + ';';
        card.append(badge);
      }
      const av = document.createElement('div');
      av.style.cssText =
        'width:74px;height:74px;border-radius:' + BLOB_RADIUS + ';' +
        'background:' + o.grad + ';display:flex;align-items:center;justify-content:center;font-size:38px;margin:6px auto 0;';
      av.textContent = o.avatar;
      const nm = document.createElement('div');
      nm.style.cssText = `font-family:${FONT_DISPLAY};font-weight:700;font-size:16px;color:${INK};margin-top:10px;`;
      nm.textContent = o.name;
      const sb = document.createElement('div');
      sb.style.cssText = `font-size:12px;color:${INK_DIM};font-weight:800;`;
      sb.textContent = o.sub;
      card.append(av, nm, sb);
      return card;
    }
  }
}
