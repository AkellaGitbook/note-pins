import { useState, KeyboardEvent } from 'react'

type Props = {
  tags: string[]
  onChange: (tags: string[]) => void
}

export function TagInput({ tags, onChange }: Props) {
  const [input, setInput] = useState('')

  const addTag = () => {
    const tag = input.trim().toLowerCase()
    if (tag && !tags.includes(tag)) {
      onChange([...tags, tag])
    }
    setInput('')
  }

  const removeTag = (tag: string) => {
    onChange(tags.filter((t) => t !== tag))
  }

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      addTag()
    }
    if (e.key === 'Backspace' && !input && tags.length > 0) {
      onChange(tags.slice(0, -1))
    }
  }

  return (
    <div>
      <label className="text-xs text-slate-500 mb-1 block">Tags</label>
      <div className="flex flex-wrap gap-1 p-2 border border-slate-200 rounded-lg min-h-[36px] focus-within:border-amber-400 transition-colors">
        {tags.map((tag) => (
          <span
            key={tag}
            className="flex items-center gap-1 bg-amber-100 text-amber-700 text-xs px-2 py-0.5 rounded-full"
          >
            {tag}
            <button
              onClick={() => removeTag(tag)}
              className="hover:text-amber-900 leading-none"
            >
              ×
            </button>
          </span>
        ))}
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={onKeyDown}
          onBlur={addTag}
          placeholder={tags.length === 0 ? 'Add tags…' : ''}
          className="flex-1 min-w-20 text-xs outline-none bg-transparent placeholder-slate-300"
        />
      </div>
    </div>
  )
}
