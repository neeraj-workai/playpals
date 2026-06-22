# Changelog — PlayPals (Duel Arcade)

All notable changes are documented here. Dates are AEST (UTC+10).
Format: `[version] — YYYY-MM-DD HH:MM`

---

## [Unreleased — v0.5] — 2026-06-22 22:54

### Bug Fixes
- **Emoji/text corruption (11 files)** — PowerShell had silently re-encoded UTF-8 source files as Windows-1252, corrupting every multi-byte character. Fixed via byte-level Python replacement across all affected scenes:
  - Whack-a-Mole: 🐹 mole emoji restored (was showing as `ðŸ¹`)
  - Hot Potato: 🧨 bomb + 💥 explosion emoji restored
  - Memory Match: all 12 card face emoji restored (🍎🍌🍇🍒🥝🍑🍓🥥🌟🍉🥑🫐)
  - AI "CPU thinking…" ellipsis restored in Memory, TicTacToe, Connect4, Dots & Boxes
  - En-dash `–` restored in result subtitles across Air Hockey, Sumo, Trail Clash, Tank Duel, Coin Toss, Hot Potato, Memory Match, Dots & Boxes
  - Coin Toss: "Your call – heads or tails?" and "correct! ✓" text restored
- **Multi-touch (2P games)** — Added `input: { activePointers: 2 }` to Phaser game config. Both players' simultaneous touches are now tracked correctly. Previously the second player's tap was silently ignored.
- **Word Scramble P2 tile order** — P2's letter tiles were appearing right-to-left from their perspective. Fixed by mirroring tile x-positions before the 180° rotation so P2 reads letters left-to-right.
- **Back button overlapping P2 labels** — In all 6 new split-screen games (Emoji Quiz, Countdown, Word Scramble, Gravity Pong, Bomb Diffuse, Flip Grid) the "‹ Home" button was sitting inside the P2 strip at the top. Moved to y=666 (P1's bottom strip).
- **Game runs behind ad overlay** — Phaser game loop now pauses when the simulated interstitial ad overlay appears, and resumes when the player dismisses it.

---

## [v0.4] — 2026-06-22 21:01

### Features Added
- **6 new games** (total game count: 20):
  - **Emoji Quiz** — Flash a 3-emoji sequence, tap the matching order from 4 permutations. Best of 3.
  - **Countdown Duel** — Race from 30 to 0 by tapping your zone. First to zero wins the round. Best of 2.
  - **Word Scramble Race** — Unscramble 4-letter words by tapping tiles in order. First to solve wins. Best of 3.
  - **Gravity Pong** — Pong with gravity that flips direction every 5 seconds. Score to 7.
  - **Bomb Diffuse** — Co-op: each player sees 2 of 4 digits and must tap them in order to defuse 3 bombs within 28s each.
  - **Flip the Grid** — Claim tiles on a 4×4 board; adjacent opponent tiles flip to your colour. Most tiles wins.
- **Per-game arena backgrounds** — Each of the 14 existing games now has its own distinct dark-coloured arena background (e.g. dark blue for Air Hockey, dark teal for Trail Clash, dark rose for Tug of War, etc.) replacing the uniform dark navy.
- **Split-screen chrome** — All 6 new games use the "2 Player Games" split-screen layout with coloured player strips (68px top for P2, 68px bottom for P1).

---

## [v0.3] — 2026-06-22 20:41

### Bug Fixes
- **Scrollable Hub game grid** — Game list was squished to fit the screen. Switched to a 2-column grid with fixed 160px card height and a scrollable wrapper, so all games are accessible without layout compression.

---

## [v0.3] — 2026-06-22 20:38

### Features Added
- **Hub redesign** — Dashboard now matches the "2 Player Games" Play Store aesthetic: gradient cards, large emoji, white bold title, frosted "1P · 2P" badge, press-scale animation.
- **Removed games** — Bubble Pop and Bullseye removed from the game list (total dropped from 16 to 14 before new additions).

---

## [v0.2] — 2026-06-22 20:02

### Features Added
- **Parental controls** — Parent PIN lock, player blocking (block specific players from accessing the app), daily playtime limit with countdown. PIN is required to change settings.

---

## [v0.2] — 2026-06-22 19:46

### Features Added
- **Game detail 2-tab layout** — Game detail screen now has "Players" tab (1P vs CPU / 2P selector) and "How to play" tab with rules, displayed side-by-side.

---

## [v0.2] — 2026-06-22 19:25

### Bug Fixes
- **Browser back button stays in-app** — OS/browser back gesture now navigates within the game hub instead of leaving the page.
- **P1/P2 pickers side-by-side** — Player selector buttons displayed in a row instead of stacked.

---

## [v0.1] — 2026-06-22 18:18

### Features Added
- **Player 1 profile selector** — In 2P mode, P1 can be selected from saved family profiles before starting a game.
- **Memory Match 4×6 grid** — Upgraded from a smaller grid to 24 cards (12 pairs) for a fuller game.

### Bug Fixes
- Blob clipping on profile avatars
- How-to-play text cutoff on small screens
- QuickDraw top gap spacing

---

## [v0.1] — 2026-06-22 14:37

### Features Added
- **Family profiles** — Create named player profiles with avatar; stored locally.
- **Weekly leaderboard** — Tracks wins per player per game over the rolling 7-day window.

---

## [v0.0] — 2026-06-22 10:00

### Features Added
- Viewport fit — every scene scales to fill the screen with no scrolling or letterboxing.

---

## [v0.0] — 2026-06-22 09:35

### Initial Release
- **PlayPals (Duel Arcade)** — Phaser 3 + TypeScript + Vite mobile-web game hub
- **16 launch games**: Air Hockey, Tic-Tac-Toe, Connect 4, Sumo Dash, Quick Draw, Trail Clash, Tank Duel, Tug of War, Hot Potato, Memory Match, Whack-a-Mole, Dots & Boxes, Tap Race, Coin Toss, Bubble Pop, Bullseye
- 1P vs CPU and 2P pass-and-play modes for all games
- Onboarding flow, Hub, Profile, Leaderboard, Settings scenes
- AdMob integration with simulated interstitials on web
- HiDPI / Retina rendering (canvas DPR scaling + camera zoom)
