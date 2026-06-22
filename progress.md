# PlayPals — Progress Tracker

## Completed Tasks

| # | Task | Notes |
|---|---|---|
| 1 | Scaffold project config | Vite + Phaser 3 + TypeScript + Capacitor |
| 2 | Build shared core | AdManager, AudioManager, Storage, scenes |
| 3 | Game #1: Tap Flyer | Original blueprint game |
| 4 | Install deps, build & verify in browser | — |
| 5 | Android scaffold + README clone-recipe + privacy policy | `android/` scaffolded, JDK 17 needed |
| 6 | Rework core into multi-game hub | GAMES registry, HubScene, shared scenes |
| 7 | Game: Air Hockey (1P/2P) | Event-based pointer control + anti-stuck watchdog |
| 8 | Game: Tic-Tac-Toe (1P/2P) | — |
| 9 | Game: Connect Four (1P/2P) | — |
| 10 | Game: Sumo Smash (1P/2P) | — |
| 11 | Game: Quick Draw (1P/2P) | — |
| 12 | Wire batch 1, build & verify | — |
| 13 | Game: Tug of War (1P/2P) | — |
| 14 | Game: Hot Potato (1P/2P) | — |
| 15 | Game: Tank Duel (1P/2P) | — |
| 16 | Game: Memory Match (1P/2P) | — |
| 17 | Game: Trail Clash (1P/2P) | — |
| 18 | Wire batch 2, build & verify | — |
| 19 | Onboarding / registration | Local profile (name/avatar/colour), no backend |
| 20 | Redesign dashboard (Hub) | — |
| 21 | Game: Whack-a-Mole (1P/2P) | — |
| 22 | Game: Dots & Boxes (1P/2P) | — |
| 23 | Game: Bullseye (1P/2P) | — |
| 24 | Wire batch 3, build & verify | — |
| 25 | Rebrand to PlayPals | `com.viralgames.playpals` |
| 26 | Import design | Extract PlayPals.dc.html design tokens |
| 27 | Implement design | Apply tokens + missing screens |
| 28 | Design tokens + Google Fonts | Baloo 2 + Nunito via Google Fonts |
| 29 | Rewrite GAMES registry with metadata | grad/tint/howto/time/diff fields |
| 30 | Redesign Onboarding | Baloo, blob avatar, 10 emoji choices, 6 colours |
| 31 | Redesign Hub | Header, scrollable list, bottom nav |
| 32 | New Profile / Leaderboard / Settings scenes | — |
| 33 | GameDetail + PassPlay + Result screens | — |
| 34 | Add 3 games: Tap Race, Bubble Pop, Coin Toss | 16 games total |
| 35 | Wire all scenes, typecheck + build + boot verify | — |
| 36 | High-DPI canvas | DPR + camera zoom (sharp on retina) |
| 37 | Fix game arena bg + pointer worldX/worldY | `GAME_ARENA_BG` #1D1A2E; codemod patched all game scenes |
| 38 | Visible simulated interstitial ad | Fires after 2–3 game sessions; 5s skip timer |
| 39 | Verify sharpness + game controls + ad simulation | — |
| 40 | HTML shell + bottom nav | `Shell.ts` + `NavGuard.ts`; old Phaser BottomNav deleted |
| 41 | Rewrite Hub as HTML | Matches design |
| 42 | Profile / Leaderboard / Settings → shell-based HTML | — |
| 43 | Fix Air Hockey: event-based control + anti-stuck watchdog | — |
| 44 | Typecheck, build, verify sharp + controls | — |
| 45 | Create GitHub repo + push | https://github.com/neeraj-workai/playpals (51 files, `android/` excluded) |
| 46 | Fit every screen to viewport — no scrolling | `Stage.ts` (400×700 CSS-scaled stage) + compact Hub grid (`grid-auto-rows:1fr`) |

---

| 47 | Family Profiles system | FamilyProfiles.ts, Session.ts, Storage win/weekly tracking |
| 48 | Settings — Family Players management | Add/edit/delete family members inline |
| 49 | GameDetail — P2 player picker | Select family member as Player 2 before 2P game |
| 50 | PassPlay — real P2 info | Shows family member avatar/name if selected |
| 51 | Leaderboard — real weekly scores | All family players ranked; prev week champion; resets Monday |
| 52 | Profile — player selector + real badges | View any player's stats; badges from actual win counts |
| 53 | ResultOverlay — auto win recording | Reads Session to record wins per player after each match |
| 54 | Fix: CoinToss coin rendering | Replaced 🪙 emoji (not on Android <11) with Phaser Arc gold circle |
| 55 | Fix: BubblePop bubble rendering | Replaced 🫧 emoji (Android 12+ only) with Phaser Arc circles |
| 56 | Fix: white space in game scenes | Body + canvas backgroundColor = GAME_ARENA_BG (#1d1a2e); no light edges |
| 57 | Fix: Stage scaling alignment | applyFit now uses #app div dimensions to match Phaser Scale.FIT reference |
| 58 | Write progress.md | Full task history with completed + pending |

## In Progress / Pending

| Task | Status | Notes |
|---|---|---|
| Vercel deployment | **Awaiting user action** | Go to https://vercel.com/new → import `playpals` repo → Deploy. Zero config via `vercel.json`. Every future push auto-deploys. |
| Android APK build | **Blocked** | Needs JDK 17+ (machine has JDK 11). Scaffold is in `android/`. Upgrade JDK or use Android Studio. |
| iOS build | **Blocked** | Requires macOS + Xcode. Use Codemagic free tier or Mac cloud builder once a game earns it. |
| AdMob real ad unit IDs | **Pending** | Test IDs wired in dev. Swap to real IDs in `src/core/config.ts` for production release builds only. |
| Store listings (Play + App Store) | **Not started** | Icon, screenshots, 15–30s preview video, ASO keywords, privacy policy URL. |
| New game selection | **Awaiting user decision** | 10 games proposed — see progress.md game proposals section. |

## Proposed New Games (awaiting selection)

| ID | Game | Mechanic | Effort |
|---|---|---|---|
| A | Emoji Quiz | Flash emoji sequence, tap the match — tests visual memory | Easy |
| B | Countdown Duel | Tap to count up, race to target — pure speed | Easy |
| C | Slice It Fair | Drag a cut line to split shapes 50/50 — precision | Medium |
| D | Colour Flood | Flood-fill grid from corners — strategy | Medium |
| E | Word Scramble Race | Unscramble 4-letter words fastest — word game | Medium |
| F | Gravity Pong | Pong but gravity alternates every 5s — classic with twist | Medium |
| G | Bomb Diffuse | Co-op: each player sees half the code, must communicate | Easy |
| H | Dice Duel | Roll dice, higher total wins round — luck/combos | Very easy |
| I | Flip the Grid | Flip tiles to your colour on a 4×4 board — strategy | Medium |
| J | Reaction Chain | Simon-style flash sequence, race to repeat it — reflex | Medium |

## Proposed New Features (not implementing yet)

- Daily Challenge (1 game/day, 3× points, resets midnight)
- Tournament Mode (family bracket, auto-tracked)
- Streaks & Daily Login (flame counter on Hub)
- Game Collections / Packs (themed groupings)
- Player Avatar Editor (freehand blob drawing)
- Game History Log (last 20 match results)
- Parental Timer lock screen with PIN
- Cloud Sync (Firebase Auth + Firestore)
- Game Ratings (1-tap Fun/OK/Meh after each match)
- Seasonal Events (holiday Hub themes + bonus games)
- Achievements System (cross-game goals)
- Confetti uses your profile colour/avatar
- Split-Screen real-time 2P mode (both tap simultaneously)

---

## Key Files

| File | Purpose |
|---|---|
| `src/core/config.ts` | GAMES registry, AD_RULES, DPR, dimensions |
| `src/core/design.ts` | Design tokens (colours, fonts, BLOB_RADIUS) |
| `src/core/ui/Stage.ts` | Shared 400×700 CSS-scaled stage for HTML screens |
| `src/core/ui/Shell.ts` | Shared shell (header + content + bottom nav) |
| `src/core/ui/NavGuard.ts` | `ensureSoleActiveScene()` — prevents scene leaks |
| `src/core/ui/ResultOverlay.ts` | Full-screen HTML result/confetti overlay |
| `src/core/scenes/HubScene.ts` | Dashboard — 16-game compact grid |
| `src/core/scenes/OnboardingScene.ts` | First-launch player registration |
| `src/core/scenes/ProfileScene.ts` | Me tab — level/XP/badges |
| `src/core/scenes/GameDetailScene.ts` | Game info + 1P/2P launch |
| `src/core/scenes/PassPlayScene.ts` | Pass & Play setup screen |
| `src/games/*/` | 16 individual game scenes |
| `vercel.json` | Zero-config Vite deploy for Vercel |
| `.gitignore` | Excludes `android/`, `ios/`, `.claude/`, `.vercel/` |

---

## Architecture Notes

- **Stack**: Phaser 3.90 + TypeScript + Vite + Capacitor + Google AdMob
- **16 games** all support 1P (vs CPU) and 2P (local same-device)
- **Menu screens are HTML; games are WebGL canvas** — crisp at any DPI
- **Stage scaling**: `transform: scale(min(vw/400, vh/700))` — identical framing to Phaser's `Scale.FIT + CENTER_BOTH`
- **HiDPI**: canvas pixel buffer = `width × DPR × height × DPR`; all game scenes use `pointer.worldX/worldY`
- **Ads**: capped interstitial every 2nd match after match #3; rewarded reserved for future unlocks
- **iOS**: cannot build on Windows — launch Android first
