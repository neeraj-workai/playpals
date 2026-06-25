import Phaser from 'phaser';
import { GAME_WIDTH, COLORS, GAME_ARENA_BG } from '../../core/config';
import { Ads } from '../../core/ads/AdManager';
import { spawnConfetti, pulseTween, STATUS_STYLE } from '../../core/ui/FxUtils';
import { audio } from '../../core/audio/AudioManager';
import { addBackButton } from '../../core/ui/Hud';
import { showResult } from '../../core/ui/ResultOverlay';
import { GameMode, Difficulty } from '../types';
import { ensureSoleActiveScene } from '../../core/ui/NavGuard';
import { setupSceneScale } from '../../core/scale';

const MID = 366;
const GAME_SECS = 20;

interface Hole {
  x: number;
  y: number;
  side: number; // 1 = bottom (P1), 2 = top (P2/CPU)
  active: boolean;
  mole: Phaser.GameObjects.Text;
  hideEv?: Phaser.Time.TimerEvent;
}

export class WhackScene extends Phaser.Scene {
  private mode: GameMode = 'ai';
  private difficulty: Difficulty = 'medium';
  private holes: Hole[] = [];
  private p1 = 0;
  private p2 = 0;
  private p1Text!: Phaser.GameObjects.Text;
  private p2Text!: Phaser.GameObjects.Text;
  private timeText!: Phaser.GameObjects.Text;
  private timeLeft = GAME_SECS;
  private over = false;
  private spawnTimer?: Phaser.Time.TimerEvent;
  private clockTimer?: Phaser.Time.TimerEvent;

  constructor() {
    super('Whack');
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
    this.timeLeft = GAME_SECS;
    this.over = false;
    this.holes = [];
    this.cameras.main.setBackgroundColor(0x6a0a7a);
    this.add.rectangle(GAME_WIDTH / 2, 0, GAME_WIDTH, 400, 0x9b3dc8, 0.7).setOrigin(0.5, 0);
    this.add.rectangle(GAME_WIDTH / 2, 400, GAME_WIDTH, 300, 0x45085a, 0.7).setOrigin(0.5, 0);

    this.add.rectangle(GAME_WIDTH / 2, (70 + MID) / 2, GAME_WIDTH, MID - 70, COLORS.p2, 0.10);
    this.add.rectangle(GAME_WIDTH / 2, (MID + 700) / 2, GAME_WIDTH, 700 - MID, COLORS.p1, 0.10);

    addBackButton(this, () => this.toHub(false));
    this.p2Text = this.add.text(40, 40, '0', { fontFamily: 'Arial Black, Arial', fontSize: '26px', color: '#' + COLORS.p2.toString(16) }).setOrigin(0.5).setDepth(10);
    this.p1Text = this.add.text(40, 668, '0', { fontFamily: 'Arial Black, Arial', fontSize: '26px', color: '#' + COLORS.p1.toString(16) }).setOrigin(0.5).setDepth(10);
    this.add.text(40, 60, this.mode === 'ai' ? 'CPU' : 'P2', { fontFamily: 'Arial', fontSize: '11px', color: COLORS.inkDim }).setOrigin(0.5);
    this.add.text(40, 648, 'P1', { fontFamily: 'Arial', fontSize: '11px', color: COLORS.inkDim }).setOrigin(0.5);
    this.timeText = this.add.text(GAME_WIDTH / 2, MID, `0:${GAME_SECS}`, { fontFamily: 'Arial Black, Arial', fontSize: '22px', color: '#ffffff' }).setOrigin(0.5).setDepth(10);

    const cols = [100, 200, 300];
    const rowsBySide: Record<number, number[]> = { 2: [150, 270], 1: [470, 590] };
    for (const side of [1, 2]) {
      for (const y of rowsBySide[side]) {
        for (const x of cols) this.makeHole(x, y, side);
      }
    }

    this.spawnTimer = this.time.addEvent({ delay: 620, loop: true, callback: () => this.trySpawn() });
    this.clockTimer = this.time.addEvent({ delay: 1000, loop: true, callback: () => this.tickClock() });
  }

  private makeHole(x: number, y: number, side: number): void {
    this.add.ellipse(x, y + 16, 58, 22, 0x0a0d14, 1).setStrokeStyle(2, 0x2a3550, 1);
    const mole = this.add.text(x, y, '🐹', { fontSize: '38px' }).setOrigin(0.5).setDepth(5).setVisible(false).setScale(0);
    mole.setInteractive({ useHandCursor: true });
    const hole: Hole = { x, y, side, active: false, mole };
    mole.on('pointerdown', () => {
      if (this.over || !hole.active) return;
      if (hole.side === 2 && this.mode === 'ai') return; // CPU's holes aren't player-tappable
      this.whack(hole);
    });
    this.holes.push(hole);
  }

  private trySpawn(): void {
    if (this.over) return;
    for (const side of [1, 2]) {
      const free = this.holes.filter((h) => h.side === side && !h.active);
      if (free.length && Math.random() < 0.8) this.spawn(Phaser.Utils.Array.GetRandom(free));
    }
  }

  private spawn(hole: Hole): void {
    hole.active = true;
    hole.mole.setVisible(true).setScale(0);
    this.tweens.add({ targets: hole.mole, scale: 1, duration: 120, ease: 'Back.easeOut' });
    const dur = Phaser.Math.Between(800, 1300);
    hole.hideEv = this.time.delayedCall(dur, () => { if (hole.active) this.hideMole(hole); });

    const [lo, hi, hitChance] = this.difficulty === 'easy' ? [500, 900, 0.5] : this.difficulty === 'hard' ? [100, 350, 0.95] : [300, 620, 0.75];
    if (this.mode === 'ai' && hole.side === 2 && Math.random() < hitChance) {
      this.time.delayedCall(Phaser.Math.Between(lo, hi), () => { if (hole.active) this.whack(hole); });
    }
  }

  private whack(hole: Hole): void {
    if (!hole.active) return;
    hole.active = false;
    hole.hideEv?.remove(false);
    audio.hit();
    if (hole.side === 1) this.p1++;
    else this.p2++;
    this.p1Text.setText(String(this.p1));
    this.p2Text.setText(String(this.p2));
    pulseTween(this, hole.side === 1 ? this.p1Text : this.p2Text);
    const plus = this.add.text(hole.x, hole.y - 10, '+1', { fontFamily: 'Arial Black, Arial', fontSize: '18px', color: '#ffffff' }).setOrigin(0.5).setDepth(8);
    this.tweens.add({ targets: plus, y: hole.y - 40, alpha: 0, duration: 500, onComplete: () => plus.destroy() });
    this.hideMole(hole);
  }

  private hideMole(hole: Hole): void {
    hole.active = false;
    this.tweens.add({ targets: hole.mole, scale: 0, duration: 110, onComplete: () => hole.mole.setVisible(false) });
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
    let color = '#ffffff';
    if (draw) {
      title = 'Draw';
      audio.bump();
    } else if (this.mode === 'ai') {
      title = p1won ? 'You win!' : 'CPU wins';
      color = '#' + (p1won ? COLORS.p1 : COLORS.p2).toString(16).padStart(6, '0');
      p1won ? audio.win() : audio.lose();
    } else {
      title = p1won ? 'Player 1 wins!' : 'Player 2 wins!';
      color = '#' + (p1won ? COLORS.p1 : COLORS.p2).toString(16).padStart(6, '0');
      audio.win();
    }
    if (!draw) spawnConfetti(this, GAME_WIDTH / 2, 350);
    this.time.delayedCall(500, () =>
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
    this.spawnTimer?.remove(false);
    this.clockTimer?.remove(false);
    if (withAd) void Ads.maybeInterstitial();
    this.scene.start('Hub');
  }
}

