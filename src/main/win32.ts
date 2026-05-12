// Win32 helper: sink a BrowserWindow to the desktop layer on Windows.
// WS_EX_NOACTIVATE prevents z-order raise on click; HWND_BOTTOM sets initial z-position.
// Wrapped in try/catch so the app works even if koffi fails to load (N-API mismatch).

let sinkWindow: ((hwnd: Buffer) => void) | null = null

if (process.platform === 'win32') {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const koffi = require('koffi')
    const user32 = koffi.load('user32.dll')

    const SetWindowPos = user32.func(
      'bool __stdcall SetWindowPos(void *hWnd, void *hWndInsertAfter, int X, int Y, int cx, int cy, uint uFlags)'
    )

    // SWP_NOMOVE | SWP_NOSIZE | SWP_NOACTIVATE
    const SWP_FLAGS = 0x0002 | 0x0001 | 0x0010
    // HWND_BOTTOM = (HWND)1
    const HWND_BOTTOM = Buffer.alloc(8)
    HWND_BOTTOM.writeBigInt64LE(1n)

    // Only push to HWND_BOTTOM — do NOT add WS_EX_NOACTIVATE, which blocks
    // Chromium from routing click events to JavaScript (breaks sentence strike).
    sinkWindow = (hwnd: Buffer): void => {
      SetWindowPos(hwnd, HWND_BOTTOM, 0, 0, 0, 0, SWP_FLAGS)
    }
  } catch (e) {
    console.warn('[win32] desktop sink unavailable — falling back to default z-order:', e)
  }
}

export { sinkWindow }
