import { useCallback, useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Plus, Search } from 'lucide-react'
import { api } from '../services/api'
import { errText, useApp } from '../stores/appStore'
import { Badge, Button, EmptyState, ErrorState, Pagination, Spinner, TagChips, inputCls, useDebounced } from '../components/ui'
import { ExerciseDetail, ExerciseForm } from '../features/exercises/ExerciseParts'
import type { Exercise } from '../types'
import { DIFFICULTIES, DIFFICULTY_STYLE } from '../utils/format'

export default function ExercisesPage() {
  const { lookups, confirm, toast } = useApp()
  const [params, setParams] = useSearchParams()
  const [q, setQ] = useState(''); const dq = useDebounced(q)
  const [grade, setGrade] = useState(''); const [topic, setTopic] = useState(''); const [diff, setDiff] = useState(''); const [lang, setLang] = useState(''); const [tag, setTag] = useState('')
  const [page, setPage] = useState(1)
  const [data, setData] = useState<{ items: Exercise[]; total: number } | null>(null)
  const [err, setErr] = useState('')
  const [form, setForm] = useState<{ ex: Exercise | null } | null>(params.get('new') ? { ex: null } : null)
  const [view, setView] = useState<Exercise | null>(null)
  useEffect(() => { if (params.get('new')) setParams({}, { replace: true }) }, [params, setParams])
  useEffect(() => setPage(1), [dq, grade, topic, diff, lang, tag])
  const load = useCallback(() => {
    setErr('')
    api.exercises({ q: dq, gradeLevelId: grade, topicId: topic, difficulty: diff, language: lang, tag, page, pageSize: 20 }).then(r => setData({ items: r.items, total: r.total })).catch(e => setErr(errText(e)))
  }, [dq, grade, topic, diff, lang, tag, page])
  useEffect(load, [load])
  const filtered = !!(dq || grade || topic || diff || lang || tag)
  const del = async (e: Exercise) => {
    if (!(await confirm(`Xóa bài tập "${e.title}"? Hành động này không thể hoàn tác.`, { confirmText: 'Xóa', danger: true }))) return
    try { await api.deleteExercise(e.id); toast('success', 'Đã xóa bài tập.'); setView(null); load() } catch (x) { toast('error', errText(x)) }
  }
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <h1 className="mr-2 text-xl font-bold">Bài tập</h1>
        <div className="relative w-64"><Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" /><input className={inputCls + ' pl-9'} placeholder="Tìm bài tập..." value={q} onChange={e => setQ(e.target.value)} /></div>
        <select className={inputCls + ' !w-auto'} value={grade} onChange={e => { setGrade(e.target.value); setTopic('') }}><option value="">Mọi khối</option>{lookups!.gradeLevels.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}</select>
        <select className={inputCls + ' !w-auto'} value={topic} onChange={e => setTopic(e.target.value)}><option value="">Mọi chủ đề</option>{lookups!.topics.filter(t => !grade || !t.gradeLevelId || t.gradeLevelId === Number(grade)).map(t => <option key={t.id} value={t.id}>{t.name}</option>)}</select>
        <select className={inputCls + ' !w-auto'} value={diff} onChange={e => setDiff(e.target.value)}><option value="">Mọi mức độ</option>{Object.entries(DIFFICULTIES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
        <select className={inputCls + ' !w-auto'} value={lang} onChange={e => setLang(e.target.value)}><option value="">Mọi ngôn ngữ</option>{lookups!.languages.map(l => <option key={l}>{l}</option>)}</select>
        {tag && <Button size="sm" onClick={() => setTag('')}>#{tag} ✕</Button>}
        <Button variant="primary" className="ml-auto" onClick={() => setForm({ ex: null })}><Plus className="h-4 w-4" />Thêm bài tập</Button>
      </div>
      {err ? <ErrorState message={err} onRetry={load} /> : !data ? <Spinner /> : data.total === 0 ? (
        filtered ? <EmptyState title="Không tìm thấy bài tập" text="Hãy thử từ khóa khác hoặc bỏ bớt bộ lọc." />
          : <EmptyState title="Chưa có bài tập nào" text="Tạo ngân hàng bài tập có gợi ý, lời giải và mã nguồn mẫu để tái sử dụng." action={<Button variant="primary" onClick={() => setForm({ ex: null })}><Plus className="h-4 w-4" />Thêm bài tập đầu tiên</Button>} />
      ) : (<>
        <div className="divide-y divide-slate-100 rounded-lg border border-slate-200 bg-white dark:divide-slate-800 dark:border-slate-800 dark:bg-slate-900">
          {data.items.map(e => (
            <div key={e.id} className="flex items-center gap-3 px-4 py-3 hover:bg-indigo-50/40 dark:hover:bg-slate-800/50">
              <button className="min-w-0 flex-1 text-left" onClick={() => setView(e)}>
                <div className="truncate font-medium">{e.title}</div>
                <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs"><Badge className={DIFFICULTY_STYLE[e.difficulty]}>{DIFFICULTIES[e.difficulty]}</Badge>{e.language && <Badge>{e.language}</Badge>}{e.topicName && <span className="text-slate-500">{e.topicName}</span>}<TagChips tags={e.tags.slice(0, 4)} onClick={setTag} /></div>
              </button>
              <Button size="sm" onClick={() => setForm({ ex: e })}>Sửa</Button>
            </div>))}
        </div>
        <Pagination page={page} pageSize={20} total={data.total} onChange={setPage} />
      </>)}
      {view && !form && <ExerciseDetail ex={view} onClose={() => setView(null)} onEdit={() => setForm({ ex: view })} onDelete={() => del(view)} />}
      {form && <ExerciseForm ex={form.ex} onClose={() => setForm(null)} onSaved={() => { setForm(null); setView(null); load() }} />}
    </div>
  )
}
