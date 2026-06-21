import { Storage } from '../storage/Storage';
import { PALETTE } from '../design';

// LOCAL player profile (no server) — the right "registration" for a casual
// game: instant, offline, personalizes the experience. Upgrade path for cloud
// accounts + sync + leaderboards is a backend (e.g. Firebase Auth).
//
// Stored shape uses indices into AVATARS / PALETTE so it stays in sync with the
// design tokens (an emoji renamed in the design wouldn't break a saved value).
export interface PlayerProfile {
  name: string;
  avatarIdx: number;
  colorIdx: number;
}

const KEY = 'profile';

// 10 avatars (matches the design's onboarding picker).
export const AVATARS = ['😎', '🦊', '🐱', '🐲', '🦄', '🐸', '🐼', '🤖', '🦁', '🐙'];

let cache: PlayerProfile | null | undefined;

function parse(raw: string): PlayerProfile | null {
  try {
    const p = JSON.parse(raw) as Partial<PlayerProfile> & { avatar?: string; color?: number };
    // Migrate legacy shape (avatar string, color hex number) → indices.
    let avatarIdx = typeof p.avatarIdx === 'number' ? p.avatarIdx : 0;
    if (p.avatar && AVATARS.includes(p.avatar)) avatarIdx = AVATARS.indexOf(p.avatar);
    let colorIdx = typeof p.colorIdx === 'number' ? p.colorIdx : 0;
    if (typeof p.color === 'number') {
      const found = PALETTE.findIndex((c) => c.baseHex === p.color);
      if (found >= 0) colorIdx = found;
    }
    return { name: (p.name as string) || 'Player', avatarIdx, colorIdx };
  } catch {
    return null;
  }
}

export const Profile = {
  get(): PlayerProfile | null {
    if (cache !== undefined) return cache;
    const raw = Storage.getString(KEY, '');
    cache = raw ? parse(raw) : null;
    return cache;
  },
  save(p: PlayerProfile): void {
    cache = p;
    Storage.setString(KEY, JSON.stringify(p));
  },
  isRegistered(): boolean {
    return this.get() !== null;
  },
  name(): string {
    return this.get()?.name || 'Player';
  },
  avatar(): string {
    return AVATARS[this.get()?.avatarIdx ?? 0];
  },
  pal() {
    return PALETTE[this.get()?.colorIdx ?? 0];
  },
};
