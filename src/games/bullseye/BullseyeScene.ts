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

const CENTER_Y = 384;
const X0 = 60;
const TRACK_W = 280;
const PERIOD = 1100;
const TARGET = 3;

export class BullseyeScene extends Phaser.Scene {
  private mode: GameMode = 'ai';
  private phase: 'play' | 'resolved' = 'resolved';
  private p1Locked = false;
  private p2Locked = false;
  private p1val = 0;
  private p2val = 0;
  private p1Wins = 0;
  private p2Wins = 0;
  private marker!: Phaser.GameObjects.Rectangle;
  private status!: Phaser.GameObjects.Text;
  private p1Text!: Phaser.GameObjects.Text;
  private p2Text!: Phaser.GameObjects.Text;
  private pegs: Phaser.GameObjects.GameObject[] = [];
  private aiTimer?: Phaser.Time.TimerEvent;
  private failTimer?: Phaser.Time.TimerEvent;

  constructor() {
    super('Bullseye');
  }

  init(data: { mode?: GameMode }): void {
    this.mode = data?.mode ?? 'ai';
  }

  create(): void {
    ensureSoleActiveScene(this);
    setupSceneScale(this);
    this.p1Wins = 0;
    this.p2Wins = 0;
    this.phase = 'resolved';
    this.pegs = [];
    this.cameras.main.setBackgroundColor(0x1a0a40);
    this.add.rectangle(GAME_WIDTH / 2, 0, GAME_WIDTH, 400, 0x5030c0, 0.5).setOrigin(0.5, 0);
    this.add.rectangle(GAME_WIDTH / 2, 400, GAME_WIDTH, 400, 0x0a0520, 0.5).setOrigin(0.5, 0);

    addBackButton(this, () => this.toHub(false));
    this.add.text(GAME_WIDTH / 2, 120, 'Stop on the gold — first to 3', { fontFamily: 'Arial', fontSize: '13px', color: COLORS.inkDim }).setOrigin(0.5);
    this.p2Text = this.add.text(GAME_WIDTH / 2, 168, '0', { fontFamily: 'Arial Black, Arial', fontSize: '30px', color: '#' + COLORS.p2.toString(16) }).setOrigin(0.5);
    this.p1Text = this.add.text(GAME_WIDTH / 2, 600, '0', { fontFamily: 'Arial Black, Arial', fontSize: '30px', color: '#' + COLORS.p1.toString(16) }).setOrigin(0.5);
    this.add.text(GAME_WIDTH / 2, 196, this.mode === 'ai' ? 'CPU' : 'P2', { fontFamily: 'Arial', fontSize: '12px', color: COLORS.inkDim }).setOrigin(0.5);
    this.add.text(GAME_WIDTH / 2, 628, 'P1', { fontFamily: 'Arial', fontSize: '12px', color: COLORS.inkDim }).setOrigin(0.5);

    this.add.rectangle(X0 + TRACK_W / 2, CENTER_Y, TRACK_W, 10, COLORS.panelLight, 1).setStrokeStyle(1, 0x33405e, 1);
    this.add.rectangle(this.xFor(0.5), CENTER_Y, 26, 46, 0xfacc15, 0.25).setStrokeStyle(2, 0xfacc15, 0.8);
    this.marker = this.add.rectangle(this.xFor(0.5), CENTER_Y, 4, 42, 0xffffff, 1).setDepth(5);

    this.status = this.add.text(GAME_WIDTH / 2, CENTER_Y + 96, '', { ...STATUS_STYLE, fontSize: '20px', align: 'center' }).setOrigin(0.5);

    this.add.rectangle(GAME_WIDTH / 2, 540, GAME_WIDTH, 290, 0xffffff, 0.001).setInteractive().on('pointerdown', () => this.lock(1));
    if (this.mode === '2p') {
      this.add.rectangle(GAME_WIDTH / 2, 215, GAME_WIDTH, 290, 0xffffff, 0.001).setInteractive().on('pointerdown', () => this.lock(2));
    }

    this.startRound();
  }

  private value(t: number): number {
    const ph = (t % PERIOD) / PERIOD;
    return ph < 0.5 ? ph * 2 : 2 - ph * 2;
  }
  private xFor(v: number): number {
    return X0 + v * TRACK_W;
  }

  private startRound(): void {
    this.p1Locked = false;
    this.p2Locked = false;
    this.pegs.forEach((p) => p.destroy());
    this.pegs = [];
    this.status.setText(this.mode === '2p' ? 'Both tap your side!' : 'Tap to stop!');
    this.phase = 'play';

    if (this.mode === 'ai') {
      this.aiTimer = this.time.delayedCall(Phaser.Math.Between(900, 2300), () => {
        if (this.p2Locked || this.phase !== 'play') return;
        const err = Phaser.Math.FloatBetween(0.02, 0.2) * (Math.random() < 0.5 ? 1 : -1);
        this.commit(2, Phaser.Math.Clamp(0.5 + err, 0, 1));
      });
    }
    this.failTimer = this.time.delayedCall(5500, () => {
      if (this.phase !== 'play') return;
      if (!this.p1Locked) this.lock(1);
      if (!this.p2Locked) this.lock(2);
    });
  }

  update(): void {
    if (this.phase !== 'play') return;
    this.marker.x = this.xFor(this.value(this.time.now));
  }

  private lock(side: number): void {
    if (this.phase !== 'play') return;
    if (side === 1 && this.p1Locked) return;
    if (side === 2 && this.p2Locked) return;
    this.commit(side, this.value(this.time.now));
  }

  private commit(side: number, v: number): void {
    if (side === 1) {
      this.p1Locked = true;
      this.p1val = v;
    } else {
      this.p2Locked = true;
      this.p2val = v;
    }
    audio.click();
    const y = side === 1 ? CENTER_Y + 24 : CENTER_Y - 24;
    const color = side === 1 ? COLORS.p1 : COLORS.p2;
    this.pegs.push(this.add.rectangle(this.xFor(v), y, 7, 22, color, 1).setDepth(6));
    if (this.p1Locked && this.p2Locked) this.resolve();
  }

  private resolve(): void {
    this.phase = 'resolved';
    this.aiTimer?.remove(false);
    this.failTimer?.remove(false);

    const e1 = Math.abs(this.p1val - 0.5);
    const e2 = Math.abs(this.p2val - 0.5);
    const winner = e1 < e2 ? 1 : e2 < e1 ? 2 : 0;

    if (winner === 0) {
      this.status.setText('Dead heat — replay');
      this.time.delayedCall(1200, () => this.startRound());
      return;
    }
    if (winner === 1) this.p1Wins++;
    else this.p2Wins++;
    this.p1Text.setText(String(this.p1Wins));
    this.p2Text.setText(String(this.p2Wins));
    pulseTween(this, winner === 1 ? this.p1Text : this.p2Text);

    const bull = Math.min(e1, e2) < 0.035;
    const who = this.mode === 'ai' ? (winner === 1 ? 'You' : 'CPU') : `P${winner}`;
    this.status.setText(bull ? `${who} — Bullseye!` : `${who} closer!`);
    audio.goal();

    if (this.p1Wins >= TARGET || this.p2Wins >= TARGET) this.time.delayedCall(900, () => this.endMatch());
    else this.time.delayedCall(1200, () => this.startRound());
  }

  private endMatch(): void {
    const p1won = this.p1Wins > this.p2Wins;
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
    showResult(this, {
      title,
      titleColor: color,
      subtitle: `${this.p1Wins} – ${this.p2Wins}`,
      onRematch: () => { void Ads.maybeInterstitial(); this.scene.restart({ mode: this.mode }); },
      onHome: () => this.toHub(true),
    });
  }

  private toHub(withAd: boolean): void {
    this.aiTimer?.remove(false);
    this.failTimer?.remove(false);
    if (withAd) void Ads.maybeInterstitial();
    this.scene.start('Hub');
  }
}
