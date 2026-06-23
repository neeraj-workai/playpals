import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, COLORS } from '../../core/config';
import { Ads } from '../../core/ads/AdManager';
import { audio } from '../../core/audio/AudioManager';
import { addBackButton } from '../../core/ui/Hud';
import { showResult } from '../../core/ui/ResultOverlay';
import { GameMode } from '../types';
import { ensureSoleActiveScene } from '../../core/ui/NavGuard';
import { setupSceneScale } from '../../core/scale';

const BG = 0x2d0820;
const POOL = ['🍕', '🐶', '🎵', '🌙', '⭐', '🎈', '🍎', '🦋', '🎯', '🍩', '🎸', '🦊'];
const WIN_ROUNDS = 3;
const SHOW_MS = 1800;
const TOP_H = 68;
const BOT_H = 68;

export class EmojiQuizScene extends Phaser.Scene {
  private mode: GameMode = 'ai';
  private p1 = 0;
  private p2 = 0;
  private sequence: string[] = [];
  private correctIdx = 0;
  private locked = true;
  private p1ScoreText!: Phaser.GameObjects.Text;
  private p2ScoreText!: Phaser.GameObjects.Text;
  private statusText!: Phaser.GameObjects.Text;
  private seqDisplay!: Phaser.GameObjects.Text;
  private p1Btns: Phaser.GameObjects.Container[] = [];
  private p2Btns: Phaser.GameObjects.Container[] = [];
  private aiTimer?: Phaser.Time.TimerEvent;

  constructor() { super('EmojiQuiz'); }

  init(data: { mode?: GameMode }): void { this.mode = data?.mode ?? 'ai'; }

  create(): void {
    ensureSoleActiveScene(this);
    setupSceneScale(this);
    this.p1 = 0; this.p2 = 0;
    this.cameras.main.setBackgroundColor(BG);

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

    this.statusText = this.add.text(GAME_WIDTH / 2, TOP_H + 18, '', {
      fontFamily: 'Arial Black, Arial', fontSize: '16px', color: '#ffffffcc', align: 'center',
    }).setOrigin(0.5, 0).setDepth(5);

    this.seqDisplay = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 10, '', {
      fontFamily: 'Arial', fontSize: '52px',
    }).setOrigin(0.5).setDepth(5);

    this.nextRound();
  }

  private nextRound(): void {
    this.locked = true;
    this.aiTimer?.remove(false);
    this.p1Btns.forEach(b => b.destroy()); this.p1Btns = [];
    this.p2Btns.forEach(b => b.destroy()); this.p2Btns = [];

    if (this.p1 >= WIN_ROUNDS || this.p2 >= WIN_ROUNDS) { this.endMatch(); return; }

    const pool = Phaser.Utils.Array.Shuffle([...POOL]);
    this.sequence = pool.slice(0, 3);

    this.seqDisplay.setText(this.sequence.join(' ')).setVisible(true);
    this.statusText.setText('Watch closely!');

    this.time.delayedCall(SHOW_MS, () => {
      this.seqDisplay.setVisible(false);
      this.statusText.setText('Which was it? Tap fast!');
      this.showOptions();
    });
  }

  private showOptions(): void {
    const correct = this.sequence.join('');
    // 6 perms of 3 items; pick 3 wrong + 1 correct
    const allPerms = this.perms(this.sequence);
    const wrongs = Phaser.Utils.Array.Shuffle(allPerms.filter(p => p.join('') !== correct));
    const opts = Phaser.Utils.Array.Shuffle([[...this.sequence], ...wrongs.slice(0, 3)]);
    this.correctIdx = opts.findIndex(o => o.join('') === correct);

    const btnW = 182, btnH = 72, gapX = 6, gapY = 8;
    const startX = (GAME_WIDTH - (2 * btnW + gapX)) / 2 + btnW / 2;
    // P2 buttons (top area, rotated 180°)
    const p2StartY = TOP_H + 22 + btnH / 2;
    // P1 buttons (bottom area)
    const p1StartY = GAME_HEIGHT - BOT_H - 22 - btnH / 2 - (btnH + gapY);

    for (let i = 0; i < 4; i++) {
      const col = i % 2, row = Math.floor(i / 2);
      const x = startX + col * (btnW + gapX);
      const p2y = p2StartY + row * (btnH + gapY);
      const p1y = p1StartY + row * (btnH + gapY);
      const label = opts[i].join(' ');
      const isCorrect = i === this.correctIdx;
      this.p2Btns.push(this.makeOptionBtn(x, p2y, label, true, isCorrect));
      this.p1Btns.push(this.makeOptionBtn(x, p1y, label, false, isCorrect));
    }

    this.locked = false;

    if (this.mode === 'ai') {
      const delay = Phaser.Math.Between(1400, 3200);
      this.aiTimer = this.time.delayedCall(delay, () => {
        if (!this.locked) this.onPick(this.correctIdx, 2);
      });
    }
  }

  private makeOptionBtn(x: number, y: number, label: string, flip: boolean, isCorrect: boolean): Phaser.GameObjects.Container {
    const bg = this.add.rectangle(0, 0, 182, 72, 0xffffff, 0.1).setStrokeStyle(2, 0xffffff, 0.35);
    const txt = this.add.text(0, 0, label, { fontFamily: 'Arial', fontSize: '26px' }).setOrigin(0.5);
    const cont = this.add.container(x, y, [bg, txt]).setDepth(10).setSize(182, 72);
    if (flip) cont.setAngle(180);
    cont.setInteractive({ useHandCursor: true });
    const idx = (flip ? this.p2Btns : this.p1Btns).length; // capture before push
    cont.on('pointerdown', () => {
      if (!this.locked) this.onPick(idx, flip ? 2 : 1);
    });
    // store correct flag for highlight
    (cont as Phaser.GameObjects.Container & { _correct: boolean })._correct = isCorrect;
    return cont;
  }

  private onPick(optIdx: number, player: number): void {
    if (this.locked) return;
    this.locked = true;
    this.aiTimer?.remove(false);

    const isCorrect = optIdx === this.correctIdx;
    const allBtns = [...this.p1Btns, ...this.p2Btns];

    // highlight chosen button sets
    const highlight = (btns: Phaser.GameObjects.Container[], idx: number, correct: boolean) => {
      const bg = btns[idx]?.getAt(0) as Phaser.GameObjects.Rectangle | undefined;
      bg?.setFillStyle(correct ? 0x22c55e : 0xef4444, 0.8);
    };
    if (player === 1) highlight(this.p1Btns, optIdx, isCorrect);
    else highlight(this.p2Btns, optIdx, isCorrect);

    if (isCorrect) {
      audio.goal();
      if (player === 1) { this.p1++; this.p1ScoreText.setText(String(this.p1)); }
      else { this.p2++; this.p2ScoreText.setText(String(this.p2)); }
      this.cameras.main.flash(200, 60, 200, 60);
    } else {
      audio.bump();
      // show correct answer
      const correctSet = player === 1 ? this.p1Btns : this.p2Btns;
      const correctBg = correctSet[this.correctIdx]?.getAt(0) as Phaser.GameObjects.Rectangle | undefined;
      correctBg?.setFillStyle(0x22c55e, 0.5);
    }

    void allBtns; // keep ref so they don't GC before destroy
    this.time.delayedCall(1000, () => this.nextRound());
  }

  private perms(arr: string[]): string[][] {
    if (arr.length <= 1) return [[...arr]];
    return arr.flatMap((v, i) =>
      this.perms([...arr.slice(0, i), ...arr.slice(i + 1)]).map(p => [v, ...p])
    );
  }

  private endMatch(): void {
    const p1won = this.p1 > this.p2;
    const title = this.mode === 'ai'
      ? (p1won ? 'You win!' : 'CPU wins')
      : (p1won ? 'Player 1 wins!' : 'Player 2 wins!');
    p1won ? audio.win() : audio.lose();
    this.time.delayedCall(300, () =>
      showResult(this, {
        title,
        subtitle: `${this.p1} – ${this.p2}`,
        onRematch: () => { void Ads.maybeInterstitial(); this.scene.restart({ mode: this.mode }); },
        onHome: () => this.toHub(true),
      })
    );
  }

  private toHub(withAd: boolean): void {
    this.aiTimer?.remove(false);
    if (withAd) void Ads.maybeInterstitial();
    this.scene.start('Hub');
  }
}
