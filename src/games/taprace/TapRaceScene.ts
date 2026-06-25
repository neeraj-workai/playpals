import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, COLORS, GAME_ARENA_BG } from '../../core/config';
import { spawnConfetti, pulseTween } from '../../core/ui/FxUtils';
import { Ads } from '../../core/ads/AdManager';
import { audio } from '../../core/audio/AudioManager';
import { addBackButton } from '../../core/ui/Hud';
import { showResult } from '../../core/ui/ResultOverlay';
import { GameMode, Difficulty } from '../types';
import { ensureSoleActiveScene } from '../../core/ui/NavGuard';
import { setupSceneScale } from '../../core/scale';

// Split-screen mash race — first to TARGET taps wins. Top half = P2/CPU,
// bottom half = P1. Big tap buttons fill each half. Fill bars show progress.
const MID = 366;
const TARGET = 50;
const AI_SPEED: Record<string, [number, number]> = { easy: [200, 400], medium: [95, 220], hard: [40, 90] };

export class TapRaceScene extends Phaser.Scene {
  private mode: GameMode = 'ai';
  private difficulty: Difficulty = 'medium';
  private p1 = 0;
  private p2 = 0;
  private p1Bar!: Phaser.GameObjects.Rectangle;
  private p2Bar!: Phaser.GameObjects.Rectangle;
  private p1Text!: Phaser.GameObjects.Text;
  private p2Text!: Phaser.GameObjects.Text;
  private over = false;
  private aiTimer?: Phaser.Time.TimerEvent;

  constructor() {
    super('TapRace');
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
    this.over = false;
    this.cameras.main.setBackgroundColor(0x7a3800);
    this.add.rectangle(GAME_WIDTH / 2, 0, GAME_WIDTH, 400, 0xd4620a, 0.7).setOrigin(0.5, 0);
    this.add.rectangle(GAME_WIDTH / 2, 400, GAME_WIDTH, 300, 0x5c2000, 0.7).setOrigin(0.5, 0);

    // top half (P2/CPU)
    this.add.rectangle(GAME_WIDTH / 2, (70 + MID) / 2, GAME_WIDTH, MID - 70, COLORS.p2, 0.14);
    // bottom half (P1)
    this.add.rectangle(GAME_WIDTH / 2, (MID + GAME_HEIGHT) / 2, GAME_WIDTH, GAME_HEIGHT - MID, COLORS.p1, 0.14);
    this.add.line(0, 0, 0, MID, GAME_WIDTH, MID, 0xffffff, 0.18).setOrigin(0).setLineWidth(1);

    addBackButton(this, () => this.toHub(false));
    this.p2Text = this.add.text(60, 40, '0', { fontFamily: 'Arial Black, Arial', fontSize: '26px', color: '#' + COLORS.p2.toString(16) }).setOrigin(0.5);
    this.p1Text = this.add.text(60, GAME_HEIGHT - 34, '0', { fontFamily: 'Arial Black, Arial', fontSize: '26px', color: '#' + COLORS.p1.toString(16) }).setOrigin(0.5);
    this.add.text(60, 60, this.mode === 'ai' ? 'CPU' : 'P2', { fontFamily: 'Arial', fontSize: '11px', color: COLORS.inkDim }).setOrigin(0.5);
    this.add.text(60, GAME_HEIGHT - 58, 'P1', { fontFamily: 'Arial', fontSize: '11px', color: COLORS.inkDim }).setOrigin(0.5);

    // P2 tap target
    const p2Btn = this.add.text(GAME_WIDTH / 2, (70 + MID) / 2 - 14, '👆 TAP', { fontFamily: 'Arial Black, Arial', fontSize: '32px', color: '#ffffff' }).setOrigin(0.5);
    // P2 bar (right side, vertical)
    this.add.rectangle(GAME_WIDTH - 40, (70 + MID) / 2, 18, MID - 110, 0xffffff, 0.18).setStrokeStyle(2, COLORS.p2, 0.8);
    this.p2Bar = this.add.rectangle(GAME_WIDTH - 40, (70 + MID) / 2 + (MID - 110) / 2, 18, 0, COLORS.p2, 1).setOrigin(0.5, 1);

    // P1 tap target
    const p1Btn = this.add.text(GAME_WIDTH / 2, (MID + GAME_HEIGHT) / 2, '👆 TAP', { fontFamily: 'Arial Black, Arial', fontSize: '32px', color: '#ffffff' }).setOrigin(0.5);
    this.add.rectangle(GAME_WIDTH - 40, (MID + GAME_HEIGHT) / 2, 18, GAME_HEIGHT - MID - 80, 0xffffff, 0.18).setStrokeStyle(2, COLORS.p1, 0.8);
    this.p1Bar = this.add.rectangle(GAME_WIDTH - 40, (MID + GAME_HEIGHT) / 2 + (GAME_HEIGHT - MID - 80) / 2, 18, 0, COLORS.p1, 1).setOrigin(0.5, 1);

    const p1Zone = this.add.rectangle(GAME_WIDTH / 2, (MID + GAME_HEIGHT) / 2, GAME_WIDTH, GAME_HEIGHT - MID, 0xffffff, 0.001).setInteractive({ useHandCursor: true });
    p1Zone.on('pointerdown', () => { if (!this.over) { this.tap(1); this.pulse(p1Btn); } });
    if (this.mode === '2p') {
      const p2Zone = this.add.rectangle(GAME_WIDTH / 2, (70 + MID) / 2, GAME_WIDTH, MID - 70, 0xffffff, 0.001).setInteractive({ useHandCursor: true });
      p2Zone.on('pointerdown', () => { if (!this.over) { this.tap(2); this.pulse(p2Btn); } });
    } else {
      const sched = (): void => {
        if (this.over) return;
        const [lo, hi] = AI_SPEED[this.difficulty];
        this.aiTimer = this.time.delayedCall(Phaser.Math.Between(lo, hi), () => { this.tap(2); this.pulse(p2Btn); sched(); });
      };
      sched();
    }
  }

  private pulse(t: Phaser.GameObjects.Text): void {
    t.setScale(1.15);
    this.tweens.add({ targets: t, scale: 1, duration: 120 });
  }

  private tap(side: number): void {
    if (this.over) return;
    if (side === 1) this.p1++;
    else this.p2++;
    audio.click();
    this.p1Text.setText(String(this.p1));
    this.p2Text.setText(String(this.p2));
    pulseTween(this, side === 1 ? this.p1Text : this.p2Text);
    const p1Track = (GAME_HEIGHT - MID - 80);
    const p2Track = (MID - 110);
    this.p1Bar.height = (this.p1 / TARGET) * p1Track;
    this.p2Bar.height = (this.p2 / TARGET) * p2Track;
    if (this.p1 >= TARGET || this.p2 >= TARGET) this.endMatch();
  }

  private endMatch(): void {
    this.over = true;
    this.aiTimer?.remove(false);
    const p1won = this.p1 >= TARGET;
    let title: string;
    if (this.mode === 'ai') {
      title = p1won ? 'You win! 🎉' : 'CPU wins 🤖';
      p1won ? audio.win() : audio.lose();
    } else {
      title = p1won ? 'Player 1 wins! 🎉' : 'Player 2 wins! 🎉';
      audio.win();
    }
    spawnConfetti(this, GAME_WIDTH / 2, p1won ? GAME_HEIGHT - 150 : 150);
    this.time.delayedCall(400, () =>
      showResult(this, {
        title,
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
