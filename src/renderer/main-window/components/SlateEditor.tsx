import '../../slate-types'
import { useMemo } from 'react'
import { createEditor, Descendant, Editor, Element, Transforms } from 'slate'
import {
  Slate,
  Editable,
  withReact,
  useSlate,
  RenderElementProps,
  RenderLeafProps,
} from 'slate-react'
import { withHistory } from 'slate-history'
import { clsx } from 'clsx'
import type { Note } from '../../../shared/types'
import type { SlateElement } from '../../slate-types'

const EMPTY: Descendant[] = [{ type: 'paragraph', children: [{ text: '' }] }]

function parseContent(raw: string): Descendant[] {
  try {
    const v = JSON.parse(raw)
    return Array.isArray(v) && v.length > 0 ? v : EMPTY
  } catch {
    return EMPTY
  }
}

// ── Toolbar (must be rendered inside <Slate> context) ─────────────────────

type MarkFormat = 'bold' | 'italic' | 'underline' | 'strikethrough'
type BlockFormat = 'heading-one' | 'heading-two' | 'bulleted-list' | 'numbered-list'

const LIST_TYPES = ['bulleted-list', 'numbered-list']

function isMarkActive(editor: Editor, format: MarkFormat): boolean {
  const marks = Editor.marks(editor)
  return marks ? (marks as Record<string, unknown>)[format] === true : false
}

function isBlockActive(editor: Editor, format: string): boolean {
  const [match] = Array.from(
    Editor.nodes(editor, {
      match: (n) => !Editor.isEditor(n) && Element.isElement(n) && (n as SlateElement).type === format,
    })
  )
  return !!match
}

function toggleMark(editor: Editor, format: MarkFormat) {
  if (isMarkActive(editor, format)) {
    Editor.removeMark(editor, format)
  } else {
    Editor.addMark(editor, format, true)
  }
}

function toggleBlock(editor: Editor, format: BlockFormat) {
  const isActive = isBlockActive(editor, format)
  const isList = LIST_TYPES.includes(format)

  Transforms.unwrapNodes(editor, {
    match: (n) =>
      !Editor.isEditor(n) && Element.isElement(n) && LIST_TYPES.includes((n as SlateElement).type),
    split: true,
  })

  const newType = isActive ? 'paragraph' : isList ? 'list-item' : format
  Transforms.setNodes(editor, { type: newType } as Partial<SlateElement>)

  if (!isActive && isList) {
    Transforms.wrapNodes(editor, { type: format, children: [] } as SlateElement)
  }
}

const MARKS: { format: MarkFormat; label: string; title: string; style?: string }[] = [
  { format: 'bold', label: 'B', title: 'Bold', style: 'font-bold' },
  { format: 'italic', label: 'I', title: 'Italic', style: 'italic' },
  { format: 'underline', label: 'U', title: 'Underline', style: 'underline' },
  { format: 'strikethrough', label: 'S̶', title: 'Strikethrough' },
]

const BLOCKS: { format: BlockFormat; label: string; title: string }[] = [
  { format: 'heading-one', label: 'H1', title: 'Heading 1' },
  { format: 'heading-two', label: 'H2', title: 'Heading 2' },
  { format: 'bulleted-list', label: '•', title: 'Bullet list' },
  { format: 'numbered-list', label: '1.', title: 'Numbered list' },
]

function Toolbar() {
  const editor = useSlate()

  return (
    <div className="flex items-center gap-0.5 px-4 py-2 border-b border-slate-100 flex-wrap bg-white">
      {MARKS.map(({ format, label, title, style }) => {
        const active = isMarkActive(editor, format)
        return (
          <button
            key={format}
            title={title}
            onMouseDown={(e) => {
              e.preventDefault()
              toggleMark(editor, format)
            }}
            className={clsx(
              'w-7 h-7 text-xs rounded transition-colors',
              style,
              active ? 'bg-amber-100 text-amber-700' : 'text-slate-500 hover:bg-slate-100'
            )}
          >
            {label}
          </button>
        )
      })}

      <div className="w-px h-4 bg-slate-200 mx-1" />

      {BLOCKS.map(({ format, label, title }) => {
        const active = isBlockActive(editor, format)
        return (
          <button
            key={format}
            title={title}
            onMouseDown={(e) => {
              e.preventDefault()
              toggleBlock(editor, format)
            }}
            className={clsx(
              'w-7 h-7 text-xs rounded font-mono transition-colors',
              active ? 'bg-amber-100 text-amber-700' : 'text-slate-500 hover:bg-slate-100'
            )}
          >
            {label}
          </button>
        )
      })}
    </div>
  )
}

// ── Element and Leaf renderers ────────────────────────────────────────────

function SlateElement({ attributes, children, element }: RenderElementProps) {
  const el = element as SlateElement
  switch (el.type) {
    case 'heading-one':
      return <h1 {...attributes}>{children}</h1>
    case 'heading-two':
      return <h2 {...attributes}>{children}</h2>
    case 'bulleted-list':
      return <ul {...attributes} style={{ listStyleType: 'disc', paddingLeft: '1.4em', margin: '0 0 4px' }}>{children}</ul>
    case 'numbered-list':
      return <ol {...attributes} style={{ listStyleType: 'decimal', paddingLeft: '1.4em', margin: '0 0 4px' }}>{children}</ol>
    case 'list-item':
      return <li {...attributes} style={{ margin: '2px 0' }}>{children}</li>
    case 'check-list-item': {
      const node = el as { checked?: boolean }
      return (
        <div className={clsx('checklist-item', node.checked && 'checked')} {...attributes}>
          <input type="checkbox" checked={!!node.checked} readOnly contentEditable={false} />
          <span>{children}</span>
        </div>
      )
    }
    default:
      return <p {...attributes}>{children}</p>
  }
}

type LeafProps = RenderLeafProps & { leaf: { bold?: boolean; italic?: boolean; underline?: boolean; strikethrough?: boolean } }

function SlateLeaf({ attributes, children, leaf }: LeafProps) {
  let node = children
  if (leaf.bold) node = <strong>{node}</strong>
  if (leaf.italic) node = <em>{node}</em>
  if (leaf.underline) node = <u>{node}</u>
  if (leaf.strikethrough) node = <s>{node}</s>
  return <span {...attributes}>{node}</span>
}

// ── Main export ───────────────────────────────────────────────────────────

type Props = {
  note: Note
  onChange: (content: string) => void
}

export function SlateEditor({ note, onChange }: Props) {
  const editor = useMemo(() => withHistory(withReact(createEditor())), [])
  // initialValue uses note.id as dep-anchor; since EditorPanel has key={note.id}, this is stable
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const initialValue = useMemo(() => parseContent(note.content), [])

  return (
    <Slate
      editor={editor}
      initialValue={initialValue}
      onChange={(value) => onChange(JSON.stringify(value))}
    >
      <Toolbar />
      <div className="px-4 py-3">
        <Editable
          renderElement={(p) => <SlateElement {...p} />}
          renderLeaf={(p) => <SlateLeaf {...(p as LeafProps)} />}
          placeholder="Write your note here…"
          spellCheck
          style={{
            fontFamily: note.fontFamily,
            fontSize: note.contentFontSize,
            fontWeight: note.fontWeight,
            lineHeight: note.lineHeight,
            textAlign: note.textAlign,
            minHeight: 100,
            outline: 'none',
            color: '#374151',
          }}
        />
      </div>
    </Slate>
  )
}
