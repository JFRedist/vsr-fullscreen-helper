// Fallback entry: chrome.commands shortcuts. Does nothing until a shortcut is pressed.
// It calls globalThis.__vsrfs (defined by content.js, same isolated world) through
// scripting.executeScript so the best video can be chosen across all frames.
// The page may not have user activation on this path; if requestFullscreen fails,
// content.js shows an on-video button instead.

async function targetTabId(tab) {
  if (tab && tab.id != null) return tab.id;
  const [t] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
  return t && t.id;
}

async function inFrames(tabId, target, func, args = []) {
  try {
    return await chrome.scripting.executeScript({ target: { tabId, ...target }, func, args });
  } catch (e) {
    console.warn('[VSR-FS] executeScript failed:', e && e.message);
    return [];
  }
}

const probe = () => (globalThis.__vsrfs ? globalThis.__vsrfs.probe() : null);
const run = (action) => (globalThis.__vsrfs ? globalThis.__vsrfs.run(action) : null);

chrome.commands.onCommand.addListener(async (command, tab) => {
  const tabId = await targetTabId(tab);
  if (tabId == null) return;

  if (command === 'diagnose-video') {
    await inFrames(tabId, { allFrames: true }, run, ['diagnose']);
    return;
  }
  if (command !== 'toggle-video-fullscreen') return;

  const results = (await inFrames(tabId, { allFrames: true }, probe))
    .filter((r) => r.result && r.result.count > 0);
  if (!results.length) return;

  // A frame already holding a fullscreen video wins (to exit);
  // otherwise the frame with a playing video and the largest visible area.
  const best =
    results.find((r) => r.result.fullscreen) ||
    results.sort((a, b) => (b.result.playing - a.result.playing) || (b.result.area - a.result.area))[0];

  await inFrames(tabId, { frameIds: [best.frameId] }, run, ['toggle']);
});
