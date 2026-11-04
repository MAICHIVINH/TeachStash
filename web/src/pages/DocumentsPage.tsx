import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Eye, Pencil, Plus, RotateCcw, Search, Shuffle, SlidersHorizontal, Star, Trash2, X } from 'lucide-react'
import { api, type DocFilters } from '../services/api'
import { errText, useApp } from '../stores/appStore'
import { Button, CustomSelect, EmptyState, ErrorState, Pagination, Spinner, cx, inputCls, useDebounced } from '../components/ui'
import DocumentTable from '../features/documents/DocumentTable'
import DocumentForm from '../features/documents/DocumentForm'
import DocumentDetail from '../features/documents/DocumentDetail'
import type { DocumentItem, Facets } from '../types'

const PAGE_SIZE = 20
type Filters = {
  gradeLevelId: number | null
  topicId: number | null
  lessonId: number | null
  tag: string
  language: string
  typeId: number | null
  from: string
  to: string
  favorite: boolean
}
const NONE: Filters = {
  gradeLevelId: null,
  topicId: null,
  lessonId: null,
  tag: '',
  language: '',
  typeId: null,
  from: '',
  to: '',
  favorite: false
}

export default function DocumentsPage() {
  const [params] = useSearchParams()
  const routeType = params.get('type') ? Number(params.get('type')) : null
  const { lookups, toast, confirm } = useApp()
  const [q, setQ] = useState('')
  const dq = useDebounced(q)
  const [filters, setFilters] = useState<Filters>(NONE)
  const [page, setPage] = useState(1)
  const [data, setData] = useState<{ items: DocumentItem[]; total: number } | null>(null)
  const [facets, setFacets] = useState<Facets | null>(null)
  const [err, setErr] = useState('')
  const [loading, setLoading] = useState(true)
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [form, setForm] = useState<{ doc: DocumentItem | null } | null>(null)
  const [detail, setDetail] = useState<number | null>(null)
  const reqId = useRef(0)

  useEffect(() => { setFilters(NONE); setPage(1); setQ('') }, [routeType])
  useEffect(() => { setPage(1) }, [dq, filters])

  const typeId = routeType ?? filters.typeId
  const load = useCallback(async () => {
    const id = ++reqId.current
    setLoading(true); setErr('')
    const f: DocFilters = {
      q: dq,
      typeId,
      gradeLevelId: filters.gradeLevelId,
      topicId: filters.topicId,
      lessonId: filters.lessonId,
      tag: filters.tag,
      language: filters.language,
      createdFrom: filters.from,
      createdTo: filters.to,
      favorite: filters.favorite || undefined,
      page,
      pageSize: PAGE_SIZE,
    }
    try {
      const r = await api.documents(f)
      if (id !== reqId.current) return
      setData({ items: r.items, total: r.total })
      setFacets(r.facets ?? null)
    } catch (e) {
      if (id === reqId.current) setErr(errText(e))
    } finally {
      if (id === reqId.current) setLoading(false)
    }
  }, [dq, typeId, filters, page])

  useEffect(() => { load() }, [load])

  const typeName = routeType ? lookups!.documentTypes.find(t => t.id === routeType)?.name : null
  const activeFilterCount = Object.entries(filters).filter(([k, v]) => k !== 'typeId' && !!v).length + (routeType ? 0 : filters.typeId ? 1 : 0)
  const advancedCount = (filters.language ? 1 : 0) + (filters.tag ? 1 : 0) + (filters.from || filters.to ? 1 : 0)
  const hasQuery = !!dq || activeFilterCount > 0
  const setF = (patch: Partial<Filters>) => setFilters(p => ({ ...p, ...patch }))

  const toggleFav = async (d: DocumentItem) => {
    try {
      await api.favorite(d.id, !d.isFavorite)
      load()
    } catch (e) {
      toast('error', errText(e))
    }
  }

  const trash = async (d: DocumentItem) => {
    if (!(await confirm(`Chuyển "${d.title}" vào thùng rác?\nBạn có thể khôi phục sau.`, { confirmText: 'Chuyển vào thùng rác', danger: true }))) return
    try {
      await api.trashDocs([d.id])
      toast('success', 'Đã chuyển vào thùng rác.')
      load()
    } catch (e) {
      toast('error', errText(e))
    }
  }

  const topicsForGrade = lookups!.topics.filter(t => filters.gradeLevelId == null || t.gradeLevelId == null || t.gradeLevelId === filters.gradeLevelId)

  return (
    <div className="flex h-full flex-col space-y-4">
      {/* 1. Header & Primary Action */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2.5">
          <h1 className="text-2xl font-bold tracking-tight text-slate-800 dark:text-slate-100">
            {typeName ?? 'Tất cả tài liệu'}
          </h1>
          <span className="rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-semibold text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300">
            {data ? `${data.total} tài liệu` : '...'}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {routeType === 4 && (
            <Link to="/exam-generator">
              <Button className="border-indigo-300 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 dark:border-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300">
                <Shuffle className="h-4 w-4" />
                Tạo đề từ ma trận
              </Button>
            </Link>
          )}
          <Button variant="primary" onClick={() => setForm({ doc: null })}>
            <Plus className="h-4 w-4" />
            Thêm tài liệu
          </Button>
        </div>
      </div>

      {/* 2. Quick Stat Pill Badges */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => {
            if (!routeType) setF({ typeId: null, favorite: false })
            else setF({ favorite: false })
          }}
          className={cx(
            'flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition shadow-2xs',
            !filters.favorite && (!filters.typeId || routeType)
              ? 'border-indigo-600 bg-indigo-50 font-semibold text-indigo-700 dark:border-indigo-500 dark:bg-indigo-950/60 dark:text-indigo-300'
              : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400'
          )}
        >
          <span>Tất cả</span>
          <span className="rounded-full bg-slate-100 px-1.5 py-0.2 text-[10px] dark:bg-slate-800">
            {data?.total ?? 0}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setF({ favorite: !filters.favorite })}
          className={cx(
            'flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition shadow-2xs',
            filters.favorite
              ? 'border-amber-500 bg-amber-50 font-semibold text-amber-700 dark:border-amber-500 dark:bg-amber-950/60 dark:text-amber-300 ring-2 ring-amber-500/20'
              : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400'
          )}
        >
          <Star className={cx('h-3.5 w-3.5', filters.favorite ? 'fill-amber-500 text-amber-500' : 'text-slate-400')} />
          <span>Yêu thích</span>
        </button>

        {!routeType && facets?.types && facets.types.map(t => {
          if (!t.key) return null
          const isSelected = filters.typeId === Number(t.key)
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => setF({ typeId: isSelected ? null : Number(t.key) })}
              className={cx(
                'flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition shadow-2xs',
                isSelected
                  ? 'border-indigo-600 bg-indigo-50 font-semibold text-indigo-700 dark:border-indigo-500 dark:bg-indigo-950/60 dark:text-indigo-300 ring-2 ring-indigo-500/20'
                  : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400'
              )}
            >
              <span>{t.name}</span>
              <span className="rounded-full bg-slate-100 px-1.5 py-0.2 text-[10px] dark:bg-slate-800">
                {t.count}
              </span>
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
              placeholder="Tìm theo tiêu đề, tóm tắt, tên tệp..."
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
            value={filters.gradeLevelId ?? ''}
            placeholder="Tất cả khối"
            onChange={val => {
              setF({
                gradeLevelId: val ? Number(val) : null,
                topicId: null,
                lessonId: null,
              })
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
            value={filters.topicId ?? ''}
            placeholder="Tất cả chủ đề"
            onChange={val => {
              setF({
                topicId: val ? Number(val) : null,
                lessonId: null,
              })
            }}
            options={[
              { value: '', label: 'Tất cả chủ đề' },
              ...topicsForGrade.map(t => ({ value: t.id, label: t.name }))
            ]}
          />

          {/* Bài học (nếu đã chọn chủ đề) */}
          {filters.topicId && (
            <CustomSelect
              className="min-w-[180px] max-w-[280px] flex-1 sm:flex-initial"
              menuClassName="w-[320px] sm:w-[380px] max-w-[90vw]"
              align="right"
              value={filters.lessonId ?? ''}
              placeholder="Tất cả bài học"
              onChange={val => setF({ lessonId: val ? Number(val) : null })}
              options={[
                { value: '', label: 'Tất cả bài học' },
                ...(lookups?.lessons.filter(l => l.topicId === filters.topicId).map(l => ({ value: l.id, label: l.name })) ?? [])
              ]}
            />
          )}

          {/* Nút Bộ lọc nâng cao */}
          <button
            type="button"
            onClick={() => setShowAdvanced(s => !s)}
            className={cx(
              'inline-flex items-center gap-1.5 rounded-md border px-3 py-2 text-sm font-medium transition',
              showAdvanced || advancedCount > 0
                ? 'border-indigo-500 bg-indigo-50 text-indigo-700 dark:border-indigo-500 dark:bg-indigo-950/60 dark:text-indigo-300'
                : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700'
            )}
          >
            <SlidersHorizontal className="h-4 w-4" />
            <span>Nâng cao</span>
            {advancedCount > 0 && (
              <span className="rounded-full bg-indigo-600 px-1.5 py-0.2 text-[10px] text-white">
                {advancedCount}
              </span>
            )}
          </button>

          {/* Nút Xóa lọc */}
          {hasQuery && (
            <button
              type="button"
              onClick={() => {
                setFilters(NONE)
                setQ('')
              }}
              className="inline-flex items-center gap-1 rounded-md px-2.5 py-2 text-sm font-medium text-slate-500 hover:bg-slate-100 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200 transition"
              title="Đặt lại bộ lọc"
            >
              <RotateCcw className="h-4 w-4" />
              <span>Xóa lọc</span>
            </button>
          )}
        </div>

        {/* Bảng mở rộng Bộ lọc nâng cao */}
        {showAdvanced && (
          <div className="mt-3 border-t border-slate-100 pt-3 dark:border-slate-800/80">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-4">
              {/* Ngôn ngữ */}
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">
                  Ngôn ngữ lập trình
                </label>
                <select
                  className={inputCls}
                  value={filters.language}
                  onChange={e => setF({ language: e.target.value })}
                >
                  <option value="">Tất cả ngôn ngữ</option>
                  {lookups?.languages.map(l => (
                    <option key={l} value={l}>
                      {l}
                    </option>
                  ))}
                </select>
              </div>

              {/* Thẻ (Tags) */}
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">
                  Thẻ phân loại
                </label>
                <select
                  className={inputCls}
                  value={filters.tag}
                  onChange={e => setF({ tag: e.target.value })}
                >
                  <option value="">Tất cả thẻ</option>
                  {facets?.tags.filter(t => t.key).map(t => (
                    <option key={t.key} value={t.key}>
                      #{t.name} ({t.count})
                    </option>
                  ))}
                </select>
              </div>

              {/* Từ ngày */}
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">
                  Từ ngày tạo
                </label>
                <input
                  type="date"
                  className={inputCls}
                  value={filters.from}
                  onChange={e => setF({ from: e.target.value })}
                />
              </div>

              {/* Đến ngày */}
              <div>
                <div className="mb-1 flex items-center justify-between">
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400">
                    Đến ngày tạo
                  </label>
                  {(filters.from || filters.to) && (
                    <button
                      type="button"
                      onClick={() => setF({ from: '', to: '' })}
                      className="text-xs text-indigo-600 hover:underline dark:text-indigo-400"
                    >
                      Xóa ngày
                    </button>
                  )}
                </div>
                <input
                  type="date"
                  className={inputCls}
                  value={filters.to}
                  onChange={e => setF({ to: e.target.value })}
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 4. Document Table Section (Full Width) */}
      <section className="min-h-0 flex-1 overflow-y-auto">
        {err ? (
          <ErrorState message={err} onRetry={load} />
        ) : !data ? (
          <Spinner />
        ) : data.total === 0 && !loading ? (
          hasQuery ? (
            <EmptyState
              title="Không tìm thấy kết quả"
              text="Hãy thử từ khóa khác hoặc bỏ bớt bộ lọc."
              action={<Button onClick={() => { setFilters(NONE); setQ('') }}>Xóa lọc</Button>}
            />
          ) : (
            <EmptyState
              title={typeName ? `Chưa có ${typeName.toLowerCase()} nào` : 'Kho chưa có tài liệu'}
              text="Hãy thêm tài liệu đầu tiên của bạn để bắt đầu xây dựng kho giáo án."
              action={<Button variant="primary" onClick={() => setForm({ doc: null })}><Plus className="h-4 w-4" />Thêm tài liệu đầu tiên</Button>}
            />
          )
        ) : (
          <div className={cx(loading && 'opacity-60 transition-opacity')}>
            <DocumentTable
              items={data.items}
              onOpen={d => setDetail(d.id)}
              onFavorite={toggleFav}
              actions={d => (
                <div className="flex justify-end gap-1">
                  <Button size="sm" variant="ghost" title="Xem" onClick={() => setDetail(d.id)}>
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    title="Sửa"
                    onClick={() => api.document(d.id).then(full => setForm({ doc: full })).catch(e => toast('error', errText(e)))}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button size="sm" variant="ghost" title="Xóa" onClick={() => trash(d)}>
                    <Trash2 className="h-4 w-4 text-rose-500" />
                  </Button>
                </div>
              )}
            />
            <Pagination page={page} pageSize={PAGE_SIZE} total={data.total} onChange={setPage} />
          </div>
        )}
      </section>

      {form && (
        <DocumentForm
          doc={form.doc}
          defaultTypeId={routeType}
          onClose={() => setForm(null)}
          onSaved={d => {
            setForm(null)
            load()
            setDetail(null)
            if (!form.doc) setDetail(d.id)
          }}
        />
      )}
      {detail != null && !form && (
        <DocumentDetail
          id={detail}
          onClose={() => setDetail(null)}
          onChanged={load}
          onEdit={d => { setForm({ doc: d }) }}
        />
      )}
    </div>
  )
}
