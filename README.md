# 🎮 PlayPals — many mini-games in one app

A single free app containing a **hub of bite-size games**, in the style of the
popular "2 Player Games" collections. Every game plays **1 Player (vs CPU)** or
**2 Players (local, same device)**. Funded by **subtle, opt-in-first ads**.
Ships to **Android + iOS from one codebase**.

- **Engine:** Phaser 3 + TypeScript + Vite
- **Native wrapper:** Capacitor (Android + iOS)
- **Ads:** Google AdMob via `@capacitor-community/admob` (rewarded + interstitial)
- **Art/audio:** generated in code — zero asset files to ship or license
- **Onboarding:** local player profile (name / avatar / colour) + settings; scrollable dashboard

## The 13 games (built)

| Game | Type | Modes |
|---|---|---|
| 🏒 Air Hockey | real-time puck physics, drag paddles | 1P vs CPU · 2P |
| ⭕ Tic-Tac-Toe | turn-based, win/block AI | 1P vs CPU · 2P |
| 🔴 Connect Four | turn-based strategy, win/block AI | 1P vs CPU · 2P |
| 🥋 Sumo Smash | dash-to-ram physics, ring-out | 1P vs CPU · 2P |
| ⚡ Quick Draw | reaction duel, tap on green | 1P vs CPU · 2P |
| 🏍 Trail Clash | light-cycles survival (grid) | 1P vs CPU · 2P |
| 💥 Tank Duel | move to dodge & align auto-fire | 1P vs CPU · 2P |
| 🪢 Tug of War | button-mash pull race | 1P vs CPU · 2P |
| 🧨 Hot Potato | hidden-fuse bomb, don't get caught | 1P vs CPU · 2P |
| 🧠 Memory Match | pairs vs a remembering AI | 1P vs CPU · 2P |
| 🔨 Whack-a-Mole | split-screen bonk race (20s) | 1P vs CPU · 2P |
| 📦 Dots & Boxes | claim boxes, chain-aware AI | 1P vs CPU · 2P |
| 🎯 Bullseye | stop the sweeping bar on gold | 1P vs CPU · 2P |

## Quick start

```bash
npm install
npm run dev        # play in the browser at http://localhost:5173
npm run build      # production web build -> dist/
npm run typecheck  # strict TypeScript check
```

> On web/dev there's no native AdMob, so ads are **simulated**; real ads run in
> the native app.

## Project layout

```
src/
├─ main.ts                     # Phaser config + scene registry
├─ core/                       # SHARED across all games
│  ├─ config.ts               #   ← GAMES registry, palette, ad rules
│  ├─ ads/AdManager.ts        #   subtle-ad logic + AdMob + web fallback
│  ├─ storage/Storage.ts      #   per-game persistence
│  ├─ audio/AudioManager.ts   #   synthesized SFX
│  ├─ scenes/
│  │  ├─ BootScene.ts         #   shared textures → Hub
│  │  └─ HubScene.ts          #   the game-picker grid
│  └─ ui/  Button · ModeSelect · ResultOverlay · Hud
└─ games/
   ├─ types.ts                # GameMode = 'ai' | '2p'
   ├─ airhockey/AirHockeyScene.ts
   ├─ tictactoe/TicTacToeScene.ts
   ├─ connect4/Connect4Scene.ts
   ├─ sumo/SumoScene.ts
   └─ quickdraw/QuickDrawScene.ts
```

### Add a new game (≈ one file)

1. Create `src/games/<name>/<Name>Scene.ts` extending `Phaser.Scene`. Read the
   mode in `init(data)`, return to the hub with `this.scene.start('Hub')`, and
   end matches with `showResult(...)` (see any existing game for the pattern).
2. Register the scene in `src/main.ts`.
3. Add a tile to `GAMES` in `src/core/config.ts` (key, title, blurb, color, icon, scene).

That's it — the hub, mode picker, result overlay, ads, audio, and storage are
inherited. Each game just implements its own rules + AI.

## The subtle-ad model

Tuned in `src/core/config.ts` → `AD_RULES`, enforced in `AdManager.ts`:

- **Rewarded** (opt-in) is the primary money-maker — reserved for future
  unlocks/boosts. Highest eCPM, zero interruption.
- **Interstitial** only fires on a natural break (match end → Rematch / Home),
  and only if past the first session, every 2nd match-end, and ≥75s apart.
- **No banners** over gameplay.

## Ads: register & display

1. AdMob account → **Add app** (once for Android, once for iOS).
2. Create **Rewarded** + **Interstitial** units; paste IDs into `src/core/config.ts`.
3. **Android:** real AdMob **App ID** in `android/app/src/main/AndroidManifest.xml`
   (currently Google's **test** App ID — the app crashes if it's missing).
4. **iOS:** `Info.plist` → `GADApplicationIdentifier`, `NSUserTrackingUsageDescription`,
   `SKAdNetworkItems`.
5. Keep **test** ad IDs in dev. **Never click your own live ads.**

## Building native apps

### Android (works on Windows ✅) — needs **JDK 17+** + Android SDK
```bash
npm run build && npx cap sync android && npx cap open android
```
> This machine has JDK 11 — install JDK 17+ first.

### iOS (needs macOS ❌ on Windows)
Use a Mac or a cloud Mac (Codemagic free tier). Ship **Android first**.

## Store checklist

- [ ] Privacy policy URL live (`PRIVACY_POLICY.md`).
- [ ] Google Play Data Safety form + content rating.
- [ ] Apple: ATT text, SKAdNetwork IDs, age rating.
- [ ] Real ad IDs in the release build only.
- [ ] Icon + screenshots of 3–4 games + a short "play with a friend" preview video.

## Roadmap — next games to add

Penalty Shootout · Mini Soccer (head-ball, needs a landscape mode) · Snake Duel ·
Pong · Spinner War · Mini Pool · Reaction Tiles · cloud accounts + leaderboards.
All slot into the same hub + mode picker.
