import { useState, useEffect } from 'react'
import type { PhotoPin } from '../../../shared/types'
import { usePhotoPinsStore } from '../store/usePhotoPinsStore'

type Props = { pin: PhotoPin }

export function PhotoPinDetail({ pin }: Props) {
  const { updatePin, postPin, moveBack, deletePin, selectPin } = usePhotoPinsStore()
  const [title, setTitle] = useState(pin.title)
  const [caption, setCaption] = useState(pin.caption)
  const [rotation, setRotation] = useState(pin.rotation)

  // Reset local state when selected pin changes
  useEffect(() => {
    setTitle(pin.title)
    setCaption(pin.caption)
    setRotation(pin.rotation)
  }, [pin.id])

  const save = (patch: Partial<PhotoPin>) => updatePin(pin.id, patch)

  const imgSrc = `app-image://local/${encodeURIComponent(pin.imagePath.split(/[\\/]/).pop() ?? '')}`

  return (
    <aside className="w-72 flex-shrink-0 border-l border-slate-200 bg-white flex flex-col overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-slate-100">
        <span className="text-sm font-medium text-slate-700">Photo Details</span>
        <button
          onClick={() => selectPin(null)}
          className="text-slate-400 hover:text-slate-600 text-lg leading-none"
        >
          ×
        </button>
      </div>

      {/* Thumbnail preview */}
      <div
        className="mx-4 mt-4 mb-2"
        style={{
          backgroundColor: '#fffef8',
          padding: 10,
          borderRadius: 3,
          boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
          transform: `rotate(${rotation * 0.5}deg)`,
        }}
      >
        <img
          src={imgSrc}
          alt={title || 'Photo'}
          style={{ width: '100%', height: 160, objectFit: 'cover', borderRadius: 2, display: 'block' }}
          draggable={false}
        />
        <p
          style={{
            fontFamily: '"Patrick Hand", "Caveat", "Comic Sans MS", cursive',
            fontSize: 12,
            color: '#666',
            textAlign: 'center',
            marginTop: 6,
          }}
        >
          {caption || ' '}
        </p>
      </div>

      <div className="p-3 flex flex-col gap-3">
        {/* Title */}
        <label className="flex flex-col gap-1">
          <span className="text-xs text-slate-500 font-medium">Title</span>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={() => save({ title })}
            placeholder="Optional title"
            className="border border-slate-200 rounded-md px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-amber-300"
          />
        </label>

        {/* Caption */}
        <label className="flex flex-col gap-1">
          <span className="text-xs text-slate-500 font-medium">Caption</span>
          <textarea
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            onBlur={() => save({ caption })}
            placeholder="Add a caption…"
            rows={2}
            className="border border-slate-200 rounded-md px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-amber-300 resize-none"
          />
        </label>

        {/* Rotation */}
        <label className="flex flex-col gap-1">
          <span className="text-xs text-slate-500 font-medium">
            Tilt: {rotation.toFixed(1)}°
          </span>
          <input
            type="range"
            min={-8}
            max={8}
            step={0.1}
            value={rotation}
            onChange={(e) => setRotation(parseFloat(e.target.value))}
            onMouseUp={() => save({ rotation })}
            onTouchEnd={() => save({ rotation })}
            className="accent-amber-400"
          />
        </label>

        {/* Actions */}
        <div className="flex flex-col gap-2 pt-1 border-t border-slate-100 mt-1">
          {pin.status === 'draft' ? (
            <button
              onClick={() => postPin(pin.id)}
              className="w-full bg-amber-400 hover:bg-amber-500 text-amber-900 font-medium text-sm py-2 px-3 rounded-lg transition-colors"
            >
              📌 Pin to Desktop
            </button>
          ) : (
            <button
              onClick={() => moveBack(pin.id)}
              className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium text-sm py-2 px-3 rounded-lg transition-colors"
            >
              ← Move Back to App
            </button>
          )}

          <button
            onClick={() => deletePin(pin.id)}
            className="w-full text-red-500 hover:bg-red-50 font-medium text-sm py-1.5 px-3 rounded-lg transition-colors"
          >
            🗑 Delete Permanently
          </button>
        </div>
      </div>
    </aside>
  )
}
