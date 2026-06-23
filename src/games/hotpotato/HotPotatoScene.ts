import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, COLORS, GAME_ARENA_BG } from '../../core/config';
import { Ads } from '../../core/ads/AdManager';
import { audio } from '../../core/audio/AudioManager';
import { addBackButton } from '../../core/ui/Hud';
import { showResult } from '../../core/ui/ResultOverlay';
import { GameMode, Difficulty } from '../types';
import { ensureSoleActiveScene } from '../../core/ui/NavGuard';
import { setupSceneScale } from '../../core/scale';

// UNIQUE reaction game: a bomb with a hidden fuse is whacked between the two
// sides. Whoever is holding it when the fuse runs out loses the round. The
// trick: whack it away the instant it lands on your side. First to 3 rounds.
const MID_Y = 384;
const TOP_Y = 210;
const BOT_Y = 540;
const TARGET = 3;

export class HotPotatoScene extends Phaser.Scene {
  private mode: GameMode = 'ai';
  private difficulty: Difficulty = 'medium';
  private bomb!: Phaser.GameObjects.Text;
  private holder = 1; // 1 = bottom, 2 = top
  private traveling = false;
  private fuseEnd = 0;
  private aiWhackAt = 0;
  private p1 = 0;
  private p2 = 0;
  private p1Text!: Phaser.GameObjects.Text;
  private p2Text!: Phaser.GameObjects.Text;
  private status!: Phaser.GameObjects.Text;
  private locked = true;
  private over = false;

  constructor() {
    super('HotPotato');
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
    this.locked = true;
    this.cameras.main.setBackgroundColor(0x3d3000); // dark yellow

    this.add.rectangle(GAME_WIDTH / 2, (64 + MID_Y) / 2, GAME_WIDTH, MID_Y - 64, COLORS.p2, 0.12);
    this.add.rectangle(GAME_WIDTH / 2, (MID_Y + GAME_HEIGHT) / 2, GAME_WIDTH, GAME_HEIGHT - MID_Y, COLORS.p1, 0.12);
    this.add.line(0, 0, 0, MID_Y, GAME_WIDTH, MID_Y, 0xffffff, 0.2).setOrigin(0).setLineWidth(1);

    addBackButton(this, () => this.toHub(false));
    this.p2Text = this.add.text(GAME_WIDTH / 2, 40, '0', { fontFamily: 'Arial Black, Arial', fontSize: '28px', color: '#' + COLORS.p2.toString(16) }).setOrigin(0.5);
    this.p1Text = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT - 34, '0', { fontFamily: 'Arial Black, Arial', fontSize: '28px', color: '#' + COLORS.p1.toString(16) }).setOrigin(0.5);
    this.add.text(GAME_WIDTH / 2, 66, this.mode === 'ai' ? 'CPU' : 'P2', { fontFamily: 'Arial', fontSize: '12px', color: COLORS.inkDim }).setOrigin(0.5);
    this.add.text(GAME_WIDTH / 2, GAME_HEIGHT - 58, 'P1', { fontFamily: 'Arial', fontSize: '12px', color: COLORS.inkDim }).setOrigin(0.5);

    this.status = this.add.text(GAME_WIDTH / 2, MID_Y, '', { fontFamily: 'Arial Black, Arial', fontSize: '20px', color: '#ffffff' }).setOrigin(0.5).setDepth(20);
    this.bomb = this.add.text(GAME_WIDTH / 2, BOT_Y, '🧨', { fontSize: '60px' }).setOrigin(0.5).setDepth(10);

    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      if (this.over || this.locked || this.traveling || p.worldY < 70) return;
      if (p.worldY > MID_Y) this.whack(1);
      else if (this.mode === '2p') this.whack(2);
    });

    this.startRound();
  }

  private startRound(): void {
    this.holder = Math.random() < 0.5 ? 1 : 2;
    this.bomb.setPosition(GAME_WIDTH / 2, this.holder === 1 ? BOT_Y : TOP_Y).setScale(1).setTint(0xffffff);
    this.traveling = false;
    this.locked = false;
    this.fuseEnd = this.time.now + Phaser.Math.Between(3500, 7500);
    this.scheduleAi();
    this.status.setText('Whack it away!');
    this.time.delayedCall(700, () => { if (!this.over) this.status.setText(''); });
  }

  private scheduleAi(): void {
    if (this.mode === 'ai' && this.holder === 2 && !this.traveling) {
      const [lo, hi] = this.difficulty === 'easy' ? [500, 1100] : this.difficulty === 'hard' ? [100, 350] : [260, 720];
      this.aiWhackAt = this.time.now + Phaser.Math.Between(lo, hi);
    } else {
      this.aiWhackAt = 0;
    }
  }

  private whack(bySide: number): void {
    if (this.traveling || this.over || this.locked || bySide !== this.holder) return;
    this.traveling = true;
    this.aiWhackAt = 0;
    const targetY = this.holder === 1 ? TOP_Y : BOT_Y;
    audio.hit();
    this.tweens.add({ targets: this.bomb, y: targetY, duration: 200, ease: 'Quad.easeOut' });
    this.tweens.add({ targets: this.bomb, angle: this.holder === 1 ? -360 : 360, duration: 200 });
    this.time.delayedCall(200, () => {
      this.bomb.setAngle(0);
      this.holder = this.holder === 1 ? 2 : 1;
      this.traveling = false;
      this.scheduleAi();
    });
  }

  update(): void {
    if (this.over || this.locked) return;

    if (this.aiWhackAt > 0 && this.time.now >= this.aiWhackAt && this.holder === 2 && !this.traveling) {
      this.whack(2);
    }

    const remaining = this.fuseEnd - this.time.now;
    if (remaining <= 0) {
      this.explode();
      return;
    }
    // tension: pulse + redden in the final stretch
    if (remaining < 1500 && !this.traveling) {
      const pulse = 1 + 0.12 * Math.sin(this.time.now / 60);
      this.bomb.setScale(pulse);
      this.bomb.setTint(0xff7777);
    }
  }

  private explode(): void {
    this.locked = true;
    const loser = this.holder;
    const winner = loser === 1 ? 2 : 1;
    if (winner === 1) this.p1++;
    else this.p2++;
    this.p1Text.setText(String(this.p1));
    this.p2Text.setText(String(this.p2));

    audio.bump();
    this.cameras.main.shake(250, 0.018);
    const boom = this.add.text(this.bomb.x, this.bomb.y, '💥', { fontSize: '80px' }).setOrigin(0.5).setDepth(15);
    this.bomb.setVisible(false);
    this.time.delayedCall(500, () => boom.destroy());

    const who = this.mode === 'ai' ? (loser === 1 ? 'You got caught!' : 'CPU caught!') : `P${loser} caught!`;
    this.status.setText(who);

    if (this.p1 >= TARGET || this.p2 >= TARGET) {
      this.time.delayedCall(900, () => this.endMatch());
    } else {
      this.time.delayedCall(1100, () => { this.bomb.setVisible(true); this.status.setText(''); this.startRound(); });
    }
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
    const color = '#' + (p1won ? COLORS.p1 : COLORS.p2).toString(16).padStart(6, '0');
    showResult(this, {
      title,
      titleColor: color,
      subtitle: `${this.p1} – ${this.p2}`,
      onRematch: () => { void Ads.maybeInterstitial(); this.scene.restart({ mode: this.mode, difficulty: this.difficulty }); },
      onHome: () => this.toHub(true),
    });
  }

  private toHub(withAd: boolean): void {
    if (withAd) void Ads.maybeInterstitial();
    this.scene.start('Hub');
  }
}

