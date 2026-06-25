import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, COLORS } from '../../core/config';
import { spawnConfetti, pulseTween, STATUS_STYLE } from '../../core/ui/FxUtils';
import { Ads } from '../../core/ads/AdManager';
import { audio } from '../../core/audio/AudioManager';
import { addBackButton } from '../../core/ui/Hud';
import { showResult } from '../../core/ui/ResultOverlay';
import { GameMode, Difficulty } from '../types';
import { ensureSoleActiveScene } from '../../core/ui/NavGuard';
import { setupSceneScale } from '../../core/scale';

const TARGET = 5;
const CX = GAME_WIDTH / 2;
const CY = GAME_HEIGHT * 0.42;
const COIN_R = 56;
const RISE = 230;       // px the coin travels upward
const SPIN_DURATION = 1500; // ms
const SPINS = 4;        // full rotations during the toss

export class CoinTossScene extends Phaser.Scene {
  private mode: GameMode = 'ai';
  private difficulty: Difficulty = 'medium';
  private current = 1;
  private p1 = 0;
  private p2 = 0;
  private over = false;
  private locked = false;
  private p1Text!: Phaser.GameObjects.Text;
  private p2Text!: Phaser.GameObjects.Text;
  private turnText!: Phaser.GameObjects.Text;
  private resultText!: Phaser.GameObjects.Text;
  private coinContainer!: Phaser.GameObjects.Container;
  private coinFace!: Phaser.GameObjects.Arc;
  private coinRim!: Phaser.GameObjects.Arc;
  private coinEdge!: Phaser.GameObjects.Arc;
  private coinShine!: Phaser.GameObjects.Arc;
  private coinLabel!: Phaser.GameObjects.Text;
  private headsBtn!: Phaser.GameObjects.Container;
  private tailsBtn!: Phaser.GameObjects.Container;

  constructor() { super('CoinToss'); }

  init(data: { mode?: GameMode; difficulty?: Difficulty }): void {
    this.mode = data?.mode ?? 'ai';
    this.difficulty = data?.difficulty ?? 'medium';
  }

  create(): void {
    ensureSoleActiveScene(this);
    setupSceneScale(this);
    this.current = 1; this.p1 = 0; this.p2 = 0;
    this.over = false; this.locked = false;
    this.cameras.main.setBackgroundColor(0x4a3800);
    this.add.rectangle(GAME_WIDTH / 2, 0, GAME_WIDTH, 400, 0x8a6800, 0.65).setOrigin(0.5, 0);
    this.add.rectangle(GAME_WIDTH / 2, 400, GAME_WIDTH, 300, 0x2a2000, 0.65).setOrigin(0.5, 0);

    addBackButton(this, () => this.toHub(false));

    // Score display
    const scoreStyle = { fontFamily: 'Arial Black, Arial', fontSize: '30px' };
    this.p2Text = this.add.text(70, 44, '0', { ...scoreStyle, color: '#' + COLORS.p2.toString(16) }).setOrigin(0.5);
    this.p1Text = this.add.text(330, 44, '0', { ...scoreStyle, color: '#' + COLORS.p1.toString(16) }).setOrigin(0.5);
    this.add.text(70, 72, this.mode === 'ai' ? 'CPU' : 'P2', { fontFamily: 'Arial', fontSize: '12px', color: '#888888' }).setOrigin(0.5);
    this.add.text(330, 72, 'P1', { fontFamily: 'Arial', fontSize: '12px', color: '#888888' }).setOrigin(0.5);

    this.turnText = this.add.text(CX, 118, '', { ...STATUS_STYLE, fontSize: '18px' }).setOrigin(0.5);

    // Coin built inside a container so we can tween position + scaleX together
    this.coinContainer = this.add.container(CX, CY);

    // Outer edge (slightly larger, dark gold — gives a 3-D rim feel)
    this.coinEdge = this.add.arc(0, 0, COIN_R + 5, 0, 360, false, 0xA07800);
    // Main face
    this.coinFace = this.add.arc(0, 0, COIN_R, 0, 360, false, 0xFFD700);
    // Inner recess
    this.coinRim  = this.add.arc(0, 0, COIN_R - 9, 0, 360, false, 0xE8B800);
    // Small shine highlight (top-left)
    this.coinShine = this.add.arc(-14, -20, 10, 200, 340, false, 0xFFFACC, 0.55);
    // Face label
    this.coinLabel = this.add.text(0, 2, '?', {
      fontFamily: 'Arial Black, Arial', fontSize: '38px', color: '#7A5C00',
    }).setOrigin(0.5);

    this.coinContainer.add([
      this.coinEdge, this.coinFace, this.coinRim, this.coinShine, this.coinLabel,
    ]);

    // Drop-shadow arc behind the container (static, slightly offset)
    this.add.arc(CX + 4, CY + 6, COIN_R + 5, 0, 360, false, 0x000000, 0.22).setDepth(-1);

    this.resultText = this.add.text(CX, GAME_HEIGHT * 0.62, '', {
      fontFamily: 'Arial Black, Arial', fontSize: '22px', color: '#ffffff',
    }).setOrigin(0.5);

    this.headsBtn = this.makeBtn(CX - 88, GAME_HEIGHT - 88, 'HEADS', COLORS.p1, () => this.call('H'));
    this.tailsBtn = this.makeBtn(CX + 88, GAME_HEIGHT - 88, 'TAILS', COLORS.p2, () => this.call('T'));

    this.startTurn();
  }

  private makeBtn(x: number, y: number, label: string, color: number, on: () => void): Phaser.GameObjects.Container {
    const c = this.add.container(x, y);
    const bg = this.add.rectangle(0, 0, 152, 58, color, 1).setInteractive({ useHandCursor: true });
    const txt = this.add.text(0, 0, label, { fontFamily: 'Arial Black, Arial', fontSize: '20px', color: '#ffffff' }).setOrigin(0.5);
    c.add([bg, txt]);
    bg.on('pointerover', () => c.setScale(1.06));
    bg.on('pointerout',  () => c.setScale(1));
    bg.on('pointerdown', () => { if (!this.locked) on(); });
    return c;
  }

  /** Set coin appearance: face character + gold/silver colour scheme */
  private setCoin(face: 'H' | 'T' | '?', gold: boolean): void {
    const fillFace = gold ? 0xFFD700 : 0xC8C8C8;
    const fillRim  = gold ? 0xE8B800 : 0xA8A8A8;
    const fillEdge = gold ? 0xA07800 : 0x787878;
    const textCol  = gold ? '#7A5C00' : '#444444';
    this.coinFace.setFillStyle(fillFace);
    this.coinRim.setFillStyle(fillRim);
    this.coinEdge.setFillStyle(fillEdge);
    this.coinLabel.setText(face).setColor(textCol);
  }

  private startTurn(): void {
    if (this.over) return;
    this.locked = false;

    const label = this.mode === 'ai'
      ? (this.current === 1 ? 'Your call – heads or tails?' : 'CPU calling…')
      : `P${this.current} – call it`;
    const color = this.current === 1
      ? '#' + COLORS.p1.toString(16)
      : '#' + COLORS.p2.toString(16);

    this.turnText.setText(label).setColor(color);
    this.resultText.setText('');

    // Reset coin
    this.coinContainer.setPosition(CX, CY).setScale(1, 1).setAngle(0);
    this.setCoin('?', true);

    const isCpu = this.mode === 'ai' && this.current === 2;
    this.headsBtn.setAlpha(isCpu ? 0.4 : 1);
    this.tailsBtn.setAlpha(isCpu ? 0.4 : 1);
    if (isCpu) this.time.delayedCall(700, () => this.call(Math.random() < 0.5 ? 'H' : 'T'));
  }

  private call(side: 'H' | 'T'): void {
    if (this.locked || this.over) return;
    this.locked = true;
    audio.click();

    // Determine result now; reveal at the end of the animation
    const result: 'H' | 'T' = Math.random() < 0.5 ? 'H' : 'T';

    const tv = { t: 0 };
    let lastHalf = -1;

    this.tweens.add({
      targets: tv,
      t: 1,
      duration: SPIN_DURATION,
      ease: 'Linear',
      onUpdate: () => {
        const t = tv.t;

        // ── Parabolic arc (peak at t ≈ 0.45) ──
        // y offset = -4 * RISE * t * (1-t)  →  peaks at t=0.5, symmetric
        this.coinContainer.y = CY + (-4 * RISE * t * (1 - t));

        // ── Spin deceleration ──
        // spinProgress accelerates at first then eases out, like a real toss
        const spinT = 1 - Math.pow(1 - t, 1.6);
        const angle = spinT * SPINS * Math.PI * 2;

        // scaleX = |cos(angle)| — coin narrows to a line at each half-rotation
        this.coinContainer.scaleX = Math.max(0.02, Math.abs(Math.cos(angle)));

        // ── Slow Z-axis tumble for realism ──
        this.coinContainer.setAngle(angle * (180 / Math.PI) * 0.08);

        // ── Switch face on each half-rotation ──
        const halfIdx = Math.floor(angle / Math.PI);
        if (halfIdx !== lastHalf) {
          lastHalf = halfIdx;
          if (t < 0.85) {
            // Alternate faces while spinning
            const showFace: 'H' | 'T' = halfIdx % 2 === 0 ? 'H' : 'T';
            this.setCoin(showFace, showFace === 'H');
          } else {
            // Lock in the result face as the coin slows
            this.setCoin(result, result === 'H');
          }
        }
      },
      onComplete: () => {
        // Snap to resting state
        this.coinContainer.setPosition(CX, CY).setScale(1, 1).setAngle(0);
        this.setCoin(result, result === 'H');
        // Landing thud + brief bounce
        audio.bump();
        this.tweens.add({
          targets: this.coinContainer,
          scaleX: { from: 1.18, to: 1 },
          scaleY: { from: 0.82, to: 1 },
          duration: 160,
          ease: 'Bounce.easeOut',
        });
        this.time.delayedCall(220, () => this.resolve(side, result));
      },
    });
  }

  private resolve(side: 'H' | 'T', flip: 'H' | 'T'): void {
    const correct = side === flip;
    if (correct) {
      if (this.current === 1) this.p1++;
      else this.p2++;
      this.p1Text.setText(String(this.p1));
      this.p2Text.setText(String(this.p2));
      pulseTween(this, this.current === 1 ? this.p1Text : this.p2Text);
      audio.goal();
      this.resultText.setText(`${flip === 'H' ? 'Heads' : 'Tails'} – correct! ✓`);
    } else {
      this.resultText.setText(`${flip === 'H' ? 'Heads' : 'Tails'} – nope!`);
    }
    if (this.p1 >= TARGET || this.p2 >= TARGET) {
      this.time.delayedCall(900, () => this.endMatch());
      return;
    }
    this.current = this.current === 1 ? 2 : 1;
    this.time.delayedCall(1200, () => this.startTurn());
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
    spawnConfetti(this, GAME_WIDTH / 2, 350);
    showResult(this, {
      title,
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
