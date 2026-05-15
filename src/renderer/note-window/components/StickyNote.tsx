import { useRef, useMemo, type CSSProperties } from 'react'
import { createEditor, Descendant } from 'slate'
import { Slate, Editable, withReact } from 'slate-react'
import { withHistory } from 'slate-history'
import type { Note } from '../../../shared/types'
import { getTheme } from '../../../shared/themes'
import { NoteContentRenderer } from './NoteContent'
import { useNoteWindowStore } from '../store/useNoteWindowStore'
import '../../slate-types'

type SlateNode = {
  type?: string
  text?: string
  children?: SlateNode[]
}

const EMPTY_CONTENT: Descendant[] = [{ type: 'paragraph', children: [{ text: '' }] }]

function parseContent(raw: string): Descendant[] {
  try {
    const v = JSON.parse(raw)
    return Array.isArray(v) && v.length > 0 ? v : EMPTY_CONTENT
  } catch {
    return EMPTY_CONTENT
  }
}

function splitSentences(text: string): string[] {
  return text.split(/(?<=\.)\s+(?=[A-Z])/).filter(s => s.length > 0)
}

function eraseSentenceFromContent(content: string, key: string): string {
  const [targetBlockIdx, targetLeafIdx, targetSentIdx] = key.split(':').map(Number)
  let nodes: SlateNode[]
  try {
    nodes = JSON.parse(content)
    if (!Array.isArray(nodes)) return content
  } catch { return content }

  const newNodes: SlateNode[] = JSON.parse(JSON.stringify(nodes))

  function processNode(node: SlateNode, blockIdx: number, leafIdx: number): boolean {
    if (node.text !== undefined) {
      if (blockIdx === targetBlockIdx && leafIdx === targetLeafIdx) {
        const parts = splitSentences(node.text)
        parts.splice(targetSentIdx, 1)
        node.text = parts.join(' ')
        return true
      }
      return false
    }
    for (let i = 0; i < (node.children?.length ?? 0); i++) {
      if (processNode(node.children![i], blockIdx, i)) return true
    }
    return false
  }

  for (let i = 0; i < newNodes.length; i++) {
    processNode(newNodes[i], i, 0)
  }
  return JSON.stringify(newNodes)
}

function getShadow(level: number): string {
  const shadows = [
    'none',
    '0 2px 8px rgba(0,0,0,0.12)',
    '0 4px 16px rgba(0,0,0,0.16)',
    '0 8px 28px rgba(0,0,0,0.20)',
    '0 16px 48px rgba(0,0,0,0.26)',
  ]
  return shadows[Math.min(level, 4)]
}

type AppRegionStyle = CSSProperties & { WebkitAppRegion?: 'drag' | 'no-drag' }

type Props = { note: Note }

export function StickyNote({ note }: Props) {
  const theme = getTheme(note.theme)
  const { isEditing } = useNoteWindowStore()

  const titleDebounce = useRef<ReturnType<typeof setTimeout> | null>(null)
  const contentDebounce = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Slate editor instance — stable across re-renders, remounted via key when editing starts
  const editor = useMemo(() => withHistory(withReact(createEditor())), [note.id, isEditing])
  const initialValue = useMemo(() => parseContent(note.content), [note.id, isEditing])

  const handleSentenceClick = async (key: string) => {
    const current = note.struckKeys ?? []
    if (current.includes(key)) {
      const newContent = eraseSentenceFromContent(note.content, key)
      const newStruckKeys = current.filter(k => k !== key)
      await window.floatApi.updateStyle(note.id, { content: newContent, struckKeys: newStruckKeys })
    } else {
      await window.floatApi.updateStyle(note.id, { struckKeys: [...current, key] })
    }
  }

  const shellStyle: AppRegionStyle = {
    position: 'absolute',
    inset: 0,
    backgroundColor: note.backgroundColor,
    borderRadius: note.borderRadius,
    opacity: note.opacity,
    boxShadow: getShadow(note.shadowLevel),
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
  }

  if (isEditing) {
    // In edit mode: everything is no-drag, note looks identical but content is editable
    const noDrag: AppRegionStyle = { WebkitAppRegion: 'no-drag' }

    return (
      <div className="note-paper note-fold" style={shellStyle}>
        {/* Title — editable input styled exactly like the h3 */}
        <div style={{ flexShrink: 0, padding: '8px 12px 4px', ...noDrag }}>
          <input
            autoFocus
            defaultValue={note.title}
            onChange={(e) => {
              const val = e.target.value
              if (titleDebounce.current) clearTimeout(titleDebounce.current)
              titleDebounce.current = setTimeout(() => {
                window.floatApi.updateStyle(note.id, { title: val })
              }, 400)
            }}
            style={{
              width: '100%',
              margin: 0,
              padding: 0,
              fontFamily: note.fontFamily,
              fontSize: note.titleFontSize,
              fontWeight: 700,
              color: theme.textColor,
              background: 'transparent',
              border: 'none',
              outline: 'none',
            }}
          />
        </div>

        {/* Content — Slate editable, no toolbar, styled to match read-only view */}
        <div className="note-content" style={{ flex: 1, padding: '0 12px', overflowY: 'auto', ...noDrag }}>
          <Slate
            editor={editor}
            initialValue={initialValue}
            onChange={(value) => {
              if (contentDebounce.current) clearTimeout(contentDebounce.current)
              contentDebounce.current = setTimeout(() => {
                window.floatApi.updateStyle(note.id, { content: JSON.stringify(value) })
              }, 400)
            }}
          >
            <Editable
              style={{
                fontFamily: note.fontFamily,
                fontSize: note.contentFontSize,
                fontWeight: note.fontWeight,
                lineHeight: note.lineHeight,
                textAlign: note.textAlign,
                color: theme.textColor,
                minHeight: 60,
                outline: 'none',
              }}
              placeholder="Write your note here…"
              spellCheck
            />
          </Slate>
        </div>

        {/* Tags */}
        {note.tags.length > 0 && (
          <div className="flex gap-1 flex-wrap pb-1" style={{ padding: '0 12px 8px', ...noDrag }}>
            {note.tags.slice(0, 5).map((tag) => (
              <span
                key={tag}
                className="text-xs px-1.5 py-0.5 rounded-full"
                style={{ backgroundColor: `${theme.textColor}18`, color: theme.textColor }}
              >
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>
    )
  }

  // Read-only view
  const titleBarStyle: AppRegionStyle = {
    flexShrink: 0,
    padding: '8px 12px 4px',
    cursor: note.isLocked ? 'default' : 'grab',
    WebkitAppRegion: note.isLocked ? 'no-drag' : 'drag',
  }

  const contentStyle: AppRegionStyle = {
    flex: 1,
    padding: '0 12px',
    overflowY: 'auto',
    WebkitAppRegion: 'no-drag',
  }

  const tagsStyle: AppRegionStyle = {
    padding: '0 12px 8px',
    WebkitAppRegion: 'no-drag',
  }

  return (
    <div className="note-paper note-fold" style={shellStyle}>
      <div style={titleBarStyle}>
        <h3
          style={{
            margin: 0,
            fontFamily: note.fontFamily,
            fontSize: note.titleFontSize,
            fontWeight: 700,
            color: theme.textColor,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            userSelect: 'none',
            pointerEvents: 'none',
          }}
        >
          {note.title || 'Untitled'}
        </h3>
      </div>

      <div className="note-content" style={contentStyle}>
        <NoteContentRenderer
          content={note.content}
          note={note}
          textColor={theme.textColor}
          struckKeys={note.struckKeys ?? []}
          onSentenceClick={handleSentenceClick}
        />
      </div>

      {note.tags.length > 0 && (
        <div className="flex gap-1 flex-wrap pb-1" style={tagsStyle}>
          {note.tags.slice(0, 5).map((tag) => (
            <span
              key={tag}
              className="text-xs px-1.5 py-0.5 rounded-full"
              style={{ backgroundColor: `${theme.textColor}18`, color: theme.textColor }}
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      {note.isLocked && (
        <div
          style={{
            position: 'absolute',
            top: 6,
            right: 8,
            fontSize: 11,
            opacity: 0.4,
            color: theme.textColor,
            pointerEvents: 'none',
          }}
        >
          🔒
        </div>
      )}
    </div>
  )
}
