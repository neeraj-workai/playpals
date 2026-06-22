import Phaser from 'phaser';
import { GAME_WIDTH, COLORS, GAME_ARENA_BG } from '../../core/config';
import { Ads } from '../../core/ads/AdManager';
import { audio } from '../../core/audio/AudioManager';
import { addBackButton } from '../../core/ui/Hud';
import { showResult } from '../../core/ui/ResultOverlay';
import { GameMode } from '../types';
import { ensureSoleActiveScene } from '../../core/ui/NavGuard';
import { setupSceneScale } from '../../core/scale';

const FIELD_TOP = 64;
const FIELD_BOTTOM = 700;
const GOAL_HALF = 75;
const PADDLE_R = 26;
const PUCK_R = 14;
const HIT_SPEED = 540;
const MAX_PUCK = 720;
const TARGET = 7;

export class AirHockeyScene extends Phaser.Scene {
  private mode: GameMode = 'ai';
  private puck!: Phaser.Physics.Arcade.Image;
  private pad1!: Phaser.Physics.Arcade.Image;
  private pad2!: Phaser.Physics.Arcade.Image;
  private p1 = 0;
  private p2 = 0;
  private p1Text!: Phaser.GameObjects.Text;
  private p2Text!: Phaser.GameObjects.Text;
  private over = false;
  private locked = false;
  private readonly midY = (FIELD_TOP + FIELD_BOTTOM) / 2;
  private lastPuck = new Phaser.Math.Vector2();
  private stuckMs = 0;

  constructor() {
    super('AirHockey');
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
    this.locked = false;
    this.cameras.main.setBackgroundColor(0x0f2d52); // dark blue
    this.input.addPointer(2);

    // rink markings
    const g = this.add.graphics().setDepth(0);
    g.lineStyle(3, 0x33405e, 1);
    g.strokeRect(2, FIELD_TOP, GAME_WIDTH - 4, FIELD_BOTTOM - FIELD_TOP);
    g.lineBetween(2, this.midY, GAME_WIDTH - 2, this.midY);
    g.strokeCircle(GAME_WIDTH / 2, this.midY, 56);
    g.fillStyle(COLORS.p2, 0.5).fillRect(GAME_WIDTH / 2 - GOAL_HALF, FIELD_TOP - 2, GOAL_HALF * 2, 7);
    g.fillStyle(COLORS.p1, 0.5).fillRect(GAME_WIDTH / 2 - GOAL_HALF, FIELD_BOTTOM - 5, GOAL_HALF * 2, 7);

    // HUD
    addBackButton(this, () => this.toHub(false));
    this.p2Text = this.add.text(150, 32, '0', { fontFamily: 'Arial Black, Arial', fontSize: '26px', color: '#' + COLORS.p2.toString(16) }).setOrigin(0.5);
    this.add.text(200, 32, ':', { fontFamily: 'Arial Black, Arial', fontSize: '24px', color: '#ffffff' }).setOrigin(0.5);
    this.p1Text = this.add.text(250, 32, '0', { fontFamily: 'Arial Black, Arial', fontSize: '26px', color: '#' + COLORS.p1.toString(16) }).setOrigin(0.5);
    this.add.text(150, 52, this.mode === 'ai' ? 'CPU' : 'P2', { fontFamily: 'Arial', fontSize: '11px', color: COLORS.inkDim }).setOrigin(0.5);
    this.add.text(250, 52, 'P1', { fontFamily: 'Arial', fontSize: '11px', color: COLORS.inkDim }).setOrigin(0.5);

    this.physics.world.setBounds(0, FIELD_TOP, GAME_WIDTH, FIELD_BOTTOM - FIELD_TOP);

    this.puck = this.physics.add.image(GAME_WIDTH / 2, this.midY, 'puck').setTint(0xffffff).setDepth(5);
    (this.puck.body as Phaser.Physics.Arcade.Body).setCircle(PUCK_R);
    this.puck.setCollideWorldBounds(true).setBounce(1, 1);

    this.pad1 = this.makePaddle(GAME_WIDTH / 2, FIELD_BOTTOM - 90, COLORS.p1);
    this.pad2 = this.makePaddle(GAME_WIDTH / 2, FIELD_TOP + 90, COLORS.p2);

    this.physics.add.collider(this.puck, this.pad1, () => this.hit(this.pad1));
    this.physics.add.collider(this.puck, this.pad2, () => this.hit(this.pad2));

    // Paddle follows the pointer â€” moving the mouse (no click needed) or a
    // finger drags the paddle. pointermove fires per-pointer, so two fingers
    // in 2P each control their own half.
    this.input.on('pointermove', this.onPointer, this);
    this.input.on('pointerdown', this.onPointer, this);

    this.lastPuck.set(GAME_WIDTH / 2, this.midY);
    this.time.delayedCall(500, () => this.serve(Math.random() < 0.5 ? 1 : 2));
  }

  private onPointer(p: Phaser.Input.Pointer): void {
    if (this.over) return;
    if (p.worldY > this.midY) this.movePaddle(this.pad1, p.worldX, p.worldY, true);
    else if (this.mode === '2p') this.movePaddle(this.pad2, p.worldX, p.worldY, false);
  }

  private makePaddle(x: number, y: number, color: number): Phaser.Physics.Arcade.Image {
    const p = this.physics.add.image(x, y, 'paddle').setTint(color).setDepth(6);
    const body = p.body as Phaser.Physics.Arcade.Body;
    body.setCircle(PADDLE_R);
    body.setImmovable(true);
    body.allowGravity = false;
    return p;
  }

  private serve(toPlayer: number): void {
    this.puck.setPosition(GAME_WIDTH / 2, this.midY);
    const vx = Phaser.Math.Between(-120, 120);
    const vy = (toPlayer === 1 ? 1 : -1) * Phaser.Math.Between(180, 240);
    this.puck.setVelocity(vx, vy);
    this.locked = false;
  }

  private hit(pad: Phaser.Physics.Arcade.Image): void {
    const dx = this.puck.x - pad.x;
    const dy = this.puck.y - pad.y;
    const d = Math.hypot(dx, dy) || 1;
    this.puck.setVelocity((dx / d) * HIT_SPEED, (dy / d) * HIT_SPEED);
    audio.hit();
  }

  update(_time: number, delta: number): void {
    if (this.over) return;
    if (this.mode === 'ai') this.aiMove(delta);
    this.clampPuck();
    this.antiStuck(delta);
    this.checkGoals();
  }

  // Keep the puck alive: if it barely moves (pinned in a corner against a
  // paddle, or crawling) for too long, fling it back toward centre.
  private antiStuck(delta: number): void {
    if (this.locked) return;
    const body = this.puck.body as Phaser.Physics.Arcade.Body;
    const moved = Phaser.Math.Distance.Between(this.puck.x, this.puck.y, this.lastPuck.x, this.lastPuck.y);
    const speed = body.velocity.length();

    if (moved < 6 || speed < 90) {
      this.stuckMs += delta;
      if (this.stuckMs > 450) {
        this.puck.x = Phaser.Math.Clamp(this.puck.x, 36, GAME_WIDTH - 36);
        this.puck.y = Phaser.Math.Clamp(this.puck.y, FIELD_TOP + 36, FIELD_BOTTOM - 36);
        const dir = new Phaser.Math.Vector2(GAME_WIDTH / 2 - this.puck.x, this.midY - this.puck.y);
        if (dir.lengthSq() < 1) dir.set(Phaser.Math.Between(-1, 1) || 1, Phaser.Math.Between(-1, 1) || 1);
        dir.normalize().scale(340);
        body.setVelocity(dir.x, dir.y);
        this.stuckMs = 0;
      }
    } else {
      this.stuckMs = 0;
    }
    this.lastPuck.set(this.puck.x, this.puck.y);
  }

  private movePaddle(pad: Phaser.Physics.Arcade.Image, x: number, y: number, isP1: boolean): void {
    pad.x = Phaser.Math.Clamp(x, PADDLE_R, GAME_WIDTH - PADDLE_R);
    const yTop = isP1 ? this.midY + PADDLE_R : FIELD_TOP + PADDLE_R;
    const yBot = isP1 ? FIELD_BOTTOM - PADDLE_R : this.midY - PADDLE_R;
    pad.y = Phaser.Math.Clamp(y, yTop, yBot);
  }

  private aiMove(delta: number): void {
    const step = 0.26 * delta; // ~260 px/s â€” beatable
    let tx = this.puck.x;
    let ty: number;
    if (this.puck.y < this.midY) {
      ty = Math.min(this.puck.y, this.midY - 40); // attack the puck in its half
    } else {
      tx = GAME_WIDTH / 2; // retreat & guard the goal
      ty = FIELD_TOP + 90;
    }
    const dx = tx - this.pad2.x;
    const dy = ty - this.pad2.y;
    const d = Math.hypot(dx, dy);
    if (d > step) this.movePaddle(this.pad2, this.pad2.x + (dx / d) * step, this.pad2.y + (dy / d) * step, false);
    else this.movePaddle(this.pad2, tx, ty, false);
  }

  private clampPuck(): void {
    const v = (this.puck.body as Phaser.Physics.Arcade.Body).velocity;
    const sp = v.length();
    if (sp > MAX_PUCK) v.scale(MAX_PUCK / sp);
  }

  private checkGoals(): void {
    if (this.locked) return;
    const inMouth = Math.abs(this.puck.x - GAME_WIDTH / 2) < GOAL_HALF;
    if (this.puck.y < FIELD_TOP + 32 && inMouth) this.score(1);
    else if (this.puck.y > FIELD_BOTTOM - 32 && inMouth) this.score(2);
  }

  private score(winner: number): void {
    this.locked = true;
    if (winner === 1) this.p1++;
    else this.p2++;
    this.p1Text.setText(String(this.p1));
    this.p2Text.setText(String(this.p2));
    audio.goal();
    this.cameras.main.flash(150, 255, 255, 255);
    this.puck.setVelocity(0, 0);
    this.puck.setPosition(GAME_WIDTH / 2, this.midY);

    if (this.p1 >= TARGET || this.p2 >= TARGET) {
      this.endMatch();
      return;
    }
    this.time.delayedCall(700, () => this.serve(winner));
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
    this.time.delayedCall(400, () =>
      showResult(this, {
        title,
        titleColor: color,
        subtitle: `${this.p1} â€“ ${this.p2}`,
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

