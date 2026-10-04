// Idle by default: nothing happens until a hotkey (or the fallback command) fires.
(() => {
  if (globalThis.__vsrfs) return;

  const TAG = '[VSR-FS]';
  const FWD = '__vsrfs_forward__';
  // In-page hotkeys (keydown, capture phase, so the page receives real user activation).
  // Edit here to rebind. Do not reuse a combination that is bound under chrome://extensions/shortcuts,
  // otherwise Chrome intercepts it first.
  const HOTKEYS = {
    toggle:   { code: 'KeyV', alt: true, shift: true, ctrl: false, meta: false },
    diagnose: { code: 'KeyD', alt: true, shift: true, ctrl: false, meta: false },
  };

  const CSS = `video:fullscreen {
    filter: none !important;
    transform: none !important;
    translate: none !important;
    rotate: none !important;
    scale: none !important;
    opacity: 1 !important;
    mix-blend-mode: normal !important;
    clip-path: none !important;
    mask: none !important;
    -webkit-mask: none !important;
    border-radius: 0 !important;
    visibility: visible !important;
    display: block !important;
  }`;

  // ---------- Finding the video ----------
  function allVideos(root = document, out = []) {
    root.querySelectorAll('video').forEach((v) => out.push(v));
    root.querySelectorAll('*').forEach((el) => {
      if (el.shadowRoot) allVideos(el.shadowRoot, out);
    });
    return out;
  }

  function visibleArea(el) {
    const r = el.getBoundingClientRect();
    const w = Math.min(r.right, innerWidth) - Math.max(r.left, 0);
    const h = Math.min(r.bottom, innerHeight) - Math.max(r.top, 0);
    return w > 0 && h > 0 ? w * h : 0;
  }

  const isPlaying = (v) => !v.paused && !v.ended && v.readyState >= 2;

  // Prefer a playing video, then the one with the largest visible area.
  function pick() {
    let best = null, bestKey = [-1, 0];
    for (const v of allVideos()) {
      const area = visibleArea(v);
      if (area <= 0) continue;
      const key = [isPlaying(v) ? 1 : 0, area];
      if (key[0] > bestKey[0] || (key[0] === bestKey[0] && key[1] > bestKey[1])) {
        best = v; bestKey = key;
      }
    }
    return best;
  }

  // ---------- Style override while fullscreen ----------
  let ourVideo = null;
  let sheet = null;
  let styleEl = null;

  function applyCss() {
    removeCss();
    const root = ourVideo.getRootNode();
    try {
      sheet = new CSSStyleSheet();
      sheet.replaceSync(CSS);
      root.adoptedStyleSheets = [...root.adoptedStyleSheets, sheet];
    } catch (e) {
      sheet = null;
      styleEl = document.createElement('style');
      styleEl.textContent = CSS;
      (root === document ? document.head || document.documentElement : root).appendChild(styleEl);
    }
  }

  function removeCss() {
    if (sheet && ourVideo) {
      const root = ourVideo.getRootNode();
      try { root.adoptedStyleSheets = root.adoptedStyleSheets.filter((s) => s !== sheet); } catch (e) {}
    }
    sheet = null;
    if (styleEl) { styleEl.remove(); styleEl = null; }
  }

  function onFullscreenChange() {
    if (ourVideo && ourVideo.matches(':fullscreen')) {
      applyCss();
    } else {
      removeCss();
      document.removeEventListener('fullscreenchange', onFullscreenChange);
      ourVideo = null;
    }
  }

  // ---------- Fallback on-video button ----------
  let btnHost = null;
  let btnTimer = 0;

  function hideButton() {
    clearTimeout(btnTimer);
    if (btnHost) { btnHost.remove(); btnHost = null; }
  }

  function showButton(v) {
    hideButton();
    const r = v.getBoundingClientRect();
    btnHost = document.createElement('div');
    btnHost.style.cssText = 'all:initial;position:fixed;z-index:2147483647;' +
      `left:${Math.max(r.left, 0) + 8}px;top:${Math.max(r.top, 0) + 8}px;`;
    const sr = btnHost.attachShadow({ mode: 'closed' });
    const b = document.createElement('button');
    b.textContent = '▶ Fullscreen video';
    b.style.cssText = 'font:13px sans-serif;padding:6px 10px;border:0;border-radius:4px;' +
      'background:#0f766e;color:#fff;cursor:pointer;';
    b.addEventListener('click', (e) => {
      e.preventDefault(); e.stopPropagation();
      hideButton();
      enter(v, false);
    });
    sr.appendChild(b);
    document.documentElement.appendChild(btnHost);
    btnTimer = setTimeout(hideButton, 8000);
  }

  // ---------- Fullscreen toggle ----------
  const inVideoFullscreen = () => {
    const fs = document.fullscreenElement;
    return !!((ourVideo && ourVideo.matches(':fullscreen')) || (fs && fs.tagName === 'VIDEO'));
  };

  async function enter(v, allowButton) {
    try {
      if (document.fullscreenElement) await document.exitFullscreen().catch(() => {});
      ourVideo = v;
      document.addEventListener('fullscreenchange', onFullscreenChange);
      await v.requestFullscreen({ navigationUI: 'hide' });
    } catch (e) {
      console.warn(TAG, 'requestFullscreen failed:', e && e.message,
        '| user activation:', navigator.userActivation && navigator.userActivation.isActive,
        '| in iframe:', window !== top,
        '(a cross-origin iframe needs allow="fullscreen")');
      document.removeEventListener('fullscreenchange', onFullscreenChange);
      ourVideo = null;
      if (allowButton) showButton(v);
    }
  }

  async function toggle() {
    hideButton();
    if (inVideoFullscreen()) {
      await document.exitFullscreen().catch(() => {});
      return;
    }
    const v = pick();
    if (!v) { console.info(TAG, 'No visible video in this frame'); return; }
    await enter(v, true);
  }

  // ---------- Diagnostics ----------
  const STYLE_PROPS = [
    ['filter', 'none'], ['backdrop-filter', 'none'], ['transform', 'none'],
    ['translate', 'none'], ['rotate', 'none'], ['scale', 'none'],
    ['opacity', '1'], ['mix-blend-mode', 'normal'], ['clip-path', 'none'],
    ['mask-image', 'none'], ['-webkit-mask-image', 'none'],
    ['border-radius', '0px'], ['visibility', 'visible'],
  ];

  function describe(el) {
    if (!el || !el.tagName) return String(el);
    let s = el.tagName.toLowerCase();
    if (el.id) s += '#' + el.id;
    if (typeof el.className === 'string' && el.className.trim()) {
      s += '.' + el.className.trim().split(/\s+/).slice(0, 3).join('.');
    }
    return s;
  }

  function nonDefaultStyles(el) {
    const cs = getComputedStyle(el);
    const out = {};
    for (const [p, def] of STYLE_PROPS) {
      const val = cs.getPropertyValue(p);
      if (val && val !== def) out[p] = val;
    }
    if (cs.display === 'none') out.display = 'none';
    return out;
  }

  function parentOf(el) {
    if (el.parentElement) return el.parentElement;
    const root = el.getRootNode();
    return root instanceof ShadowRoot ? root.host : null;
  }

  function logChain(el, title) {
    console.group(`${TAG} ${title}: ${describe(el)} (non-default styles on it and its ancestors)`);
    let any = false;
    for (let n = el; n; n = parentOf(n)) {
      const s = nonDefaultStyles(n);
      if (Object.keys(s).length) { any = true; console.log(describe(n), s, n); }
    }
    if (!any) console.log('No non-default values');
    console.groupEnd();
  }

  function rectStr(r) {
    return `${Math.round(r.left)},${Math.round(r.top)} ${Math.round(r.width)}x${Math.round(r.height)}`;
  }

  function samplePoints(v) {
    const r = v.getBoundingClientRect();
    const l = Math.max(r.left, 0), t = Math.max(r.top, 0);
    const w = Math.min(r.right, innerWidth) - l, h = Math.min(r.bottom, innerHeight) - t;
    const pts = [];
    if (w <= 0 || h <= 0) return pts;
    for (const fy of [0.1, 0.3, 0.5, 0.7, 0.9]) {
      for (const fx of [0.1, 0.3, 0.5, 0.7, 0.9]) pts.push([l + w * fx, t + h * fy]);
    }
    return pts;
  }

  function covering(v) {
    const map = new Map();
    const pts = samplePoints(v);
    for (const [x, y] of pts) {
      const stack = document.elementsFromPoint(x, y);
      const idx = stack.findIndex((e) => e === v || (e.shadowRoot && e.shadowRoot.contains(v)));
      const above = idx === -1 ? stack : stack.slice(0, idx);
      for (const e of above) {
        if (e.contains(v)) continue;
        const rec = map.get(e) || { n: 0 };
        rec.n++;
        map.set(e, rec);
      }
    }
    return { map, total: pts.length };
  }

  function allCanvases(root = document, out = []) {
    root.querySelectorAll('canvas').forEach((c) => out.push(c));
    root.querySelectorAll('*').forEach((el) => { if (el.shadowRoot) allCanvases(el.shadowRoot, out); });
    return out;
  }

  function overlapRatio(a, b) {
    const w = Math.min(a.right, b.right) - Math.max(a.left, b.left);
    const h = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
    return w > 0 && h > 0 ? (w * h) / Math.max(b.width * b.height, 1) : 0;
  }

  function diagnoseVideo(v, i) {
    const r = v.getBoundingClientRect();
    const cs = getComputedStyle(v);
    console.group(`${TAG} video #${i}: ${describe(v)}  rect=${rectStr(r)}`);

    const warns = [];
    if (cs.display === 'none') warns.push('video is display:none');
    if (cs.visibility !== 'visible') warns.push('video visibility=' + cs.visibility);
    if (parseFloat(cs.opacity) < 1) warns.push('video opacity=' + cs.opacity);
    if (v.hidden) warns.push('video has the hidden attribute');
    if (r.width < 50 || r.height < 50) warns.push('video is rendered unusually small');
    if (visibleArea(v) === 0) warns.push('video is entirely outside the viewport');
    if (!v.videoWidth) warns.push('videoWidth=0 (no decoded frame yet)');
    console.log('State', {
      paused: v.paused, ended: v.ended, readyState: v.readyState,
      videoSize: `${v.videoWidth}x${v.videoHeight}`,
      cssSize: `${Math.round(r.width)}x${Math.round(r.height)}`,
      srcKind: (v.currentSrc || v.src || '').split(':')[0] || '(none)',
      objectFit: cs.objectFit, inFullscreen: v.matches(':fullscreen'),
      frame: window === top ? 'top' : location.href,
    });
    if (warns.length) console.warn('Anomalies:', warns);

    logChain(v, 'Style chain');

    const { map, total } = covering(v);
    console.group(`${TAG} Elements stacked above the video (${total} sample points)`);
    if (!map.size) console.log('Nothing is stacked above the video');
    for (const [e, rec] of map) {
      const ecs = getComputedStyle(e);
      console.log(`${describe(e)}  covers ${rec.n}/${total} points`, {
        rect: rectStr(e.getBoundingClientRect()), position: ecs.position, zIndex: ecs.zIndex,
        opacity: ecs.opacity, pointerEvents: ecs.pointerEvents,
        background: ecs.backgroundColor, isCanvas: e.tagName === 'CANVAS',
      }, e);
    }
    console.groupEnd();

    const cvs = allCanvases()
      .map((c) => ({ c, ratio: overlapRatio(c.getBoundingClientRect(), r) }))
      .filter((x) => x.ratio > 0.05);
    console.group(`${TAG} Canvases overlapping the video area`);
    if (!cvs.length) console.log('None (does not look like canvas rendering)');
    for (const { c, ratio } of cvs) {
      const ccs = getComputedStyle(c);
      console.log(`${describe(c)} covers ${(ratio * 100).toFixed(0)}% of the video area`, {
        canvasSize: `${c.width}x${c.height}`, rect: rectStr(c.getBoundingClientRect()),
        visibility: ccs.visibility, opacity: ccs.opacity, pointerEvents: ccs.pointerEvents,
      }, c);
    }
    console.groupEnd();
    console.groupEnd();
  }

  function diagnose() {
    const vids = allVideos();
    const frames = [...document.querySelectorAll('iframe,frame')].filter((f) => visibleArea(f) > 0);
    if (!vids.length && !frames.length) {
      if (window === top) console.info(TAG, 'No video in this frame');
      return;
    }
    console.group(`${TAG} Diagnosis @ ${window === top ? 'top frame' : location.href} (${vids.length} video)`);
    vids.forEach(diagnoseVideo);
    frames.forEach((f, i) => logChain(f, `iframe #${i} ` + (f.src || '(no src)')));
    if (window !== top && vids.length) {
      console.info(TAG, 'The <iframe> element holding this frame, and its ancestors, live in the parent frame; ' +
        'its diagnosis is printed there (pick the "top" context in the console).');
    }
    console.groupEnd();
  }

  // ---------- Entry points: in-page hotkeys + forwarding to child frames ----------
  function forwardDown(action) {
    document.querySelectorAll('iframe,frame').forEach((f) => {
      try { f.contentWindow.postMessage({ [FWD]: action }, '*'); } catch (e) {}
    });
  }

  function dispatch(action) {
    if (action === 'diagnose') { diagnose(); forwardDown(action); return; }
    if (inVideoFullscreen()) { toggle(); return; }
    const fs = document.fullscreenElement;
    if (fs && (fs.tagName === 'IFRAME' || fs.tagName === 'FRAME')) { forwardDown('toggle'); return; }
    const v = pick();
    const hasKids = !!document.querySelector('iframe,frame');
    if (v && (isPlaying(v) || !hasKids)) { toggle(); return; }
    forwardDown('toggle');
  }

  function matchHotkey(e) {
    for (const [action, k] of Object.entries(HOTKEYS)) {
      if (e.code === k.code && e.altKey === k.alt && e.shiftKey === k.shift &&
          e.ctrlKey === k.ctrl && e.metaKey === k.meta) return action;
    }
    return null;
  }

  window.addEventListener('keydown', (e) => {
    if (e.repeat) return;
    const action = matchHotkey(e);
    if (!action) return;
    e.preventDefault();
    e.stopImmediatePropagation();
    dispatch(action);
  }, true);

  window.addEventListener('message', (e) => {
    if (window.parent === window || e.source !== window.parent) return;
    const d = e.data;
    if (d && typeof d === 'object' && (d[FWD] === 'toggle' || d[FWD] === 'diagnose')) dispatch(d[FWD]);
  });

  // ---------- Called by background.js via executeScript (same isolated world) ----------
  globalThis.__vsrfs = {
    probe() {
      const v = pick();
      return {
        count: allVideos().length,
        fullscreen: inVideoFullscreen(),
        playing: !!(v && isPlaying(v)),
        area: v ? visibleArea(v) : 0,
      };
    },
    run(action) {
      if (action === 'toggle') return toggle();
      if (action === 'diagnose') return diagnose();
    },
  };
})();
