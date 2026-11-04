import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Check,
  CheckCircle2,
  ChevronRight,
  Download,
  FileSpreadsheet,
  FileText,
  HelpCircle,
  Layers,
  Lightbulb,
  Plus,
  RefreshCw,
  Save,
  Shuffle,
  Trash2,
  X,
} from 'lucide-react'
import { api } from '../services/api'
import { useApp } from '../stores/appStore'
import { Badge, Button, CustomSelect, Field, Modal, Spinner, cx, inputCls } from '../components/ui'
import type { ExamMatrixTemplate, Exercise } from '../types'
import { DIFFICULTIES, DIFFICULTY_STYLE } from '../utils/format'
import {
  downloadExamZip,
  generateShuffledExamCodes,
  shuffleArray,
  type GeneratedExamCode,
} from '../utils/docxExamGenerator'

interface TopicCell {
  mcq: { 1: number; 2: number; 3: number; 4: number }
  essay: { 1: number; 2: number; 3: number; 4: number }
}

const DEFAULT_CELL: TopicCell = {
  mcq: { 1: 0, 2: 0, 3: 0, 4: 0 },
  essay: { 1: 0, 2: 0, 3: 0, 4: 0 },
}

export default function ExamGeneratorPage() {
  const { lookups, toast, confirm } = useApp()
  const nav = useNavigate()

  // Wizard Step: 1: Ma trận, 2: Xem trước đề gốc & Đổi câu, 3: Trộn đề & Tải ZIP
  const [step, setStep] = useState<1 | 2 | 3>(1)

  // Thông tin tiêu đề đề thi
  const [headerSchool, setHeaderSchool] = useState('Trường THPT .................................')
  const [headerExamName, setHeaderExamName] = useState('ĐỀ KIỂM TRA ĐỊNH KỲ GIỮA KỲ 1')
  const [gradeLevelId, setGradeLevelId] = useState<number>(11)
  const [durationMinutes, setDurationMinutes] = useState(45)
  const [codeCount, setCodeCount] = useState<number>(4) // 1, 2, 4, 8

  // Ma trận theo Topic: Record<topicId, TopicCell>
  const [matrix, setMatrix] = useState<Record<number, TopicCell>>({})

  // Dữ liệu câu hỏi lấy từ ngân hàng
  const [allExercises, setAllExercises] = useState<Exercise[]>([])
  const [loadingExercises, setLoadingExercises] = useState(false)

  // Mẫu ma trận đã lưu
  const [templates, setTemplates] = useState<ExamMatrixTemplate[]>([])
  const [showTemplateModal, setShowTemplateModal] = useState(false)
  const [showSaveTemplateModal, setShowSaveTemplateModal] = useState(false)
  const [newTemplateName, setNewTemplateName] = useState('')

  // Đề gốc được bốc ở Bước 2
  const [baseMcq, setBaseMcq] = useState<Exercise[]>([])
  const [baseEssay, setBaseEssay] = useState<Exercise[]>([])

  // Các mã đề được trộn ở Bước 3
  const [generatedCodes, setGeneratedCodes] = useState<GeneratedExamCode[]>([])
  const [downloadingZip, setDownloadingZip] = useState(false)

  // Load câu hỏi theo khối lớp đã chọn
  useEffect(() => {
    let ignore = false
    setLoadingExercises(true)
    api.exercises({ gradeLevelId, pageSize: 200 })
      .then(res => {
        if (!ignore) setAllExercises(res.items)
      })
      .catch(() => {})
      .finally(() => {
        if (!ignore) setLoadingExercises(false)
      })
    return () => { ignore = true }
  }, [gradeLevelId])

  // Load danh sách mẫu ma trận
  useEffect(() => {
    api.examMatrixTemplates(gradeLevelId).then(setTemplates).catch(() => {})
  }, [gradeLevelId])

  // Danh sách chủ đề thuộc khối đã chọn
  const topicsForGrade = useMemo(() => {
    if (!lookups?.topics) return []
    return lookups.topics.filter(t => t.gradeLevelId === gradeLevelId)
  }, [lookups, gradeLevelId])

  // Cập nhật giá trị ô ma trận
  const updateMatrixCell = (
    topicId: number,
    kind: 'mcq' | 'essay',
    diff: 1 | 2 | 3 | 4,
    val: number
  ) => {
    const num = Math.max(0, isNaN(val) ? 0 : val)
    setMatrix(prev => {
      const current = prev[topicId] || JSON.parse(JSON.stringify(DEFAULT_CELL))
      return {
        ...prev,
        [topicId]: {
          ...current,
          [kind]: {
            ...current[kind],
            [diff]: num,
          },
        },
      }
    })
  }

  // Đếm số câu hỏi sẵn có trong ngân hàng theo ô
  const countAvailable = (topicId: number, kind: 'mcq' | 'essay', diff: number) => {
    return allExercises.filter(e => {
      if (e.topicId !== topicId || e.difficulty !== diff) return false
      const isMcq = e.exerciseType === 1 || Boolean(e.optionA || e.optionB)
      return kind === 'mcq' ? isMcq : !isMcq
    }).length
  }

  // Tính tổng số câu hỏi theo ma trận
  const summary = useMemo(() => {
    let totalMcq = 0
    let totalEssay = 0
    const topicSummaries: {
      topicId: number
      topicName: string
      recognize: number
      understand: number
      apply: number
      advanced: number
      total: number
    }[] = []

    topicsForGrade.forEach(t => {
      const cell = matrix[t.id] || DEFAULT_CELL
      const rec = (cell.mcq[1] || 0) + (cell.essay[1] || 0)
      const und = (cell.mcq[2] || 0) + (cell.essay[2] || 0)
      const app = (cell.mcq[3] || 0) + (cell.essay[3] || 0)
      const adv = (cell.mcq[4] || 0) + (cell.essay[4] || 0)
      const sum = rec + und + app + adv

      totalMcq += (cell.mcq[1] || 0) + (cell.mcq[2] || 0) + (cell.mcq[3] || 0) + (cell.mcq[4] || 0)
      totalEssay += (cell.essay[1] || 0) + (cell.essay[2] || 0) + (cell.essay[3] || 0) + (cell.essay[4] || 0)

      if (sum > 0) {
        topicSummaries.push({
          topicId: t.id,
          topicName: t.name,
          recognize: rec,
          understand: und,
          apply: app,
          advanced: adv,
          total: sum,
        })
      }
    })

    return {
      totalMcq,
      totalEssay,
      totalQuestions: totalMcq + totalEssay,
      topicSummaries,
    }
  }, [matrix, topicsForGrade])

  // Lưu ma trận hiện tại thành Template mẫu
  const handleSaveTemplate = async () => {
    if (!newTemplateName.trim()) {
      toast('error', 'Vui lòng nhập tên mẫu ma trận.')
      return
    }
    try {
      const saved = await api.saveExamMatrixTemplate(null, {
        name: newTemplateName.trim(),
        gradeLevelId,
        durationMinutes,
        totalScore: 10.0,
        headerSchool,
        headerExamName,
        matrixDataJson: JSON.stringify(matrix),
      })
      setTemplates(prev => [saved, ...prev])
      setShowSaveTemplateModal(false)
      setNewTemplateName('')
      toast('success', 'Đã lưu mẫu ma trận thành công.')
    } catch {
      toast('error', 'Không thể lưu mẫu ma trận.')
    }
  }

  // Tải mẫu ma trận đã lưu
  const handleApplyTemplate = (tmpl: ExamMatrixTemplate) => {
    try {
      const parsed = JSON.parse(tmpl.matrixDataJson)
      setMatrix(parsed)
      if (tmpl.headerSchool) setHeaderSchool(tmpl.headerSchool)
      if (tmpl.headerExamName) setHeaderExamName(tmpl.headerExamName)
      if (tmpl.durationMinutes) setDurationMinutes(tmpl.durationMinutes)
      setShowTemplateModal(false)
      toast('success', `Đã áp dụng mẫu: ${tmpl.name}`)
    } catch {
      toast('error', 'Dữ liệu mẫu ma trận không hợp lệ.')
    }
  }

  // Xóa mẫu ma trận
  const handleDeleteTemplate = async (id: number) => {
    if (!(await confirm('Bạn có chắc muốn xóa mẫu ma trận này?'))) return
    try {
      await api.deleteExamMatrixTemplate(id)
      setTemplates(prev => prev.filter(t => t.id !== id))
      toast('success', 'Đã xóa mẫu.')
    } catch {
      toast('error', 'Không thể xóa mẫu.')
    }
  }

  // Bốc câu hỏi tự động và chuyển sang Bước 2
  const handleProceedToPreview = () => {
    if (summary.totalQuestions === 0) {
      toast('error', 'Vui lòng nhập số lượng câu hỏi trong bảng ma trận.')
      return
    }

    const pickedMcq: Exercise[] = []
    const pickedEssay: Exercise[] = []
    const missingWarnings: string[] = []

    topicsForGrade.forEach(t => {
      const cell = matrix[t.id] || DEFAULT_CELL

      // Bốc Trắc nghiệm cho từng mức độ 1..4
      for (let d = 1; d <= 4; d++) {
        const required = cell.mcq[d as 1 | 2 | 3 | 4] || 0
        if (required > 0) {
          const candidates = allExercises.filter(
            e => e.topicId === t.id && e.difficulty === d && (e.exerciseType === 1 || Boolean(e.optionA || e.optionB))
          )
          const shuffled = shuffleArray(candidates)
          const selected = shuffled.slice(0, required)
          pickedMcq.push(...selected)

          if (selected.length < required) {
            missingWarnings.push(
              `Chủ đề "${t.name}" mức ${DIFFICULTIES[d]}: Cần ${required} câu trắc nghiệm nhưng ngân hàng chỉ có ${selected.length} câu.`
            )
          }
        }
      }

      // Bốc Tự luận cho từng mức độ 1..4
      for (let d = 1; d <= 4; d++) {
        const required = cell.essay[d as 1 | 2 | 3 | 4] || 0
        if (required > 0) {
          const candidates = allExercises.filter(
            e => e.topicId === t.id && e.difficulty === d && e.exerciseType === 2 && !e.optionA && !e.optionB
          )
          const shuffled = shuffleArray(candidates)
          const selected = shuffled.slice(0, required)
          pickedEssay.push(...selected)

          if (selected.length < required) {
            missingWarnings.push(
              `Chủ đề "${t.name}" mức ${DIFFICULTIES[d]}: Cần ${required} câu tự luận nhưng ngân hàng chỉ có ${selected.length} câu.`
            )
          }
        }
      }
    })

    if (missingWarnings.length > 0) {
      toast('error', missingWarnings[0])
    }

    setBaseMcq(pickedMcq)
    setBaseEssay(pickedEssay)
    setStep(2)
  }

  // Đổi câu hỏi (Swap) trong Bước 2
  const handleSwapQuestion = (currentEx: Exercise, kind: 'mcq' | 'essay') => {
    const isMcq = kind === 'mcq'
    const currentPool = isMcq ? baseMcq : baseEssay

    // Tìm các câu hỏi cùng Topic, cùng Difficulty nhưng chưa được bốc
    const candidates = allExercises.filter(e => {
      if (e.topicId !== currentEx.topicId || e.difficulty !== currentEx.difficulty) return false
      const exIsMcq = e.exerciseType === 1 || Boolean(e.optionA || e.optionB)
      if (isMcq !== exIsMcq) return false
      return !currentPool.some(picked => picked.id === e.id)
    })

    if (candidates.length === 0) {
      toast('info', 'Đã hết câu hỏi khác trong ngân hàng có cùng chủ đề và mức độ nhận thức này.')
      return
    }

    // Chọn ngẫu nhiên 1 câu khác
    const replacement = candidates[Math.floor(Math.random() * candidates.length)]

    if (isMcq) {
      setBaseMcq(prev => prev.map(q => (q.id === currentEx.id ? replacement : q)))
    } else {
      setBaseEssay(prev => prev.map(q => (q.id === currentEx.id ? replacement : q)))
    }

    toast('success', `Đã đổi sang câu hỏi: "${replacement.title}"`)
  }

  // Chuyển sang Bước 3: Trộn đề & Sinh các mã đề
  const handleGenerateCodes = () => {
    const testCodes = codeCount === 1
      ? ['101']
      : codeCount === 2
      ? ['101', '102']
      : codeCount === 4
      ? ['101', '102', '103', '104']
      : ['101', '102', '103', '104', '105', '106', '107', '108']

    const codes = generateShuffledExamCodes(baseMcq, baseEssay, testCodes)
    setGeneratedCodes(codes)
    setStep(3)
  }

  // Tải gói ZIP về máy
  const handleDownloadZip = async () => {
    setDownloadingZip(true)
    try {
      const gradeName = `Lớp ${gradeLevelId}`
      await downloadExamZip(
        {
          headerSchool,
          headerExamName,
          gradeName,
          durationMinutes,
          totalScore: 10.0,
          codes: generatedCodes,
          matrixSummary: summary.topicSummaries,
        },
        `De_Kiem_Tra_${gradeName.replace(/\s+/g, '_')}_${generatedCodes.length}_MaDe.zip`
      )
      toast('success', 'Đã tải về gói đề thi (.zip) thành công!')
    } catch (err) {
      toast('error', 'Có lỗi khi xuất file đề thi.')
    } finally {
      setDownloadingZip(false)
    }
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 pb-12">
      {/* Thanh Header Điều Hướng & Breadcrumb */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-xs font-medium text-slate-500 dark:text-slate-400">
            <Link to="/documents?type=4" className="hover:text-indigo-600 dark:hover:text-indigo-400">
              Đề kiểm tra
            </Link>
            <ChevronRight className="h-3 w-3" />
            <span className="text-slate-800 dark:text-slate-200">Trộn đề theo Ma trận GDPT 2018</span>
          </div>
          {/* <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Tạo & Trộn Đề Kiểm Tra Tự Động
          </h1> */}
        </div>

        {/* Thanh Stepper 3 bước */}
        <div className="flex items-center gap-1 rounded-xl bg-slate-100 p-1 dark:bg-slate-800/80">
          {[
            { s: 1, label: '1. Ma trận đề' },
            { s: 2, label: '2. Xem trước' },
            { s: 3, label: '3. Trộn và Xuất ZIP' },
          ].map(it => (
            <button
              key={it.s}
              onClick={() => {
                if (it.s < step) setStep(it.s as 1 | 2 | 3)
              }}
              disabled={it.s > step}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                step === it.s
                  ? 'bg-indigo-600 text-white shadow'
                  : it.s < step
                  ? 'text-indigo-600 hover:bg-slate-200 dark:text-indigo-400 dark:hover:bg-slate-700'
                  : 'text-slate-400 dark:text-slate-500 cursor-not-allowed'
              }`}
            >
              {it.label}
            </button>
          ))}
        </div>
      </div>

      {/* ==================== BƯỚC 1: THIẾT LẬP MA TRẬN ==================== */}
      {step === 1 && (
        <div className="space-y-6">
          {/* Cấu hình chung của đề thi */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4 dark:border-slate-800">
              <h2 className="text-base font-semibold text-slate-800 dark:text-slate-100">
                1. Thông tin Tiêu đề & Cấu hình Đề thi
              </h2>
              <div className="flex items-center gap-2">
                <Button size="sm" onClick={() => setShowTemplateModal(true)}>
                  <BookOpen className="h-3.5 w-3.5" />
                  Mẫu ma trận ({templates.length})
                </Button>
                <Button size="sm" variant="primary" onClick={() => setShowSaveTemplateModal(true)}>
                  <Save className="h-3.5 w-3.5" />
                  Lưu ma trận thành mẫu
                </Button>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Field label="Tên Trường / Đơn vị">
                <input
                  className={inputCls}
                  value={headerSchool}
                  onChange={e => setHeaderSchool(e.target.value)}
                  placeholder="Ví dụ: TRƯỜNG THPT NGUYỄN TRÃI"
                />
              </Field>

              <Field label="Tên Kỳ kiểm tra">
                <input
                  className={inputCls}
                  value={headerExamName}
                  onChange={e => setHeaderExamName(e.target.value)}
                  placeholder="Ví dụ: ĐỀ KIỂM TRA ĐỊNH KỲ GIỮA HỌC KỲ 1"
                />
              </Field>

              <Field label="Khối lớp">
                <select
                  className={inputCls}
                  value={gradeLevelId}
                  onChange={e => {
                    const g = Number(e.target.value)
                    setGradeLevelId(g)
                    setMatrix({})
                  }}
                >
                  <option value={10}>Tin học 10</option>
                  <option value={11}>Tin học 11</option>
                  <option value={12}>Tin học 12</option>
                </select>
              </Field>

              <div className="grid grid-cols-2 gap-2">
                <Field label="Thời gian">
                  <select
                    className={inputCls}
                    value={durationMinutes}
                    onChange={e => setDurationMinutes(Number(e.target.value))}
                  >
                    <option value={15}>15 phút</option>
                    <option value={45}>45 phút</option>
                    <option value={60}>60 phút</option>
                    <option value={90}>90 phút</option>
                  </select>
                </Field>

                <Field label="Số mã đề">
                  <select
                    className={inputCls}
                    value={codeCount}
                    onChange={e => setCodeCount(Number(e.target.value))}
                  >
                    <option value={1}>1 mã (101)</option>
                    <option value={2}>2 mã đề</option>
                    <option value={4}>4 mã đề</option>
                    <option value={8}>8 mã đề</option>
                  </select>
                </Field>
              </div>
            </div>
          </div>

          {/* Bảng Ma trận câu hỏi */}
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="border-b border-slate-100 bg-slate-50/50 p-4 dark:border-slate-800 dark:bg-slate-800/40">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="font-semibold text-slate-800 dark:text-slate-100">
                    2. Lưới Ma trận phân bổ theo Mức độ nhận thức (GDPT 2018)
                  </h3>
                  <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                    Điền số câu hỏi Trắc nghiệm và Tự luận tương ứng cho từng chủ đề kiến thức.
                  </p>
                </div>
                <div className="flex items-center gap-3 text-xs font-semibold">
                  <span className="rounded-lg bg-sky-50 px-2.5 py-1 text-sky-700 dark:bg-sky-950/60 dark:text-sky-300">
                    Trắc nghiệm: {summary.totalMcq} câu
                  </span>
                  <span className="rounded-lg bg-purple-50 px-2.5 py-1 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300">
                    Tự luận: {summary.totalEssay} câu
                  </span>
                  <span className="rounded-lg bg-indigo-600 px-3 py-1 text-white shadow-sm">
                    Tổng: {summary.totalQuestions} câu
                  </span>
                </div>
              </div>
            </div>

            {loadingExercises ? (
              <div className="flex items-center justify-center p-12">
                <Spinner />
              </div>
            ) : topicsForGrade.length === 0 ? (
              <div className="p-8 text-center text-sm text-slate-500">
                Chưa có chủ đề nào cho khối lớp này. Vui lòng vào Cài đặt để thêm chủ đề.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100/70 text-slate-600 dark:bg-slate-800/80 dark:text-slate-300">
                    <tr>
                      <th className="py-2.5 px-3 font-semibold" rowSpan={2}>Chủ đề / Đơn vị kiến thức</th>
                      <th className="py-2 px-2 text-center font-semibold bg-sky-100/50 text-sky-800 dark:bg-sky-950/30 dark:text-sky-300" colSpan={4}>
                        PHẦN I. TRẮC NGHIỆM KHÁCH QUAN (Số câu)
                      </th>
                      <th className="py-2 px-2 text-center font-semibold bg-purple-100/50 text-purple-800 dark:bg-purple-950/30 dark:text-purple-300" colSpan={4}>
                        PHẦN II. TỰ LUẬN / LẬP TRÌNH (Số câu)
                      </th>
                    </tr>
                    <tr className="border-t border-slate-200 dark:border-slate-700 text-[11px]">
                      <th className="p-1.5 text-center text-emerald-600 font-medium">Nhận biết</th>
                      <th className="p-1.5 text-center text-sky-600 font-medium">Thông hiểu</th>
                      <th className="p-1.5 text-center text-amber-600 font-medium">Vận dụng</th>
                      <th className="p-1.5 text-center text-rose-600 font-medium">Vận dụng cao</th>

                      <th className="p-1.5 text-center text-emerald-600 font-medium">Nhận biết</th>
                      <th className="p-1.5 text-center text-sky-600 font-medium">Thông hiểu</th>
                      <th className="p-1.5 text-center text-amber-600 font-medium">Vận dụng</th>
                      <th className="p-1.5 text-center text-rose-600 font-medium">Vận dụng cao</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {topicsForGrade.map(topic => {
                      const cell = matrix[topic.id] || DEFAULT_CELL
                      return (
                        <tr key={topic.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
                          <td className="py-2.5 px-3 font-medium text-slate-800 dark:text-slate-200 max-w-[240px] truncate" title={topic.name}>
                            {topic.name}
                          </td>

                          {/* 4 mức độ MCQ */}
                          {[1, 2, 3, 4].map(diff => {
                            const val = cell.mcq[diff as 1 | 2 | 3 | 4] || 0
                            const avail = countAvailable(topic.id, 'mcq', diff)
                            return (
                              <td key={`mcq-${diff}`} className="p-1.5 text-center">
                                <div className="flex flex-col items-center">
                                  <input
                                    type="number"
                                    min={0}
                                    className={`w-12 rounded border py-1 text-center font-bold text-xs focus:outline-none ${
                                      val > 0
                                        ? 'border-sky-500 bg-sky-50 text-sky-900 dark:bg-sky-950/60 dark:text-sky-200'
                                        : 'border-slate-200 bg-white text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300'
                                    }`}
                                    value={val || ''}
                                    onChange={e => updateMatrixCell(topic.id, 'mcq', diff as 1 | 2 | 3 | 4, parseInt(e.target.value))}
                                  />
                                  <span className={`text-[10px] ${avail >= val ? 'text-slate-400' : 'text-rose-500 font-bold'}`}>
                                    /{avail}
                                  </span>
                                </div>
                              </td>
                            )
                          })}

                          {/* 4 mức độ Essay */}
                          {[1, 2, 3, 4].map(diff => {
                            const val = cell.essay[diff as 1 | 2 | 3 | 4] || 0
                            const avail = countAvailable(topic.id, 'essay', diff)
                            return (
                              <td key={`essay-${diff}`} className="p-1.5 text-center">
                                <div className="flex flex-col items-center">
                                  <input
                                    type="number"
                                    min={0}
                                    className={`w-12 rounded border py-1 text-center font-bold text-xs focus:outline-none ${
                                      val > 0
                                        ? 'border-purple-500 bg-purple-50 text-purple-900 dark:bg-purple-950/60 dark:text-purple-200'
                                        : 'border-slate-200 bg-white text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300'
                                    }`}
                                    value={val || ''}
                                    onChange={e => updateMatrixCell(topic.id, 'essay', diff as 1 | 2 | 3 | 4, parseInt(e.target.value))}
                                  />
                                  <span className={`text-[10px] ${avail >= val ? 'text-slate-400' : 'text-rose-500 font-bold'}`}>
                                    /{avail}
                                  </span>
                                </div>
                              </td>
                            )
                          })}
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}

            <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50/50 p-4 dark:border-slate-800 dark:bg-slate-800/40">
              <span className="text-xs text-slate-500 dark:text-slate-400">
                Lưu ý: Số màu xám bên dưới ô là số câu hỏi sẵn có trong ngân hàng của bạn.
              </span>
              <Button
                variant="primary"
                onClick={handleProceedToPreview}
                disabled={summary.totalQuestions === 0}
              >
                Xem trước câu hỏi
                {/* <ArrowRight className="h-4 w-4" /> */}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ==================== BƯỚC 2: XEM TRƯỚC & ĐỔI CÂU HỎI ==================== */}
      {step === 2 && (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-indigo-100 bg-indigo-50/40 p-4 dark:border-indigo-900/40 dark:bg-indigo-950/30">
            <div>
              <h2 className="text-base font-semibold text-indigo-900 dark:text-indigo-200">
                Xem trước Đề thi Gốc & Tinh chỉnh câu hỏi
              </h2>
              <p className="mt-0.5 text-xs text-indigo-700 dark:text-indigo-300">
                Đây là tập hợp các câu hỏi được bốc tự động theo đúng ma trận. Thầy/cô có thể bấm nút &quot;Đổi câu khác&quot; để đổi câu hỏi chưa ưng ý.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button onClick={() => setStep(1)}>
                {/* <ArrowLeft className="h-4 w-4" /> */}
                Sửa lại ma trận
              </Button>
              <Button variant="primary" onClick={handleGenerateCodes}>
                Tiến hành Trộn đề ({codeCount} mã đề)
                {/* <ArrowRight className="h-4 w-4" /> */}
              </Button>
            </div>
          </div>

          {/* Phần I: Trắc nghiệm */}
          {baseMcq.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  PHẦN I. TRẮC NGHIỆM KHÁCH QUAN ({baseMcq.length} câu)
                </h3>
              </div>

              <div className="space-y-3">
                {baseMcq.map((ex, idx) => (
                  <div
                    key={ex.id}
                    className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="font-bold text-indigo-600 dark:text-indigo-400">Câu {idx + 1}:</span>
                          <Badge className={DIFFICULTY_STYLE[ex.difficulty]}>{DIFFICULTIES[ex.difficulty]}</Badge>
                          {ex.topicName && <Badge>{ex.topicName}</Badge>}
                        </div>
                        <p className="text-sm font-medium text-slate-800 dark:text-slate-100 whitespace-pre-wrap">
                          {ex.statement}
                        </p>
                      </div>

                      <Button
                        size="sm"
                        onClick={() => handleSwapQuestion(ex, 'mcq')}
                        title="Đổi sang câu hỏi khác cùng chủ đề & mức độ"
                      >
                        <RefreshCw className="h-3 w-3" />
                        Đổi câu khác
                      </Button>
                    </div>

                    {/* 4 phương án A, B, C, D */}
                    <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2 text-xs">
                      {[
                        { k: 'A', t: ex.optionA },
                        { k: 'B', t: ex.optionB },
                        { k: 'C', t: ex.optionC },
                        { k: 'D', t: ex.optionD },
                      ].map(({ k, t }) => {
                        const isCorrect = (ex.correctAnswer || '').toUpperCase() === k
                        return (
                          <div
                            key={k}
                            className={`flex items-start gap-2 rounded-lg border p-2 ${
                              isCorrect
                                ? 'border-emerald-500 bg-emerald-50/70 text-emerald-950 font-semibold dark:border-emerald-500/80 dark:bg-emerald-950/40 dark:text-emerald-200'
                                : 'border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-800 dark:bg-slate-800/50 dark:text-slate-300'
                            }`}
                          >
                            <span className="font-bold">{k}.</span>
                            <span>{t || '(trống)'}</span>
                            {isCorrect && <Check className="ml-auto h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Phần II: Tự luận */}
          {baseEssay.length > 0 && (
            <div className="space-y-3 pt-4">
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                PHẦN II. TỰ LUẬN / VIẾT MÃ NGUỒN ({baseEssay.length} câu)
              </h3>

              <div className="space-y-3">
                {baseEssay.map((ex, idx) => (
                  <div
                    key={ex.id}
                    className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="font-bold text-purple-600 dark:text-purple-400">Câu {idx + 1}:</span>
                          <Badge className={DIFFICULTY_STYLE[ex.difficulty]}>{DIFFICULTIES[ex.difficulty]}</Badge>
                          {ex.topicName && <Badge>{ex.topicName}</Badge>}
                        </div>
                        <p className="text-sm font-medium text-slate-800 dark:text-slate-100 whitespace-pre-wrap">
                          {ex.statement}
                        </p>
                      </div>

                      <Button
                        size="sm"
                        onClick={() => handleSwapQuestion(ex, 'essay')}
                        title="Đổi sang câu hỏi tự luận khác cùng chủ đề"
                      >
                        <RefreshCw className="h-3 w-3" />
                        Đổi câu khác
                      </Button>
                    </div>

                    {ex.solution && (
                      <div className="mt-3 rounded-lg bg-emerald-50 p-2.5 text-xs text-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200">
                        <span className="font-bold">Đáp án gợi ý: </span>
                        {ex.solution}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ==================== BƯỚC 3: TRỘN ĐỀ & XUẤT ZIP ==================== */}
      {step === 3 && (
        <div className="space-y-6">
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-6 text-center dark:border-emerald-900/50 dark:bg-emerald-950/20">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-600 text-white shadow-lg">
              <CheckCircle2 className="h-7 w-7" />
            </div>
            <h2 className="mt-3 text-xl font-bold text-slate-900 dark:text-white">
              Đã Trộn Đề và Tạo Mã Đề Thành Công!
            </h2>
            <p className="mx-auto mt-1 max-w-lg text-xs text-slate-600 dark:text-slate-300">
              Hệ thống đã xáo trộn ngẫu nhiên thứ tự câu hỏi và phương án A/B/C/D cho {generatedCodes.length} mã đề thi: {generatedCodes.map(c => `Mã ${c.code}`).join(', ')}.
            </p>

            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              <Button
                variant="primary"
                loading={downloadingZip}
                onClick={handleDownloadZip}
                className="bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-600 px-5 py-2.5 text-sm"
              >
                <Download className="h-5 w-5" />
                Tải về Gói đề thi (.ZIP)
              </Button>
              <Button onClick={() => setStep(2)}>
                {/* <ArrowLeft className="h-4 w-4" /> */}
                Xem lại câu hỏi gốc
              </Button>
            </div>
          </div>

          {/* Bảng Tra Cứu Đáp Án Soi Chéo Tất Cả Các Mã Đề */}
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="border-b border-slate-100 bg-slate-50/50 p-4 dark:border-slate-800 dark:bg-slate-800/40">
              <h3 className="font-semibold text-slate-800 dark:text-slate-100">
                Bảng Soi Chiếu Đáp Án Trắc Nghiệm Nhanh
              </h3>
              <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                Bảng này cũng được xuất riêng trong file <code className="font-mono text-indigo-600">DapAn_Va_MaTran.docx</code> để giáo viên chấm thi thuận tiện.
              </p>
            </div>

            <div className="overflow-x-auto p-4">
              <table className="w-full text-center text-xs">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-100/70 font-semibold text-slate-700 dark:border-slate-700 dark:bg-slate-800/80 dark:text-slate-200">
                    <th className="py-2.5 px-3">Câu</th>
                    {generatedCodes.map(c => (
                      <th key={c.code} className="py-2.5 px-3">Mã {c.code}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {Array.from({ length: baseMcq.length }).map((_, qIdx) => (
                    <tr key={qIdx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                      <td className="py-2 px-3 font-bold text-slate-500">Câu {qIdx + 1}</td>
                      {generatedCodes.map(c => {
                        const ans = c.mcqQuestions[qIdx]?.correctKey || '-'
                        return (
                          <td key={c.code} className="py-2 px-3 font-bold text-emerald-600 dark:text-emerald-400">
                            {ans}
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Modal Chọn Mẫu Ma Trận */}
      {showTemplateModal && (
        <Modal
          title="Chọn Mẫu Ma Trận Đã Lưu"
          onRequestClose={() => setShowTemplateModal(false)}
          footer={<Button onClick={() => setShowTemplateModal(false)}>Đóng</Button>}
        >
          <div className="space-y-3">
            {templates.length === 0 ? (
              <p className="text-center text-sm text-slate-500 py-6">
                Chưa có mẫu ma trận nào cho khối lớp này.
              </p>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {templates.map(tmpl => (
                  <div
                    key={tmpl.id}
                    className="flex items-center justify-between rounded-xl border border-slate-200 p-3 hover:border-indigo-400 dark:border-slate-800"
                  >
                    <div>
                      <h4 className="font-semibold text-sm text-slate-800 dark:text-slate-100">{tmpl.name}</h4>
                      <p className="text-xs text-slate-400">
                        Thời gian: {tmpl.durationMinutes} phút • Tạo ngày: {new Date(tmpl.createdAt).toLocaleDateString('vi-VN')}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button size="sm" variant="primary" onClick={() => handleApplyTemplate(tmpl)}>
                        Áp dụng
                      </Button>
                      <Button size="sm" variant="danger" onClick={() => handleDeleteTemplate(tmpl.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* Modal Lưu Mẫu Ma Trận Mới */}
      {showSaveTemplateModal && (
        <Modal
          title="Lưu Ma Trận Hiện Tại Thành Mẫu"
          onRequestClose={() => setShowSaveTemplateModal(false)}
          footer={
            <>
              <Button onClick={() => setShowSaveTemplateModal(false)}>Hủy</Button>
              <Button variant="primary" onClick={handleSaveTemplate}>Lưu mẫu</Button>
            </>
          }
        >
          <div className="space-y-4">
            <Field label="Tên Mẫu Ma trận" required>
              <input
                autoFocus
                className={inputCls}
                placeholder="Ví dụ: Đề Kiểm tra Giữa kỳ 1 - Tin 11"
                value={newTemplateName}
                onChange={e => setNewTemplateName(e.target.value)}
              />
            </Field>
            <p className="text-xs text-slate-500">
              Mẫu này sẽ lưu lại tỷ lệ số câu phân bổ theo các chủ đề và mức độ nhận thức để bạn có thể tái sử dụng nhanh chóng cho các năm học tiếp theo.
            </p>
          </div>
        </Modal>
      )}
    </div>
  )
}
