// Zero-asset SFX via the Web Audio API. Lazily created on first use (always
// after a tap, satisfying mobile autoplay rules). Used across every game.

class AudioManager {
  private ctx: AudioContext | null = null;
  private muted = false;

  private context(): AudioContext | null {
    if (this.muted) return null;
    if (!this.ctx) {
      const Ctor =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return null;
      this.ctx = new Ctor();
    }
    return this.ctx;
  }

  private tone(freq: number, dur: number, type: OscillatorType = 'square', vol = 0.07, delay = 0): void {
    const ctx = this.context();
    if (!ctx) return;
    try {
      const t0 = ctx.currentTime + delay;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, t0);
      gain.gain.setValueAtTime(vol, t0);
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t0);
      osc.stop(t0 + dur);
    } catch {
      /* non-critical */
    }
  }

  click(): void {
    this.tone(440, 0.05, 'square', 0.05);
  }
  hit(): void {
    this.tone(520, 0.05, 'square', 0.06);
  }
  bump(): void {
    this.tone(180, 0.1, 'sawtooth', 0.08);
  }
  goal(): void {
    this.tone(660, 0.08, 'sine', 0.08);
    this.tone(990, 0.12, 'sine', 0.07, 0.07);
  }
  place(): void {
    this.tone(380, 0.06, 'triangle', 0.07);
  }
  beep(): void {
    this.tone(880, 0.12, 'sine', 0.09);
  }
  win(): void {
    this.tone(523, 0.12, 'sine', 0.09, 0);
    this.tone(659, 0.12, 'sine', 0.09, 0.12);
    this.tone(784, 0.18, 'sine', 0.09, 0.24);
  }
  lose(): void {
    this.tone(300, 0.18, 'sawtooth', 0.08, 0);
    this.tone(200, 0.26, 'sawtooth', 0.08, 0.16);
  }

  setMuted(muted: boolean): void {
    this.muted = muted;
  }
}

export const audio = new AudioManager();
