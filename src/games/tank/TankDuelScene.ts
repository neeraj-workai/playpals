import Phaser from 'phaser';
import { GAME_WIDTH, COLORS, GAME_ARENA_BG } from '../../core/config';
import { Ads } from '../../core/ads/AdManager';
import { audio } from '../../core/audio/AudioManager';
import { addBackButton } from '../../core/ui/Hud';
import { showResult } from '../../core/ui/ResultOverlay';
import { GameMode } from '../types';
import { ensureSoleActiveScene } from '../../core/ui/NavGuard';
import { setupSceneScale } from '../../core/scale';

const MID_Y = 384;
const P2_Y = 150; // top tank (CPU / P2)
const P1_Y = 620; // bottom tank (P1)
const TANK_HALF = 26;
const HIT_W = 30;
const SHELL_SPEED = 380;
const FIRE_MS = 900;
const TARGET = 5;

interface Shell {
  go: Phaser.GameObjects.Rectangle;
  vy: number;
  owner: number;
}

export class TankDuelScene extends Phaser.Scene {
  private mode: GameMode = 'ai';
  private p1!: Phaser.GameObjects.Container;
  private p2!: Phaser.GameObjects.Container;
  private shells: Shell[] = [];
  private p1Score = 0;
  private p2Score = 0;
  private p1Text!: Phaser.GameObjects.Text;
  private p2Text!: Phaser.GameObjects.Text;
  private over = false;

  constructor() {
    super('Tank');
  }

  init(data: { mode?: GameMode }): void {
    this.mode = data?.mode ?? 'ai';
  }

  create(): void {
    ensureSoleActiveScene(this);
    setupSceneScale(this);
    this.p1Score = 0;
    this.p2Score = 0;
    this.over = false;
    this.shells = [];
    this.cameras.main.setBackgroundColor(GAME_ARENA_BG);
    this.input.addPointer(2);

    this.add.line(0, 0, 0, MID_Y, GAME_WIDTH, MID_Y, 0xffffff, 0.08).setOrigin(0).setLineWidth(1);

    addBackButton(this, () => this.toHub(false));
    this.p2Text = this.add.text(40, 38, '0', { fontFamily: 'Arial Black, Arial', fontSize: '26px', color: '#' + COLORS.p2.toString(16) }).setOrigin(0.5);
    this.p1Text = this.add.text(360, 38, '0', { fontFamily: 'Arial Black, Arial', fontSize: '26px', color: '#' + COLORS.p1.toString(16) }).setOrigin(0.5);
    this.add.text(40, 58, this.mode === 'ai' ? 'CPU' : 'P2', { fontFamily: 'Arial', fontSize: '11px', color: COLORS.inkDim }).setOrigin(0.5);
    this.add.text(360, 58, 'P1', { fontFamily: 'Arial', fontSize: '11px', color: COLORS.inkDim }).setOrigin(0.5);

    this.p1 = this.makeTank(GAME_WIDTH / 2, P1_Y, COLORS.p1, true);
    this.p2 = this.makeTank(GAME_WIDTH / 2, P2_Y, COLORS.p2, false);

    this.time.addEvent({ delay: FIRE_MS, loop: true, startAt: 300, callback: () => this.fire(1) });
    this.time.addEvent({ delay: FIRE_MS, loop: true, callback: () => this.fire(2) });

    // Tank follows the pointer (mouse move / finger drag) — no need to hold.
    this.input.on('pointermove', this.onPointer, this);
    this.input.on('pointerdown', this.onPointer, this);
  }

  private onPointer(p: Phaser.Input.Pointer): void {
    if (this.over) return;
    if (p.worldY > MID_Y) this.p1.x = Phaser.Math.Clamp(p.worldX, 30, GAME_WIDTH - 30);
    else if (this.mode === '2p') this.p2.x = Phaser.Math.Clamp(p.worldX, 30, GAME_WIDTH - 30);
  }

  private makeTank(x: number, y: number, color: number, up: boolean): Phaser.GameObjects.Container {
    const body = this.add.rectangle(0, 0, 52, 22, color, 1).setStrokeStyle(2, 0x0e1118, 0.4);
    const barrel = this.add.rectangle(0, up ? -16 : 16, 8, 18, color, 1);
    const tread = this.add.rectangle(0, up ? 13 : -13, 52, 6, 0x223, 1).setFillStyle(0x334155, 1);
    return this.add.container(x, y, [tread, body, barrel]).setDepth(5);
  }

  private fire(owner: number): void {
    if (this.over) return;
    const tank = owner === 1 ? this.p1 : this.p2;
    const startY = owner === 1 ? P1_Y - 22 : P2_Y + 22;
    const color = owner === 1 ? COLORS.p1 : COLORS.p2;
    const go = this.add.rectangle(tank.x, startY, 7, 14, color, 1).setDepth(4);
    this.shells.push({ go, vy: owner === 1 ? -SHELL_SPEED : SHELL_SPEED, owner });
    audio.click();
  }

  update(_t: number, delta: number): void {
    if (this.over) return;
    if (this.mode === 'ai') this.aiMove(delta);

    const dt = delta / 1000;
    for (let i = this.shells.length - 1; i >= 0; i--) {
      const s = this.shells[i];
      s.go.y += s.vy * dt;
      if (s.owner === 1 && s.go.y <= P2_Y) {
        this.resolveShell(i, this.p2, 1);
      } else if (s.owner === 2 && s.go.y >= P1_Y) {
        this.resolveShell(i, this.p1, 2);
      } else if (s.go.y < -20 || s.go.y > 720) {
        s.go.destroy();
        this.shells.splice(i, 1);
      }
    }
  }

  private resolveShell(i: number, target: Phaser.GameObjects.Container, owner: number): void {
    const s = this.shells[i];
    const hit = Math.abs(s.go.x - target.x) < HIT_W;
    s.go.destroy();
    this.shells.splice(i, 1);
    if (hit) this.score(owner, target);
  }

  private score(owner: number, target: Phaser.GameObjects.Container): void {
    if (owner === 1) this.p1Score++;
    else this.p2Score++;
    this.p1Text.setText(String(this.p1Score));
    this.p2Text.setText(String(this.p2Score));
    audio.goal();
    this.cameras.main.shake(120, 0.008);
    this.tweens.add({ targets: target, alpha: 0.2, duration: 80, yoyo: true, repeat: 2 });

    if (this.p1Score >= TARGET || this.p2Score >= TARGET) this.endMatch();
  }


  private aiMove(delta: number): void {
    const step = 0.28 * delta;
    let target = this.p1.x; // default: aim at the player
    const incoming = this.shells
      .filter((s) => s.owner === 1 && s.go.y < P2_Y + 220)
      .sort((a, b) => a.go.y - b.go.y)[0];
    if (incoming && Math.abs(incoming.go.x - this.p2.x) < 42) {
      target = this.p2.x < incoming.go.x ? this.p2.x - 70 : this.p2.x + 70; // dodge
    }
    target = Phaser.Math.Clamp(target, 30, GAME_WIDTH - 30);
    const dx = target - this.p2.x;
    this.p2.x += Phaser.Math.Clamp(dx, -step, step);
  }

  private endMatch(): void {
    this.over = true;
    this.shells.forEach((s) => s.go.destroy());
    this.shells = [];
    const p1won = this.p1Score > this.p2Score;
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
        subtitle: `${this.p1Score} – ${this.p2Score}`,
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
