import { useCallback, useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Check, Copy, Pencil, Plus, Search } from 'lucide-react'
import { api } from '../services/api'
import { errText, useApp } from '../stores/appStore'
import { Badge, Button, EmptyState, ErrorState, Pagination, Spinner, TagChips, inputCls, useDebounced } from '../components/ui'
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
  const [q, setQ] = useState(''); const dq = useDebounced(q)
  const [lang, setLang] = useState(''); const [grade, setGrade] = useState(''); const [topic, setTopic] = useState(''); const [tag, setTag] = useState('')
  const [page, setPage] = useState(1)
  const [data, setData] = useState<{ items: Snippet[]; total: number } | null>(null)
  const [err, setErr] = useState('')
  const [form, setForm] = useState<{ sn: Snippet | null } | null>(params.get('new') ? { sn: null } : null)
  const [view, setView] = useState<Snippet | null>(null)
  useEffect(() => { if (params.get('new')) setParams({}, { replace: true }) }, [params, setParams])
  useEffect(() => setPage(1), [dq, lang, grade, topic, tag])
  const load = useCallback(() => {
    setErr('')
    api.snippets({ q: dq, language: lang, gradeLevelId: grade, topicId: topic, tag, page, pageSize: 20 }).then(r => setData({ items: r.items, total: r.total })).catch(e => setErr(errText(e)))
  }, [dq, lang, grade, topic, tag, page])
  useEffect(load, [load])
  const filtered = !!(dq || lang || grade || topic || tag)
  const del = async (s: Snippet) => {
    if (!(await confirm(`Xóa đoạn mã "${s.title}"? Hành động này không thể hoàn tác.`, { confirmText: 'Xóa', danger: true }))) return
    try { await api.deleteSnippet(s.id); toast('success', 'Đã xóa đoạn mã.'); setView(null); load() } catch (x) { toast('error', errText(x)) }
  }
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <h1 className="mr-2 text-xl font-bold">Ngân hàng mã nguồn</h1>
        <div className="relative w-64"><Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" /><input className={inputCls + ' pl-9'} placeholder="Tìm mã nguồn..." value={q} onChange={e => setQ(e.target.value)} /></div>
        <select className={inputCls + ' !w-auto'} value={lang} onChange={e => setLang(e.target.value)}><option value="">Mọi ngôn ngữ</option>{lookups!.languages.map(l => <option key={l}>{l}</option>)}</select>
        <select className={inputCls + ' !w-auto'} value={grade} onChange={e => { setGrade(e.target.value); setTopic('') }}><option value="">Mọi khối</option>{lookups!.gradeLevels.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}</select>
        <select className={inputCls + ' !w-auto'} value={topic} onChange={e => setTopic(e.target.value)}><option value="">Mọi chủ đề</option>{lookups!.topics.filter(t => !grade || !t.gradeLevelId || t.gradeLevelId === Number(grade)).map(t => <option key={t.id} value={t.id}>{t.name}</option>)}</select>
        {tag && <Button size="sm" onClick={() => setTag('')}>#{tag} ✕</Button>}
        <Button variant="primary" className="ml-auto" onClick={() => setForm({ sn: null })}><Plus className="h-4 w-4" />Thêm đoạn mã</Button>
      </div>
      {err ? <ErrorState message={err} onRetry={load} /> : !data ? <Spinner /> : data.total === 0 ? (
        filtered ? <EmptyState title="Không tìm thấy đoạn mã" text="Hãy thử từ khóa khác hoặc bỏ bớt bộ lọc." />
          : <EmptyState title="Chưa có đoạn mã nào" text="Lưu các đoạn mã mẫu để tái sử dụng khi giảng dạy." action={<Button variant="primary" onClick={() => setForm({ sn: null })}><Plus className="h-4 w-4" />Thêm đoạn mã đầu tiên</Button>} />
      ) : (<>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
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
      </>)}
      {view && !form && <SnippetDetail sn={view} onClose={() => setView(null)} onEdit={() => setForm({ sn: view })} onDelete={() => del(view)} />}
      {form && <SnippetForm sn={form.sn} onClose={() => setForm(null)} onSaved={() => { setForm(null); setView(null); load() }} />}
    </div>
  )
}
