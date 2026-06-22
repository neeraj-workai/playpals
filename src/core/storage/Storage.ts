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

// ISO week key (Monday-based), optionally offset by N weeks.
function weekKey(offset = 0): string {
  const d = new Date();
  d.setDate(d.getDate() + offset * 7);
  const day = d.getDay(); // 0=Sun
  d.setDate(d.getDate() + (day === 0 ? -6 : 1 - day)); // rewind to Monday
  const y = d.getFullYear();
  const jan1 = new Date(y, 0, 1);
  const wn = Math.ceil(((d.getTime() - jan1.getTime()) / 86400000 + jan1.getDay() + 1) / 7);
  return `${y}-W${String(wn).padStart(2, '0')}`;
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

  // --- per-player win tracking -------------------------------------------
  getWins(playerId: string): number {
    return getNum(`wins:${playerId}`);
  },
  getGameWins(playerId: string, gameKey: string): number {
    return getNum(`gw:${playerId}:${gameKey}`);
  },
  recordWin(playerId: string, gameKey?: string): void {
    if (!playerId) return;
    setNum(`wins:${playerId}`, this.getWins(playerId) + 1);
    if (gameKey) setNum(`gw:${playerId}:${gameKey}`, this.getGameWins(playerId, gameKey) + 1);
    this.addWeeklyScore(playerId, 10);
  },

  // --- weekly leaderboard -----------------------------------------------
  getWeeklyScore(playerId: string, weekOffset = 0): number {
    return getNum(`w:${weekKey(weekOffset)}:${playerId}`);
  },
  addWeeklyScore(playerId: string, points: number): void {
    const wk = weekKey();
    setNum(`w:${wk}:${playerId}`, getNum(`w:${wk}:${playerId}`) + points);
  },
  currentWeekLabel(): string {
    return weekKey();
  },
  prevWeekLabel(): string {
    return weekKey(-1);
  },
};
