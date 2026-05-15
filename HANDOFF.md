# Note Pins — Developer Handoff

Last updated: 2026-05-16. Read `CLAUDE.md` for the full architecture reference.

---

## What the app does

Electron + React + TypeScript desktop sticky-notes app for Windows. Notes and Polaroid-style photo pins float on the desktop behind all other windows. Full MCP server lets Claude create, edit, and manage pins via Claude.ai (ngrok) or Claude Desktop (stdio).

---

## Current state — everything working

| Feature | Status |
|---|---|
| Sticky notes (create, edit, delete, rich text, themes) | ✅ |
| Photo pins (Polaroid frame, rotation, caption) | ✅ |
| Desktop layering — notes stay behind other windows | ✅ (koffi → SetWindowPos HWND_BOTTOM) |
| Click-to-strikethrough sentences on posted notes | ✅ |
| Auto-start on Windows login | ✅ (registry startup entry) |
| System tray (hide to tray on close, Quit, Export) | ✅ |
| Export notes as JSON / Markdown | ✅ |
| Corrupt-file recovery with .bak | ✅ |
| MCP — Claude.ai via ngrok | ✅ `https://lather-ninth-kleenex.ngrok-free.dev/mcp` |
| MCP — Claude Desktop auto-config (EXE + Store version) | ✅ |
| MCP — Claude Code CLI | ✅ |

---

## Build commands

```powershell
# Dev (hot reload)
npm run dev

# Build installer (always kill the app first)
Stop-Process -Name "Note Pins" -Force -ErrorAction SilentlyContinue
$env:CSC_IDENTITY_AUTO_DISCOVERY="false"; npm run make
# → dist/Note Pins Setup 1.0.0.exe  (~83 MB)

# After changing mcp-server/src/ only:
cd mcp-server; npm run build; cd ..
# Then re-run npm run make

# Tests (16 passing)
npm test
```

> **Windows Developer Mode must be ON** (Settings → System → For developers) for `npm run make` to work.

---

## MCP setup for Claude.ai (personal use)

1. Note Pins must be running (lives in the system tray)
2. Go to Claude.ai → Settings → Connectors
3. Add: `https://lather-ninth-kleenex.ngrok-free.dev/mcp`
4. Done — ngrok auto-starts with Note Pins

**ngrok binary:** `%LOCALAPPDATA%\ngrok\ngrok.exe` (v3.39.1)
**ngrok config:** `%LOCALAPPDATA%\ngrok\ngrok.yml` (authtoken stored here)
**ngrok domain:** `lather-ninth-kleenex.ngrok-free.dev` (free static domain, permanent)

If ngrok needs reinstalling: download from `bin.equinox.io` (NOT winget — that installs v3.3.x which is too old). Run `ngrok authtoken <token>` to restore the config.

---

## Sharing with friends

Send `dist/Note Pins Setup 1.0.0.exe`. They get all desktop features. Ngrok silently skips on their machines (binary not present). No Node.js required on their machines — the MCP server runs via the bundled Electron binary with the RunAsNode fuse enabled.

---

## Key file locations (runtime)

| What | Path |
|---|---|
| Notes data | `%APPDATA%\Note Pins\sticky-notes.json` |
| Backup | `%APPDATA%\Note Pins\sticky-notes.json.bak` |
| Images | `%APPDATA%\Note Pins\images\` |
| Claude Desktop config (EXE) | `%APPDATA%\Claude\claude_desktop_config.json` |
| Claude Desktop config (Store) | `%LOCALAPPDATA%\Packages\Claude_pzs8sxrjxfjjc\LocalCache\Roaming\Claude\claude_desktop_config.json` |
| ngrok binary | `%LOCALAPPDATA%\ngrok\ngrok.exe` |
| ngrok authtoken | `%LOCALAPPDATA%\ngrok\ngrok.yml` |

---

## Future feature ideas

- **`post_clipboard_image` from Claude Desktop** — already works from Claude.ai; from Claude Desktop it requires the clipboard to be read inside the Electron process (already implemented via `clipboard.readImage()` in http-bridge.ts)
- **Rich text via MCP** — `edit_note` writes plain text paragraphs only. The bridge already accepts `slateContent` (raw Slate JSON) on `PATCH /notes/:id/content` but it's not exposed as an MCP tool to avoid format complexity
- **Note search via MCP** — `searchNotes()` exists in `db.ts` but isn't wired to a tool yet
- **Multiple windows on multi-monitor** — already multi-monitor aware for spawn position; no known gaps
- **Dark mode for the main window** — the floating notes have a dark theme but the main app UI is always light
- **Custom ngrok domain** — the free static domain works indefinitely; upgrading to paid gives a custom subdomain

---

## Known gotchas for future sessions

1. **Kill the app before `npm run make`** — the exe locks DLLs in `dist/win-unpacked/`
2. **`npm run build` alone is not enough** — the desktop shortcut points to `dist\win-unpacked\` which is an asar snapshot from `npm run make`. Always run `make` to test packaged behavior.
3. **SDK v1.29 transport is stateless** — `buildMcpServer()` must create a fresh instance per HTTP request. Do not share the transport.
4. **RunAsNode fuse** — `afterPack.js` flips it via `@electron/fuses`. If you ever upgrade Electron and the fuse breaks, check `FuseVersion` compatibility in the `@electron/fuses` changelog.
5. **Two Claude Desktop install paths** — the Microsoft Store version sandboxes AppData. `claudeConfigDirs()` in `http-bridge.ts` handles both. If Anthropic releases a new Store package family name, the `Claude_*` glob in that function will still catch it.
6. **ngrok winget version is too old** — `C:\Program Files\ngrok\ngrok.exe` (winget) is v3.3.x and missing the `--domain` flag. Always use `%LOCALAPPDATA%\ngrok\ngrok.exe`.
7. **lowdb is ESM-only** — that's why the project uses a custom `fs`-based persistence layer. Don't switch to lowdb v7.
