# Chrome Web Store listing (copy-paste material)

Not part of the extension package (`tools/pack.js` only zips the runtime files).

## Name
VSR Fullscreen Helper

## Summary (max 132 chars)
Fullscreen just the video and diagnose what blocks overlays, so NVIDIA RTX Video Super Resolution can activate.

## Category
Productivity (or Tools)

## Description
RTX Video Super Resolution (VSR) in Chrome only applies to video presented as a hardware overlay. On some sites, elements or CSS around the video stop that from happening, so VSR never turns on even though hardware decoding works.

VSR Fullscreen Helper puts only the <video> element into fullscreen, bypassing the player's own UI and any overlays stacked on it. While fullscreen, it also clears CSS on the video (filter, transform, opacity, blend mode, clip-path, mask, border-radius) that can prevent overlay promotion, and restores everything when you exit.

HOW TO USE
• Start playing a video, then press Alt+Shift+V to fullscreen the video. Press it again to exit.
• Press Alt+Shift+D with DevTools open to print a diagnosis: non-default styles on the video and its ancestors, elements stacked above it, and any canvas covering it.
• Fallback shortcuts (rebindable at chrome://extensions/shortcuts): Alt+Shift+F and Alt+Shift+G. If fullscreen is blocked, a small button appears on the video.

PRIVACY
No network requests, no remote code, no analytics, no data collected or stored. The extension is idle until you press a hotkey.

Requires an NVIDIA RTX GPU with VSR enabled in the NVIDIA App or Control Panel. It cannot help on sites that render video to a canvas. Not affiliated with NVIDIA or Google; NVIDIA and RTX are trademarks of NVIDIA Corporation.

Source code: <GITHUB URL>

## Single purpose
Fullscreen the playing video element on its own, with diagnostics, so that RTX Video Super Resolution can activate on sites where page elements prevent it.

## Permission justifications
- **Host permission `<all_urls>` / content script on all frames**: the video can be on any website and inside any iframe (often cross-origin). The script only reads the DOM/styles in memory when the user presses a hotkey.
- **`scripting`**: used by the optional chrome.commands shortcuts to run the extension's own function in the page's frames and pick the best video across frames. No remote code.
- **Remote code**: none. **Data usage**: none collected; certify all data-usage boxes as "no".

## Privacy policy URL
<GITHUB URL>/blob/main/PRIVACY.md

## Still needed before submission (manual)
- Chrome Web Store developer account (one-time US$5 fee).
- At least one screenshot, 1280x800 or 640x400 (e.g. the diagnostics console, or a before/after of the NVIDIA VSR status). Optional small promo tile 440x280.
- Upload `dist/vsr-fullscreen-helper-<version>.zip`.
- Note: the broad host permission will likely trigger an in-depth review, which can take longer. The name/description mention RTX; if a trademark objection comes back, drop "RTX/NVIDIA" from the name and keep it only as a compatibility note in the description.
