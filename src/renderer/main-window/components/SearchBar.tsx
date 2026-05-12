import { useNotesStore } from '../store/useNotesStore'

export function SearchBar() {
  const { searchQuery, setSearch } = useNotesStore()

  return (
    <div className="relative">
      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs">
        🔍
      </span>
      <input
        type="text"
        placeholder="Search notes..."
        value={searchQuery}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full pl-7 pr-3 py-1.5 text-sm bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-amber-400 focus:bg-white transition-colors"
      />
    </div>
  )
}
