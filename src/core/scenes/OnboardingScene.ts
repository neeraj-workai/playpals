import Phaser from 'phaser';
import { Profile, AVATARS } from '../profile/Profile';
import { audio } from '../audio/AudioManager';
import { PALETTE, FONT_DISPLAY, FONT_BODY, INK, INK_DIM, INK_LABEL, BLOB_RADIUS, cssGradient } from '../design';
import { ensureSoleActiveScene } from '../ui/NavGuard';

// First-launch registration: name + buddy + colour. Rendered as an HTML
// overlay so the native keyboard + crisp text work on any device. Visual
// design from PlayPals.dc.html (claude.ai/design): pastel pop-in card, blob
// avatar with float animation, Baloo display font.
export class OnboardingScene extends Phaser.Scene {
  private root?: HTMLDivElement;

  constructor() {
    super('Onboarding');
  }

  create(): void {
    ensureSoleActiveScene(this);
    const existing = Profile.get();
    const editing = !!existing;
    const state = {
      name: existing?.name ?? '',
      avatarIdx: existing?.avatarIdx ?? 4,
      colorIdx: existing?.colorIdx ?? 0,
    };

    const root = document.createElement('div');
    root.style.cssText =
      'position:fixed;inset:0;z-index:9000;display:flex;flex-direction:column;align-items:center;' +
      'overflow-y:auto;padding:32px 28px 40px;box-sizing:border-box;font-family:' + FONT_BODY + ';' +
      'background:linear-gradient(175deg,#EDE7FF 0%,#FDEAF4 55%,#E6FBF4 100%);color:' + INK + ';' +
      '-webkit-tap-highlight-color:transparent;text-align:center;';

    // soft floating blobs in the corners — purely decorative
    const blob1 = document.createElement('div');
    blob1.style.cssText = 'position:absolute;top:30px;right:-30px;width:150px;height:150px;border-radius:50%;background:rgba(177,151,252,.26);z-index:0;';
    const blob2 = document.createElement('div');
    blob2.style.cssText = 'position:absolute;top:300px;left:-44px;width:140px;height:140px;border-radius:50%;background:rgba(95,217,168,.22);z-index:0;';

    const content = document.createElement('div');
    content.style.cssText = 'position:relative;z-index:1;width:100%;max-width:340px;animation:pp-pop .35s ease;';

    const small = document.createElement('div');
    small.textContent = editing ? 'Edit your' : 'Welcome to';
    small.style.cssText = 'font-family:' + FONT_DISPLAY + ';font-weight:600;font-size:17px;color:#8C84B0;margin-top:6px;';

    const big = document.createElement('div');
    big.textContent = editing ? 'Player' : 'PlayPals';
    big.style.cssText = 'font-family:' + FONT_DISPLAY + ';font-weight:800;font-size:42px;line-height:1;color:#7E5BEF;letter-spacing:-1px;';

    const tag = document.createElement('div');
    tag.textContent = 'Make your player to start the fun';
    tag.style.cssText = 'font-size:14px;color:' + INK_DIM + ';font-weight:700;margin-top:8px;';

    // blob avatar preview
    const blob = document.createElement('div');
    blob.style.cssText =
      'margin:24px auto 6px;width:124px;height:124px;border-radius:' + BLOB_RADIUS + ';' +
      'display:flex;align-items:center;justify-content:center;font-size:64px;' +
      'box-shadow:0 16px 32px rgba(74,68,102,.18);animation:pp-float 3.2s ease-in-out infinite;';
    const nameLabel = document.createElement('div');
    nameLabel.style.cssText = 'font-family:' + FONT_DISPLAY + ';font-weight:700;font-size:23px;color:' + INK + ';margin-top:8px;';

    const refresh = (): void => {
      blob.textContent = AVATARS[state.avatarIdx];
      blob.style.background = cssGradient(PALETTE[state.colorIdx]);
      nameLabel.textContent = (state.name || 'Player').slice(0, 14);
    };

    const input = document.createElement('input');
    input.type = 'text';
    input.maxLength = 14;
    input.placeholder = 'Type your name';
    input.value = state.name;
    input.style.cssText =
      'margin-top:18px;width:100%;height:56px;border:none;border-radius:22px;background:#fff;' +
      'box-shadow:0 6px 16px rgba(74,68,102,.07);text-align:center;font-family:' + FONT_DISPLAY + ';' +
      'font-weight:700;font-size:18px;color:' + INK + ';outline:none;box-sizing:border-box;padding:0 14px;';
    input.addEventListener('input', () => { state.name = input.value; refresh(); });

    // avatar grid (10)
    const avatarLabel = sectionLabel('PICK A BUDDY');
    const avatarGrid = document.createElement('div');
    avatarGrid.style.cssText = 'display:flex;justify-content:center;gap:10px;flex-wrap:wrap;';
    const avatarBtns: HTMLButtonElement[] = AVATARS.map((e, i) => {
      const b = document.createElement('button');
      b.textContent = e;
      b.style.cursor = 'pointer';
      b.addEventListener('click', () => {
        state.avatarIdx = i;
        styleAvatarBtns();
        refresh();
        audio.click();
      });
      avatarGrid.append(b);
      return b;
    });
    function styleAvatarBtns(): void {
      avatarBtns.forEach((b, i) => {
        const sel = i === state.avatarIdx;
        b.style.cssText =
          'width:50px;height:50px;border-radius:18px;border:none;font-size:26px;cursor:pointer;' +
          'display:flex;align-items:center;justify-content:center;padding:0;transition:transform .12s;' +
          'background:' + (sel ? cssGradient(PALETTE[state.colorIdx]) : '#fff') + ';' +
          'box-shadow:' + (sel ? '0 8px 16px rgba(74,68,102,.2)' : '0 5px 12px rgba(74,68,102,.07)') + ';';
        b.style.transform = sel ? 'scale(1.06)' : 'scale(1)';
      });
    }

    // colour ring (6)
    const colorLabel = sectionLabel('PICK A COLOUR');
    const colorGrid = document.createElement('div');
    colorGrid.style.cssText = 'display:flex;justify-content:center;gap:13px;';
    const colorBtns: HTMLButtonElement[] = PALETTE.map((p, i) => {
      const b = document.createElement('button');
      b.style.cursor = 'pointer';
      b.addEventListener('click', () => {
        state.colorIdx = i;
        styleColorBtns();
        styleAvatarBtns();
        refresh();
        audio.click();
      });
      b.style.background = cssGradient(p);
      colorGrid.append(b);
      return b;
    });
    function styleColorBtns(): void {
      colorBtns.forEach((b, i) => {
        const sel = i === state.colorIdx;
        b.style.cssText =
          'width:42px;height:42px;border-radius:50%;cursor:pointer;padding:0;' +
          'background:' + cssGradient(PALETTE[i]) + ';' +
          'border:4px solid ' + (sel ? 'rgba(74,68,102,.85)' : 'rgba(0,0,0,0)') + ';' +
          'box-shadow:0 5px 12px rgba(74,68,102,.14);';
      });
    }

    const start = document.createElement('button');
    start.textContent = "Let's play ✨";
    start.addEventListener('click', () => {
      audio.click();
      const name = (state.name || '').trim().slice(0, 14) || 'Player';
      Profile.save({ name, avatarIdx: state.avatarIdx, colorIdx: state.colorIdx });
      this.scene.start('Hub');
    });

    const later = document.createElement('button');
    later.textContent = 'Maybe later';
    later.style.cssText =
      'margin-top:16px;background:none;border:none;color:' + INK_DIM + ';font-family:' + FONT_BODY +
      ';font-weight:800;font-size:15px;cursor:pointer;';
    later.addEventListener('click', () => {
      audio.click();
      if (!editing) {
        Profile.save({ name: 'Player', avatarIdx: Phaser.Math.Between(0, AVATARS.length - 1), colorIdx: Phaser.Math.Between(0, PALETTE.length - 1) });
      }
      this.scene.start('Hub');
    });

    const refreshStart = (): void => {
      start.style.cssText =
        'margin-top:30px;width:100%;height:62px;border:none;border-radius:26px;color:#fff;' +
        'font-family:' + FONT_DISPLAY + ';font-weight:800;font-size:21px;cursor:pointer;' +
        'background:' + cssGradient(PALETTE[state.colorIdx]) + ';' +
        'box-shadow:0 12px 24px rgba(74,68,102,.22);transition:transform .12s;';
    };

    function sectionLabel(text: string): HTMLDivElement {
      const d = document.createElement('div');
      d.textContent = text;
      d.style.cssText = 'font-size:13px;color:' + INK_LABEL + ';font-weight:800;margin:24px 0 12px;letter-spacing:1px;';
      return d;
    }

    // initial render
    styleAvatarBtns();
    styleColorBtns();
    refreshStart();
    refresh();

    content.append(small, big, tag, blob, nameLabel, input, avatarLabel, avatarGrid, colorLabel, colorGrid, start, later);
    root.append(blob1, blob2, content);
    document.body.appendChild(root);
    this.root = root;

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => { this.root?.remove(); this.root = undefined; });
  }
}
