# Note Pins MCP Server

A local MCP server that lets Claude interact with the **Note Pins** desktop app via 9 safe, scoped tools.

## Architecture

```
Claude (Desktop or Code CLI)
  └── spawns: node dist/server.js  (stdio MCP server)
                └── HTTP → 127.0.0.1:47890  (bridge inside running Electron app)
                              └── calls db + FloatingWindowManager directly
```

**The Note Pins app must be running before using any MCP tools.** The HTTP bridge starts automatically when the app starts.

---

## Setup

### 1. Build (one-time, re-run after code changes)

```powershell
cd "C:\Users\shanm\OneDrive\Desktop\Sticky Note Desktop\mcp-server"
npm install
npm run build
```

### 2a. Claude Desktop config

Location: `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "note-pins": {
      "command": "C:\\Program Files\\nodejs\\node.exe",
      "args": [
        "C:\\Users\\shanm\\OneDrive\\Desktop\\Sticky Note Desktop\\mcp-server\\dist\\server.js"
      ],
      "env": {
        "NOTE_PINS_BRIDGE_PORT": "47890"
      }
    }
  }
}
```

Fully quit and restart Claude Desktop after editing this file.

### 2b. Claude Code CLI

Run once to register:

```powershell
claude mcp add note-pins `
  -e NOTE_PINS_BRIDGE_PORT=47890 `
  -- "C:\Program Files\nodejs\node.exe" `
  "C:\Users\shanm\OneDrive\Desktop\Sticky Note Desktop\mcp-server\dist\server.js"
```

### 3. Test with MCP Inspector

```powershell
cd "C:\Users\shanm\OneDrive\Desktop\Sticky Note Desktop\mcp-server"
npx @modelcontextprotocol/inspector node dist/server.js
```

Opens a browser UI at `localhost:6274`. Call `list_pins` first to verify the bridge is reachable.

---

## Tools Reference

### `list_pins`
Returns all sticky notes and photo pins with a 100-character preview.

**Inputs:** none  
**Output:** `{ notes: [...], photos: [...], total: N }`

---

### `get_pin`
Returns full details for one note or photo pin.

**Inputs:**
- `id` — UUID of the note or photo pin

---

### `move_pin_to_app`
Moves a posted desktop pin back to draft in the main app. Closes its floating window.

**Inputs:**
- `id` — UUID of the posted note or photo pin

---

### `post_note`
Creates a new sticky note and posts it to the desktop immediately.

**Inputs:**
- `text` — Plain text content (newlines create separate paragraphs)
- `title` — *(optional)* Title
- `theme` — *(optional)* `yellow | blue | green | pink | purple | white | dark | orange`

---

### `post_picture`
Adds an image and posts it as a Polaroid-style picture pin on the desktop.

**Inputs:**
- `source` — Absolute file path OR base64-encoded image data
- `source_type` — `"path"` or `"base64"`
- `title` — *(optional)*
- `caption` — *(optional)* Text shown below the image

**Supported formats:** jpg, jpeg, png, gif, bmp, webp

---

### `edit_note`
Edits the text content and/or title of an existing sticky note. Updates the floating window live if the note is posted.

**Inputs:**
- `id` — UUID of the note
- `text` — *(optional)* New plain-text content
- `title` — *(optional)* New title

At least one of `text` or `title` is required.

---

### `edit_picture`
Replaces the image of an existing photo pin. Preserves metadata; deletes the old image file.

**Inputs:**
- `id` — UUID of the photo pin
- `source` — Absolute file path OR base64-encoded image data
- `source_type` — `"path"` or `"base64"`

---

### `strikethrough_sentence`
Toggles strikethrough on a sentence in a sticky note using the app's native `struckKeys` format (position-based keys, not text matching). Updates the floating window live.

**Inputs:**
- `id` — UUID of the note
- `sentence_text` — Exact text of the sentence (including punctuation, case-sensitive)

If the sentence is not found, returns the list of all sentences in the note.

**Note:** A sentence boundary is defined as: a period followed by whitespace followed by an uppercase letter (e.g. "First sentence. Second sentence." splits into two). Abbreviations like "Dr. Smith" are not split because they are not followed by an uppercase letter at the start of a new sentence.

---

### `delete_pin_permanently`
Permanently deletes a note or photo pin (and its image file).

**Inputs:**
- `id` — UUID of the note or photo pin
- `confirm` — Must be the exact string `"DELETE"` (case-sensitive)

Returns a summary of exactly what was deleted.

---

## Safety Notes

- The HTTP bridge binds to `127.0.0.1` only — not accessible from the network
- No arbitrary shell execution or file system access is exposed
- All image operations use allowlisted extensions only
- Deletion requires explicit `"DELETE"` confirmation
- The bridge is started/stopped with the Electron app process
- Port 47890 can be changed via the `NOTE_PINS_BRIDGE_PORT` environment variable

## Features Not Exposed

- **Rich text formatting** (bold, italic, headings, lists) — the `edit_note` tool converts plain text to paragraphs only. To preserve Slate formatting, the `slateContent` field in the bridge API accepts raw Slate JSON, but this is not surfaced as an MCP tool to avoid exposing complex format requirements.
- **Note styling** (font, border radius, shadow, opacity) — beyond `theme`, these require deep knowledge of the data model and are not commonly needed via Claude.
- **Hiding notes** — the `hidden` status is an internal state not exposed via MCP.
- **Lock/unlock and always-on-top** — managed via the app's right-click context menu.
