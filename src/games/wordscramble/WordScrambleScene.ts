import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, COLORS } from '../../core/config';
import { Ads } from '../../core/ads/AdManager';
import { audio } from '../../core/audio/AudioManager';
import { addBackButton } from '../../core/ui/Hud';
import { showResult } from '../../core/ui/ResultOverlay';
import { GameMode } from '../types';
import { ensureSoleActiveScene } from '../../core/ui/NavGuard';
import { setupSceneScale } from '../../core/scale';

const BG = 0x04201a;
const WORDS = ['CAKE', 'JUMP', 'FISH', 'STAR', 'WOLF', 'FROG', 'DRUM', 'BELT', 'ROSE', 'DUCK', 'KITE', 'SHIP', 'CLAW', 'GRIN', 'FLEX', 'MIST', 'BOLT', 'SLUG', 'BREW', 'WAND'];
const WIN_ROUNDS = 3;
const TOP_H = 68;
const BOT_H = 68;
const MID_Y = GAME_HEIGHT / 2;

export class WordScrambleScene extends Phaser.Scene {
  private mode: GameMode = 'ai';
  private p1 = 0;
  private p2 = 0;
  private word = '';
  private scrambled: string[] = [];
  private p1Answer: string[] = [];
  private p2Answer: string[] = [];
  private roundOver = false;
  private p1LetterBtns: Phaser.GameObjects.Container[] = [];
  private p2LetterBtns: Phaser.GameObjects.Container[] = [];
  private p1AnswerTexts: Phaser.GameObjects.Text[] = [];
  private p2AnswerTexts: Phaser.GameObjects.Text[] = [];
  private p1ScoreText!: Phaser.GameObjects.Text;
  private p2ScoreText!: Phaser.GameObjects.Text;
  private statusText!: Phaser.GameObjects.Text;
  private usedWords = new Set<string>();
  private aiTimer?: Phaser.Time.TimerEvent;

  constructor() { super('WordScramble'); }
  init(data: { mode?: GameMode }): void { this.mode = data?.mode ?? 'ai'; }

  create(): void {
    ensureSoleActiveScene(this);
    setupSceneScale(this);
    this.p1 = 0; this.p2 = 0; this.usedWords.clear();
    this.cameras.main.setBackgroundColor(BG);

    // Player strips
    this.add.rectangle(GAME_WIDTH / 2, TOP_H / 2, GAME_WIDTH, TOP_H, COLORS.p2, 0.88);
    this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT - BOT_H / 2, GAME_WIDTH, BOT_H, COLORS.p1, 0.88);
    // Zone tints
    this.add.rectangle(GAME_WIDTH / 2, (TOP_H + MID_Y) / 2, GAME_WIDTH, MID_Y - TOP_H, COLORS.p2, 0.07);
    this.add.rectangle(GAME_WIDTH / 2, (MID_Y + GAME_HEIGHT - BOT_H) / 2, GAME_WIDTH, GAME_HEIGHT - BOT_H - MID_Y, COLORS.p1, 0.07);
    this.add.line(0, 0, 0, MID_Y, GAME_WIDTH, MID_Y, 0xffffff, 0.18).setOrigin(0).setLineWidth(1);

    const label = { fontFamily: 'Arial Black, Arial', fontSize: '15px', color: '#ffffff' };
    const scoreStyle = { fontFamily: 'Arial Black, Arial', fontSize: '26px', color: '#ffffff' };
    this.add.text(16, TOP_H / 2, this.mode === 'ai' ? 'CPU' : 'P2', label).setOrigin(0, 0.5).setAngle(180).setDepth(5);
    this.add.text(16, GAME_HEIGHT - BOT_H / 2, 'P1', label).setOrigin(0, 0.5).setDepth(5);
    this.p2ScoreText = this.add.text(GAME_WIDTH - 16, TOP_H / 2, '0', scoreStyle).setOrigin(1, 0.5).setAngle(180).setDepth(5);
    this.p1ScoreText = this.add.text(GAME_WIDTH - 16, GAME_HEIGHT - BOT_H / 2, '0', scoreStyle).setOrigin(1, 0.5).setDepth(5);

    addBackButton(this, () => this.toHub(false)).setY(GAME_HEIGHT - BOT_H / 2);

    this.statusText = this.add.text(GAME_WIDTH / 2, MID_Y, '', {
      fontFamily: 'Arial Black, Arial', fontSize: '18px', color: '#ffffff', align: 'center',
    }).setOrigin(0.5).setDepth(10);

    this.nextRound();
  }

  private nextRound(): void {
    this.aiTimer?.remove(false);
    this.clearRound();
    if (this.p1 >= WIN_ROUNDS || this.p2 >= WIN_ROUNDS) { this.endMatch(); return; }

    const available = WORDS.filter(w => !this.usedWords.has(w));
    if (available.length === 0) this.usedWords.clear();
    this.word = Phaser.Utils.Array.GetRandom(available.length ? available : WORDS) as string;
    this.usedWords.add(this.word);

    this.scrambled = Phaser.Utils.Array.Shuffle(this.word.split('')) as string[];
    // Re-shuffle until scrambled ≠ original
    while (this.scrambled.join('') === this.word)
      Phaser.Utils.Array.Shuffle(this.scrambled);

    this.p1Answer = [];
    this.p2Answer = [];
    this.roundOver = false;
    this.statusText.setText('');

    this.buildLetterTiles();
    this.buildAnswerSlots();

    if (this.mode === 'ai') this.scheduleAI();
  }

  private clearRound(): void {
    [...this.p1LetterBtns, ...this.p2LetterBtns].forEach(b => b.destroy());
    this.p1LetterBtns = []; this.p2LetterBtns = [];
    this.p1AnswerTexts.forEach(t => t.destroy()); this.p1AnswerTexts = [];
    this.p2AnswerTexts.forEach(t => t.destroy()); this.p2AnswerTexts = [];
  }

  private buildLetterTiles(): void {
    const tileW = 72, tileH = 72, gap = 10;
    const totalW = 4 * tileW + 3 * gap;
    const startX = (GAME_WIDTH - totalW) / 2 + tileW / 2;

    // P1 letters — in lower zone, y ≈ MID_Y + 100
    const p1TileY = MID_Y + 110;
    // P2 letters — in upper zone, y ≈ MID_Y - 100
    const p2TileY = MID_Y - 110;

    this.scrambled.forEach((letter, i) => {
      const x = startX + i * (tileW + gap);

      const p1bg = this.add.rectangle(0, 0, tileW, tileH, COLORS.p1, 0.25).setStrokeStyle(2, COLORS.p1, 0.7);
      const p1txt = this.add.text(0, 0, letter, { fontFamily: 'Arial Black, Arial', fontSize: '28px', color: '#ffffff' }).setOrigin(0.5);
      const p1cont = this.add.container(x, p1TileY, [p1bg, p1txt]).setDepth(10).setSize(tileW, tileH).setInteractive({ useHandCursor: true });
      p1cont.on('pointerdown', () => this.tapLetter(i, 1, p1bg, p1txt));
      this.p1LetterBtns.push(p1cont);

      const p2x = startX + (3 - i) * (tileW + gap);
      const p2bg = this.add.rectangle(0, 0, tileW, tileH, COLORS.p2, 0.25).setStrokeStyle(2, COLORS.p2, 0.7);
      const p2txt = this.add.text(0, 0, letter, { fontFamily: 'Arial Black, Arial', fontSize: '28px', color: '#ffffff' }).setOrigin(0.5);
      const p2cont = this.add.container(p2x, p2TileY, [p2bg, p2txt]).setDepth(10).setSize(tileW, tileH).setAngle(180).setInteractive({ useHandCursor: true });
      p2cont.on('pointerdown', () => this.tapLetter(i, 2, p2bg, p2txt));
      this.p2LetterBtns.push(p2cont);
    });
  }

  private buildAnswerSlots(): void {
    const slotW = 54, gap = 12;
    const totalW = 4 * slotW + 3 * gap;
    const startX = (GAME_WIDTH - totalW) / 2 + slotW / 2;
    const p1SlotY = MID_Y + 210;
    const p2SlotY = MID_Y - 210;

    for (let i = 0; i < 4; i++) {
      const x = startX + i * (slotW + gap);
      this.add.rectangle(x, p1SlotY, slotW, 56, 0xffffff, 0.08).setStrokeStyle(2, 0xffffff, 0.3);
      this.add.rectangle(x, p2SlotY, slotW, 56, 0xffffff, 0.08).setStrokeStyle(2, 0xffffff, 0.3);
      this.p1AnswerTexts.push(this.add.text(x, p1SlotY, '', { fontFamily: 'Arial Black, Arial', fontSize: '24px', color: '#ffffff' }).setOrigin(0.5).setDepth(8));
      this.p2AnswerTexts.push(this.add.text(x, p2SlotY, '', { fontFamily: 'Arial Black, Arial', fontSize: '24px', color: '#ffffff' }).setOrigin(0.5).setAngle(180).setDepth(8));
    }
  }

  private tapLetter(idx: number, player: number, bg: Phaser.GameObjects.Rectangle, txt: Phaser.GameObjects.Text): void {
    if (this.roundOver) return;
    if (player === 2 && this.mode === 'ai') return;
    const answer = player === 1 ? this.p1Answer : this.p2Answer;
    const answerTexts = player === 1 ? this.p1AnswerTexts : this.p2AnswerTexts;
    const letterBtns = player === 1 ? this.p1LetterBtns : this.p2LetterBtns;

    if (letterBtns[idx].alpha < 0.4) return; // already used
    letterBtns[idx].setAlpha(0.3);
    answer.push(this.scrambled[idx]);
    // P2 is rotated 180°: fill slots right-to-left on screen so they appear L→R from P2's view
    const slotIdx = player === 2 ? (3 - (answer.length - 1)) : (answer.length - 1);
    answerTexts[slotIdx].setText(this.scrambled[idx]);
    audio.click();

    void bg; void txt;

    if (answer.length === 4) {
      if (answer.join('') === this.word) {
        this.onRoundWin(player);
      } else {
        // wrong — shake and reset
        this.cameras.main.shake(220, 0.006);
        audio.bump();
        this.time.delayedCall(400, () => {
          answer.length = 0;
          answerTexts.forEach(t => t.setText(''));
          letterBtns.forEach(b => b.setAlpha(1));
        });
      }
    }
  }

  private scheduleAI(): void {
    // CPU solves after a random delay
    const delay = Phaser.Math.Between(2200, 4500);
    this.aiTimer = this.time.delayedCall(delay, () => {
      if (!this.roundOver) this.onRoundWin(2);
    });
  }

  private onRoundWin(player: number): void {
    if (this.roundOver) return;
    this.roundOver = true;
    this.aiTimer?.remove(false);
    audio.goal();
    this.cameras.main.flash(200, 60, 200, 60);
    if (player === 1) { this.p1++; this.p1ScoreText.setText(String(this.p1)); }
    else { this.p2++; this.p2ScoreText.setText(String(this.p2)); }
    const who = player === 1 ? 'P1' : (this.mode === 'ai' ? 'CPU' : 'P2');
    this.statusText.setText(`${who} solved ${this.word}!`);
    this.time.delayedCall(1400, () => this.nextRound());
  }

  private endMatch(): void {
    const p1won = this.p1 > this.p2;
    const title = this.mode === 'ai'
      ? (p1won ? 'You win!' : 'CPU wins')
      : (p1won ? 'Player 1 wins!' : 'Player 2 wins!');
    p1won ? audio.win() : audio.lose();
    showResult(this, {
      title,
      subtitle: `${this.p1} – ${this.p2}`,
      onRematch: () => { void Ads.maybeInterstitial(); this.scene.restart({ mode: this.mode }); },
      onHome: () => this.toHub(true),
    });
  }

  private toHub(withAd: boolean): void {
    this.aiTimer?.remove(false);
    if (withAd) void Ads.maybeInterstitial();
    this.scene.start('Hub');
  }
}
