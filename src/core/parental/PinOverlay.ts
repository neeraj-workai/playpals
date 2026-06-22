import { FONT_DISPLAY, INK, INK_DIM } from '../design';

// Reusable bottom-sheet PIN keypad. Auto-confirms on 4th digit.
export function showPinOverlay(opts: {
  title: string;
  onConfirm: (pin: string) => void;
  onCancel?: () => void;
}): void {
  let digits = '';

  const overlay = document.createElement('div');
  overlay.style.cssText =
    'position:fixed;inset:0;z-index:9999;background:rgba(30,20,60,.55);' +
    'display:flex;align-items:flex-end;justify-content:center;';

  const sheet = document.createElement('div');
  sheet.style.cssText =
    'width:100%;max-width:420px;background:#fff;border-radius:28px 28px 0 0;' +
    'padding:28px 24px 40px;display:flex;flex-direction:column;align-items:center;gap:20px;';

  const titleEl = document.createElement('div');
  titleEl.style.cssText = `font-family:${FONT_DISPLAY};font-weight:800;font-size:19px;color:${INK};text-align:center;`;
  titleEl.textContent = opts.title;

  const dots = document.createElement('div');
  dots.style.cssText = 'display:flex;gap:18px;';

  function renderDots() {
    dots.innerHTML = '';
    for (let i = 0; i < 4; i++) {
      const d = document.createElement('div');
      d.style.cssText =
        `width:20px;height:20px;border-radius:50%;border:2.5px solid #9775FA;` +
        `background:${i < digits.length ? '#9775FA' : 'transparent'};transition:background .1s;`;
      dots.append(d);
    }
  }

  const numpad = document.createElement('div');
  numpad.style.cssText = 'display:grid;grid-template-columns:repeat(3,1fr);gap:10px;width:100%;max-width:270px;';

  ['1','2','3','4','5','6','7','8','9','','0','⌫'].forEach(k => {
    const btn = document.createElement('button');
    btn.textContent = k;
    btn.style.cssText =
      `height:60px;border:none;border-radius:18px;font-family:${FONT_DISPLAY};font-weight:800;` +
      `font-size:22px;cursor:pointer;background:#F3EEFF;color:${INK};` +
      (k ? '' : 'visibility:hidden;');
    btn.addEventListener('click', () => {
      if (k === '⌫') { digits = digits.slice(0, -1); }
      else if (k && digits.length < 4) { digits += k; }
      renderDots();
      if (digits.length === 4) {
        setTimeout(() => {
          overlay.remove();
          opts.onConfirm(digits);
        }, 180);
      }
    });
    numpad.append(btn);
  });

  sheet.append(titleEl, dots, numpad);

  if (opts.onCancel) {
    const cancelBtn = document.createElement('button');
    cancelBtn.textContent = 'Cancel';
    cancelBtn.style.cssText =
      `border:none;background:none;font-family:${FONT_DISPLAY};font-weight:700;font-size:14px;color:${INK_DIM};cursor:pointer;`;
    cancelBtn.addEventListener('click', () => { overlay.remove(); opts.onCancel!(); });
    sheet.append(cancelBtn);
  }

  overlay.append(sheet);
  document.body.append(overlay);
  renderDots();
}

// Two-step PIN setup: enter → confirm → onSet(pin) or restart on mismatch.
export function showPinSetOverlay(opts: { onSet: (pin: string) => void; onCancel?: () => void }): void {
  showPinOverlay({
    title: '🔒 Set a 4-digit PIN',
    onCancel: opts.onCancel,
    onConfirm: (first) => {
      showPinOverlay({
        title: 'Confirm your PIN',
        onCancel: opts.onCancel,
        onConfirm: (second) => {
          if (second === first) {
            opts.onSet(first);
          } else {
            // mismatch — restart
            const err = document.createElement('div');
            err.style.cssText =
              'position:fixed;inset:0;z-index:10000;display:flex;align-items:center;justify-content:center;pointer-events:none;';
            err.innerHTML =
              `<div style="background:#FF6B6B;color:#fff;padding:10px 22px;border-radius:14px;font-family:${FONT_DISPLAY};font-weight:800;font-size:15px;">PINs don't match — try again</div>`;
            document.body.append(err);
            setTimeout(() => { err.remove(); showPinSetOverlay(opts); }, 1200);
          }
        },
      });
    },
  });
}

// Full-screen time-up blocker. PIN unlocks extra time chooser.
export function showTimeUpOverlay(parentPin: string, onExtend: (extraMs: number) => void): void {
  const overlay = document.createElement('div');
  overlay.style.cssText =
    'position:fixed;inset:0;z-index:9998;background:linear-gradient(180deg,#F3EEFF 0%,#FCF1F7 100%);' +
    'display:flex;flex-direction:column;align-items:center;justify-content:center;gap:18px;padding:32px;text-align:center;';

  overlay.innerHTML =
    `<div style="font-size:64px">⏰</div>` +
    `<div style="font-family:${FONT_DISPLAY};font-weight:800;font-size:26px;color:#3D2B6E">Time's up!</div>` +
    `<div style="font-size:15px;color:${INK_DIM};font-weight:700;max-width:280px">Daily play time is done.<br>Ask a grown-up to add more time.</div>`;

  const askBtn = document.createElement('button');
  askBtn.textContent = '🔒 Grown-up unlock';
  askBtn.style.cssText =
    `margin-top:8px;height:54px;padding:0 32px;border:none;border-radius:22px;background:linear-gradient(135deg,#9775FA,#7C4DFF);color:#fff;` +
    `font-family:${FONT_DISPLAY};font-weight:800;font-size:17px;cursor:pointer;box-shadow:0 10px 22px rgba(74,68,102,.22);`;

  askBtn.addEventListener('click', () => {
    showPinOverlay({
      title: 'Grown-up PIN',
      onCancel: () => {},
      onConfirm: (entered) => {
        if (entered !== parentPin) {
          const err = document.createElement('div');
          err.style.cssText =
            'position:fixed;inset:0;z-index:10000;display:flex;align-items:center;justify-content:center;pointer-events:none;';
          err.innerHTML =
            `<div style="background:#FF6B6B;color:#fff;padding:10px 22px;border-radius:14px;font-family:${FONT_DISPLAY};font-weight:800;font-size:15px;">Wrong PIN</div>`;
          document.body.append(err);
          setTimeout(() => err.remove(), 1200);
          return;
        }
        // PIN correct — show time options
        overlay.remove();
        showTimeExtendSheet(onExtend);
      },
    });
  });

  overlay.append(askBtn);
  document.body.append(overlay);
}

function showTimeExtendSheet(onExtend: (extraMs: number) => void): void {
  const sheet = document.createElement('div');
  sheet.style.cssText =
    'position:fixed;inset:0;z-index:9999;background:rgba(30,20,60,.55);' +
    'display:flex;align-items:flex-end;justify-content:center;';

  const inner = document.createElement('div');
  inner.style.cssText =
    'width:100%;max-width:420px;background:#fff;border-radius:28px 28px 0 0;padding:28px 24px 40px;';

  inner.innerHTML =
    `<div style="font-family:${FONT_DISPLAY};font-weight:800;font-size:18px;color:#3D2B6E;text-align:center;margin-bottom:18px;">How much more time?</div>`;

  const opts = [['30 minutes', 30], ['1 hour', 60], ['2 hours', 120]] as [string, number][];
  opts.forEach(([label, mins]) => {
    const btn = document.createElement('button');
    btn.textContent = label;
    btn.style.cssText =
      `display:block;width:100%;height:52px;margin-bottom:10px;border:none;border-radius:18px;` +
      `background:#F3EEFF;font-family:${FONT_DISPLAY};font-weight:800;font-size:16px;color:#5B3EBD;cursor:pointer;`;
    btn.addEventListener('click', () => { sheet.remove(); onExtend(mins * 60 * 1000); });
    inner.append(btn);
  });

  sheet.append(inner);
  document.body.append(sheet);
}
