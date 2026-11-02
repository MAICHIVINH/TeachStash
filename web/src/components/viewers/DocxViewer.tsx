import { useEffect, useRef, useState } from 'react'
import { renderAsync } from 'docx-preview'
import { AppWindow, AlertCircle } from 'lucide-react'
import { Button, Spinner } from '../ui'

interface DocxViewerProps {
  url: string
  fileName: string
  onOpenExternal?: () => void
}

export function DocxViewer({ url, fileName: _fileName, onOpenExternal }: DocxViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    setLoading(true)
    setError(null)

    const fetchAndRender = async () => {
      try {
        const res = await fetch(url, { credentials: 'same-origin' })
        if (!res.ok) throw new Error(`HTTP ${res.status}: Không thể nạp tệp Word`)
        const buffer = await res.arrayBuffer()
        if (!active) return

        if (containerRef.current) {
          containerRef.current.innerHTML = ''
          await renderAsync(buffer, containerRef.current, undefined, {
            inWrapper: true,
            ignoreWidth: false,
            ignoreHeight: false,
            breakPages: true
          })
        }
      } catch (e: any) {
        if (!active) return
        setError(e?.message ?? 'Lỗi giải mã tài liệu Word')
      } finally {
        if (active) setLoading(false)
      }
    }

    fetchAndRender()
    return () => {
      active = false
    }
  }, [url])

  return (
    <div className="flex flex-col rounded-lg border border-slate-200 bg-slate-100 dark:border-slate-700 dark:bg-slate-900">
      {loading && (
        <div className="flex min-h-[300px] flex-col items-center justify-center p-8">
          <Spinner label="Đang phân tích và nạp tài liệu Word..." />
        </div>
      )}

      {error && (
        <div className="flex min-h-[220px] flex-col items-center justify-center p-6 text-center">
          <AlertCircle className="mb-2 h-8 w-8 text-amber-500" />
          <p className="text-sm font-medium text-slate-700 dark:text-slate-200">Không thể xem trước tệp Word này trực tiếp</p>
          <p className="mt-1 max-w-md text-xs text-slate-500">{error} (Tệp có thể đã được đặt mật khẩu hoặc chứa định dạng đặc thù).</p>
          {onOpenExternal && (
            <Button size="sm" className="mt-4" onClick={onOpenExternal}>
              <AppWindow className="mr-1 h-3.5 w-3.5" />
              Mở bằng Word trên máy
            </Button>
          )}
        </div>
      )}

      <div
        ref={containerRef}
        className={`max-h-[70vh] overflow-auto p-4 [&_.docx-wrapper]:bg-transparent [&_.docx]:mx-auto [&_.docx]:shadow-md [&_.docx]:text-slate-900 ${
          loading || error ? 'hidden' : 'block'
        }`}
      />
    </div>
  )
}
