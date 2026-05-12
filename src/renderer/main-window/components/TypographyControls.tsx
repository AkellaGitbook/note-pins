import type { Note } from '../../../shared/types'

const FONTS = [
  { value: 'Inter, sans-serif', label: 'Inter' },
  { value: 'Georgia, serif', label: 'Georgia' },
  { value: '"Courier New", monospace', label: 'Courier New' },
  { value: '"Arial", sans-serif', label: 'Arial' },
  { value: '"Times New Roman", serif', label: 'Times New Roman' },
  { value: '"Comic Sans MS", cursive', label: 'Comic Sans' },
]

type Props = {
  note: Note
  onChange: (patch: Partial<Note>) => void
}

export function TypographyControls({ note, onChange }: Props) {
  return (
    <div className="space-y-3">
      {/* Font family */}
      <div>
        <label className="text-xs text-slate-500 mb-1 block">Font</label>
        <select
          value={note.fontFamily}
          onChange={(e) => onChange({ fontFamily: e.target.value })}
          className="w-full text-sm border border-slate-200 rounded-lg px-2 py-1.5 outline-none focus:border-amber-400 bg-white"
          style={{ fontFamily: note.fontFamily }}
        >
          {FONTS.map((f) => (
            <option key={f.value} value={f.value} style={{ fontFamily: f.value }}>
              {f.label}
            </option>
          ))}
        </select>
      </div>

      {/* Font sizes */}
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-xs text-slate-500 mb-1 block">Title size</label>
          <input
            type="number"
            min={10}
            max={36}
            value={note.titleFontSize}
            onChange={(e) => onChange({ titleFontSize: Number(e.target.value) })}
            className="w-full text-sm border border-slate-200 rounded-lg px-2 py-1.5 outline-none focus:border-amber-400"
          />
        </div>
        <div>
          <label className="text-xs text-slate-500 mb-1 block">Content size</label>
          <input
            type="number"
            min={9}
            max={28}
            value={note.contentFontSize}
            onChange={(e) => onChange({ contentFontSize: Number(e.target.value) })}
            className="w-full text-sm border border-slate-200 rounded-lg px-2 py-1.5 outline-none focus:border-amber-400"
          />
        </div>
      </div>

      {/* Font weight */}
      <div>
        <label className="text-xs text-slate-500 mb-1 block">
          Weight: <span className="font-medium text-slate-700">{note.fontWeight}</span>
        </label>
        <input
          type="range"
          min={300}
          max={700}
          step={100}
          value={note.fontWeight}
          onChange={(e) => onChange({ fontWeight: Number(e.target.value) })}
          className="w-full accent-amber-400"
        />
      </div>

      {/* Line height */}
      <div>
        <label className="text-xs text-slate-500 mb-1 block">
          Line height: <span className="font-medium text-slate-700">{note.lineHeight.toFixed(1)}</span>
        </label>
        <input
          type="range"
          min={1.0}
          max={2.5}
          step={0.1}
          value={note.lineHeight}
          onChange={(e) => onChange({ lineHeight: Number(e.target.value) })}
          className="w-full accent-amber-400"
        />
      </div>

      {/* Text alignment */}
      <div>
        <label className="text-xs text-slate-500 mb-1 block">Alignment</label>
        <div className="flex gap-1">
          {(['left', 'center', 'right'] as const).map((align) => (
            <button
              key={align}
              onClick={() => onChange({ textAlign: align })}
              className={`flex-1 py-1.5 text-sm rounded-lg border transition-colors ${
                note.textAlign === align
                  ? 'bg-amber-100 border-amber-300 text-amber-700'
                  : 'border-slate-200 text-slate-500 hover:bg-slate-50'
              }`}
            >
              {align === 'left' ? '⬅' : align === 'center' ? '↔' : '➡'}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
