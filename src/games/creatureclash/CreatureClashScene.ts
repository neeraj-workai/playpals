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

// ---- tuning ----------------------------------------------------------------
const MAX_FOOD = 14;       // each player spends this many feeds, total
const EVOLVE_TIME = 30;    // seconds (or until both run out of food)
const BATTLE_TICK = 90;    // ms — battle simulation step

type Stat = 'atk' | 'def' | 'mag' | 'spd';

// food -> stat it builds, plus its accent colour
const FOODS: { emoji: string; stat: Stat; color: number; pop: string }[] = [
  { emoji: '🍖', stat: 'atk', color: 0xff6b6b, pop: '+ATK' },
  { emoji: '🛡️', stat: 'def', color: 0x4dabf7, pop: '+DEF' },
  { emoji: '🔮', stat: 'mag', color: 0xc084fc, pop: '+MAG' },
  { emoji: '⚡', stat: 'spd', color: 0x51cf66, pop: '+SPD' },
];
const STAT_COLOR: Record<Stat, number> = { atk: 0xff6b6b, def: 0x4dabf7, mag: 0xc084fc, spd: 0x51cf66 };

// evolution families: index 0 = egg (no feeds), then 3 tiers by total spent.
// Which family is used depends on the creature's dominant stat.
const FAMILIES: Record<Stat | 'none', string[]> = {
  none: ['🥚', '🐣', '🐤', '🐉'],
  atk: ['🥚', '🦎', '🐊', '🦖'],
  def: ['🥚', '🐢', '🦏', '🦕'],
  mag: ['🥚', '🐣', '🦄', '🐉'],
  spd: ['🥚', '🐁', '🐇', '🐆'],
};
const BUILD_NAME: Record<Stat | 'none', string> = {
  none: 'Hatchling', atk: 'Brawler', def: 'Guardian', mag: 'Sorcerer', spd: 'Sprinter',
};

interface Fighter {
  id: 1 | 2;
  isAI: boolean;
  homeX: number;
  homeY: number;
  facing: 1 | -1;     // direction it lunges in battle
  atk: number;
  def: number;
  mag: number;
  spd: number;
  food: number;
  hp: number;
  maxHp: number;
  nextAttackAt: number;
  sprite: Phaser.GameObjects.Text;
  glow: Phaser.GameObjects.Arc;
  budgetText: Phaser.GameObjects.Text;
  nameText: Phaser.GameObjects.Text;
  statBars: Phaser.GameObjects.Graphics;
  hpBar?: Phaser.GameObjects.Graphics;
  hpText?: Phaser.GameObjects.Text;
}

export class CreatureClashScene extends Phaser.Scene {
  private mode: GameMode = 'ai';
  private difficulty: Difficulty = 'medium';
  private fighters: Fighter[] = [];
  private phase: 'evolve' | 'battle' | 'done' = 'evolve';
  private timeLeft = EVOLVE_TIME;
  private status!: Phaser.GameObjects.Text;
  private timeText!: Phaser.GameObjects.Text;
  private clock?: Phaser.Time.TimerEvent;
  private battleTimer?: Phaser.Time.TimerEvent;
  private aiTimer?: Phaser.Time.TimerEvent;
  private foodButtons: Phaser.GameObjects.Container[] = [];

  constructor() {
    super('CreatureClash');
  }

  init(data: { mode?: GameMode; difficulty?: Difficulty }): void {
    this.mode = data?.mode ?? 'ai';
    this.difficulty = data?.difficulty ?? 'medium';
  }

  create(): void {
    ensureSoleActiveScene(this);
    setupSceneScale(this);
    this.phase = 'evolve';
    this.timeLeft = EVOLVE_TIME;
    this.foodButtons = [];
    this.cameras.main.setBackgroundColor(0x141022);

    // two arena panels (P2 top, P1 bottom) + centre divider
    this.add.rectangle(GAME_WIDTH / 2, 175, GAME_WIDTH - 20, 320, 0x231d3a, 1).setStrokeStyle(2, COLORS.p2, 0.5);
    this.add.rectangle(GAME_WIDTH / 2, 525, GAME_WIDTH - 20, 320, 0x1d1f3a, 1).setStrokeStyle(2, COLORS.p1, 0.5);

    addBackButton(this, () => this.toHub(false));
    this.timeText = this.add.text(GAME_WIDTH / 2, 350, EVOLVE_TIME + '', { fontFamily: 'Arial Black, Arial', fontSize: '30px', color: '#ffffff' }).setOrigin(0.5).setDepth(30);
    this.add.text(GAME_WIDTH / 2, 374, 'EVOLVE', { fontFamily: 'Arial', fontSize: '11px', color: COLORS.inkDim }).setOrigin(0.5).setDepth(30);

    this.add.text(GAME_WIDTH / 2, 28, this.mode === 'ai' ? 'CPU' : 'PLAYER 2', { fontFamily: 'Arial Black, Arial', fontSize: '13px', color: '#' + COLORS.p2.toString(16) }).setOrigin(0.5);
    this.add.text(GAME_WIDTH / 2, 685, 'PLAYER 1', { fontFamily: 'Arial Black, Arial', fontSize: '13px', color: '#' + COLORS.p1.toString(16) }).setOrigin(0.5);

    this.status = this.add.text(GAME_WIDTH / 2, 350, '', { ...STATUS_STYLE, fontSize: '30px', align: 'center' }).setOrigin(0.5).setDepth(40);

    // fighters
    const p1 = this.makeFighter(1, false, COLORS.p1, GAME_WIDTH / 2, 500, -1);
    const p2 = this.makeFighter(2, this.mode === 'ai', COLORS.p2, GAME_WIDTH / 2, 150, 1);
    this.fighters = [p1, p2];

    // food rows — P1 (bottom, interactive) and, in 2P, P2 (top, interactive)
    this.makeFoodRow(p1, 632);
    if (this.mode === '2p') this.makeFoodRow(p2, 250);
    else this.add.text(GAME_WIDTH / 2, 250, '🤖 CPU is evolving…', { fontFamily: 'Arial', fontSize: '13px', color: COLORS.inkDim }).setOrigin(0.5);

    this.fighters.forEach((f) => this.refresh(f));

    this.clock = this.time.addEvent({ delay: 1000, loop: true, callback: () => this.tickClock() });
    if (this.mode === 'ai') this.scheduleAI(p2);

    this.status.setText('FEED YOUR EGG!');
    this.tweens.add({ targets: this.status, scale: { from: 0.6, to: 1 }, duration: 300, ease: 'Back.out', yoyo: true, hold: 600, onComplete: () => this.status.setText('') });
  }

  // -- setup helpers ---------------------------------------------------------
  private makeFighter(id: 1 | 2, isAI: boolean, color: number, x: number, y: number, facing: 1 | -1): Fighter {
    const glow = this.add.circle(x, y, 48, color, 0.18).setDepth(2);
    const sprite = this.add.text(x, y, '🥚', { fontSize: '64px' }).setOrigin(0.5).setDepth(3);
    const nameText = this.add.text(x, y + 56, 'Egg', { fontFamily: 'Arial Black, Arial', fontSize: '15px', color: '#' + color.toString(16) }).setOrigin(0.5).setDepth(3);
    const statBars = this.add.graphics().setDepth(3);
    const budgetText = this.add.text(x, y - 70, '', { fontFamily: 'Arial', fontSize: '12px', color: COLORS.inkDim }).setOrigin(0.5).setDepth(3);
    return {
      id, isAI, homeX: x, homeY: y, facing,
      atk: 0, def: 0, mag: 0, spd: 0, food: MAX_FOOD,
      hp: 0, maxHp: 0, nextAttackAt: 0,
      sprite, glow, budgetText, nameText, statBars,
    };
  }

  private makeFoodRow(f: Fighter, y: number): void {
    const n = FOODS.length;
    const gap = 84;
    const x0 = GAME_WIDTH / 2 - ((n - 1) * gap) / 2;
    FOODS.forEach((food, i) => {
      const x = x0 + i * gap;
      const bg = this.add.rectangle(0, 0, 64, 64, food.color, 0.16).setStrokeStyle(2, food.color, 0.9);
      const em = this.add.text(0, -4, food.emoji, { fontSize: '30px' }).setOrigin(0.5);
      const lbl = this.add.text(0, 22, food.pop, { fontFamily: 'Arial Black, Arial', fontSize: '10px', color: '#' + food.color.toString(16) }).setOrigin(0.5);
      const c = this.add.container(x, y, [bg, em, lbl]).setSize(64, 64).setDepth(5);
      c.setInteractive(new Phaser.Geom.Rectangle(-32, -32, 64, 64), Phaser.Geom.Rectangle.Contains);
      c.on('pointerdown', () => {
        if (this.phase !== 'evolve' || f.food <= 0) return;
        this.feed(f, food.stat, food.color);
        this.tweens.add({ targets: c, scale: { from: 0.86, to: 1 }, duration: 120, ease: 'Back.out' });
      });
      this.foodButtons.push(c);
    });
  }

  private scheduleAI(f: Fighter): void {
    // CPU picks a build archetype, then spends its food over the evolve phase.
    const plans: Stat[][] = [
      ['atk', 'atk', 'spd'],            // glass cannon
      ['def', 'def', 'mag'],            // tanky mage
      ['atk', 'def', 'mag', 'spd'],     // balanced
      ['mag', 'mag', 'spd'],            // burst caster
      ['atk', 'atk', 'def'],            // bruiser
    ];
    const plan = Phaser.Utils.Array.GetRandom(plans);
    // easy CPU wastes some food (stops early); hard CPU spends it all fast.
    const skip = this.difficulty === 'easy' ? 5 : this.difficulty === 'hard' ? 0 : 2;
    const interval = this.difficulty === 'hard' ? 1100 : 1700;
    let i = 0;
    this.aiTimer = this.time.addEvent({
      delay: interval, loop: true, callback: () => {
        if (this.phase !== 'evolve') return;
        if (f.food <= skip) return;
        const stat = plan[i % plan.length];
        i++;
        this.feed(f, stat, STAT_COLOR[stat]);
      },
    });
  }

  // -- feeding ---------------------------------------------------------------
  private feed(f: Fighter, stat: Stat, color: number): void {
    f.food--;
    f[stat]++;
    audio.place();

    // floating "+STAT" pop
    const pop = this.add.text(f.homeX + Phaser.Math.Between(-30, 30), f.homeY - 30, '+' + stat.toUpperCase(), { fontFamily: 'Arial Black, Arial', fontSize: '15px', color: '#' + color.toString(16) }).setOrigin(0.5).setDepth(10);
    this.tweens.add({ targets: pop, y: pop.y - 40, alpha: 0, duration: 650, ease: 'Power2', onComplete: () => pop.destroy() });

    // chomp bounce
    this.tweens.killTweensOf(f.sprite);
    this.tweens.add({ targets: f.sprite, scale: { from: 1.25, to: 1 }, duration: 220, ease: 'Back.out' });

    this.refresh(f);
    this.checkPhaseEnd();
  }

  private dominant(f: Fighter): Stat | 'none' {
    const total = f.atk + f.def + f.mag + f.spd;
    if (total === 0) return 'none';
    const order: Stat[] = ['atk', 'def', 'mag', 'spd'];
    return order.reduce((best, s) => (f[s] > f[best] ? s : best), order[0]);
  }

  private tier(f: Fighter): number {
    const t = f.atk + f.def + f.mag + f.spd;
    return t === 0 ? 0 : t < 5 ? 1 : t < 10 ? 2 : 3;
  }

  /** Re-render a fighter's emoji, glow, name, stat bars and food counter. */
  private refresh(f: Fighter): void {
    const dom = this.dominant(f);
    const tier = this.tier(f);
    f.sprite.setText(FAMILIES[dom][tier]).setFontSize(48 + tier * 8);
    const col = dom === 'none' ? (f.id === 1 ? COLORS.p1 : COLORS.p2) : STAT_COLOR[dom];
    f.glow.setFillStyle(col, 0.18).setRadius(40 + tier * 6);
    f.nameText.setText(dom === 'none' ? 'Egg' : BUILD_NAME[dom]).setColor('#' + col.toString(16));
    f.budgetText.setText('🍽️ ' + f.food + ' left');

    // four mini stat bars under the name
    const stats: Stat[] = ['atk', 'def', 'mag', 'spd'];
    const bw = 30;
    const x0 = f.homeX - (stats.length * bw) / 2;
    const by = f.homeY + 72;
    f.statBars.clear();
    stats.forEach((s, i) => {
      const x = x0 + i * bw;
      f.statBars.fillStyle(0x2a2542, 1).fillRoundedRect(x + 2, by, bw - 4, 6, 3);
      const w = Math.min(f[s], MAX_FOOD) / MAX_FOOD * (bw - 4);
      f.statBars.fillStyle(STAT_COLOR[s], 1).fillRoundedRect(x + 2, by, w, 6, 3);
    });
  }

  // -- phase flow ------------------------------------------------------------
  private checkPhaseEnd(): void {
    if (this.phase === 'evolve' && this.fighters.every((f) => f.food <= 0)) this.startBattle();
  }

  private tickClock(): void {
    if (this.phase !== 'evolve') return;
    this.timeLeft--;
    this.timeText.setText(this.timeLeft + '');
    if (this.timeLeft <= 5) this.timeText.setColor('#ff6b6b');
    if (this.timeLeft <= 0) this.startBattle();
  }

  private startBattle(): void {
    if (this.phase !== 'evolve') return;
    this.phase = 'battle';
    this.clock?.remove(false);
    this.aiTimer?.remove(false);
    this.foodButtons.forEach((c) => c.destroy());
    this.timeText.setText('');
    this.fighters.forEach((f) => { f.budgetText.setVisible(false); });

    // compute battle stats from the build
    this.fighters.forEach((f) => {
      f.maxHp = 60 + f.def * 10;
      f.hp = f.maxHp;
      f.nextAttackAt = 0;
      // hp bar
      const bar = this.add.graphics().setDepth(8);
      const txt = this.add.text(f.homeX, f.homeY - 92, '', { fontFamily: 'Arial Black, Arial', fontSize: '13px', color: '#ffffff' }).setOrigin(0.5).setDepth(8);
      f.hpBar = bar;
      f.hpText = txt;
      this.drawHp(f);
    });

    this.status.setText('BATTLE!');
    this.status.setColor('#ffd93d');
    audio.beep();
    this.tweens.add({ targets: this.status, scale: { from: 0.5, to: 1 }, duration: 400, ease: 'Back.out', yoyo: true, hold: 500, onComplete: () => this.status.setText('') });

    this.time.delayedCall(900, () => {
      if (this.phase !== 'battle') return;
      const now = this.time.now;
      this.fighters.forEach((f) => { f.nextAttackAt = now + this.attackInterval(f); });
      this.battleTimer = this.time.addEvent({ delay: BATTLE_TICK, loop: true, callback: () => this.battleStep() });
    });
  }

  // attack cadence: more speed -> attacks sooner. ponytail: linear, retune the
  // two constants if matches feel too fast/slow.
  private attackInterval(f: Fighter): number {
    return Math.max(360, 950 - f.spd * 70);
  }

  private battleStep(): void {
    if (this.phase !== 'battle') return;
    const now = this.time.now;
    for (const f of this.fighters) {
      if (f.hp <= 0) continue;
      if (now >= f.nextAttackAt) {
        f.nextAttackAt = now + this.attackInterval(f);
        const target = this.fighters.find((o) => o !== f);
        if (target && target.hp > 0) this.attack(f, target);
      }
    }
  }

  private attack(f: Fighter, target: Fighter): void {
    // magic gives a crit chance; everyone deals at least chip damage so a
    // pure-tank mirror still resolves before anyone falls asleep.
    const crit = Math.random() < Math.min(0.6, f.mag * 0.05);
    const base = 8 + f.atk * 4 + f.mag * 2;
    const dmg = Math.round(base * (crit ? 1.9 : 1) * Phaser.Math.FloatBetween(0.9, 1.1));

    // lunge toward the opponent and snap back
    const dx = (target.homeX - f.homeX);
    const dy = (target.homeY - f.homeY);
    const len = Math.hypot(dx, dy) || 1;
    this.tweens.add({
      targets: [f.sprite, f.glow], x: f.homeX + (dx / len) * 46, y: f.homeY + (dy / len) * 46,
      duration: 130, yoyo: true, ease: 'Power2',
      onYoyo: () => this.applyHit(target, dmg, crit),
    });
  }

  private applyHit(target: Fighter, dmg: number, crit: boolean): void {
    if (this.phase !== 'battle' || target.hp <= 0) return;
    target.hp = Math.max(0, target.hp - dmg);
    audio.hit();
    this.cameras.main.shake(crit ? 160 : 90, crit ? 0.012 : 0.006);

    // damage number
    const t = this.add.text(target.homeX + Phaser.Math.Between(-20, 20), target.homeY - 20, (crit ? '💥' : '') + dmg, { fontFamily: 'Arial Black, Arial', fontSize: crit ? '26px' : '20px', color: crit ? '#ffd93d' : '#ffffff', stroke: '#000', strokeThickness: 3 }).setOrigin(0.5).setDepth(12);
    this.tweens.add({ targets: t, y: t.y - 36, alpha: 0, duration: 700, ease: 'Power2', onComplete: () => t.destroy() });

    // flash + knock
    this.tweens.add({ targets: target.sprite, x: target.homeX + this.facingNudge(target), duration: 70, yoyo: true });
    target.sprite.setTint(0xff6b6b);
    this.time.delayedCall(120, () => target.sprite.clearTint());

    this.drawHp(target);
    if (target.hp <= 0) this.knockOut(target);
  }

  private facingNudge(target: Fighter): number {
    return target.homeX + (target.facing === 1 ? -12 : 12) - target.homeX;
  }

  private drawHp(f: Fighter): void {
    if (!f.hpBar) return;
    const w = 130;
    const x = f.homeX - w / 2;
    const y = f.homeY - 82;
    const frac = f.hp / f.maxHp;
    f.hpBar.clear();
    f.hpBar.fillStyle(0x2a2542, 1).fillRoundedRect(x, y, w, 9, 4);
    const col = frac > 0.5 ? 0x51cf66 : frac > 0.25 ? 0xffd93d : 0xff6b6b;
    f.hpBar.fillStyle(col, 1).fillRoundedRect(x, y, Math.max(0, w * frac), 9, 4);
    f.hpText?.setText(`${f.hp}/${f.maxHp}`);
  }

  private knockOut(loser: Fighter): void {
    this.tweens.add({ targets: [loser.sprite, loser.glow], angle: 540, alpha: 0.25, scale: 0.6, y: loser.homeY + 20, duration: 700, ease: 'Power2' });
    this.endMatch(loser);
  }

  // -- end -------------------------------------------------------------------
  private endMatch(loser: Fighter): void {
    if (this.phase === 'done') return;
    this.phase = 'done';
    this.battleTimer?.remove(false);

    const winner = this.fighters.find((f) => f !== loser)!;
    const p1Won = winner.id === 1;

    let title: string;
    if (this.mode === 'ai') {
      title = p1Won ? 'You win!' : 'CPU wins';
      p1Won ? audio.win() : audio.lose();
    } else {
      title = p1Won ? 'Player 1 wins!' : 'Player 2 wins!';
      audio.win();
    }

    const wEmoji = FAMILIES[this.dominant(winner)][this.tier(winner)];
    const lEmoji = FAMILIES[this.dominant(loser)][this.tier(loser)];
    pulseTween(this, winner.sprite);
    spawnConfetti(this, winner.homeX, winner.homeY);

    this.time.delayedCall(700, () => {
      showResult(this, {
        title,
        subtitle: `${wEmoji} beat ${lEmoji}`,
        onRematch: () => { void Ads.maybeInterstitial(); this.scene.restart({ mode: this.mode, difficulty: this.difficulty }); },
        onHome: () => this.toHub(true),
      });
    });
  }

  private toHub(withAd: boolean): void {
    this.clock?.remove(false);
    this.aiTimer?.remove(false);
    this.battleTimer?.remove(false);
    if (withAd) void Ads.maybeInterstitial();
    this.scene.start('Hub');
  }
}

// ponytail: one runnable check for the battle resolution — a faster, equal-stat
// fighter must out-DPS its opponent, and damage must always be positive so a
// match can't stalemate. DEV-only, no live scene needed.
if (import.meta.env.DEV) {
  const dmg = (atk: number, mag: number): number => 8 + atk * 4 + mag * 2;
  const interval = (spd: number): number => Math.max(360, 950 - spd * 70);
  console.assert(dmg(0, 0) > 0, 'every fighter must deal positive damage (no stalemate)');
  console.assert(interval(8) < interval(2), 'more speed must mean a shorter attack interval');
  console.assert(dmg(5, 0) > dmg(0, 0), 'attack stat must increase damage');
}
