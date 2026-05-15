# Note Pins MCP Server

A local MCP server that lets Claude interact with the **Note Pins** desktop app via 11 tools.

## Architecture

```
Claude.ai web (connector)          Claude Desktop (stdio)
        │                                  │
        │  https://lather-ninth-kleenex.ngrok-free.dev/mcp
        │                    │
        │               ngrok.exe  ← auto-spawned by Electron
        └───────────────┬───┘
                        │
              mcp-server/dist/server.js  ← auto-spawned by Electron
              (port 3001 in HTTP mode)
                        │
              127.0.0.1:47890  ← Electron HTTP bridge
                        │
              db.ts + FloatingWindowManager + FloatingPhotoManager
```

**Note Pins must be running before using any MCP tools.** Everything auto-starts when the app launches — no manual setup.

---

## Setup for Claude.ai

Add this connector URL in Claude.ai → Settings → Connectors:
```
https://lather-ninth-kleenex.ngrok-free.dev/mcp
```

## Setup for Claude Code CLI

```powershell
claude mcp add note-pins `
  -e NOTE_PINS_BRIDGE_PORT=47890 `
  -- node `
  "C:\Users\shanm\OneDrive\Desktop\Sticky Note Desktop\mcp-server\dist\server.js"
```

## Build (after code changes)

```powershell
cd mcp-server
npm run build
```

Then rebuild the installer from the project root:
```powershell
Stop-Process -Name "Note Pins" -Force -ErrorAction SilentlyContinue
$env:CSC_IDENTITY_AUTO_DISCOVERY="false"; npm run make
```

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
- `id` — UUID

---

### `post_note`
Creates a new sticky note and posts it to the desktop immediately.

**Inputs:**
- `text` — Plain text (newlines become paragraphs)
- `title` — *(optional)*
- `theme` — *(optional)* `yellow | blue | green | pink | purple | white | dark | orange`

---

### `post_picture`
Adds an image and posts it as a Polaroid-style pin on the desktop.

**Inputs:**
- `source` — Absolute file path, `http/https` URL, or base64-encoded image data
- `source_type` — `"path"` | `"url"` | `"base64"`
- `title` — *(optional)*
- `caption` — *(optional)*

**Supported formats:** jpg, jpeg, png, gif, bmp, webp

---

### `post_clipboard_image`
Posts the image currently in the clipboard as a photo pin. Use when the user pastes an image into the chat.

**Inputs:**
- `title` — *(optional)*
- `caption` — *(optional)*

---

### `post_to_desktop`
Takes an existing draft note or photo pin and puts it on the desktop.

**Inputs:**
- `id` — UUID of the draft

---

### `move_pin_to_app`
Pulls a posted desktop pin back into the app as a draft.

**Inputs:**
- `id` — UUID of the posted pin

---

### `edit_note`
Edits the text or title of an existing note. Updates the floating window live.

**Inputs:**
- `id` — UUID
- `text` — *(optional)* New plain-text content
- `title` — *(optional)* New title

At least one of `text` or `title` is required.

---

### `edit_picture`
Replaces the image on a photo pin. Deletes the old image file.

**Inputs:**
- `id` — UUID
- `source` — Absolute file path, URL, or base64
- `source_type` — `"path"` | `"url"` | `"base64"`

---

### `strikethrough_sentence`
Toggles strikethrough on a sentence in a sticky note.

**Inputs:**
- `id` — UUID
- `sentence_text` — Exact text of the sentence (case-sensitive, include punctuation)

Returns the list of all sentences in the note if the text isn't found.

**Sentence boundary:** period + whitespace + uppercase letter. `"Dr. Smith"` is not split.

---

### `delete_pin_permanently`
Permanently deletes a note or photo pin (and its image file).

**Inputs:**
- `id` — UUID
- `confirm` — Must be exactly `"DELETE"` (case-sensitive)

---

## Technical Notes

- **SDK v1.29 stateless transport**: `buildMcpServer()` factory creates a fresh `McpServer` + `StreamableHTTPServerTransport` per HTTP request. Do not share the transport across requests.
- **RunAsNode fuse**: The packaged `Note Pins.exe` has `FuseV1Options.RunAsNode` enabled via `@electron/fuses` in `afterPack.js`. This is required for `ELECTRON_RUN_AS_NODE=1` to work in Electron 32+.
- **Bridge port**: Default `47890`. Override with `NOTE_PINS_BRIDGE_PORT` env var.
