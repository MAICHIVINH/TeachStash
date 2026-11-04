import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Eye } from 'lucide-react'
import { api } from '../services/api'
import { errText } from '../stores/appStore'
import { Badge, Button, EmptyState, ErrorState, Spinner } from '../components/ui'
import DocumentDetail from '../features/documents/DocumentDetail'
import DocumentTable from '../features/documents/DocumentTable'
import { ExerciseDetail } from '../features/exercises/ExerciseParts'
import { SnippetDetail } from '../features/snippets/SnippetParts'
import type { Exercise, SearchResult, Snippet } from '../types'

export default function SearchPage() {
  const [params] = useSearchParams()
  const q = params.get('q') ?? ''
  const [r, setR] = useState<SearchResult | null>(null)
  const [err, setErr] = useState('')
  const [detail, setDetail] = useState<number | null>(null)
  const [ex, setEx] = useState<Exercise | null>(null)
  const [sn, setSn] = useState<Snippet | null>(null)
  useEffect(() => { setR(null); setErr(''); api.search(q).then(setR).catch(e => setErr(errText(e))) }, [q])
  if (err) return <ErrorState message={err} />
  if (!r) return <Spinner label="Đang tìm..." />
  const total = r.documentTotal + r.exerciseTotal + r.snippetTotal
  return (
    <div className="space-y-5">
      <h1 className="text-xl font-bold">Kết quả cho "{q}" <span className="text-sm font-normal text-slate-500">({total})</span></h1>
      {total === 0 && <EmptyState title="Không tìm thấy kết quả" text="Tìm kiếm không phân biệt hoa/thường và có dấu/không dấu. Thử rút gọn từ khóa." />}
      {r.documents.length > 0 && (
        <section>
          <h2 className="mb-2 font-semibold">Tài liệu ({r.documentTotal})</h2>
          <DocumentTable
            items={r.documents}
            onOpen={d => setDetail(d.id)}
            actions={d => (
              <Button size="sm" variant="ghost" title="Xem chi tiết" onClick={() => setDetail(d.id)}>
                <Eye className="h-4 w-4" />
              </Button>
            )}
          />
        </section>
      )}
      {r.exercises.length > 0 && <section><h2 className="mb-2 font-semibold">Bài tập ({r.exerciseTotal})</h2>
        <div className="divide-y divide-slate-100 rounded-lg border border-slate-200 bg-white dark:divide-slate-800 dark:border-slate-800 dark:bg-slate-900">
          {r.exercises.map(e => <button key={e.id} onClick={() => setEx(e)} className="flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-indigo-50/50 dark:hover:bg-slate-800"><span className="flex-1 truncate font-medium">{e.title}</span>{e.topicName && <Badge>{e.topicName}</Badge>}</button>)}
        </div></section>}
      {r.snippets.length > 0 && <section><h2 className="mb-2 font-semibold">Mã nguồn ({r.snippetTotal})</h2>
        <div className="divide-y divide-slate-100 rounded-lg border border-slate-200 bg-white dark:divide-slate-800 dark:border-slate-800 dark:bg-slate-900">
          {r.snippets.map(s => <button key={s.id} onClick={() => setSn(s)} className="flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-indigo-50/50 dark:hover:bg-slate-800"><span className="flex-1 truncate font-medium">{s.title}</span><Badge>{s.language}</Badge></button>)}
        </div></section>}
      {detail != null && <DocumentDetail id={detail} onClose={() => setDetail(null)} onChanged={() => {}} readOnly />}
      {ex && <ExerciseDetail ex={ex} onClose={() => setEx(null)} />}
      {sn && <SnippetDetail sn={sn} onClose={() => setSn(null)} />}
    </div>
  )
}
