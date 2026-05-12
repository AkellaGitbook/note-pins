import { useFilteredPhotoPins, usePhotoPinsStore } from '../store/usePhotoPinsStore'
import { PhotoPinCard } from './PhotoPinCard'
import { clsx } from 'clsx'

const FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'draft', label: 'Drafts' },
  { id: 'posted', label: 'On Desktop' },
] as const

export function PhotosPanel() {
  const pins = useFilteredPhotoPins()
  const { selectedId, selectPin, photoFilter, setPhotoFilter } = usePhotoPinsStore()

  return (
    <div className="flex-1 overflow-y-auto p-4">
      <div className="flex items-center gap-2 mb-4">
        <h2 className="text-sm font-medium text-slate-500 flex-1">
          {pins.length} {pins.length === 1 ? 'photo' : 'photos'}
        </h2>
        <div className="flex gap-1">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              onClick={() => setPhotoFilter(f.id)}
              className={clsx(
                'text-xs px-2 py-1 rounded-md transition-colors',
                photoFilter === f.id
                  ? 'bg-amber-100 text-amber-800 font-medium'
                  : 'text-slate-500 hover:bg-slate-100'
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {pins.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-48 text-slate-400 gap-2">
          <span className="text-4xl">🖼️</span>
          <p className="text-sm">No photos yet</p>
          <p className="text-xs">Click &ldquo;Add Photo&rdquo; to get started</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 xl:grid-cols-3 gap-4">
          {pins.map((pin) => (
            <PhotoPinCard
              key={pin.id}
              pin={pin}
              isSelected={pin.id === selectedId}
              onClick={() => selectPin(pin.id === selectedId ? null : pin.id)}
            />
          ))}
        </div>
      )}
    </div>
  )
}
