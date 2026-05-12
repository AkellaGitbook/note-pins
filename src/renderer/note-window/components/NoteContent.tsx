import { useState, type ReactNode } from 'react'
import type { Note } from '../../../shared/types'

type SlateNode = {
  type?: string
  text?: string
  bold?: boolean
  italic?: boolean
  underline?: boolean
  strikethrough?: boolean
  checked?: boolean
  children?: SlateNode[]
}

function splitSentences(text: string): string[] {
  // Split only when period is followed by whitespace then an uppercase letter,
  // avoiding false positives on abbreviations (Dr. Smith) and decimals.
  const parts = text.split(/(?<=\.)\s+(?=[A-Z])/)
  return parts.filter(s => s.length > 0)
}

type SentenceSpanProps = {
  text: string
  isStruck: boolean
  onClick: () => void
}

function SentenceSpan({ text, isStruck, onClick }: SentenceSpanProps) {
  const [hovered, setHovered] = useState(false)
  return (
    <span
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        cursor: 'pointer',
        textDecoration: isStruck ? 'line-through' : 'none',
        opacity: hovered && !isStruck ? 0.65 : 1,
        transition: 'opacity 0.1s',
      }}
    >
      {text}
    </span>
  )
}

type RenderContext = {
  struckKeys: string[]
  onSentenceClick: (key: string) => void
}

// blockIdx: top-level Slate block index; leafIdx: child index within that block
function renderTextLeaf(node: SlateNode, blockIdx: number, leafIdx: number, ctx: RenderContext): ReactNode {
  const raw = node.text ?? ' '
  const sentences = splitSentences(raw)

  let content: ReactNode
  if (sentences.length <= 1) {
    const key = `${blockIdx}:${leafIdx}:0`
    content = (
      <SentenceSpan
        text={raw}
        isStruck={ctx.struckKeys.includes(key)}
        onClick={() => ctx.onSentenceClick(key)}
      />
    )
  } else {
    content = (
      <>
        {sentences.map((s, sIdx) => {
          const key = `${blockIdx}:${leafIdx}:${sIdx}`
          return (
            <span key={sIdx}>
              <SentenceSpan
                text={s}
                isStruck={ctx.struckKeys.includes(key)}
                onClick={() => ctx.onSentenceClick(key)}
              />
              {sIdx < sentences.length - 1 ? ' ' : null}
            </span>
          )
        })}
      </>
    )
  }

  // Apply Slate-level marks on top of the sentence spans
  let el: ReactNode = content
  if (node.bold) el = <strong>{el}</strong>
  if (node.italic) el = <em>{el}</em>
  if (node.underline) el = <u>{el}</u>
  if (node.strikethrough) el = <s>{el}</s>
  return <span key={leafIdx}>{el}</span>
}

function renderNode(node: SlateNode, blockIdx: number, leafIdx: number, ctx: RenderContext): ReactNode {
  if (node.text !== undefined) {
    return renderTextLeaf(node, blockIdx, leafIdx, ctx)
  }

  const children = node.children?.map((c, i) => renderNode(c, blockIdx, i, ctx))

  switch (node.type) {
    case 'heading-one':
      return <h1 key={blockIdx}>{children}</h1>
    case 'heading-two':
      return <h2 key={blockIdx}>{children}</h2>
    case 'bulleted-list':
      return <ul key={blockIdx} style={{ listStyleType: 'disc', paddingLeft: '1.4em', margin: '0 0 3px' }}>{children}</ul>
    case 'numbered-list':
      return <ol key={blockIdx} style={{ listStyleType: 'decimal', paddingLeft: '1.4em', margin: '0 0 3px' }}>{children}</ol>
    case 'list-item':
      return <li key={blockIdx} style={{ margin: '1px 0' }}>{children}</li>
    case 'check-list-item':
      return (
        <div key={blockIdx} className={`checklist-item ${node.checked ? 'checked' : ''}`}>
          <input type="checkbox" checked={!!node.checked} readOnly />
          <span>{children}</span>
        </div>
      )
    default:
      return <p key={blockIdx}>{children}</p>
  }
}

type Props = {
  content: string
  note: Note
  textColor: string
  struckKeys: string[]
  onSentenceClick: (key: string) => void
}

export function NoteContentRenderer({ content, note, textColor, struckKeys, onSentenceClick }: Props) {
  let nodes: SlateNode[]
  try {
    nodes = JSON.parse(content) as SlateNode[]
    if (!Array.isArray(nodes)) nodes = []
  } catch {
    nodes = [{ type: 'paragraph', children: [{ text: content }] }]
  }

  const ctx: RenderContext = { struckKeys, onSentenceClick }

  return (
    <div
      style={{
        fontFamily: note.fontFamily,
        fontSize: note.contentFontSize,
        fontWeight: note.fontWeight,
        lineHeight: note.lineHeight,
        textAlign: note.textAlign,
        color: textColor,
        userSelect: 'none',
      }}
    >
      {nodes.map((n, i) => renderNode(n, i, 0, ctx))}
    </div>
  )
}
