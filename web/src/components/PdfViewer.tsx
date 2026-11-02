import { useEffect, useRef, useState } from 'react'
import * as pdfjs from 'pdfjs-dist'
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'
import { Spinner, ErrorState } from './ui'

pdfjs.GlobalWorkerOptions.workerSrc = workerUrl

/** Xem PDF trực tiếp bằng PDF.js (hoạt động offline), vẽ lần lượt từng trang lên canvas. */
export function PdfViewer({ url }: { url: string }) {
  const host = useRef<HTMLDivElement>(null)
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading')
  const [info, setInfo] = useState('')
  const [err, setErr] = useState('')

  useEffect(() => {
    let cancelled = false
    const task = pdfjs.getDocument({ url, withCredentials: true, isEvalSupported: false })
    ;(async () => {
      try {
        const pdf = await task.promise
        if (cancelled) return
        setInfo(`${pdf.numPages} trang`)
        setState('ready')
        const el = host.current!
        el.innerHTML = ''
        const width = Math.max(300, el.clientWidth - 24)
        const limit = Math.min(pdf.numPages, 300)
        for (let n = 1; n <= limit; n++) {
          const page = await pdf.getPage(n)
          if (cancelled) return
          const base = page.getViewport({ scale: 1 })
          const scale = Math.min(2, width / base.width)
          const vp = page.getViewport({ scale: scale * (window.devicePixelRatio || 1) })
          const canvas = document.createElement('canvas')
          canvas.width = vp.width; canvas.height = vp.height
          canvas.style.width = `${vp.width / (window.devicePixelRatio || 1)}px`
          canvas.className = 'mx-auto mb-3 block bg-white shadow'
          el.appendChild(canvas)
          await page.render({ canvasContext: canvas.getContext('2d')!, viewport: vp }).promise
        }
      } catch (e) {
        if (!cancelled) { setErr(e instanceof Error ? e.message : 'Không mở được PDF.'); setState('error') }
      }
    })()
    return () => { cancelled = true; task.destroy() }
  }, [url])

  if (state === 'error') return <ErrorState message={`Không thể hiển thị PDF: ${err}`} />
  return (
    <div>
      {state === 'loading' && <Spinner label="Đang mở PDF..." />}
      {info && <p className="mb-2 text-xs text-slate-500">{info}</p>}
      <div ref={host} className="max-h-[65vh] overflow-auto rounded-lg bg-slate-200 p-3 dark:bg-slate-800" />
    </div>
  )
}
