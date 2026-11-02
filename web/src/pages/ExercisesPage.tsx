import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  BookOpen,
  Code2,
  Copy,
  Check,
  Eye,
  Filter,
  GraduationCap,
  Grid,
  Layers,
  LayoutList,
  Lightbulb,
  Pencil,
  Plus,
  RotateCcw,
  Search,
  Sparkles,
  Trash2,
  X
} from 'lucide-react'
import { api } from '../services/api'
import { errText, useApp } from '../stores/appStore'
import { Badge, Button, EmptyState, ErrorState, Pagination, Spinner, TagChips, cx, inputCls, useDebounced } from '../components/ui'
import { copyText } from '../components/CodeBlock'
import { ExerciseDetail, ExerciseForm } from '../features/exercises/ExerciseParts'
import type { Exercise } from '../types'
import { DIFFICULTIES, DIFFICULTY_STYLE } from '../utils/format'

type ViewMode = 'grid' | 'table'

const DIFFICULTY_CONFIG: Record<number, { label: string; badge: string; border: string; bgLight: string; text: string; dot: string }> = {
  1: {
    label: 'Nhận biết',
    badge: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/60',
    border: 'hover:border-emerald-400 dark:hover:border-emerald-600',
    bgLight: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
    text: 'text-emerald-600 dark:text-emerald-400',
    dot: 'bg-emerald-500'
  },
  2: {
    label: 'Thông hiểu',
    badge: 'bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-800/60',
    border: 'hover:border-sky-400 dark:hover:border-sky-600',
    bgLight: 'bg-sky-500/10 text-sky-600 dark:text-sky-400',
    text: 'text-sky-600 dark:text-sky-400',
    dot: 'bg-sky-500'
  },
  3: {
    label: 'Vận dụng',
    badge: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/60',
    border: 'hover:border-amber-400 dark:hover:border-amber-600',
    bgLight: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
    text: 'text-amber-600 dark:text-amber-400',
    dot: 'bg-amber-500'
  },
  4: {
    label: 'Vận dụng cao',
    badge: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800/60',
    border: 'hover:border-rose-400 dark:hover:border-rose-600',
    bgLight: 'bg-rose-500/10 text-rose-600 dark:text-rose-400',
    text: 'text-rose-600 dark:text-rose-400',
    dot: 'bg-rose-500'
  }
}

export default function ExercisesPage() {
  const { lookups, confirm, toast } = useApp()
  const [params, setParams] = useSearchParams()

  const [q, setQ] = useState('')
  const dq = useDebounced(q)
  const [grade, setGrade] = useState('')
  const [topic, setTopic] = useState('')
  const [diff, setDiff] = useState('')
  const [lang, setLang] = useState('')
  const [tag, setTag] = useState('')
  const [page, setPage] = useState(1)

  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    return (localStorage.getItem('teachstash_ex_view_mode') as ViewMode) || 'grid'
  })

  const [data, setData] = useState<{ items: Exercise[]; total: number } | null>(null)
  const [err, setErr] = useState('')
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState<{ ex: Exercise | null } | null>(params.get('new') ? { ex: null } : null)
  const [view, setView] = useState<Exercise | null>(null)
  const [copiedId, setCopiedId] = useState<number | null>(null)

  useEffect(() => {
    if (params.get('new')) setParams({}, { replace: true })
  }, [params, setParams])

  useEffect(() => {
    localStorage.setItem('teachstash_ex_view_mode', viewMode)
  }, [viewMode])

  useEffect(() => {
    setPage(1)
  }, [dq, grade, topic, diff, lang, tag])

  const load = useCallback(() => {
    setLoading(true)
    setErr('')
    api.exercises({
      q: dq,
      gradeLevelId: grade,
      topicId: topic,
      difficulty: diff,
      language: lang,
      tag,
      page,
      pageSize: 20
    })
      .then(r => setData({ items: r.items, total: r.total }))
      .catch(e => setErr(errText(e)))
      .finally(() => setLoading(false))
  }, [dq, grade, topic, diff, lang, tag, page])

  useEffect(load, [load])

  const hasFilter = !!(dq || grade || topic || diff || lang || tag)

  const clearFilters = () => {
    setQ('')
    setGrade('')
    setTopic('')
    setDiff('')
    setLang('')
    setTag('')
  }

  const del = async (e: Exercise) => {
    if (!(await confirm(`Xóa bài tập "${e.title}"? Hành động này không thể hoàn tác.`, { confirmText: 'Xóa', danger: true }))) return
    try {
      await api.deleteExercise(e.id)
      toast('success', 'Đã xóa bài tập thành công.')
      if (view?.id === e.id) setView(null)
      load()
    } catch (x) {
      toast('error', errText(x))
    }
  }

  const handleCopyStatement = async (e: Exercise, ev: React.MouseEvent) => {
    ev.stopPropagation()
    const content = `${e.title}\n\n${e.statement}`
    await copyText(content)
    setCopiedId(e.id)
    toast('success', 'Đã sao chép đề bài vào khay nhớ tạm!')
    setTimeout(() => setCopiedId(null), 2000)
  }

  // Thống kê nhanh trong trang hiện tại hoặc phân loại
  const stats = useMemo(() => {
    const list = data?.items || []
    return {
      total: data?.total ?? 0,
      hasCode: list.filter(i => Boolean(i.sampleCode)).length,
      hasSolution: list.filter(i => Boolean(i.solution)).length,
      hasHint: list.filter(i => Boolean(i.hint)).length,
      diff1: list.filter(i => i.difficulty === 1).length,
      diff2: list.filter(i => i.difficulty === 2).length,
      diff3: list.filter(i => i.difficulty === 3).length,
      diff4: list.filter(i => i.difficulty === 4).length
    }
  }, [data])

  return (
    <div className="flex h-full flex-col space-y-4">
      {/* 1. Header & Primary Action */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-800 dark:text-slate-100">Kho bài tập</h1>
            <span className="rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-semibold text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300">
              {data ? `${data.total} bài tập` : '...'}
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Quản lý ngân hàng câu hỏi, đề bài luyện tập, gợi ý, lời giải và mã nguồn mẫu.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Switch View Mode */}
          <div className="inline-flex rounded-lg border border-slate-200 bg-white p-0.5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
            <button
              type="button"
              title="Dạng lưới thẻ"
              onClick={() => setViewMode('grid')}
              className={cx(
                'flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition',
                viewMode === 'grid'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
              )}
            >
              <Grid className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Lưới thẻ</span>
            </button>
            <button
              type="button"
              title="Dạng danh sách"
              onClick={() => setViewMode('table')}
              className={cx(
                'flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition',
                viewMode === 'table'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
              )}
            >
              <LayoutList className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Danh sách</span>
            </button>
          </div>

          <Button variant="primary" onClick={() => setForm({ ex: null })}>
            <Plus className="h-4 w-4" />
            Thêm bài tập
          </Button>
        </div>
      </div>

      {/* 2. Quick Stat Pill Badges (Quick Filter by Difficulty) */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setDiff('')}
          className={cx(
            'flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition shadow-2xs',
            diff === ''
              ? 'border-indigo-600 bg-indigo-50 font-semibold text-indigo-700 dark:border-indigo-500 dark:bg-indigo-950/60 dark:text-indigo-300'
              : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400'
          )}
        >
          <span>Tất cả mức độ</span>
          <span className="rounded-full bg-slate-100 px-1.5 py-0.2 text-[10px] dark:bg-slate-800">
            {data?.total ?? 0}
          </span>
        </button>

        {Object.entries(DIFFICULTIES).map(([k, label]) => {
          const cfg = DIFFICULTY_CONFIG[Number(k)]
          const isSelected = diff === k
          return (
            <button
              key={k}
              type="button"
              onClick={() => setDiff(isSelected ? '' : k)}
              className={cx(
                'flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition shadow-2xs',
                isSelected
                  ? 'border-indigo-600 bg-indigo-50 font-semibold text-indigo-700 dark:border-indigo-500 dark:bg-indigo-950/60 dark:text-indigo-300 ring-2 ring-indigo-500/20'
                  : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400'
              )}
            >
              <span className={cx('h-2 w-2 rounded-full', cfg.dot)} />
              <span>{label}</span>
            </button>
          )
        })}
      </div>

      {/* 3. Search & Filter Bar */}
      <div className="rounded-xl border border-slate-200/80 bg-white p-3 shadow-xs dark:border-slate-800/80 dark:bg-slate-900">
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 md:grid-cols-12">
          {/* Ô tìm kiếm */}
          <div className="relative md:col-span-4">
            <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              className={cx(inputCls, 'pl-9 pr-8')}
              placeholder="Tìm theo tiêu đề, đề bài, từ khóa..."
              value={q}
              onChange={e => setQ(e.target.value)}
            />
            {q && (
              <button
                type="button"
                onClick={() => setQ('')}
                className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Khối lớp */}
          <div className="md:col-span-2">
            <select
              className={inputCls}
              value={grade}
              onChange={e => {
                setGrade(e.target.value)
                setTopic('')
              }}
            >
              <option value="">Tất cả khối</option>
              {lookups?.gradeLevels.map(g => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </select>
          </div>

          {/* Chủ đề */}
          <div className="md:col-span-3">
            <select
              className={inputCls}
              value={topic}
              onChange={e => setTopic(e.target.value)}
            >
              <option value="">Tất cả chủ đề</option>
              {lookups?.topics
                .filter(t => !grade || !t.gradeLevelId || t.gradeLevelId === Number(grade))
                .map(t => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
            </select>
          </div>

          {/* Ngôn ngữ lập trình */}
          <div className="md:col-span-2">
            <select
              className={inputCls}
              value={lang}
              onChange={e => setLang(e.target.value)}
            >
              <option value="">Mọi ngôn ngữ</option>
              {lookups?.languages.map(l => (
                <option key={l} value={l}>
                  {l}
                </option>
              ))}
            </select>
          </div>

          {/* Nút reset hoặc Tag badge */}
          <div className="flex items-center gap-1.5 md:col-span-1">
            {hasFilter ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearFilters}
                className="w-full text-slate-500 hover:text-rose-600 dark:hover:text-rose-400"
                title="Xóa toàn bộ bộ lọc"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span className="md:hidden">Xóa lọc</span>
              </Button>
            ) : null}
          </div>
        </div>

        {/* Thẻ tag đang lọc nếu có */}
        {tag && (
          <div className="mt-2.5 flex items-center gap-2 border-t border-slate-100 pt-2 text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400">
            <span>Đang lọc theo thẻ:</span>
            <span className="inline-flex items-center gap-1 rounded-md bg-indigo-50 px-2 py-0.5 font-medium text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300">
              #{tag}
              <button
                type="button"
                onClick={() => setTag('')}
                className="ml-1 hover:text-indigo-900 dark:hover:text-white"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          </div>
        )}
      </div>

      {/* 4. Content Area: Grid / Table / Loading / Empty */}
      {err ? (
        <ErrorState message={err} onRetry={load} />
      ) : loading && !data ? (
        <Spinner label="Đang tải danh sách bài tập..." />
      ) : !data || data.total === 0 ? (
        hasFilter ? (
          <EmptyState
            title="Không tìm thấy bài tập phù hợp"
            text="Hãy thử điều chỉnh từ khóa hoặc xóa bớt tiêu chí lọc."
            action={
              <Button variant="secondary" onClick={clearFilters}>
                <RotateCcw className="h-4 w-4" />
                Xóa bộ lọc
              </Button>
            }
          />
        ) : (
          <EmptyState
            title="Chưa có bài tập nào"
            text="Tạo ngân hàng bài tập kèm đề bài, gợi ý giải thuật, lời giải chi tiết và mã nguồn mẫu để tái sử dụng thuận tiện khi giảng dạy."
            action={
              <Button variant="primary" onClick={() => setForm({ ex: null })}>
                <Plus className="h-4 w-4" />
                Thêm bài tập đầu tiên
              </Button>
            }
          />
        )
      ) : (
        <div className="space-y-4">
          {/* A. Grid View */}
          {viewMode === 'grid' ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {data.items.map(e => {
                const cfg = DIFFICULTY_CONFIG[e.difficulty] || DIFFICULTY_CONFIG[2]
                return (
                  <div
                    key={e.id}
                    onClick={() => setView(e)}
                    className={cx(
                      'group relative flex flex-col justify-between rounded-xl border border-slate-200/90 bg-white p-4 shadow-xs transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md cursor-pointer dark:border-slate-800/90 dark:bg-slate-900',
                      cfg.border
                    )}
                  >
                    <div>
                      {/* Top Badges */}
                      <div className="flex items-center justify-between gap-2">
                        <span
                          className={cx(
                            'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold',
                            cfg.badge
                          )}
                        >
                          <span className={cx('h-1.5 w-1.5 rounded-full', cfg.dot)} />
                          {cfg.label}
                        </span>

                        <div className="flex items-center gap-1">
                          {e.language && (
                            <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-mono font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                              <Code2 className="h-3 w-3 text-indigo-500" />
                              {e.language}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Title */}
                      <h3 className="mt-3 line-clamp-2 text-base font-semibold text-slate-800 group-hover:text-indigo-600 dark:text-slate-100 dark:group-hover:text-indigo-400">
                        {e.title}
                      </h3>

                      {/* Trích đoạn đề bài */}
                      <p className="mt-2 line-clamp-3 text-xs leading-relaxed text-slate-600 dark:text-slate-400">
                        {e.statement || 'Chưa có mô tả đề bài.'}
                      </p>

                      {/* Breadcrumb Chủ đề / Bài học */}
                      {(e.topicName || e.lessonName) && (
                        <div className="mt-3 flex items-center gap-1 text-[11px] text-slate-400">
                          <BookOpen className="h-3 w-3 shrink-0 text-slate-400" />
                          <span className="truncate">
                            {e.topicName}
                            {e.lessonName ? ` • ${e.lessonName}` : ''}
                          </span>
                        </div>
                      )}

                      {/* Tags */}
                      {e.tags && e.tags.length > 0 && (
                        <div className="mt-2.5">
                          <TagChips tags={e.tags.slice(0, 3)} onClick={setTag} />
                        </div>
                      )}
                    </div>

                    {/* Footer of Card */}
                    <div className="mt-4 border-t border-slate-100 pt-3 dark:border-slate-800/80">
                      <div className="flex items-center justify-between">
                        {/* Features indicator: Gợi ý, Lời giải, Code */}
                        <div className="flex items-center gap-1 text-[11px] text-slate-400">
                          {e.hint && (
                            <span
                              title="Có gợi ý"
                              className="inline-flex items-center rounded-md bg-amber-50 p-1 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400"
                            >
                              <Lightbulb className="h-3.5 w-3.5" />
                            </span>
                          )}
                          {e.solution && (
                            <span
                              title="Có lời giải chi tiết"
                              className="inline-flex items-center rounded-md bg-emerald-50 p-1 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400"
                            >
                              <Sparkles className="h-3.5 w-3.5" />
                            </span>
                          )}
                          {e.sampleCode && (
                            <span
                              title="Có mã nguồn mẫu"
                              className="inline-flex items-center rounded-md bg-indigo-50 p-1 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400"
                            >
                              <Code2 className="h-3.5 w-3.5" />
                            </span>
                          )}
                        </div>

                        {/* Action Buttons */}
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            title="Sao chép đề bài"
                            onClick={ev => handleCopyStatement(e, ev)}
                            className="inline-flex h-7 w-7 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                          >
                            {copiedId === e.id ? (
                              <Check className="h-3.5 w-3.5 text-emerald-600" />
                            ) : (
                              <Copy className="h-3.5 w-3.5" />
                            )}
                          </button>
                          <button
                            type="button"
                            title="Sửa bài tập"
                            onClick={ev => {
                              ev.stopPropagation()
                              setForm({ ex: e })
                            }}
                            className="inline-flex h-7 w-7 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-indigo-600 dark:hover:bg-slate-800 dark:hover:text-indigo-400"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            title="Xóa bài tập"
                            onClick={ev => {
                              ev.stopPropagation()
                              del(e)
                            }}
                            className="inline-flex h-7 w-7 items-center justify-center rounded-md text-slate-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40 dark:hover:text-rose-400"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            /* B. Table View */
            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs dark:border-slate-800 dark:bg-slate-900">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-slate-200 bg-slate-50/75 text-xs font-semibold text-slate-600 dark:border-slate-800 dark:bg-slate-800/50 dark:text-slate-300">
                  <tr>
                    <th className="px-4 py-3">Mức độ</th>
                    <th className="px-4 py-3">Bài tập & Đề bài</th>
                    <th className="px-4 py-3">Chủ đề</th>
                    <th className="px-4 py-3">Ngôn ngữ</th>
                    <th className="px-4 py-3 text-center">Tài nguyên</th>
                    <th className="px-4 py-3 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {data.items.map(e => {
                    const cfg = DIFFICULTY_CONFIG[e.difficulty] || DIFFICULTY_CONFIG[2]
                    return (
                      <tr
                        key={e.id}
                        onClick={() => setView(e)}
                        className="group cursor-pointer transition hover:bg-slate-50/80 dark:hover:bg-slate-800/50"
                      >
                        <td className="whitespace-nowrap px-4 py-3.5 align-top">
                          <span
                            className={cx(
                              'inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-medium',
                              cfg.badge
                            )}
                          >
                            <span className={cx('h-1.5 w-1.5 rounded-full', cfg.dot)} />
                            {cfg.label}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 align-top">
                          <div className="font-semibold text-slate-800 group-hover:text-indigo-600 dark:text-slate-100 dark:group-hover:text-indigo-400">
                            {e.title}
                          </div>
                          <p className="mt-1 line-clamp-2 text-xs text-slate-500 dark:text-slate-400">
                            {e.statement}
                          </p>
                          {e.tags && e.tags.length > 0 && (
                            <div className="mt-1.5">
                              <TagChips tags={e.tags.slice(0, 4)} onClick={setTag} />
                            </div>
                          )}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3.5 align-top text-xs text-slate-600 dark:text-slate-300">
                          {e.topicName ? (
                            <div>
                              <div className="font-medium text-slate-700 dark:text-slate-200">{e.topicName}</div>
                              {e.lessonName && <div className="text-slate-400">{e.lessonName}</div>}
                            </div>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3.5 align-top">
                          {e.language ? (
                            <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 text-xs font-mono font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                              <Code2 className="h-3 w-3 text-indigo-500" />
                              {e.language}
                            </span>
                          ) : (
                            <span className="text-xs text-slate-400">—</span>
                          )}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3.5 align-top text-center">
                          <div className="flex items-center justify-center gap-1.5 text-slate-400">
                            {e.hint && (
                              <span title="Có gợi ý" className="text-amber-500">
                                <Lightbulb className="h-4 w-4" />
                              </span>
                            )}
                            {e.solution && (
                              <span title="Có lời giải" className="text-emerald-500">
                                <Sparkles className="h-4 w-4" />
                              </span>
                            )}
                            {e.sampleCode && (
                              <span title="Có mã mẫu" className="text-indigo-500">
                                <Code2 className="h-4 w-4" />
                              </span>
                            )}
                            {!e.hint && !e.solution && !e.sampleCode && (
                              <span className="text-xs text-slate-400">—</span>
                            )}
                          </div>
                        </td>
                        <td className="whitespace-nowrap px-4 py-3.5 text-right align-top">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              type="button"
                              title="Sao chép đề bài"
                              onClick={ev => handleCopyStatement(e, ev)}
                              className="inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                            >
                              {copiedId === e.id ? (
                                <Check className="h-4 w-4 text-emerald-600" />
                              ) : (
                                <Copy className="h-4 w-4" />
                              )}
                            </button>
                            <button
                              type="button"
                              title="Xem chi tiết"
                              onClick={ev => {
                                ev.stopPropagation()
                                setView(e)
                              }}
                              className="inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-indigo-600 dark:hover:bg-slate-800 dark:hover:text-indigo-400"
                            >
                              <Eye className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              title="Sửa bài tập"
                              onClick={ev => {
                                ev.stopPropagation()
                                setForm({ ex: e })
                              }}
                              className="inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-indigo-600 dark:hover:bg-slate-800 dark:hover:text-indigo-400"
                            >
                              <Pencil className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              title="Xóa bài tập"
                              onClick={ev => {
                                ev.stopPropagation()
                                del(e)
                              }}
                              className="inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40 dark:hover:text-rose-400"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          <div className="pt-2">
            <Pagination page={page} pageSize={20} total={data.total} onChange={setPage} />
          </div>
        </div>
      )}

      {/* 5. Modals */}
      {view && !form && (
        <ExerciseDetail
          ex={view}
          onClose={() => setView(null)}
          onEdit={() => setForm({ ex: view })}
          onDelete={() => del(view)}
        />
      )}
      {form && (
        <ExerciseForm
          ex={form.ex}
          onClose={() => setForm(null)}
          onSaved={() => {
            setForm(null)
            setView(null)
            load()
          }}
        />
      )}
    </div>
  )
}
