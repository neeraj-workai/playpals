import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, COLORS, GAME_ARENA_BG } from '../../core/config';
import { Ads } from '../../core/ads/AdManager';
import { audio } from '../../core/audio/AudioManager';
import { addBackButton } from '../../core/ui/Hud';
import { showResult } from '../../core/ui/ResultOverlay';
import { GameMode } from '../types';
import { ensureSoleActiveScene } from '../../core/ui/NavGuard';
import { setupSceneScale } from '../../core/scale';

const NEUTRAL = 0x334155;
const RED = 0xb91c1c;
const GREEN = 0x16a34a;
const TARGET = 3; // first to 3 round wins

type Phase = 'intro' | 'waiting' | 'go' | 'resolved';

export class QuickDrawScene extends Phaser.Scene {
  private mode: GameMode = 'ai';
  private phase: Phase = 'intro';
  private p1 = 0;
  private p2 = 0;
  private greenAt = 0;

  private topPanel!: Phaser.GameObjects.Rectangle;
  private botPanel!: Phaser.GameObjects.Rectangle;
  private status!: Phaser.GameObjects.Text;
  private topScore!: Phaser.GameObjects.Text;
  private botScore!: Phaser.GameObjects.Text;
  private greenTimer?: Phaser.Time.TimerEvent;
  private aiTimer?: Phaser.Time.TimerEvent;

  constructor() {
    super('QuickDraw');
  }

  init(data: { mode?: GameMode }): void {
    this.mode = data?.mode ?? 'ai';
  }

  create(): void {
    ensureSoleActiveScene(this);
    setupSceneScale(this);
    this.phase = 'intro';
    this.p1 = 0;
    this.p2 = 0;
    this.cameras.main.setBackgroundColor(GAME_ARENA_BG);

    const topLabel = this.mode === 'ai' ? 'CPU' : 'P2';
    this.topPanel = this.add.rectangle(GAME_WIDTH / 2, 212, GAME_WIDTH, 296, NEUTRAL, 1);
    this.botPanel = this.add.rectangle(GAME_WIDTH / 2, 536, GAME_WIDTH, 328, NEUTRAL, 1);

    this.add.text(GAME_WIDTH / 2, 110, topLabel, { fontFamily: 'Arial Black, Arial', fontSize: '20px', color: '#ffffff' }).setOrigin(0.5).setAngle(180).setDepth(5);
    this.topScore = this.add.text(GAME_WIDTH / 2, 150, '0', { fontFamily: 'Arial Black, Arial', fontSize: '40px', color: '#ffffff' }).setOrigin(0.5).setAngle(180).setDepth(5);
    this.add.text(GAME_WIDTH / 2, 660, 'P1', { fontFamily: 'Arial Black, Arial', fontSize: '20px', color: '#ffffff' }).setOrigin(0.5).setDepth(5);
    this.botScore = this.add.text(GAME_WIDTH / 2, 620, '0', { fontFamily: 'Arial Black, Arial', fontSize: '40px', color: '#ffffff' }).setOrigin(0.5).setDepth(5);

    this.status = this.add
      .text(GAME_WIDTH / 2, 372, '', { fontFamily: 'Arial Black, Arial', fontSize: '22px', color: '#ffffff', align: 'center' })
      .setOrigin(0.5)
      .setDepth(10);

    this.botPanel.setInteractive({ useHandCursor: true }).on('pointerdown', () => this.onTap(1));
    if (this.mode === '2p') {
      this.topPanel.setInteractive({ useHandCursor: true }).on('pointerdown', () => this.onTap(2));
    }

    addBackButton(this, () => this.toHub(false));

    this.status.setText('Tap on GREEN.\nFirst one wins!');
    this.time.delayedCall(1100, () => this.startRound());
  }

  private startRound(): void {
    this.phase = 'waiting';
    this.setPanels(RED);
    this.status.setText('Wait for it…');
    const delay = Phaser.Math.Between(1300, 3600);
    this.greenTimer = this.time.delayedCall(delay, () => this.goGreen());
  }

  private goGreen(): void {
    this.phase = 'go';
    this.greenAt = this.time.now;
    this.setPanels(GREEN);
    this.status.setText('GO!');
    audio.beep();
    if (this.mode === 'ai') {
      const reaction = Phaser.Math.Between(260, 680);
      this.aiTimer = this.time.delayedCall(reaction, () => this.resolve(2, false));
    }
  }

  private onTap(player: number): void {
    if (this.phase === 'waiting') {
      this.resolve(player === 1 ? 2 : 1, true); // tapped too early — opponent wins
    } else if (this.phase === 'go') {
      this.resolve(player, false);
    }
  }

  private resolve(winner: number, falseStart: boolean): void {
    if (this.phase === 'resolved' || this.phase === 'intro') return;
    this.phase = 'resolved';
    this.greenTimer?.remove(false);
    this.aiTimer?.remove(false);

    if (winner === 1) this.p1++;
    else this.p2++;
    this.topScore.setText(String(this.p2));
    this.botScore.setText(String(this.p1));

    this.setPanels(NEUTRAL);
    if (falseStart) {
      audio.bump();
      this.status.setText('False start!');
    } else {
      audio.hit();
      const ms = ((this.time.now - this.greenAt) / 1000).toFixed(2);
      const who = this.mode === 'ai' ? (winner === 1 ? 'You' : 'CPU') : `P${winner}`;
      this.status.setText(`${who} won  (${ms}s)`);
    }

    if (this.p1 >= TARGET || this.p2 >= TARGET) {
      this.time.delayedCall(900, () => this.endMatch());
    } else {
      this.time.delayedCall(1200, () => this.startRound());
    }
  }

  private endMatch(): void {
    const p1won = this.p1 > this.p2;
    let title: string;
    let color: string;
    if (this.mode === 'ai') {
      title = p1won ? 'You win!' : 'CPU wins';
      p1won ? audio.win() : audio.lose();
    } else {
      title = p1won ? 'Player 1 wins!' : 'Player 2 wins!';
      audio.win();
    }
    color = '#' + (p1won ? COLORS.p1 : COLORS.p2).toString(16).padStart(6, '0');

    showResult(this, {
      title,
      titleColor: color,
      subtitle: `${this.p1} – ${this.p2}`,
      onRematch: () => { void Ads.maybeInterstitial(); this.scene.restart({ mode: this.mode }); },
      onHome: () => this.toHub(true),
    });
  }

  private setPanels(color: number): void {
    this.topPanel.setFillStyle(color, 1);
    this.botPanel.setFillStyle(color, 1);
  }

  private toHub(withAd: boolean): void {
    this.greenTimer?.remove(false);
    this.aiTimer?.remove(false);
    if (withAd) void Ads.maybeInterstitial();
    this.scene.start('Hub');
  }
}
