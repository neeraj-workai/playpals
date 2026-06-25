import Phaser from 'phaser';
import { GAME_WIDTH, COLORS } from '../../core/config';
import { spawnConfetti, pulseTween } from '../../core/ui/FxUtils';
import { Ads } from '../../core/ads/AdManager';
import { audio } from '../../core/audio/AudioManager';
import { addBackButton } from '../../core/ui/Hud';
import { showResult } from '../../core/ui/ResultOverlay';
import { GameMode, Difficulty } from '../types';
import { ensureSoleActiveScene } from '../../core/ui/NavGuard';
import { setupSceneScale } from '../../core/scale';

const CX = GAME_WIDTH / 2;
const CY = 400;
const RING = 165;
const SUMO_R = 30;
const DASH = 400;
const DRAG = 340;
const COOLDOWN = 280;
const TARGET = 5;

type Body = Phaser.Physics.Arcade.Body;

export class SumoScene extends Phaser.Scene {
  private mode: GameMode = 'ai';
  private difficulty: Difficulty = 'medium';
  private s1!: Phaser.Physics.Arcade.Image;
  private s2!: Phaser.Physics.Arcade.Image;
  private p1 = 0;
  private p2 = 0;
  private p1Text!: Phaser.GameObjects.Text;
  private p2Text!: Phaser.GameObjects.Text;
  private over = false;
  private locked = false;
  private cd1 = 0;
  private cd2 = 0;

  constructor() {
    super('Sumo');
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
    this.locked = false;
    this.cameras.main.setBackgroundColor(0x1c0e4a);
    this.add.rectangle(GAME_WIDTH / 2, 0, GAME_WIDTH, 400, 0x5a28c8, 0.55).setOrigin(0.5, 0);
    this.add.rectangle(GAME_WIDTH / 2, 400, GAME_WIDTH, 400, 0x0e0530, 0.55).setOrigin(0.5, 0);

    this.add.circle(CX, CY, RING, COLORS.panelLight, 1).setStrokeStyle(5, 0x4b5a7a, 1);
    this.add.circle(CX, CY, RING - 26, 0x000000, 0).setStrokeStyle(2, 0x3a4767, 1);
    this.add.circle(CX, CY, 6, 0x4b5a7a, 1);

    addBackButton(this, () => this.toHub(false));
    this.p2Text = this.add.text(CX, 40, '0', { fontFamily: 'Arial Black, Arial', fontSize: '30px', color: '#' + COLORS.p2.toString(16) }).setOrigin(0.5);
    this.p1Text = this.add.text(CX, 672, '0', { fontFamily: 'Arial Black, Arial', fontSize: '30px', color: '#' + COLORS.p1.toString(16) }).setOrigin(0.5);
    this.add.text(CX, 66, this.mode === 'ai' ? 'CPU' : 'P2', { fontFamily: 'Arial', fontSize: '12px', color: COLORS.inkDim }).setOrigin(0.5);
    this.add.text(CX, 648, 'P1', { fontFamily: 'Arial', fontSize: '12px', color: COLORS.inkDim }).setOrigin(0.5);

    this.s1 = this.makeSumo(CX, CY + 70, COLORS.p1);
    this.s2 = this.makeSumo(CX, CY - 70, COLORS.p2);
    this.physics.add.collider(this.s1, this.s2);

    const tip = this.add
      .text(CX, CY, 'Tap your side\nto charge!', { fontFamily: 'Arial', fontSize: '16px', color: '#ffffff', align: 'center' })
      .setOrigin(0.5)
      .setAlpha(0.8);
    this.time.delayedCall(1500, () => tip.destroy());

    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      if (this.over || this.locked || p.worldY < 70) return;
      if (p.worldY > CY) this.dash(this.s1, this.s2, 1);
      else if (this.mode === '2p') this.dash(this.s2, this.s1, 2);
    });

    if (this.mode === 'ai') {
      const delay = this.difficulty === 'easy' ? 1400 : this.difficulty === 'hard' ? 300 : 700;
      this.time.addEvent({
        delay,
        loop: true,
        callback: () => {
          if (!this.over && !this.locked) this.dash(this.s2, this.s1, 2);
        },
      });
    }
  }

  private makeSumo(x: number, y: number, color: number): Phaser.Physics.Arcade.Image {
    const s = this.physics.add.image(x, y, 'sumo').setTint(color).setDepth(5);
    const body = s.body as Body;
    body.setCircle(SUMO_R);
    body.setBounce(1, 1);
    body.setDrag(DRAG, DRAG);
    body.setMass(1);
    body.allowGravity = false;
    return s;
  }

  private dash(self: Phaser.Physics.Arcade.Image, opp: Phaser.Physics.Arcade.Image, side: number): void {
    const now = this.time.now;
    if (side === 1) {
      if (now - this.cd1 < COOLDOWN) return;
      this.cd1 = now;
    } else {
      if (now - this.cd2 < COOLDOWN) return;
      this.cd2 = now;
    }
    const dx = opp.x - self.x;
    const dy = opp.y - self.y;
    const d = Math.hypot(dx, dy) || 1;
    (self.body as Body).setVelocity((dx / d) * DASH, (dy / d) * DASH);
    audio.hit();
    this.tweens.add({ targets: self, scaleX: 1.18, scaleY: 0.86, duration: 90, yoyo: true });
  }

  update(): void {
    if (this.over || this.locked) return;
    const out1 = Phaser.Math.Distance.Between(CX, CY, this.s1.x, this.s1.y) > RING + 4;
    const out2 = Phaser.Math.Distance.Between(CX, CY, this.s2.x, this.s2.y) > RING + 4;
    if (out1) this.ringOut(2);
    else if (out2) this.ringOut(1);
  }

  private ringOut(winner: number): void {
    this.locked = true;
    if (winner === 1) this.p1++;
    else this.p2++;
    this.p1Text.setText(String(this.p1));
    this.p2Text.setText(String(this.p2));
    pulseTween(this, winner === 1 ? this.p1Text : this.p2Text);
    audio.bump();
    this.cameras.main.shake(160, 0.01);

    if (this.p1 >= TARGET || this.p2 >= TARGET) {
      this.endMatch();
      return;
    }
    this.time.delayedCall(650, () => this.reset());
  }

  private reset(): void {
    (this.s1.body as Body).setVelocity(0, 0);
    (this.s2.body as Body).setVelocity(0, 0);
    this.s1.setPosition(CX, CY + 70).setScale(1);
    this.s2.setPosition(CX, CY - 70).setScale(1);
    this.locked = false;
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
    spawnConfetti(this, CX, CY);
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
    if (withAd) void Ads.maybeInterstitial();
    this.scene.start('Hub');
  }
}

