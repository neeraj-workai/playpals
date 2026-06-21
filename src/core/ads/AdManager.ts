import { AD_UNITS, AD_RULES, IS_PROD } from '../config';

// ============================================================================
//  AdManager — the "subtle ad" brain, reused by every game.
//
//  - Rewarded video: 100% opt-in (revive / double coins). Highest eCPM,
//    zero annoyance. The primary, player-friendly money-maker.
//  - Interstitial: only on a natural break (match end). Fires only when:
//      * past the first `graceMatches` matches (let new players bond), AND
//      * on every Nth match after that, AND
//      * at least `minInterstitialGapMs` since the last one.
//
//  On web/dev there is no native AdMob, so the interstitial path renders a
//  *visible* simulated ad overlay (with countdown + close) so you can feel
//  the real experience. On native the AdMob plugin shows the real ad.
// ============================================================================

function isNative(): boolean {
  const cap = (window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor;
  return !!(cap && typeof cap.isNativePlatform === 'function' && cap.isNativePlatform());
}

class AdManager {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private admob: any = null;
  private initialized = false;
  private breaks = 0;          // matches since the last interstitial
  private matchesPlayed = 0;   // total matches this app launch
  private lastInterstitialAt = 0;
  private sessions = 0;

  /** BootScene reports how many times the app has been launched. */
  setSessionCount(n: number): void {
    this.sessions = n;
  }

  /** Call on the first user gesture (Hub). Safe to call more than once. */
  async init(): Promise<void> {
    if (this.initialized) return;
    this.initialized = true;
    if (!isNative()) {
      // dev/web — simulated ads. No SDK to load.
      return;
    }
    try {
      const mod = await import('@capacitor-community/admob');
      this.admob = mod.AdMob;
      await this.admob.initialize({
        requestTrackingAuthorization: true,
        initializeForTesting: !IS_PROD,
      });
      // Production: gather GDPR consent here via the UMP form before serving ads.
    } catch (err) {
      console.warn('[Ads] AdMob init failed (running ad-free):', err);
      this.admob = null;
    }
  }

  /**
   * Opt-in rewarded video. Resolves `true` only if the player watched to the
   * end. Use it to grant a revive, double coins, etc.
   */
  async showRewarded(): Promise<boolean> {
    if (!isNative() || !this.admob) {
      return this.simulateRewarded();
    }
    try {
      await this.admob.prepareRewardVideoAd({ adId: AD_UNITS.rewarded });
      const reward = await this.admob.showRewardVideoAd();
      return !!reward;
    } catch (err) {
      console.warn('[Ads] rewarded failed:', err);
      return false;
    }
  }

  /**
   * Capped interstitial — call on match end. Silently no-ops unless the
   * frequency rules allow it (that's the "subtle" part).
   */
  async maybeInterstitial(): Promise<void> {
    this.matchesPlayed += 1;
    const now = Date.now();

    // grace: first N matches in a fresh app session — never ads.
    if (this.matchesPlayed <= AD_RULES.graceMatches) return;

    this.breaks += 1;
    if (this.breaks < AD_RULES.interstitialEveryNMatches) return;
    if (now - this.lastInterstitialAt < AD_RULES.minInterstitialGapMs) return;

    this.breaks = 0;
    this.lastInterstitialAt = now;

    if (!isNative() || !this.admob) {
      await this.simulateInterstitial();
      return;
    }
    try {
      await this.admob.prepareInterstitial({ adId: AD_UNITS.interstitial });
      await this.admob.showInterstitial();
    } catch (err) {
      console.warn('[Ads] interstitial failed:', err);
    }
  }

  // --- Browser fallbacks --------------------------------------------------

  private simulateRewarded(): Promise<boolean> {
    return new Promise((resolve) => {
      const ov = document.createElement('div');
      ov.style.cssText =
        'position:fixed;inset:0;background:rgba(0,0,0,.85);color:#fff;display:flex;' +
        'flex-direction:column;align-items:center;justify-content:center;z-index:99999;' +
        'font-family:Arial,sans-serif;gap:18px;text-align:center;padding:24px;';
      ov.innerHTML =
        '<div style="font-size:20px;font-weight:bold">Simulated Rewarded Ad</div>' +
        '<div style="opacity:.7;font-size:13px">A real video plays here on device</div>';
      const claim = document.createElement('button');
      claim.textContent = 'Claim reward ▶';
      claim.style.cssText =
        'padding:13px 26px;font-size:16px;border:0;border-radius:12px;background:#2ecc71;' +
        'color:#fff;font-weight:bold;cursor:pointer';
      claim.onclick = () => { document.body.removeChild(ov); resolve(true); };
      const skip = document.createElement('button');
      skip.textContent = 'Skip (no reward)';
      skip.style.cssText =
        'padding:8px 18px;font-size:13px;border:0;border-radius:10px;background:#555;color:#ddd;cursor:pointer';
      skip.onclick = () => { document.body.removeChild(ov); resolve(false); };
      ov.appendChild(claim); ov.appendChild(skip);
      document.body.appendChild(ov);
    });
  }

  /**
   * Visible simulated interstitial — shows a full-screen mock ad with a 5s
   * countdown and then a close button. Lets you feel exactly when the real
   * ad will interrupt the player.
   */
  private simulateInterstitial(): Promise<void> {
    return new Promise((resolve) => {
      const SECS = 5;
      const ov = document.createElement('div');
      ov.style.cssText =
        'position:fixed;inset:0;background:#0e1118;color:#fff;display:flex;flex-direction:column;' +
        'z-index:99998;font-family:Nunito,Arial,sans-serif;-webkit-tap-highlight-color:transparent;';

      const top = document.createElement('div');
      top.style.cssText =
        'flex:none;height:42px;display:flex;align-items:center;justify-content:space-between;' +
        'padding:0 14px;background:#000;color:#ddd;font-size:11px;letter-spacing:1.5px;font-weight:800;';
      const adLabel = document.createElement('div');
      adLabel.textContent = 'SIMULATED AD';
      const closeArea = document.createElement('div');
      closeArea.style.cssText = 'display:flex;align-items:center;gap:10px;';
      const countdown = document.createElement('div');
      countdown.style.cssText = 'font-size:13px;color:#fff;font-weight:700;letter-spacing:0;';
      const closeBtn = document.createElement('button');
      closeBtn.textContent = '✕';
      closeBtn.style.cssText =
        'width:30px;height:30px;border-radius:50%;border:none;background:#222;color:#fff;' +
        'font-size:14px;cursor:pointer;display:none;';
      closeArea.append(countdown, closeBtn);
      top.append(adLabel, closeArea);

      const body = document.createElement('div');
      body.style.cssText =
        'flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;' +
        'background:linear-gradient(160deg,#7E5BEF 0%,#F0639E 60%,#FF922B 100%);text-align:center;padding:30px;gap:18px;';
      body.innerHTML =
        '<div style="font-size:72px">📺</div>' +
        '<div style="font-family:\'Baloo 2\',cursive;font-weight:800;font-size:30px;line-height:1.1">A Real Ad Would Play Here</div>' +
        '<div style="font-size:14px;opacity:.85;font-weight:700;max-width:300px">In production this is a Google AdMob full-screen video or banner. After ~5s the player can dismiss and resume the game.</div>' +
        '<div style="font-size:12px;opacity:.6;margin-top:18px;letter-spacing:1.5px;font-weight:800">eCPM ~$5–12 · interstitial</div>';

      ov.append(top, body);
      document.body.appendChild(ov);

      let left = SECS;
      countdown.textContent = `Skip in ${left}s`;
      const t = window.setInterval(() => {
        left -= 1;
        if (left <= 0) {
          window.clearInterval(t);
          countdown.style.display = 'none';
          closeBtn.style.display = 'inline-block';
        } else {
          countdown.textContent = `Skip in ${left}s`;
        }
      }, 1000);

      closeBtn.onclick = () => {
        window.clearInterval(t);
        ov.remove();
        resolve();
      };
    });
  }
}

export const Ads = new AdManager();
