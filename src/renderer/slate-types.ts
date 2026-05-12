import type { BaseEditor } from 'slate'
import type { ReactEditor } from 'slate-react'
import type { HistoryEditor } from 'slate-history'

export type SlateText = {
  text: string
  bold?: boolean
  italic?: boolean
  underline?: boolean
  strikethrough?: boolean
}

export type ParagraphElement = { type: 'paragraph'; children: SlateText[] }
export type HeadingOneElement = { type: 'heading-one'; children: SlateText[] }
export type HeadingTwoElement = { type: 'heading-two'; children: SlateText[] }
export type BulletedListElement = { type: 'bulleted-list'; children: ListItemElement[] }
export type NumberedListElement = { type: 'numbered-list'; children: ListItemElement[] }
export type ListItemElement = { type: 'list-item'; children: SlateText[] }
export type CheckListItemElement = {
  type: 'check-list-item'
  checked: boolean
  children: SlateText[]
}

export type SlateElement =
  | ParagraphElement
  | HeadingOneElement
  | HeadingTwoElement
  | BulletedListElement
  | NumberedListElement
  | ListItemElement
  | CheckListItemElement

declare module 'slate' {
  interface CustomTypes {
    Editor: BaseEditor & ReactEditor & HistoryEditor
    Element: SlateElement
    Text: SlateText
  }
}
