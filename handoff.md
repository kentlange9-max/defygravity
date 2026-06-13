# Antigravity Playground — Agent Handoff

> **Status as of 2026-06-12 ~11:08 AM EST**
> Most visual theming is working. One lingering issue remains (fade at chat bottom area). Orbs, glassmorphism, scrobble line, and beam are all functional.

---

## What This Project Is

The boss is modding the **Antigravity** desktop AI coding assistant app (an Electron app similar to Cursor/VS Code). The app ships as a packed `.asar` archive at:

```
C:\Users\Kentl\AppData\Local\Programs\Antigravity\resources\app.asar
```

The workflow is:
1. **Unpack** `app.asar` ? `app_unpacked/` (already done, do not redo unless explicitly asked)
2. **Edit source files** in `app_unpacked/dist/`
3. **Repack** with `npx asar pack app_unpacked app.asar` from `d:\nerd shit\other projects\antigravity playground\`
4. **Hard reload** the running app with `Ctrl+Shift+R` (the boss does this manually)

> **IMPORTANT:** The boss runs the *installed* app from `C:\Users\Kentl\AppData\Local\Programs\Antigravity\`. The `app.asar` you pack in the playground folder is NOT automatically applied to the installed app — the boss copies it manually (or there is a launch script; ask if unsure). Always repack after edits.

---

## The Main File You Work In

**`d:\nerd shit\other projects\antigravity playground\app_unpacked\dist\utils.js`** — 730 lines total.

All custom visual injections live inside the `createWindow()` function, starting around **line 157** in the `win.webContents.on('did-finish-load', ...)` callback.

There are two injection blocks:
1. **`win.webContents.insertCSS(...)`** — Lines ~159–415: Injects all the CSS (orbs, glassmorphism, scrobble animation keyframes, beam animation, grain overlay, etc.)
2. **`win.webContents.executeJavaScript(...)`** — Lines ~418–620: Injects a JS MutationObserver (`enforceGlass`) that continuously enforces custom styles on dynamic React elements.

---

## What Is Done

### Glassmorphism Theme
- `html` background: solid `#121212` (dark base)
- `body` background: transparent (lets orbs show through)
- Sidebar: flat frosted glass `rgba(255,255,255,0.03)` + `backdrop-filter: blur(16px)`
- Topbar (menubar): same frosted glass treatment
- `#root` and `#app` sit at `z-index: 10` so they float above the orbs
- Agent response bubbles styled as glass cards

### Volumetric Blue Orb Background
Three floating radial-gradient orbs injected via `html::before`, `body::before`, `body::after`:
- **Orb 1** (Sky Blue `rgb(14,165,233)`): Top-left, 75vmax, 120s drift cycle
- **Orb 2** (Ocean Blue `rgb(2,132,199)`): Bottom-right, 62vmax, 160s drift cycle
- **Orb 3** (Slate Blue `rgb(12,143,214)`): Mid-left, 68vmax, 140s drift cycle
- All at `z-index: 1`, `mix-blend-mode: screen`

### Film Grain Overlay
- `html::after` at `z-index: 2` (below React app at z-index 10 so text stays crisp)
- SVG fractalNoise filter, opacity `0.024`, `mix-blend-mode: overlay`

### Scrobbling Blue Line on Chat Input
- Finds chat input by ID: `antigravity.agentSidePanelInputBox`
- Creates a detached `<svg>` overlay on `document.body` (fixed, `z-index: 2147483647`)
- SVG `<rect>` traces exact bounding box via `requestAnimationFrame`
- Stroke: `#1e40af`, width `1.5px`, `stroke-linecap: round`
- Animation: `svg-scrobble` keyframe, 10s linear infinite, `stroke-dasharray: 5 95`
- `drop-shadow(0 0 8px #1e40af)` glow effect

### Sending Beam Animation
- On Enter/send button click, a `.chat-beam` div shoots upward from the chat box
- `shoot-up-beam` keyframe: rises 800px, fades out, 0.8s duration
- Blue linear-gradient beam with glow box-shadow

### Gradient/Fade Nuke CSS
Global CSS targeting Tailwind fade classes:
- `[class*="bg-gradient-to"]`, `[class*="from-"]`, `[class*="to-transparent"]`
- Strips `mask-image`, `-webkit-mask-image` from scroll containers
- JS traversal strips 8 parent levels above the chat box

---

## What Is NOT Done / Still Broken

### The Bottom Fade Issue
There is still some kind of fade/gradient at the bottom of the chat area (above the chat input). Everything tried so far:
- CSS gradient class nukes
- Mask-image nukes
- Parent-traversal JS (8 levels up from chat box)
- Stripping box-shadow and background-color from structural roots

**What to try next:**
1. DevTools auto-opens on the right side of the window (line 158 in utils.js)
2. Inspect the element causing the fade — right-click the fade ? Inspect
3. Get the exact class names and element type, then add a targeted CSS override
4. Most likely suspects:
   - A `mask-image: linear-gradient(to bottom, ...)` on a container whose class does not match our current selectors
   - An absolutely-positioned pseudo-element (`::before`/`::after`) on a scroll container
   - A hardcoded `box-shadow: inset 0 -40px 40px rgba(0,0,0,0.8)` inline style

---

## Dev Tools Note

`win.webContents.openDevTools({ mode: 'right' })` is called on every load (line 158). DevTools opens on the right side of the window automatically. Use it to inspect the fade element directly.

---

## Workflow Reference

```powershell
# From: d:\nerd shit\other projects\antigravity playground

# After editing utils.js, repack:
npx asar pack app_unpacked app.asar

# The boss then does Ctrl+Shift+R to hard reload the app
```

---

## Other Files of Note

| File | Purpose |
|------|---------|
| `app_unpacked/dist/main.js` | App entry, window creation |
| `app_unpacked/dist/tray.js` | System tray icon/menu |
| `app_unpacked/dist/loadingOverlay.js` | Loading screen (has its own gradient bg) |
| `app_unpacked/dist/ipcHandlers.js` | IPC message handlers |
| `app_unpacked/dist/preload.js` | Preload script for renderer |

---

## Gotchas Learned the Hard Way

1. **CSS syntax errors in `insertCSS` strings silently kill everything.** A missing `}` brace will cause the entire stylesheet to fail silently. Always check CSS block structure after edits.

2. **The JS `executeJavaScript` block must be a single valid JS string.** Unescaped backticks or bad template literals caused `SyntaxError: missing ) after argument list` at app startup.

3. **Do not remove `color: #f4f4f5 !important` from `body`.** It was accidentally dropped once and all text went invisible.

4. **DevTools is your best friend here.** It auto-opens on the right side — inspect stubborn elements directly rather than guessing class names.

5. **CSS selector `[class*="from-"]` is a nuclear option.** It can accidentally strip legitimate Tailwind utility classes from components. If things break visually, this selector may be too broad.
