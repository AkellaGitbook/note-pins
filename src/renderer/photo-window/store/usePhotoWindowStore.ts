import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'
import type { PhotoPin } from '../../../shared/types'

type State = {
  pin: PhotoPin | null
  loading: boolean
}

type Actions = {
  load: (id: string) => Promise<void>
  applyUpdate: (pin: PhotoPin) => void
}

export const usePhotoWindowStore = create<State & Actions>()(
  immer((set) => ({
    pin: null,
    loading: true,

    load: async (id: string) => {
      set((s) => { s.loading = true })
      const pin = await window.floatPhotoApi.getPhotoPin(id)
      set((s) => {
        s.pin = pin
        s.loading = false
      })
    },

    applyUpdate: (pin: PhotoPin) => {
      set((s) => { s.pin = pin })
    },
  }))
)
