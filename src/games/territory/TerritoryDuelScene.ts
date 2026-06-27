import Phaser from 'phaser';
import { GAME_WIDTH, COLORS } from '../../core/config';
import { spawnConfetti, pulseTween, STATUS_STYLE } from '../../core/ui/FxUtils';
import { Ads } from '../../core/ads/AdManager';
import { audio } from '../../core/audio/AudioManager';
import { addBackButton } from '../../core/ui/Hud';
import { showResult } from '../../core/ui/ResultOverlay';
import { GameMode, Difficulty } from '../types';
import { ensureSoleActiveScene } from '../../core/ui/NavGuard';
import { setupSceneScale } from '../../core/scale';

// ---- board geometry --------------------------------------------------------
const COLS = 20;
const ROWS = 26;
const CELL = 17;
const X0 = (GAME_WIDTH - COLS * CELL) / 2; // 30
const Y0 = 150;
const BOARD_TOP = Y0;
const BOARD_BOTTOM = Y0 + ROWS * CELL; // 592
const TOTAL = ROWS * COLS;

const STEP_MS = 95;
const MATCH_TIME = 75; // seconds
const REVIVE_MS = 1100;

// up, right, down, left
const DIRS = [
  [-1, 0], [0, 1], [1, 0], [0, -1],
];

const key = (r: number, c: number): number => r * COLS + c;

interface Player {
  id: 1 | 2;
  isAI: boolean;
  color: number;
  r: number;
  c: number;
  dir: number;
  pending: number;
  alive: boolean;
  trail: { r: number; c: number }[];
  trailSet: Set<number>;
  trailRects: Phaser.GameObjects.Rectangle[];
  head: Phaser.GameObjects.Rectangle;
  homeR: number;
  homeC: number;
  cenR: number; // territory centroid (AI navigation)
  cenC: number;
  desiredLen: number; // AI bite length cap
  // AI bite state machine: home -> out -> across -> back -> (capture) -> home
  phase: 'home' | 'out' | 'across' | 'back';
  biteSteps: number;
  biteLen: number;
  turnCCW: boolean;
}

export class TerritoryDuelScene extends Phaser.Scene {
  private mode: GameMode = 'ai';
  private difficulty: Difficulty = 'medium';
  private owner: number[][] = [];
  private players: Player[] = [];
  private territoryGfx!: Phaser.GameObjects.Graphics;
  private barGfx!: Phaser.GameObjects.Graphics;
  private p1Text!: Phaser.GameObjects.Text;
  private p2Text!: Phaser.GameObjects.Text;
  private timeText!: Phaser.GameObjects.Text;
  private status!: Phaser.GameObjects.Text;
  private tick?: Phaser.Time.TimerEvent;
  private clock?: Phaser.Time.TimerEvent;
  private timeLeft = MATCH_TIME;
  private locked = true;
  private over = false;

  constructor() {
    super('Territory');
  }

  init(data: { mode?: GameMode; difficulty?: Difficulty }): void {
    this.mode = data?.mode ?? 'ai';
    this.difficulty = data?.difficulty ?? 'medium';
  }

  create(): void {
    ensureSoleActiveScene(this);
    setupSceneScale(this);
    this.over = false;
    this.locked = true;
    this.timeLeft = MATCH_TIME;
    this.cameras.main.setBackgroundColor(0x141022);

    // board frame + faint grid
    this.add
      .rectangle(GAME_WIDTH / 2, (BOARD_TOP + BOARD_BOTTOM) / 2, COLS * CELL + 8, ROWS * CELL + 8, 0x1d1a2e, 1)
      .setStrokeStyle(2, 0x3a3358, 1);
    const grid = this.add.graphics().setDepth(0);
    grid.lineStyle(1, 0x2a2542, 0.7);
    for (let c = 0; c <= COLS; c++) grid.lineBetween(X0 + c * CELL, Y0, X0 + c * CELL, BOARD_BOTTOM);
    for (let r = 0; r <= ROWS; r++) grid.lineBetween(X0, Y0 + r * CELL, X0 + COLS * CELL, Y0 + r * CELL);

    this.territoryGfx = this.add.graphics().setDepth(1);
    this.barGfx = this.add.graphics().setDepth(3);

    // HUD
    addBackButton(this, () => this.toHub(false));
    this.p2Text = this.add.text(60, 38, '0%', { fontFamily: 'Arial Black, Arial', fontSize: '22px', color: '#' + COLORS.p2.toString(16) }).setOrigin(0.5);
    this.p1Text = this.add.text(340, 38, '0%', { fontFamily: 'Arial Black, Arial', fontSize: '22px', color: '#' + COLORS.p1.toString(16) }).setOrigin(0.5);
    this.add.text(60, 58, this.mode === 'ai' ? 'CPU' : 'P2', { fontFamily: 'Arial', fontSize: '11px', color: COLORS.inkDim }).setOrigin(0.5);
    this.add.text(340, 58, 'P1', { fontFamily: 'Arial', fontSize: '11px', color: COLORS.inkDim }).setOrigin(0.5);
    this.timeText = this.add.text(GAME_WIDTH / 2, 44, '1:15', { fontFamily: 'Arial Black, Arial', fontSize: '26px', color: '#ffffff' }).setOrigin(0.5);

    // control hints
    this.add.text(GAME_WIDTH / 2, BOARD_BOTTOM + 50, '◀ tap left      tap right ▶', { fontFamily: 'Arial Black, Arial', fontSize: '15px', color: '#ffffff' }).setOrigin(0.5).setAlpha(0.65);
    if (this.mode === '2p') {
      this.add.text(GAME_WIDTH / 2, BOARD_TOP - 64, 'P2: ◀ tap left   tap right ▶', { fontFamily: 'Arial', fontSize: '12px', color: COLORS.inkDim }).setOrigin(0.5).setAlpha(0.8);
    }

    this.status = this.add.text(GAME_WIDTH / 2, (BOARD_TOP + BOARD_BOTTOM) / 2, '', { ...STATUS_STYLE, fontSize: '34px', align: 'center' }).setOrigin(0.5).setDepth(20);

    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      if (this.over || this.locked) return;
      if (p.worldY > BOARD_BOTTOM) {
        this.steer(this.players[0], p.worldX < GAME_WIDTH / 2);
      } else if (this.mode === '2p' && p.worldY < BOARD_TOP - 6 && p.worldY > 70) {
        this.steer(this.players[1], p.worldX < GAME_WIDTH / 2);
      }
    });

    this.setupMatch();
  }

  // -- geometry helpers ------------------------------------------------------
  private gx(c: number): number {
    return X0 + c * CELL + CELL / 2;
  }
  private gy(r: number): number {
    return Y0 + r * CELL + CELL / 2;
  }
  private inBounds(r: number, c: number): boolean {
    return r >= 0 && r < ROWS && c >= 0 && c < COLS;
  }

  // -- match setup -----------------------------------------------------------
  private setupMatch(): void {
    this.owner = Array.from({ length: ROWS }, () => new Array(COLS).fill(0));

    const cc = Math.floor(COLS / 2);
    const p1 = this.makePlayer(1, false, COLORS.p1, ROWS - 4, cc, 23, cc - 1, 0);
    const p2 = this.makePlayer(2, this.mode === 'ai', COLORS.p2, 3, cc, 2, cc, 2);
    this.players = [p1, p2];

    // grant 4x4 home blocks
    this.fillHome(p1, ROWS - 5, ROWS - 2, cc - 2, cc + 1);
    this.fillHome(p2, 1, 4, cc - 2, cc + 1);

    this.redrawTerritory();
    this.updateHud();

    this.status.setText('GO!');
    this.tweens.add({ targets: this.status, scale: { from: 0.6, to: 1 }, duration: 300, ease: 'Back.out' });
    this.time.delayedCall(800, () => {
      if (this.over) return;
      this.status.setText('');
      this.locked = false;
      this.tick = this.time.addEvent({ delay: STEP_MS, loop: true, callback: () => this.step() });
      this.clock = this.time.addEvent({ delay: 1000, loop: true, callback: () => this.tickClock() });
    });
  }

  private makePlayer(id: 1 | 2, isAI: boolean, color: number, r: number, c: number, homeR: number, homeC: number, dir: number): Player {
    const head = this.add.rectangle(this.gx(c), this.gy(r), CELL + 2, CELL + 2, color, 1).setStrokeStyle(2, 0xffffff, 0.95).setDepth(6);
    const dl = this.difficulty === 'easy' ? 4 : this.difficulty === 'hard' ? 8 : 6;
    return {
      id, isAI, color, r, c, dir, pending: dir, alive: true,
      trail: [], trailSet: new Set(), trailRects: [], head,
      homeR, homeC, cenR: r, cenC: c, desiredLen: dl,
      phase: 'home', biteSteps: 0, biteLen: 0, turnCCW: false,
    };
  }

  private fillHome(p: Player, r0: number, r1: number, c0: number, c1: number): void {
    for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) this.owner[r][c] = p.id;
    p.cenR = (r0 + r1) / 2;
    p.cenC = (c0 + c1) / 2;
  }

  // -- input -----------------------------------------------------------------
  private steer(p: Player, ccw: boolean): void {
    if (!p.alive) return;
    p.pending = ccw ? (p.dir + 3) % 4 : (p.dir + 1) % 4;
    audio.click();
  }

  // -- main step -------------------------------------------------------------
  private step(): void {
    if (this.over || this.locked) return;

    for (const p of this.players) {
      if (!p.alive) continue;
      if (p.isAI) this.aiThink(p);
      p.dir = p.pending;
    }

    const next = this.players.map((p) => (p.alive ? { r: p.r + DIRS[p.dir][0], c: p.c + DIRS[p.dir][1] } : null));
    const dead = new Set<Player>();

    // walls + trail cuts
    this.players.forEach((p, i) => {
      const n = next[i];
      if (!p.alive || !n) return;
      if (!this.inBounds(n.r, n.c)) { dead.add(p); return; }
      const k = key(n.r, n.c);
      if (p.trailSet.has(k)) dead.add(p); // ran into own trail
      for (const o of this.players) {
        if (o !== p && o.alive && o.trailSet.has(k)) dead.add(o); // cut rival's trail
      }
    });

    // head-to-head: same target cell or swapping places
    const [a, b] = this.players;
    if (a.alive && b.alive && next[0] && next[1]) {
      const sameTarget = next[0]!.r === next[1]!.r && next[0]!.c === next[1]!.c;
      const swap = next[0]!.r === b.r && next[0]!.c === b.c && next[1]!.r === a.r && next[1]!.c === a.c;
      if (sameTarget || swap) { dead.add(a); dead.add(b); }
    }

    // advance survivors
    this.players.forEach((p, i) => {
      if (!p.alive || dead.has(p)) return;
      const n = next[i]!;
      this.advance(p, n.r, n.c);
    });

    // resolve deaths
    for (const p of dead) this.kill(p);

    if (this.over) return;
    // a fresh kill can leave the board lopsided; keep heads on top visually
    for (const p of this.players) p.head.setDepth(6);
  }

  private advance(p: Player, nr: number, nc: number): void {
    p.r = nr;
    p.c = nc;
    this.tweens.killTweensOf(p.head);
    this.tweens.add({ targets: p.head, x: this.gx(nc), y: this.gy(nr), duration: STEP_MS, ease: 'Linear' });

    if (this.owner[nr][nc] === p.id) {
      if (p.trail.length > 0) this.capture(p);
    } else {
      // outside own land -> extend trail
      p.trail.push({ r: nr, c: nc });
      p.trailSet.add(key(nr, nc));
      const rect = this.add.rectangle(this.gx(nc), this.gy(nr), CELL - 3, CELL - 3, p.color, 0.55).setDepth(2);
      this.tweens.add({ targets: rect, scale: { from: 0.3, to: 1 }, duration: 90, ease: 'Back.out' });
      p.trailRects.push(rect);
    }
  }

  // -- capture (claim enclosed area) ----------------------------------------
  private capture(p: Player): void {
    let sr = 0;
    let sc = 0;
    for (const t of p.trail) { this.owner[t.r][t.c] = p.id; sr += t.r; sc += t.c; }
    const claimed = floodCapture(this.owner, p.id);
    sr += claimed.reduce((s, k) => s + Math.floor(k / COLS), 0);
    sc += claimed.reduce((s, k) => s + (k % COLS), 0);
    const n = p.trail.length + claimed.length;

    this.clearTrail(p);
    if (p.isAI) { p.phase = 'home'; p.biteSteps = 0; }
    this.recomputeCentroid(p);
    this.redrawTerritory();
    this.updateHud();
    audio.goal();

    if (n > 0) {
      spawnConfetti(this, this.gx(Math.round(sc / n)), this.gy(Math.round(sr / n)), 10);
    }

    // eliminating the rival's whole board ends the match early
    const loser = this.players.find((q) => q !== p && this.count(q.id) === 0);
    if (loser) this.endMatch();
  }

  private clearTrail(p: Player): void {
    p.trailRects.forEach((t) => t.destroy());
    p.trailRects = [];
    p.trail = [];
    p.trailSet.clear();
  }

  // -- death + revive --------------------------------------------------------
  private kill(p: Player): void {
    p.alive = false;
    this.tweens.killTweensOf(p.head);
    this.clearTrail(p);
    p.head.setVisible(false);
    this.cameras.main.shake(140, 0.009);
    audio.bump();

    // burst
    for (let i = 0; i < 10; i++) {
      const frag = this.add.rectangle(p.head.x, p.head.y, 6, 6, p.color, 1).setDepth(15);
      this.tweens.add({
        targets: frag,
        x: p.head.x + Phaser.Math.Between(-50, 50),
        y: p.head.y + Phaser.Math.Between(-50, 50),
        alpha: 0, duration: 420, ease: 'Power2', onComplete: () => frag.destroy(),
      });
    }

    if (this.count(p.id) === 0) { this.endMatch(); return; }
    this.time.delayedCall(REVIVE_MS, () => this.revive(p));
  }

  private revive(p: Player): void {
    if (this.over) return;
    const spot = this.nearestOwned(p.id, p.homeR, p.homeC);
    if (!spot) { this.endMatch(); return; }
    p.r = spot.r;
    p.c = spot.c;
    // face toward open board (away from the nearest wall edge)
    p.dir = spot.r < ROWS / 2 ? 2 : 0;
    p.pending = p.dir;
    p.alive = true;
    p.phase = 'home';
    p.biteSteps = 0;
    p.head.setPosition(this.gx(p.c), this.gy(p.r)).setVisible(true).setScale(0.4);
    this.tweens.add({ targets: p.head, scale: 1, duration: 260, ease: 'Back.out' });
  }

  private nearestOwned(id: number, r0: number, c0: number): { r: number; c: number } | null {
    let best: { r: number; c: number } | null = null;
    let bestD = Infinity;
    for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
      if (this.owner[r][c] !== id) continue;
      const d = Math.abs(r - r0) + Math.abs(c - c0);
      if (d < bestD) { bestD = d; best = { r, c }; }
    }
    return best;
  }

  // -- AI: carve compact rectangular "bites" adjacent to its own border, then
  //        loop home to claim them. Stays near its territory instead of
  //        spearing across the board.
  private aiThink(p: Player): void {
    const other = this.players.find((q) => q !== p)!;
    const safe = (d: number): boolean => {
      const nr = p.r + DIRS[d][0];
      const nc = p.c + DIRS[d][1];
      return this.inBounds(nr, nc) && !p.trailSet.has(key(nr, nc));
    };
    const ownerAt = (d: number): number => {
      const nr = p.r + DIRS[d][0];
      const nc = p.c + DIRS[d][1];
      return this.inBounds(nr, nc) ? this.owner[nr][nc] : -1;
    };
    const straight = p.dir;
    const left = (p.dir + 3) % 4;
    const right = (p.dir + 1) % 4;

    // opportunistic kill — if the rival's trail is one step away, cut it
    for (const d of [straight, left, right]) {
      if (other.alive && safe(d) && other.trailSet.has(key(p.r + DIRS[d][0], p.c + DIRS[d][1]))) {
        p.pending = d;
        return;
      }
    }

    if (p.phase === 'home') {
      // exit into a neutral neighbour to start a bite
      for (const d of [straight, left, right]) {
        if (safe(d) && ownerAt(d) === 0) {
          p.pending = d;
          p.phase = 'out';
          p.biteSteps = 0;
          p.biteLen = Phaser.Math.Between(2, p.desiredLen);
          p.turnCCW = Math.random() < 0.5;
          return;
        }
      }
      // deep inside own land — head to the border (away from centroid)
      p.pending = this.aiAim(p, [straight, left, right], safe, true);
      return;
    }

    const turn = p.turnCCW ? left : right;
    if (p.phase === 'out' || p.phase === 'across') {
      p.biteSteps++;
      if (p.biteSteps >= p.biteLen && safe(turn)) {
        p.pending = turn;
        p.phase = p.phase === 'out' ? 'across' : 'back';
        p.biteSteps = 0;
        p.biteLen = Phaser.Math.Between(2, p.desiredLen);
        return;
      }
      if (safe(straight)) { p.pending = straight; return; }
      if (safe(turn)) { p.pending = turn; p.phase = 'back'; return; }
      p.pending = this.aiAim(p, [left, right], safe, false);
      p.phase = 'back';
      return;
    }
    // 'back' — steer toward own territory to close the loop
    p.pending = this.aiAim(p, [straight, left, right], safe, false);
  }

  /** Pick the safe direction whose target is farthest from (away) / nearest to
   *  the AI's territory centroid. Falls back to any safe move. */
  private aiAim(p: Player, dirs: number[], safe: (d: number) => boolean, away: boolean): number {
    let best = p.dir;
    let bestD = away ? -Infinity : Infinity;
    let found = false;
    for (const d of dirs) {
      if (!safe(d)) continue;
      const nr = p.r + DIRS[d][0];
      const nc = p.c + DIRS[d][1];
      const dist = Math.abs(nr - p.cenR) + Math.abs(nc - p.cenC);
      if (away ? dist > bestD : dist < bestD) { bestD = dist; best = d; found = true; }
    }
    if (found) return best;
    for (const d of [p.dir, (p.dir + 1) % 4, (p.dir + 3) % 4]) if (safe(d)) return d;
    return p.dir;
  }

  private recomputeCentroid(p: Player): void {
    let sr = 0;
    let sc = 0;
    let n = 0;
    for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
      if (this.owner[r][c] === p.id) { sr += r; sc += c; n++; }
    }
    if (n > 0) { p.cenR = sr / n; p.cenC = sc / n; }
  }

  // -- scoring / HUD ---------------------------------------------------------
  private count(id: number): number {
    let n = 0;
    for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) if (this.owner[r][c] === id) n++;
    return n;
  }

  private updateHud(): void {
    const p1 = this.count(1);
    const p2 = this.count(2);
    this.p1Text.setText(Math.round((p1 / TOTAL) * 100) + '%');
    this.p2Text.setText(Math.round((p2 / TOTAL) * 100) + '%');

    const W = COLS * CELL;
    const y = 92;
    const h = 10;
    this.barGfx.clear();
    this.barGfx.fillStyle(0x2a2542, 1).fillRoundedRect(X0, y, W, h, 5);
    const w2 = (p2 / TOTAL) * W;
    const w1 = (p1 / TOTAL) * W;
    this.barGfx.fillStyle(COLORS.p2, 1).fillRect(X0, y, w2, h);
    this.barGfx.fillStyle(COLORS.p1, 1).fillRect(X0 + W - w1, y, w1, h);
  }

  private redrawTerritory(): void {
    this.territoryGfx.clear();
    for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
      const o = this.owner[r][c];
      if (o === 0) continue;
      this.territoryGfx.fillStyle(o === 1 ? COLORS.p1 : COLORS.p2, 1);
      this.territoryGfx.fillRect(X0 + c * CELL + 1, Y0 + r * CELL + 1, CELL - 2, CELL - 2);
    }
  }

  // -- clock / end -----------------------------------------------------------
  private tickClock(): void {
    if (this.over || this.locked) return;
    this.timeLeft--;
    const m = Math.floor(this.timeLeft / 60);
    const s = this.timeLeft % 60;
    this.timeText.setText(`${m}:${s.toString().padStart(2, '0')}`);
    if (this.timeLeft <= 10) this.timeText.setColor('#ff6b6b');
    if (this.timeLeft <= 0) this.endMatch();
  }

  private endMatch(): void {
    if (this.over) return;
    this.over = true;
    this.tick?.remove(false);
    this.clock?.remove(false);

    const p1 = this.count(1);
    const p2 = this.count(2);
    const p1Won = p1 > p2;
    const draw = p1 === p2;

    let title: string;
    if (draw) {
      title = 'Draw!';
      audio.bump();
    } else if (this.mode === 'ai') {
      title = p1Won ? 'You win!' : 'CPU wins';
      p1Won ? audio.win() : audio.lose();
    } else {
      title = p1Won ? 'Player 1 wins!' : 'Player 2 wins!';
      audio.win();
    }

    const winText = p1Won ? this.p1Text : this.p2Text;
    if (!draw) pulseTween(this, winText);
    spawnConfetti(this, GAME_WIDTH / 2, (BOARD_TOP + BOARD_BOTTOM) / 2);

    this.time.delayedCall(600, () => {
      showResult(this, {
        title,
        subtitle: `${Math.round((p1 / TOTAL) * 100)}% – ${Math.round((p2 / TOTAL) * 100)}%`,
        onRematch: () => { void Ads.maybeInterstitial(); this.scene.restart({ mode: this.mode, difficulty: this.difficulty }); },
        onHome: () => this.toHub(true),
      });
    });
  }

  private toHub(withAd: boolean): void {
    this.tick?.remove(false);
    this.clock?.remove(false);
    if (withAd) void Ads.maybeInterstitial();
    this.scene.start('Hub');
  }
}

// ----------------------------------------------------------------------------
// Pure capture: after a trail is committed to `owner`, any NEUTRAL cell that
// can no longer reach the board edge through non-`id` cells is enclosed and
// flips to `id`. Enemy-owned cells are passable for the outside flood (so they
// don't act as your walls) but are never stolen — keeps the timed match a fair
// land-grab rather than an instant-wipe. Returns the newly-claimed cell keys.
// Kept pure so it can be unit-checked without a live scene.
export function floodCapture(owner: number[][], id: number): number[] {
  const rows = owner.length;
  const cols = owner[0].length;
  const outside = Array.from({ length: rows }, () => new Array<boolean>(cols).fill(false));
  const stack: [number, number][] = [];
  const push = (r: number, c: number): void => {
    if (r < 0 || r >= rows || c < 0 || c >= cols) return;
    if (outside[r][c] || owner[r][c] === id) return;
    outside[r][c] = true;
    stack.push([r, c]);
  };
  for (let r = 0; r < rows; r++) { push(r, 0); push(r, cols - 1); }
  for (let c = 0; c < cols; c++) { push(0, c); push(rows - 1, c); }
  while (stack.length) {
    const [r, c] = stack.pop()!;
    push(r - 1, c); push(r + 1, c); push(r, c - 1); push(r, c + 1);
  }
  const claimed: number[] = [];
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    if (owner[r][c] === 0 && !outside[r][c]) { owner[r][c] = id; claimed.push(r * cols + c); }
  }
  return claimed;
}

// ponytail: one runnable check for the money path (the flood fill). DEV-only.
if (import.meta.env.DEV) {
  const ring = Array.from({ length: 5 }, () => new Array(5).fill(0));
  ring[1][1] = ring[1][2] = ring[1][3] = 1; // closed ring of id=1
  ring[2][1] = ring[2][3] = 1;
  ring[3][1] = ring[3][2] = ring[3][3] = 1;
  const claimed = floodCapture(ring, 1);
  console.assert(ring[2][2] === 1 && claimed.length === 1, 'floodCapture must claim the enclosed neutral cell');
  console.assert(ring[0][0] === 0, 'floodCapture must not claim open edge cells');
  // enclosed ENEMY cell must NOT be stolen
  const enemy = Array.from({ length: 5 }, () => new Array(5).fill(0));
  enemy[1][1] = enemy[1][2] = enemy[1][3] = 1;
  enemy[2][1] = enemy[2][3] = 1;
  enemy[3][1] = enemy[3][2] = enemy[3][3] = 1;
  enemy[2][2] = 2; // rival owns the enclosed cell
  const claimed2 = floodCapture(enemy, 1);
  console.assert(enemy[2][2] === 2 && claimed2.length === 0, 'floodCapture must never steal enemy land');
}
