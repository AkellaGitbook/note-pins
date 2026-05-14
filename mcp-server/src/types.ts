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
  _type?: 'note'
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
  _type?: 'photo'
}

export type Pin = (Note & { _type: 'note' }) | (PhotoPin & { _type: 'photo' })

export function isNote(pin: Pin): pin is Note & { _type: 'note' } {
  return pin._type === 'note'
}

export function isPhoto(pin: Pin): pin is PhotoPin & { _type: 'photo' } {
  return pin._type === 'photo'
}
