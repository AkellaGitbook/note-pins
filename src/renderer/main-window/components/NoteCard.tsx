import { clsx } from 'clsx'
import type { Note } from '../../../shared/types'
import { useNotesStore } from '../store/useNotesStore'
import { getTheme } from '../../../shared/themes'

type Props = {
  note: Note
  isSelected: boolean
  onClick: () => void
}

type SlateRaw = { text?: string; children?: SlateRaw[] }

function extractText(node: SlateRaw): string {
  if (typeof node.text === 'string') return node.text
  if (Array.isArray(node.children)) return node.children.map(extractText).join('')
  return ''
}

function stripSlate(content: string): string {
  try {
    const nodes = JSON.parse(content) as SlateRaw[]
    return nodes.map(extractText).join(' ').trim().slice(0, 120)
  } catch {
    return content.slice(0, 120)
  }
}

export function NoteCard({ note, isSelected, onClick }: Props) {
  const { postNote, deleteNote, duplicateNote } = useNotesStore()
  const theme = getTheme(note.theme)
  const preview = stripSlate(note.content)

  const shadowMap = ['none', '0 2px 6px rgba(0,0,0,0.08)', '0 4px 14px rgba(0,0,0,0.1)', '0 8px 24px rgba(0,0,0,0.12)']
  const shadow = shadowMap[Math.min(note.shadowLevel, 3)]

  return (
    <div
      onClick={onClick}
      className={clsx(
        'group relative cursor-pointer rounded-xl border-2 transition-all duration-150',
        'hover:scale-[1.02] active:scale-[0.99]',
        isSelected ? 'border-amber-400 ring-2 ring-amber-200' : 'border-transparent'
      )}
      style={{
        backgroundColor: note.backgroundColor,
        boxShadow: shadow,
        opacity: note.opacity,
        borderRadius: note.borderRadius,
      }}
    >
      {/* Paper texture */}
      <div
        className="note-paper note-fold p-3 h-44 flex flex-col overflow-hidden"
        style={{ borderRadius: note.borderRadius }}
      >
        {/* Title */}
        <h3
          className="font-semibold mb-1 truncate"
          style={{
            color: theme.textColor,
            fontSize: note.titleFontSize,
            fontFamily: note.fontFamily,
          }}
        >
          {note.title || 'Untitled'}
        </h3>

        {/* Content preview */}
        <p
          className="flex-1 text-xs leading-relaxed overflow-hidden"
          style={{ color: theme.textColor, opacity: 0.75 }}
        >
          {preview || <span className="italic opacity-50">Empty note</span>}
        </p>

        {/* Tags */}
        {note.tags.length > 0 && (
          <div className="flex gap-1 flex-wrap mt-1">
            {note.tags.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="text-xs px-1.5 py-0.5 rounded-full"
                style={{
                  backgroundColor: `${theme.textColor}20`,
                  color: theme.textColor,
                }}
              >
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Action bar (visible on hover/select) */}
      <div
        className={clsx(
          'flex items-center justify-between px-2 py-1.5 border-t transition-opacity',
          isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
        )}
        style={{ borderColor: `${theme.textColor}18` }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          title="Post to desktop"
          className="text-xs font-medium px-2 py-1 rounded-md transition-colors hover:bg-black/10"
          style={{ color: theme.textColor }}
          onClick={() => postNote(note.id)}
        >
          📌 Post it up!
        </button>
        <div className="flex gap-1">
          <button
            title="Duplicate"
            className="text-xs p-1 rounded hover:bg-black/10 transition-colors"
            style={{ color: theme.textColor }}
            onClick={() => duplicateNote(note.id)}
          >
            ⧉
          </button>
          <button
            title="Delete"
            className="text-xs p-1 rounded hover:bg-red-100 hover:text-red-600 transition-colors"
            style={{ color: theme.textColor }}
            onClick={() => deleteNote(note.id)}
          >
            🗑
          </button>
        </div>
      </div>
    </div>
  )
}
