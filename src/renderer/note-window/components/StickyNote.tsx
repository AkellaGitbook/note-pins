import type { CSSProperties } from 'react'
import type { Note } from '../../../shared/types'
import { getTheme } from '../../../shared/themes'
import { NoteContentRenderer } from './NoteContent'

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

  const handleSentenceClick = async (key: string) => {
    const current = note.struckKeys ?? []
    const updated = current.includes(key)
      ? current.filter(k => k !== key)
      : [...current, key]
    await window.floatApi.updateStyle(note.id, { struckKeys: updated })
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

  // The title bar is the drag handle — draggable unless locked
  const titleBarStyle: AppRegionStyle = {
    flexShrink: 0,
    padding: '8px 12px 4px',
    cursor: note.isLocked ? 'default' : 'grab',
    WebkitAppRegion: note.isLocked ? 'no-drag' : 'drag',
  }

  // Content area must be no-drag so text can be read/scrolled
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
      {/* Title bar — drag handle */}
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
            // Prevent title text from interfering with drag
            pointerEvents: 'none',
          }}
        >
          {note.title || 'Untitled'}
        </h3>
      </div>

      {/* Content — not draggable */}
      <div className="note-content" style={contentStyle}>
        <NoteContentRenderer
          content={note.content}
          note={note}
          textColor={theme.textColor}
          struckKeys={note.struckKeys ?? []}
          onSentenceClick={handleSentenceClick}
        />
      </div>

      {/* Tags — not draggable */}
      {note.tags.length > 0 && (
        <div className="flex gap-1 flex-wrap pb-1" style={tagsStyle}>
          {note.tags.slice(0, 5).map((tag) => (
            <span
              key={tag}
              className="text-xs px-1.5 py-0.5 rounded-full"
              style={{
                backgroundColor: `${theme.textColor}18`,
                color: theme.textColor,
              }}
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* Lock indicator */}
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
