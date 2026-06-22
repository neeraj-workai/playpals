import Phaser from 'phaser';
import { NavBack } from './NavBack';

// Small "‹ Home" button placed top-left of every game scene.
// Also registers the handler as the browser/OS back action for this scene.
export function addBackButton(scene: Phaser.Scene, onBack: () => void): Phaser.GameObjects.Text {
  NavBack.register(onBack);
  const b = scene.add
    .text(14, 26, '‹ Home', { fontFamily: 'Arial Black, Arial', fontSize: '18px', color: '#ffffff' })
    .setOrigin(0, 0.5)
    .setDepth(100)
    .setInteractive({ useHandCursor: true });
  b.on('pointerover', () => b.setAlpha(0.7));
  b.on('pointerout', () => b.setAlpha(1));
  b.on('pointerdown', onBack);
  return b;
}
