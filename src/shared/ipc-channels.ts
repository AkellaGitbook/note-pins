export const IPC = {
  NOTES_GET_ALL: 'notes:getAll',
  NOTES_GET_ONE: 'notes:getOne',
  NOTES_CREATE: 'notes:create',
  NOTES_UPDATE: 'notes:update',
  NOTES_DELETE: 'notes:delete',
  NOTES_DUPLICATE: 'notes:duplicate',
  NOTES_SEARCH: 'notes:search',

  NOTE_POST: 'note:post',
  NOTE_MOVE_BACK: 'note:moveBack',
  NOTE_HIDE: 'note:hide',

  FLOAT_MOVE: 'float:move',
  FLOAT_RESIZE: 'float:resize',
  FLOAT_CONTEXT_MENU: 'float:contextMenu',
  NOTE_UPDATE_STYLE: 'note:updateStyle',
  FLOAT_SET_ALWAYS_ON_TOP: 'float:setAlwaysOnTop',

  DIALOG_CONFIRM: 'dialog:confirm',

  MAIN_NOTE_UPDATED: 'main:noteUpdated',
  MAIN_NOTE_DELETED: 'main:noteDeleted',
  MAIN_NOTE_ADDED: 'main:noteAdded',
  MAIN_SELECT_NOTE: 'main:selectNote',

  // Photo Pins
  PHOTO_PINS_GET_ALL: 'photoPins:getAll',
  PHOTO_PINS_GET_ONE: 'photoPins:getOne',
  PHOTO_PINS_CREATE: 'photoPins:create',
  PHOTO_PINS_UPDATE: 'photoPins:update',
  PHOTO_PINS_DELETE: 'photoPins:delete',
  PHOTO_PIN_POST: 'photoPin:post',
  PHOTO_PIN_MOVE_BACK: 'photoPin:moveBack',
  PHOTO_PIN_UPDATE_STYLE: 'photoPin:updateStyle',
  PHOTO_PINS_PICK_FILE: 'photoPins:pickFile',
  FLOAT_PHOTO_CONTEXT_MENU: 'float:photoContextMenu',
  FLOAT_PHOTO_SET_ALWAYS_ON_TOP: 'float:photoSetAlwaysOnTop',
  MAIN_PHOTO_PIN_ADDED: 'main:photoPinAdded',
  MAIN_PHOTO_PIN_UPDATED: 'main:photoPinUpdated',
  MAIN_PHOTO_PIN_DELETED: 'main:photoPinDeleted',
} as const

export type IpcChannel = (typeof IPC)[keyof typeof IPC]
