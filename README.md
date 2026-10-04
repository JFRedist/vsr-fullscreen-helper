# VSR Fullscreen Helper

[中文说明](README.zh-CN.md)

A small Chrome extension (Manifest V3) that helps **NVIDIA RTX Video Super Resolution (VSR)** activate on websites where it otherwise doesn't.

## Why

Chrome only applies RTX VSR to video presented as a DirectComposition overlay. On some sites, something in the page prevents the `<video>` from being promoted to an overlay even though hardware decoding works fine. Typical causes:

- elements stacked above the video (danmaku/comment layers, watermarks, custom control bars)
- CSS on the video or its ancestors: `filter`, `transform`, `opacity`, `mix-blend-mode`, `clip-path`, `mask`, `border-radius`
- the player drawing frames onto a `<canvas>` while the real `<video>` is hidden

This extension puts **only the `<video>` element** into fullscreen, bypassing the player's own UI. A fullscreen element lives in the browser's top layer, so ancestor styles and sibling overlays no longer interfere. While it is fullscreen, the extension also force-clears the overlay-blocking CSS on the video itself, and removes that override when you exit.

It cannot help if the site renders to a canvas or uses a decode path that doesn't support VSR. The diagnostic hotkey tells you whether that is the case.

## Usage

1. Start playing a video.
2. Press **Alt+Shift+V**: the playing video goes fullscreen. Press it again to exit.
3. Check that RTX VSR is active (NVIDIA App / NVIDIA Control Panel, or GPU usage in Task Manager while toggling VSR).

| Action | In-page hotkey (recommended) | Fallback `chrome.commands` |
|---|---|---|
| Toggle video fullscreen | `Alt+Shift+V` | `Alt+Shift+F` |
| Print diagnostics to the console | `Alt+Shift+D` | `Alt+Shift+G` |

**Why two sets:** `requestFullscreen()` needs transient user activation. The in-page hotkey is a real `keydown` received by the page (capture phase), so it always carries activation. The `chrome.commands` shortcut is handled by the browser and then relayed to the page, which may not carry activation; if the request fails, an on-video button ("▶ Fullscreen video") appears for 8 seconds so you can click it instead.

**Which video is chosen:** a playing video is preferred, then the one with the largest visible area. The `chrome.commands` path compares videos across all frames. The in-page hotkey acts in the focused frame, and forwards to child iframes if there is no playing video there. If the player is in a cross-origin iframe and the hotkey doesn't work, click the video once first so the iframe has focus, or use the on-video button.

### Diagnostics

Open DevTools (F12) → Console, then press `Alt+Shift+D`. It prints:

- non-default `filter`, `backdrop-filter`, `transform`, `opacity`, `mix-blend-mode`, `clip-path`, `mask`, `border-radius`, `visibility`, `display` on the video and every ancestor
- elements stacked above the video, found with `elementsFromPoint` over a 5×5 grid
- whether the video is hidden, tiny, off-screen or has no decoded frame
- canvases overlapping the video area (to spot canvas-based rendering)

For videos inside an iframe, use the console's context dropdown to switch to that frame. The `<iframe>` element's own style chain is printed by the parent frame.

## Install

### From a release / source (unpacked)

1. Download or clone this repository.
2. Open `chrome://extensions` and enable **Developer mode**.
3. Click **Load unpacked** and select this folder.
4. Reload any tab that was already open, so the content script is injected.

### Rebinding keys

- Fallback commands: `chrome://extensions/shortcuts`.
- In-page hotkeys: edit `HOTKEYS` at the top of `content.js` (`code` is a physical key name such as `KeyV`), click the reload button for the extension, and reload the page. Don't reuse a combination that is bound as a fallback command; Chrome would intercept it first.

## Permissions and privacy

- `host_permissions: <all_urls>` and a content script on all frames: needed because the video can be on any site and inside any iframe. The script is idle until you press a hotkey.
- `scripting`: used only by the fallback `chrome.commands` path to run the extension's own function in the page's frames.
- No network requests, no remote code, no analytics, no data stored or collected. See [PRIVACY.md](PRIVACY.md).

## Troubleshooting: still no VSR after fullscreen

Then the cause is not an overlay-blocking element. Things to check:

1. The diagnostics show `inFullscreen: true` for the right video (not a hidden decoy next to a canvas).
2. The video is decoded in hardware: `chrome://media-internals` → `kVideoDecoderName` (e.g. `D3D11VideoDecoder`).
3. `chrome://gpu` reports hardware acceleration and `Supports overlays: true`.
4. VSR is enabled in the NVIDIA App / Control Panel and your GPU/driver support it. Compare with a known-good source such as YouTube at a low resolution.
5. Try a clean Chrome profile (`--user-data-dir`) to rule out other extensions and flags.

## Limitations

- Restricted pages (`chrome://`, the Chrome Web Store) cannot be scripted.
- A cross-origin iframe without `allow="fullscreen"` cannot enter fullscreen (a console warning says so).
- Chrome and RTX VSR behaviour can change between versions.

## Development

```
node tools/make-icons.js   # regenerate icons/
node tools/pack.js         # build dist/vsr-fullscreen-helper-<version>.zip for the Chrome Web Store
```

## Disclaimer

Not affiliated with or endorsed by NVIDIA or Google. NVIDIA and RTX are trademarks of NVIDIA Corporation.

## License

[MIT](LICENSE)
