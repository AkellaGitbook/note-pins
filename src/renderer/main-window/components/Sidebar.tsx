import { useNotesStore } from '../store/useNotesStore'
import { usePhotoPinsStore } from '../store/usePhotoPinsStore'
import { SearchBar } from './SearchBar'
import { clsx } from 'clsx'

type Tab = 'notes' | 'photos'

type Props = {
  activeTab: Tab
  onTabChange: (tab: Tab) => void
}

export function Sidebar({ activeTab, onTabChange }: Props) {
  const { createNote, notes } = useNotesStore()
  const { pins, createPin } = usePhotoPinsStore()

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

      <div className="flex-1" />

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
