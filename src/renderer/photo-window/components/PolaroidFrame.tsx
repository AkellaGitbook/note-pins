import { useState, useRef, CSSProperties } from 'react'
import type { PhotoPin } from '../../../shared/types'

type AppRegionStyle = CSSProperties & { WebkitAppRegion?: 'drag' | 'no-drag' }

function getShadow(level: number): string {
  const shadows = [
    'none',
    '0 3px 10px rgba(0,0,0,0.15)',
    '0 6px 20px rgba(0,0,0,0.20)',
    '0 10px 30px rgba(0,0,0,0.25)',
    '0 16px 48px rgba(0,0,0,0.30)',
  ]
  return shadows[Math.min(level, 4)]
}

type Props = { pin: PhotoPin }

export function PolaroidFrame({ pin }: Props) {
  const [caption, setCaption] = useState(pin.caption)
  const saveTimer = useRef<ReturnType<typeof setTimeout>>()

  // Sync if pin updates externally (e.g. from main window edit)
  if (caption !== pin.caption && document.activeElement?.tagName !== 'TEXTAREA') {
    setCaption(pin.caption)
  }

  const handleCaptionChange = (val: string) => {
    setCaption(val)
    clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => {
      window.floatPhotoApi.updateStyle(pin.id, { caption: val })
    }, 600)
  }

  const handleCaptionBlur = () => {
    clearTimeout(saveTimer.current)
    window.floatPhotoApi.updateStyle(pin.id, { caption })
  }

  const frameStyle: AppRegionStyle = {
    position: 'absolute',
    inset: 0,
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: '#fffef8',
    borderRadius: 3,
    boxShadow: getShadow(pin.shadowLevel),
    opacity: pin.opacity,
    transform: `rotate(${pin.rotation}deg)`,
    transformOrigin: 'center center',
    overflow: 'hidden',
  }

  // Thin top drag bar
  const dragBarStyle: AppRegionStyle = {
    flexShrink: 0,
    height: 20,
    backgroundColor: '#f5f0e0',
    borderBottom: '1px solid #e8e0c8',
    cursor: pin.isLocked ? 'default' : 'grab',
    WebkitAppRegion: pin.isLocked ? 'no-drag' : 'drag',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  }

  // White mat/padding around the image (top/left/right)
  const matStyle: AppRegionStyle = {
    flex: 1,
    padding: '10px 10px 0',
    backgroundColor: '#fffef8',
    WebkitAppRegion: 'no-drag',
    overflow: 'hidden',
    display: 'flex',
    alignItems: 'stretch',
  }

  const imgStyle: CSSProperties = {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    display: 'block',
    userSelect: 'none',
    pointerEvents: 'none',
    borderRadius: 1,
  }

  // Caption area — thicker bottom padding (like real Polaroid)
  const captionAreaStyle: AppRegionStyle = {
    flexShrink: 0,
    padding: '6px 10px 10px',
    backgroundColor: '#fffef8',
    WebkitAppRegion: 'no-drag',
  }

  const textareaStyle: CSSProperties = {
    width: '100%',
    background: 'transparent',
    border: 'none',
    outline: 'none',
    resize: 'none',
    fontFamily: '"Patrick Hand", "Caveat", "Comic Sans MS", cursive',
    fontSize: 12,
    color: '#555',
    lineHeight: 1.3,
    cursor: 'text',
    textAlign: 'center',
    userSelect: 'text',
    height: 36,
  }

  const dotStyle: CSSProperties = {
    width: 6,
    height: 6,
    borderRadius: '50%',
    backgroundColor: '#ccc',
    flexShrink: 0,
  }

  const imgSrc = `app-image://local/${encodeURIComponent(pin.imagePath.split(/[\\/]/).pop() ?? '')}`

  return (
    <div style={frameStyle}>
      {/* Drag bar */}
      <div style={dragBarStyle}>
        <div style={{ display: 'flex', gap: 4 }}>
          <div style={dotStyle} />
          <div style={dotStyle} />
          <div style={dotStyle} />
        </div>
      </div>

      {/* Image */}
      <div style={matStyle}>
        <img src={imgSrc} alt={pin.title || 'Photo'} style={imgStyle} draggable={false} />
      </div>

      {/* Caption */}
      <div style={captionAreaStyle}>
        <textarea
          value={caption}
          placeholder="Add a caption…"
          style={textareaStyle}
          onChange={(e) => handleCaptionChange(e.target.value)}
          onBlur={handleCaptionBlur}
          spellCheck={false}
        />
      </div>

      {/* Lock indicator */}
      {pin.isLocked && (
        <div
          style={{
            position: 'absolute',
            top: 22,
            right: 6,
            fontSize: 10,
            opacity: 0.4,
            color: '#666',
            pointerEvents: 'none',
            WebkitAppRegion: 'no-drag',
          } as AppRegionStyle}
        >
          🔒
        </div>
      )}
    </div>
  )
}
