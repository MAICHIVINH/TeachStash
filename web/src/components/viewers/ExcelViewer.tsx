import { useEffect, useState } from 'react'
import * as XLSX from 'xlsx'
import { AlertCircle, Table } from 'lucide-react'
import { Spinner } from '../ui'

interface ExcelViewerProps {
  url: string
  fileName: string
}

const MAX_PREVIEW_ROWS = 500

export function ExcelViewer({ url, fileName: _fileName }: ExcelViewerProps) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [workbook, setWorkbook] = useState<XLSX.WorkBook | null>(null)
  const [activeSheet, setActiveSheet] = useState<string>('')
  const [sheetData, setSheetData] = useState<any[][]>([])
  const [isTruncated, setIsTruncated] = useState(false)

  useEffect(() => {
    let active = true
    setLoading(true)
    setError(null)

    const fetchWorkbook = async () => {
      try {
        const res = await fetch(url, { credentials: 'same-origin' })
        if (!res.ok) throw new Error(`HTTP ${res.status}: Không thể nạp tệp Excel`)
        const buffer = await res.arrayBuffer()
        if (!active) return

        const wb = XLSX.read(buffer, { type: 'array' })
        if (!wb.SheetNames || wb.SheetNames.length === 0) {
          throw new Error('Tệp không chứa bảng tính (sheet) nào.')
        }

        setWorkbook(wb)
        const firstSheet = wb.SheetNames[0]
        setActiveSheet(firstSheet)
        loadSheetData(wb, firstSheet)
      } catch (e: any) {
        if (!active) return
        setError(e?.message ?? 'Lỗi đọc bảng tính Excel')
      } finally {
        if (active) setLoading(false)
      }
    }

    fetchWorkbook()
    return () => {
      active = false
    }
  }, [url])

  const loadSheetData = (wb: XLSX.WorkBook, sheetName: string) => {
    const ws = wb.Sheets[sheetName]
    if (!ws) {
      setSheetData([])
      return
    }
    const rawData: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' })
    if (rawData.length > MAX_PREVIEW_ROWS) {
      setSheetData(rawData.slice(0, MAX_PREVIEW_ROWS))
      setIsTruncated(true)
    } else {
      setSheetData(rawData)
      setIsTruncated(false)
    }
  }

  const handleSelectSheet = (sheetName: string) => {
    if (!workbook || sheetName === activeSheet) return
    setActiveSheet(sheetName)
    loadSheetData(workbook, sheetName)
  }

  if (loading) {
    return (
      <div className="flex min-h-[250px] flex-col items-center justify-center rounded-lg border border-slate-200 bg-slate-50 p-8 dark:border-slate-700 dark:bg-slate-900">
        <Spinner label="Đang đọc bảng tính Excel..." />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex min-h-[200px] flex-col items-center justify-center rounded-lg border border-slate-200 bg-slate-50 p-6 text-center dark:border-slate-700 dark:bg-slate-900">
        <AlertCircle className="mb-2 h-8 w-8 text-amber-500" />
        <p className="text-sm font-medium text-slate-700 dark:text-slate-200">Không thể xem trước tệp Excel</p>
        <p className="mt-1 max-w-md text-xs text-slate-500">{error}</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col rounded-lg border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900">
      {/* Sheet selector tabs */}
      {workbook && workbook.SheetNames.length > 1 && (
        <div className="flex flex-wrap items-center gap-1 border-b border-slate-200 bg-slate-50 px-3 py-1.5 dark:border-slate-700 dark:bg-slate-800/80">
          <Table className="mr-1 h-3.5 w-3.5 text-slate-400" />
          {workbook.SheetNames.map(name => (
            <button
              key={name}
              type="button"
              onClick={() => handleSelectSheet(name)}
              className={`rounded px-2.5 py-1 text-xs font-medium transition ${
                activeSheet === name
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-200 dark:text-slate-300 dark:hover:bg-slate-700'
              }`}
            >
              {name}
            </button>
          ))}
        </div>
      )}

      {/* Grid Table */}
      <div className="max-h-[60vh] overflow-auto">
        {sheetData.length === 0 ? (
          <p className="p-8 text-center text-xs text-slate-400">Sheet này không có dữ liệu.</p>
        ) : (
          <table className="min-w-full border-collapse text-left text-xs">
            <thead>
              <tr className="sticky top-0 z-10 border-b border-slate-300 bg-slate-100 font-semibold text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
                <th className="w-10 border-r border-slate-300 px-2 py-1.5 text-center text-[10px] text-slate-400 dark:border-slate-700">#</th>
                {sheetData[0].map((_, colIdx) => (
                  <th key={colIdx} className="border-r border-slate-200 px-3 py-1.5 dark:border-slate-700">
                    {String.fromCharCode(65 + (colIdx % 26)) + (colIdx >= 26 ? Math.floor(colIdx / 26) : '')}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {sheetData.map((row, rowIdx) => (
                <tr key={rowIdx} className="hover:bg-slate-50 dark:hover:bg-slate-800/60">
                  <td className="border-r border-slate-200 bg-slate-50 px-2 py-1 text-center text-[10px] text-slate-400 dark:border-slate-800 dark:bg-slate-800/40">
                    {rowIdx + 1}
                  </td>
                  {row.map((cell: any, cellIdx: number) => (
                    <td key={cellIdx} className="whitespace-nowrap border-r border-slate-100 px-3 py-1 dark:border-slate-800">
                      {cell != null ? String(cell) : ''}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {isTruncated && (
        <div className="border-t border-slate-200 bg-amber-50 px-3 py-1.5 text-center text-[11px] text-amber-700 dark:border-slate-700 dark:bg-amber-950/40 dark:text-amber-300">
          Chỉ hiển thị {MAX_PREVIEW_ROWS} hàng đầu tiên để tối ưu hiệu năng. Vui lòng mở tệp hoặc tải về để xem đầy đủ.
        </div>
      )}
    </div>
  )
}
