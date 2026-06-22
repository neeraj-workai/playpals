import Phaser from 'phaser';
import { Profile, AVATARS } from '../profile/Profile';
import { audio } from '../audio/AudioManager';
import { mountOnStage } from './Stage';
import { NavBack } from './NavBack';
import { FONT_BODY, INK, hex2css } from '../design';

export type NavKey = 'home' | 'leaderboard' | 'profile' | 'settings';

const NAV: { key: NavKey; icon: string; label: string; scene: string }[] = [
  { key: 'home', icon: '🏠', label: 'Play', scene: 'Hub' },
  { key: 'leaderboard', icon: '🏆', label: 'Ranks', scene: 'Leaderboard' },
  { key: 'profile', icon: '', label: 'Me', scene: 'Profile' }, // icon = current avatar
  { key: 'settings', icon: '⚙️', label: 'Settings', scene: 'Settings' },
];

export interface Shell {
  root: HTMLDivElement;
  content: HTMLDivElement; // scrollable area the scene fills
}

// The shared "app shell" for every menu/tab screen (Hub, Profile, Leaderboard,
// Settings). Rendered as real HTML so text is crisp at any pixel density and
// uses the Baloo/Nunito fonts — the canvas is only used for actual gameplay.
//
// Layout: a full-screen pastel column with a scrollable content area on top
// and a fixed bottom navigation bar (safe-area aware for notched phones).
export function createShell(scene: Phaser.Scene, active: NavKey): Shell {
  const pal = Profile.pal();
  const accent = hex2css(pal.baseHex);

  const root = document.createElement('div');
  root.style.cssText =
    'position:absolute;inset:0;display:flex;flex-direction:column;' +
    'background:linear-gradient(180deg,#F3EEFF 0%,#FCF1F7 100%);' +
    'font-family:' + FONT_BODY + ';color:' + INK + ';-webkit-tap-highlight-color:transparent;';

  // No scrolling: the content area is a fixed flex region between the top and
  // the bottom nav. Each screen is laid out to fit this height exactly.
  const content = document.createElement('div');
  content.style.cssText =
    'flex:1;min-height:0;overflow:hidden;display:flex;flex-direction:column;' +
    'padding:18px 20px 8px;';

  const nav = document.createElement('div');
  nav.style.cssText =
    'flex:none;display:flex;background:#fff;padding:8px 8px 12px;' +
    'box-shadow:0 -4px 18px rgba(80,60,140,.06);';

  NAV.forEach((item) => {
    const isActive = item.key === active;
    const icon = item.key === 'profile' ? AVATARS[Profile.get()?.avatarIdx ?? 0] : item.icon;
    const btn = document.createElement('button');
    btn.style.cssText =
      'flex:1;background:none;border:none;cursor:pointer;display:flex;flex-direction:column;' +
      'align-items:center;gap:3px;padding:0;';
    btn.innerHTML =
      `<span style="font-size:22px;width:46px;height:30px;display:flex;align-items:center;` +
      `justify-content:center;border-radius:12px;background:${isActive ? accent + '22' : 'transparent'}">${icon}</span>` +
      `<span style="font-size:11px;font-weight:800;color:${isActive ? accent : '#B0A8C2'}">${item.label}</span>`;
    btn.addEventListener('click', () => {
      if (isActive) return;
      audio.click();
      scene.scene.start(item.scene);
    });
    nav.append(btn);
  });

  root.append(content, nav);
  mountOnStage(scene, root);
  // Shell scenes (Hub, Profile, Leaderboard, Settings) all go back to Hub.
  NavBack.register(() => scene.scene.start('Hub'));
  return { root, content };
}

// A centred page heading used by the non-Hub tabs.
export function shellTitle(text: string, sub?: string): HTMLDivElement {
  const wrap = document.createElement('div');
  wrap.style.cssText = 'text-align:center;margin-bottom:14px;';
  const h = document.createElement('div');
  h.style.cssText = 'font-family:"Baloo 2",cursive;font-weight:800;font-size:24px;color:' + INK + ';';
  h.textContent = text;
  wrap.append(h);
  if (sub) {
    const s = document.createElement('div');
    s.style.cssText = 'font-family:' + FONT_BODY + ';font-weight:800;font-size:13px;color:#9A93AE;margin-top:2px;';
    s.textContent = sub;
    wrap.append(s);
  }
  return wrap;
}
