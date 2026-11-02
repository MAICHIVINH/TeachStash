import { useCallback, useEffect, useState } from 'react'
import { RotateCcw, Trash2 } from 'lucide-react'
import { api } from '../services/api'
import { errText, useApp } from '../stores/appStore'
import { Button, EmptyState, ErrorState, Pagination, Spinner } from '../components/ui'
import DocumentTable from '../features/documents/DocumentTable'
import type { DocumentItem } from '../types'

export default function TrashPage() {
  const { confirm, toast } = useApp()
  const [data, setData] = useState<{ items: DocumentItem[]; total: number } | null>(null)
  const [page, setPage] = useState(1)
  const [sel, setSel] = useState<Set<number>>(new Set())
  const [err, setErr] = useState('')
  const load = useCallback(() => {
    setErr('')
    api.trash('', page).then(r => { setData({ items: r.items, total: r.total }); setSel(new Set()) }).catch(e => setErr(errText(e)))
  }, [page])
  useEffect(load, [load])

  const ids = sel.size ? [...sel] : []
  const restore = async (list: number[]) => { try { await api.restoreDocs(list); toast('success', `Đã khôi phục ${list.length} tài liệu.`); load() } catch (e) { toast('error', errText(e)) } }
  const purge = async (list: number[]) => {
    if (!(await confirm(`Xóa vĩnh viễn ${list.length} tài liệu và tệp đính kèm?\nHành động này KHÔNG thể hoàn tác.`, { title: 'Xóa vĩnh viễn', confirmText: 'Xóa vĩnh viễn', danger: true }))) return
    try { await api.purgeDocs(list); toast('success', 'Đã xóa vĩnh viễn.'); load() } catch (e) { toast('error', errText(e)) }
  }
  if (err) return <ErrorState message={err} onRetry={load} />
  if (!data) return <Spinner />
  const allIds = data.items.map(d => d.id)
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <h1 className="mr-auto text-xl font-bold">Thùng rác <span className="text-sm font-normal text-slate-500">({data.total})</span></h1>
        {data.items.length > 0 && <>
          <label className="flex items-center gap-1 text-sm"><input type="checkbox" checked={sel.size === allIds.length} onChange={e => setSel(e.target.checked ? new Set(allIds) : new Set())} />Chọn tất cả</label>
          <Button disabled={!ids.length} onClick={() => restore(ids)}><RotateCcw className="h-4 w-4" />Khôi phục ({ids.length})</Button>
          <Button variant="danger" disabled={!ids.length} onClick={() => purge(ids)}><Trash2 className="h-4 w-4" />Xóa vĩnh viễn ({ids.length})</Button>
        </>}
      </div>
      {data.items.length === 0 ? <EmptyState title="Thùng rác trống" text="Các tài liệu bạn xóa sẽ nằm ở đây cho đến khi bạn xóa vĩnh viễn. Ứng dụng không tự động xóa." /> : (<>
        <DocumentTable items={data.items} dateField="deletedAt" onOpen={() => {}} selected={sel}
          onSelect={(id, v) => setSel(p => { const n = new Set(p); v ? n.add(id) : n.delete(id); return n })}
          actions={d => <div className="flex justify-end gap-1"><Button size="sm" onClick={() => restore([d.id])}><RotateCcw className="h-3.5 w-3.5" />Khôi phục</Button><Button size="sm" variant="danger" onClick={() => purge([d.id])}><Trash2 className="h-3.5 w-3.5" /></Button></div>} />
        <Pagination page={page} pageSize={50} total={data.total} onChange={setPage} />
      </>)}
    </div>
  )
}
