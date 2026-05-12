# Note Pins

A vibe-coded desktop sticky notes app built with Electron and React. Sticky notes and Polaroid-style photo pins (including GIFs) sit directly on your desktop, always behind your other windows so they never get in the way.

![Note Pins in action](show.png)

---

## Features

- **Sticky notes on the desktop** -- rich text editor with bold, italic, strikethrough, bullet lists, numbered lists, checkboxes, and headings
- **Click-to-strike sentences** -- click any sentence on a posted note to strike it through without opening the editor
- **Photo pins** -- pin images and GIFs to your desktop in a Polaroid-style frame with editable captions and a rotation slider
- **8 themes** -- yellow, blue, green, pink, purple, white, dark, and orange
- **Tags and search** -- tag notes and filter or search across all of them
- **Multi-monitor aware** -- new notes and pins spawn on whichever monitor your cursor is on
- **Auto-start on login** -- notes and photos are restored to the desktop automatically on Windows startup
- **Export** -- export all notes as JSON or Markdown from the system tray
- **Backup and recovery** -- a rotating backup is kept; if the data file is corrupted the app recovers from it automatically

---

## Tech stack

| Layer | Choice |
|---|---|
| Framework | Electron 32 |
| UI | React 18, TypeScript, Tailwind CSS v3 |
| Editor | Slate (slate-react, slate-history) |
| State | Zustand + Immer |
| Persistence | Custom JSON via Node `fs` |
| Packaging | electron-builder (NSIS installer for Windows) |
| Win32 FFI | koffi calling user32.dll for desktop z-order |

---

## Getting started (development)

**Prerequisites:** Node.js 20+, Windows (the Win32 desktop layering is Windows-only; the rest builds on macOS and Linux too)

```bash
git clone https://github.com/AkellaGitbook/note-pins.git
cd note-pins
npm install
npm run dev
```

`npm run dev` starts Electron with hot reload via electron-vite.

---

## Build

```bash
# Compile only (updates out/ -- does not produce an installer)
npm run build

# Full build + NSIS installer -> dist/Note Pins Setup 1.0.0.exe
npm run make
```

> **Windows note:** `npm run make` requires **Developer Mode** to be on (Settings > System > For developers). Skip code signing with:
> ```powershell
> $env:CSC_IDENTITY_AUTO_DISCOVERY="false"; npm run make
> ```

---

## Tests

```bash
npm test
```

Runs 16 Vitest unit tests against the database layer (`src/main/db.test.ts`) using a real filesystem and a mocked Electron module.

---

## Data location (Windows)

```
%APPDATA%\Note Pins\sticky-notes.json
%APPDATA%\Note Pins\sticky-notes.json.bak
%APPDATA%\Note Pins\images\
```

---

## License

MIT
