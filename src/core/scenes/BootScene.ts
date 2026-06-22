import Phaser from 'phaser';
import { Storage } from '../storage/Storage';
import { Ads } from '../ads/AdManager';
import { Profile } from '../profile/Profile';
import { audio } from '../audio/AudioManager';
import { injectDesignKeyframes } from '../design.css';
import { NavBack } from '../ui/NavBack';

// Generates the few shared textures the physics games need (white circles we
// tint per player), registers the session, then opens the hub.
export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  create(): void {
    this.circleTexture('puck', 14);
    this.circleTexture('paddle', 26);
    this.circleTexture('sumo', 30);

    audio.setMuted(Storage.getBool('muted'));
    injectDesignKeyframes();
    Ads.setSessionCount(Storage.bumpSessions());

    // Intercept the browser/OS back gesture so it navigates within the game
    // rather than leaving the page. Each scene registers its own handler via
    // NavBack.register(); we re-push a state after every popstate so the
    // interception is permanent for the session.
    history.pushState({}, '');
    window.addEventListener('popstate', () => {
      history.pushState({}, '');
      NavBack.go();
    });

    // First launch with no player profile → onboarding; otherwise straight to the hub.
    const next = Profile.isRegistered() ? 'Hub' : 'Onboarding';
    // Wait for the FIRST update tick — at that point the SceneManager has
    // finalised all sibling scene boots, so the transition is honoured.
    this.events.once(Phaser.Scenes.Events.UPDATE, () => this.scene.start(next));
  }

  private circleTexture(key: string, radius: number): void {
    if (this.textures.exists(key)) return;
    const g = this.make.graphics({ x: 0, y: 0 });
    g.fillStyle(0xffffff, 1);
    g.fillCircle(radius, radius, radius);
    g.generateTexture(key, radius * 2, radius * 2);
    g.destroy();
  }
}
