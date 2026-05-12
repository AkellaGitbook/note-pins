export type Theme = {
  id: string
  label: string
  backgroundColor: string
  textColor: string
}

export const THEMES: Theme[] = [
  { id: 'yellow', label: 'Yellow', backgroundColor: '#fef3c7', textColor: '#78350f' },
  { id: 'blue', label: 'Blue', backgroundColor: '#dbeafe', textColor: '#1e3a5f' },
  { id: 'green', label: 'Green', backgroundColor: '#dcfce7', textColor: '#14532d' },
  { id: 'pink', label: 'Pink', backgroundColor: '#fce7f3', textColor: '#831843' },
  { id: 'purple', label: 'Purple', backgroundColor: '#ede9fe', textColor: '#4c1d95' },
  { id: 'white', label: 'White', backgroundColor: '#ffffff', textColor: '#1f2937' },
  { id: 'dark', label: 'Dark', backgroundColor: '#1f2937', textColor: '#f9fafb' },
  { id: 'orange', label: 'Orange', backgroundColor: '#fed7aa', textColor: '#7c2d12' },
]

export const getTheme = (id: string): Theme =>
  THEMES.find((t) => t.id === id) ?? THEMES[0]
