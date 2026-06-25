import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, COLORS } from '../../core/config';
import { spawnConfetti, pulseTween } from '../../core/ui/FxUtils';
import { Ads } from '../../core/ads/AdManager';
import { audio } from '../../core/audio/AudioManager';
import { addBackButton } from '../../core/ui/Hud';
import { showResult } from '../../core/ui/ResultOverlay';
import { GameMode, Difficulty } from '../types';
import { ensureSoleActiveScene } from '../../core/ui/NavGuard';
import { setupSceneScale } from '../../core/scale';

const BG = 0x03182a;
const TOP_H = 68;
const BOT_H = 68;
const PADDLE_Y1 = GAME_HEIGHT - BOT_H - 22;  // P1 paddle y
const PADDLE_Y2 = TOP_H + 22;                 // P2 paddle y
const PADDLE_W = 88;
const PADDLE_H = 14;
const BALL_R = 11;
const SCORE_LIMIT = 7;
const GRAVITY_FLIP_MS = 5000;
const BASE_SPEED = 210;

export class GravityPongScene extends Phaser.Scene {
  private mode: GameMode = 'ai';
  private difficulty: Difficulty = 'medium';
  private p1 = 0;
  private p2 = 0;
  private bx = 0; private by = 0;
  private bvx = 0; private bvy = 0;
  private gravity = 0;      // px/s² positive = downward
  private gravFlipped = false;
  private over = false;
  private ball!: Phaser.GameObjects.Arc;
  private p1Paddle!: Phaser.GameObjects.Rectangle;
  private p2Paddle!: Phaser.GameObjects.Rectangle;
  private p1ScoreText!: Phaser.GameObjects.Text;
  private p2ScoreText!: Phaser.GameObjects.Text;
  private gravText!: Phaser.GameObjects.Text;
  private gravTimer?: Phaser.Time.TimerEvent;

  constructor() { super('GravityPong'); }
  init(data: { mode?: GameMode; difficulty?: Difficulty }): void { this.mode = data?.mode ?? 'ai'; this.difficulty = data?.difficulty ?? 'medium'; }

  create(): void {
    ensureSoleActiveScene(this);
    setupSceneScale(this);
    this.p1 = 0; this.p2 = 0; this.over = false;
    this.cameras.main.setBackgroundColor(BG);
    this.add.rectangle(GAME_WIDTH / 2, 0, GAME_WIDTH, 400, 0x0a4a6a, 0.55).setOrigin(0.5, 0);
    this.add.rectangle(GAME_WIDTH / 2, 400, GAME_WIDTH, 400, 0x020a14, 0.55).setOrigin(0.5, 0);

    // Player strips
    this.add.rectangle(GAME_WIDTH / 2, TOP_H / 2, GAME_WIDTH, TOP_H, COLORS.p2, 0.88);
    this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT - BOT_H / 2, GAME_WIDTH, BOT_H, COLORS.p1, 0.88);

    const label = { fontFamily: 'Arial Black, Arial', fontSize: '15px', color: '#ffffff' };
    const scoreStyle = { fontFamily: 'Arial Black, Arial', fontSize: '30px', color: '#ffffff' };
    this.add.text(GAME_WIDTH / 2, TOP_H / 2, this.mode === 'ai' ? 'CPU' : 'P2', label).setOrigin(0.5, 0.5).setAngle(180).setDepth(5);
    this.add.text(GAME_WIDTH / 2, GAME_HEIGHT - BOT_H / 2, 'P1', label).setOrigin(0.5, 0.5).setDepth(5);
    this.p2ScoreText = this.add.text(GAME_WIDTH - 16, TOP_H / 2, '0', scoreStyle).setOrigin(1, 0.5).setAngle(180).setDepth(5);
    this.p1ScoreText = this.add.text(GAME_WIDTH - 16, GAME_HEIGHT - BOT_H / 2, '0', scoreStyle).setOrigin(1, 0.5).setDepth(5);

    addBackButton(this, () => this.toHub(false)).setY(GAME_HEIGHT - BOT_H / 2);

    // Center net
    this.add.line(0, 0, 0, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT / 2, 0xffffff, 0.12).setOrigin(0).setLineWidth(1);

    // Gravity indicator
    this.gravText = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2, '↓ gravity', {
      fontFamily: 'Arial Black, Arial', fontSize: '14px', color: '#67e8f9cc',
    }).setOrigin(0.5).setDepth(5);

    // Paddles
    this.p1Paddle = this.add.rectangle(GAME_WIDTH / 2, PADDLE_Y1, PADDLE_W, PADDLE_H, COLORS.p1, 1).setDepth(4);
    this.p2Paddle = this.add.rectangle(GAME_WIDTH / 2, PADDLE_Y2, PADDLE_W, PADDLE_H, COLORS.p2, 1).setDepth(4);

    // Ball
    this.ball = this.add.circle(0, 0, BALL_R, 0xffffff, 1).setDepth(6);

    // Pointer for paddle control
    this.input.on('pointermove', (ptr: Phaser.Input.Pointer) => {
      if (this.over) return;
      if (ptr.worldY > GAME_HEIGHT / 2) {
        this.p1Paddle.x = Phaser.Math.Clamp(ptr.worldX, PADDLE_W / 2, GAME_WIDTH - PADDLE_W / 2);
      } else if (this.mode === '2p') {
        this.p2Paddle.x = Phaser.Math.Clamp(ptr.worldX, PADDLE_W / 2, GAME_WIDTH - PADDLE_W / 2);
      }
    });
    this.input.on('pointerdown', (ptr: Phaser.Input.Pointer) => {
      if (this.over) return;
      if (ptr.worldY > GAME_HEIGHT / 2) {
        this.p1Paddle.x = Phaser.Math.Clamp(ptr.worldX, PADDLE_W / 2, GAME_WIDTH - PADDLE_W / 2);
      } else if (this.mode === '2p') {
        this.p2Paddle.x = Phaser.Math.Clamp(ptr.worldX, PADDLE_W / 2, GAME_WIDTH - PADDLE_W / 2);
      }
    });

    this.launchBall();
    this.scheduleGravFlip();
  }

  private launchBall(): void {
    this.bx = GAME_WIDTH / 2;
    this.by = GAME_HEIGHT / 2;
    this.gravity = 220;
    this.gravFlipped = false;
    this.gravText.setText('↓ gravity').setColor('#67e8f9cc');
    const angle = Phaser.Math.Between(30, 60) * (Math.random() < 0.5 ? 1 : -1);
    const dir = Math.random() < 0.5 ? 1 : -1;
    this.bvx = Math.cos(Phaser.Math.DegToRad(angle)) * BASE_SPEED * (Math.random() < 0.5 ? 1 : -1);
    this.bvy = Math.sin(Phaser.Math.DegToRad(45)) * BASE_SPEED * dir;
  }

  private scheduleGravFlip(): void {
    this.gravTimer?.remove(false);
    this.gravTimer = this.time.addEvent({
      delay: GRAVITY_FLIP_MS,
      loop: true,
      callback: () => {
        if (this.over) return;
        this.gravity *= -1;
        this.gravFlipped = !this.gravFlipped;
        this.gravText.setText(this.gravFlipped ? '↑ gravity' : '↓ gravity');
        this.gravText.setColor(this.gravFlipped ? '#fca5a5cc' : '#67e8f9cc');
        this.cameras.main.shake(120, 0.004);
        audio.beep();
      },
    });
  }

  update(_t: number, delta: number): void {
    if (this.over) return;
    const dt = delta / 1000;

    // CPU paddle tracking
    if (this.mode === 'ai') {
      const cpuSpeed = this.difficulty === 'easy' ? 90 : this.difficulty === 'hard' ? 260 : 160;
      const diff = this.bx - this.p2Paddle.x;
      this.p2Paddle.x = Phaser.Math.Clamp(
        this.p2Paddle.x + Phaser.Math.Clamp(diff, -cpuSpeed * dt, cpuSpeed * dt),
        PADDLE_W / 2, GAME_WIDTH - PADDLE_W / 2
      );
    }

    this.bvy += this.gravity * dt;
    this.bx += this.bvx * dt;
    this.by += this.bvy * dt;

    // Wall bounce
    if (this.bx - BALL_R < 0) { this.bx = BALL_R; this.bvx = Math.abs(this.bvx); audio.click(); }
    if (this.bx + BALL_R > GAME_WIDTH) { this.bx = GAME_WIDTH - BALL_R; this.bvx = -Math.abs(this.bvx); audio.click(); }

    // Paddle collisions
    this.checkPaddle(this.p1Paddle, false);
    this.checkPaddle(this.p2Paddle, true);

    // Score zones
    if (this.by > GAME_HEIGHT - BOT_H) { this.score(2); return; }
    if (this.by < TOP_H) { this.score(1); return; }

    this.ball.setPosition(this.bx, this.by);
  }

  private checkPaddle(paddle: Phaser.GameObjects.Rectangle, isTop: boolean): void {
    const half = PADDLE_W / 2;
    const inX = this.bx > paddle.x - half && this.bx < paddle.x + half;
    if (!inX) return;

    if (!isTop && this.bvy > 0 && this.by + BALL_R > PADDLE_Y1 - PADDLE_H / 2 && this.by < PADDLE_Y1) {
      this.by = PADDLE_Y1 - PADDLE_H / 2 - BALL_R;
      const speed = Math.min(Math.hypot(this.bvx, this.bvy) * 1.05, 500);
      const angle = ((this.bx - paddle.x) / half) * 60;
      this.bvx = Math.sin(Phaser.Math.DegToRad(angle)) * speed;
      this.bvy = -Math.abs(Math.cos(Phaser.Math.DegToRad(angle)) * speed);
      audio.hit();
    }
    if (isTop && this.bvy < 0 && this.by - BALL_R < PADDLE_Y2 + PADDLE_H / 2 && this.by > PADDLE_Y2) {
      this.by = PADDLE_Y2 + PADDLE_H / 2 + BALL_R;
      const speed = Math.min(Math.hypot(this.bvx, this.bvy) * 1.05, 500);
      const angle = ((this.bx - paddle.x) / half) * 60;
      this.bvx = Math.sin(Phaser.Math.DegToRad(angle)) * speed;
      this.bvy = Math.abs(Math.cos(Phaser.Math.DegToRad(angle)) * speed);
      audio.hit();
    }
  }

  private score(scorer: number): void {
    if (scorer === 1) { this.p1++; this.p1ScoreText.setText(String(this.p1)); pulseTween(this, this.p1ScoreText); }
    else { this.p2++; this.p2ScoreText.setText(String(this.p2)); pulseTween(this, this.p2ScoreText); }
    audio.goal();
    this.cameras.main.flash(160, 255, 255, 255);
    if (this.p1 >= SCORE_LIMIT || this.p2 >= SCORE_LIMIT) {
      this.over = true;
      this.gravTimer?.remove(false);
      this.time.delayedCall(500, () => this.endMatch());
    } else {
      this.time.delayedCall(600, () => this.launchBall());
    }
  }

  private endMatch(): void {
    const p1won = this.p1 > this.p2;
    const title = this.mode === 'ai'
      ? (p1won ? 'You win!' : 'CPU wins')
      : (p1won ? 'Player 1 wins!' : 'Player 2 wins!');
    p1won ? audio.win() : audio.lose();
    spawnConfetti(this, GAME_WIDTH / 2, GAME_HEIGHT / 2);
    showResult(this, {
      title,
      subtitle: `${this.p1} – ${this.p2}`,
      onRematch: () => { void Ads.maybeInterstitial(); this.scene.restart({ mode: this.mode, difficulty: this.difficulty }); },
      onHome: () => this.toHub(true),
    });
  }

  private toHub(withAd: boolean): void {
    this.gravTimer?.remove(false);
    if (withAd) void Ads.maybeInterstitial();
    this.scene.start('Hub');
  }
}
