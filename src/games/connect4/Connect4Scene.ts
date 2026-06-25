import Phaser from 'phaser';
import { GAME_WIDTH, COLORS, GAME_ARENA_BG } from '../../core/config';
import { Ads } from '../../core/ads/AdManager';
import { audio } from '../../core/audio/AudioManager';
import { addBackButton } from '../../core/ui/Hud';
import { showResult } from '../../core/ui/ResultOverlay';
import { GameMode, Difficulty } from '../types';
import { ensureSoleActiveScene } from '../../core/ui/NavGuard';
import { setupSceneScale } from '../../core/scale';
import { spawnConfetti, STATUS_STYLE, pulseTween } from '../../core/ui/FxUtils';

const COLS = 7;
const ROWS = 6;
const CELL = 46;

export class Connect4Scene extends Phaser.Scene {
  private mode: GameMode = 'ai';
  private difficulty: Difficulty = 'medium';
  private board: number[] = [];
  private current = 1;
  private over = false;
  private locked = false;
  private status!: Phaser.GameObjects.Text;

  private readonly ox = (GAME_WIDTH - COLS * CELL) / 2;
  private readonly oy = 195;
  private hoverDiscs: Phaser.GameObjects.Arc[] = [];

  constructor() {
    super('Connect4');
  }

  init(data: { mode?: GameMode; difficulty?: Difficulty }): void {
    this.mode = data?.mode ?? 'ai';
    this.difficulty = data?.difficulty ?? 'medium';
  }

  create(): void {
    ensureSoleActiveScene(this);
    setupSceneScale(this);
    this.board = new Array(COLS * ROWS).fill(0);
    this.current = 1;
    this.over = false;
    this.locked = false;

    // Vibrant red gradient background
    this.cameras.main.setBackgroundColor(0x8b0000);
    this.add.rectangle(GAME_WIDTH / 2, 0, GAME_WIDTH, 400, 0xc0392b, 0.7).setOrigin(0.5, 0);
    this.add.rectangle(GAME_WIDTH / 2, 400, GAME_WIDTH, 300, 0x6b1010, 0.7).setOrigin(0.5, 0);

    addBackButton(this, () => this.toHub(false));
    this.status = this.add
      .text(GAME_WIDTH / 2, 148, '', { ...STATUS_STYLE, fontSize: '22px' })
      .setOrigin(0.5);

    // Board shadow
    this.add
      .rectangle(GAME_WIDTH / 2 + 4, this.oy + (ROWS * CELL) / 2 + 4, COLS * CELL + 16, ROWS * CELL + 16, 0x000000, 0.35)
      .setDepth(0);
    // Board panel — animate in
    const board = this.add
      .rectangle(GAME_WIDTH / 2, this.oy + (ROWS * CELL) / 2, COLS * CELL + 12, ROWS * CELL + 12, 0x1565c0, 1)
      .setStrokeStyle(3, 0x0d47a1, 1)
      .setDepth(1)
      .setAlpha(0);
    this.tweens.add({ targets: board, alpha: 1, duration: 300, ease: 'Power2' });

    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        this.add.circle(this.cellX(c), this.cellY(r), CELL * 0.38, 0x0a0d1e, 1).setDepth(2);
      }
    }

    // Hover preview discs (one per column, hidden by default)
    for (let c = 0; c < COLS; c++) {
      const hd = this.add.circle(this.cellX(c), this.oy - CELL * 0.6, CELL * 0.36, COLORS.p1, 0.45).setDepth(3).setVisible(false);
      this.hoverDiscs.push(hd);
    }

    for (let c = 0; c < COLS; c++) {
      const zone = this.add
        .rectangle(this.cellX(c), this.oy + (ROWS * CELL) / 2, CELL, ROWS * CELL, 0xffffff, 0.001)
        .setDepth(5)
        .setInteractive({ useHandCursor: true });
      zone.on('pointerover', () => {
        zone.setFillStyle(0xffffff, 0.06);
        if (!this.over && !this.locked) {
          const color = this.current === 1 ? COLORS.p1 : COLORS.p2;
          this.hoverDiscs[c].setFillStyle(color, 0.55).setVisible(true);
        }
      });
      zone.on('pointerout', () => { zone.setFillStyle(0xffffff, 0.001); this.hoverDiscs[c].setVisible(false); });
      zone.on('pointerdown', () => this.onColumn(c));
    }

    this.updateStatus();
  }

  private cellX(c: number): number {
    return this.ox + c * CELL + CELL / 2;
  }
  private cellY(r: number): number {
    return this.oy + r * CELL + CELL / 2;
  }
  private idx(r: number, c: number): number {
    return r * COLS + c;
  }
  private dropRow(c: number): number {
    for (let r = ROWS - 1; r >= 0; r--) if (this.board[this.idx(r, c)] === 0) return r;
    return -1;
  }
  private validCols(): number[] {
    return Array.from({ length: COLS }, (_, c) => c).filter((c) => this.board[this.idx(0, c)] === 0);
  }

  private onColumn(c: number): void {
    if (this.over || this.locked) return;
    if (this.mode === 'ai' && this.current !== 1) return;
    const r = this.dropRow(c);
    if (r < 0) return;
    this.drop(c, r, this.current);
  }

  private drop(c: number, r: number, player: number): void {
    this.locked = true;
    this.hoverDiscs[c].setVisible(false);
    const color = player === 1 ? COLORS.p1 : COLORS.p2;
    // Glow ring behind the disc
    this.add.circle(this.cellX(c), this.oy - 30, CELL * 0.4, color, 0.3).setDepth(3);
    const disc = this.add.circle(this.cellX(c), this.oy - 30, CELL * 0.38, color, 1).setDepth(4);
    this.tweens.add({
      targets: disc,
      y: this.cellY(r),
      duration: 220 + r * 40,
      ease: 'Bounce.easeOut',
      onComplete: () => {
        this.board[this.idx(r, c)] = player;
        audio.place();
        this.locked = false;
        this.afterMove();
      },
    });
  }

  private afterMove(): void {
    const win = this.findWin();
    if (win) {
      this.end(win.player, win.cells);
      return;
    }
    if (this.validCols().length === 0) {
      this.end(0, []);
      return;
    }
    this.current = this.current === 1 ? 2 : 1;
    this.updateStatus();
    if (this.mode === 'ai' && this.current === 2) {
      this.locked = true;
      this.time.delayedCall(500, () => {
        this.locked = false;
        const c = this.aiCol();
        this.drop(c, this.dropRow(c), 2);
      });
    }
  }

  private findWin(): { player: number; cells: number[] } | null {
    const dirs = [
      [0, 1], [1, 0], [1, 1], [1, -1],
    ];
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const p = this.board[this.idx(r, c)];
        if (p === 0) continue;
        for (const [dr, dc] of dirs) {
          const cells = [this.idx(r, c)];
          let rr = r + dr;
          let cc = c + dc;
          while (rr >= 0 && rr < ROWS && cc >= 0 && cc < COLS && this.board[this.idx(rr, cc)] === p) {
            cells.push(this.idx(rr, cc));
            if (cells.length === 4) return { player: p, cells };
            rr += dr;
            cc += dc;
          }
        }
      }
    }
    return null;
  }

  private scoreWindow(window: number[], player: number): number {
    const opp = player === 2 ? 1 : 2;
    const p = window.filter((c) => c === player).length;
    const e = window.filter((c) => c === 0).length;
    const o = window.filter((c) => c === opp).length;
    if (p === 4) return 100;
    if (p === 3 && e === 1) return 5;
    if (p === 2 && e === 2) return 2;
    if (o === 3 && e === 1) return -4;
    return 0;
  }

  private scoreBoard(player: number): number {
    let score = 0;
    // center column bonus
    for (let r = 0; r < ROWS; r++) {
      if (this.board[this.idx(r, 3)] === player) score += 3;
    }
    // horizontal
    for (let r = 0; r < ROWS; r++)
      for (let c = 0; c <= COLS - 4; c++)
        score += this.scoreWindow([0,1,2,3].map((i) => this.board[this.idx(r, c + i)]), player);
    // vertical
    for (let r = 0; r <= ROWS - 4; r++)
      for (let c = 0; c < COLS; c++)
        score += this.scoreWindow([0,1,2,3].map((i) => this.board[this.idx(r + i, c)]), player);
    // diagonal down-right
    for (let r = 0; r <= ROWS - 4; r++)
      for (let c = 0; c <= COLS - 4; c++)
        score += this.scoreWindow([0,1,2,3].map((i) => this.board[this.idx(r + i, c + i)]), player);
    // diagonal up-right
    for (let r = 3; r < ROWS; r++)
      for (let c = 0; c <= COLS - 4; c++)
        score += this.scoreWindow([0,1,2,3].map((i) => this.board[this.idx(r - i, c + i)]), player);
    return score;
  }

  // center-out column order for better alpha-beta pruning
  private readonly COL_ORDER = [3, 2, 4, 1, 5, 0, 6];

  private minimax(depth: number, alpha: number, beta: number, maximizing: boolean): number {
    const win = this.findWin();
    if (win) return win.player === 2 ? 100000 + depth : -(100000 + depth);
    const valid = this.validCols();
    if (valid.length === 0) return 0;
    if (depth === 0) return this.scoreBoard(2);

    const cols = this.COL_ORDER.filter((c) => valid.includes(c));
    if (maximizing) {
      let best = -Infinity;
      for (const c of cols) {
        const r = this.dropRow(c);
        this.board[this.idx(r, c)] = 2;
        best = Math.max(best, this.minimax(depth - 1, alpha, beta, false));
        this.board[this.idx(r, c)] = 0;
        alpha = Math.max(alpha, best);
        if (alpha >= beta) break;
      }
      return best;
    } else {
      let best = Infinity;
      for (const c of cols) {
        const r = this.dropRow(c);
        this.board[this.idx(r, c)] = 1;
        best = Math.min(best, this.minimax(depth - 1, alpha, beta, true));
        this.board[this.idx(r, c)] = 0;
        beta = Math.min(beta, best);
        if (alpha >= beta) break;
      }
      return best;
    }
  }

  private aiCol(): number {
    const valid = this.validCols();

    if (this.difficulty === 'easy') {
      // immediate win/block only, otherwise random
      for (const player of [2, 1]) {
        for (const c of valid) {
          const r = this.dropRow(c);
          this.board[this.idx(r, c)] = player;
          const w = this.findWin();
          this.board[this.idx(r, c)] = 0;
          if (w?.player === player) return c;
        }
      }
      return Phaser.Utils.Array.GetRandom(valid);
    }

    const depth = this.difficulty === 'hard' ? 7 : 4;
    const cols = this.COL_ORDER.filter((c) => valid.includes(c));
    let bestCol = cols[0];
    let bestScore = -Infinity;
    for (const c of cols) {
      const r = this.dropRow(c);
      this.board[this.idx(r, c)] = 2;
      const score = this.minimax(depth - 1, -Infinity, Infinity, false);
      this.board[this.idx(r, c)] = 0;
      if (score > bestScore) { bestScore = score; bestCol = c; }
    }
    return bestCol;
  }

  private updateStatus(): void {
    if (this.over) return;
    const color = this.current === 1 ? COLORS.p1 : COLORS.p2;
    const emoji = this.current === 1 ? '🔴' : '🟡';
    let label: string;
    if (this.mode === 'ai') label = this.current === 1 ? `Your turn  ${emoji}` : `CPU thinking…  ${emoji}`;
    else label = this.current === 1 ? `P1 turn  ${emoji}` : `P2 turn  ${emoji}`;
    this.status.setText(label).setColor('#' + color.toString(16).padStart(6, '0'));
    this.tweens.add({ targets: this.status, scaleX: { from: 1.15, to: 1 }, scaleY: { from: 1.15, to: 1 }, duration: 220, ease: 'Back.easeOut' });
    // Update hover disc color when turn changes
    this.hoverDiscs.forEach(hd => { if (hd.visible) hd.setFillStyle(color, 0.55); });
  }

  private end(winner: number, cells: number[]): void {
    this.over = true;
    this.hoverDiscs.forEach(hd => hd.setVisible(false));
    this.status.setText('');

    if (cells.length > 0) {
      // Pulse winning discs and draw a win line
      cells.forEach((i) => {
        const r = Math.floor(i / COLS);
        const c = i % COLS;
        const ring = this.add.circle(this.cellX(c), this.cellY(r), CELL * 0.4, 0xffffff, 0).setStrokeStyle(4, 0xffffff, 1).setDepth(6);
        this.tweens.add({ targets: ring, scale: 1.15, yoyo: true, repeat: 3, duration: 160, ease: 'Sine.easeInOut' });
      });
      // Connect winning line
      const a = { x: this.cellX(cells[0] % COLS), y: this.cellY(Math.floor(cells[0] / COLS)) };
      const b = { x: this.cellX(cells[3] % COLS), y: this.cellY(Math.floor(cells[3] / COLS)) };
      const line = this.add.graphics().setDepth(7).setAlpha(0);
      line.lineStyle(6, 0xffffff, 1);
      line.lineBetween(a.x, a.y, b.x, b.y);
      this.tweens.add({ targets: line, alpha: 1, duration: 300 });
    }

    let title: string;
    let color = '#ffffff';
    if (winner === 0) {
      title = 'Draw! 🤝';
      audio.bump();
    } else {
      color = '#' + (winner === 1 ? COLORS.p1 : COLORS.p2).toString(16).padStart(6, '0');
      if (this.mode === 'ai') {
        title = winner === 1 ? 'You win! 🎉' : 'CPU wins 🤖';
        winner === 1 ? audio.win() : audio.lose();
      } else {
        title = winner === 1 ? 'Player 1 wins! 🎉' : 'Player 2 wins! 🎉';
        audio.win();
      }
      if (winner > 0) {
        const wx = winner === 1 ? this.cellX(cells[0] % COLS) : this.cellX(cells[0] % COLS);
        const wy = winner === 1 ? this.cellY(Math.floor(cells[0] / COLS)) : this.cellY(Math.floor(cells[0] / COLS));
        this.time.delayedCall(200, () => spawnConfetti(this, wx, wy));
        this.time.delayedCall(500, () => spawnConfetti(this, GAME_WIDTH / 2, 300));
      }
    }

    this.time.delayedCall(800, () =>
      showResult(this, {
        title,
        titleColor: color,
        onRematch: () => { void Ads.maybeInterstitial(); this.scene.restart({ mode: this.mode, difficulty: this.difficulty }); },
        onHome: () => this.toHub(true),
      }),
    );
  }

  private toHub(withAd: boolean): void {
    if (withAd) void Ads.maybeInterstitial();
    this.scene.start('Hub');
  }
}

