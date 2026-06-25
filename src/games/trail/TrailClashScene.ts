import Phaser from 'phaser';
import { GAME_WIDTH, COLORS } from '../../core/config';
import { spawnConfetti, pulseTween, STATUS_STYLE } from '../../core/ui/FxUtils';
import { Ads } from '../../core/ads/AdManager';
import { audio } from '../../core/audio/AudioManager';
import { addBackButton } from '../../core/ui/Hud';
import { showResult } from '../../core/ui/ResultOverlay';
import { GameMode } from '../types';
import { ensureSoleActiveScene } from '../../core/ui/NavGuard';
import { setupSceneScale } from '../../core/scale';

const CELL = 20;
const X0 = 20;
const Y0 = 100;
const COLS = 18;
const ROWS = 28;
const MID_Y = Y0 + (ROWS * CELL) / 2;
const STEP_MS = 115;
const TARGET = 3;

// up, right, down, left
const DIRS = [
  [-1, 0], [0, 1], [1, 0], [0, -1],
];

interface Cycle {
  r: number;
  c: number;
  dir: number;
  pending: number;
}

export class TrailClashScene extends Phaser.Scene {
  private mode: GameMode = 'ai';
  private occ: boolean[][] = [];
  private c1!: Cycle;
  private c2!: Cycle;
  private trail: Phaser.GameObjects.Rectangle[] = [];
  private head1!: Phaser.GameObjects.Rectangle;
  private head2!: Phaser.GameObjects.Rectangle;
  private tick?: Phaser.Time.TimerEvent;
  private p1 = 0;
  private p2 = 0;
  private p1Text!: Phaser.GameObjects.Text;
  private p2Text!: Phaser.GameObjects.Text;
  private status!: Phaser.GameObjects.Text;
  private locked = true;
  private over = false;

  constructor() {
    super('Trail');
  }

  init(data: { mode?: GameMode }): void {
    this.mode = data?.mode ?? 'ai';
  }

  create(): void {
    ensureSoleActiveScene(this);
    setupSceneScale(this);
    this.p1 = 0;
    this.p2 = 0;
    this.over = false;
    this.cameras.main.setBackgroundColor(0x0a3d40);
    this.add.rectangle(GAME_WIDTH / 2, 0, GAME_WIDTH, 400, 0x1a8090, 0.5).setOrigin(0.5, 0);
    this.add.rectangle(GAME_WIDTH / 2, 400, GAME_WIDTH, 400, 0x041e20, 0.5).setOrigin(0.5, 0);

    this.add.rectangle(GAME_WIDTH / 2, MID_Y, COLS * CELL + 6, ROWS * CELL + 6, 0x141a26, 1).setStrokeStyle(2, 0x33405e, 1);

    addBackButton(this, () => this.toHub(false));
    this.p2Text = this.add.text(60, 40, '0', { fontFamily: 'Arial Black, Arial', fontSize: '24px', color: '#' + COLORS.p2.toString(16) }).setOrigin(0.5);
    this.p1Text = this.add.text(340, 40, '0', { fontFamily: 'Arial Black, Arial', fontSize: '24px', color: '#' + COLORS.p1.toString(16) }).setOrigin(0.5);
    this.add.text(60, 60, this.mode === 'ai' ? 'CPU' : 'P2', { fontFamily: 'Arial', fontSize: '11px', color: COLORS.inkDim }).setOrigin(0.5);
    this.add.text(340, 60, 'P1', { fontFamily: 'Arial', fontSize: '11px', color: COLORS.inkDim }).setOrigin(0.5);

    this.status = this.add.text(GAME_WIDTH / 2, MID_Y, '', { ...STATUS_STYLE, fontSize: '20px', align: 'center' }).setOrigin(0.5).setDepth(20);

    this.head1 = this.add.rectangle(0, 0, CELL - 2, CELL - 2, COLORS.p1, 1).setStrokeStyle(2, 0xffffff, 0.9).setDepth(5).setVisible(false);
    this.head2 = this.add.rectangle(0, 0, CELL - 2, CELL - 2, COLORS.p2, 1).setStrokeStyle(2, 0xffffff, 0.9).setDepth(5).setVisible(false);

    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      if (this.over || this.locked || p.worldY < 70) return;
      if (p.worldY > MID_Y) this.steer(this.c1, p.worldX < GAME_WIDTH / 2);
      else if (this.mode === '2p') this.steer(this.c2, p.worldX < GAME_WIDTH / 2);
    });

    this.startRound();
  }

  private gx(c: number): number {
    return X0 + c * CELL + CELL / 2;
  }
  private gy(r: number): number {
    return Y0 + r * CELL + CELL / 2;
  }

  private steer(cy: Cycle, left: boolean): void {
    cy.pending = left ? (cy.dir + 3) % 4 : (cy.dir + 1) % 4;
  }

  private startRound(): void {
    this.trail.forEach((t) => t.destroy());
    this.trail = [];
    this.occ = Array.from({ length: ROWS }, () => new Array(COLS).fill(false));

    this.c1 = { r: ROWS - 3, c: 6, dir: 0, pending: 0 };
    this.c2 = { r: 2, c: 11, dir: 2, pending: 2 };
    this.mark(this.c1, COLORS.p1);
    this.mark(this.c2, COLORS.p2);
    this.head1.setPosition(this.gx(this.c1.c), this.gy(this.c1.r)).setVisible(true);
    this.head2.setPosition(this.gx(this.c2.c), this.gy(this.c2.r)).setVisible(true);

    this.locked = true;
    this.status.setText('Tap your side\nto turn');
    this.time.delayedCall(900, () => {
      if (this.over) return;
      this.status.setText('');
      this.locked = false;
      this.tick = this.time.addEvent({ delay: STEP_MS, loop: true, callback: () => this.step() });
    });
  }

  private mark(cy: Cycle, color: number): void {
    this.occ[cy.r][cy.c] = true;
    this.trail.push(this.add.rectangle(this.gx(cy.c), this.gy(cy.r), CELL - 2, CELL - 2, color, 1).setDepth(2));
  }

  private valid(r: number, c: number): boolean {
    return r >= 0 && r < ROWS && c >= 0 && c < COLS && !this.occ[r][c];
  }

  private step(): void {
    if (this.over || this.locked) return;
    this.c1.dir = this.c1.pending;
    if (this.mode === '2p') this.c2.dir = this.c2.pending;
    else this.aiThink();

    const n1r = this.c1.r + DIRS[this.c1.dir][0];
    const n1c = this.c1.c + DIRS[this.c1.dir][1];
    const n2r = this.c2.r + DIRS[this.c2.dir][0];
    const n2c = this.c2.c + DIRS[this.c2.dir][1];

    let dead1 = !this.valid(n1r, n1c);
    let dead2 = !this.valid(n2r, n2c);
    if (n1r === n2r && n1c === n2c) dead1 = dead2 = true; // head-on

    if (dead1 || dead2) {
      this.roundEnd(dead1, dead2);
      return;
    }

    this.c1.r = n1r; this.c1.c = n1c;
    this.c2.r = n2r; this.c2.c = n2c;
    this.mark(this.c1, COLORS.p1);
    this.mark(this.c2, COLORS.p2);
    this.head1.setPosition(this.gx(n1c), this.gy(n1r));
    this.head2.setPosition(this.gx(n2c), this.gy(n2r));
  }

  private aiThink(): void {
    const options = [this.c2.dir, (this.c2.dir + 3) % 4, (this.c2.dir + 1) % 4];
    let best = this.c2.dir;
    let bestScore = -1;
    for (const d of options) {
      const nr = this.c2.r + DIRS[d][0];
      const nc = this.c2.c + DIRS[d][1];
      if (!this.valid(nr, nc)) continue;
      const score = this.openness(nr, nc) + Math.random() * 0.6;
      if (score > bestScore) {
        bestScore = score;
        best = d;
      }
    }
    this.c2.dir = best;
  }

  private openness(r: number, c: number): number {
    let n = 0;
    for (const [dr, dc] of DIRS) if (this.valid(r + dr, c + dc)) n++;
    return n;
  }

  private roundEnd(dead1: boolean, dead2: boolean): void {
    this.locked = true;
    this.tick?.remove(false);
    audio.bump();
    this.cameras.main.shake(160, 0.01);

    if (dead1 && dead2) {
      this.status.setText('Draw round');
      this.time.delayedCall(1100, () => { if (!this.over) this.startRound(); });
      return;
    }
    const winner = dead1 ? 2 : 1;
    if (winner === 1) this.p1++;
    else this.p2++;
    this.p1Text.setText(String(this.p1));
    this.p2Text.setText(String(this.p2));
    pulseTween(this, winner === 1 ? this.p1Text : this.p2Text);

    if (this.p1 >= TARGET || this.p2 >= TARGET) {
      this.time.delayedCall(700, () => this.endMatch());
    } else {
      this.status.setText(winner === 1 ? 'P1 survives!' : this.mode === 'ai' ? 'CPU survives!' : 'P2 survives!');
      this.time.delayedCall(1100, () => { if (!this.over) this.startRound(); });
    }
  }

  private endMatch(): void {
    this.over = true;
    this.tick?.remove(false);
    const p1won = this.p1 > this.p2;
    let title: string;
    if (this.mode === 'ai') {
      title = p1won ? 'You win!' : 'CPU wins';
      p1won ? audio.win() : audio.lose();
    } else {
      title = p1won ? 'Player 1 wins!' : 'Player 2 wins!';
      audio.win();
    }
    const color = '#' + (p1won ? COLORS.p1 : COLORS.p2).toString(16).padStart(6, '0');
    spawnConfetti(this, GAME_WIDTH / 2, MID_Y);
    showResult(this, {
      title,
      titleColor: color,
      subtitle: `${this.p1} – ${this.p2}`,
      onRematch: () => { void Ads.maybeInterstitial(); this.scene.restart({ mode: this.mode }); },
      onHome: () => this.toHub(true),
    });
  }

  private toHub(withAd: boolean): void {
    this.tick?.remove(false);
    if (withAd) void Ads.maybeInterstitial();
    this.scene.start('Hub');
  }
}

