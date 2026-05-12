import { contextBridge, ipcRenderer } from 'electron'
import { IPC } from '../../shared/ipc-channels'
import type { PhotoPin } from '../../shared/types'

contextBridge.exposeInMainWorld('floatPhotoApi', {
  getPhotoId: (): string | null =>
    new URLSearchParams(window.location.search).get('photoId'),

  getPhotoPin: (id: string): Promise<PhotoPin | null> =>
    ipcRenderer.invoke(IPC.PHOTO_PINS_GET_ONE, id),

  openContextMenu: (id: string): Promise<void> =>
    ipcRenderer.invoke(IPC.FLOAT_PHOTO_CONTEXT_MENU, id),

  updateStyle: (id: string, patch: Partial<PhotoPin>): Promise<PhotoPin | null> =>
    ipcRenderer.invoke(IPC.PHOTO_PIN_UPDATE_STYLE, id, patch),

  setAlwaysOnTop: (id: string, value: boolean): Promise<void> =>
    ipcRenderer.invoke(IPC.FLOAT_PHOTO_SET_ALWAYS_ON_TOP, id, value),

  onPhotoPinUpdated: (cb: (pin: PhotoPin) => void): void => {
    ipcRenderer.on(IPC.MAIN_PHOTO_PIN_UPDATED, (_e, pin) => cb(pin))
  },
})
