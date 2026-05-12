import { useNotesStore } from '../store/useNotesStore'
import { usePhotoPinsStore } from '../store/usePhotoPinsStore'
import { SearchBar } from './SearchBar'
import { clsx } from 'clsx'

const NOTE_FILTERS = [
  { id: 'all', label: 'All Notes', icon: '📋' },
  { id: 'draft', label: 'Drafts', icon: '✏️' },
  { id: 'hidden', label: 'Hidden', icon: '👁' },
] as const

type Tab = 'notes' | 'photos'

type Props = {
  activeTab: Tab
  onTabChange: (tab: Tab) => void
}

export function Sidebar({ activeTab, onTabChange }: Props) {
  const { filter, setFilter, createNote, notes } = useNotesStore()
  const { pins, createPin } = usePhotoPinsStore()

  const noteCounts = {
    all: notes.filter((n) => n.status !== 'posted').length,
    draft: notes.filter((n) => n.status === 'draft').length,
    hidden: notes.filter((n) => n.status === 'hidden').length,
  }

  const handleAddPhoto = async () => {
    const path = await window.photoApi.pickImageFile()
    if (path) createPin(path)
  }

  return (
    <aside className="w-56 flex-shrink-0 bg-white border-r border-slate-200 flex flex-col">
      {/* App title */}
      <div className="p-4 border-b border-slate-100">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-xl">🗒️</span>
          <h1 className="font-semibold text-slate-800 text-sm">Note Pins</h1>
        </div>

        {/* Tab switcher */}
        <div className="flex rounded-lg overflow-hidden border border-slate-200 mb-3">
          <button
            onClick={() => onTabChange('notes')}
            className={clsx(
              'flex-1 text-xs py-1.5 font-medium transition-colors',
              activeTab === 'notes'
                ? 'bg-amber-400 text-amber-900'
                : 'text-slate-600 hover:bg-slate-50'
            )}
          >
            Notes
          </button>
          <button
            onClick={() => onTabChange('photos')}
            className={clsx(
              'flex-1 text-xs py-1.5 font-medium transition-colors',
              activeTab === 'photos'
                ? 'bg-amber-400 text-amber-900'
                : 'text-slate-600 hover:bg-slate-50'
            )}
          >
            Photos
          </button>
        </div>

        {activeTab === 'notes' ? (
          <button
            onClick={createNote}
            className="w-full bg-amber-400 hover:bg-amber-500 text-amber-900 font-medium text-sm py-2 px-3 rounded-lg transition-colors"
          >
            + New Note
          </button>
        ) : (
          <button
            onClick={handleAddPhoto}
            className="w-full bg-amber-400 hover:bg-amber-500 text-amber-900 font-medium text-sm py-2 px-3 rounded-lg transition-colors"
          >
            + Add Photo
          </button>
        )}
      </div>

      {activeTab === 'notes' && (
        <div className="p-3">
          <SearchBar />
        </div>
      )}

      {activeTab === 'notes' ? (
        <nav className="flex-1 px-2 pb-2">
          {NOTE_FILTERS.map((f) => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={clsx(
                'w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm mb-1 transition-colors',
                filter === f.id
                  ? 'bg-amber-50 text-amber-800 font-medium'
                  : 'text-slate-600 hover:bg-slate-50'
              )}
            >
              <span className="flex items-center gap-2">
                <span>{f.icon}</span>
                {f.label}
              </span>
              <span className="text-xs text-slate-400">{noteCounts[f.id]}</span>
            </button>
          ))}
        </nav>
      ) : (
        <nav className="flex-1 px-2 pb-2 pt-2">
          <div className="px-3 py-2 text-xs text-slate-400">
            {pins.filter((p) => p.status === 'posted').length} pinned on desktop
          </div>
          <div className="px-3 py-2 text-xs text-slate-400">
            {pins.length} total photo{pins.length !== 1 ? 's' : ''}
          </div>
        </nav>
      )}

      <div className="p-3 border-t border-slate-100">
        {activeTab === 'notes' ? (
          <p className="text-xs text-slate-400 text-center">
            {notes.filter((n) => n.status === 'posted').length} notes on desktop
          </p>
        ) : (
          <p className="text-xs text-slate-400 text-center">
            JPG · PNG · GIF · WebP · BMP
          </p>
        )}
      </div>
    </aside>
  )
}
