export type Note = {
  id: string
  title: string
  content: string
  createdAt: string
  updatedAt: string
  status: 'draft' | 'posted' | 'hidden'
  x: number
  y: number
  width: number
  height: number
  fontFamily: string
  titleFontSize: number
  contentFontSize: number
  fontWeight: number
  lineHeight: number
  textAlign: 'left' | 'center' | 'right'
  backgroundColor: string
  theme: string
  opacity: number
  borderRadius: number
  shadowLevel: number
  isAlwaysOnTop: boolean
  isLocked: boolean
  tags: string[]
  struckKeys?: string[]
}

export type PhotoPin = {
  id: string
  imagePath: string
  title: string
  caption: string
  createdAt: string
  updatedAt: string
  status: 'draft' | 'posted'
  x: number
  y: number
  width: number
  height: number
  rotation: number
  opacity: number
  shadowLevel: number
  isLocked: boolean
  isAlwaysOnTop: boolean
}

export type DbSchema = {
  notes: Note[]
  photoPins: PhotoPin[]
}
