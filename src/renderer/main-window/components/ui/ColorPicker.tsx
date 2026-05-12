import { useState } from 'react'
import { HexColorPicker, HexColorInput } from 'react-colorful'

type Props = {
  color: string
  onChange: (color: string) => void
}

export function ColorPicker({ color, onChange }: Props) {
  const [open, setOpen] = useState(false)

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 border border-slate-200 rounded-lg px-2 py-1.5 w-full hover:border-slate-300 transition-colors"
      >
        <div
          className="w-4 h-4 rounded-full border border-slate-200 flex-shrink-0"
          style={{ backgroundColor: color }}
        />
        <span className="text-xs text-slate-600 font-mono">{color}</span>
      </button>

      {open && (
        <div className="absolute z-50 mt-1 left-0 bg-white border border-slate-200 rounded-xl shadow-lg p-3">
          <HexColorPicker color={color} onChange={onChange} />
          <div className="mt-2 flex items-center gap-2">
            <span className="text-xs text-slate-500">#</span>
            <HexColorInput
              color={color}
              onChange={onChange}
              className="flex-1 text-xs border border-slate-200 rounded px-2 py-1 outline-none focus:border-amber-400 font-mono"
            />
          </div>
          <button
            onClick={() => setOpen(false)}
            className="mt-2 w-full text-xs text-slate-500 hover:text-slate-700"
          >
            Done
          </button>
        </div>
      )}
    </div>
  )
}
