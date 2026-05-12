import { useEffect } from 'react'
import { usePhotoWindowStore } from './store/usePhotoWindowStore'
import { PolaroidFrame } from './components/PolaroidFrame'
import { PhotoResizeGrip } from './components/PhotoResizeGrip'

type Props = { photoId: string }

export function PhotoWindowApp({ photoId }: Props) {
  const { pin, loading, load, applyUpdate } = usePhotoWindowStore()

  useEffect(() => {
    load(photoId)
    window.floatPhotoApi.onPhotoPinUpdated(applyUpdate)
  }, [photoId])

  if (loading || !pin) {
    return <div style={{ width: '100vw', height: '100vh', background: 'transparent' }} />
  }

  return (
    <div
      style={{ width: '100vw', height: '100vh', position: 'relative' }}
      onContextMenu={(e) => {
        e.preventDefault()
        window.floatPhotoApi.openContextMenu(photoId)
      }}
    >
      <PolaroidFrame pin={pin} />
      <PhotoResizeGrip />
    </div>
  )
}
