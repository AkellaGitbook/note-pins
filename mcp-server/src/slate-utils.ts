// Utilities for working with Slate JSON (the editor format used by Note Pins)

type SlateNode = {
  type?: string
  text?: string
  children?: SlateNode[]
  [key: string]: unknown
}

export function textToSlate(text: string): string {
  const lines = text.split('\n')
  const blocks = lines.map((line) => ({ type: 'paragraph', children: [{ text: line }] }))
  return JSON.stringify(blocks)
}

export function validateSlateJson(raw: string): boolean {
  try {
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) && parsed.every((b: unknown) =>
      typeof b === 'object' && b !== null && 'children' in b && Array.isArray((b as any).children)
    )
  } catch {
    return false
  }
}

function extractText(node: SlateNode): string {
  if (typeof node.text === 'string') return node.text
  if (!node.children) return ''
  return node.children.map(extractText).join('')
}

export function slateToPlainText(slateJson: string): string {
  try {
    const blocks: SlateNode[] = JSON.parse(slateJson)
    return blocks.map(extractText).join('\n')
  } catch {
    return slateJson
  }
}

// Same sentence split as NoteContent.tsx in the renderer
export function splitSentences(text: string): string[] {
  return text.split(/(?<=\.)\s+(?=[A-Z])/).filter(Boolean)
}

type LeafTuple = { blockIdx: number; leafIdx: number; text: string }

function collectLeaves(block: SlateNode, blockIdx: number): LeafTuple[] {
  const leaves: LeafTuple[] = []

  function walk(node: SlateNode, parentChildren: SlateNode[]): void {
    if (typeof node.text === 'string') {
      const leafIdx = parentChildren.indexOf(node)
      leaves.push({ blockIdx, leafIdx, text: node.text })
      return
    }
    const children = node.children ?? []
    for (const child of children) {
      walk(child, children)
    }
  }

  const topChildren = block.children ?? []
  for (const child of topChildren) {
    walk(child, topChildren)
  }

  return leaves
}

export type FindSentenceResult =
  | { found: true; key: string }
  | { found: false; allSentences: string[] }

export function findSentenceKey(slateJson: string, searchText: string): FindSentenceResult {
  const trimmed = searchText.trim()
  const allSentences: string[] = []

  let blocks: SlateNode[]
  try {
    blocks = JSON.parse(slateJson)
    if (!Array.isArray(blocks)) return { found: false, allSentences }
  } catch {
    return { found: false, allSentences }
  }

  for (let blockIdx = 0; blockIdx < blocks.length; blockIdx++) {
    const leaves = collectLeaves(blocks[blockIdx], blockIdx)
    for (const { leafIdx, text } of leaves) {
      const sentences = splitSentences(text)
      for (let sentIdx = 0; sentIdx < sentences.length; sentIdx++) {
        const sentence = sentences[sentIdx]
        allSentences.push(sentence.trim())
        if (sentence.trim() === trimmed) {
          return { found: true, key: `${blockIdx}:${leafIdx}:${sentIdx}` }
        }
      }
    }
  }

  return { found: false, allSentences }
}

export function toggleStruckKey(struckKeys: string[], key: string): string[] {
  if (struckKeys.includes(key)) {
    return struckKeys.filter((k) => k !== key)
  }
  return [...struckKeys, key]
}
