import { useEffect, useState } from 'react'
import JSZip from 'jszip'
import { AlertCircle, AppWindow, Presentation } from 'lucide-react'
import { Button, Spinner } from '../ui'

interface SlideItem {
  index: number
  title: string
  content: string[]
}

interface PptxViewerProps {
  url: string
  fileName: string
  onOpenExternal?: () => void
}

export function PptxViewer({ url, fileName: _fileName, onOpenExternal }: PptxViewerProps) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [slides, setSlides] = useState<SlideItem[]>([])

  useEffect(() => {
    let active = true
    setLoading(true)
    setError(null)

    const parsePptx = async () => {
      try {
        const res = await fetch(url, { credentials: 'same-origin' })
        if (!res.ok) throw new Error(`HTTP ${res.status}: Không thể nạp tệp PowerPoint`)
        const buffer = await res.arrayBuffer()
        if (!active) return

        const zip = await JSZip.loadAsync(buffer)
        const slideFiles = Object.keys(zip.files).filter(f => /^ppt\/slides\/slide\d+\.xml$/i.test(f))

        // Sort slide files numerically slide1.xml, slide2.xml...
        slideFiles.sort((a, b) => {
          const numA = parseInt(a.replace(/\D/g, ''), 10) || 0
          const numB = parseInt(b.replace(/\D/g, ''), 10) || 0
          return numA - numB
        })

        if (slideFiles.length === 0) {
          throw new Error('Tệp không chứa slide bài giảng hợp lệ.')
        }

        const parser = new DOMParser()
        const parsedSlides: SlideItem[] = []

        for (let i = 0; i < slideFiles.length; i++) {
          const fileEntry = zip.files[slideFiles[i]]
          if (!fileEntry) continue
          const xmlText = await fileEntry.async('text')
          const xmlDoc = parser.parseFromString(xmlText, 'application/xml')

          // Extract text runs from paragraphs
          const paragraphs = xmlDoc.getElementsByTagName('a:p')
          const textLines: string[] = []

          for (let pIdx = 0; pIdx < paragraphs.length; pIdx++) {
            const p = paragraphs[pIdx]
            const textNodes = p.getElementsByTagName('a:t')
            let line = ''
            for (let tIdx = 0; tIdx < textNodes.length; tIdx++) {
              line += textNodes[tIdx].textContent ?? ''
            }
            line = line.trim()
            if (line) textLines.push(line)
          }

          const title = textLines.length > 0 ? textLines[0] : `Slide ${i + 1}`
          const content = textLines.length > 1 ? textLines.slice(1) : []

          parsedSlides.push({
            index: i + 1,
            title,
            content
          })
        }

        if (active) setSlides(parsedSlides)
      } catch (e: any) {
        if (!active) return
        setError(e?.message ?? 'Lỗi phân tích tệp trình chiếu PowerPoint')
      } finally {
        if (active) setLoading(false)
      }
    }

    parsePptx()
    return () => {
      active = false
    }
  }, [url])

  if (loading) {
    return (
      <div className="flex min-h-[250px] flex-col items-center justify-center rounded-lg border border-slate-200 bg-slate-50 p-8 dark:border-slate-700 dark:bg-slate-900">
        <Spinner label="Đang trích xuất dàn ý bài giảng PowerPoint..." />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex min-h-[200px] flex-col items-center justify-center rounded-lg border border-slate-200 bg-slate-50 p-6 text-center dark:border-slate-700 dark:bg-slate-900">
        <AlertCircle className="mb-2 h-8 w-8 text-amber-500" />
        <p className="text-sm font-medium text-slate-700 dark:text-slate-200">Không thể xem trước tệp PowerPoint này</p>
        <p className="mt-1 max-w-md text-xs text-slate-500">{error}</p>
        {onOpenExternal && (
          <Button size="sm" className="mt-4" onClick={onOpenExternal}>
            <AppWindow className="mr-1 h-3.5 w-3.5" />
            Mở bằng PowerPoint trên máy
          </Button>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {/* Header action bar */}
      <div className="flex items-center justify-between rounded-lg border border-orange-200 bg-orange-50 px-3 py-2 text-xs text-orange-800 dark:border-orange-900/60 dark:bg-orange-950/40 dark:text-orange-300">
        <div className="flex items-center gap-1.5 font-medium">
          <Presentation className="h-4 w-4" />
          <span>Dàn ý bài giảng: {slides.length} slide</span>
        </div>
        {onOpenExternal && (
          <Button size="sm" onClick={onOpenExternal} className="bg-orange-600 text-white hover:bg-orange-700">
            <AppWindow className="mr-1 h-3.5 w-3.5" />
            Mở trình chiếu đầy đủ
          </Button>
        )}
      </div>

      {/* Slide cards outline */}
      <div className="max-h-[62vh] space-y-2.5 overflow-auto pr-1">
        {slides.map(slide => (
          <div
            key={slide.index}
            className="rounded-lg border border-slate-200 bg-white p-3.5 shadow-sm transition hover:border-orange-300 dark:border-slate-700 dark:bg-slate-900"
          >
            <div className="flex items-center gap-2">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-orange-100 text-[11px] font-bold text-orange-700 dark:bg-orange-950 dark:text-orange-300">
                {slide.index}
              </span>
              <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                {slide.title}
              </h4>
            </div>

            {slide.content.length > 0 && (
              <ul className="mt-2 list-disc space-y-1 pl-7 text-xs text-slate-600 dark:text-slate-300">
                {slide.content.map((line, lIdx) => (
                  <li key={lIdx} className="leading-relaxed">
                    {line}
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
