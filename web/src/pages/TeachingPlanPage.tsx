import { useEffect, useState, useMemo, useCallback, Fragment } from 'react'
import {
  Calendar,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Plus,
  Trash2,
  Pencil,
  FileText,
  Presentation,
  BookOpen,
  Sparkles,
  ExternalLink,
  ChevronDown,
  RefreshCw,
  FolderPlus,
  Check,
  CalendarCheck,
  Bookmark,
  Layers,
  HelpCircle,
  Paperclip,
  Pin,
  X,
  Search,
  Upload,
  FileCheck,
  Download
} from 'lucide-react'
import { api } from '../services/api'
import { useApp, errText } from '../stores/appStore'
import {
  Button,
  CustomSelect,
  EmptyState,
  ErrorState,
  Modal,
  Spinner,
  Badge,
  cx,
  inputCls,
  Field
} from '../components/ui'
import DocumentDetail from '../features/documents/DocumentDetail'
import DocumentForm from '../features/documents/DocumentForm'
import { exportTeachingPlanToDocx } from '../utils/docxTeachingPlanGenerator'
import { parsePeriods, formatPeriodsSummary } from '../utils/format'
import type {
  TeachingClass,
  TeachingScheduleItem,
  TeachingPlanItem,
  TeachingStatus,
  DocumentBrief,
  DocumentItem
} from '../types'

export default function TeachingPlanPage() {
  const { lookups, toast, confirm } = useApp()
  const gradeLevels = lookups?.gradeLevels ?? []

  // Khối lớp đang chọn (mặc định khối 10 hoặc khối đầu tiên)
  const [selectedGradeId, setSelectedGradeId] = useState<number>(() => {
    return gradeLevels[0]?.id ?? 1
  })

  // Danh sách các lớp học thuộc khối
  const [classes, setClasses] = useState<TeachingClass[]>([])
  const [selectedClassId, setSelectedClassId] = useState<number | null>(null)

  // Danh sách tiến độ / lịch dạy của lớp được chọn
  const [scheduleItems, setScheduleItems] = useState<TeachingScheduleItem[]>([])
  const [loadingSchedule, setLoadingSchedule] = useState(false)

  // Lọc học kỳ: 'all' | 'sem1' | 'sem2'
  const [semesterFilter, setSemesterFilter] = useState<'all' | 'sem1' | 'sem2'>('all')

  // Lọc trạng thái dạy: 'all' | 0 | 1 | 2 | 3
  const [statusFilter, setStatusFilter] = useState<string>('all')

  // Modal tạo / sửa lớp học
  const [classModalOpen, setClassModalOpen] = useState(false)
  const [editingClass, setEditingClass] = useState<TeachingClass | null>(null)
  const [classNameInput, setClassNameInput] = useState('')
  const [classYearInput, setClassYearInput] = useState('2024-2025')
  const [savingClass, setSavingClass] = useState(false)

  // Modal thêm / sửa tiết trong Khung PPCT gốc
  const [planItemModalOpen, setPlanItemModalOpen] = useState(false)
  const [editingPlanItem, setEditingPlanItem] = useState<TeachingPlanItem | null>(null)
  const [planForm, setPlanForm] = useState({
    weekNumber: 1,
    periodNumber: 1,
    periodName: '1, 2',
    numberOfPeriods: '2LT',
    equipment: 'SGK, SGV, Máy tính nối mạng, tivi, các clip minh họa.',
    location: 'Phòng học/Phòng máy',
    topicId: 0,
    lessonId: 0,
    title: '',
    note: ''
  })
  const [savingPlanItem, setSavingPlanItem] = useState(false)

  // Xem chi tiết tài liệu (Preview modal)
  const [previewDocId, setPreviewDocId] = useState<number | null>(null)

  // Modal gắn tài liệu thủ công
  const [attachModalItem, setAttachModalItem] = useState<TeachingScheduleItem | null>(null)
  const [attachSearchQ, setAttachSearchQ] = useState('')
  const [attachTypeId, setAttachTypeId] = useState<number | null>(null)
  const [availableDocs, setAvailableDocs] = useState<DocumentItem[]>([])
  const [loadingAttachDocs, setLoadingAttachDocs] = useState(false)

  // Modal tạo tài liệu mới nhanh trực tiếp cho tiết này
  const [newDocModalOpen, setNewDocModalOpen] = useState(false)

  // Đang khởi tạo nhanh từ bài học
  const [generating, setGenerating] = useState(false)

  // Load danh sách lớp khi đổi khối
  useEffect(() => {
    if (!selectedGradeId) return
    loadClasses(selectedGradeId)
  }, [selectedGradeId])

  const loadClasses = async (gradeId: number) => {
    try {
      const clsList = await api.teachingClasses(gradeId)
      setClasses(clsList)
      if (clsList.length > 0) {
        if (!selectedClassId || !clsList.some(c => c.id === selectedClassId)) {
          setSelectedClassId(clsList[0].id)
        }
      } else {
        setSelectedClassId(null)
      }
    } catch (e) {
      toast('error', 'Không thể tải danh sách lớp học: ' + errText(e))
    }
  }

  // Load tiến độ khi chọn lớp
  useEffect(() => {
    if (!selectedClassId) {
      setScheduleItems([])
      return
    }
    loadSchedule(selectedClassId)
  }, [selectedClassId])

  const loadSchedule = async (classId: number) => {
    setLoadingSchedule(true)
    try {
      const items = await api.classSchedule(classId)
      setScheduleItems(items)
    } catch (e) {
      toast('error', 'Lỗi tải tiến độ lớp học: ' + errText(e))
    } finally {
      setLoadingSchedule(false)
    }
  }

  // Tự động khởi tạo 35 tuần từ bài học
  const handleAutoGenerate = async () => {
    const ok = await confirm(
      'Hệ thống sẽ lấy danh sách các chủ đề và bài học của khối hiện tại để tạo tự động 35 tuần giảng dạy theo phân phối chương trình chuẩn. Nếu đã có dữ liệu khung cũ, nội dung sẽ được cập nhật lại.',
      {
        title: 'Khởi tạo khung 35 tuần từ danh mục bài học?',
        confirmText: 'Khởi tạo ngay'
      }
    )
    if (!ok) return

    setGenerating(true)
    try {
      const res = await api.generateTeachingPlanFromLessons(selectedGradeId)
      toast('success', `Đã khởi tạo thành công ${res.count} bài học theo mẫu Công văn 5512!`)
      if (selectedClassId) {
        await loadSchedule(selectedClassId)
      } else {
        await loadClasses(selectedGradeId)
      }
    } catch (e) {
      toast('error', 'Không thể tạo khung: ' + errText(e))
    } finally {
      setGenerating(false)
    }
  }

  // Thao tác Lưu lớp học
  const handleSaveClass = async () => {
    if (!classNameInput.trim()) {
      toast('error', 'Vui lòng nhập tên lớp học (VD: 11A1, 10A2)')
      return
    }
    setSavingClass(true)
    try {
      const saved = await api.saveTeachingClass(editingClass?.id ?? null, {
        name: classNameInput.trim(),
        gradeLevelId: selectedGradeId,
        schoolYear: classYearInput.trim() || '2024-2025'
      })
      toast('success', editingClass ? 'Đã cập nhật lớp học' : 'Đã thêm lớp học mới')
      setClassModalOpen(false)
      await loadClasses(selectedGradeId)
      setSelectedClassId(saved.id)
    } catch (e) {
      toast('error', errText(e))
    } finally {
      setSavingClass(false)
    }
  }

  // Xóa lớp học
  const handleDeleteClass = async (cls: TeachingClass) => {
    const ok = await confirm(
      'Dữ liệu theo dõi tiến độ giảng dạy của lớp này sẽ bị xóa bỏ. Khung PPCT chuẩn của khối vẫn được giữ nguyên.',
      {
        title: `Xóa lớp ${cls.name}?`,
        confirmText: 'Xóa lớp',
        danger: true
      }
    )
    if (!ok) return

    try {
      await api.deleteTeachingClass(cls.id)
      toast('success', `Đã xóa lớp ${cls.name}`)
      await loadClasses(selectedGradeId)
    } catch (e) {
      toast('error', 'Không thể xóa lớp: ' + errText(e))
    }
  }

  // 1-touch Toggle trạng thái bài dạy
  const handleToggleStatus = async (item: TeachingScheduleItem) => {
    if (!selectedClassId) return
    try {
      const updated = await api.toggleClassStatus(selectedClassId, item.planItemId)
      setScheduleItems(prev =>
        prev.map(p => (p.planItemId === item.planItemId ? updated : p))
      )
    } catch (e) {
      toast('error', 'Không thể cập nhật trạng thái: ' + errText(e))
    }
  }

  // Cập nhật trạng thái trực tiếp
  const handleSelectStatus = async (item: TeachingScheduleItem, newStatus: number) => {
    if (!selectedClassId || item.status === newStatus) return
    try {
      const updated = await api.updateClassProgress(selectedClassId, item.planItemId, {
        status: newStatus,
        actualDate: item.actualDate,
        teacherNotes: item.teacherNotes,
        customDocIds: item.customDocIds
      })
      setScheduleItems(prev =>
        prev.map(p => (p.planItemId === item.planItemId ? updated : p))
      )
    } catch (e) {
      toast('error', 'Lỗi cập nhật: ' + errText(e))
    }
  }

  // Cập nhật ngày dạy thực tế
  const handleDateChange = async (item: TeachingScheduleItem, dateStr: string) => {
    if (!selectedClassId) return
    try {
      const updated = await api.updateClassProgress(selectedClassId, item.planItemId, {
        status: item.status,
        actualDate: dateStr || null,
        teacherNotes: item.teacherNotes,
        customDocIds: item.customDocIds
      })
      setScheduleItems(prev =>
        prev.map(p => (p.planItemId === item.planItemId ? updated : p))
      )
    } catch (e) {
      toast('error', 'Lỗi cập nhật ngày dạy: ' + errText(e))
    }
  }

  // Cập nhật ghi chú tiến độ
  const handleNoteBlur = async (item: TeachingScheduleItem, note: string) => {
    if (!selectedClassId || (item.teacherNotes ?? '') === note) return
    try {
      const updated = await api.updateClassProgress(selectedClassId, item.planItemId, {
        status: item.status,
        actualDate: item.actualDate,
        teacherNotes: note,
        customDocIds: item.customDocIds
      })
      setScheduleItems(prev =>
        prev.map(p => (p.planItemId === item.planItemId ? updated : p))
      )
    } catch (e) {
      toast('error', 'Lỗi lưu ghi chú: ' + errText(e))
    }
  }

  // Ghim hoặc bỏ ghim tài liệu thủ công
  const handleTogglePinDoc = async (item: TeachingScheduleItem, docId: number) => {
    if (!selectedClassId) return
    const currentCustom = item.customDocIds ?? []
    const isPinned = currentCustom.includes(docId)
    const nextCustom = isPinned
      ? currentCustom.filter(id => id !== docId)
      : [...currentCustom, docId]

    try {
      const updated = await api.updateClassProgress(selectedClassId, item.planItemId, {
        status: item.status,
        actualDate: item.actualDate,
        teacherNotes: item.teacherNotes,
        customDocIds: nextCustom
      })
      setScheduleItems(prev =>
        prev.map(p => (p.planItemId === item.planItemId ? updated : p))
      )
      if (attachModalItem?.planItemId === item.planItemId) {
        setAttachModalItem(updated)
      }
      toast('success', isPinned ? 'Đã gỡ tài liệu ghim' : 'Đã ghim tài liệu vào tiết dạy')
    } catch (e) {
      toast('error', 'Lỗi cập nhật tài liệu ghim: ' + errText(e))
    }
  }

  // Mở modal gắn tài liệu và tải danh sách tài liệu
  const openAttachModal = (item: TeachingScheduleItem) => {
    setAttachModalItem(item)
    setAttachSearchQ('')
    setAttachTypeId(null)
  }

  // Tải danh sách tài liệu khi mở modal gắn hoặc thay đổi bộ lọc
  const loadAttachDocs = useCallback(async () => {
    if (!attachModalItem) return
    setLoadingAttachDocs(true)
    try {
      const res = await api.documents({
        gradeLevelId: selectedGradeId,
        q: attachSearchQ || undefined,
        typeId: attachTypeId || undefined,
        pageSize: 50
      })
      setAvailableDocs(res.items)
    } catch (e) {
      toast('error', 'Lỗi tải danh mục tài liệu: ' + errText(e))
    } finally {
      setLoadingAttachDocs(false)
    }
  }, [attachModalItem, selectedGradeId, attachSearchQ, attachTypeId])

  useEffect(() => {
    if (attachModalItem) {
      loadAttachDocs()
    }
  }, [attachModalItem, loadAttachDocs])

  // Lưu tiết trong khung PPCT gốc
  const handleSavePlanItem = async () => {
    if (!planForm.title.trim()) {
      toast('error', 'Vui lòng nhập tên bài dạy')
      return
    }
    setSavingPlanItem(true)
    try {
      await api.saveTeachingPlanItem(editingPlanItem?.id ?? null, {
        gradeLevelId: selectedGradeId,
        weekNumber: Number(planForm.weekNumber),
        periodNumber: Number(planForm.periodNumber),
        periodName: planForm.periodName.trim() || `${planForm.periodNumber}`,
        numberOfPeriods: planForm.numberOfPeriods.trim() || '2LT',
        equipment: planForm.equipment.trim(),
        location: planForm.location.trim() || 'Phòng học/Phòng máy',
        topicId: planForm.topicId > 0 ? planForm.topicId : null,
        lessonId: planForm.lessonId > 0 ? planForm.lessonId : null,
        title: planForm.title.trim(),
        note: planForm.note.trim() || null,
        notes: planForm.note.trim() || null
      })
      toast('success', editingPlanItem ? 'Đã sửa tiết dạy' : 'Đã thêm tiết dạy mới')
      setPlanItemModalOpen(false)
      if (selectedClassId) await loadSchedule(selectedClassId)
    } catch (e) {
      toast('error', errText(e))
    } finally {
      setSavingPlanItem(false)
    }
  }

  // Xóa tiết khỏi khung PPCT gốc
  const handleDeletePlanItem = async (planItemId: number, title: string) => {
    const ok = await confirm(
      'Tiết học này sẽ bị xóa khỏi khung PPCT chuẩn và toàn bộ tiến độ các lớp thuộc khối.',
      {
        title: `Xóa tiết "${title}"?`,
        confirmText: 'Xóa tiết dạy',
        danger: true
      }
    )
    if (!ok) return
    try {
      await api.deleteTeachingPlanItem(planItemId)
      toast('success', 'Đã xóa tiết dạy khỏi khung PPCT')
      if (selectedClassId) await loadSchedule(selectedClassId)
    } catch (e) {
      toast('error', 'Không thể xóa: ' + errText(e))
    }
  }

  // Xuất Word chuẩn Công văn 5512
  const handleExportWord = async () => {
    const gl = gradeLevels.find(g => g.id === selectedGradeId)
    const gradeName = gl?.name ?? `Khối ${selectedGradeId}`
    const academicYear = selectedClass?.schoolYear || '2026 - 2027'
    try {
      await exportTeachingPlanToDocx(gradeName, academicYear, scheduleItems)
      toast('success', 'Đã xuất file Word Kế hoạch dạy học theo mẫu Công văn 5512!')
    } catch (e) {
      toast('error', 'Lỗi xuất file Word: ' + errText(e))
    }
  }

  // Thống kê tiến độ
  const stats = useMemo(() => {
    const total = scheduleItems.length
    const completed = scheduleItems.filter(x => x.status === 1).length
    const postponed = scheduleItems.filter(x => x.status === 2).length
    const makeUp = scheduleItems.filter(x => x.status === 3).length
    const notStarted = scheduleItems.filter(x => x.status === 0).length
    const percent = total > 0 ? Math.round((completed / total) * 1000) / 10 : 0
    return { total, completed, postponed, makeUp, notStarted, percent }
  }, [scheduleItems])

  // Lọc danh sách hiển thị theo Học kỳ & Trạng thái
  const filteredItems = useMemo(() => {
    return scheduleItems.filter(item => {
      if (semesterFilter === 'sem1' && item.weekNumber > 18) return false
      if (semesterFilter === 'sem2' && item.weekNumber <= 18) return false
      if (statusFilter !== 'all' && item.status !== Number(statusFilter)) return false
      return true
    })
  }, [scheduleItems, semesterFilter, statusFilter])

  // Phân nhóm dữ liệu theo Học kỳ và Chủ đề (chuẩn mẫu CV 5512)
  const groupedData = useMemo(() => {
    const sorted = [...filteredItems].sort((a, b) => {
      if (a.weekNumber !== b.weekNumber) return a.weekNumber - b.weekNumber
      return a.periodNumber - b.periodNumber
    })

    const groups: {
      semester: number
      topics: {
        topicId: number | null
        topicName: string
        totalPeriodsSummary: string
        items: TeachingScheduleItem[]
      }[]
    }[] = []

    sorted.forEach(item => {
      const sem = item.weekNumber <= 18 ? 1 : 2
      let semGroup = groups.find(g => g.semester === sem)
      if (!semGroup) {
        semGroup = { semester: sem, topics: [] }
        groups.push(semGroup)
      }

      let topicGroup = semGroup.topics.find(t => t.topicId === item.topicId)
      if (!topicGroup) {
        topicGroup = {
          topicId: item.topicId,
          topicName: item.topicName || 'CHỦ ĐỀ KHÁC / BÀI HỌC BỔ TRỢ',
          totalPeriodsSummary: '',
          items: []
        }
        semGroup.topics.push(topicGroup)
      }

      topicGroup.items.push(item)
    })

    // Tính tổng số tiết cho từng chủ đề (ví dụ: "(10 tiết: 8LT+2TH)" hoặc "(6 tiết: 1LT+5TH)")
    groups.forEach(g => {
      g.topics.forEach(t => {
        let countLT = 0
        let countTH = 0
        t.items.forEach(it => {
          const p = parsePeriods(it.numberOfPeriods)
          countLT += p.lt
          countTH += p.th
        })
        t.totalPeriodsSummary = formatPeriodsSummary(countLT, countTH)
      })
    })

    return groups
  }, [filteredItems])

  // Lọc bài học theo topic đã chọn trong form
  const availableLessons = useMemo(() => {
    if (!planForm.topicId) return []
    return lookups?.lessons.filter(l => l.topicId === planForm.topicId) ?? []
  }, [planForm.topicId, lookups])

  const selectedClass = classes.find(c => c.id === selectedClassId)

  // STT running counter
  let sttCounter = 1

  return (
    <div className="space-y-5">
      {/* HEADER & TABS KHỐI LỚP */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight text-slate-800 dark:text-slate-100">
            Kế hoạch giảng dạy & PPCT
          </h1>
        </div>

        {/* Nút hành động chính */}
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="secondary"
            onClick={handleExportWord}
            title="Xuất bảng Kế hoạch dạy học theo đúng mẫu Phụ lục 3 Công văn 5512 ra file Word (.docx)"
          >
            <Download className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
            Xuất Word (CV 5512)
          </Button>
          <Button
            variant="secondary"
            onClick={handleAutoGenerate}
            loading={generating}
            title="Tự động lập danh sách 35 tuần từ các bài học Tin học GDPT 2018 theo mẫu chuẩn"
          >
            <Sparkles className="h-4 w-4 text-amber-500" />
            Khởi tạo nhanh từ bài học
          </Button>
          <Button
            variant="primary"
            onClick={() => {
              setEditingPlanItem(null)
              const nextPeriod = scheduleItems.length > 0 ? (scheduleItems.length * 2) + 1 : 1
              setPlanForm({
                weekNumber: scheduleItems.length > 0 ? Math.max(...scheduleItems.map(x => x.weekNumber)) : 1,
                periodNumber: nextPeriod,
                periodName: `${nextPeriod}, ${nextPeriod + 1}`,
                numberOfPeriods: '2LT',
                equipment: 'SGK, SGV, Máy tính nối mạng, tivi, các clip minh họa.',
                location: 'Phòng học/Phòng máy',
                topicId: 0,
                lessonId: 0,
                title: '',
                note: ''
              })
              setPlanItemModalOpen(true)
            }}
          >
            <Plus className="h-4 w-4" />
            Thêm tiết dạy
          </Button>
        </div>
      </div>

      {/* CHỌN KHỐI LỚP (TABS) */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800">
        {gradeLevels.map(gl => {
          const active = gl.id === selectedGradeId
          return (
            <button
              key={gl.id}
              type="button"
              onClick={() => setSelectedGradeId(gl.id)}
              className={cx(
                'relative flex items-center gap-2 px-4 py-2.5 text-sm font-semibold transition border-b-2 -mb-px',
                active
                  ? 'border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400'
                  : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
              )}
            >
              <BookOpen className="h-4 w-4" />
              {gl.name}
            </button>
          )
        })}
      </div>

      {/* TABS LỚP HỌC (THEO TỪNG LỚP) */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-white p-3 shadow-sm border border-slate-200 dark:bg-slate-900 dark:border-slate-800">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 mr-1 flex items-center gap-1">
            <Layers className="h-3.5 w-3.5" /> Lớp học:
          </span>

          {classes.length === 0 ? (
            <span className="text-xs italic text-slate-400">Chưa có lớp nào trong khối này</span>
          ) : (
            classes.map(cls => {
              const active = cls.id === selectedClassId
              return (
                <div key={cls.id} className="relative group">
                  <button
                    type="button"
                    onClick={() => setSelectedClassId(cls.id)}
                    className={cx(
                      'flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition',
                      active
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
                    )}
                  >
                    <span>{cls.name}</span>
                    <span
                      className={cx(
                        'text-[10px] px-1.5 py-0.2 rounded-full font-normal',
                        active ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-500 dark:bg-slate-700'
                      )}
                    >
                      {cls.schoolYear}
                    </span>
                  </button>
                  {/* Menu sửa/xóa lớp */}
                  <div className="absolute right-0 top-0 -mt-1 -mr-1 hidden group-hover:flex items-center gap-0.5 z-10">
                    <button
                      type="button"
                      onClick={e => {
                        e.stopPropagation()
                        setEditingClass(cls)
                        setClassNameInput(cls.name)
                        setClassYearInput(cls.schoolYear)
                        setClassModalOpen(true)
                      }}
                      className="rounded-full bg-white p-1 text-slate-400 shadow hover:text-indigo-600 dark:bg-slate-800"
                      title="Sửa tên lớp"
                    >
                      <Pencil className="h-3 w-3" />
                    </button>
                    <button
                      type="button"
                      onClick={e => {
                        e.stopPropagation()
                        handleDeleteClass(cls)
                      }}
                      className="rounded-full bg-white p-1 text-slate-400 shadow hover:text-rose-600 dark:bg-slate-800"
                      title="Xóa lớp"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              )
            })
          )}

          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setEditingClass(null)
              setClassNameInput('')
              setClassYearInput('2024-2025')
              setClassModalOpen(true)
            }}
            className="text-xs"
          >
            <Plus className="h-3.5 w-3.5" />
            Thêm lớp
          </Button>
        </div>

        {/* BỘ LỌC HỌC KỲ & TRẠNG THÁI */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Học kỳ */}
          <div className="flex items-center rounded-lg border border-slate-200 bg-slate-50 p-0.5 text-xs dark:border-slate-800 dark:bg-slate-800/50">
            <button
              type="button"
              onClick={() => setSemesterFilter('all')}
              className={cx(
                'rounded-md px-2.5 py-1 font-medium transition',
                semesterFilter === 'all'
                  ? 'bg-white text-indigo-600 shadow-sm dark:bg-slate-700 dark:text-indigo-300'
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-400'
              )}
            >
              Cả năm (35T)
            </button>
            <button
              type="button"
              onClick={() => setSemesterFilter('sem1')}
              className={cx(
                'rounded-md px-2.5 py-1 font-medium transition',
                semesterFilter === 'sem1'
                  ? 'bg-white text-indigo-600 shadow-sm dark:bg-slate-700 dark:text-indigo-300'
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-400'
              )}
            >
              Học kỳ 1 (T1–18)
            </button>
            <button
              type="button"
              onClick={() => setSemesterFilter('sem2')}
              className={cx(
                'rounded-md px-2.5 py-1 font-medium transition',
                semesterFilter === 'sem2'
                  ? 'bg-white text-indigo-600 shadow-sm dark:bg-slate-700 dark:text-indigo-300'
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-400'
              )}
            >
              Học kỳ 2 (T19–35)
            </button>
          </div>

          {/* Trạng thái */}
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs text-slate-700 outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 [color-scheme:light] dark:[color-scheme:dark]"
          >
            <option value="all" className="bg-white text-slate-800 dark:bg-slate-800 dark:text-slate-100">Tất cả trạng thái</option>
            <option value="1" className="bg-white text-slate-800 dark:bg-slate-800 dark:text-slate-100">Đã dạy</option>
            <option value="0" className="bg-white text-slate-800 dark:bg-slate-800 dark:text-slate-100">Chưa dạy</option>
            <option value="2" className="bg-white text-slate-800 dark:bg-slate-800 dark:text-slate-100">Nghỉ / Hoãn</option>
            <option value="3" className="bg-white text-slate-800 dark:bg-slate-800 dark:text-slate-100">Dạy bù</option>
          </select>
        </div>
      </div>

      {/* THANH TIẾN ĐỘ & THỐNG KÊ (PROGRESS BANNER) */}
      {selectedClass && scheduleItems.length > 0 && (
        <div className="rounded-xl border border-slate-200 bg-gradient-to-r from-indigo-50/60 via-white to-emerald-50/50 p-4 shadow-sm dark:border-slate-800 dark:from-slate-900 dark:via-slate-900 dark:to-slate-900">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-slate-800 dark:text-slate-100">
                  Tiến độ giảng dạy lớp {selectedClass.name}
                </span>
                <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-semibold text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                  {stats.percent}% hoàn thành
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Đã thực hiện {stats.completed}/{stats.total} bài/tiết · Còn lại {stats.notStarted} bài
                {stats.postponed > 0 && ` · ${stats.postponed} bài cần điều chỉnh/nghỉ`}
                {stats.makeUp > 0 && ` · ${stats.makeUp} bài dạy bù`}
              </p>
            </div>

            {/* Quick Status Badges */}
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <div className="flex items-center gap-1.5 rounded-lg bg-emerald-100/80 px-2.5 py-1 font-medium text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Đã dạy: {stats.completed}
              </div>
              <div className="flex items-center gap-1.5 rounded-lg bg-slate-200 px-2.5 py-1 font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                <Clock className="h-3.5 w-3.5" />
                Chưa dạy: {stats.notStarted}
              </div>
              {stats.postponed > 0 && (
                <div className="flex items-center gap-1.5 rounded-lg bg-amber-100 px-2.5 py-1 font-medium text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  Nghỉ: {stats.postponed}
                </div>
              )}
            </div>
          </div>

          {/* Progress bar visual */}
          <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
            <div
              className="h-full bg-gradient-to-r from-indigo-500 to-emerald-500 transition-all duration-500"
              style={{ width: `${Math.min(100, stats.percent)}%` }}
            />
          </div>
        </div>
      )}

      {/* BẢNG TIẾN ĐỘ CHUẨN MẪU CÔNG VĂN 5512 */}
      {loadingSchedule ? (
        <Spinner label="Đang tải tiến độ giảng dạy..." />
      ) : scheduleItems.length === 0 ? (
        <EmptyState
          title="Chưa có khung phân phối chương trình"
          text={`Khối ${gradeLevels.find(g => g.id === selectedGradeId)?.name ?? ''} chưa có khung bài dạy 35 tuần.`}
          action={
            <Button
              variant="primary"
              onClick={handleAutoGenerate}
              loading={generating}
              className="mt-2"
            >
              <Sparkles className="h-4 w-4 text-amber-300" />
              Khởi tạo tự động từ danh mục bài học
            </Button>
          }
        />
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-300 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-700 border-collapse dark:text-slate-200">
              <thead className="border-b border-slate-300 bg-slate-100 text-xs font-bold uppercase tracking-wider text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
                <tr>
                  <th scope="col" className="px-2.5 py-3 w-12 text-center border-r border-slate-300 dark:border-slate-700">STT</th>
                  <th scope="col" className="px-3 py-3 w-20 text-center border-r border-slate-300 dark:border-slate-700">PPCT</th>
                  <th scope="col" className="px-4 py-3 min-w-[220px] text-left border-r border-slate-300 dark:border-slate-700">Bài học</th>
                  <th scope="col" className="px-2.5 py-3 w-16 text-center border-r border-slate-300 dark:border-slate-700">Số tiết</th>
                  <th scope="col" className="px-2.5 py-3 w-14 text-center border-r border-slate-300 dark:border-slate-700">Tuần</th>
                  <th scope="col" className="px-3 py-3 min-w-[200px] text-left border-r border-slate-300 dark:border-slate-700">Thiết bị dạy học</th>
                  <th scope="col" className="px-3 py-3 min-w-[140px] text-center border-r border-slate-300 dark:border-slate-700">Địa điểm dạy học</th>
                  <th scope="col" className="px-3 py-3 w-28 text-center border-r border-slate-300 dark:border-slate-700">Trạng thái</th>
                  <th scope="col" className="px-3 py-3 w-32 text-center border-r border-slate-300 dark:border-slate-700">Ngày dạy</th>
                  <th scope="col" className="px-3 py-3 min-w-[170px] text-left border-r border-slate-300 dark:border-slate-700">Tài liệu gắn kèm</th>
                  <th scope="col" className="px-3 py-3 min-w-[170px] text-left border-r border-slate-300 dark:border-slate-700">Ghi chú</th>
                  <th scope="col" className="px-2 py-3 w-14 text-center"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {groupedData.map(semGroup => {
                  return (
                    <Fragment key={`sem-${semGroup.semester}`}>
                      {/* DÒNG TIÊU ĐỀ HỌC KỲ */}
                      <tr className="bg-slate-200/90 text-slate-900 font-extrabold text-xs uppercase tracking-wider border-y-2 border-slate-300 dark:bg-indigo-950/70 dark:text-indigo-300 dark:border-indigo-900/60">
                        <td colSpan={12} className="px-4 py-2.5 text-left font-black tracking-wide">
                          HỌC KỲ {semGroup.semester}
                        </td>
                      </tr>

                      {semGroup.topics.map(topGroup => {
                        return (
                          <Fragment key={`top-${topGroup.topicId ?? 0}-${semGroup.semester}`}>
                            {/* DÒNG TIÊU ĐỀ CHỦ ĐỀ KÈM TỔNG SỐ TIẾT */}
                            <tr className="bg-slate-100/90 text-slate-800 font-bold text-xs uppercase tracking-wide border-y border-slate-300 dark:bg-slate-800/90 dark:text-slate-100 dark:border-slate-700">
                              <td colSpan={12} className="px-4 py-2 text-left">
                                {topGroup.topicName.toUpperCase()}{topGroup.totalPeriodsSummary}
                              </td>
                            </tr>

                            {topGroup.items.map(item => {
                              const isDone = item.status === 1
                              const isPostponed = item.status === 2
                              const isMakeUp = item.status === 3
                              const docs = item.linkedDocuments ?? []
                              const currentSTT = sttCounter++

                              return (
                                <tr
                                  key={item.planItemId}
                                  className={cx(
                                    'transition hover:bg-slate-50/80 border-b border-slate-200 dark:border-slate-800 dark:hover:bg-slate-800/50',
                                    isDone && 'bg-emerald-50/25 dark:bg-emerald-950/15'
                                  )}
                                >
                                  {/* 1. STT */}
                                  <td className="px-2.5 py-3 text-center font-bold text-slate-700 border-r border-slate-200 dark:text-slate-300 dark:border-slate-800">
                                    {currentSTT}
                                  </td>

                                  {/* 2. PPCT */}
                                  <td className="px-3 py-3 text-center font-bold text-slate-800 border-r border-slate-200 dark:text-slate-200 dark:border-slate-800 whitespace-nowrap">
                                    {item.periodName || item.periodNumber}
                                  </td>

                                  {/* 3. Bài học */}
                                  <td className="px-4 py-3 border-r border-slate-200 dark:border-slate-800">
                                    <div className="font-bold text-slate-800 dark:text-slate-100">
                                      {item.title}
                                    </div>
                                  </td>

                                  {/* 4. Số tiết */}
                                  <td className="px-2.5 py-3 text-center font-semibold text-slate-700 border-r border-slate-200 dark:text-slate-300 dark:border-slate-800 whitespace-nowrap">
                                    {item.numberOfPeriods || '2LT'}
                                  </td>

                                  {/* 5. Tuần */}
                                  <td className="px-2.5 py-3 text-center font-semibold text-slate-700 border-r border-slate-200 dark:text-slate-300 dark:border-slate-800">
                                    {item.weekNumber}
                                  </td>

                                  {/* 6. Thiết bị dạy học */}
                                  <td className="px-3 py-3 text-xs text-slate-600 border-r border-slate-200 dark:text-slate-400 dark:border-slate-800">
                                    <div className="break-words">
                                      {item.equipment || 'SGK, SGV, Máy tính nối mạng, tivi, các clip minh họa.'}
                                    </div>
                                  </td>

                                  {/* 7. Địa điểm dạy học */}
                                  <td className="px-3 py-3 text-xs text-center font-medium text-slate-600 border-r border-slate-200 dark:text-slate-400 dark:border-slate-800 whitespace-nowrap">
                                    {item.location || 'Phòng học/Phòng máy'}
                                  </td>

                                  {/* 8. Trạng thái */}
                                  <td className="px-3 py-3 text-center border-r border-slate-200 dark:border-slate-800">
                                    <div className="inline-flex items-center gap-1">
                                      <button
                                        type="button"
                                        onClick={() => handleToggleStatus(item)}
                                        title="Nhấp để chuyển nhanh giữa Đã dạy và Chưa dạy"
                                        className={cx(
                                          'inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold transition shadow-xs whitespace-nowrap',
                                          isDone
                                            ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                                            : isPostponed
                                            ? 'bg-amber-500 text-white hover:bg-amber-600'
                                            : isMakeUp
                                            ? 'bg-blue-600 text-white hover:bg-blue-700'
                                            : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300'
                                        )}
                                      >
                                        {isDone ? (
                                          <>
                                            <Check className="h-3 w-3 stroke-[2.5]" />
                                            Đã dạy
                                          </>
                                        ) : isPostponed ? (
                                          <>
                                            <AlertTriangle className="h-3 w-3" />
                                            Nghỉ
                                          </>
                                        ) : isMakeUp ? (
                                          <>
                                            <RefreshCw className="h-3 w-3" />
                                            Bù
                                          </>
                                        ) : (
                                          <>
                                            <Clock className="h-3 w-3 text-slate-400" />
                                            Chưa dạy
                                          </>
                                        )}
                                      </button>

                                      <select
                                        value={item.status}
                                        onChange={e => handleSelectStatus(item, Number(e.target.value))}
                                        className="h-6 w-5 cursor-pointer rounded border border-slate-300 bg-slate-100 px-0.5 text-xs text-slate-700 outline-none hover:bg-slate-200 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 [color-scheme:light] dark:[color-scheme:dark]"
                                        title="Chọn trạng thái khác"
                                      >
                                        <option value={0} className="bg-white text-slate-900 dark:bg-slate-800 dark:text-slate-100">Chưa dạy</option>
                                        <option value={1} className="bg-white text-slate-900 dark:bg-slate-800 dark:text-slate-100">Đã dạy</option>
                                        <option value={2} className="bg-white text-slate-900 dark:bg-slate-800 dark:text-slate-100">Nghỉ / Hoãn</option>
                                        <option value={3} className="bg-white text-slate-900 dark:bg-slate-800 dark:text-slate-100">Dạy bù</option>
                                      </select>
                                    </div>
                                  </td>

                                  {/* 9. Ngày dạy */}
                                  <td className="px-3 py-3 text-center border-r border-slate-200 dark:border-slate-800">
                                    <input
                                      type="date"
                                      value={item.actualDate ? item.actualDate.slice(0, 10) : ''}
                                      onChange={e => handleDateChange(item, e.target.value)}
                                      className="rounded border border-slate-200 bg-white px-1.5 py-1 text-xs text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 [color-scheme:light] dark:[color-scheme:dark]"
                                    />
                                  </td>

                                  {/* 10. Tài liệu gắn kèm */}
                                  <td className="px-3 py-3 border-r border-slate-200 dark:border-slate-800">
                                    <div className="flex flex-wrap items-center gap-1.5">
                                      {docs.map(doc => {
                                        const isKHBD = doc.documentTypeId === 1
                                        const isSlide = doc.documentTypeId === 2
                                        const isPinned = item.customDocIds?.includes(doc.id)

                                        return (
                                          <div
                                            key={doc.id}
                                            className="inline-flex items-center rounded-md border border-slate-200 bg-white text-xs shadow-2xs group/badge dark:border-slate-700 dark:bg-slate-800"
                                          >
                                            <button
                                              type="button"
                                              onClick={() => setPreviewDocId(doc.id)}
                                              title={`${doc.documentTypeName}: ${doc.title} ${isPinned ? '(Ghim thủ công)' : '(Tự động theo bài học)'} - Nhấn để xem`}
                                              className={cx(
                                                'inline-flex items-center gap-1 px-2 py-0.5 font-medium transition rounded-l-md',
                                                isKHBD
                                                  ? 'text-blue-700 hover:bg-blue-50 dark:text-blue-300 dark:hover:bg-blue-950/50'
                                                  : isSlide
                                                  ? 'text-amber-700 hover:bg-amber-50 dark:text-amber-300 dark:hover:bg-amber-950/50'
                                                  : 'text-purple-700 hover:bg-purple-50 dark:text-purple-300 dark:hover:bg-purple-950/50'
                                              )}
                                            >
                                              {isPinned ? (
                                                <Pin className="h-3 w-3 shrink-0 text-indigo-500 fill-indigo-500/20" />
                                              ) : isKHBD ? (
                                                <FileText className="h-3 w-3 shrink-0" />
                                              ) : isSlide ? (
                                                <Presentation className="h-3 w-3 shrink-0" />
                                              ) : (
                                                <Bookmark className="h-3 w-3 shrink-0" />
                                              )}
                                              <span className="max-w-[100px] truncate">{doc.documentTypeName}</span>
                                              <ExternalLink className="h-2.5 w-2.5 opacity-40 shrink-0" />
                                            </button>

                                            {isPinned && (
                                              <button
                                                type="button"
                                                onClick={() => handleTogglePinDoc(item, doc.id)}
                                                className="px-1 py-0.5 text-slate-400 hover:text-rose-600 rounded-r-md transition"
                                                title="Gỡ ghim tài liệu này"
                                              >
                                                <X className="h-3 w-3" />
                                              </button>
                                            )}
                                          </div>
                                        )
                                      })}

                                      <button
                                        type="button"
                                        onClick={() => openAttachModal(item)}
                                        className={cx(
                                          'inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-xs font-medium transition',
                                          docs.length === 0
                                            ? 'border border-dashed border-indigo-300 bg-indigo-50/50 text-indigo-600 hover:bg-indigo-100 dark:border-indigo-800 dark:bg-indigo-950/40 dark:text-indigo-400'
                                            : 'text-slate-400 hover:bg-slate-100 hover:text-indigo-600 dark:hover:bg-slate-800'
                                        )}
                                        title="Ghim tài liệu hoặc tải lên tài liệu mới cho tiết này"
                                      >
                                        <Paperclip className="h-3 w-3" />
                                        {docs.length === 0 ? 'Gắn' : ''}
                                      </button>
                                    </div>
                                  </td>

                                  {/* 11. Ghi chú */}
                                  <td className="px-3 py-3 border-r border-slate-200 dark:border-slate-800">
                                    <div className="flex flex-col gap-1">
                                      {item.planNote && (
                                        <div className="rounded bg-amber-50 px-2 py-1 text-xs font-medium text-amber-800 border border-amber-200/70 dark:bg-amber-950/40 dark:border-amber-900/50 dark:text-amber-300 break-words">
                                          {item.planNote}
                                        </div>
                                      )}
                                      <input
                                        key={item.planItemId + (item.teacherNotes ?? '')}
                                        type="text"
                                        defaultValue={item.teacherNotes ?? ''}
                                        placeholder={item.planNote ? "+ Ghi chú lớp..." : "Ghi chú buổi dạy..."}
                                        onBlur={e => handleNoteBlur(item, e.target.value)}
                                        onKeyDown={e => {
                                          if (e.key === 'Enter') {
                                            ;(e.target as HTMLInputElement).blur()
                                          }
                                        }}
                                        className="w-full rounded border border-transparent bg-transparent px-1.5 py-0.5 text-xs text-slate-600 hover:border-slate-200 focus:border-indigo-500 focus:bg-white dark:hover:border-slate-700 dark:focus:bg-slate-800 dark:text-slate-300"
                                        title="Ghi chú buổi dạy của lớp này"
                                      />
                                    </div>
                                  </td>

                                  {/* 12. Thao tác */}
                                  <td className="px-2 py-3 text-center">
                                    <div className="flex items-center justify-center gap-1">
                                      <button
                                        type="button"
                                        onClick={() => {
                                          const existingNote = item.planNote ?? (item as any).notes ?? (item as any).note ?? ''
                                          setEditingPlanItem({
                                            id: item.planItemId,
                                            gradeLevelId: selectedGradeId,
                                            weekNumber: item.weekNumber,
                                            periodNumber: item.periodNumber,
                                            periodName: item.periodName,
                                            title: item.title,
                                            numberOfPeriods: item.numberOfPeriods,
                                            equipment: item.equipment,
                                            location: item.location,
                                            topicId: item.topicId,
                                            topicName: item.topicName,
                                            lessonId: item.lessonId,
                                            lessonName: item.lessonName,
                                            note: existingNote || null,
                                            sortOrder: item.periodNumber
                                          })
                                          setPlanForm({
                                            weekNumber: item.weekNumber,
                                            periodNumber: item.periodNumber,
                                            periodName: item.periodName || `${item.periodNumber}`,
                                            numberOfPeriods: item.numberOfPeriods || '2LT',
                                            equipment: item.equipment || 'SGK, SGV, Máy tính nối mạng, tivi, các clip minh họa.',
                                            location: item.location || 'Phòng học/Phòng máy',
                                            topicId: item.topicId ?? 0,
                                            lessonId: item.lessonId ?? 0,
                                            title: item.title,
                                            note: existingNote
                                          })
                                          setPlanItemModalOpen(true)
                                        }}
                                        className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-indigo-600 dark:hover:bg-slate-800"
                                        title="Sửa thông tin bài học"
                                      >
                                        <Pencil className="h-3.5 w-3.5" />
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => handleDeletePlanItem(item.planItemId, item.title)}
                                        className="rounded p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-slate-800"
                                        title="Xóa bài học khỏi khung"
                                      >
                                        <Trash2 className="h-3.5 w-3.5" />
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              )
                            })}
                          </Fragment>
                        )
                      })}
                    </Fragment>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL GẮN TÀI LIỆU THỦ CÔNG & TỰ ĐỘNG */}
      {attachModalItem && (
        <Modal
          title={`Gắn tài liệu: ${attachModalItem.periodName ? `Tiết ${attachModalItem.periodName}` : `Tiết ${attachModalItem.periodNumber}`} - ${attachModalItem.title}`}
          onRequestClose={() => setAttachModalItem(null)}
          wide="2xl"
          footer={
            <div className="flex items-center justify-between w-full">
              <span className="text-xs text-slate-500">
                Lớp: <strong className="text-slate-700 dark:text-slate-200">{selectedClass?.name}</strong> ·
                Đã gắn: <strong className="text-indigo-600">{attachModalItem.linkedDocuments?.length ?? 0} tài liệu</strong>
              </span>
              <Button variant="primary" onClick={() => setAttachModalItem(null)}>
                Xong
              </Button>
            </div>
          }
        >
          <div className="space-y-4">
            <div className="rounded-lg bg-indigo-50/80 p-3 text-xs text-indigo-900 border border-indigo-100 dark:bg-indigo-950/40 dark:border-indigo-900 dark:text-indigo-200">
              <p className="font-semibold flex items-center gap-1.5 mb-1">
                <Sparkles className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
                Cơ chế kết nối tài liệu thông minh:
              </p>
              <ul className="list-disc list-inside space-y-0.5 text-slate-600 dark:text-slate-300 ml-1">
                <li>
                  <strong>Tự động:</strong> Mọi tài liệu có chọn cùng Bài học / Chủ đề với tiết này sẽ tự động xuất hiện.
                </li>
                <li>
                  <strong>Thủ công:</strong> Thầy cô có thể chọn thêm bất kỳ tài liệu nào từ kho bên dưới để <strong>ghim riêng (📌)</strong> vào tiết dạy của lớp này.
                </li>
              </ul>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-2">
              <div className="relative flex-1 w-full">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Tìm kiếm tài liệu theo tên, từ khóa..."
                  value={attachSearchQ}
                  onChange={e => setAttachSearchQ(e.target.value)}
                  className={cx(inputCls, 'pl-9 text-xs')}
                />
              </div>

              <select
                value={attachTypeId ?? ''}
                onChange={e => setAttachTypeId(e.target.value ? Number(e.target.value) : null)}
                className="w-full sm:w-44 rounded-md border border-slate-300 bg-white px-2.5 py-2 text-xs text-slate-700 outline-none focus:border-indigo-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
              >
                <option value="">Tất cả loại tài liệu</option>
                {lookups?.documentTypes.map(dt => (
                  <option key={dt.id} value={dt.id}>
                    {dt.name}
                  </option>
                ))}
              </select>

              <Button
                variant="secondary"
                size="sm"
                onClick={() => setNewDocModalOpen(true)}
                className="whitespace-nowrap text-xs text-indigo-600 border-indigo-200 hover:bg-indigo-50 dark:border-indigo-800"
              >
                <Upload className="h-3.5 w-3.5" />
                Thêm tài liệu mới
              </Button>
            </div>

            <div className="max-h-80 overflow-y-auto rounded-lg border border-slate-200 divide-y divide-slate-100 dark:border-slate-800 dark:divide-slate-800">
              {loadingAttachDocs ? (
                <div className="py-10 text-center text-xs text-slate-400">
                  <Spinner label="Đang nạp danh sách tài liệu..." />
                </div>
              ) : availableDocs.length === 0 ? (
                <div className="py-10 text-center text-xs text-slate-400">
                  Không tìm thấy tài liệu phù hợp trong khối lớp này.
                </div>
              ) : (
                availableDocs.map(doc => {
                  const isAuto =
                    (attachModalItem.lessonId && doc.lessonId === attachModalItem.lessonId) ||
                    (!attachModalItem.lessonId &&
                      attachModalItem.topicId &&
                      doc.topicId === attachModalItem.topicId)
                  const isPinned = attachModalItem.customDocIds?.includes(doc.id)

                  return (
                    <div
                      key={doc.id}
                      className={cx(
                        'flex items-center justify-between p-3 text-xs transition',
                        isPinned || isAuto
                          ? 'bg-indigo-50/40 dark:bg-indigo-950/20'
                          : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
                      )}
                    >
                      <div className="flex-1 min-w-0 pr-3">
                        <div className="flex items-center gap-2">
                          <span
                            className={cx(
                              'rounded px-1.5 py-0.5 text-[10px] font-semibold',
                              doc.documentTypeId === 1
                                ? 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300'
                                : doc.documentTypeId === 2
                                ? 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
                                : 'bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300'
                            )}
                          >
                            {doc.documentTypeName}
                          </span>
                          <span className="font-semibold text-slate-800 dark:text-slate-200 truncate">
                            {doc.title}
                          </span>
                        </div>
                        <div className="mt-1 flex items-center gap-2 text-[11px] text-slate-400">
                          {doc.lessonName ? (
                            <span>{doc.lessonName}</span>
                          ) : doc.topicName ? (
                            <span>{doc.topicName}</span>
                          ) : (
                            <span>Toàn khối</span>
                          )}
                          {doc.file && (
                            <span>· {doc.file.extension.toUpperCase()}</span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => setPreviewDocId(doc.id)}
                          className="rounded px-2 py-1 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700"
                          title="Xem trước"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                        </button>

                        {isAuto ? (
                          <span className="inline-flex items-center gap-1 rounded bg-emerald-50 px-2 py-1 text-[11px] font-medium text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                            <Sparkles className="h-3 w-3" /> Tự động
                          </span>
                        ) : isPinned ? (
                          <button
                            type="button"
                            onClick={() => handleTogglePinDoc(attachModalItem, doc.id)}
                            className="inline-flex items-center gap-1 rounded bg-indigo-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-rose-600 transition"
                            title="Nhấp để gỡ ghim khỏi tiết học"
                          >
                            <Pin className="h-3 w-3" /> Đã ghim (Gỡ)
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleTogglePinDoc(attachModalItem, doc.id)}
                            className="inline-flex items-center gap-1 rounded border border-slate-300 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 hover:border-indigo-500 hover:text-indigo-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 transition"
                          >
                            <Plus className="h-3 w-3" /> Ghim vào tiết
                          </button>
                        )}
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </div>
        </Modal>
      )}

      {/* MODAL THÊM TÀI LIỆU MỚI TRỰC TIẾP TỪ TIẾT HỌC */}
      {newDocModalOpen && attachModalItem && (
        <DocumentForm
          defaultTypeId={1}
          onClose={() => setNewDocModalOpen(false)}
          onSaved={newDoc => {
            setNewDocModalOpen(false)
            handleTogglePinDoc(attachModalItem, newDoc.id)
            loadAttachDocs()
          }}
        />
      )}

      {/* MODAL THÊM / SỬA LỚP HỌC */}
      {classModalOpen && (
        <Modal
          title={editingClass ? `Sửa thông tin lớp ${editingClass.name}` : 'Thêm lớp học mới'}
          onRequestClose={() => setClassModalOpen(false)}
          footer={
            <>
              <Button variant="secondary" onClick={() => setClassModalOpen(false)}>
                Hủy
              </Button>
              <Button variant="primary" onClick={handleSaveClass} loading={savingClass}>
                {editingClass ? 'Lưu thay đổi' : 'Tạo lớp'}
              </Button>
            </>
          }
        >
          <div className="space-y-4">
            <Field label="Tên lớp học" required hint="Ví dụ: 10A1, 11A2, 12Tin">
              <input
                type="text"
                value={classNameInput}
                onChange={e => setClassNameInput(e.target.value)}
                placeholder="VD: 11A1"
                className={inputCls}
                autoFocus
              />
            </Field>

            <Field label="Năm học" hint="Ví dụ: 2024-2025">
              <input
                type="text"
                value={classYearInput}
                onChange={e => setClassYearInput(e.target.value)}
                placeholder="2024-2025"
                className={inputCls}
              />
            </Field>
          </div>
        </Modal>
      )}

      {/* MODAL THÊM / SỬA TIẾT DẠY TRONG KHUNG PPCT (MẪU CHUẨN CÔNG VĂN 5512) */}
      {planItemModalOpen && (
        <Modal
          title={editingPlanItem ? 'Chỉnh sửa bài dạy trong khung kế hoạch' : 'Thêm bài dạy vào kế hoạch'}
          onRequestClose={() => setPlanItemModalOpen(false)}
          wide="2xl"
          footer={
            <>
              <Button variant="secondary" onClick={() => setPlanItemModalOpen(false)}>
                Hủy
              </Button>
              <Button variant="primary" onClick={handleSavePlanItem} loading={savingPlanItem}>
                {editingPlanItem ? 'Lưu cập nhật' : 'Thêm bài dạy'}
              </Button>
            </>
          }
        >
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <Field label="Tuần thứ" required>
                <input
                  type="number"
                  min={1}
                  max={52}
                  value={planForm.weekNumber}
                  onChange={e => setPlanForm(f => ({ ...f, weekNumber: Number(e.target.value) }))}
                  className={inputCls}
                />
              </Field>
              <Field label="Tiết theo PPCT" required hint="VD: 1, 2 hoặc 3, 4">
                <input
                  type="text"
                  value={planForm.periodName}
                  onChange={e => setPlanForm(f => ({ ...f, periodName: e.target.value }))}
                  placeholder="1, 2"
                  className={inputCls}
                />
              </Field>
              <Field label="Số tiết" required hint="VD: 2LT hoặc 2TH">
                <input
                  type="text"
                  value={planForm.numberOfPeriods}
                  onChange={e => setPlanForm(f => ({ ...f, numberOfPeriods: e.target.value }))}
                  placeholder="2LT"
                  className={inputCls}
                />
              </Field>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Chủ đề (Topic)">
                <select
                  value={planForm.topicId}
                  onChange={e => {
                    const tid = Number(e.target.value)
                    setPlanForm(f => ({ ...f, topicId: tid, lessonId: 0 }))
                  }}
                  className={inputCls}
                >
                  <option value={0}>-- Chọn chủ đề --</option>
                  {lookups?.topics
                    .filter(t => t.gradeLevelId === selectedGradeId)
                    .map(t => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                </select>
              </Field>

              <Field label="Bài học liên kết">
                <select
                  value={planForm.lessonId}
                  onChange={e => {
                    const lid = Number(e.target.value)
                    const lObj = availableLessons.find(x => x.id === lid)
                    setPlanForm(f => ({
                      ...f,
                      lessonId: lid,
                      title: lObj && !f.title ? lObj.name : f.title
                    }))
                  }}
                  className={inputCls}
                  disabled={!planForm.topicId}
                >
                  <option value={0}>-- Chọn bài học --</option>
                  {availableLessons.map(l => (
                    <option key={l.id} value={l.id}>
                      {l.name}
                    </option>
                  ))}
                </select>
              </Field>
            </div>

            <Field label="Tên bài học" required>
              <input
                type="text"
                value={planForm.title}
                onChange={e => setPlanForm(f => ({ ...f, title: e.target.value }))}
                placeholder="VD: Bài 1. Hệ điều hành."
                className={inputCls}
              />
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Thiết bị dạy học" hint="VD: SGK, SGV, Máy tính nối mạng, tivi, các clip minh họa.">
                <input
                  type="text"
                  value={planForm.equipment}
                  onChange={e => setPlanForm(f => ({ ...f, equipment: e.target.value }))}
                  placeholder="SGK, SGV, Máy tính nối mạng, tivi..."
                  className={inputCls}
                />
              </Field>

              <Field label="Địa điểm dạy học" hint="VD: Phòng học/Phòng máy">
                <input
                  type="text"
                  value={planForm.location}
                  onChange={e => setPlanForm(f => ({ ...f, location: e.target.value }))}
                  placeholder="Phòng học/Phòng máy"
                  className={inputCls}
                />
              </Field>
            </div>

            <Field label="Ghi chú khung (nếu có)">
              <input
                type="text"
                value={planForm.note}
                onChange={e => setPlanForm(f => ({ ...f, note: e.target.value }))}
                placeholder="VD: Thực hành tại phòng máy 2"
                className={inputCls}
              />
            </Field>
          </div>
        </Modal>
      )}

      {/* PREVIEW TÀI LIỆU MODAL (DOCUMENT DETAIL) */}
      {previewDocId != null && (
        <DocumentDetail
          id={previewDocId}
          onClose={() => setPreviewDocId(null)}
          onChanged={() => {
            if (selectedClassId) loadSchedule(selectedClassId)
          }}
        />
      )}
    </div>
  )
}
