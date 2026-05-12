import type { Note } from '../../../shared/types'
import { getTheme } from '../../../shared/themes'
import { NoteContentRenderer } from '../../note-window/components/NoteContent'

function getShadow(level: number): string {
  const shadows = [
    'none',
    '0 2px 8px rgba(0,0,0,0.10)',
    '0 4px 16px rgba(0,0,0,0.14)',
    '0 8px 28px rgba(0,0,0,0.18)',
    '0 16px 48px rgba(0,0,0,0.22)',
  ]
  return shadows[Math.min(level, 4)]
}

type Props = { note: Note }

export function NotePreview({ note }: Props) {
  const theme = getTheme(note.theme)

  return (
    <div className="flex justify-center">
      <div
        className="note-paper note-fold overflow-hidden"
        style={{
          width: Math.min(note.width, 280),
          height: Math.min(note.height, 240),
          backgroundColor: note.backgroundColor,
          borderRadius: note.borderRadius,
          opacity: note.opacity,
          boxShadow: getShadow(note.shadowLevel),
          transform: 'scale(0.85)',
          transformOrigin: 'top center',
        }}
      >
        <div className="p-3 h-full flex flex-col">
          <h3
            className="font-semibold mb-1 truncate"
            style={{
              fontSize: note.titleFontSize,
              fontFamily: note.fontFamily,
              color: theme.textColor,
            }}
          >
            {note.title || 'Untitled'}
          </h3>
          <div className="flex-1 overflow-hidden note-content">
            <NoteContentRenderer
              content={note.content}
              note={note}
              textColor={theme.textColor}
              struckKeys={[]}
              onSentenceClick={() => {}}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
