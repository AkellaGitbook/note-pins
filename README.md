# Note Pins

A sticky notes app for Windows that actually does what I want.

I built this because the built-in Windows 11 sticky notes are too basic and I wanted something I could actually control with Claude. So I made my own — and then I added an MCP server so Claude can create, edit, and manage notes and photos directly on my desktop.

---

## What it does

- Sticky notes that float on your desktop, always behind other windows so they don't get in the way
- Rich text editor — bold, italic, lists, headings
- Click any sentence to strike it through (great for checklists)
- Photo pins — drop an image on your desktop in a Polaroid-style frame
- Everything syncs automatically, survives restarts, and auto-opens when Windows starts
- System tray icon so it's always accessible without cluttering the taskbar

---

## The MCP part

This is the part I'm actually proud of. I wrote a local MCP (Model Context Protocol) server that lets Claude talk directly to the app. You can tell Claude things like:

- "Post a note on my desktop that says buy milk"
- "Strike through the second sentence in my shopping list"
- "Post this image as a photo pin"
- "Move all my draft notes to the desktop"

It works with both Claude Desktop (runs locally, no internet needed) and Claude.ai (via ngrok tunnel).

The way it works: the app runs a tiny HTTP server on localhost that Claude's MCP server talks to. Claude sends a tool call → MCP server hits the local API → Electron opens/closes/edits windows in real time. The MCP server bundles inside the app so nothing extra needs to be installed. The ngrok tunnel also starts automatically with the app so the Claude.ai connector is always live without needing a separate terminal.

**Tools Claude has access to:**

| Tool | What it does |
|---|---|
| `list_pins` | See all your notes and photos |
| `get_pin` | Get full details on one note |
| `post_note` | Create a note and stick it on the desktop |
| `post_picture` | Pin an image to the desktop (supports file paths, URLs, or base64) |
| `post_to_desktop` | Take a draft from the app and put it on the desktop |
| `move_pin_to_app` | Pull a desktop pin back into the app |
| `edit_note` | Change the text or title of a note |
| `edit_picture` | Swap the image on a photo pin |
| `strikethrough_sentence` | Toggle strikethrough on a specific sentence |
| `delete_pin_permanently` | Delete a note or photo (asks you to type DELETE to confirm) |

---

## Stack

Built with Electron + React + TypeScript. Notes are stored as plain JSON in your AppData folder so there's no database, no cloud sync, no account needed. The MCP server is a separate Node.js process that the app spawns automatically.

- **Electron + electron-vite** — app shell
- **React 18 + Tailwind** — UI
- **Slate** — rich text editor
- **Zustand** — state management
- **@modelcontextprotocol/sdk** — MCP server
- **koffi** — Win32 API calls for keeping notes behind other windows

---

## Running it yourself

```bash
npm install
npm run dev        # dev mode with hot reload
npm run make       # build the installer
```

The MCP server lives in `mcp-server/` and needs its own build:

```bash
cd mcp-server
npm install
npm run build
```

Claude Desktop is configured automatically — Note Pins writes the MCP entry to Claude Desktop's config on every startup. Just launch Note Pins, then restart Claude Desktop once. No manual config editing needed.

---

## Why I built this

Mostly because I wanted to see if I could make something that actually works with Claude in a useful way, not just a demo. The MCP integration means Claude can manage my desktop notes without me switching windows — I just describe what I want and it happens.

The hardest parts were getting Electron windows to always stay behind other apps on Windows (had to call Win32 APIs directly with koffi), figuring out the MCP SDK's stateless HTTP transport (changed significantly in v1.29, requires a fresh server instance per request), and getting the full Claude.ai integration to work without any manual steps — the app now auto-starts the bridge, the MCP server, and the ngrok tunnel all at once when it launches.
