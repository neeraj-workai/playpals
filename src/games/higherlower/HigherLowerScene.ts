import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, COLORS } from '../../core/config';
import { spawnConfetti, pulseTween, STATUS_STYLE } from '../../core/ui/FxUtils';
import { Ads } from '../../core/ads/AdManager';
import { audio } from '../../core/audio/AudioManager';
import { addBackButton } from '../../core/ui/Hud';
import { showResult } from '../../core/ui/ResultOverlay';
import { Storage } from '../../core/storage/Storage';
import { GameMode, Difficulty } from '../types';
import { ensureSoleActiveScene } from '../../core/ui/NavGuard';
import { setupSceneScale } from '../../core/scale';
import { CATEGORIES, Category, Item } from './data';

// "More or Less" — Higher-Lower.
//  1P: endless survival vs a high score (3 hearts, rewarded revive, stage ads).
//  2P: split-screen, each half its own stream; first to lose 3 hearts loses.
const BEST_KEY = 'higherlower';
const MAX_HEARTS = 3;
const STAGE_EVERY = 8;      // 1P: interstitial after every N correct
const MAX_REVIVES = 1;      // 1P: rewarded revives per run
const TIMER_MS: Record<Difficulty, number> = { easy: 8000, medium: 6000, hard: 4000 };

interface PanelCfg {
  centerY: number;
  height: number;
  flip: boolean;
  accent: number;
  fontScale: number;
}

// One self-contained question panel (cards + buttons + hearts) for a player.
class HLPanel {
  hearts = MAX_HEARTS;
  score = 0;
  combo = 0;
  correct = 0;          // total correct (drives 1P stage ads)
  alive = true;
  answered = false;
  timeLeft = 0;
  private a!: Item;
  private b!: Item;
  private cat!: Category;
  private roundsInCat = 0;

  private heartsText: Phaser.GameObjects.Text;
  private scoreText: Phaser.GameObjects.Text;
  private catText: Phaser.GameObjects.Text;
  private timerBar: Phaser.GameObjects.Rectangle;
  private timerBg: Phaser.GameObjects.Rectangle;
  private aEmoji: Phaser.GameObjects.Text;
  private aLabel: Phaser.GameObjects.Text;
  private aValue: Phaser.GameObjects.Text;
  private bEmoji: Phaser.GameObjects.Text;
  private bLabel: Phaser.GameObjects.Text;
  private bValue: Phaser.GameObjects.Text;
  private readonly barW: number;

  constructor(
    private scene: HigherLowerScene,
    private cfg: PanelCfg,
    private difficulty: Difficulty,
    private onAnswered: (panel: HLPanel, correct: boolean) => void,
  ) {
    const s = cfg.fontScale;
    const c = scene.add.container(GAME_WIDTH / 2, cfg.centerY).setDepth(5);
    if (cfg.flip) c.setAngle(180);
    const H = cfg.height;
    const top = -H / 2;
    this.barW = 300 * s;

    // category + timer
    this.catText = scene.add.text(0, top + 18 * s, '', { ...STATUS_STYLE, fontSize: `${Math.round(18 * s)}px` }).setOrigin(0.5);
    this.timerBg = scene.add.rectangle(0, top + 40 * s, this.barW, 8 * s, 0xffffff, 0.18).setOrigin(0.5);
    this.timerBar = scene.add.rectangle(-this.barW / 2, top + 40 * s, this.barW, 8 * s, cfg.accent, 1).setOrigin(0, 0.5);

    // cards (A = reference, left; B = unknown, right)
    const cardY = top + H * 0.34;
    const dx = 88 * s;
    this.aEmoji = scene.add.text(-dx, cardY - 30 * s, '', { fontSize: `${Math.round(46 * s)}px` }).setOrigin(0.5);
    this.aLabel = scene.add.text(-dx, cardY + 10 * s, '', { fontFamily: 'Arial', fontSize: `${Math.round(13 * s)}px`, color: '#ffffffcc', align: 'center', wordWrap: { width: 130 * s } }).setOrigin(0.5);
    this.aValue = scene.add.text(-dx, cardY + 40 * s, '', { fontFamily: 'Arial Black, Arial', fontSize: `${Math.round(20 * s)}px`, color: '#ffffff' }).setOrigin(0.5);

    this.bEmoji = scene.add.text(dx, cardY - 30 * s, '', { fontSize: `${Math.round(46 * s)}px` }).setOrigin(0.5);
    this.bLabel = scene.add.text(dx, cardY + 10 * s, '', { fontFamily: 'Arial', fontSize: `${Math.round(13 * s)}px`, color: '#ffffffcc', align: 'center', wordWrap: { width: 130 * s } }).setOrigin(0.5);
    this.bValue = scene.add.text(dx, cardY + 40 * s, '?', { fontFamily: 'Arial Black, Arial', fontSize: `${Math.round(20 * s)}px`, color: '#ffd93d' }).setOrigin(0.5);

    const vs = scene.add.text(0, cardY, 'vs', { fontFamily: 'Arial Black, Arial', fontSize: `${Math.round(16 * s)}px`, color: '#ffffff88' }).setOrigin(0.5);

    // buttons
    const btnY = top + H * 0.68;
    const more = this.makeBtn(scene, -70 * s, btnY, s, '▲ MORE', 0x2fb875, () => this.answer(true));
    const less = this.makeBtn(scene, 70 * s, btnY, s, '▼ LESS', 0xf0639e, () => this.answer(false));

    // hearts + score
    this.heartsText = scene.add.text(-this.barW / 2, H / 2 - 22 * s, '', { fontSize: `${Math.round(18 * s)}px` }).setOrigin(0, 0.5);
    this.scoreText = scene.add.text(this.barW / 2, H / 2 - 22 * s, '', { fontFamily: 'Arial Black, Arial', fontSize: `${Math.round(18 * s)}px`, color: '#ffffff' }).setOrigin(1, 0.5);

    c.add([
      this.catText, this.timerBg, this.timerBar,
      this.aEmoji, this.aLabel, this.aValue,
      this.bEmoji, this.bLabel, this.bValue, vs,
      more, less, this.heartsText, this.scoreText,
    ]);

    this.cat = Phaser.Utils.Array.GetRandom(CATEGORIES);
    this.updateHud();
    this.nextRound(true);
  }

  private makeBtn(scene: Phaser.Scene, x: number, y: number, s: number, label: string, color: number, on: () => void): Phaser.GameObjects.Container {
    const w = 128 * s, h = 54 * s;
    const bg = scene.add.rectangle(0, 0, w, h, color, 0.92).setStrokeStyle(2, 0xffffff, 0.35);
    const txt = scene.add.text(0, 0, label, { fontFamily: 'Arial Black, Arial', fontSize: `${Math.round(20 * s)}px`, color: '#ffffff' }).setOrigin(0.5);
    const cont = scene.add.container(x, y, [bg, txt]).setSize(w, h).setInteractive({ useHandCursor: true });
    cont.on('pointerdown', on);
    return cont;
  }

  private updateHud(): void {
    this.heartsText.setText('❤️'.repeat(this.hearts) + '🖤'.repeat(MAX_HEARTS - this.hearts));
    const combo = this.combo >= 2 ? `  🔥${this.combo}` : '';
    this.scoreText.setText(`${this.score}${combo}`);
  }

  /** Pick the next pair from the current category (rotating categories). */
  nextRound(first = false): void {
    if (!this.alive) return;
    this.roundsInCat++;
    if (first || this.roundsInCat > Phaser.Math.Between(3, 5)) {
      this.cat = Phaser.Utils.Array.GetRandom(CATEGORIES);
      this.roundsInCat = 0;
    }
    const sorted = [...this.cat.items].sort((p, q) => p.value - q.value);
    // A = previous B (chain) when possible, else random
    if (!first && this.b) {
      this.a = this.b;
    } else {
      this.a = Phaser.Utils.Array.GetRandom(sorted);
    }
    this.b = this.pickB(sorted, this.a);

    this.answered = false;
    this.timeLeft = TIMER_MS[this.difficulty];
    this.catText.setText(`${this.cat.name}`);
    this.aEmoji.setText(this.a.emoji);
    this.aLabel.setText(this.a.label);
    this.aValue.setText(this.cat.fmt(this.a.value));
    this.bEmoji.setText(this.b.emoji);
    this.bLabel.setText(this.b.label);
    this.bValue.setText('?').setColor('#ffd93d').setScale(1);
    this.timerBar.setScale(1, 1);
  }

  // Difficulty controls how "close" the two values are: hard = adjacent in the
  // sorted order (tough call), easy = far apart (obvious), medium = anything.
  private pickB(sorted: Item[], a: Item): Item {
    const ai = sorted.findIndex((it) => it === a);
    const candidates = sorted
      .map((it, i) => ({ it, d: Math.abs(i - ai) }))
      .filter((x) => x.it !== a && x.it.value !== a.value);
    let pool = candidates;
    if (this.difficulty === 'hard') pool = candidates.filter((x) => x.d <= 2);
    else if (this.difficulty === 'easy') pool = candidates.filter((x) => x.d >= 3);
    if (pool.length === 0) pool = candidates;
    return Phaser.Utils.Array.GetRandom(pool).it;
  }

  answer(higher: boolean): void {
    if (this.answered || !this.alive || this.scene.paused) return;
    this.answered = true;
    const correct = (this.b.value > this.a.value) === higher;

    // reveal B
    this.bValue.setText(this.cat.fmt(this.b.value)).setColor(correct ? '#7fe6b5' : '#ff8f8f');
    pulseTween(this.scene, this.bValue);

    if (correct) {
      this.score++; this.combo++; this.correct++;
      audio.goal();
      pulseTween(this.scene, this.scoreText);
    } else {
      this.hearts--; this.combo = 0;
      audio.bump();
      this.scene.cameras.main.shake(180, 0.006);
    }
    this.updateHud();
    this.onAnswered(this, correct);
  }

  /** Called by the scene's update loop while a round is live. */
  tick(delta: number): void {
    if (this.answered || !this.alive) return;
    this.timeLeft -= delta;
    this.timerBar.setScale(Phaser.Math.Clamp(this.timeLeft / TIMER_MS[this.difficulty], 0, 1), 1);
    if (this.timeLeft <= 0) this.answer(Math.random() < 0.5); // timeout = a (likely) miss
  }

  revive(): void {
    this.hearts = 1;
    this.alive = true;
    this.updateHud();
    this.nextRound();
  }
}

export class HigherLowerScene extends Phaser.Scene {
  paused = false;            // set during ad / revive prompt so input + ticks freeze
  private mode: GameMode = 'ai';
  private difficulty: Difficulty = 'medium';
  private panels: HLPanel[] = [];
  private revivesUsed = 0;
  private best = 0;
  private over = false;

  constructor() { super('HigherLower'); }

  init(data: { mode?: GameMode; difficulty?: Difficulty }): void {
    this.mode = data?.mode ?? 'ai';
    this.difficulty = data?.difficulty ?? 'medium';
  }

  create(): void {
    ensureSoleActiveScene(this);
    setupSceneScale(this);
    this.paused = false; this.over = false; this.revivesUsed = 0; this.panels = [];
    this.best = Storage.getBest(BEST_KEY);

    this.cameras.main.setBackgroundColor(0x12235a);
    this.add.rectangle(GAME_WIDTH / 2, 0, GAME_WIDTH, 400, 0x2a52c8, 0.55).setOrigin(0.5, 0);
    this.add.rectangle(GAME_WIDTH / 2, 400, GAME_WIDTH, 400, 0x0a1230, 0.55).setOrigin(0.5, 0);

    addBackButton(this, () => this.toHub(false));

    if (this.mode === '2p') {
      const MID = 366;
      this.add.line(0, 0, 0, MID, GAME_WIDTH, MID, 0xffffff, 0.18).setOrigin(0).setLineWidth(1);
      this.add.rectangle(GAME_WIDTH / 2, MID / 2 + 33, GAME_WIDTH, MID - 66, COLORS.p2, 0.10);
      this.add.rectangle(GAME_WIDTH / 2, (MID + GAME_HEIGHT) / 2, GAME_WIDTH, GAME_HEIGHT - MID, COLORS.p1, 0.10);
      this.panels = [
        new HLPanel(this, { centerY: 216, height: 290, flip: true, accent: COLORS.p2, fontScale: 0.74 }, this.difficulty, (p, c) => this.onAnswered(p, c)),
        new HLPanel(this, { centerY: 533, height: 300, flip: false, accent: COLORS.p1, fontScale: 0.74 }, this.difficulty, (p, c) => this.onAnswered(p, c)),
      ];
    } else {
      this.add.text(GAME_WIDTH / 2, 36, `🏆 Best: ${this.best}`, { fontFamily: 'Arial Black, Arial', fontSize: '16px', color: '#ffd93d' }).setOrigin(0.5).setDepth(6);
      this.panels = [
        new HLPanel(this, { centerY: 392, height: 560, flip: false, accent: COLORS.p1, fontScale: 1 }, this.difficulty, (p, c) => this.onAnswered(p, c)),
      ];
    }
  }

  update(_t: number, delta: number): void {
    if (this.over || this.paused) return;
    for (const p of this.panels) p.tick(delta);
  }

  private onAnswered(panel: HLPanel, correct: boolean): void {
    if (correct) spawnConfetti(this, GAME_WIDTH / 2, this.mode === '2p' ? (panel === this.panels[0] ? 200 : 520) : 300, 12);

    // bust?
    if (panel.hearts <= 0) {
      panel.alive = false;
      if (this.mode === 'ai') { this.handleBust(panel); return; }
      // 2P: someone died → match over
      this.endMatch2P();
      return;
    }

    // 1P stage interstitial on a clean streak boundary
    if (this.mode === 'ai' && correct && panel.correct % STAGE_EVERY === 0) {
      this.stageBreak(panel);
      return;
    }

    this.time.delayedCall(900, () => { if (!this.over && panel.alive) panel.nextRound(); });
  }

  private stageBreak(panel: HLPanel): void {
    this.paused = true;
    const banner = this.add.text(GAME_WIDTH / 2, 300, '⭐ Stage cleared! ⭐', { ...STATUS_STYLE, fontSize: '24px' }).setOrigin(0.5).setDepth(30);
    pulseTween(this, banner);
    audio.win();
    this.time.delayedCall(800, () => {
      banner.destroy();
      void Ads.maybeInterstitial().finally(() => {
        this.paused = false;
        if (!this.over && panel.alive) panel.nextRound();
      });
    });
  }

  private handleBust(panel: HLPanel): void {
    if (this.revivesUsed >= MAX_REVIVES) { this.endMatch1P(panel); return; }
    this.paused = true;
    const overlay = this.add.container(0, 0).setDepth(40);
    const dim = this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.55);
    const msg = this.add.text(GAME_WIDTH / 2, 260, 'Out of hearts!', { ...STATUS_STYLE, fontSize: '26px' }).setOrigin(0.5);
    const reviveBg = this.add.rectangle(GAME_WIDTH / 2, 340, 260, 60, 0x2fb875, 1).setStrokeStyle(2, 0xffffff, 0.4).setInteractive({ useHandCursor: true });
    const reviveTxt = this.add.text(GAME_WIDTH / 2, 340, '❤️ Revive (watch ad)', { fontFamily: 'Arial Black, Arial', fontSize: '18px', color: '#ffffff' }).setOrigin(0.5);
    const endBg = this.add.rectangle(GAME_WIDTH / 2, 414, 260, 52, 0xffffff, 0.16).setInteractive({ useHandCursor: true });
    const endTxt = this.add.text(GAME_WIDTH / 2, 414, 'Give up', { fontFamily: 'Arial Black, Arial', fontSize: '16px', color: '#ffffff' }).setOrigin(0.5);
    overlay.add([dim, msg, reviveBg, reviveTxt, endBg, endTxt]);

    const close = (): void => overlay.destroy();
    reviveBg.on('pointerdown', () => {
      audio.click();
      void Ads.showRewarded().then((earned) => {
        close();
        if (earned) {
          this.revivesUsed++;
          this.paused = false;
          panel.revive();
        } else {
          this.endMatch1P(panel);
        }
      });
    });
    endBg.on('pointerdown', () => { audio.click(); close(); this.endMatch1P(panel); });
  }

  private endMatch1P(panel: HLPanel): void {
    if (this.over) return;
    this.over = true; this.paused = false;
    const isBest = panel.score > this.best;
    Storage.setBest(BEST_KEY, panel.score);
    if (isBest && panel.score > 0) spawnConfetti(this, GAME_WIDTH / 2, 300, 40);
    panel.score > 0 ? audio.win() : audio.lose();
    showResult(this, {
      title: isBest && panel.score > 0 ? 'New best! 🎉' : 'Game over',
      subtitle: `Score ${panel.score}  ·  Best ${Math.max(panel.score, this.best)}`,
      onRematch: () => { void Ads.maybeInterstitial(); this.scene.restart({ mode: this.mode, difficulty: this.difficulty }); },
      onHome: () => this.toHub(true),
    });
  }

  private endMatch2P(): void {
    if (this.over) return;
    this.over = true;
    const [p2, p1] = this.panels; // index 0 = top (P2), 1 = bottom (P1)
    const p1Won = p1.alive || (!p1.alive && !p2.alive && p1.score >= p2.score);
    const title = p1Won ? 'Player 1 wins! 🎉' : 'Player 2 wins! 🎉';
    audio.win();
    spawnConfetti(this, GAME_WIDTH / 2, p1Won ? 520 : 200, 36);
    this.time.delayedCall(400, () =>
      showResult(this, {
        title,
        subtitle: `${p1.score} – ${p2.score}`,
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
