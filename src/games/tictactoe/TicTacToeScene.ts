import Phaser from 'phaser';
import { GAME_WIDTH, COLORS, GAME_ARENA_BG } from '../../core/config';
import { Ads } from '../../core/ads/AdManager';
import { audio } from '../../core/audio/AudioManager';
import { addBackButton } from '../../core/ui/Hud';
import { showResult } from '../../core/ui/ResultOverlay';
import { GameMode } from '../types';
import { ensureSoleActiveScene } from '../../core/ui/NavGuard';
import { setupSceneScale } from '../../core/scale';

const LINES = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8],
  [0, 3, 6], [1, 4, 7], [2, 5, 8],
  [0, 4, 8], [2, 4, 6],
];

export class TicTacToeScene extends Phaser.Scene {
  private mode: GameMode = 'ai';
  private cells: number[] = [];
  private current = 1;
  private over = false;
  private locked = false;
  private status!: Phaser.GameObjects.Text;
  private marks: Phaser.GameObjects.GameObject[] = [];

  private readonly B = 312;
  private readonly OY = 200;

  constructor() {
    super('TicTacToe');
  }

  init(data: { mode?: GameMode }): void {
    this.mode = data?.mode ?? 'ai';
  }

  create(): void {
    ensureSoleActiveScene(this);
    setupSceneScale(this);
    this.cells = new Array(9).fill(0);
    this.current = 1;
    this.over = false;
    this.locked = false;
    this.marks = [];

    this.cameras.main.setBackgroundColor(0x3d2200); // dark amber
    addBackButton(this, () => this.toHub(false));

    this.status = this.add
      .text(GAME_WIDTH / 2, 150, '', { fontFamily: 'Arial Black, Arial', fontSize: '22px', color: '#ffffff' })
      .setOrigin(0.5);

    const ox = (GAME_WIDTH - this.B) / 2;
    const cell = this.B / 3;

    const grid = this.add.graphics();
    grid.lineStyle(6, COLORS.panelLight, 1);
    for (let i = 1; i < 3; i++) {
      grid.lineBetween(ox + i * cell, this.OY, ox + i * cell, this.OY + this.B);
      grid.lineBetween(ox, this.OY + i * cell, ox + this.B, this.OY + i * cell);
    }

    for (let i = 0; i < 9; i++) {
      const { x, y } = this.cellCenter(i);
      const zone = this.add.rectangle(x, y, cell - 6, cell - 6, 0xffffff, 0.001).setInteractive({ useHandCursor: true });
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
    const r = 36;
    const g = this.add.graphics({ x, y }).setDepth(5);
    if (player === 1) {
      g.lineStyle(11, COLORS.p1, 1);
      g.beginPath();
      g.moveTo(-r, -r); g.lineTo(r, r);
      g.moveTo(r, -r); g.lineTo(-r, r);
      g.strokePath();
    } else {
      g.lineStyle(11, COLORS.p2, 1);
      g.strokeCircle(0, 0, r);
    }
    this.marks.push(g);
  }

  private advance(): void {
    const line = this.winningLine(this.current);
    if (line) {
      this.end(this.current, line);
      return;
    }
    if (this.cells.every((c) => c !== 0)) {
      this.end(0, null);
      return;
    }
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
        const marks = l.filter((i) => this.cells[i] === player).length;
        const blanks = l.filter((i) => this.cells[i] === 0);
        if (marks === 2 && blanks.length === 1) return blanks[0];
      }
      return -1;
    };
    const win = completes(2);
    if (win >= 0) return win;
    const block = completes(1);
    if (block >= 0) return block;

    // 70% play strategically, 30% random â€” keeps the CPU beatable.
    const options = empty();
    if (Math.random() < 0.7) {
      if (this.cells[4] === 0) return 4;
      const corners = [0, 2, 6, 8].filter((i) => this.cells[i] === 0);
      if (corners.length) return Phaser.Utils.Array.GetRandom(corners);
    }
    return Phaser.Utils.Array.GetRandom(options);
  }

  private updateStatus(): void {
    if (this.over) return;
    let label: string;
    let color: number;
    if (this.mode === 'ai') {
      label = this.current === 1 ? 'Your turn  (X)' : 'CPU thinking…';
    } else {
      label = this.current === 1 ? 'P1 turn  (X)' : 'P2 turn  (O)';
    }
    color = this.current === 1 ? COLORS.p1 : COLORS.p2;
    this.status.setText(label).setColor('#' + color.toString(16).padStart(6, '0'));
  }

  private end(winner: number, line: number[] | null): void {
    this.over = true;
    if (line) {
      const a = this.cellCenter(line[0]);
      const b = this.cellCenter(line[2]);
      this.add.graphics().setDepth(8).lineStyle(10, 0xffffff, 0.9).lineBetween(a.x, a.y, b.x, b.y);
    }
    if (winner === 0) {
      audio.bump();
    } else {
      winner === 1 ? audio.win() : this.mode === 'ai' ? audio.lose() : audio.win();
    }
    this.status.setText('');

    let title: string;
    let color = '#ffffff';
    if (winner === 0) {
      title = 'Draw';
    } else if (this.mode === 'ai') {
      title = winner === 1 ? 'You win!' : 'CPU wins';
      color = '#' + (winner === 1 ? COLORS.p1 : COLORS.p2).toString(16).padStart(6, '0');
    } else {
      title = winner === 1 ? 'Player 1 wins!' : 'Player 2 wins!';
      color = '#' + (winner === 1 ? COLORS.p1 : COLORS.p2).toString(16).padStart(6, '0');
    }

    this.time.delayedCall(700, () =>
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

