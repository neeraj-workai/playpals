import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, COLORS, GAME_ARENA_BG } from '../../core/config';
import { Ads } from '../../core/ads/AdManager';
import { audio } from '../../core/audio/AudioManager';
import { addBackButton } from '../../core/ui/Hud';
import { showResult } from '../../core/ui/ResultOverlay';
import { GameMode } from '../types';
import { ensureSoleActiveScene } from '../../core/ui/NavGuard';
import { setupSceneScale } from '../../core/scale';

// Turn-based "call it" game. Each turn the current player picks heads or
// tails; the coin spins; correct call = +1; first to TARGET wins.
const TARGET = 5;

export class CoinTossScene extends Phaser.Scene {
  private mode: GameMode = 'ai';
  private current = 1;
  private p1 = 0;
  private p2 = 0;
  private over = false;
  private locked = false;
  private p1Text!: Phaser.GameObjects.Text;
  private p2Text!: Phaser.GameObjects.Text;
  private turnText!: Phaser.GameObjects.Text;
  private resultText!: Phaser.GameObjects.Text;
  private coin!: Phaser.GameObjects.Text;
  private headsBtn!: Phaser.GameObjects.Container;
  private tailsBtn!: Phaser.GameObjects.Container;

  constructor() {
    super('CoinToss');
  }

  init(data: { mode?: GameMode }): void {
    this.mode = data?.mode ?? 'ai';
  }

  create(): void {
    ensureSoleActiveScene(this);
    setupSceneScale(this);
    this.current = 1;
    this.p1 = 0;
    this.p2 = 0;
    this.over = false;
    this.locked = false;
    this.cameras.main.setBackgroundColor(GAME_ARENA_BG);

    addBackButton(this, () => this.toHub(false));
    this.p2Text = this.add.text(60, 40, '0', { fontFamily: 'Arial Black, Arial', fontSize: '26px', color: '#' + COLORS.p2.toString(16) }).setOrigin(0.5);
    this.p1Text = this.add.text(340, 40, '0', { fontFamily: 'Arial Black, Arial', fontSize: '26px', color: '#' + COLORS.p1.toString(16) }).setOrigin(0.5);
    this.add.text(60, 60, this.mode === 'ai' ? 'CPU' : 'P2', { fontFamily: 'Arial', fontSize: '11px', color: COLORS.inkDim }).setOrigin(0.5);
    this.add.text(340, 60, 'P1', { fontFamily: 'Arial', fontSize: '11px', color: COLORS.inkDim }).setOrigin(0.5);

    this.turnText = this.add.text(GAME_WIDTH / 2, 130, '', { fontFamily: 'Arial Black, Arial', fontSize: '20px', color: '#ffffff' }).setOrigin(0.5);
    this.coin = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT * 0.42, '🪙', { fontSize: '110px' }).setOrigin(0.5);
    this.resultText = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT * 0.62, '', { fontFamily: 'Arial Black, Arial', fontSize: '22px', color: '#ffffff' }).setOrigin(0.5);

    this.headsBtn = this.makeBtn(GAME_WIDTH / 2 - 80, GAME_HEIGHT - 90, 'HEADS', COLORS.p1, () => this.call('H'));
    this.tailsBtn = this.makeBtn(GAME_WIDTH / 2 + 80, GAME_HEIGHT - 90, 'TAILS', COLORS.p2, () => this.call('T'));

    this.startTurn();
  }

  private makeBtn(x: number, y: number, label: string, color: number, on: () => void): Phaser.GameObjects.Container {
    const c = this.add.container(x, y);
    const bg = this.add.rectangle(0, 0, 140, 56, color, 1).setInteractive({ useHandCursor: true });
    const txt = this.add.text(0, 0, label, { fontFamily: 'Arial Black, Arial', fontSize: '20px', color: '#ffffff' }).setOrigin(0.5);
    c.add([bg, txt]);
    bg.on('pointerover', () => c.setScale(1.05));
    bg.on('pointerout', () => c.setScale(1));
    bg.on('pointerdown', () => { if (!this.locked) on(); });
    return c;
  }

  private startTurn(): void {
    if (this.over) return;
    this.locked = false;
    const label = this.mode === 'ai'
      ? (this.current === 1 ? 'Your call — heads or tails?' : 'CPU calling…')
      : `P${this.current} — call it`;
    const color = this.current === 1 ? '#' + COLORS.p1.toString(16) : '#' + COLORS.p2.toString(16);
    this.turnText.setText(label).setColor(color);
    this.resultText.setText('');
    this.coin.setText('🪙').setAngle(0);

    const isCpu = this.mode === 'ai' && this.current === 2;
    this.headsBtn.setAlpha(isCpu ? 0.4 : 1);
    this.tailsBtn.setAlpha(isCpu ? 0.4 : 1);
    if (isCpu) {
      this.time.delayedCall(600, () => this.call(Math.random() < 0.5 ? 'H' : 'T'));
    }
  }

  private call(side: 'H' | 'T'): void {
    if (this.locked || this.over) return;
    this.locked = true;
    audio.click();
    this.tweens.add({
      targets: this.coin,
      angle: 720 + Phaser.Math.Between(0, 360),
      scaleX: { from: 1, to: 0.1, yoyo: true },
      duration: 700,
      ease: 'Cubic.easeOut',
      onComplete: () => this.resolve(side),
    });
  }

  private resolve(side: 'H' | 'T'): void {
    const flip: 'H' | 'T' = Math.random() < 0.5 ? 'H' : 'T';
    this.coin.setText(flip === 'H' ? '👑' : '🐉');
    const correct = side === flip;
    if (correct) {
      if (this.current === 1) this.p1++;
      else this.p2++;
      this.p1Text.setText(String(this.p1));
      this.p2Text.setText(String(this.p2));
      audio.goal();
      this.resultText.setText(`${flip === 'H' ? 'Heads' : 'Tails'} — correct!`);
    } else {
      audio.bump();
      this.resultText.setText(`${flip === 'H' ? 'Heads' : 'Tails'} — nope!`);
    }

    if (this.p1 >= TARGET || this.p2 >= TARGET) {
      this.time.delayedCall(900, () => this.endMatch());
      return;
    }
    this.current = this.current === 1 ? 2 : 1;
    this.time.delayedCall(1100, () => this.startTurn());
  }

  private endMatch(): void {
    this.over = true;
    const p1won = this.p1 > this.p2;
    let title: string;
    if (this.mode === 'ai') {
      title = p1won ? 'You win!' : 'CPU wins';
      p1won ? audio.win() : audio.lose();
    } else {
      title = p1won ? 'Player 1 wins!' : 'Player 2 wins!';
      audio.win();
    }
    showResult(this, {
      title,
      subtitle: `${this.p1} – ${this.p2}`,
      onRematch: () => { void Ads.maybeInterstitial(); this.scene.restart({ mode: this.mode }); },
      onHome: () => this.toHub(true),
    });
  }

  private toHub(withAd: boolean): void {
    if (withAd) void Ads.maybeInterstitial();
    this.scene.start('Hub');
  }
}
