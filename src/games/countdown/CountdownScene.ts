import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, COLORS } from '../../core/config';
import { Ads } from '../../core/ads/AdManager';
import { audio } from '../../core/audio/AudioManager';
import { addBackButton } from '../../core/ui/Hud';
import { showResult } from '../../core/ui/ResultOverlay';
import { GameMode } from '../types';
import { ensureSoleActiveScene } from '../../core/ui/NavGuard';
import { setupSceneScale } from '../../core/scale';

const BG = 0x1a0840;
const START = 30;
const WIN_ROUNDS = 2;
const TOP_H = 68;
const BOT_H = 68;
const MID_Y = GAME_HEIGHT / 2;

export class CountdownScene extends Phaser.Scene {
  private mode: GameMode = 'ai';
  private p1Count = START;
  private p2Count = START;
  private roundWins = [0, 0];
  private over = false;
  private roundOver = false;
  private p1Text!: Phaser.GameObjects.Text;
  private p2Text!: Phaser.GameObjects.Text;
  private p1WinsText!: Phaser.GameObjects.Text;
  private p2WinsText!: Phaser.GameObjects.Text;
  private statusText!: Phaser.GameObjects.Text;
  private aiTimer?: Phaser.Time.TimerEvent;

  constructor() { super('Countdown'); }

  init(data: { mode?: GameMode }): void { this.mode = data?.mode ?? 'ai'; }

  create(): void {
    ensureSoleActiveScene(this);
    setupSceneScale(this);
    this.over = false;
    this.roundWins = [0, 0];
    this.cameras.main.setBackgroundColor(BG);

    // Player strips
    this.add.rectangle(GAME_WIDTH / 2, TOP_H / 2, GAME_WIDTH, TOP_H, COLORS.p2, 0.88);
    this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT - BOT_H / 2, GAME_WIDTH, BOT_H, COLORS.p1, 0.88);

    // Dividing line
    this.add.line(0, 0, 0, MID_Y, GAME_WIDTH, MID_Y, 0xffffff, 0.15).setOrigin(0).setLineWidth(1);

    // Zone tint
    this.add.rectangle(GAME_WIDTH / 2, (TOP_H + MID_Y) / 2, GAME_WIDTH, MID_Y - TOP_H, COLORS.p2, 0.07);
    this.add.rectangle(GAME_WIDTH / 2, (MID_Y + GAME_HEIGHT - BOT_H) / 2, GAME_WIDTH, GAME_HEIGHT - BOT_H - MID_Y, COLORS.p1, 0.07);

    const label = { fontFamily: 'Arial Black, Arial', fontSize: '15px', color: '#ffffff' };
    const winsStyle = { fontFamily: 'Arial Black, Arial', fontSize: '22px', color: '#ffffff' };
    this.add.text(16, TOP_H / 2, this.mode === 'ai' ? 'CPU' : 'P2', label).setOrigin(0, 0.5).setAngle(180).setDepth(5);
    this.add.text(16, GAME_HEIGHT - BOT_H / 2, 'P1', label).setOrigin(0, 0.5).setDepth(5);
    this.p2WinsText = this.add.text(GAME_WIDTH - 16, TOP_H / 2, '0 wins', winsStyle).setOrigin(1, 0.5).setAngle(180).setDepth(5);
    this.p1WinsText = this.add.text(GAME_WIDTH - 16, GAME_HEIGHT - BOT_H / 2, '0 wins', winsStyle).setOrigin(1, 0.5).setDepth(5);

    addBackButton(this, () => this.toHub(false)).setY(GAME_HEIGHT - BOT_H / 2);

    // Big countdown numbers
    const numStyle = { fontFamily: 'Arial Black, Arial', fontSize: '96px', color: '#ffffff' };
    this.p2Text = this.add.text(GAME_WIDTH / 2, (TOP_H + MID_Y) / 2, String(START), numStyle).setOrigin(0.5).setAngle(180).setDepth(5);
    this.p1Text = this.add.text(GAME_WIDTH / 2, (MID_Y + GAME_HEIGHT - BOT_H) / 2, String(START), numStyle).setOrigin(0.5).setDepth(5);

    this.statusText = this.add.text(GAME_WIDTH / 2, MID_Y, 'Tap to count down!', {
      fontFamily: 'Arial Black, Arial', fontSize: '17px', color: '#ffffff',
    }).setOrigin(0.5).setDepth(10);

    // Tap zones
    const p1Zone = this.add.rectangle(GAME_WIDTH / 2, (MID_Y + GAME_HEIGHT - BOT_H) / 2, GAME_WIDTH, GAME_HEIGHT - BOT_H - MID_Y, 0xffffff, 0.001).setInteractive({ useHandCursor: true });
    p1Zone.on('pointerdown', () => this.tap(1));

    if (this.mode === '2p') {
      const p2Zone = this.add.rectangle(GAME_WIDTH / 2, (TOP_H + MID_Y) / 2, GAME_WIDTH, MID_Y - TOP_H, 0xffffff, 0.001).setInteractive({ useHandCursor: true });
      p2Zone.on('pointerdown', () => this.tap(2));
    } else {
      this.scheduleAI();
    }

    this.startRound();
  }

  private startRound(): void {
    this.p1Count = START;
    this.p2Count = START;
    this.roundOver = false;
    this.p1Text.setText(String(START));
    this.p2Text.setText(String(START));
    this.statusText.setText('Tap to count down!');
  }

  private scheduleAI(): void {
    if (this.over || this.roundOver) return;
    this.aiTimer = this.time.delayedCall(Phaser.Math.Between(60, 140), () => {
      if (!this.over && !this.roundOver) {
        this.tap(2);
        this.scheduleAI();
      }
    });
  }

  private tap(player: number): void {
    if (this.over || this.roundOver) return;
    if (player === 1) {
      this.p1Count--;
      this.p1Text.setText(String(this.p1Count));
      this.tweens.add({ targets: this.p1Text, scale: 1.18, duration: 60, yoyo: true });
      audio.click();
      if (this.p1Count <= 0) this.roundEnd(1);
    } else {
      this.p2Count--;
      this.p2Text.setText(String(this.p2Count));
      this.tweens.add({ targets: this.p2Text, scale: 1.18, duration: 60, yoyo: true });
      if (this.mode === '2p') audio.click();
      if (this.p2Count <= 0) this.roundEnd(2);
    }
  }

  private roundEnd(winner: number): void {
    this.roundOver = true;
    this.aiTimer?.remove(false);
    this.roundWins[winner - 1]++;
    this.p1WinsText.setText(`${this.roundWins[0]} wins`);
    this.p2WinsText.setText(`${this.roundWins[1]} wins`);
    audio.goal();
    this.cameras.main.flash(180, 200, 200, 60);
    const who = winner === 1 ? 'P1' : (this.mode === 'ai' ? 'CPU' : 'P2');
    this.statusText.setText(`${who} wins the round!`);

    if (this.roundWins[0] >= WIN_ROUNDS || this.roundWins[1] >= WIN_ROUNDS) {
      this.over = true;
      this.time.delayedCall(600, () => this.endMatch());
    } else {
      this.time.delayedCall(1200, () => {
        this.startRound();
        if (this.mode === 'ai') this.scheduleAI();
      });
    }
  }

  private endMatch(): void {
    const p1won = this.roundWins[0] > this.roundWins[1];
    const title = this.mode === 'ai'
      ? (p1won ? 'You win!' : 'CPU wins')
      : (p1won ? 'Player 1 wins!' : 'Player 2 wins!');
    p1won ? audio.win() : audio.lose();
    showResult(this, {
      title,
      subtitle: `${this.roundWins[0]} – ${this.roundWins[1]} rounds`,
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
