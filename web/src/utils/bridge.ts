// Cầu nối với WPF/WebView2 để dùng hộp thoại chọn thư mục/tệp gốc của Windows.
type WV = { postMessage: (m: unknown) => void; addEventListener: (t: 'message', h: (e: { data: any }) => void) => void; removeEventListener: (t: 'message', h: (e: { data: any }) => void) => void }
const wv = (): WV | undefined => (window as any).chrome?.webview

export const hasNativeBridge = () => !!wv()

function pick(type: 'pickFolder' | 'pickZip'): Promise<string | null> {
  const w = wv()
  if (!w) return Promise.resolve(null)
  const requestId = crypto.randomUUID()
  return new Promise(resolve => {
    const handler = (e: { data: any }) => {
      if (e.data?.type === 'pickResult' && e.data.requestId === requestId) {
        w.removeEventListener('message', handler)
        resolve(e.data.path ?? null)
      }
    }
    w.addEventListener('message', handler)
    w.postMessage({ type, requestId })
  })
}
export const pickFolder = () => pick('pickFolder')
export const pickZip = () => pick('pickZip')
