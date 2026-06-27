import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, COLORS, GAME_ARENA_BG_HEX, DPR } from './core/config';
import { BootScene } from './core/scenes/BootScene';
import { OnboardingScene } from './core/scenes/OnboardingScene';
import { HubScene } from './core/scenes/HubScene';
import { ProfileScene } from './core/scenes/ProfileScene';
import { LeaderboardScene } from './core/scenes/LeaderboardScene';
import { SettingsScene } from './core/scenes/SettingsScene';
import { GameDetailScene } from './core/scenes/GameDetailScene';
import { PassPlayScene } from './core/scenes/PassPlayScene';

import { AirHockeyScene } from './games/airhockey/AirHockeyScene';
import { TicTacToeScene } from './games/tictactoe/TicTacToeScene';
import { Connect4Scene } from './games/connect4/Connect4Scene';
import { SumoScene } from './games/sumo/SumoScene';
import { QuickDrawScene } from './games/quickdraw/QuickDrawScene';
import { TankDuelScene } from './games/tank/TankDuelScene';
import { TugOfWarScene } from './games/tugofwar/TugOfWarScene';
import { HotPotatoScene } from './games/hotpotato/HotPotatoScene';
import { MemoryScene } from './games/memory/MemoryScene';
import { WhackScene } from './games/whackamole/WhackScene';
import { DotsBoxesScene } from './games/dotsboxes/DotsBoxesScene';
import { TapRaceScene } from './games/taprace/TapRaceScene';
import { CoinTossScene } from './games/cointoss/CoinTossScene';
import { EmojiQuizScene } from './games/emojiquiz/EmojiQuizScene';
import { CountdownScene } from './games/countdown/CountdownScene';
import { WordScrambleScene } from './games/wordscramble/WordScrambleScene';
import { GravityPongScene } from './games/gravitypong/GravityPongScene';
import { FlipGridScene } from './games/flipgrid/FlipGridScene';
import { HigherLowerScene } from './games/higherlower/HigherLowerScene';
import { TerritoryDuelScene } from './games/territory/TerritoryDuelScene';
import { CreatureClashScene } from './games/creatureclash/CreatureClashScene';

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: 'app',
  // High-DPI: canvas pixel buffer is DPR× the logical size. CSS scales it
  // down via Scale.FIT, so the canvas displays at native pixel density —
  // sharp text + edges on retina screens. Each scene calls setupSceneScale
  // to apply the matching camera zoom so coordinate maths stays logical.
  width: GAME_WIDTH * DPR,
  height: GAME_HEIGHT * DPR,
  backgroundColor: GAME_ARENA_BG_HEX,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  render: { antialias: true, antialiasGL: true, pixelArt: false, roundPixels: false },
  input: { activePointers: 2 },
  physics: {
    default: 'arcade',
    arcade: { gravity: { x: 0, y: 0 }, debug: false },
  },
  // keep the update loop running even when the tab/iframe isn't focused —
  // otherwise scene.start() calls scheduled from Boot's create() are never
  // processed (Phaser only flushes scene transitions during update ticks).
  disableContextMenu: true,
  fps: { forceSetTimeOut: true },
  scene: [
    // shell / navigation scenes
    BootScene,
    OnboardingScene,
    HubScene,
    ProfileScene,
    LeaderboardScene,
    SettingsScene,
    GameDetailScene,
    PassPlayScene,
    // games
    AirHockeyScene,
    TicTacToeScene,
    Connect4Scene,
    SumoScene,
    QuickDrawScene,
    TankDuelScene,
    TugOfWarScene,
    HotPotatoScene,
    MemoryScene,
    WhackScene,
    DotsBoxesScene,
    TapRaceScene,
    CoinTossScene,
    EmojiQuizScene,
    CountdownScene,
    WordScrambleScene,
    GravityPongScene,
    FlipGridScene,
    HigherLowerScene,
    TerritoryDuelScene,
    CreatureClashScene,
  ],
};

const game = new Phaser.Game(config);
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(window as unknown as Record<string, any>).__game = game;
if (import.meta.env.DEV) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  void import('./core/ads/AdManager').then((m) => { (window as unknown as Record<string, any>).__Ads = m.Ads; });
}
