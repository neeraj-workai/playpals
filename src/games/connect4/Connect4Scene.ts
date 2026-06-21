import Phaser from 'phaser';
import { GAME_WIDTH, COLORS, GAME_ARENA_BG } from '../../core/config';
import { Ads } from '../../core/ads/AdManager';
import { audio } from '../../core/audio/AudioManager';
import { addBackButton } from '../../core/ui/Hud';
import { showResult } from '../../core/ui/ResultOverlay';
import { GameMode } from '../types';
import { ensureSoleActiveScene } from '../../core/ui/NavGuard';
import { setupSceneScale } from '../../core/scale';

const COLS = 7;
const ROWS = 6;
const CELL = 46;

export class Connect4Scene extends Phaser.Scene {
  private mode: GameMode = 'ai';
  private board: number[] = [];
  private current = 1;
  private over = false;
  private locked = false;
  private status!: Phaser.GameObjects.Text;

  private readonly ox = (GAME_WIDTH - COLS * CELL) / 2;
  private readonly oy = 200;

  constructor() {
    super('Connect4');
  }

  init(data: { mode?: GameMode }): void {
    this.mode = data?.mode ?? 'ai';
  }

  create(): void {
    ensureSoleActiveScene(this);
    setupSceneScale(this);
    this.board = new Array(COLS * ROWS).fill(0);
    this.current = 1;
    this.over = false;
    this.locked = false;

    this.cameras.main.setBackgroundColor(GAME_ARENA_BG);
    addBackButton(this, () => this.toHub(false));
    this.status = this.add
      .text(GAME_WIDTH / 2, 150, '', { fontFamily: 'Arial Black, Arial', fontSize: '22px', color: '#ffffff' })
      .setOrigin(0.5);

    this.add
      .rectangle(GAME_WIDTH / 2, this.oy + (ROWS * CELL) / 2, COLS * CELL + 12, ROWS * CELL + 12, COLORS.panelLight, 1)
      .setStrokeStyle(2, 0x3b4660, 1);

    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        this.add.circle(this.cellX(c), this.cellY(r), CELL * 0.38, GAME_ARENA_BG, 1).setDepth(1);
      }
    }

    for (let c = 0; c < COLS; c++) {
      const zone = this.add
        .rectangle(this.cellX(c), this.oy + (ROWS * CELL) / 2, CELL, ROWS * CELL, 0xffffff, 0.001)
        .setInteractive({ useHandCursor: true });
      zone.on('pointerover', () => zone.setFillStyle(0xffffff, 0.05));
      zone.on('pointerout', () => zone.setFillStyle(0xffffff, 0.001));
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
    const color = player === 1 ? COLORS.p1 : COLORS.p2;
    const disc = this.add.circle(this.cellX(c), this.oy - 30, CELL * 0.38, color, 1).setDepth(2);
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

  private aiCol(): number {
    const valid = this.validCols();
    const tryWin = (player: number): number => {
      for (const c of valid) {
        const r = this.dropRow(c);
        this.board[this.idx(r, c)] = player;
        const w = this.findWin();
        this.board[this.idx(r, c)] = 0;
        if (w && w.player === player) return c;
      }
      return -1;
    };
    const win = tryWin(2);
    if (win >= 0) return win;
    const block = tryWin(1);
    if (block >= 0) return block;

    const order = [3, 2, 4, 1, 5, 0, 6].filter((c) => valid.includes(c));
    if (Math.random() < 0.8 && order.length) return order[0];
    return Phaser.Utils.Array.GetRandom(valid);
  }

  private updateStatus(): void {
    if (this.over) return;
    const color = this.current === 1 ? COLORS.p1 : COLORS.p2;
    let label: string;
    if (this.mode === 'ai') label = this.current === 1 ? 'Your turn' : 'CPU thinking…';
    else label = this.current === 1 ? 'P1 turn' : 'P2 turn';
    this.status.setText(label).setColor('#' + color.toString(16).padStart(6, '0'));
  }

  private end(winner: number, cells: number[]): void {
    this.over = true;
    this.status.setText('');
    cells.forEach((i) => {
      const r = Math.floor(i / COLS);
      const c = i % COLS;
      this.add.circle(this.cellX(c), this.cellY(r), CELL * 0.38, 0xffffff, 0).setStrokeStyle(5, 0xffffff, 1).setDepth(4);
    });

    let title: string;
    let color = '#ffffff';
    if (winner === 0) {
      title = 'Draw';
      audio.bump();
    } else {
      color = '#' + (winner === 1 ? COLORS.p1 : COLORS.p2).toString(16).padStart(6, '0');
      if (this.mode === 'ai') {
        title = winner === 1 ? 'You win!' : 'CPU wins';
        winner === 1 ? audio.win() : audio.lose();
      } else {
        title = winner === 1 ? 'Player 1 wins!' : 'Player 2 wins!';
        audio.win();
      }
    }

    this.time.delayedCall(800, () =>
      showResult(this, {
        title,
        titleColor: color,
        onRematch: () => { void Ads.maybeInterstitial(); this.scene.restart({ mode: this.mode }); },
        onHome: () => this.toHub(true),
      }),
    );
  }

  private toHub(withAd: boolean): void {
    if (withAd) void Ads.maybeInterstitial();
    this.scene.start('Hub');
  }
}
