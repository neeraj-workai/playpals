// PlayPals design tokens — kid-friendly bubblegum theme.
// Mirrors the source design (PlayPals.dc.html): Baloo 2 + Nunito fonts,
// pastel gradients on white surfaces with soft purple shadows, organic blob
// avatars. Use these everywhere so the visual system stays consistent.

// NOTE: single-quoted font names on purpose. These strings get embedded into
// HTML `style="font-family:..."` attributes via innerHTML; double quotes would
// terminate the attribute and silently drop the font. Single quotes nest safely
// inside the double-quoted attribute (and are also valid in CSS cssText).
export const FONT_DISPLAY = "'Baloo 2', 'Comic Sans MS', cursive";
export const FONT_BODY = "Nunito, Arial, sans-serif";

// Text
export const INK = '#4A4466';            // primary
export const INK_HEX = 0x4a4466;
export const INK_DIM = '#9A93AE';        // secondary
export const INK_DIM_HEX = 0x9a93ae;
export const INK_TERTIARY = '#C3BBD6';   // labels, dividers
export const INK_LABEL = '#7C7693';      // small caps section labels

// Surfaces
export const BG_LIGHT = '#F3EEFF';       // page top
export const BG_PINK = '#FCF1F7';        // page bottom
export const CARD = '#FFFFFF';
export const CARD_HEX = 0xffffff;
export const CARD_MUTED = '#EFEAF6';
export const TRACK = '#E2DCEC';          // toggle off-track
export const NAV_BG = '#FFFFFF';

// Player palette (6) — index 0 = default. Each pair is start/end of a 135deg
// gradient. Hex (number) values are for Phaser fills.
export interface Pal {
  base: string;   // primary CSS hex
  baseHex: number;
  start: string;  // gradient start (lighter)
  end: string;    // gradient end (= base)
  startHex: number;
  endHex: number;
}
export const PALETTE: Pal[] = [
  { base: '#7E5BEF', baseHex: 0x7e5bef, start: '#A98DF5', end: '#7E5BEF', startHex: 0xa98df5, endHex: 0x7e5bef },
  { base: '#4DABF7', baseHex: 0x4dabf7, start: '#74C0FC', end: '#4DABF7', startHex: 0x74c0fc, endHex: 0x4dabf7 },
  { base: '#F0639E', baseHex: 0xf0639e, start: '#FF9DC4', end: '#F0639E', startHex: 0xff9dc4, endHex: 0xf0639e },
  { base: '#2FB875', baseHex: 0x2fb875, start: '#5DD9A8', end: '#2FB875', startHex: 0x5dd9a8, endHex: 0x2fb875 },
  { base: '#FF922B', baseHex: 0xff922b, start: '#FFB866', end: '#FF922B', startHex: 0xffb866, endHex: 0xff922b },
  { base: '#FF6B6B', baseHex: 0xff6b6b, start: '#FF9D9D', end: '#FF6B6B', startHex: 0xff9d9d, endHex: 0xff6b6b },
];

// Player 2 always uses the pink ramp from the design.
export const P2_RAMP = {
  start: '#FFB6CF',
  end: '#FF8FB1',
  startHex: 0xffb6cf,
  endHex: 0xff8fb1,
  base: '#F0639E',
  baseHex: 0xf0639e,
};

// CSS gradient string for HTML overlays (onboarding, settings).
export const cssGradient = (p: { start: string; end: string }): string =>
  `linear-gradient(135deg, ${p.start}, ${p.end})`;

// Page background gradient (used as fallback for native scenes).
export const PAGE_GRADIENT = 'linear-gradient(180deg,#F3EEFF 0%,#FCF1F7 100%)';
export const PAGE_BG_HEX = 0xf3eeff;
export const PAGE_BG_CSS = '#F3EEFF';

// Avatar blob path shape — used by SVG-rendered HTML scenes.
export const BLOB_RADIUS = '42% 58% 56% 44% / 52% 44% 56% 48%';

// Card shadow (used in CSS overlays).
export const CARD_SHADOW = '0 8px 18px rgba(80,60,140,.08)';
export const SOFT_SHADOW = '0 6px 14px rgba(80,60,140,.06)';

export const hex2css = (n: number): string => '#' + n.toString(16).padStart(6, '0');
