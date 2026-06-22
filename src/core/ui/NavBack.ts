// Global "browser back" handler. Each scene registers its own back action in
// create(); the popstate listener (set up once in BootScene) calls go().
let backFn: (() => void) | null = null;

export const NavBack = {
  register(fn: () => void): void { backFn = fn; },
  go(): void { if (backFn) backFn(); },
};
