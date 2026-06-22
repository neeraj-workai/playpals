import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, COLORS } from '../../core/config';
import { Ads } from '../../core/ads/AdManager';
import { audio } from '../../core/audio/AudioManager';
import { addBackButton } from '../../core/ui/Hud';
import { showResult } from '../../core/ui/ResultOverlay';
import { GameMode } from '../types';
import { ensureSoleActiveScene } from '../../core/ui/NavGuard';
import { setupSceneScale } from '../../core/scale';

const BG = 0x062210;
const COLS = 4;
const ROWS = 4;
const CELL = 74;
const GAP = 8;
const TOP_H = 68;
const BOT_H = 68;
const GRID_W = COLS * CELL + (COLS - 1) * GAP;
const GRID_H = ROWS * CELL + (ROWS - 1) * GAP;
const GRID_X = (GAME_WIDTH - GRID_W) / 2 + CELL / 2;
const GRID_Y = GAME_HEIGHT / 2 - GRID_H / 2 + CELL / 2;

export class FlipGridScene extends Phaser.Scene {
  private mode: GameMode = 'ai';
  private turn = 1;    // 1 = P1, 2 = P2
  private grid: number[] = [];          // 0=empty, 1=P1, 2=P2
  private cells: Phaser.GameObjects.Rectangle[] = [];
  private p1Count = 0;
  private p2Count = 0;
  private over = false;
  private p1ScoreText!: Phaser.GameObjects.Text;
  private p2ScoreText!: Phaser.GameObjects.Text;
  private turnText!: Phaser.GameObjects.Text;
  private aiTimer?: Phaser.Time.TimerEvent;

  constructor() { super('FlipGrid'); }
  init(data: { mode?: GameMode }): void { this.mode = data?.mode ?? 'ai'; }

  create(): void {
    ensureSoleActiveScene(this);
    setupSceneScale(this);
    this.turn = 1; this.p1Count = 0; this.p2Count = 0; this.over = false;
    this.grid = new Array(COLS * ROWS).fill(0);
    this.cells = [];
    this.cameras.main.setBackgroundColor(BG);

    // Player strips
    this.add.rectangle(GAME_WIDTH / 2, TOP_H / 2, GAME_WIDTH, TOP_H, COLORS.p2, 0.88);
    this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT - BOT_H / 2, GAME_WIDTH, BOT_H, COLORS.p1, 0.88);

    const label = { fontFamily: 'Arial Black, Arial', fontSize: '15px', color: '#ffffff' };
    const scoreStyle = { fontFamily: 'Arial Black, Arial', fontSize: '28px', color: '#ffffff' };
    this.add.text(16, TOP_H / 2, this.mode === 'ai' ? 'CPU' : 'P2', label).setOrigin(0, 0.5).setAngle(180).setDepth(5);
    this.add.text(16, GAME_HEIGHT - BOT_H / 2, 'P1', label).setOrigin(0, 0.5).setDepth(5);
    this.p2ScoreText = this.add.text(GAME_WIDTH - 16, TOP_H / 2, '0', scoreStyle).setOrigin(1, 0.5).setAngle(180).setDepth(5);
    this.p1ScoreText = this.add.text(GAME_WIDTH - 16, GAME_HEIGHT - BOT_H / 2, '0', scoreStyle).setOrigin(1, 0.5).setDepth(5);

    addBackButton(this, () => this.toHub(false)).setY(GAME_HEIGHT - BOT_H / 2);

    this.turnText = this.add.text(GAME_WIDTH / 2, TOP_H + 14, 'Your turn (P1)', {
      fontFamily: 'Arial Black, Arial', fontSize: '15px', color: '#ffffff',
    }).setOrigin(0.5, 0).setDepth(5);

    this.buildGrid();
    this.updateTurnLabel();
  }

  private buildGrid(): void {
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const x = GRID_X + c * (CELL + GAP);
        const y = GRID_Y + r * (CELL + GAP);
        const cell = this.add.rectangle(x, y, CELL, CELL, 0xffffff, 0.08)
          .setStrokeStyle(2, 0xffffff, 0.25)
          .setDepth(3)
          .setInteractive({ useHandCursor: true });
        const idx = r * COLS + c;
        cell.on('pointerdown', () => this.onTap(idx));
        cell.on('pointerover', () => { if (this.grid[idx] === 0 && !this.over) cell.setAlpha(0.7); });
        cell.on('pointerout', () => cell.setAlpha(1));
        this.cells.push(cell);
      }
    }
  }

  private onTap(idx: number): void {
    if (this.over || this.grid[idx] !== 0) return;
    // In 2P mode: P1 plays anytime (they discuss and pass). In AI mode: only P1 taps.
    if (this.mode === 'ai' && this.turn === 2) return;

    this.placeTile(idx, this.turn);
  }

  private placeTile(idx: number, player: number): void {
    this.grid[idx] = player;
    this.paintCell(idx);
    audio.click();

    // Flip adjacent opponent tiles
    const opponent = player === 1 ? 2 : 1;
    const r = Math.floor(idx / COLS), c = idx % COLS;
    const neighbors = [
      r > 0 ? idx - COLS : -1,
      r < ROWS - 1 ? idx + COLS : -1,
      c > 0 ? idx - 1 : -1,
      c < COLS - 1 ? idx + 1 : -1,
    ];
    let flipped = 0;
    neighbors.forEach(n => {
      if (n >= 0 && this.grid[n] === opponent) {
        this.grid[n] = player;
        this.paintCell(n);
        flipped++;
      }
    });
    if (flipped > 0) audio.goal();

    // Update counts
    this.p1Count = this.grid.filter(v => v === 1).length;
    this.p2Count = this.grid.filter(v => v === 2).length;
    this.p1ScoreText.setText(String(this.p1Count));
    this.p2ScoreText.setText(String(this.p2Count));

    // Check game over
    if (this.grid.every(v => v !== 0)) {
      this.over = true;
      this.time.delayedCall(400, () => this.endMatch());
      return;
    }

    this.turn = player === 1 ? 2 : 1;
    this.updateTurnLabel();

    if (this.mode === 'ai' && this.turn === 2) {
      this.aiTimer = this.time.delayedCall(550, () => {
        if (!this.over) this.placeTile(this.aiChoose(), 2);
      });
    }
  }

  private paintCell(idx: number): void {
    const owner = this.grid[idx];
    const col = owner === 1 ? COLORS.p1 : owner === 2 ? COLORS.p2 : 0x333355;
    const alpha = owner === 0 ? 0.08 : 0.85;
    this.cells[idx].setFillStyle(col, alpha);
    this.cells[idx].setStrokeStyle(2, owner === 0 ? 0xffffff : col, owner === 0 ? 0.25 : 0.5);
    this.tweens.add({ targets: this.cells[idx], scale: owner === 0 ? 1 : 1.12, duration: 80, yoyo: true });
  }

  private aiChoose(): number {
    // Greedy: pick the empty tile that flips the most opponent tiles
    const empties = this.grid.map((v, i) => v === 0 ? i : -1).filter(i => i >= 0);
    let best = empties[0], bestScore = -1;
    empties.forEach(idx => {
      const r = Math.floor(idx / COLS), c = idx % COLS;
      const neighbors = [r > 0 ? idx - COLS : -1, r < ROWS - 1 ? idx + COLS : -1, c > 0 ? idx - 1 : -1, c < COLS - 1 ? idx + 1 : -1];
      const flips = neighbors.filter(n => n >= 0 && this.grid[n] === 1).length;
      if (flips > bestScore) { bestScore = flips; best = idx; }
    });
    return best;
  }

  private updateTurnLabel(): void {
    const isP1 = this.turn === 1;
    if (this.mode === 'ai') {
      this.turnText.setText(isP1 ? 'Your turn (P1)' : 'CPU thinking…');
    } else {
      this.turnText.setText(isP1 ? 'P1 — tap a tile' : 'P2 — tap a tile');
    }
  }

  private endMatch(): void {
    const p1won = this.p1Count > this.p2Count;
    const draw = this.p1Count === this.p2Count;
    let title: string;
    if (draw) { title = "It's a draw!"; }
    else if (this.mode === 'ai') { title = p1won ? 'You win!' : 'CPU wins'; }
    else { title = p1won ? 'Player 1 wins!' : 'Player 2 wins!'; }
    p1won ? audio.win() : draw ? audio.goal() : audio.lose();
    showResult(this, {
      title,
      subtitle: `P1: ${this.p1Count}  –  P2: ${this.p2Count}`,
      onRematch: () => { void Ads.maybeInterstitial(); this.scene.restart({ mode: this.mode }); },
      onHome: () => this.toHub(true),
    });
  }

  private toHub(withAd: boolean): void {
    this.aiTimer?.remove(false);
    if (withAd) void Ads.maybeInterstitial();
    this.scene.start('Hub');
  }
}
