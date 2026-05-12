import { clsx } from 'clsx'
import type { PhotoPin } from '../../../shared/types'
import { usePhotoPinsStore } from '../store/usePhotoPinsStore'

type Props = {
  pin: PhotoPin
  isSelected: boolean
  onClick: () => void
}

export function PhotoPinCard({ pin, isSelected, onClick }: Props) {
  const { postPin, deletePin } = usePhotoPinsStore()

  const imgSrc = `app-image://local/${encodeURIComponent(pin.imagePath.split(/[\\/]/).pop() ?? '')}`

  const shadowMap = [
    'none',
    '0 2px 6px rgba(0,0,0,0.08)',
    '0 4px 14px rgba(0,0,0,0.10)',
    '0 8px 24px rgba(0,0,0,0.12)',
  ]
  const shadow = shadowMap[Math.min(pin.shadowLevel, 3)]

  return (
    <div
      onClick={onClick}
      className={clsx(
        'group relative cursor-pointer transition-all duration-150',
        'hover:scale-[1.02] active:scale-[0.99]',
        isSelected ? 'ring-2 ring-amber-400' : ''
      )}
      style={{
        backgroundColor: '#fffef8',
        boxShadow: shadow,
        borderRadius: 3,
        opacity: pin.opacity,
        transform: `rotate(${pin.rotation * 0.5}deg)`,
      }}
    >
      {/* Polaroid frame */}
      <div style={{ padding: '8px 8px 0', backgroundColor: '#fffef8' }}>
        <div style={{ height: 140, overflow: 'hidden', borderRadius: 2 }}>
          <img
            src={imgSrc}
            alt={pin.title || 'Photo'}
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
            draggable={false}
          />
        </div>
      </div>

      {/* Caption strip */}
      <div style={{ padding: '4px 8px 8px', textAlign: 'center' }}>
        <p
          style={{
            fontFamily: '"Patrick Hand", "Caveat", "Comic Sans MS", cursive',
            fontSize: 11,
            color: '#666',
            margin: 0,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {pin.caption || pin.title || ' '}
        </p>
      </div>

      {/* Status badge */}
      {pin.status === 'posted' && (
        <div
          style={{
            position: 'absolute',
            top: 4,
            right: 4,
            background: 'rgba(251,191,36,0.9)',
            borderRadius: 99,
            fontSize: 9,
            padding: '1px 5px',
            color: '#78350f',
            fontWeight: 600,
          }}
        >
          on desktop
        </div>
      )}

      {/* Action bar */}
      <div
        className={clsx(
          'flex items-center justify-between px-2 py-1 border-t border-stone-100 transition-opacity',
          isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          title={pin.status === 'posted' ? 'Already on desktop' : 'Pin to desktop'}
          className="text-xs font-medium px-2 py-0.5 rounded transition-colors hover:bg-amber-50 text-amber-700"
          onClick={() => pin.status !== 'posted' && postPin(pin.id)}
          disabled={pin.status === 'posted'}
        >
          📌 {pin.status === 'posted' ? 'Posted' : 'Pin it up!'}
        </button>
        <button
          title="Delete"
          className="text-xs p-1 rounded hover:bg-red-50 hover:text-red-600 transition-colors text-stone-400"
          onClick={() => deletePin(pin.id)}
        >
          🗑
        </button>
      </div>
    </div>
  )
}
