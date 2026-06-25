import Phaser from 'phaser';
import { GAME_WIDTH, COLORS } from '../../core/config';
import { Ads } from '../../core/ads/AdManager';
import { audio } from '../../core/audio/AudioManager';
import { addBackButton } from '../../core/ui/Hud';
import { showResult } from '../../core/ui/ResultOverlay';
import { GameMode, Difficulty } from '../types';
import { ensureSoleActiveScene } from '../../core/ui/NavGuard';
import { setupSceneScale } from '../../core/scale';

const LINES = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8],
  [0, 3, 6], [1, 4, 7], [2, 5, 8],
  [0, 4, 8], [2, 4, 6],
];

const CONFETTI_COLORS = [0xff6b9d, 0xffd93d, 0x6bcb77, 0x4d96ff, 0xff9843, 0xc77dff];

export class TicTacToeScene extends Phaser.Scene {
  private mode: GameMode = 'ai';
  private difficulty: Difficulty = 'medium';
  private cells: number[] = [];
  private current = 1;
  private over = false;
  private locked = false;
  private status!: Phaser.GameObjects.Text;
  // indexed by cell 0-8
  private marks: (Phaser.GameObjects.Container | null)[] = [];
  private cellBgs: Phaser.GameObjects.Rectangle[] = [];

  private readonly B = 330;
  private readonly OY = 160;

  constructor() {
    super('TicTacToe');
  }

  init(data: { mode?: GameMode; difficulty?: Difficulty }): void {
    this.mode = data?.mode ?? 'ai';
    this.difficulty = data?.difficulty ?? 'medium';
  }

  create(): void {
    ensureSoleActiveScene(this);
    setupSceneScale(this);
    this.cells = new Array(9).fill(0);
    this.marks = Array(9).fill(null) as (Phaser.GameObjects.Container | null)[];
    this.cellBgs = [];
    this.current = 1;
    this.over = false;
    this.locked = false;

    // Vibrant purple-pink background
    this.cameras.main.setBackgroundColor(0x6c2eb9);
    this.add.rectangle(GAME_WIDTH / 2, 0, GAME_WIDTH, 500, 0x9b3dc8, 0.6).setOrigin(0.5, 0);
    this.add.rectangle(GAME_WIDTH / 2, 500, GAME_WIDTH, 600, 0xd63aa0, 0.4).setOrigin(0.5, 0);

    addBackButton(this, () => this.toHub(false));

    this.status = this.add
      .text(GAME_WIDTH / 2, 105, '', {
        fontFamily: 'Arial Black, Arial',
        fontSize: '26px',
        color: '#ffffff',
        stroke: '#00000055',
        strokeThickness: 4,
      })
      .setOrigin(0.5);

    const ox = (GAME_WIDTH - this.B) / 2;
    const cell = this.B / 3;

    // Grid shadow
    const shadow = this.add.graphics();
    shadow.lineStyle(12, 0x000000, 0.25);
    for (let i = 1; i < 3; i++) {
      shadow.lineBetween(ox + i * cell + 3, this.OY + 3, ox + i * cell + 3, this.OY + this.B + 3);
      shadow.lineBetween(ox + 3, this.OY + i * cell + 3, ox + this.B + 3, this.OY + i * cell + 3);
    }

    // Grid — animate in
    const grid = this.add.graphics().setAlpha(0);
    grid.lineStyle(8, 0xffffff, 0.95);
    for (let i = 1; i < 3; i++) {
      grid.lineBetween(ox + i * cell, this.OY, ox + i * cell, this.OY + this.B);
      grid.lineBetween(ox, this.OY + i * cell, ox + this.B, this.OY + i * cell);
    }
    this.tweens.add({ targets: grid, alpha: 1, duration: 350, ease: 'Power2' });

    for (let i = 0; i < 9; i++) {
      const { x, y } = this.cellCenter(i);
      const bg = this.add.rectangle(x, y, cell - 8, cell - 8, 0xffffff, 0).setDepth(1);
      this.cellBgs.push(bg);

      const zone = this.add
        .rectangle(x, y, cell - 4, cell - 4, 0xffffff, 0.001)
        .setDepth(3)
        .setInteractive({ useHandCursor: true });

      zone.on('pointerover', () => {
        if (this.over || this.locked || this.cells[i] !== 0) return;
        if (this.mode === 'ai' && this.current !== 1) return;
        this.tweens.add({ targets: bg, fillAlpha: 0.18, duration: 120 });
      });
      zone.on('pointerout', () => {
        this.tweens.add({ targets: bg, fillAlpha: 0, duration: 180 });
      });
      zone.on('pointerdown', () => this.onTap(i));
    }

    this.updateStatus();
  }

  private cellCenter(i: number): { x: number; y: number } {
    const ox = (GAME_WIDTH - this.B) / 2;
    const cell = this.B / 3;
    return { x: ox + (i % 3) * cell + cell / 2, y: this.OY + Math.floor(i / 3) * cell + cell / 2 };
  }

  private onTap(i: number): void {
    if (this.over || this.locked || this.cells[i] !== 0) return;
    if (this.mode === 'ai' && this.current !== 1) return;
    this.place(i, this.current);
    this.advance();
  }

  private place(i: number, player: number): void {
    this.cells[i] = player;
    audio.place();
    const { x, y } = this.cellCenter(i);
    this.tweens.add({ targets: this.cellBgs[i], fillAlpha: 0, duration: 100 });

    const r = 38;
    // graphics at local (0,0) — container handles world position
    const glow = this.make.graphics({ x: 0, y: 0, add: false }).setAlpha(0.35);
    const mark = this.make.graphics({ x: 0, y: 0, add: false });

    if (player === 1) {
      // X — coral red with a yellow glow
      glow.lineStyle(22, 0xffcc00, 1);
      glow.beginPath(); glow.moveTo(-r, -r); glow.lineTo(r, r);
      glow.moveTo(r, -r); glow.lineTo(-r, r); glow.strokePath();
      mark.lineStyle(14, 0xff4757, 1);
      mark.beginPath(); mark.moveTo(-r, -r); mark.lineTo(r, r);
      mark.moveTo(r, -r); mark.lineTo(-r, r); mark.strokePath();
    } else {
      // O — sky blue with a cyan glow
      glow.lineStyle(22, 0x00e5ff, 1);
      glow.strokeCircle(0, 0, r);
      mark.lineStyle(14, 0x4ecdc4, 1);
      mark.strokeCircle(0, 0, r);
    }

    const container = this.add.container(x, y, [glow, mark]).setDepth(5).setScale(0);
    this.marks[i] = container;
    this.tweens.add({ targets: container, scale: 1, duration: 300, ease: 'Back.easeOut' });
  }

  private advance(): void {
    const line = this.winningLine(this.current);
    if (line) { this.end(this.current, line); return; }
    if (this.cells.every((c) => c !== 0)) { this.end(0, null); return; }
    this.current = this.current === 1 ? 2 : 1;
    this.updateStatus();
    if (this.mode === 'ai' && this.current === 2) {
      this.locked = true;
      this.time.delayedCall(450, () => {
        this.locked = false;
        const move = this.aiMove();
        this.place(move, 2);
        this.advance();
      });
    }
  }

  private winningLine(player: number): number[] | null {
    return LINES.find((l) => l.every((i) => this.cells[i] === player)) ?? null;
  }

  private aiMove(): number {
    const empty = (): number[] => this.cells.map((c, i) => (c === 0 ? i : -1)).filter((i) => i >= 0);
    const completes = (player: number): number => {
      for (const l of LINES) {
        const blanks = l.filter((i) => this.cells[i] === 0);
        if (l.filter((i) => this.cells[i] === player).length === 2 && blanks.length === 1) return blanks[0];
      }
      return -1;
    };
    const win = completes(2); if (win >= 0) return win;
    const block = completes(1); if (block >= 0) return block;
    const stratChance = this.difficulty === 'easy' ? 0.3 : this.difficulty === 'hard' ? 1.0 : 0.7;
    if (Math.random() < stratChance) {
      if (this.cells[4] === 0) return 4;
      const corners = [0, 2, 6, 8].filter((i) => this.cells[i] === 0);
      if (corners.length) return Phaser.Utils.Array.GetRandom(corners);
    }
    return Phaser.Utils.Array.GetRandom(empty());
  }

  private updateStatus(): void {
    if (this.over) return;
    const emoji = this.current === 1 ? '❌' : '⭕';
    let label: string;
    if (this.mode === 'ai') {
      label = this.current === 1 ? `Your turn  ${emoji}` : `CPU thinking…  ${emoji}`;
    } else {
      label = this.current === 1 ? `P1 turn  ${emoji}` : `P2 turn  ${emoji}`;
    }
    this.status.setText(label);
    this.tweens.add({ targets: this.status, scaleX: { from: 1.2, to: 1 }, scaleY: { from: 1.2, to: 1 }, duration: 250, ease: 'Back.easeOut' });
  }

  private spawnConfetti(cx: number, cy: number): void {
    for (let i = 0; i < 32; i++) {
      const g = this.add
        .rectangle(
          cx + Phaser.Math.Between(-60, 60),
          cy,
          Phaser.Math.Between(6, 14),
          Phaser.Math.Between(6, 14),
          Phaser.Utils.Array.GetRandom(CONFETTI_COLORS),
        )
        .setDepth(10);
      this.tweens.add({
        targets: g,
        x: g.x + Phaser.Math.Between(-140, 140),
        y: g.y + Phaser.Math.Between(-220, 60),
        angle: Phaser.Math.Between(-360, 360),
        alpha: 0,
        duration: Phaser.Math.Between(600, 1300),
        ease: 'Power2',
        onComplete: () => g.destroy(),
      });
    }
  }

  private end(winner: number, line: number[] | null): void {
    this.over = true;

    if (line) {
      // Pulse winning marks
      line.forEach((i) => {
        const m = this.marks[i];
        if (!m) return;
        this.tweens.add({ targets: m, scale: 1.25, yoyo: true, repeat: 2, duration: 180, ease: 'Sine.easeInOut' });
      });

      // Animated win line
      const a = this.cellCenter(line[0]);
      const b = this.cellCenter(line[2]);
      const winLine = this.add.graphics().setDepth(8).setAlpha(0);
      winLine.lineStyle(10, 0xffffff, 1);
      winLine.lineBetween(a.x, a.y, b.x, b.y);
      this.tweens.add({ targets: winLine, alpha: 1, duration: 300 });

      // Confetti from win line midpoint
      const mx = (a.x + b.x) / 2;
      const my = (a.y + b.y) / 2;
      this.time.delayedCall(150, () => this.spawnConfetti(mx, my));
      this.time.delayedCall(450, () => this.spawnConfetti(mx, my));
    }

    winner === 0 ? audio.bump() : (winner === 1 ? audio.win() : (this.mode === 'ai' ? audio.lose() : audio.win()));
    this.status.setText('');

    let title: string;
    let color = '#ffffff';
    if (winner === 0) {
      title = 'Draw! 🤝';
    } else if (this.mode === 'ai') {
      title = winner === 1 ? 'You win! 🎉' : 'CPU wins 🤖';
      color = '#' + (winner === 1 ? COLORS.p1 : COLORS.p2).toString(16).padStart(6, '0');
    } else {
      title = winner === 1 ? 'Player 1 wins! 🎉' : 'Player 2 wins! 🎉';
      color = '#' + (winner === 1 ? COLORS.p1 : COLORS.p2).toString(16).padStart(6, '0');
    }

    this.time.delayedCall(700, () =>
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
