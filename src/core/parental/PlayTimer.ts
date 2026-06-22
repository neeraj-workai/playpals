import { Storage } from '../storage/Storage';

// Tracks wall-clock time the app is open today against a daily limit.
// Session starts in BootScene; GameDetailScene checks before launching a game.

let _sessionStart = 0;

function todayKey(): string {
  return new Date().toDateString();
}

function ensureDay(): void {
  if (Storage.getString('play:date') !== todayKey()) {
    Storage.setString('play:date', todayKey());
    Storage.setString('play:ms', '0');
    Storage.setString('play:bonusMs', '0');
  }
}

export const PlayTimer = {
  startSession(): void {
    ensureDay();
    _sessionStart = Date.now();
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) PlayTimer.flush();
    });
  },

  flush(): void {
    if (!_sessionStart) return;
    ensureDay();
    const stored = parseInt(Storage.getString('play:ms', '0'), 10) || 0;
    Storage.setString('play:ms', String(stored + Date.now() - _sessionStart));
    _sessionStart = Date.now();
  },

  totalMs(): number {
    ensureDay();
    const stored = parseInt(Storage.getString('play:ms', '0'), 10) || 0;
    return stored + (_sessionStart ? Date.now() - _sessionStart : 0);
  },

  limitMs(): number {
    const mins = parseInt(Storage.getString('settings:dailyMinutes', '0'), 10) || 0;
    return mins * 60 * 1000;
  },

  bonusMs(): number {
    ensureDay();
    return parseInt(Storage.getString('play:bonusMs', '0'), 10) || 0;
  },

  isExceeded(): boolean {
    const limit = this.limitMs();
    return limit > 0 && this.totalMs() >= limit + this.bonusMs();
  },

  addBonus(ms: number): void {
    ensureDay();
    const prev = this.bonusMs();
    Storage.setString('play:bonusMs', String(prev + ms));
  },
};
