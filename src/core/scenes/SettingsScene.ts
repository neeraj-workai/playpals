import Phaser from 'phaser';
import { Storage } from '../storage/Storage';
import { audio } from '../audio/AudioManager';
import { Profile } from '../profile/Profile';
import { ensureSoleActiveScene } from '../ui/NavGuard';
import { createShell, shellTitle } from '../ui/Shell';
import { FONT_DISPLAY, INK, INK_DIM, INK_TERTIARY, INK_LABEL, hex2css, TRACK } from '../design';

interface Toggle {
  key: string;
  icon: string;
  label: string;
  desc: string;
}
const SOUND_TOGGLES: Toggle[] = [
  { key: 'sound', icon: '🔊', label: 'Sound', desc: 'Game sounds' },
  { key: 'music', icon: '🎵', label: 'Music', desc: 'Background tunes' },
  { key: 'sfx', icon: '✨', label: 'Sound effects', desc: 'Taps & wins' },
];
const SOUND_DEFAULTS: Record<string, boolean> = { sound: true, music: true, sfx: true };

// "Settings" tab — sound toggles + parental controls + version.
export class SettingsScene extends Phaser.Scene {
  constructor() {
    super('Settings');
  }

  create(): void {
    ensureSoleActiveScene(this);
    const { content } = createShell(this, 'settings');
    const accent = hex2css(Profile.pal().baseHex);

    content.append(shellTitle('⚙️ Settings'));

    // ----- SOUND
    content.append(label('SOUND'));
    const sg = group();
    SOUND_TOGGLES.forEach((t) => {
      const on = Storage.getBool('settings:' + t.key, SOUND_DEFAULTS[t.key]);
      sg.append(togglePill(t.icon, t.label, t.desc, on, accent, (next) => {
        Storage.setBool('settings:' + t.key, next);
        if (t.key === 'sound') {
          Storage.setBool('muted', !next);
          audio.setMuted(!next);
        }
      }));
    });
    content.append(sg);

    // ----- PARENTAL
    content.append(label('PARENTAL CONTROLS', 22));
    const pg = group();
    const playRow = document.createElement('div');
    playRow.style.cssText = rowCss();
    playRow.innerHTML =
      `<span style="font-size:24px">⏰</span>` +
      `<span style="flex:1"><span style="display:block;font-family:${FONT_DISPLAY};font-weight:700;font-size:16px;color:${INK}">Daily play time</span>` +
      `<span style="font-size:12.5px;color:${INK_DIM};font-weight:800">Limit screen time</span></span>` +
      `<span style="background:#F3EEFF;border-radius:12px;padding:6px 14px;font-family:${FONT_DISPLAY};font-weight:800;font-size:14px;color:${accent}">1 hr</span>`;
    pg.append(playRow);

    const lockOn = Storage.getBool('settings:lock', false);
    pg.append(togglePill('🔒', 'Grown-up lock', 'PIN to leave the app', lockOn, accent, (next) => {
      Storage.setBool('settings:lock', next);
    }));
    content.append(pg);

    const ver = document.createElement('div');
    ver.style.cssText = `text-align:center;font-size:12px;color:${INK_TERTIARY};font-weight:800;margin-top:24px`;
    ver.textContent = 'PlayPals v1.0';
    content.append(ver);

    function label(text: string, topMargin = 0): HTMLDivElement {
      const d = document.createElement('div');
      d.textContent = text;
      d.style.cssText = `font-size:12px;color:${INK_LABEL};font-weight:800;letter-spacing:1px;margin:${topMargin}px 0 10px`;
      return d;
    }
    function group(): HTMLDivElement {
      const d = document.createElement('div');
      d.style.cssText = 'display:flex;flex-direction:column;gap:10px;';
      return d;
    }
    function rowCss(): string {
      return 'display:flex;align-items:center;gap:13px;background:#fff;border-radius:22px;padding:14px 16px;box-shadow:0 6px 14px rgba(80,60,140,.05);text-align:left;border:none;';
    }
    function togglePill(icon: string, lbl: string, desc: string, initial: boolean, accentColor: string, onChange: (v: boolean) => void): HTMLButtonElement {
      let on = initial;
      const btn = document.createElement('button');
      btn.style.cssText = rowCss() + 'cursor:pointer;width:100%;';
      const knobX = (v: boolean): string => (v ? 'translateX(20px)' : 'translateX(0)');
      const trackColor = (v: boolean): string => (v ? accentColor : TRACK);
      btn.innerHTML =
        `<span style="font-size:24px">${icon}</span>` +
        `<span style="flex:1"><span style="display:block;font-family:${FONT_DISPLAY};font-weight:700;font-size:16px;color:${INK}">${lbl}</span>` +
        `<span style="font-size:12.5px;color:${INK_DIM};font-weight:800">${desc}</span></span>` +
        `<span data-track style="flex:none;width:50px;height:30px;border-radius:16px;background:${trackColor(on)};position:relative;transition:background .2s">` +
        `<span data-knob style="position:absolute;top:3px;left:3px;width:24px;height:24px;border-radius:50%;background:#fff;box-shadow:0 2px 5px rgba(0,0,0,.25);transform:${knobX(on)};transition:transform .2s"></span></span>`;
      btn.addEventListener('click', () => {
        on = !on;
        (btn.querySelector('[data-track]') as HTMLElement).style.background = trackColor(on);
        (btn.querySelector('[data-knob]') as HTMLElement).style.transform = knobX(on);
        audio.click();
        onChange(on);
      });
      return btn;
    }
  }
}
