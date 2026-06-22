// ============================================================================
//  PlayPals — one app, many mini-games. 1 Player (vs CPU) or 2 Players (local).
//  Visual design from claude.ai/design (PlayPals.dc.html) — see src/core/design.ts
//  for the tokens. Each game has rich metadata so the Hub / Detail / Result
//  scenes can render them without per-game knowledge.
// ============================================================================

export const GAME_WIDTH = 400;
export const GAME_HEIGHT = 700;

// Device pixel ratio — the canvas's internal pixel buffer is rendered at
// DPR× the logical size and then CSS-scaled down to fit. This is what makes
// text + edges sharp on retina/HiDPI screens. Each scene applies camera zoom
// = DPR (via setupSceneScale) so coordinate maths stays in logical units.
// Capped so a 3-4x phone doesn't quadruple the GPU work for marginal gain.
export const DPR = Math.min(Math.max(typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1, 1), 3);

export const IS_PROD = import.meta.env.PROD;

export const APP_TITLE = 'PlayPals';
export const APP_ID = 'playpals';

// --- AdMob ad units (Google TEST ids in dev; replace for production) --------
export const AD_UNITS = {
  rewarded: IS_PROD
    ? 'ca-app-pub-REPLACE_ME/rewarded'
    : 'ca-app-pub-3940256099942544/5224354917',
  interstitial: IS_PROD
    ? 'ca-app-pub-REPLACE_ME/interstitial'
    : 'ca-app-pub-3940256099942544/1033173712',
};

// --- "Subtle ad" tuning -----------------------------------------------------
// Interstitial counter is incremented at the end of each match. The very
// first 2 matches are always ad-free (graceMatches) so the player gets to
// settle in. After that, an interstitial fires every Nth match, but never
// closer together than `minInterstitialGapMs`.
export const AD_RULES = {
  graceMatches: 1,             // first match: no ad (let them feel the loop first)
  interstitialEveryNMatches: 2, // then every 2nd match — first ad lands on match #3
  minInterstitialGapMs: 60_000,
};

// --- Legacy COLORS (kept for game scenes that don't use design.ts yet) ------
// New scenes should import from src/core/design.ts instead.
export const COLORS = {
  bg: 0xf3eeff,
  bgHex: '#f3eeff',
  panel: 0xffffff,
  panelLight: 0xefeaf6,
  p1: 0x7e5bef,     // primary purple (matches design)
  p2: 0xf0639e,     // pink (player 2 ramp)
  ink: '#4A4466',
  inkDim: '#9A93AE',
};

// Darker arena background for in-game scenes (the bubblegum theme is for
// shells; games need contrast for the puck / paddles / pieces to read).
export const GAME_ARENA_BG = 0x1d1a2e;
export const GAME_ARENA_BG_HEX = '#1d1a2e';

// --- Game registry ----------------------------------------------------------
export interface HowtoStep {
  n: number;
  t: string;
}

export interface GameDef {
  key: string;
  title: string;
  blurb: string;
  scene: string;
  icon: string;          // emoji
  /** Hex tile background gradient — [start, end]. */
  grad: [number, number];
  /** CSS gradient version (for HTML overlays). */
  cssGrad: string;
  /** Soft tint colour for chip backgrounds (CSS hex). */
  tint: string;
  tintHex: number;
  /** Solid accent (the dominant gradient colour). */
  accentHex: number;
  /** Short play time label, e.g. "2 min". */
  time: string;
  /** "Easy" | "Medium" | "Hard". */
  diff: string;
  /** 3 numbered "how to play" steps shown on the Detail screen. */
  howto: HowtoStep[];
}

const g = (a: number, b: number): [number, number] => [a, b];
const cg = (a: string, b: string): string => `linear-gradient(135deg, ${a}, ${b})`;

export const GAMES: GameDef[] = [
  {
    key: 'airhockey', title: 'Air Hockey', blurb: 'Slide & score', scene: 'AirHockey', icon: '🏒',
    grad: g(0x74c0fc, 0x4dabf7), cssGrad: cg('#74C0FC', '#4DABF7'),
    tint: '#E9F4FF', tintHex: 0xe9f4ff, accentHex: 0x4dabf7,
    time: '2 min', diff: 'Easy',
    howto: [
      { n: 1, t: 'Drag your paddle to whack the puck' },
      { n: 2, t: "Knock it into your rival's goal" },
      { n: 3, t: 'First to 7 goals wins the match' },
    ],
  },
  {
    key: 'tictactoe', title: 'Tic-Tac-Toe', blurb: 'Three in a row', scene: 'TicTacToe', icon: '⭕',
    grad: g(0xffc978, 0xff9f1c), cssGrad: cg('#FFC978', '#FF9F1C'),
    tint: '#FFF3DF', tintHex: 0xfff3df, accentHex: 0xff9f1c,
    time: '1 min', diff: 'Easy',
    howto: [
      { n: 1, t: 'Take turns tapping an empty square' },
      { n: 2, t: 'Line up three of your own marks' },
      { n: 3, t: 'Row, column or diagonal — you win!' },
    ],
  },
  {
    key: 'connect4', title: 'Connect Four', blurb: 'Line up four', scene: 'Connect4', icon: '🔴',
    grad: g(0xff9d9d, 0xff6b6b), cssGrad: cg('#FF9D9D', '#FF6B6B'),
    tint: '#FFEAEA', tintHex: 0xffeaea, accentHex: 0xff6b6b,
    time: '3 min', diff: 'Medium',
    howto: [
      { n: 1, t: 'Drop a coin into any column' },
      { n: 2, t: 'Stack four of yours in a row' },
      { n: 3, t: 'Block your rival to defend' },
    ],
  },
  {
    key: 'sumo', title: 'Sumo Smash', blurb: 'Push them out', scene: 'Sumo', icon: '🥋',
    grad: g(0xc5b3ff, 0x9775fa), cssGrad: cg('#C5B3FF', '#9775FA'),
    tint: '#F1ECFF', tintHex: 0xf1ecff, accentHex: 0x9775fa,
    time: '1 min', diff: 'Easy',
    howto: [
      { n: 1, t: 'Mash your button to charge up' },
      { n: 2, t: 'Shove your rival off the ring' },
      { n: 3, t: 'Last one standing wins' },
    ],
  },
  {
    key: 'quickdraw', title: 'Quick Draw', blurb: 'Tap on green', scene: 'QuickDraw', icon: '⚡',
    grad: g(0x7fe6b5, 0x2fb875), cssGrad: cg('#7FE6B5', '#2FB875'),
    tint: '#E6F8EF', tintHex: 0xe6f8ef, accentHex: 0x2fb875,
    time: '30 sec', diff: 'Easy',
    howto: [
      { n: 1, t: 'Wait for the light to turn green' },
      { n: 2, t: 'Then tap as fast as you can' },
      { n: 3, t: 'Fastest finger wins — no peeking!' },
    ],
  },
  {
    key: 'memory', title: 'Memory Match', blurb: 'Find the pairs', scene: 'Memory', icon: '🧠',
    grad: g(0xffb6cf, 0xff8fb1), cssGrad: cg('#FFB6CF', '#FF8FB1'),
    tint: '#FFEBF2', tintHex: 0xffebf2, accentHex: 0xff8fb1,
    time: '2 min', diff: 'Medium',
    howto: [
      { n: 1, t: 'Tap two cards to flip them' },
      { n: 2, t: 'Match the pair — go again' },
      { n: 3, t: 'Most pairs at the end wins' },
    ],
  },
  {
    key: 'whack', title: 'Whack-a-Mole', blurb: 'Bonk fastest', scene: 'Whack', icon: '🔨',
    grad: g(0xfca5f1, 0xe879f9), cssGrad: cg('#FCA5F1', '#E879F9'),
    tint: '#FBEAFE', tintHex: 0xfbeafe, accentHex: 0xe879f9,
    time: '20 sec', diff: 'Easy',
    howto: [
      { n: 1, t: 'Watch your side of the screen' },
      { n: 2, t: 'Bonk the mole the instant it pops' },
      { n: 3, t: 'Most whacks in 20 seconds wins' },
    ],
  },
  {
    key: 'dots', title: 'Dots & Boxes', blurb: 'Claim the grid', scene: 'DotsBoxes', icon: '📦',
    grad: g(0x92a8ff, 0x5c7cfa), cssGrad: cg('#92A8FF', '#5C7CFA'),
    tint: '#EAEEFF', tintHex: 0xeaeeff, accentHex: 0x5c7cfa,
    time: '3 min', diff: 'Medium',
    howto: [
      { n: 1, t: 'Tap a line to connect two dots' },
      { n: 2, t: 'Close a box and claim it (+ extra turn)' },
      { n: 3, t: 'Most boxes when the grid is full wins' },
    ],
  },
  {
    key: 'tank', title: 'Tank Duel', blurb: 'Aim and dodge', scene: 'Tank', icon: '💥',
    grad: g(0xfdba74, 0xfb923c), cssGrad: cg('#FDBA74', '#FB923C'),
    tint: '#FFEFE0', tintHex: 0xffefe0, accentHex: 0xfb923c,
    time: '2 min', diff: 'Medium',
    howto: [
      { n: 1, t: 'Drag your tank left and right' },
      { n: 2, t: 'Your tank auto-fires — line up shots' },
      { n: 3, t: 'First to 5 hits wins the duel' },
    ],
  },
  {
    key: 'tug', title: 'Tug of War', blurb: 'Out-tap them', scene: 'TugOfWar', icon: '🪢',
    grad: g(0xfb7185, 0xf43f5e), cssGrad: cg('#FB7185', '#F43F5E'),
    tint: '#FFE4E9', tintHex: 0xffe4e9, accentHex: 0xf43f5e,
    time: '1 min', diff: 'Easy',
    howto: [
      { n: 1, t: 'Tap your side as fast as you can' },
      { n: 2, t: 'Pull the knot past your line' },
      { n: 3, t: 'First to 3 pulls wins the match' },
    ],
  },
  {
    key: 'potato', title: 'Hot Potato', blurb: "Don't get caught", scene: 'HotPotato', icon: '🧨',
    grad: g(0xfde047, 0xfacc15), cssGrad: cg('#FDE047', '#FACC15'),
    tint: '#FFF7D1', tintHex: 0xfff7d1, accentHex: 0xfacc15,
    time: '1 min', diff: 'Easy',
    howto: [
      { n: 1, t: 'The bomb has a hidden fuse' },
      { n: 2, t: 'Whack it back the moment it lands' },
      { n: 3, t: "Holder when it blows — you lose" },
    ],
  },
  {
    key: 'taprace', title: 'Tap Race', blurb: 'First to fifty', scene: 'TapRace', icon: '👆',
    grad: g(0xffc078, 0xff922b), cssGrad: cg('#FFC078', '#FF922B'),
    tint: '#FFEEDD', tintHex: 0xffeedd, accentHex: 0xff922b,
    time: '20 sec', diff: 'Easy',
    howto: [
      { n: 1, t: 'Tap your big button as fast as you can' },
      { n: 2, t: 'Fill your bar all the way up' },
      { n: 3, t: 'First to 50 taps wins the race' },
    ],
  },
  {
    key: 'cointoss', title: 'Coin Toss', blurb: 'Call it right', scene: 'CoinToss', icon: '🪙',
    grad: g(0xffd96b, 0xf0b400), cssGrad: cg('#FFD96B', '#F0B400'),
    tint: '#FFF6D9', tintHex: 0xfff6d9, accentHex: 0xf0b400,
    time: '1 min', diff: 'Easy',
    howto: [
      { n: 1, t: 'Pick heads or tails on your turn' },
      { n: 2, t: 'Right call = +1, wrong = pass' },
      { n: 3, t: 'First to 5 correct calls wins' },
    ],
  },
  {
    key: 'emojiquiz', title: 'Emoji Quiz', blurb: 'Match the sequence', scene: 'EmojiQuiz', icon: '🤩',
    grad: g(0xffa8e0, 0xff5fba), cssGrad: cg('#FFA8E0', '#FF5FBA'),
    tint: '#FFEAF7', tintHex: 0xffeaf7, accentHex: 0xff5fba,
    time: '2 min', diff: 'Easy',
    howto: [
      { n: 1, t: 'Watch the 3-emoji sequence carefully' },
      { n: 2, t: 'Find it from 4 choices in your zone' },
      { n: 3, t: 'First to 3 correct rounds wins' },
    ],
  },
  {
    key: 'countdown', title: 'Countdown Duel', blurb: 'Race to zero', scene: 'Countdown', icon: '⏳',
    grad: g(0xa78bfa, 0x7c3aed), cssGrad: cg('#A78BFA', '#7C3AED'),
    tint: '#EDE9FE', tintHex: 0xede9fe, accentHex: 0x7c3aed,
    time: '30 sec', diff: 'Easy',
    howto: [
      { n: 1, t: 'Your counter starts at 30' },
      { n: 2, t: 'Tap your side to count it down' },
      { n: 3, t: 'First to reach zero wins the round' },
    ],
  },
  {
    key: 'wordscramble', title: 'Word Scramble', blurb: 'Unscramble fastest', scene: 'WordScramble', icon: '🔤',
    grad: g(0x6ee7b7, 0x059669), cssGrad: cg('#6EE7B7', '#059669'),
    tint: '#D1FAE5', tintHex: 0xd1fae5, accentHex: 0x059669,
    time: '3 min', diff: 'Medium',
    howto: [
      { n: 1, t: 'A scrambled 4-letter word appears' },
      { n: 2, t: 'Tap the letters in the right order' },
      { n: 3, t: 'Unscramble it first to win the round' },
    ],
  },
  {
    key: 'gravitypong', title: 'Gravity Pong', blurb: 'Pong with a twist', scene: 'GravityPong', icon: '🏓',
    grad: g(0x67e8f9, 0x0891b2), cssGrad: cg('#67E8F9', '#0891B2'),
    tint: '#CFFAFE', tintHex: 0xcffafe, accentHex: 0x0891b2,
    time: '3 min', diff: 'Medium',
    howto: [
      { n: 1, t: 'Drag your paddle to hit the ball' },
      { n: 2, t: 'Gravity flips direction every 5 seconds' },
      { n: 3, t: 'First to 7 points wins' },
    ],
  },
  {
    key: 'flipgrid', title: 'Flip the Grid', blurb: 'Flip to your colour', scene: 'FlipGrid', icon: '🟦',
    grad: g(0x86efac, 0x16a34a), cssGrad: cg('#86EFAC', '#16A34A'),
    tint: '#DCFCE7', tintHex: 0xdcfce7, accentHex: 0x16a34a,
    time: '3 min', diff: 'Medium',
    howto: [
      { n: 1, t: 'Take turns tapping any empty tile' },
      { n: 2, t: 'Adjacent enemy tiles flip to your colour' },
      { n: 3, t: 'Most tiles when the grid fills wins' },
    ],
  },
];

// Used by the Hub: first 6 are "featured" (always visible); rest are revealed
// by the "more games" toggle.
export const FEATURED_COUNT = 6;
