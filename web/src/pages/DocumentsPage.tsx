import { useCallback, useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Eye, Filter, Pencil, Plus, Search, Star, Trash2, X } from 'lucide-react'
import { api, type DocFilters } from '../services/api'
import { errText, useApp } from '../stores/appStore'
import { Button, EmptyState, ErrorState, Pagination, Spinner, cx, inputCls, useDebounced } from '../components/ui'
import DocumentTable from '../features/documents/DocumentTable'
import DocumentForm from '../features/documents/DocumentForm'
import DocumentDetail from '../features/documents/DocumentDetail'
import type { DocumentItem, Facets, FacetItem } from '../types'

const PAGE_SIZE = 20
type Filters = { gradeLevelId: number | null; topicId: number | null; lessonId: number | null; tag: string; language: string; typeId: number | null; from: string; to: string; favorite: boolean }
const NONE: Filters = { gradeLevelId: null, topicId: null, lessonId: null, tag: '', language: '', typeId: null, from: '', to: '', favorite: false }

function FacetGroup({ title, items, active, onPick }: { title: string; items: FacetItem[]; active: string; onPick: (key: string) => void }) {
  if (!items.length) return null
  return (
    <div className="mb-4">
      <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">{title}</div>
      {items.map(i => (
        <button key={i.key + i.name} disabled={i.key === ''} onClick={() => onPick(active === i.key ? '' : i.key)}
          className={cx('flex w-full items-center justify-between rounded px-2 py-1 text-left text-sm', active === i.key ? 'bg-indigo-100 font-semibold text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300' : 'hover:bg-slate-100 dark:hover:bg-slate-800')}>
          <span className="truncate">{i.name}</span><span className="ml-2 text-xs text-slate-400">{i.count}</span>
        </button>
      ))}
    </div>
  )
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
  const [showFacets, setShowFacets] = useState(true)
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
      q: dq, typeId, gradeLevelId: filters.gradeLevelId, topicId: filters.topicId, lessonId: filters.lessonId,
      tag: filters.tag, language: filters.language, createdFrom: filters.from, createdTo: filters.to,
      favorite: filters.favorite || undefined, page, pageSize: PAGE_SIZE,
    }
    try {
      const r = await api.documents(f)
      if (id !== reqId.current) return
      setData({ items: r.items, total: r.total }); setFacets(r.facets ?? null)
    } catch (e) { if (id === reqId.current) setErr(errText(e)) } finally { if (id === reqId.current) setLoading(false) }
  }, [dq, typeId, filters, page])
  useEffect(() => { load() }, [load])

  const typeName = routeType ? lookups!.documentTypes.find(t => t.id === routeType)?.name : null
  const activeFilterCount = Object.entries(filters).filter(([k, v]) => k !== 'typeId' && !!v).length + (routeType ? 0 : filters.typeId ? 1 : 0)
  const hasQuery = !!dq || activeFilterCount > 0
  const setF = (patch: Partial<Filters>) => setFilters(p => ({ ...p, ...patch }))

  const toggleFav = async (d: DocumentItem) => { try { await api.favorite(d.id, !d.isFavorite); load() } catch (e) { toast('error', errText(e)) } }
  const trash = async (d: DocumentItem) => {
    if (!(await confirm(`Chuyển "${d.title}" vào thùng rác?\nBạn có thể khôi phục sau.`, { confirmText: 'Chuyển vào thùng rác', danger: true }))) return
    try { await api.trashDocs([d.id]); toast('success', 'Đã chuyển vào thùng rác.'); load() } catch (e) { toast('error', errText(e)) }
  }

  const topicsForGrade = lookups!.topics.filter(t => filters.gradeLevelId == null || t.gradeLevelId == null || t.gradeLevelId === filters.gradeLevelId)

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <h1 className="mr-2 text-xl font-bold">{typeName ?? 'Tất cả tài liệu'}</h1>
        <div className="relative w-72">
          <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input className={inputCls + ' pl-9'} placeholder="Tìm trong danh sách..." value={q} onChange={e => setQ(e.target.value)} />
        </div>
        <Button onClick={() => setShowFacets(s => !s)}><Filter className="h-4 w-4" />Bộ lọc{activeFilterCount > 0 && ` (${activeFilterCount})`}</Button>
        <Button variant={filters.favorite ? 'primary' : 'secondary'} onClick={() => setF({ favorite: !filters.favorite })}><Star className="h-4 w-4" />Yêu thích</Button>
        {hasQuery && <Button variant="ghost" onClick={() => { setFilters(NONE); setQ('') }}><X className="h-4 w-4" />Xóa lọc</Button>}
        <Button variant="primary" className="ml-auto" onClick={() => setForm({ doc: null })}><Plus className="h-4 w-4" />Thêm tài liệu</Button>
      </div>

      <div className="flex min-h-0 flex-1 gap-4">
        {showFacets && (
          <aside className="w-60 shrink-0 overflow-y-auto rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900">
            {!routeType && facets && <FacetGroup title="Loại tài liệu" items={facets.types} active={filters.typeId ? String(filters.typeId) : ''} onPick={k => setF({ typeId: k ? Number(k) : null })} />}
            {facets && <FacetGroup title="Khối lớp" items={facets.grades} active={filters.gradeLevelId ? String(filters.gradeLevelId) : ''} onPick={k => setF({ gradeLevelId: k ? Number(k) : null })} />}
            {facets && <FacetGroup title="Chủ đề" items={facets.topics} active={filters.topicId ? String(filters.topicId) : ''} onPick={k => setF({ topicId: k ? Number(k) : null, lessonId: null })} />}
            {filters.topicId && (
              <div className="mb-4"><div className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">Bài học</div>
                <select className={inputCls} value={filters.lessonId ?? ''} onChange={e => setF({ lessonId: e.target.value ? Number(e.target.value) : null })}>
                  <option value="">Tất cả bài học</option>{lookups!.lessons.filter(l => l.topicId === filters.topicId).map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                </select></div>
            )}
            {facets && <FacetGroup title="Ngôn ngữ" items={facets.languages} active={filters.language} onPick={k => setF({ language: k })} />}
            {facets && <FacetGroup title="Thẻ" items={facets.tags} active={filters.tag} onPick={k => setF({ tag: k })} />}
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">Ngày tạo</div>
            <div className="mt-1 space-y-1">
              <input type="date" className={inputCls} value={filters.from} onChange={e => setF({ from: e.target.value })} title="Từ ngày" />
              <input type="date" className={inputCls} value={filters.to} onChange={e => setF({ to: e.target.value })} title="Đến ngày" />
            </div>
            {topicsForGrade.length === 0 && <p className="mt-3 text-xs text-slate-400">Mẹo: thêm chủ đề/bài học trong Cài đặt để lọc theo chương trình.</p>}
          </aside>
        )}
        <section className="min-w-0 flex-1 overflow-y-auto">
          {err ? <ErrorState message={err} onRetry={load} /> : !data ? <Spinner /> : data.total === 0 && !loading ? (
            hasQuery ? <EmptyState title="Không tìm thấy kết quả" text="Hãy thử từ khóa khác hoặc bỏ bớt bộ lọc." action={<Button onClick={() => { setFilters(NONE); setQ('') }}>Xóa lọc</Button>} />
              : <EmptyState title={typeName ? `Chưa có ${typeName.toLowerCase()} nào` : 'Kho chưa có tài liệu'} text="Hãy thêm tài liệu đầu tiên của bạn để bắt đầu xây dựng kho giáo án."
                action={<Button variant="primary" onClick={() => setForm({ doc: null })}><Plus className="h-4 w-4" />Thêm tài liệu đầu tiên</Button>} />
          ) : (
            <div className={cx(loading && 'opacity-60 transition-opacity')}>
              <DocumentTable items={data.items} onOpen={d => setDetail(d.id)} onFavorite={toggleFav}
                actions={d => (
                  <div className="flex justify-end gap-1">
                    <Button size="sm" variant="ghost" title="Xem" onClick={() => setDetail(d.id)}><Eye className="h-4 w-4" /></Button>
                    <Button size="sm" variant="ghost" title="Sửa" onClick={() => api.document(d.id).then(full => setForm({ doc: full })).catch(e => toast('error', errText(e)))}><Pencil className="h-4 w-4" /></Button>
                    <Button size="sm" variant="ghost" title="Xóa" onClick={() => trash(d)}><Trash2 className="h-4 w-4 text-rose-500" /></Button>
                  </div>)} />
              <Pagination page={page} pageSize={PAGE_SIZE} total={data.total} onChange={setPage} />
            </div>
          )}
        </section>
      </div>

      {form && <DocumentForm doc={form.doc} defaultTypeId={routeType} onClose={() => setForm(null)} onSaved={d => { setForm(null); load(); setDetail(null); if (!form.doc) setDetail(d.id) }} />}
      {detail != null && !form && <DocumentDetail id={detail} onClose={() => setDetail(null)} onChanged={load}
        onEdit={d => { setForm({ doc: d }) }} />}
    </div>
  )
}
