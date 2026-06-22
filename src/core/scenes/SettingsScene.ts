import Phaser from 'phaser';
import { Storage } from '../storage/Storage';
import { audio } from '../audio/AudioManager';
import { Profile, AVATARS } from '../profile/Profile';
import { FamilyProfiles, FamilyMember } from '../profile/FamilyProfiles';
import { ensureSoleActiveScene } from '../ui/NavGuard';
import { createShell, shellTitle } from '../ui/Shell';
import { PALETTE, FONT_DISPLAY, FONT_BODY, INK, INK_DIM, INK_LABEL, BLOB_RADIUS, TRACK, cssGradient, hex2css } from '../design';
import { showPinOverlay, showPinSetOverlay } from '../parental/PinOverlay';

export class SettingsScene extends Phaser.Scene {
  constructor() { super('Settings'); }

  create(): void {
    ensureSoleActiveScene(this);
    const { content } = createShell(this, 'settings');
    const accent = hex2css(Profile.pal().baseHex);

    content.style.overflowY = 'auto';
    content.append(shellTitle('⚙️ Settings'));

    // ── FAMILY PLAYERS ───────────────────────────────────────────────────
    content.append(sectionLabel('FAMILY PLAYERS'));

    const familyWrap = document.createElement('div');
    familyWrap.style.cssText = 'margin-bottom:14px;';
    const listView = document.createElement('div');
    const formView = document.createElement('div');
    formView.style.display = 'none';

    // Compact block grid instead of full-width rows
    const memberGrid = document.createElement('div');
    memberGrid.style.cssText = 'display:flex;flex-wrap:wrap;gap:10px;margin-bottom:10px;';

    const addBtn = mkBtn('+ Add Player', accent);
    addBtn.style.width = '100%';
    listView.append(memberGrid, addBtn);

    // ── edit / add form ──
    const formState = { name: '', avatarIdx: 0, colorIdx: 0 };
    let editingId: string | null = null;

    const nameInput = document.createElement('input');
    nameInput.type = 'text';
    nameInput.maxLength = 14;
    nameInput.placeholder = 'Player name';
    nameInput.style.cssText =
      'width:100%;height:44px;border:none;border-radius:16px;background:#fff;' +
      'box-shadow:0 4px 10px rgba(74,68,102,.07);text-align:center;font-family:' + FONT_DISPLAY + ';' +
      'font-weight:700;font-size:16px;color:' + INK + ';outline:none;box-sizing:border-box;padding:0 12px;margin-bottom:10px;';
    nameInput.addEventListener('input', () => { formState.name = nameInput.value; });

    const avLabel = fmLabel('PICK BUDDY');
    const avGrid = document.createElement('div');
    avGrid.style.cssText = 'display:flex;flex-wrap:wrap;gap:8px;justify-content:center;margin-bottom:10px;';
    const avBtns: HTMLButtonElement[] = AVATARS.map((e, i) => {
      const b = document.createElement('button');
      b.textContent = e;
      b.style.cursor = 'pointer';
      b.addEventListener('click', () => { formState.avatarIdx = i; styleAvBtns(); audio.click(); });
      avGrid.append(b);
      return b;
    });
    function styleAvBtns() {
      avBtns.forEach((b, i) => {
        const sel = i === formState.avatarIdx;
        b.style.cssText =
          'width:38px;height:38px;border-radius:12px;border:none;font-size:20px;cursor:pointer;' +
          'display:flex;align-items:center;justify-content:center;padding:0;' +
          'background:' + (sel ? cssGradient(PALETTE[formState.colorIdx]) : '#fff') + ';' +
          'box-shadow:' + (sel ? '0 5px 12px rgba(74,68,102,.2)' : '0 3px 7px rgba(74,68,102,.07)') + ';';
      });
    }

    const colLabel = fmLabel('PICK COLOUR');
    const colGrid = document.createElement('div');
    colGrid.style.cssText = 'display:flex;justify-content:center;gap:12px;margin-bottom:12px;';
    const colBtns: HTMLButtonElement[] = PALETTE.map((p, i) => {
      const b = document.createElement('button');
      b.style.cursor = 'pointer';
      b.addEventListener('click', () => { formState.colorIdx = i; styleColBtns(); styleAvBtns(); audio.click(); });
      colGrid.append(b);
      return b;
    });
    function styleColBtns() {
      colBtns.forEach((b, i) => {
        const sel = i === formState.colorIdx;
        b.style.cssText =
          'width:34px;height:34px;border-radius:50%;cursor:pointer;padding:0;' +
          'background:' + cssGradient(PALETTE[i]) + ';' +
          'border:3px solid ' + (sel ? 'rgba(74,68,102,.85)' : 'rgba(0,0,0,0)') + ';';
      });
    }

    const formBtns = document.createElement('div');
    formBtns.style.cssText = 'display:flex;gap:8px;';
    const saveBtn = mkBtn('Save', accent);
    saveBtn.style.flex = '1';
    const cancelBtn = document.createElement('button');
    cancelBtn.textContent = 'Cancel';
    cancelBtn.style.cssText =
      'flex:1;height:42px;border:2px solid rgba(80,60,140,.12);border-radius:14px;background:#fff;' +
      'font-family:' + FONT_DISPLAY + ';font-weight:700;font-size:14px;color:' + INK_DIM + ';cursor:pointer;';
    formBtns.append(saveBtn, cancelBtn);
    formView.append(nameInput, avLabel, avGrid, colLabel, colGrid, formBtns);

    function openForm(member?: FamilyMember) {
      editingId = member?.id ?? null;
      formState.name = member?.name ?? '';
      formState.avatarIdx = member?.avatarIdx ?? 0;
      formState.colorIdx = member?.colorIdx ?? 0;
      nameInput.value = formState.name;
      styleAvBtns(); styleColBtns();
      listView.style.display = 'none';
      formView.style.display = 'block';
    }
    function closeForm() {
      formView.style.display = 'none';
      listView.style.display = 'block';
      renderMembers();
    }

    saveBtn.addEventListener('click', () => {
      const name = (formState.name || '').trim().slice(0, 14) || 'Player';
      if (editingId) FamilyProfiles.update(editingId, { name, avatarIdx: formState.avatarIdx, colorIdx: formState.colorIdx });
      else FamilyProfiles.add(name, formState.avatarIdx, formState.colorIdx);
      audio.click(); closeForm();
    });
    cancelBtn.addEventListener('click', () => { audio.click(); closeForm(); });
    addBtn.addEventListener('click', () => { audio.click(); openForm(); });

    function renderMembers() {
      memberGrid.innerHTML = '';
      const members = FamilyProfiles.list();
      if (members.length === 0) {
        const empty = document.createElement('div');
        empty.style.cssText = 'width:100%;text-align:center;color:' + INK_DIM + ';font-size:13px;font-weight:700;padding:8px;';
        empty.textContent = 'No family members yet — add some!';
        memberGrid.append(empty);
        return;
      }
      members.forEach(m => {
        const pal = PALETTE[m.colorIdx];
        const card = document.createElement('div');
        card.style.cssText =
          'display:flex;flex-direction:column;align-items:center;gap:6px;background:#fff;' +
          'border-radius:18px;padding:12px 10px 8px;box-shadow:0 4px 10px rgba(80,60,140,.07);' +
          'width:calc(33.33% - 7px);min-width:80px;box-sizing:border-box;';

        const av = document.createElement('div');
        av.style.cssText =
          'width:44px;height:44px;border-radius:' + BLOB_RADIUS + ';background:' + cssGradient(pal) + ';' +
          'display:flex;align-items:center;justify-content:center;font-size:22px;';
        av.textContent = AVATARS[m.avatarIdx];

        const nm = document.createElement('div');
        nm.style.cssText = 'font-family:' + FONT_DISPLAY + ';font-weight:700;font-size:12px;color:' + INK + ';text-align:center;width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;';
        nm.textContent = m.name;

        const actions = document.createElement('div');
        actions.style.cssText = 'display:flex;gap:6px;';
        const editBtn = mkIcon('✎', INK_DIM);
        editBtn.addEventListener('click', () => { audio.click(); openForm(m); });
        const delBtn = mkIcon('✕', '#FF6B6B');
        delBtn.addEventListener('click', () => { FamilyProfiles.remove(m.id); audio.click(); renderMembers(); });
        actions.append(editBtn, delBtn);
        card.append(av, nm, actions);
        memberGrid.append(card);
      });
    }

    styleAvBtns(); styleColBtns(); renderMembers();
    familyWrap.append(listView, formView);
    content.append(familyWrap);

    // ── SOUND ─────────────────────────────────────────────────────────────
    content.append(sectionLabel('SOUND'));
    const soundGroup = grp();
    [
      { key: 'sound', icon: '🔊', label: 'Sound', desc: 'Game sounds' },
      { key: 'music', icon: '🎵', label: 'Music', desc: 'Background tunes' },
      { key: 'sfx',   icon: '✨', label: 'Effects', desc: 'Taps & wins' },
    ].forEach(t => {
      const on = Storage.getBool('settings:' + t.key, true);
      soundGroup.append(togglePill(t.icon, t.label, t.desc, on, accent, (next) => {
        Storage.setBool('settings:' + t.key, next);
        if (t.key === 'sound') { Storage.setBool('muted', !next); audio.setMuted(!next); }
      }));
    });
    content.append(soundGroup);

    // ── PARENTAL CONTROLS ─────────────────────────────────────────────────
    content.append(sectionLabel('PARENTAL CONTROLS', 16));
    const parentGroup = grp();

    // Daily play time — dropdown
    const timeRow = document.createElement('div');
    timeRow.style.cssText = rowBase();
    const timeLabel = document.createElement('span');
    timeLabel.innerHTML =
      '<span style="font-size:22px">⏰</span>' +
      '<span style="flex:1;margin-left:12px"><span style="display:block;font-family:' + FONT_DISPLAY + ';font-weight:700;font-size:15px;color:' + INK + '">Daily play time</span>' +
      '<span style="font-size:12px;color:' + INK_DIM + ';font-weight:800">Limit screen time</span></span>';
    timeLabel.style.cssText = 'display:flex;align-items:center;flex:1;';

    const timeSel = document.createElement('select');
    timeSel.style.cssText =
      'border:none;background:#F3EEFF;border-radius:10px;padding:5px 10px;' +
      'font-family:' + FONT_DISPLAY + ';font-weight:800;font-size:13px;color:' + accent + ';cursor:pointer;outline:none;';
    const timeOptions: [string, string][] = [['Off', '0'], ['30 min', '30'], ['1 hr', '60'], ['2 hr', '120'], ['3 hr', '180']];
    const savedMins = Storage.getString('settings:dailyMinutes', '0');
    timeOptions.forEach(([label, val]) => {
      const opt = document.createElement('option');
      opt.value = val; opt.textContent = label;
      if (val === savedMins) opt.selected = true;
      timeSel.append(opt);
    });
    timeSel.addEventListener('change', () => {
      Storage.setString('settings:dailyMinutes', timeSel.value);
      audio.click();
    });
    timeRow.append(timeLabel, timeSel);
    parentGroup.append(timeRow);

    // Grown-up lock with PIN
    let lockOn = Storage.getBool('settings:lock', false);
    const lockBtn = togglePill('🔒', 'Grown-up lock', 'PIN to leave the app', lockOn, accent, () => {
      // intercept — handled manually below
    });
    // Override the default toggle click to gate with PIN
    lockBtn.addEventListener('click', (e) => {
      e.stopImmediatePropagation(); // prevent the togglePill's own listener from double-firing
      audio.click();
      const pin = Storage.getString('settings:parentPin', '');
      if (!lockOn) {
        // Turning ON: set a PIN first
        showPinSetOverlay({
          onSet: (newPin) => {
            Storage.setString('settings:parentPin', newPin);
            Storage.setBool('settings:lock', true);
            lockOn = true;
            syncLockVisual(lockBtn, lockOn, accent);
          },
        });
      } else {
        // Turning OFF: must enter existing PIN
        if (!pin) {
          Storage.setBool('settings:lock', false);
          lockOn = false;
          syncLockVisual(lockBtn, lockOn, accent);
          return;
        }
        showPinOverlay({
          title: '🔒 Enter PIN to disable',
          onCancel: () => {},
          onConfirm: (entered) => {
            if (entered === pin) {
              Storage.setBool('settings:lock', false);
              Storage.setString('settings:parentPin', '');
              lockOn = false;
              syncLockVisual(lockBtn, lockOn, accent);
            } else {
              const err = document.createElement('div');
              err.style.cssText = 'position:fixed;inset:0;z-index:10000;display:flex;align-items:center;justify-content:center;pointer-events:none;';
              err.innerHTML = `<div style="background:#FF6B6B;color:#fff;padding:10px 22px;border-radius:14px;font-family:${FONT_DISPLAY};font-weight:800;font-size:15px;">Wrong PIN</div>`;
              document.body.append(err);
              setTimeout(() => err.remove(), 1200);
            }
          },
        });
      }
    }, true); // capture phase so it fires before the togglePill listener
    parentGroup.append(lockBtn);
    content.append(parentGroup);

    const ver = document.createElement('div');
    ver.style.cssText = 'text-align:center;font-size:12px;color:' + INK_DIM + ';font-weight:800;margin-top:18px;margin-bottom:4px;';
    ver.textContent = 'PlayPals v1.0';
    content.append(ver);

    // ── helpers ───────────────────────────────────────────────────────────
    function sectionLabel(text: string, topMargin = 0): HTMLDivElement {
      const d = document.createElement('div');
      d.textContent = text;
      d.style.cssText = 'font-size:11px;color:' + INK_LABEL + ';font-weight:800;letter-spacing:1px;margin:' + topMargin + 'px 0 8px;';
      return d;
    }
    function grp(): HTMLDivElement {
      const d = document.createElement('div');
      d.style.cssText = 'display:flex;flex-direction:column;gap:8px;margin-bottom:14px;';
      return d;
    }
    function rowBase(): string {
      return 'display:flex;align-items:center;gap:0;background:#fff;border-radius:18px;padding:12px 14px;box-shadow:0 4px 12px rgba(80,60,140,.05);';
    }
    function mkBtn(label: string, color: string): HTMLButtonElement {
      const b = document.createElement('button');
      b.textContent = label;
      b.style.cssText =
        'height:42px;border:none;border-radius:14px;background:' + color + ';color:#fff;' +
        'font-family:' + FONT_DISPLAY + ';font-weight:800;font-size:14px;cursor:pointer;';
      return b;
    }
    function mkIcon(icon: string, color: string): HTMLButtonElement {
      const b = document.createElement('button');
      b.textContent = icon;
      b.style.cssText = 'border:none;background:none;font-size:16px;cursor:pointer;color:' + color + ';padding:4px;line-height:1;';
      return b;
    }
    function fmLabel(text: string): HTMLDivElement {
      const d = document.createElement('div');
      d.textContent = text;
      d.style.cssText = 'font-size:11px;color:' + INK_LABEL + ';font-weight:800;letter-spacing:1px;margin-bottom:7px;';
      return d;
    }
    function togglePill(icon: string, lbl: string, desc: string, initial: boolean, accentColor: string, onChange: (v: boolean) => void): HTMLButtonElement {
      let on = initial;
      const btn = document.createElement('button');
      btn.style.cssText = rowBase() + 'cursor:pointer;width:100%;';
      const knobX = (v: boolean) => v ? 'translateX(20px)' : 'translateX(0)';
      const trackColor = (v: boolean) => v ? accentColor : TRACK;
      btn.innerHTML =
        '<span style="font-size:22px">' + icon + '</span>' +
        '<span style="flex:1;margin-left:12px"><span style="display:block;font-family:' + FONT_DISPLAY + ';font-weight:700;font-size:15px;color:' + INK + '">' + lbl + '</span>' +
        '<span style="font-size:12px;color:' + INK_DIM + ';font-weight:800">' + desc + '</span></span>' +
        '<span data-track style="flex:none;width:46px;height:28px;border-radius:14px;background:' + trackColor(on) + ';position:relative;transition:background .2s">' +
        '<span data-knob style="position:absolute;top:3px;left:3px;width:22px;height:22px;border-radius:50%;background:#fff;box-shadow:0 2px 5px rgba(0,0,0,.25);transform:' + knobX(on) + ';transition:transform .2s"></span></span>';
      btn.addEventListener('click', () => {
        on = !on;
        (btn.querySelector('[data-track]') as HTMLElement).style.background = trackColor(on);
        (btn.querySelector('[data-knob]') as HTMLElement).style.transform = knobX(on);
        audio.click();
        onChange(on);
      });
      return btn;
    }

    void FONT_BODY;
  }
}

function syncLockVisual(btn: HTMLButtonElement, on: boolean, accent: string): void {
  const TRACK_OFF = '#E0D9F0';
  (btn.querySelector('[data-track]') as HTMLElement).style.background = on ? accent : TRACK_OFF;
  (btn.querySelector('[data-knob]') as HTMLElement).style.transform = on ? 'translateX(20px)' : 'translateX(0)';
}
