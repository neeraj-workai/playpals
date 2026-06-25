import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, COLORS, GAME_ARENA_BG } from '../../core/config';
import { spawnConfetti, pulseTween, STATUS_STYLE } from '../../core/ui/FxUtils';
import { Ads } from '../../core/ads/AdManager';
import { audio } from '../../core/audio/AudioManager';
import { addBackButton } from '../../core/ui/Hud';
import { showResult } from '../../core/ui/ResultOverlay';
import { GameMode, Difficulty } from '../types';
import { ensureSoleActiveScene } from '../../core/ui/NavGuard';
import { setupSceneScale } from '../../core/scale';

// UNIQUE party game: a button-mash tug of war. Tap your half to pull the knot
// toward your edge. First to win 3 pulls takes the match.
const CENTER_Y = 384;
const PULL = 7;
const WIN_DIST = 210; // knot must reach center ± this
const MIN_Y = CENTER_Y - WIN_DIST - 20;
const MAX_Y = CENTER_Y + WIN_DIST + 20;
const TARGET = 3;

export class TugOfWarScene extends Phaser.Scene {
  private mode: GameMode = 'ai';
  private difficulty: Difficulty = 'medium';
  private knot!: Phaser.GameObjects.Container;
  private knotY = CENTER_Y;
  private p1 = 0;
  private p2 = 0;
  private p1Text!: Phaser.GameObjects.Text;
  private p2Text!: Phaser.GameObjects.Text;
  private status!: Phaser.GameObjects.Text;
  private locked = true;
  private over = false;
  private aiTimer?: Phaser.Time.TimerEvent;

  constructor() {
    super('TugOfWar');
  }

  init(data: { mode?: GameMode; difficulty?: Difficulty }): void {
    this.mode = data?.mode ?? 'ai';
    this.difficulty = data?.difficulty ?? 'medium';
  }

  create(): void {
    ensureSoleActiveScene(this);
    setupSceneScale(this);
    this.p1 = 0;
    this.p2 = 0;
    this.knotY = CENTER_Y;
    this.over = false;
    this.locked = true;
    this.cameras.main.setBackgroundColor(0x8a1030);
    this.add.rectangle(GAME_WIDTH / 2, 0, GAME_WIDTH, 400, 0xd4206a, 0.65).setOrigin(0.5, 0);
    this.add.rectangle(GAME_WIDTH / 2, 400, GAME_WIDTH, 300, 0x5a0818, 0.65).setOrigin(0.5, 0);

    this.add.rectangle(GAME_WIDTH / 2, (64 + CENTER_Y) / 2, GAME_WIDTH, CENTER_Y - 64, COLORS.p2, 0.14);
    this.add.rectangle(GAME_WIDTH / 2, (CENTER_Y + GAME_HEIGHT) / 2, GAME_WIDTH, GAME_HEIGHT - CENTER_Y, COLORS.p1, 0.14);

    this.add.line(0, 0, 0, CENTER_Y, GAME_WIDTH, CENTER_Y, 0xffffff, 0.25).setOrigin(0).setLineWidth(1);
    this.add.line(0, 0, 0, CENTER_Y - WIN_DIST, GAME_WIDTH, CENTER_Y - WIN_DIST, COLORS.p2, 0.9).setOrigin(0).setLineWidth(2);
    this.add.line(0, 0, 0, CENTER_Y + WIN_DIST, GAME_WIDTH, CENTER_Y + WIN_DIST, COLORS.p1, 0.9).setOrigin(0).setLineWidth(2);
    this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, 6, MAX_Y - MIN_Y, 0x4b5a7a, 1).setOrigin(0.5).setY((MIN_Y + MAX_Y) / 2);

    const ring = this.add.circle(0, 0, 30, 0xffffff, 1).setStrokeStyle(4, 0x1b2233, 1);
    const label = this.add.text(0, 0, '🪢', { fontSize: '30px' }).setOrigin(0.5);
    this.knot = this.add.container(GAME_WIDTH / 2, this.knotY, [ring, label]).setDepth(5);

    addBackButton(this, () => this.toHub(false));
    this.p2Text = this.add.text(GAME_WIDTH / 2, 40, '0', { fontFamily: 'Arial Black, Arial', fontSize: '28px', color: '#' + COLORS.p2.toString(16) }).setOrigin(0.5);
    this.p1Text = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT - 34, '0', { fontFamily: 'Arial Black, Arial', fontSize: '28px', color: '#' + COLORS.p1.toString(16) }).setOrigin(0.5);
    this.add.text(GAME_WIDTH / 2, 66, this.mode === 'ai' ? 'CPU' : 'P2', { fontFamily: 'Arial', fontSize: '12px', color: COLORS.inkDim }).setOrigin(0.5);
    this.add.text(GAME_WIDTH / 2, GAME_HEIGHT - 58, 'P1', { fontFamily: 'Arial', fontSize: '12px', color: COLORS.inkDim }).setOrigin(0.5);

    this.status = this.add.text(GAME_WIDTH / 2, CENTER_Y - 60, '', { ...STATUS_STYLE, fontSize: '20px' }).setOrigin(0.5);

    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      if (this.over || this.locked || p.worldY < 70) return;
      if (p.worldY > CENTER_Y) this.pull(1);
      else if (this.mode === '2p') this.pull(2);
    });

    this.startRound();
  }

  private startRound(): void {
    this.knotY = CENTER_Y;
    this.knot.setY(this.knotY);
    this.locked = false;
    this.status.setText('Tap fast!');
    this.time.delayedCall(800, () => this.status.setText(''));
    if (this.mode === 'ai') {
      this.aiTimer?.remove(false);
      const aiDelay = this.difficulty === 'easy' ? 330 : this.difficulty === 'hard' ? 75 : 165;
      this.aiTimer = this.time.addEvent({ delay: aiDelay, loop: true, callback: () => { if (!this.locked && !this.over) this.pull(2); } });
    }
  }

  private pull(side: number): void {
    this.knotY += side === 1 ? PULL : -PULL;
    this.knotY = Phaser.Math.Clamp(this.knotY, MIN_Y, MAX_Y);
    this.knot.setY(this.knotY);
    audio.click();
    if (this.knotY >= CENTER_Y + WIN_DIST) this.roundWin(1);
    else if (this.knotY <= CENTER_Y - WIN_DIST) this.roundWin(2);
  }

  private roundWin(winner: number): void {
    this.locked = true;
    this.aiTimer?.remove(false);
    if (winner === 1) this.p1++;
    else this.p2++;
    this.p1Text.setText(String(this.p1));
    this.p2Text.setText(String(this.p2));
    pulseTween(this, winner === 1 ? this.p1Text : this.p2Text);
    audio.goal();
    this.cameras.main.flash(150, 255, 255, 255);

    if (this.p1 >= TARGET || this.p2 >= TARGET) {
      this.endMatch();
      return;
    }
    this.status.setText(winner === 1 ? 'P1 pulls it!' : (this.mode === 'ai' ? 'CPU pulls it!' : 'P2 pulls it!'));
    this.time.delayedCall(1100, () => this.startRound());
  }

  private endMatch(): void {
    this.over = true;
    this.aiTimer?.remove(false);
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
    spawnConfetti(this, GAME_WIDTH / 2, CENTER_Y);
    this.time.delayedCall(400, () =>
      showResult(this, {
        title,
        titleColor: color,
        subtitle: `${this.p1} – ${this.p2}`,
        onRematch: () => { void Ads.maybeInterstitial(); this.scene.restart({ mode: this.mode, difficulty: this.difficulty }); },
        onHome: () => this.toHub(true),
      }),
    );
  }

  private toHub(withAd: boolean): void {
    this.aiTimer?.remove(false);
    if (withAd) void Ads.maybeInterstitial();
    this.scene.start('Hub');
  }
}
