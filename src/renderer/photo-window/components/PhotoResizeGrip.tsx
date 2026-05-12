import type { CSSProperties } from 'react'

export function PhotoResizeGrip() {
  const style: CSSProperties & { WebkitAppRegion?: string } = {
    position: 'absolute',
    bottom: 4,
    right: 4,
    width: 14,
    height: 14,
    cursor: 'nwse-resize',
    zIndex: 200,
    opacity: 0.3,
    WebkitAppRegion: 'no-drag',
    color: '#888',
  }

  return (
    <div style={style}>
      <svg viewBox="0 0 14 14" fill="currentColor" width={14} height={14}>
        <circle cx="5" cy="9" r="1.2" />
        <circle cx="9" cy="9" r="1.2" />
        <circle cx="9" cy="5" r="1.2" />
      </svg>
    </div>
  )
}
