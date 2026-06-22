import Phaser from 'phaser';
import { GAME_WIDTH, COLORS, GAME_ARENA_BG } from '../../core/config';
import { Ads } from '../../core/ads/AdManager';
import { audio } from '../../core/audio/AudioManager';
import { addBackButton } from '../../core/ui/Hud';
import { showResult } from '../../core/ui/ResultOverlay';
import { GameMode } from '../types';
import { ensureSoleActiveScene } from '../../core/ui/NavGuard';
import { setupSceneScale } from '../../core/scale';

const N = 3; // boxes per side (3x3 = 9 boxes, 4x4 dots)
const SP = 86;
const OX = (GAME_WIDTH - N * SP) / 2;
const OY = 214;

interface Edge {
  type: 'h' | 'v';
  r: number;
  c: number;
}

export class DotsBoxesScene extends Phaser.Scene {
  private mode: GameMode = 'ai';
  private hTaken: number[][] = [];
  private vTaken: number[][] = [];
  private boxOwner: number[][] = [];
  private current = 1;
  private p1 = 0;
  private p2 = 0;
  private over = false;
  private locked = false;
  private p1Text!: Phaser.GameObjects.Text;
  private p2Text!: Phaser.GameObjects.Text;
  private turnText!: Phaser.GameObjects.Text;
  private edgeGfx!: Phaser.GameObjects.Graphics;
  private boxGfx!: Phaser.GameObjects.Graphics;

  constructor() {
    super('DotsBoxes');
  }

  init(data: { mode?: GameMode }): void {
    this.mode = data?.mode ?? 'ai';
  }

  create(): void {
    ensureSoleActiveScene(this);
    setupSceneScale(this);
    this.hTaken = Array.from({ length: N + 1 }, () => new Array(N).fill(0));
    this.vTaken = Array.from({ length: N }, () => new Array(N + 1).fill(0));
    this.boxOwner = Array.from({ length: N }, () => new Array(N).fill(0));
    this.current = 1;
    this.p1 = 0;
    this.p2 = 0;
    this.over = false;
    this.locked = false;
    this.cameras.main.setBackgroundColor(0x0f1545); // dark indigo

    addBackButton(this, () => this.toHub(false));
    this.p2Text = this.add.text(56, 40, '0', { fontFamily: 'Arial Black, Arial', fontSize: '26px', color: '#' + COLORS.p2.toString(16) }).setOrigin(0.5);
    this.p1Text = this.add.text(344, 40, '0', { fontFamily: 'Arial Black, Arial', fontSize: '26px', color: '#' + COLORS.p1.toString(16) }).setOrigin(0.5);
    this.add.text(56, 60, this.mode === 'ai' ? 'CPU' : 'P2', { fontFamily: 'Arial', fontSize: '11px', color: COLORS.inkDim }).setOrigin(0.5);
    this.add.text(344, 60, 'P1', { fontFamily: 'Arial', fontSize: '11px', color: COLORS.inkDim }).setOrigin(0.5);
    this.turnText = this.add.text(GAME_WIDTH / 2, 150, '', { fontFamily: 'Arial Black, Arial', fontSize: '20px', color: '#ffffff' }).setOrigin(0.5);

    this.boxGfx = this.add.graphics().setDepth(0);
    const guide = this.add.graphics().setDepth(1);
    guide.lineStyle(2, 0x2a3550, 1);
    for (let r = 0; r <= N; r++) for (let c = 0; c < N; c++) guide.lineBetween(this.dx(c), this.dy(r), this.dx(c + 1), this.dy(r));
    for (let r = 0; r < N; r++) for (let c = 0; c <= N; c++) guide.lineBetween(this.dx(c), this.dy(r), this.dx(c), this.dy(r + 1));
    this.edgeGfx = this.add.graphics().setDepth(3);

    // dots
    for (let r = 0; r <= N; r++) for (let c = 0; c <= N; c++) this.add.circle(this.dx(c), this.dy(r), 5, 0x8b97ad, 1).setDepth(4);

    // edge tap zones
    for (let r = 0; r <= N; r++) for (let c = 0; c < N; c++) this.edgeZone('h', r, c);
    for (let r = 0; r < N; r++) for (let c = 0; c <= N; c++) this.edgeZone('v', r, c);

    this.updateTurn();
  }

  private dx(c: number): number {
    return OX + c * SP;
  }
  private dy(r: number): number {
    return OY + r * SP;
  }

  private edgeZone(type: 'h' | 'v', r: number, c: number): void {
    const z =
      type === 'h'
        ? this.add.rectangle(this.dx(c) + SP / 2, this.dy(r), SP - 14, 20, 0xffffff, 0.001)
        : this.add.rectangle(this.dx(c), this.dy(r) + SP / 2, 20, SP - 14, 0xffffff, 0.001);
    z.setInteractive({ useHandCursor: true }).setDepth(6);
    z.on('pointerover', () => { if (!this.taken(type, r, c) && !this.locked) z.setFillStyle(0xffffff, 0.12); });
    z.on('pointerout', () => z.setFillStyle(0xffffff, 0.001));
    z.on('pointerdown', () => this.humanTap(type, r, c));
  }

  private taken(type: 'h' | 'v', r: number, c: number): boolean {
    return (type === 'h' ? this.hTaken[r][c] : this.vTaken[r][c]) !== 0;
  }

  private humanTap(type: 'h' | 'v', r: number, c: number): void {
    if (this.over || this.locked || this.taken(type, r, c)) return;
    if (this.mode === 'ai' && this.current !== 1) return;
    this.apply(type, r, c, this.current);
    if (this.over) return;
    if (this.mode === 'ai' && this.current === 2) {
      this.locked = true;
      this.time.delayedCall(500, () => this.aiMove());
    }
  }

  private apply(type: 'h' | 'v', r: number, c: number, player: number): number {
    if (type === 'h') this.hTaken[r][c] = player;
    else this.vTaken[r][c] = player;
    const color = player === 1 ? COLORS.p1 : COLORS.p2;
    this.edgeGfx.lineStyle(6, color, 1);
    if (type === 'h') this.edgeGfx.lineBetween(this.dx(c), this.dy(r), this.dx(c + 1), this.dy(r));
    else this.edgeGfx.lineBetween(this.dx(c), this.dy(r), this.dx(c), this.dy(r + 1));
    audio.place();

    let completed = 0;
    for (const [br, bc] of this.adjBoxes(type, r, c)) {
      if (this.boxOwner[br][bc] === 0 && this.boxSides(br, bc) === 4) {
        this.boxOwner[br][bc] = player;
        this.fillBox(br, bc, color);
        if (player === 1) this.p1++;
        else this.p2++;
        completed++;
      }
    }
    this.p1Text.setText(String(this.p1));
    this.p2Text.setText(String(this.p2));

    if (this.p1 + this.p2 >= N * N) {
      this.endMatch();
    } else if (completed === 0) {
      this.current = this.current === 1 ? 2 : 1;
      this.updateTurn();
    } else {
      this.updateTurn();
    }
    return completed;
  }

  private fillBox(br: number, bc: number, color: number): void {
    this.boxGfx.fillStyle(color, 0.22);
    this.boxGfx.fillRect(this.dx(bc) + 4, this.dy(br) + 4, SP - 8, SP - 8);
  }

  private adjBoxes(type: 'h' | 'v', r: number, c: number): [number, number][] {
    const out: [number, number][] = [];
    if (type === 'h') {
      if (r - 1 >= 0) out.push([r - 1, c]);
      if (r < N) out.push([r, c]);
    } else {
      if (c - 1 >= 0) out.push([r, c - 1]);
      if (c < N) out.push([r, c]);
    }
    return out;
  }

  private boxSides(br: number, bc: number): number {
    return (this.hTaken[br][bc] ? 1 : 0) + (this.hTaken[br + 1][bc] ? 1 : 0) + (this.vTaken[br][bc] ? 1 : 0) + (this.vTaken[br][bc + 1] ? 1 : 0);
  }

  private freeEdges(): Edge[] {
    const out: Edge[] = [];
    for (let r = 0; r <= N; r++) for (let c = 0; c < N; c++) if (!this.hTaken[r][c]) out.push({ type: 'h', r, c });
    for (let r = 0; r < N; r++) for (let c = 0; c <= N; c++) if (!this.vTaken[r][c]) out.push({ type: 'v', r, c });
    return out;
  }

  private aiMove(): void {
    if (this.over) return;
    const free = this.freeEdges();
    const completing = free.filter((e) => this.adjBoxes(e.type, e.r, e.c).some(([br, bc]) => this.boxSides(br, bc) === 3));
    const safe = free.filter((e) => !this.adjBoxes(e.type, e.r, e.c).some(([br, bc]) => this.boxSides(br, bc) === 2));
    const pool = completing.length ? completing : safe.length ? safe : free;
    const choice = Phaser.Utils.Array.GetRandom(pool);

    this.time.delayedCall(450, () => {
      if (this.over) return;
      this.apply(choice.type, choice.r, choice.c, 2);
      if (this.over) return;
      if (this.current === 2) this.aiMove();
      else this.locked = false;
    });
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
    this.time.delayedCall(600, () =>
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

