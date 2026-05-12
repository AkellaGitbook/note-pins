import type { Note } from '../../../shared/types'
import { THEMES } from '../../../shared/themes'
import { ColorPicker } from './ui/ColorPicker'

type Props = {
  note: Note
  onChange: (patch: Partial<Note>) => void
}

export function CustomizationPanel({ note, onChange }: Props) {
  return (
    <div className="space-y-3">
      {/* Color themes */}
      <div>
        <label className="text-xs text-slate-500 mb-1.5 block">Theme</label>
        <div className="flex gap-1.5 flex-wrap">
          {THEMES.map((t) => (
            <button
              key={t.id}
              title={t.label}
              onClick={() =>
                onChange({ theme: t.id, backgroundColor: t.backgroundColor })
              }
              className={`w-6 h-6 rounded-full border-2 transition-all ${
                note.theme === t.id ? 'border-slate-600 scale-110' : 'border-transparent hover:scale-105'
              }`}
              style={{ backgroundColor: t.backgroundColor }}
            />
          ))}
        </div>
      </div>

      {/* Custom color */}
      <div>
        <label className="text-xs text-slate-500 mb-1.5 block">Custom color</label>
        <ColorPicker
          color={note.backgroundColor}
          onChange={(c) => onChange({ backgroundColor: c, theme: 'custom' })}
        />
      </div>

      {/* Size */}
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-xs text-slate-500 mb-1 block">Width (px)</label>
          <input
            type="number"
            min={160}
            max={600}
            step={10}
            value={note.width}
            onChange={(e) => onChange({ width: Number(e.target.value) })}
            className="w-full text-sm border border-slate-200 rounded-lg px-2 py-1.5 outline-none focus:border-amber-400"
          />
        </div>
        <div>
          <label className="text-xs text-slate-500 mb-1 block">Height (px)</label>
          <input
            type="number"
            min={120}
            max={600}
            step={10}
            value={note.height}
            onChange={(e) => onChange({ height: Number(e.target.value) })}
            className="w-full text-sm border border-slate-200 rounded-lg px-2 py-1.5 outline-none focus:border-amber-400"
          />
        </div>
      </div>

      {/* Opacity */}
      <div>
        <label className="text-xs text-slate-500 mb-1 block">
          Opacity: <span className="font-medium text-slate-700">{Math.round(note.opacity * 100)}%</span>
        </label>
        <input
          type="range"
          min={0.2}
          max={1}
          step={0.05}
          value={note.opacity}
          onChange={(e) => onChange({ opacity: Number(e.target.value) })}
          className="w-full accent-amber-400"
        />
      </div>

      {/* Border radius */}
      <div>
        <label className="text-xs text-slate-500 mb-1 block">
          Corner radius: <span className="font-medium text-slate-700">{note.borderRadius}px</span>
        </label>
        <input
          type="range"
          min={0}
          max={24}
          step={2}
          value={note.borderRadius}
          onChange={(e) => onChange({ borderRadius: Number(e.target.value) })}
          className="w-full accent-amber-400"
        />
      </div>

      {/* Shadow level */}
      <div>
        <label className="text-xs text-slate-500 mb-1 block">
          Shadow: <span className="font-medium text-slate-700">{note.shadowLevel}</span>
        </label>
        <input
          type="range"
          min={0}
          max={4}
          step={1}
          value={note.shadowLevel}
          onChange={(e) => onChange({ shadowLevel: Number(e.target.value) })}
          className="w-full accent-amber-400"
        />
      </div>

      {/* Toggles */}
      <div className="flex gap-2">
        <label className="flex items-center gap-2 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={note.isAlwaysOnTop}
            onChange={(e) => onChange({ isAlwaysOnTop: e.target.checked })}
            className="accent-amber-400"
          />
          <span className="text-xs text-slate-600">Pin above apps</span>
        </label>
        <label className="flex items-center gap-2 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={note.isLocked}
            onChange={(e) => onChange({ isLocked: e.target.checked })}
            className="accent-amber-400"
          />
          <span className="text-xs text-slate-600">Lock position</span>
        </label>
      </div>
    </div>
  )
}
