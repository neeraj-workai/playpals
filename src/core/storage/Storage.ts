import { APP_ID } from '../config';

// Generic per-app persistence (localStorage works in the browser AND in the
// Android/iOS WebView). Keys are namespaced per game so the hub can show
// per-game records.

const k = (name: string): string => `${APP_ID}:${name}`;

function getNum(name: string): number {
  return parseInt(localStorage.getItem(k(name)) ?? '0', 10) || 0;
}
function setNum(name: string, value: number): void {
  localStorage.setItem(k(name), String(value));
}

export const Storage = {
  /** Best single-player result for a game (e.g. high score / win streak). */
  getBest(game: string): number {
    return getNum(`best:${game}`);
  },
  setBest(game: string, value: number): void {
    if (value > this.getBest(game)) setNum(`best:${game}`, value);
  },

  getSessions(): number {
    return getNum('sessions');
  },
  bumpSessions(): number {
    const next = this.getSessions() + 1;
    setNum('sessions', next);
    return next;
  },

  getString(name: string, def = ''): string {
    return localStorage.getItem(k(name)) ?? def;
  },
  setString(name: string, value: string): void {
    localStorage.setItem(k(name), value);
  },
  getBool(name: string, def = false): boolean {
    const v = localStorage.getItem(k(name));
    return v === null ? def : v === '1';
  },
  setBool(name: string, value: boolean): void {
    localStorage.setItem(k(name), value ? '1' : '0');
  },
};
