# MCP Session Notes — For Future Claude Sessions

This file captures everything built, broken, and fixed so a future Claude session can pick up without re-discovering the same issues.

---

## What Was Built

A local MCP (Model Context Protocol) server that lets Claude control the Note Pins app — create notes, post them to the desktop, strike through sentences, manage photo pins, etc. The whole thing has two parts:

1. **HTTP Bridge** (`src/main/http-bridge.ts`) — runs inside Electron on `127.0.0.1:47890`. Claude can't talk to Electron directly, so this bridge exposes a REST API that the MCP server calls.

2. **MCP Server** (`mcp-server/`) — a separate Node.js process. In stdio mode it talks directly to Claude Desktop. In HTTP mode it listens on port 3001 and Claude.ai connects via ngrok.

All three — the HTTP bridge, the MCP HTTP server, and the ngrok tunnel — auto-start when Note Pins launches. No manual setup, no separate terminal.

---

## Architecture

```
Claude Desktop (stdio)          Claude.ai (via ngrok)
       │                                │
       │                    https://lather-ninth-kleenex.ngrok-free.dev
       │                                │  ↑ auto-spawned by Electron
       └──────────────┬─────────────────┘  ($LOCALAPPDATA\ngrok\ngrok.exe)
                      │
              mcp-server/dist/server.js   ← auto-spawned by Electron
              (port 3001 in HTTP mode)
                      │
                 HTTP fetch
                      │
              127.0.0.1:47890  ← Electron HTTP bridge (also auto-spawned)
                      │
              db.ts + FloatingWindowManager + FloatingPhotoManager
```

All three processes start automatically inside `startBridge()` in `src/main/http-bridge.ts` when Note Pins launches. They are all killed in `stopBridge()` when the app quits.

---

## The 10 MCP Tools

| Tool | What it does |
|---|---|
| `list_pins` | Lists all notes and photo pins |
| `get_pin` | Gets full details for one note/photo |
| `post_note` | Creates a new note and pins it to the desktop |
| `post_picture` | Posts an image as a Polaroid pin (path, URL, or base64) |
| `post_to_desktop` | Takes an existing draft and puts it on the desktop |
| `move_pin_to_app` | Pulls a desktop pin back into the app as a draft |
| `edit_note` | Edits the text or title of a note |
| `edit_picture` | Swaps the image on a photo pin |
| `strikethrough_sentence` | Toggles strikethrough on a sentence in a note |
| `delete_pin_permanently` | Deletes a note or photo (requires typing "DELETE" to confirm) |

---

## Key Technical Findings

### SDK v1.29 Stateless Transport Bug
`@modelcontextprotocol/sdk` v1.29.0 changed the `StreamableHTTPServerTransport` so that a stateless transport (no `sessionIdGenerator`) **cannot be reused across requests**. Reusing it throws:
> "Stateless transport cannot be reused across requests. Create a new transport per request."

**Fix:** The `buildMcpServer()` factory function in `server.ts` creates a fresh `McpServer` + `StreamableHTTPServerTransport` per HTTP request. The tool implementations are defined inside the factory so each new server gets a full set of tools.

This is the correct pattern for stateless HTTP mode in SDK v1.29+. Do NOT go back to a single shared transport.

### Don't Pre-Read the Request Body
Earlier versions of the SDK let you read the body yourself and pass it as `parsedBody`. In v1.29, the SDK uses Hono internally and takes over body reading. Pre-consuming the stream with a custom `readBody()` caused 500 errors. Fix: just call `transport.handleRequest(req, res)` with no third argument and let the SDK read the body.

### ngrok Tunnel — now auto-starts with the app
The free ngrok account has a static domain: `lather-ninth-kleenex.ngrok-free.dev`.  
The Claude.ai connector URL is: `https://lather-ninth-kleenex.ngrok-free.dev/mcp`

ngrok is now spawned automatically by Electron in `startBridge()`. No terminal needed. The ngrok binary lives at:
```
C:\Users\shanm\AppData\Local\ngrok\ngrok.exe   (v3.39.1)
```
The winget-installed ngrok at `C:\Program Files\ngrok\ngrok.exe` is too old (v3.3.x) — do not use it. If ngrok ever needs reinstalling, download from `bin.equinox.io` directly and put it in `%LOCALAPPDATA%\ngrok\`.

The spawn call uses the static domain flag so the URL never changes:
```typescript
spawn(ngrokPath, ['http', '3001', '--domain=lather-ninth-kleenex.ngrok-free.dev'])
```

ngrok reads the authtoken from its own config file (`%LOCALAPPDATA%\ngrok\ngrok.yml`) which was set up earlier. If the token is ever lost, run `ngrok authtoken <token>` once to restore it.

### localhost vs 127.0.0.1
On this machine, ngrok forwards to `localhost:3001` which may resolve to IPv6 `::1`. The MCP server only binds to `127.0.0.1` (IPv4). This caused 500s through ngrok. Fixed in the current setup (no action needed — just a note for future debugging).

### MCP Server Path in Packaged App
When Note Pins is packaged via `npm run make`, the MCP server files go into `resources/mcp-server/` (via `extraResources` in `electron-builder.config.ts`). The bridge resolves the path like this:
```typescript
const mcpServerPath = app.isPackaged
  ? join(process.resourcesPath, 'mcp-server', 'dist', 'server.js')
  : join(app.getAppPath(), 'mcp-server', 'dist', 'server.js')
```

### Claude Desktop Config Location
```
C:\Users\shanm\AppData\Roaming\Claude\claude_desktop_config.json
```
Uses stdio transport, points to the dev build path. Friends who install via Setup.exe need to change the path to:
```
C:\Users\<username>\AppData\Local\Programs\Note Pins\resources\mcp-server\dist\server.js
```

---

## Files Changed This Session

| File | Change |
|---|---|
| `src/main/db.ts` | Default `fontFamily` changed from `Inter, sans-serif` to `Comic Sans MS, cursive` |
| `src/main/http-bridge.ts` | Added `handlePostPinToDesktop` + `POST /pins/:id/post` route; MCP server auto-spawn on startup; ngrok auto-spawn on startup |
| `mcp-server/src/server.ts` | Refactored to `buildMcpServer()` factory (per-request for HTTP); added `post_to_desktop` tool; added `source_type: "url"` to `post_picture` and `edit_picture` |
| `mcp-server/src/bridge-client.ts` | Added `postPinToDesktop(id)` |
| `mcp-server/src/temp-utils.ts` | Added `downloadToTempFile(url)` with redirect following and content-type detection |
| `electron-builder.config.ts` | Added `extraResources` to bundle `mcp-server/dist` and `mcp-server/node_modules` into the packaged exe |

---

## Build Steps (always do these in order)

```powershell
# 1. Build MCP server after any changes to mcp-server/src/
cd mcp-server && npm run build && cd ..

# 2. Build main app
npm run build

# 3. Package into exe (kill app first)
Stop-Process -Name "Note Pins" -Force -ErrorAction SilentlyContinue
$env:CSC_IDENTITY_AUTO_DISCOVERY="false"; npm run make
```

---

## Things Not Done / Future Ideas

- **Friend-friendly MCP setup**: Currently requires Node.js + manual config file editing. Could potentially bundle a small installer script.
- **Image generation support**: `post_picture` now supports URLs (useful when Claude finds or generates an image URL), but Claude.ai doesn't natively generate images so this is limited.
- **Rich text via MCP**: `edit_note` converts plain text to paragraphs only. Raw Slate JSON is supported by the bridge (`slateContent` field) but not exposed as an MCP tool.
