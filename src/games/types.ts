// Shared game contracts.

// Every game supports these two modes. "ai" is the single-player experience
// (you vs the CPU); "2p" is local two-player on the same device.
export type GameMode = 'ai' | '2p';

export type Difficulty = 'easy' | 'medium' | 'hard';

export interface GameLaunch {
  mode: GameMode;
  difficulty?: Difficulty;
}

export const P1_LABEL = 'P1';
export const P2_LABEL = (mode: GameMode): string => (mode === 'ai' ? 'CPU' : 'P2');
