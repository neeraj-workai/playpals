import Phaser from 'phaser';
import { GAME_WIDTH, COLORS, GAME_ARENA_BG } from '../../core/config';
import { Ads } from '../../core/ads/AdManager';
import { audio } from '../../core/audio/AudioManager';
import { addBackButton } from '../../core/ui/Hud';
import { showResult } from '../../core/ui/ResultOverlay';
import { GameMode } from '../types';
import { ensureSoleActiveScene } from '../../core/ui/NavGuard';
import { setupSceneScale } from '../../core/scale';

const FACES = ['🍎', '🍌', '🍇', '🍒', '🥝', '🍑', '🍓', '🥥'];
const COUNT = 16;
const CARD = 72;
const GAP = 8;
const OX = (GAME_WIDTH - (4 * CARD + 3 * GAP)) / 2;
const OY = 190;
const AI_MEMORY = 0.78; // chance the CPU remembers a revealed card

interface Card {
  value: string;
  faceUp: boolean;
  matched: boolean;
}

export class MemoryScene extends Phaser.Scene {
  private mode: GameMode = 'ai';
  private cards: Card[] = [];
  private objs: { rect: Phaser.GameObjects.Rectangle; label: Phaser.GameObjects.Text }[] = [];
  private seen: Record<string, number[]> = {};
  private current = 1;
  private first = -1;
  private locked = false;
  private matched = 0;
  private p1 = 0;
  private p2 = 0;
  private p1Text!: Phaser.GameObjects.Text;
  private p2Text!: Phaser.GameObjects.Text;
  private turnText!: Phaser.GameObjects.Text;
  private over = false;

  constructor() {
    super('Memory');
  }

  init(data: { mode?: GameMode }): void {
    this.mode = data?.mode ?? 'ai';
  }

  create(): void {
    ensureSoleActiveScene(this);
    setupSceneScale(this);
    this.current = 1;
    this.first = -1;
    this.locked = false;
    this.matched = 0;
    this.p1 = 0;
    this.p2 = 0;
    this.over = false;
    this.seen = {};
    this.cameras.main.setBackgroundColor(GAME_ARENA_BG);

    const deck = Phaser.Utils.Array.Shuffle([...FACES, ...FACES]);
    this.cards = deck.map((value) => ({ value, faceUp: false, matched: false }));
    this.objs = [];

    addBackButton(this, () => this.toHub(false));
    this.p2Text = this.add.text(60, 40, '0', { fontFamily: 'Arial Black, Arial', fontSize: '26px', color: '#' + COLORS.p2.toString(16) }).setOrigin(0.5);
    this.p1Text = this.add.text(340, 40, '0', { fontFamily: 'Arial Black, Arial', fontSize: '26px', color: '#' + COLORS.p1.toString(16) }).setOrigin(0.5);
    this.add.text(60, 60, this.mode === 'ai' ? 'CPU' : 'P2', { fontFamily: 'Arial', fontSize: '11px', color: COLORS.inkDim }).setOrigin(0.5);
    this.add.text(340, 60, 'P1', { fontFamily: 'Arial', fontSize: '11px', color: COLORS.inkDim }).setOrigin(0.5);
    this.turnText = this.add.text(GAME_WIDTH / 2, 150, '', { fontFamily: 'Arial Black, Arial', fontSize: '20px', color: '#ffffff' }).setOrigin(0.5);

    for (let i = 0; i < COUNT; i++) {
      const { x, y } = this.center(i);
      const rect = this.add.rectangle(x, y, CARD, CARD, COLORS.panel, 1).setStrokeStyle(2, 0x33405e, 1).setInteractive({ useHandCursor: true });
      const label = this.add.text(x, y, '?', { fontFamily: 'Arial', fontSize: '34px', color: COLORS.inkDim }).setOrigin(0.5);
      rect.on('pointerdown', () => this.humanTap(i));
      this.objs.push({ rect, label });
    }

    this.updateTurn();
  }

  private center(i: number): { x: number; y: number } {
    return { x: OX + (i % 4) * (CARD + GAP) + CARD / 2, y: OY + Math.floor(i / 4) * (CARD + GAP) + CARD / 2 };
  }

  private down(i: number): boolean {
    return !this.cards[i].faceUp && !this.cards[i].matched;
  }

  private humanTap(i: number): void {
    if (this.locked || this.over) return;
    if (this.mode === 'ai' && this.current !== 1) return;
    if (!this.down(i)) return;
    this.reveal(i);
    if (this.first < 0) {
      this.first = i;
    } else {
      const a = this.first;
      this.first = -1;
      this.locked = true;
      this.time.delayedCall(550, () => this.resolve(a, i));
    }
  }

  private reveal(i: number): void {
    this.cards[i].faceUp = true;
    this.draw(i);
    audio.click();
    if (Math.random() < AI_MEMORY) {
      const arr = (this.seen[this.cards[i].value] ??= []);
      if (!arr.includes(i)) arr.push(i);
    }
  }

  private draw(i: number): void {
    const c = this.cards[i];
    const { rect, label } = this.objs[i];
    if (c.matched) {
      rect.setFillStyle(0x1f3b2f, 1).setStrokeStyle(2, 0x34d399, 1);
      label.setText(c.value);
    } else if (c.faceUp) {
      rect.setFillStyle(COLORS.panelLight, 1).setStrokeStyle(2, 0x5a6a8a, 1);
      label.setText(c.value);
    } else {
      rect.setFillStyle(COLORS.panel, 1).setStrokeStyle(2, 0x33405e, 1);
      label.setText('?').setColor(COLORS.inkDim);
    }
  }

  private resolve(a: number, b: number): void {
    if (this.cards[a].value === this.cards[b].value && a !== b) {
      this.cards[a].matched = true;
      this.cards[b].matched = true;
      this.draw(a);
      this.draw(b);
      audio.place();
      if (this.current === 1) this.p1++;
      else this.p2++;
      this.updateScores();
      this.matched += 2;
      if (this.matched >= COUNT) {
        this.endMatch();
        return;
      }
      this.locked = false;
      if (this.mode === 'ai' && this.current === 2) this.time.delayedCall(500, () => this.aiTurn());
    } else {
      audio.bump();
      this.time.delayedCall(500, () => {
        this.cards[a].faceUp = false;
        this.cards[b].faceUp = false;
        this.draw(a);
        this.draw(b);
        this.current = this.current === 1 ? 2 : 1;
        this.updateTurn();
        this.locked = false;
        if (this.mode === 'ai' && this.current === 2) this.time.delayedCall(450, () => this.aiTurn());
      });
    }
  }

  private aiTurn(): void {
    if (this.over) return;
    this.locked = true;
    const known = this.aiKnownPair();
    if (known) {
      this.aiReveal(known[0], () => this.aiReveal(known[1], () => this.resolve(known[0], known[1])));
      return;
    }
    const a = this.randDown();
    if (a < 0) {
      this.locked = false;
      return;
    }
    this.aiReveal(a, () => {
      let b = this.aiMatchFor(a);
      if (b < 0) b = this.randDown(a);
      if (b < 0) {
        this.resolve(a, a);
        return;
      }
      this.aiReveal(b, () => this.resolve(a, b));
    });
  }

  private aiReveal(i: number, cb: () => void): void {
    this.reveal(i);
    this.time.delayedCall(650, cb);
  }

  private aiKnownPair(): [number, number] | null {
    for (const val of Object.keys(this.seen)) {
      const idxs = this.seen[val].filter((i) => this.down(i));
      if (idxs.length >= 2) return [idxs[0], idxs[1]];
    }
    return null;
  }

  private aiMatchFor(a: number): number {
    const idxs = (this.seen[this.cards[a].value] ?? []).filter((i) => i !== a && this.down(i));
    return idxs.length ? idxs[0] : -1;
  }

  private randDown(except = -1): number {
    const opts = this.cards.map((_, i) => i).filter((i) => this.down(i) && i !== except);
    return opts.length ? Phaser.Utils.Array.GetRandom(opts) : -1;
  }

  private updateScores(): void {
    this.p1Text.setText(String(this.p1));
    this.p2Text.setText(String(this.p2));
  }

  private updateTurn(): void {
    if (this.over) return;
    const color = this.current === 1 ? COLORS.p1 : COLORS.p2;
    let label: string;
    if (this.mode === 'ai') label = this.current === 1 ? 'Your turn' : 'CPU thinking…';
    else label = this.current === 1 ? 'P1 turn' : 'P2 turn';
    this.turnText.setText(label).setColor('#' + color.toString(16).padStart(6, '0'));
  }

  private endMatch(): void {
    this.over = true;
    this.turnText.setText('');
    const p1won = this.p1 > this.p2;
    const draw = this.p1 === this.p2;
    let title: string;
    let color = '#ffffff';
    if (draw) {
      title = 'Draw';
    } else if (this.mode === 'ai') {
      title = p1won ? 'You win!' : 'CPU wins';
      color = '#' + (p1won ? COLORS.p1 : COLORS.p2).toString(16).padStart(6, '0');
      p1won ? audio.win() : audio.lose();
    } else {
      title = p1won ? 'Player 1 wins!' : 'Player 2 wins!';
      color = '#' + (p1won ? COLORS.p1 : COLORS.p2).toString(16).padStart(6, '0');
      audio.win();
    }
    if (draw) audio.bump();
    this.time.delayedCall(700, () =>
      showResult(this, {
        title,
        titleColor: color,
        subtitle: `${this.p1} – ${this.p2}`,
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
