// Injects the shared keyframes the design uses (pp-pop, pp-float, pp-pulse,
// pp-fall) once into the document head. Idempotent. Called from BootScene so
// every HTML overlay scene can use the animations without redeclaring them.

let injected = false;

export function injectDesignKeyframes(): void {
  if (injected || typeof document === 'undefined') return;
  injected = true;
  const style = document.createElement('style');
  style.id = 'pp-keyframes';
  style.textContent = `
    @keyframes pp-float { 0%,100%{ transform: translateY(0) } 50%{ transform: translateY(-9px) } }
    @keyframes pp-pop { 0%{ transform: scale(.975); opacity: 0 } 100%{ transform: scale(1); opacity: 1 } }
    @keyframes pp-fall { 0%{ transform: translateY(-40px) rotate(0); opacity:1 } 100%{ transform: translateY(620px) rotate(540deg); opacity:0 } }
    @keyframes pp-pulse { 0%,100%{ transform: scale(1); opacity:.55 } 50%{ transform: scale(1.5); opacity:0 } }
    .pp-scroll::-webkit-scrollbar { display: none; }
  `;
  document.head.appendChild(style);
}
