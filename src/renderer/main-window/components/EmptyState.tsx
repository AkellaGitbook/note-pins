type Props = { onCreate: () => void }

export function EmptyState({ onCreate }: Props) {
  return (
    <div className="flex flex-col items-center justify-center h-64 text-center">
      <div className="text-5xl mb-4">🗒️</div>
      <h3 className="text-slate-500 font-medium mb-1">No notes yet</h3>
      <p className="text-slate-400 text-sm mb-4">Create your first sticky note</p>
      <button
        onClick={onCreate}
        className="bg-amber-400 hover:bg-amber-500 text-amber-900 font-medium text-sm py-2 px-4 rounded-lg transition-colors"
      >
        + New Note
      </button>
    </div>
  )
}
