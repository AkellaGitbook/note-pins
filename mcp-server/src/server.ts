import { createServer, IncomingMessage, ServerResponse } from 'http'
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { z } from 'zod'
import * as bridge from './bridge-client'
import { isNote } from './types'
import {
  slateToPlainText,
  findSentenceKey,
  toggleStruckKey,
} from './slate-utils'
import {
  detectImageExtension,
  isAllowedExtension,
  base64ToTempFile,
  cleanupTempFile,
  downloadToTempFile,
} from './temp-utils'
import { extname } from 'path'

const MCP_PORT = parseInt(process.env['NOTE_PINS_MCP_PORT'] ?? '3001', 10)

// ── Shared helpers ────────────────────────────────────────────────────────────

function callError(e: unknown): string {
  return e instanceof Error ? e.message : String(e)
}

function notePreview(content: string): string {
  const text = slateToPlainText(content)
  return text.length > 100 ? text.slice(0, 97) + '…' : text
}

const VALID_THEMES = ['yellow', 'blue', 'green', 'pink', 'purple', 'white', 'dark', 'orange'] as const

// ── Tool registration factory ─────────────────────────────────────────────────
// Called once for stdio; called per-request for HTTP (SDK v1.29+ stateless requirement)

function buildMcpServer(): McpServer {
  const server = new McpServer({ name: 'note-pins', version: '1.0.0' })

  server.tool('list_pins', 'List all sticky notes and photo pins', {}, async () => {
    let data: Awaited<ReturnType<typeof bridge.listPins>>
    try { data = await bridge.listPins() }
    catch (e) { return { content: [{ type: 'text', text: callError(e) }], isError: true } }

    const notes = data.notes.map((n) => ({
      type: 'note', id: n.id, title: n.title, status: n.status,
      tags: n.tags, preview: notePreview(n.content),
      createdAt: n.createdAt, updatedAt: n.updatedAt,
    }))
    const photos = data.photoPins.map((p) => ({
      type: 'photo', id: p.id, title: p.title, caption: p.caption,
      status: p.status, imagePath: p.imagePath,
      createdAt: p.createdAt, updatedAt: p.updatedAt,
    }))
    return { content: [{ type: 'text', text: JSON.stringify({ notes, photos, total: notes.length + photos.length }, null, 2) }] }
  })

  server.tool('get_pin', 'Get full details for one sticky note or photo pin',
    { id: z.string().describe('UUID of the note or photo pin') },
    async ({ id }) => {
      try {
        const pin = await bridge.getPin(id)
        if (!pin) return { content: [{ type: 'text', text: `No pin found with id "${id}"` }], isError: true }
        return { content: [{ type: 'text', text: JSON.stringify(pin, null, 2) }] }
      } catch (e) { return { content: [{ type: 'text', text: callError(e) }], isError: true } }
    }
  )

  server.tool('move_pin_to_app', 'Move a posted desktop pin back into the main app',
    { id: z.string().describe('UUID of the posted note or photo pin') },
    async ({ id }) => {
      try {
        const updated = await bridge.movePinBack(id)
        return { content: [{ type: 'text', text: `Pin moved back to app.\n${JSON.stringify(updated, null, 2)}` }] }
      } catch (e) { return { content: [{ type: 'text', text: callError(e) }], isError: true } }
    }
  )

  server.tool('post_to_desktop', 'Post an existing draft note or photo pin to the desktop',
    { id: z.string().describe('UUID of the draft note or photo pin') },
    async ({ id }) => {
      try {
        const updated = await bridge.postPinToDesktop(id)
        return { content: [{ type: 'text', text: `Pin posted to desktop.\n${JSON.stringify(updated, null, 2)}` }] }
      } catch (e) { return { content: [{ type: 'text', text: callError(e) }], isError: true } }
    }
  )

  server.tool('post_note', 'Create a new sticky note and post it to the desktop',
    {
      text: z.string().describe('Text content (plain text, newlines become paragraphs)'),
      title: z.string().optional().describe('Optional title'),
      theme: z.enum(VALID_THEMES).optional().describe('Color theme: yellow, blue, green, pink, purple, white, dark, orange'),
    },
    async ({ text, title, theme }) => {
      if (!text.trim()) return { content: [{ type: 'text', text: 'text must not be empty' }], isError: true }
      try {
        const note = await bridge.createAndPostNote({ content: text, title, theme })
        return { content: [{ type: 'text', text: `Note posted to desktop.\n${JSON.stringify(note, null, 2)}` }] }
      } catch (e) { return { content: [{ type: 'text', text: callError(e) }], isError: true } }
    }
  )

  server.tool('post_picture', 'Add an image and post it as a Polaroid-style picture pin on the desktop',
    {
      source: z.string().describe('Absolute file path, http/https URL, or base64-encoded image data'),
      source_type: z.enum(['path', 'url', 'base64']).describe('"path" for a local file path, "url" for an http/https image URL, "base64" for base64 data'),
      title: z.string().optional(),
      caption: z.string().optional().describe('Caption shown below the image'),
    },
    async ({ source, source_type, title, caption }) => {
      let sourcePath = source
      let tempPath: string | null = null
      try {
        if (source_type === 'base64') {
          const ext = detectImageExtension(source)
          if (!isAllowedExtension(ext)) return { content: [{ type: 'text', text: 'Unsupported image format. Supported: jpg, jpeg, png, gif, bmp, webp' }], isError: true }
          tempPath = await base64ToTempFile(source, ext)
          sourcePath = tempPath
        } else if (source_type === 'url') {
          tempPath = await downloadToTempFile(source)
          sourcePath = tempPath
        } else {
          const ext = extname(source).toLowerCase()
          if (!isAllowedExtension(ext)) return { content: [{ type: 'text', text: `Unsupported image format "${ext}". Supported: jpg, jpeg, png, gif, bmp, webp` }], isError: true }
        }
        const pin = await bridge.createAndPostPhotoPin({ sourcePath, title, caption })
        return { content: [{ type: 'text', text: `Photo pin posted to desktop.\n${JSON.stringify(pin, null, 2)}` }] }
      } catch (e) {
        return { content: [{ type: 'text', text: callError(e) }], isError: true }
      } finally {
        if (tempPath) await cleanupTempFile(tempPath)
      }
    }
  )

  server.tool('post_clipboard_image', 'Post the image currently in the clipboard as a photo pin on the desktop. Use this when the user pastes an image into the chat.',
    {
      title: z.string().optional().describe('Optional title for the photo pin'),
      caption: z.string().optional().describe('Optional caption shown below the image'),
    },
    async ({ title, caption }) => {
      try {
        const pin = await bridge.postClipboardImage({ title, caption })
        return { content: [{ type: 'text', text: `Photo pin posted from clipboard.\n${JSON.stringify(pin, null, 2)}` }] }
      } catch (e) { return { content: [{ type: 'text', text: callError(e) }], isError: true } }
    }
  )

  server.tool('edit_note', 'Edit the text content and/or title of an existing sticky note',
    {
      id: z.string().describe('UUID of the note to edit'),
      text: z.string().optional().describe('New plain-text content'),
      title: z.string().optional().describe('New title'),
    },
    async ({ id, text, title }) => {
      if (!text && !title) return { content: [{ type: 'text', text: 'Provide at least text or title' }], isError: true }
      try {
        const pin = await bridge.getPin(id)
        if (!pin) return { content: [{ type: 'text', text: `No pin found with id "${id}"` }], isError: true }
        if (!isNote(pin)) return { content: [{ type: 'text', text: 'That id belongs to a photo pin, not a note.' }], isError: true }
        const updated = await bridge.updateNoteContent(id, { content: text, title })
        return { content: [{ type: 'text', text: `Note updated.\n${JSON.stringify(updated, null, 2)}` }] }
      } catch (e) { return { content: [{ type: 'text', text: callError(e) }], isError: true } }
    }
  )

  server.tool('edit_picture', 'Replace the image of an existing photo pin',
    {
      id: z.string().describe('UUID of the photo pin to update'),
      source: z.string().describe('Absolute file path, http/https URL, or base64-encoded image data'),
      source_type: z.enum(['path', 'url', 'base64']),
    },
    async ({ id, source, source_type }) => {
      let sourcePath = source
      let tempPath: string | null = null
      try {
        if (source_type === 'base64') {
          const ext = detectImageExtension(source)
          if (!isAllowedExtension(ext)) return { content: [{ type: 'text', text: 'Unsupported image format. Supported: jpg, jpeg, png, gif, bmp, webp' }], isError: true }
          tempPath = await base64ToTempFile(source, ext)
          sourcePath = tempPath
        } else if (source_type === 'url') {
          tempPath = await downloadToTempFile(source)
          sourcePath = tempPath
        } else {
          const ext = extname(source).toLowerCase()
          if (!isAllowedExtension(ext)) return { content: [{ type: 'text', text: `Unsupported image format "${ext}".` }], isError: true }
        }
        const updated = await bridge.replacePhotoPinImage(id, sourcePath)
        return { content: [{ type: 'text', text: `Photo pin image updated.\n${JSON.stringify(updated, null, 2)}` }] }
      } catch (e) {
        return { content: [{ type: 'text', text: callError(e) }], isError: true }
      } finally {
        if (tempPath) await cleanupTempFile(tempPath)
      }
    }
  )

  server.tool('strikethrough_sentence', "Toggle strikethrough on a sentence in a sticky note",
    {
      id: z.string().describe('UUID of the note'),
      sentence_text: z.string().describe('Exact text of the sentence to toggle (case-sensitive, include punctuation)'),
    },
    async ({ id, sentence_text }) => {
      try {
        const pin = await bridge.getPin(id)
        if (!pin) return { content: [{ type: 'text', text: `No pin found with id "${id}"` }], isError: true }
        if (!isNote(pin)) return { content: [{ type: 'text', text: 'That id belongs to a photo pin, not a note.' }], isError: true }

        const result = findSentenceKey(pin.content, sentence_text)
        if (!result.found) {
          const list = result.allSentences.map((s) => `  • ${s}`).join('\n')
          return { content: [{ type: 'text', text: `Sentence not found. Provide exact text including punctuation.\n\nSentences in this note:\n${list || '  (none)'}` }], isError: true }
        }

        const newKeys = toggleStruckKey(pin.struckKeys ?? [], result.key)
        await bridge.updateNoteStruckKeys(id, newKeys)
        const struck = newKeys.includes(result.key)
        return { content: [{ type: 'text', text: `"${sentence_text}" is now ${struck ? 'struck through' : 'un-struck'}.` }] }
      } catch (e) { return { content: [{ type: 'text', text: callError(e) }], isError: true } }
    }
  )

  server.tool('delete_pin_permanently', 'Permanently delete a sticky note or photo pin',
    {
      id: z.string().describe('UUID of the note or photo pin'),
      confirm: z.string().describe('Must be exactly "DELETE" (case-sensitive) to confirm'),
    },
    async ({ id, confirm }) => {
      if (confirm !== 'DELETE') return { content: [{ type: 'text', text: `confirm must be "DELETE". Got "${confirm}".` }], isError: true }
      try {
        const pin = await bridge.getPin(id)
        if (!pin) return { content: [{ type: 'text', text: `No pin found with id "${id}"` }], isError: true }
        const summary = { type: pin._type, id: pin.id, title: pin.title }
        await bridge.deletePin(id)
        return { content: [{ type: 'text', text: `Deleted permanently:\n${JSON.stringify(summary, null, 2)}` }] }
      } catch (e) { return { content: [{ type: 'text', text: callError(e) }], isError: true } }
    }
  )

  return server
}

// ── Transport: stdio (Claude Desktop) or HTTP (ngrok / Claude.ai) ─────────────

const useHttp = process.env['NOTE_PINS_HTTP_MODE'] === '1'

;(async () => {
  if (useHttp) {
    const CORS_HEADERS: Record<string, string> = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Accept, Authorization, Mcp-Session-Id',
    }

    const httpServer = createServer(async (req: IncomingMessage, res: ServerResponse) => {
      for (const [k, v] of Object.entries(CORS_HEADERS)) res.setHeader(k, v)
      if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return }

      const url = new URL(req.url ?? '/', `http://localhost`)
      if (url.pathname !== '/mcp') {
        res.writeHead(404, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ error: 'Use /mcp' })); return
      }

      // Browser GET — return a friendly status page instead of an MCP protocol error
      if (req.method === 'GET' && !req.headers['accept']?.includes('text/event-stream')) {
        res.writeHead(200, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ status: 'Note Pins MCP server is running', endpoint: 'POST http://127.0.0.1:3001/mcp' }))
        return
      }

      // SDK v1.29+: stateless transport cannot be reused — create fresh per request
      const mcpServer = buildMcpServer()
      const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined })
      await mcpServer.connect(transport)

      try {
        await transport.handleRequest(req, res)
      } catch (e) {
        if (!res.headersSent) {
          res.writeHead(500, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify({ error: String(e) }))
        }
      }
    })

    httpServer.listen(MCP_PORT, '127.0.0.1', () => {
      process.stderr.write(`[note-pins-mcp] HTTP listening on http://127.0.0.1:${MCP_PORT}/mcp\n`)
    })
    process.on('SIGTERM', () => { httpServer.close(); process.exit(0) })
    process.on('SIGINT',  () => { httpServer.close(); process.exit(0) })
  } else {
    // stdio — spawned on demand by Claude Desktop (or Claude Code CLI)
    const mcpServer = buildMcpServer()
    const transport = new StdioServerTransport()
    await mcpServer.connect(transport)
  }
})()
