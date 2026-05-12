import type { CSSProperties } from 'react'

type Props = { isLocked: boolean }

export function DragHandle({ isLocked }: Props) {
  if (isLocked) return null

  const style: CSSProperties & { WebkitAppRegion?: string } = {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 28,
    WebkitAppRegion: 'drag',
    cursor: 'grab',
    zIndex: 100,
  }

  return <div style={style} />
}
