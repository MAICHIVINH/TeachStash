import { useState, useMemo } from 'react'
import {
  Download,
  FileText,
  CheckCircle2,
  ListChecks,
  Code2,
  Sparkles,
  HelpCircle
} from 'lucide-react'
import { Modal, Button, Field, inputCls, cx } from '../../components/ui'
import { useApp } from '../../stores/appStore'
import { exportWorksheetToDocx } from '../../utils/docxWorksheetGenerator'
import type { Exercise } from '../../types'

interface WorksheetExportModalProps {
  exercises: Exercise[]
  onClose: () => void
}

const TITLE_PRESETS = [
  'PHIẾU BÀI TẬP',
  'PHIẾU HỌC TẬP',
  'BÀI TẬP VỀ NHÀ',
  'PHIẾU ÔN TẬP'
]

export function WorksheetExportModal({ exercises, onClose }: WorksheetExportModalProps) {
  const { toast } = useApp()

  // Thống kê phân loại bài tập
  const stats = useMemo(() => {
    const mcq = exercises.filter(e => e.exerciseType === 1 || Boolean(e.optionA || e.optionB)).length
    const essay = exercises.length - mcq
    return { total: exercises.length, mcq, essay }
  }, [exercises])

  // Lấy gợi ý khối lớp từ bài tập đã chọn
  const defaultGrade = useMemo(() => {
    const g = exercises.find(e => e.gradeLevelId)?.gradeLevelId
    return g ? `Khối ${g}` : ''
  }, [exercises])

  const [title, setTitle] = useState('PHIẾU BÀI TẬP')
  const [schoolName, setSchoolName] = useState('TRƯỜNG THPT .................................')
  const [subjectName, setSubjectName] = useState('TIN HỌC')
  const [className, setClassName] = useState(defaultGrade)
  const [duration, setDuration] = useState<string>('45')
  const [ruledLinesCount, setRuledLinesCount] = useState(6)
  const [ruledLineStyle, setRuledLineStyle] = useState<'dots' | 'solid'>('dots')
  const [includeAnswerKey, setIncludeAnswerKey] = useState(true)
  const [exporting, setExporting] = useState(false)

  const handleExport = async () => {
    if (exercises.length === 0) {
      toast('error', 'Chưa có bài tập nào được chọn')
      return
    }

    setExporting(true)
    try {
      await exportWorksheetToDocx({
        title: title.trim() || 'PHIẾU BÀI TẬP',
        schoolName: schoolName.trim(),
        subjectName: subjectName.trim() || 'TIN HỌC',
        className: className.trim(),
        durationMinutes: duration ? Number(duration) : null,
        ruledLinesCount,
        ruledLineStyle,
        includeAnswerKey,
        exercises
      })
      toast('success', `Đã xuất thành công phiếu bài tập gồm ${exercises.length} câu ra file Word!`)
      onClose()
    } catch (e: any) {
      toast('error', 'Lỗi xuất file Word: ' + (e?.message || String(e)))
    } finally {
      setExporting(false)
    }
  }

  return (
    <Modal
      title="Xuất phiếu bài tập / Phiếu học tập ra Word (.docx)"
      onRequestClose={onClose}
      wide="lg"
      footer={
        <div className="flex items-center justify-between w-full">
          <div className="text-xs text-slate-500">
            Khổ A4 Dọc · Times New Roman · Căn lề 20mm
          </div>
          <div className="flex items-center gap-2">
            <Button variant="secondary" onClick={onClose} disabled={exporting}>
              Hủy
            </Button>
            <Button variant="primary" onClick={handleExport} loading={exporting}>
              <Download className="h-4 w-4" />
              Tải file Word (.docx)
            </Button>
          </div>
        </div>
      }
    >
      <div className="space-y-4">
        {/* Banner tóm tắt bài tập đã chọn */}
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-indigo-100 bg-indigo-50/60 p-3 text-xs text-indigo-900 dark:border-indigo-900/60 dark:bg-indigo-950/40 dark:text-indigo-200">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-600 text-white font-bold text-sm shadow-xs">
              {stats.total}
            </span>
            <div>
              <div className="font-semibold text-slate-800 dark:text-slate-100">
                Đã chọn {stats.total} bài tập để xuất phiếu
              </div>
              <div className="text-slate-500 dark:text-slate-400">
                Gồm: <strong className="text-indigo-600 dark:text-indigo-400">{stats.mcq} trắc nghiệm</strong> và{' '}
                <strong className="text-purple-600 dark:text-purple-400">{stats.essay} tự luận</strong>
              </div>
            </div>
          </div>

          <div className="text-right">
            <span className="inline-flex items-center rounded-full bg-white px-2.5 py-1 text-[11px] font-medium text-slate-700 shadow-2xs border border-indigo-200/60 dark:bg-slate-900 dark:text-slate-300 dark:border-slate-700">
              {stats.mcq > 0 && stats.essay > 0
                ? 'Tự động chia 2 phần (Trắc nghiệm + Tự luận)'
                : stats.mcq > 0
                ? 'Định dạng phiếu 100% Trắc nghiệm'
                : 'Định dạng phiếu 100% Tự luận'}
            </span>
          </div>
        </div>

        {/* 1. Tiêu đề phiếu */}
        <div>
          <Field label="Tiêu đề phiếu bài tập" required hint="Chọn tiêu đề nhanh hoặc nhập theo ý muốn">
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="VD: PHIẾU BÀI TẬP"
              className={inputCls}
            />
          </Field>
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            {TITLE_PRESETS.map(p => (
              <button
                key={p}
                type="button"
                onClick={() => setTitle(p)}
                className={cx(
                  'rounded-md px-2 py-0.5 text-xs transition border',
                  title === p
                    ? 'bg-indigo-600 text-white border-indigo-600 font-semibold'
                    : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300'
                )}
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        {/* 2. Thông tin lớp & Thời gian */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="Tên lớp / Khối" hint="VD: 11A1, 10A2, hoặc Khối 11">
            <input
              type="text"
              value={className}
              onChange={e => setClassName(e.target.value)}
              placeholder="VD: 11A1"
              className={inputCls}
            />
          </Field>

          <Field label="Thời gian làm bài" hint="Số phút làm bài (để trống nếu không giới hạn)">
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={0}
                max={180}
                value={duration}
                onChange={e => setDuration(e.target.value)}
                placeholder="45"
                className={inputCls}
              />
              <span className="text-xs text-slate-500 whitespace-nowrap">phút</span>
            </div>
          </Field>
        </div>

        {/* 3. Tùy chọn cho bài Tự luận (nếu có bài tự luận) */}
        {stats.essay > 0 && (
          <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-3.5 space-y-3 dark:border-slate-800 dark:bg-slate-900/40">
            <div className="text-xs font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
              <Code2 className="h-4 w-4 text-purple-600 dark:text-purple-400" />
              Định dạng dòng kẻ làm bài cho {stats.essay} câu tự luận
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
                  Số dòng kẻ dưới mỗi bài: <strong className="text-indigo-600">{ruledLinesCount} dòng</strong>
                </label>
                <div className="flex items-center gap-1.5">
                  {[4, 6, 8, 10, 12].map(n => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setRuledLinesCount(n)}
                      className={cx(
                        'flex-1 rounded-md py-1 text-xs font-medium border transition',
                        ruledLinesCount === n
                          ? 'border-indigo-600 bg-indigo-50 font-bold text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300'
                          : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300'
                      )}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
                  Kiểu dòng kẻ
                </label>
                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    type="button"
                    onClick={() => setRuledLineStyle('dots')}
                    className={cx(
                      'rounded-md px-2 py-1 text-xs font-medium border text-center transition',
                      ruledLineStyle === 'dots'
                        ? 'border-indigo-600 bg-indigo-50 font-bold text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300'
                        : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300'
                    )}
                  >
                    Dòng chấm ly (....)
                  </button>
                  <button
                    type="button"
                    onClick={() => setRuledLineStyle('solid')}
                    className={cx(
                      'rounded-md px-2 py-1 text-xs font-medium border text-center transition',
                      ruledLineStyle === 'solid'
                        ? 'border-indigo-600 bg-indigo-50 font-bold text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300'
                        : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300'
                    )}
                  >
                    Kẻ gạch mờ (—)
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 4. Tùy chọn Trang đáp án cho giáo viên */}
        <div className="rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900">
          <label className="flex items-start gap-2.5 cursor-pointer">
            <input
              type="checkbox"
              checked={includeAnswerKey}
              onChange={e => setIncludeAnswerKey(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
            />
            <div className="text-xs">
              <span className="font-semibold text-slate-800 dark:text-slate-200">
                Tự động ngắt trang và kèm Trang Đáp án & Lời giải ở cuối file
              </span>
              <p className="text-slate-500 dark:text-slate-400 mt-0.5">
                Bao gồm bảng đáp án trắc nghiệm chuẩn và gợi ý/lời giải chi tiết bài tự luận để giáo viên lưu hồ sơ hoặc chấm bài.
              </p>
            </div>
          </label>
        </div>
      </div>
    </Modal>
  )
}

