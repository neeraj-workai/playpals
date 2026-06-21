import Phaser from 'phaser';

// Phaser 3.90's ScenePlugin doesn't reliably stop the calling scene when
// `this.scene.start(target)` is invoked — sibling scenes can stay active,
// leaving stale Phaser objects + leaked HTML overlays. Each shell/transition
// scene calls `ensureSoleActiveScene(this)` from its create() to defensively
// stop every other known scene.

// Stop every OTHER active scene — works for shells (Hub / Profile / …) and
// games equally, since the app never wants two scenes running at once.
export function ensureSoleActiveScene(scene: Phaser.Scene): void {
  const myKey = scene.scene.key;
  const manager = scene.scene.manager;
  for (const s of manager.getScenes(false)) {
    const k = s.scene.key;
    if (k === myKey || k === 'Boot') continue;
    if (s.scene.isActive() || s.scene.isSleeping()) {
      scene.scene.stop(k);
    }
  }
}
