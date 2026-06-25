import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, COLORS } from '../../core/config';
import { spawnConfetti, pulseTween } from '../../core/ui/FxUtils';
import { Ads } from '../../core/ads/AdManager';
import { audio } from '../../core/audio/AudioManager';
import { addBackButton } from '../../core/ui/Hud';
import { showResult } from '../../core/ui/ResultOverlay';
import { GameMode } from '../types';
import { ensureSoleActiveScene } from '../../core/ui/NavGuard';
import { setupSceneScale } from '../../core/scale';

// Split-screen bubble popping race (20s). Bubbles float up on each side;
// tap to pop. Most pops wins. CPU auto-pops with a miss chance.
const MID = GAME_HEIGHT / 2;  // true midpoint
const GAME_SECS = 20;
const SPAWN_MS = 400;
const RISE_PX_S = 85;
const HUD_TOP = 70;
const HUD_BOT = 28;
const BUBBLE_R = 18;

// Palette for coloured bubbles
const BUBBLE_COLORS = [0x74C0FC, 0xF8A5C2, 0xB9F5D0, 0xFFD8A8, 0xD0BFFF];

interface Bubble {
  arc: Phaser.GameObjects.Arc;
  shine: Phaser.GameObjects.Arc;
  side: number;
  vy: number;
  popped: boolean;
}

export class BubblePopScene extends Phaser.Scene {
  private mode: GameMode = 'ai';
  private bubbles: Bubble[] = [];
  private p1 = 0;
  private p2 = 0;
  private p1Text!: Phaser.GameObjects.Text;
  private p2Text!: Phaser.GameObjects.Text;
  private timeText!: Phaser.GameObjects.Text;
  private timeLeft = GAME_SECS;
  private over = false;
  private spawnTimer?: Phaser.Time.TimerEvent;
  private clockTimer?: Phaser.Time.TimerEvent;

  constructor() { super('BubblePop'); }

  init(data: { mode?: GameMode }): void {
    this.mode = data?.mode ?? 'ai';
  }

  create(): void {
    ensureSoleActiveScene(this);
    setupSceneScale(this);
    this.p1 = 0; this.p2 = 0;
    this.timeLeft = GAME_SECS;
    this.over = false;
    this.bubbles = [];
    this.cameras.main.setBackgroundColor(0x0a1a3a);
    this.add.rectangle(GAME_WIDTH / 2, 0, GAME_WIDTH, 400, 0x2050b0, 0.5).setOrigin(0.5, 0);
    this.add.rectangle(GAME_WIDTH / 2, 400, GAME_WIDTH, 400, 0x04101e, 0.5).setOrigin(0.5, 0);

    // Zone backgrounds
    this.add.rectangle(GAME_WIDTH / 2, (HUD_TOP + MID) / 2, GAME_WIDTH, MID - HUD_TOP, COLORS.p2, 0.10);
    this.add.rectangle(GAME_WIDTH / 2, (MID + GAME_HEIGHT - HUD_BOT) / 2, GAME_WIDTH, GAME_HEIGHT - HUD_BOT - MID, COLORS.p1, 0.10);

    // Divider line
    this.add.rectangle(GAME_WIDTH / 2, MID, GAME_WIDTH, 2, 0xffffff, 0.15);

    addBackButton(this, () => this.toHub(false));

    this.p2Text = this.add.text(44, 38, '0', { fontFamily: 'Arial Black, Arial', fontSize: '24px', color: '#' + COLORS.p2.toString(16) }).setOrigin(0.5).setDepth(10);
    this.p1Text = this.add.text(44, GAME_HEIGHT - 34, '0', { fontFamily: 'Arial Black, Arial', fontSize: '24px', color: '#' + COLORS.p1.toString(16) }).setOrigin(0.5).setDepth(10);
    this.add.text(44, 58, this.mode === 'ai' ? 'CPU' : 'P2', { fontFamily: 'Arial', fontSize: '11px', color: COLORS.inkDim }).setOrigin(0.5);
    this.add.text(44, GAME_HEIGHT - 56, 'P1', { fontFamily: 'Arial', fontSize: '11px', color: COLORS.inkDim }).setOrigin(0.5);
    this.timeText = this.add.text(GAME_WIDTH / 2, MID, '0:20', { fontFamily: 'Arial Black, Arial', fontSize: '18px', color: '#ffffff' }).setOrigin(0.5).setDepth(10);

    this.spawnTimer = this.time.addEvent({ delay: SPAWN_MS, loop: true, callback: () => this.spawn() });
    this.clockTimer = this.time.addEvent({ delay: 1000,    loop: true, callback: () => this.tickClock() });
  }

  private spawn(): void {
    if (this.over) return;
    for (const side of [1, 2]) {
      const startY = side === 1 ? GAME_HEIGHT - HUD_BOT - BUBBLE_R : MID - BUBBLE_R;
      const endY   = side === 1 ? MID + BUBBLE_R * 2 : HUD_TOP + BUBBLE_R * 2;
      const x = Phaser.Math.Between(BUBBLE_R + 20, GAME_WIDTH - BUBBLE_R - 20);
      const color = BUBBLE_COLORS[Phaser.Math.Between(0, BUBBLE_COLORS.length - 1)];

      const arc = this.add.arc(x, startY, BUBBLE_R, 0, 360, false, color, 0.82).setDepth(5);
      // small white shine highlight
      const shine = this.add.arc(x - BUBBLE_R * 0.3, startY - BUBBLE_R * 0.3, BUBBLE_R * 0.3, 0, 360, false, 0xffffff, 0.5).setDepth(6);

      arc.setInteractive({ hitArea: new Phaser.Geom.Circle(0, 0, BUBBLE_R), hitAreaCallback: Phaser.Geom.Circle.Contains, useHandCursor: true });

      const bubble: Bubble = { arc, shine, side, vy: -RISE_PX_S, popped: false };

      arc.on('pointerdown', () => {
        if (this.over || bubble.popped) return;
        if (bubble.side === 2 && this.mode === 'ai') return; // CPU's lane
        this.pop(bubble);
      });
      this.bubbles.push(bubble);

      // CPU auto-pops with reaction delay + miss chance
      if (this.mode === 'ai' && side === 2) {
        const delay = Phaser.Math.Between(300, 900);
        this.time.delayedCall(delay, () => { if (!bubble.popped && Math.random() < 0.78) this.pop(bubble); });
      }

      // Clean up bubble when it escapes the top of its zone
      const traverse = Math.abs(endY - startY);
      this.time.delayedCall((traverse / RISE_PX_S) * 1000, () => { if (!bubble.popped) this.escape(bubble); });
    }
  }

  update(_t: number, delta: number): void {
    const dt = delta / 1000;
    for (const b of this.bubbles) {
      if (!b.popped) {
        b.arc.y   += b.vy * dt;
        b.shine.y += b.vy * dt;
      }
    }
  }

  private pop(b: Bubble): void {
    b.popped = true;
    audio.hit();
    if (b.side === 1) this.p1++;
    else this.p2++;
    this.p1Text.setText(String(this.p1));
    this.p2Text.setText(String(this.p2));
    pulseTween(this, b.side === 1 ? this.p1Text : this.p2Text);
    const plus = this.add.text(b.arc.x, b.arc.y - 8, '+1', { fontFamily: 'Arial Black, Arial', fontSize: '15px', color: '#ffffff' }).setOrigin(0.5).setDepth(8);
    this.tweens.add({ targets: plus, y: b.arc.y - 36, alpha: 0, duration: 380, onComplete: () => plus.destroy() });
    this.tweens.add({ targets: [b.arc, b.shine], scale: 1.8, alpha: 0, duration: 120, onComplete: () => { b.arc.destroy(); b.shine.destroy(); } });
  }

  private escape(b: Bubble): void {
    if (b.popped) return;
    b.popped = true;
    this.tweens.add({ targets: [b.arc, b.shine], alpha: 0, duration: 180, onComplete: () => { b.arc.destroy(); b.shine.destroy(); } });
  }

  private tickClock(): void {
    this.timeLeft--;
    this.timeText.setText('0:' + (this.timeLeft < 10 ? '0' : '') + this.timeLeft);
    if (this.timeLeft <= 0) this.endMatch();
  }

  private endMatch(): void {
    this.over = true;
    this.spawnTimer?.remove(false);
    this.clockTimer?.remove(false);
    const p1won = this.p1 > this.p2;
    const draw = this.p1 === this.p2;
    let title: string;
    if (draw) { title = 'Draw'; audio.bump(); }
    else if (this.mode === 'ai') { title = p1won ? 'You win!' : 'CPU wins'; p1won ? audio.win() : audio.lose(); }
    else { title = p1won ? 'Player 1 wins!' : 'Player 2 wins!'; audio.win(); }
    if (!draw) spawnConfetti(this, GAME_WIDTH / 2, GAME_HEIGHT / 2);
    this.time.delayedCall(500, () =>
      showResult(this, {
        title,
        subtitle: `${this.p1} – ${this.p2}`,
        onRematch: () => { void Ads.maybeInterstitial(); this.scene.restart({ mode: this.mode }); },
        onHome: () => this.toHub(true),
      }),
    );
  }

  private toHub(withAd: boolean): void {
    this.spawnTimer?.remove(false);
    this.clockTimer?.remove(false);
    if (withAd) void Ads.maybeInterstitial();
    this.scene.start('Hub');
  }
}
