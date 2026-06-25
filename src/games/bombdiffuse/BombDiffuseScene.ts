import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, COLORS } from '../../core/config';
import { spawnConfetti, STATUS_STYLE } from '../../core/ui/FxUtils';
import { Ads } from '../../core/ads/AdManager';
import { audio } from '../../core/audio/AudioManager';
import { addBackButton } from '../../core/ui/Hud';
import { showResult } from '../../core/ui/ResultOverlay';
import { GameMode } from '../types';
import { ensureSoleActiveScene } from '../../core/ui/NavGuard';
import { setupSceneScale } from '../../core/scale';

const BG = 0x200505;
const TOP_H = 68;
const BOT_H = 68;
const MID_Y = GAME_HEIGHT / 2;
const BOMB_TIME = 28;       // seconds per bomb
const TOTAL_BOMBS = 3;

export class BombDiffuseScene extends Phaser.Scene {
  private mode: GameMode = 'ai';
  private bombsDefused = 0;
  private code: number[] = [];
  private p1Progress = 0;   // digits 0,1 are P1's
  private p2Progress = 0;   // digits 2,3 are P2's
  private timeLeft = BOMB_TIME;
  private over = false;
  private roundOver = false;
  private bombText!: Phaser.GameObjects.Text;
  private timerText!: Phaser.GameObjects.Text;
  private statusText!: Phaser.GameObjects.Text;
  private bombsText!: Phaser.GameObjects.Text;
  private p1DigitBtns: Phaser.GameObjects.Container[] = [];
  private p2DigitBtns: Phaser.GameObjects.Container[] = [];
  private tickTimer?: Phaser.Time.TimerEvent;
  private aiTimer?: Phaser.Time.TimerEvent;

  constructor() { super('BombDiffuse'); }
  init(data: { mode?: GameMode }): void { this.mode = data?.mode ?? 'ai'; }

  create(): void {
    ensureSoleActiveScene(this);
    setupSceneScale(this);
    this.bombsDefused = 0; this.over = false;
    this.cameras.main.setBackgroundColor(BG);
    this.add.rectangle(GAME_WIDTH / 2, 0, GAME_WIDTH, 400, 0x8a1010, 0.5).setOrigin(0.5, 0);
    this.add.rectangle(GAME_WIDTH / 2, 400, GAME_WIDTH, 400, 0x0e0202, 0.5).setOrigin(0.5, 0);

    // Player strips
    this.add.rectangle(GAME_WIDTH / 2, TOP_H / 2, GAME_WIDTH, TOP_H, COLORS.p2, 0.88);
    this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT - BOT_H / 2, GAME_WIDTH, BOT_H, COLORS.p1, 0.88);
    this.add.rectangle(GAME_WIDTH / 2, (TOP_H + MID_Y) / 2, GAME_WIDTH, MID_Y - TOP_H, COLORS.p2, 0.06);
    this.add.rectangle(GAME_WIDTH / 2, (MID_Y + GAME_HEIGHT - BOT_H) / 2, GAME_WIDTH, GAME_HEIGHT - BOT_H - MID_Y, COLORS.p1, 0.06);

    const label = { fontFamily: 'Arial Black, Arial', fontSize: '15px', color: '#ffffff' };
    const stripLabel = this.mode === 'ai' ? 'CPU' : 'P2';
    this.add.text(16, TOP_H / 2, stripLabel, label).setOrigin(0, 0.5).setAngle(180).setDepth(5);
    this.add.text(16, GAME_HEIGHT - BOT_H / 2, 'P1', label).setOrigin(0, 0.5).setDepth(5);
    this.add.text(GAME_WIDTH - 16, TOP_H / 2, 'Tap your digits!', { fontFamily: 'Arial', fontSize: '12px', color: '#ffffffaa' }).setOrigin(1, 0.5).setAngle(180).setDepth(5);
    this.add.text(GAME_WIDTH - 16, GAME_HEIGHT - BOT_H / 2, 'Tap your digits!', { fontFamily: 'Arial', fontSize: '12px', color: '#ffffffaa' }).setOrigin(1, 0.5).setDepth(5);

    addBackButton(this, () => this.toHub(false)).setY(GAME_HEIGHT - BOT_H / 2);

    // Bomb emoji + timer in center
    this.bombText = this.add.text(GAME_WIDTH / 2, MID_Y - 32, '💣', { fontSize: '60px' }).setOrigin(0.5).setDepth(5);
    this.timerText = this.add.text(GAME_WIDTH / 2, MID_Y + 28, String(BOMB_TIME), {
      fontFamily: 'Arial Black, Arial', fontSize: '28px', color: '#ff4444',
    }).setOrigin(0.5).setDepth(5);

    this.statusText = this.add.text(GAME_WIDTH / 2, MID_Y - 80, '', {
      ...STATUS_STYLE, fontSize: '17px', align: 'center',
    }).setOrigin(0.5).setDepth(5);

    this.bombsText = this.add.text(GAME_WIDTH / 2, MID_Y + 62, `Bombs defused: 0 / ${TOTAL_BOMBS}`, {
      fontFamily: 'Arial', fontSize: '14px', color: '#ffffffaa',
    }).setOrigin(0.5).setDepth(5);

    this.nextBomb();
  }

  private nextBomb(): void {
    this.aiTimer?.remove(false);
    this.tickTimer?.remove(false);
    this.p1DigitBtns.forEach(b => b.destroy()); this.p1DigitBtns = [];
    this.p2DigitBtns.forEach(b => b.destroy()); this.p2DigitBtns = [];

    this.code = [
      Phaser.Math.Between(0, 9), Phaser.Math.Between(0, 9),
      Phaser.Math.Between(0, 9), Phaser.Math.Between(0, 9),
    ];
    this.p1Progress = 0;
    this.p2Progress = 0;
    this.roundOver = false;
    this.timeLeft = BOMB_TIME;
    this.timerText.setText(String(BOMB_TIME)).setColor('#ff4444');
    this.bombText.setText('💣');
    this.statusText.setText('');

    this.buildDigitButtons();
    this.startTick();

    if (this.mode === 'ai') this.scheduleAI();
  }

  private buildDigitButtons(): void {
    const btnW = 90, btnH = 90, gap = 16;
    const totalW = 2 * btnW + gap;
    const startX = (GAME_WIDTH - totalW) / 2 + btnW / 2;

    // P1 sees digits 0,1 in bottom zone
    const p1Y = MID_Y + 110;
    // P2 sees digits 2,3 in top zone (rotated)
    const p2Y = MID_Y - 110;

    for (let i = 0; i < 2; i++) {
      const x = startX + i * (btnW + gap);
      const digit = String(this.code[i]);
      const p1bg = this.add.rectangle(0, 0, btnW, btnH, COLORS.p1, 0.22).setStrokeStyle(3, COLORS.p1, 0.8);
      const p1txt = this.add.text(0, 0, digit, { fontFamily: 'Arial Black, Arial', fontSize: '40px', color: '#ffffff' }).setOrigin(0.5);
      const p1cont = this.add.container(x, p1Y, [p1bg, p1txt]).setDepth(10).setSize(btnW, btnH).setInteractive({ useHandCursor: true });
      p1cont.on('pointerdown', () => this.tapDigit(1, i, p1bg));
      this.p1DigitBtns.push(p1cont);

      const d2 = String(this.code[i + 2]);
      const p2bg = this.add.rectangle(0, 0, btnW, btnH, COLORS.p2, 0.22).setStrokeStyle(3, COLORS.p2, 0.8);
      const p2txt = this.add.text(0, 0, d2, { fontFamily: 'Arial Black, Arial', fontSize: '40px', color: '#ffffff' }).setOrigin(0.5);
      const p2cont = this.add.container(x, p2Y, [p2bg, p2txt]).setDepth(10).setSize(btnW, btnH).setAngle(180).setInteractive({ useHandCursor: true });
      p2cont.on('pointerdown', () => this.tapDigit(2, i, p2bg));
      this.p2DigitBtns.push(p2cont);
    }
  }

  private tapDigit(player: number, btnIdx: number, bg: Phaser.GameObjects.Rectangle): void {
    if (this.roundOver) return;
    if (player === 2 && this.mode === 'ai') return;

    const progress = player === 1 ? this.p1Progress : this.p2Progress;
    if (btnIdx !== progress) {
      // wrong order — shake
      this.cameras.main.shake(150, 0.005);
      audio.bump();
      return;
    }
    bg.setFillStyle(0x22c55e, 0.7);
    audio.click();

    if (player === 1) this.p1Progress++;
    else this.p2Progress++;

    void bg;
    this.checkDefuse();
  }

  private scheduleAI(): void {
    // CPU taps its first digit
    this.aiTimer = this.time.delayedCall(Phaser.Math.Between(800, 1800), () => {
      if (this.roundOver) return;
      const p2bg = this.p2DigitBtns[0]?.getAt(0) as Phaser.GameObjects.Rectangle | undefined;
      if (p2bg) { p2bg.setFillStyle(0x22c55e, 0.7); this.p2Progress++; }
      this.checkDefuse();
      // second digit
      this.aiTimer = this.time.delayedCall(Phaser.Math.Between(600, 1400), () => {
        if (this.roundOver) return;
        const p2bg2 = this.p2DigitBtns[1]?.getAt(0) as Phaser.GameObjects.Rectangle | undefined;
        if (p2bg2) { p2bg2.setFillStyle(0x22c55e, 0.7); this.p2Progress++; }
        this.checkDefuse();
      });
    });
  }

  private checkDefuse(): void {
    if (this.p1Progress >= 2 && this.p2Progress >= 2) {
      this.onDefuse();
    }
  }

  private onDefuse(): void {
    if (this.roundOver) return;
    this.roundOver = true;
    this.tickTimer?.remove(false);
    this.aiTimer?.remove(false);
    this.bombsDefused++;
    this.bombsText.setText(`Bombs defused: ${this.bombsDefused} / ${TOTAL_BOMBS}`);
    this.bombText.setText('✅');
    audio.win();
    this.cameras.main.flash(220, 60, 200, 60);
    this.statusText.setText('DEFUSED! ✅');
    spawnConfetti(this, GAME_WIDTH / 2, MID_Y);

    if (this.bombsDefused >= TOTAL_BOMBS) {
      this.over = true;
      this.time.delayedCall(800, () => this.endMatch(true));
    } else {
      this.time.delayedCall(1400, () => this.nextBomb());
    }
  }

  private startTick(): void {
    this.tickTimer = this.time.addEvent({
      delay: 1000,
      repeat: BOMB_TIME - 1,
      callback: () => {
        if (this.roundOver) return;
        this.timeLeft--;
        this.timerText.setText(String(this.timeLeft));
        if (this.timeLeft <= 5) {
          this.timerText.setColor('#ff0000');
          this.cameras.main.shake(80, 0.003);
        }
        if (this.timeLeft <= 0) this.onExplosion();
      },
    });
  }

  private onExplosion(): void {
    if (this.roundOver) return;
    this.roundOver = true;
    this.over = true;
    this.aiTimer?.remove(false);
    this.bombText.setText('💥');
    audio.lose();
    this.cameras.main.shake(400, 0.02);
    this.statusText.setText('BOOM! 💥');
    this.time.delayedCall(900, () => this.endMatch(false));
  }

  private endMatch(success: boolean): void {
    const title = success ? 'All Defused! 🎉' : 'BOOM! You lost!';
    const sub = `${this.bombsDefused} / ${TOTAL_BOMBS} bombs defused`;
    success ? audio.win() : audio.lose();
    showResult(this, {
      title,
      subtitle: sub,
      onRematch: () => { void Ads.maybeInterstitial(); this.scene.restart({ mode: this.mode }); },
      onHome: () => this.toHub(true),
    });
  }

  private toHub(withAd: boolean): void {
    this.tickTimer?.remove(false);
    this.aiTimer?.remove(false);
    if (withAd) void Ads.maybeInterstitial();
    this.scene.start('Hub');
  }
}
