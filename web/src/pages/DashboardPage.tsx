import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Clock, Code2, FileText, FolderOpen, ListChecks, Plus, Presentation, Star, Library, DatabaseBackup, ClipboardCheck, type LucideIcon } from 'lucide-react'
import { api } from '../services/api'
import { errText } from '../stores/appStore'
import { Button, EmptyState, ErrorState, Spinner } from '../components/ui'
import DocumentDetail from '../features/documents/DocumentDetail'
import DocumentForm from '../features/documents/DocumentForm'
import type { Dashboard, DocumentItem } from '../types'
import { formatDate } from '../utils/format'

function Stat({ label, value, icon: Icon, onClick, color }: { label: string; value: number; icon: LucideIcon; onClick: () => void; color: string }) {
  return (
    <button onClick={onClick} className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:border-indigo-300 hover:shadow dark:border-slate-800 dark:bg-slate-900">
      <div className={`rounded-lg p-2.5 ${color}`}><Icon className="h-5 w-5" /></div>
      <div><div className="text-2xl font-bold">{value}</div><div className="text-xs text-slate-500">{label}</div></div>
    </button>
  )
}

function RecentList({ title, icon: Icon, items, onOpen }: { title: string; icon: LucideIcon; items: DocumentItem[]; onOpen: (id: number) => void }) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
      <h3 className="mb-2 flex items-center gap-2 font-semibold"><Icon className="h-4 w-4 text-indigo-500" />{title}</h3>
      {items.length === 0 ? <p className="py-4 text-center text-sm text-slate-400">Chưa có mục nào.</p> : (
        <ul className="divide-y divide-slate-100 dark:divide-slate-800">
          {items.map(d => (
            <li key={d.id}><button onClick={() => onOpen(d.id)} className="flex w-full items-center justify-between gap-2 py-2 text-left hover:text-indigo-600">
              <span className="truncate">{d.title}<span className="ml-2 text-xs text-slate-400">{d.documentTypeName}</span></span>
              <span className="shrink-0 text-xs text-slate-400">{formatDate(title.includes('truy cập') ? d.lastAccessedAt : d.createdAt)}</span>
            </button></li>))}
        </ul>)}
    </section>
  )
}

export default function DashboardPage() {
  const nav = useNavigate()
  const [data, setData] = useState<Dashboard | null>(null)
  const [err, setErr] = useState('')
  const [detail, setDetail] = useState<number | null>(null)
  const [adding, setAdding] = useState(false)
  const load = () => { setErr(''); api.dashboard().then(setData).catch(e => setErr(errText(e))) }
  useEffect(load, [])
  if (err) return <ErrorState message={err} onRetry={load} />
  if (!data) return <Spinner />
  const empty = data.totalDocuments + data.exercises + data.codeSnippets === 0
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Tổng quan</h1>
        <Button variant="primary" onClick={() => setAdding(true)}><Plus className="h-4 w-4" />Thêm tài liệu</Button>
      </div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
        <Stat label="Tổng số tài liệu" value={data.totalDocuments} icon={FolderOpen} color="bg-indigo-100 text-indigo-600" onClick={() => nav('/documents')} />
        <Stat label="Giáo án" value={data.lessonPlans} icon={FileText} color="bg-violet-100 text-violet-600" onClick={() => nav('/documents?type=1')} />
        <Stat label="Bài giảng" value={data.lectures} icon={Presentation} color="bg-sky-100 text-sky-600" onClick={() => nav('/documents?type=2')} />
        <Stat label="Bài tập" value={data.exercises} icon={ListChecks} color="bg-emerald-100 text-emerald-600" onClick={() => nav('/exercises')} />
        <Stat label="Đề kiểm tra" value={data.exams} icon={Library} color="bg-amber-100 text-amber-600" onClick={() => nav('/documents?type=4')} />
        <Stat label="Đoạn mã nguồn" value={data.codeSnippets} icon={Code2} color="bg-rose-100 text-rose-600" onClick={() => nav('/snippets')} />
      </div>
      <div className="flex flex-wrap gap-2">
        <Button onClick={() => setAdding(true)}><Plus className="h-4 w-4" />Tài liệu mới</Button>
        <Button onClick={() => nav('/exercises?new=1')}><ListChecks className="h-4 w-4" />Bài tập mới</Button>
        <Button onClick={() => nav('/snippets?new=1')}><Code2 className="h-4 w-4" />Mã nguồn mới</Button>
        <Button onClick={() => nav('/documents?type=7')}><ClipboardCheck className="h-4 w-4" />Phiếu học tập</Button>
        <Button onClick={() => nav('/backup')}><DatabaseBackup className="h-4 w-4" />Sao lưu</Button>
      </div>
      {empty ? <EmptyState title="Kho giáo án đang trống" text="Hãy thêm tài liệu, bài tập hoặc đoạn mã đầu tiên." action={<Button variant="primary" onClick={() => setAdding(true)}><Plus className="h-4 w-4" />Thêm tài liệu đầu tiên</Button>} /> : (
        <div className="grid gap-4 xl:grid-cols-3">
          <RecentList title="Mới thêm gần đây" icon={Plus} items={data.recentlyAdded} onOpen={setDetail} />
          <RecentList title="Mới truy cập" icon={Clock} items={data.recentlyAccessed} onOpen={setDetail} />
          <RecentList title="Yêu thích" icon={Star} items={data.favorites} onOpen={setDetail} />
        </div>)}
      {detail != null && <DocumentDetail id={detail} onClose={() => setDetail(null)} onChanged={load} readOnly />}
      {adding && <DocumentForm onClose={() => setAdding(false)} onSaved={d => { setAdding(false); load(); setDetail(d.id) }} />}
    </div>
  )
}
