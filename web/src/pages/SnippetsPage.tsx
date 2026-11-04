import { useCallback, useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Check, Copy, Pencil, Plus, RotateCcw, Search, X } from 'lucide-react'
import { api } from '../services/api'
import { errText, useApp } from '../stores/appStore'
import { Badge, Button, CustomSelect, EmptyState, ErrorState, Pagination, Spinner, TagChips, cx, inputCls, useDebounced } from '../components/ui'
import { copyText } from '../components/CodeBlock'
import { SnippetDetail, SnippetForm } from '../features/snippets/SnippetParts'
import type { Snippet } from '../types'

function SnippetCard({
  s,
  gradeName,
  onView,
  onEdit,
  onTagClick,
}: {
  s: Snippet
  gradeName?: string
  onView: () => void
  onEdit: () => void
  onTagClick: (t: string) => void
}) {
  const [copied, setCopied] = useState(false)
  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation()
    await copyText(s.code)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <div className="group flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-indigo-300 hover:shadow-md dark:border-slate-800 dark:bg-slate-900 dark:hover:border-indigo-700/60">
      <div className="cursor-pointer space-y-2.5" onClick={onView}>
        {/* Tiêu đề & Ngôn ngữ */}
        <div className="flex items-start justify-between gap-2">
          <h3 className="line-clamp-1 font-semibold text-slate-800 transition-colors group-hover:text-indigo-600 dark:text-slate-100 dark:group-hover:text-indigo-400">
            {s.title}
          </h3>
          <Badge className="shrink-0 border border-indigo-200/60 bg-indigo-50 font-mono text-xs font-semibold text-indigo-700 dark:border-indigo-800/50 dark:bg-indigo-950/50 dark:text-indigo-300">
            {s.language}
          </Badge>
        </div>

        {/* Khối lớp, Chủ đề, Bài học */}
        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          {gradeName && (
            <Badge className="border border-emerald-200/60 bg-emerald-50 text-emerald-700 dark:border-emerald-800/50 dark:bg-emerald-950/50 dark:text-emerald-300">
              {gradeName}
            </Badge>
          )}
          {s.topicName && (
            <Badge className="border border-sky-200/60 bg-sky-50 text-sky-700 dark:border-sky-800/50 dark:bg-sky-950/50 dark:text-sky-300">
              {s.topicName}
            </Badge>
          )}
          {s.lessonName && (
            <Badge className="bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
              {s.lessonName}
            </Badge>
          )}
        </div>

        {/* Mô tả (văn bản thường) */}
        {s.description && (
          <p className="line-clamp-2 text-xs text-slate-600 dark:text-slate-400">
            {s.description}
          </p>
        )}

        {/* Đoạn mã xem trước */}
        {s.code && (
          <div className="relative overflow-hidden rounded-lg border border-slate-200/80 bg-slate-50 p-2.5 dark:border-slate-800 dark:bg-slate-950/80">
            <pre className="code-font line-clamp-3 overflow-hidden text-xs leading-relaxed text-slate-700 dark:text-slate-300">
              {s.code}
            </pre>
          </div>
        )}
      </div>

      {/* Footer: Thẻ & Thao tác */}
      <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3 dark:border-slate-800">
        <TagChips tags={s.tags.slice(0, 3)} onClick={onTagClick} />
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            title={copied ? 'Đã sao chép' : 'Sao chép mã'}
            onClick={handleCopy}
            className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-slate-100"
          >
            {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
            <span>{copied ? 'Đã chép' : 'Chép'}</span>
          </button>
          <Button size="sm" onClick={onEdit}>
            <Pencil className="h-3.5 w-3.5" />
            Sửa
          </Button>
        </div>
      </div>
    </div>
  )
}

export default function SnippetsPage() {
  const { lookups, confirm, toast } = useApp()
  const [params, setParams] = useSearchParams()
  const [q, setQ] = useState('')
  const dq = useDebounced(q)
  const [lang, setLang] = useState('')
  const [grade, setGrade] = useState('')
  const [topic, setTopic] = useState('')
  const [tag, setTag] = useState('')
  const [page, setPage] = useState(1)
  const [data, setData] = useState<{ items: Snippet[]; total: number } | null>(null)
  const [err, setErr] = useState('')
  const [form, setForm] = useState<{ sn: Snippet | null } | null>(params.get('new') ? { sn: null } : null)
  const [view, setView] = useState<Snippet | null>(null)

  useEffect(() => {
    if (params.get('new')) setParams({}, { replace: true })
  }, [params, setParams])

  useEffect(() => {
    setPage(1)
  }, [dq, lang, grade, topic, tag])

  const load = useCallback(() => {
    setErr('')
    api.snippets({ q: dq, language: lang, gradeLevelId: grade, topicId: topic, tag, page, pageSize: 20 })
      .then(r => setData({ items: r.items, total: r.total }))
      .catch(e => setErr(errText(e)))
  }, [dq, lang, grade, topic, tag, page])

  useEffect(load, [load])

  const filtered = Boolean(dq || lang || grade || topic || tag)

  const del = async (s: Snippet) => {
    if (!(await confirm(`Xóa đoạn mã "${s.title}"? Hành động này không thể hoàn tác.`, { confirmText: 'Xóa', danger: true }))) return
    try {
      await api.deleteSnippet(s.id)
      toast('success', 'Đã xóa đoạn mã.')
      setView(null)
      load()
    } catch (x) {
      toast('error', errText(x))
    }
  }

  return (
    <div className="flex h-full flex-col space-y-4">
      {/* 1. Header & Primary Action */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2.5">
          <h1 className="text-2xl font-bold tracking-tight text-slate-800 dark:text-slate-100">
            Ngân hàng mã nguồn
          </h1>
          <span className="rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-semibold text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300">
            {data ? `${data.total} đoạn mã` : '...'}
          </span>
        </div>
        <Button variant="primary" onClick={() => setForm({ sn: null })}>
          <Plus className="h-4 w-4" />
          Thêm đoạn mã
        </Button>
      </div>

      {/* 2. Quick Stat Pill Badges (Languages) */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setLang('')}
          className={cx(
            'flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition shadow-2xs',
            lang === ''
              ? 'border-indigo-600 bg-indigo-50 font-semibold text-indigo-700 dark:border-indigo-500 dark:bg-indigo-950/60 dark:text-indigo-300'
              : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400'
          )}
        >
          <span>Tất cả ngôn ngữ</span>
          <span className="rounded-full bg-slate-100 px-1.5 py-0.2 text-[10px] dark:bg-slate-800">
            {data?.total ?? 0}
          </span>
        </button>

        {lookups?.languages.map(l => {
          const isSelected = lang === l
          return (
            <button
              key={l}
              type="button"
              onClick={() => setLang(isSelected ? '' : l)}
              className={cx(
                'flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition shadow-2xs',
                isSelected
                  ? 'border-indigo-600 bg-indigo-50 font-semibold text-indigo-700 dark:border-indigo-500 dark:bg-indigo-950/60 dark:text-indigo-300 ring-2 ring-indigo-500/20'
                  : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400'
              )}
            >
              <span>{l}</span>
            </button>
          )
        })}
      </div>

      {/* 3. Search & Filter Bar */}
      <div className="rounded-xl border border-slate-200/80 bg-white p-3 shadow-xs dark:border-slate-800/80 dark:bg-slate-900">
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Ô tìm kiếm */}
          <div className="relative min-w-[240px] flex-1">
            <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              className={cx(inputCls, 'pl-9 pr-8')}
              placeholder="Tìm theo tiêu đề, mô tả, nội dung mã..."
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
          <CustomSelect
            className="w-36"
            value={grade}
            placeholder="Tất cả khối"
            onChange={val => {
              setGrade(val)
              setTopic('')
            }}
            options={[
              { value: '', label: 'Tất cả khối' },
              ...(lookups?.gradeLevels.map(g => ({ value: g.id, label: g.name })) ?? [])
            ]}
          />

          {/* Chủ đề */}
          <CustomSelect
            className="min-w-[200px] max-w-[320px] flex-1 sm:flex-initial"
            menuClassName="w-[360px] sm:w-[440px] max-w-[90vw]"
            align="right"
            value={topic}
            placeholder="Tất cả chủ đề"
            onChange={val => setTopic(val)}
            options={[
              { value: '', label: 'Tất cả chủ đề' },
              ...(lookups?.topics
                .filter(t => !grade || !t.gradeLevelId || t.gradeLevelId === Number(grade))
                .map(t => ({ value: t.id, label: t.name })) ?? [])
            ]}
          />

          {/* Tag đang lọc nếu có */}
          {tag && (
            <div className="inline-flex items-center gap-1 rounded-md bg-indigo-50 px-2.5 py-1.5 text-xs font-medium text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300">
              <span>#{tag}</span>
              <button
                type="button"
                onClick={() => setTag('')}
                className="hover:text-indigo-900 dark:hover:text-white"
                title="Bỏ lọc thẻ này"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          )}

          {/* Nút Xóa lọc */}
          {filtered && (
            <button
              type="button"
              onClick={() => {
                setQ('')
                setLang('')
                setGrade('')
                setTopic('')
                setTag('')
              }}
              className="inline-flex items-center gap-1 rounded-md px-2.5 py-2 text-sm font-medium text-slate-500 hover:bg-slate-100 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200 transition"
              title="Đặt lại bộ lọc"
            >
              <RotateCcw className="h-4 w-4" />
              <span>Xóa lọc</span>
            </button>
          )}
        </div>
      </div>

      {/* 4. Snippets Grid Content */}
      <section className="min-h-0 flex-1 overflow-y-auto">
        {err ? (
          <ErrorState message={err} onRetry={load} />
        ) : !data ? (
          <Spinner />
        ) : data.total === 0 ? (
          filtered ? (
            <EmptyState
              title="Không tìm thấy đoạn mã"
              text="Hãy thử từ khóa khác hoặc bỏ bớt bộ lọc."
              action={
                <Button
                  onClick={() => {
                    setQ('')
                    setLang('')
                    setGrade('')
                    setTopic('')
                    setTag('')
                  }}
                >
                  Xóa lọc
                </Button>
              }
            />
          ) : (
            <EmptyState
              title="Chưa có đoạn mã nào"
              text="Lưu các đoạn mã mẫu để tái sử dụng khi giảng dạy."
              action={
                <Button variant="primary" onClick={() => setForm({ sn: null })}>
                  <Plus className="h-4 w-4" />
                  Thêm đoạn mã đầu tiên
                </Button>
              }
            />
          )
        ) : (
          <div className="space-y-4">
            <div className="grid gap-3.5 md:grid-cols-2 xl:grid-cols-3">
              {data.items.map(s => {
                const gradeName = lookups?.gradeLevels.find(g => g.id === s.gradeLevelId)?.name
                return (
                  <SnippetCard
                    key={s.id}
                    s={s}
                    gradeName={gradeName}
                    onView={() => setView(s)}
                    onEdit={() => setForm({ sn: s })}
                    onTagClick={setTag}
                  />
                )
              })}
            </div>
            <Pagination page={page} pageSize={20} total={data.total} onChange={setPage} />
          </div>
        )}
      </section>

      {view && !form && (
        <SnippetDetail
          sn={view}
          onClose={() => setView(null)}
          onEdit={() => setForm({ sn: view })}
          onDelete={() => del(view)}
        />
      )}
      {form && (
        <SnippetForm
          sn={form.sn}
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
