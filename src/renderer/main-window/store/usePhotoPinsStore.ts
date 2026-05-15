import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'
import type { PhotoPin } from '../../../shared/types'

type State = {
  pins: PhotoPin[]
  selectedId: string | null
}

type Actions = {
  loadPins: () => Promise<void>
  selectPin: (id: string | null) => void
  createPin: (sourcePath: string) => Promise<void>
  updatePin: (id: string, patch: Partial<PhotoPin>) => Promise<void>
  deletePin: (id: string) => Promise<void>
  postPin: (id: string) => Promise<void>
  moveBack: (id: string) => Promise<void>
  applyPinUpdated: (pin: PhotoPin) => void
  applyPinDeleted: (id: string) => void
  applyPinAdded: (pin: PhotoPin) => void
}

export const usePhotoPinsStore = create<State & Actions>()(
  immer((set) => ({
    pins: [],
    selectedId: null,

    loadPins: async () => {
      const pins = await window.photoApi.getAllPhotoPins()
      set((s) => { s.pins = pins })
    },

    selectPin: (id) => set((s) => { s.selectedId = id }),

    createPin: async (sourcePath) => {
      const pin = await window.photoApi.createPhotoPin(sourcePath)
      set((s) => {
        if (!s.pins.find((p) => p.id === pin.id)) s.pins.unshift(pin)
        s.selectedId = pin.id
      })
    },

    updatePin: async (id, patch) => {
      const updated = await window.photoApi.updatePhotoPin(id, patch)
      if (!updated) return
      set((s) => {
        const idx = s.pins.findIndex((p) => p.id === id)
        if (idx !== -1) s.pins[idx] = updated
      })
    },

    deletePin: async (id) => {
      const confirmed = await window.photoApi.confirm(
        'Delete this photo permanently?',
        'The image file will also be removed. This cannot be undone.'
      )
      if (!confirmed) return
      await window.photoApi.deletePhotoPin(id)
      set((s) => {
        s.pins = s.pins.filter((p) => p.id !== id)
        if (s.selectedId === id) s.selectedId = null
      })
    },

    postPin: async (id) => {
      const pin = await window.photoApi.postPhotoPin(id)
      if (!pin) return
      set((s) => {
        const idx = s.pins.findIndex((p) => p.id === id)
        if (idx !== -1) s.pins[idx] = pin
        if (s.selectedId === id) s.selectedId = null
      })
    },

    moveBack: async (id) => {
      const pin = await window.photoApi.movePhotoPinBack(id)
      if (!pin) return
      set((s) => {
        const idx = s.pins.findIndex((p) => p.id === id)
        if (idx !== -1) s.pins[idx] = pin
        else s.pins.unshift(pin)
        s.selectedId = pin.id
      })
    },

    applyPinUpdated: (pin) => {
      set((s) => {
        const idx = s.pins.findIndex((p) => p.id === pin.id)
        if (idx !== -1) s.pins[idx] = pin
        else s.pins.unshift(pin)
      })
    },

    applyPinDeleted: (id) => {
      set((s) => {
        s.pins = s.pins.filter((p) => p.id !== id)
        if (s.selectedId === id) s.selectedId = null
      })
    },

    applyPinAdded: (pin) => {
      set((s) => {
        if (!s.pins.find((p) => p.id === pin.id)) s.pins.unshift(pin)
      })
    },
  }))
)

export const useSelectedPhotoPin = () =>
  usePhotoPinsStore((s) => s.pins.find((p) => p.id === s.selectedId) ?? null)

export const useFilteredPhotoPins = () =>
  usePhotoPinsStore((s) => s.pins)
