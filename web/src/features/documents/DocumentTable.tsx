import { File as FileIcon, Star } from 'lucide-react'
import type { DocumentItem } from '../../types'
import { Badge, TagChips, cx } from '../../components/ui'
import { formatBytes, formatDate } from '../../utils/format'
import { useApp } from '../../stores/appStore'

export default function DocumentTable({ items, onOpen, onFavorite, actions, selected, onSelect, dateField = 'updatedAt' }: {
  items: DocumentItem[]; onOpen: (d: DocumentItem) => void; onFavorite?: (d: DocumentItem) => void
  actions?: (d: DocumentItem) => React.ReactNode; selected?: Set<number>; onSelect?: (id: number, v: boolean) => void
  dateField?: 'updatedAt' | 'deletedAt'
}) {
  const grades = useApp(s => s.lookups?.gradeLevels ?? [])
  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
      <table className="w-full text-left text-sm">
        <thead className="bg-slate-50 text-xs uppercase text-slate-500 dark:bg-slate-800/60">
          <tr>
            {onSelect && <th className="w-8 px-3 py-2" />}
            <th className="px-3 py-2">Tiêu đề</th><th className="px-3 py-2">Loại</th><th className="px-3 py-2">Khối</th>
            <th className="px-3 py-2">Chủ đề</th><th className="px-3 py-2">Tệp đính kèm</th>
            <th className="px-3 py-2">{dateField === 'deletedAt' ? 'Ngày xóa' : 'Cập nhật'}</th><th className="px-3 py-2 text-right">Thao tác</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
          {items.map(d => (
            <tr key={d.id} className="hover:bg-indigo-50/40 dark:hover:bg-slate-800/50">
              {onSelect && <td className="px-3 py-2"><input type="checkbox" checked={selected?.has(d.id) ?? false} onChange={e => onSelect(d.id, e.target.checked)} /></td>}
              <td className="max-w-md px-3 py-2">
                <button className="flex items-center gap-1.5 text-left font-medium text-slate-800 hover:text-indigo-600 dark:text-slate-100" onClick={() => onOpen(d)}>
                  {onFavorite && <Star className={cx('h-3.5 w-3.5 shrink-0', d.isFavorite ? 'fill-amber-400 text-amber-400' : 'text-slate-300')} />}
                  <span className="truncate">{d.title}</span>
                </button>
                {d.tags.length > 0 && <div className="mt-1"><TagChips tags={d.tags.slice(0, 4)} /></div>}
              </td>
              <td className="px-3 py-2"><Badge className="bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300">{d.documentTypeName}</Badge></td>
              <td className="px-3 py-2">{grades.find(g => g.id === d.gradeLevelId)?.name.replace('Lớp ', '') ?? '—'}</td>
              <td className="max-w-[12rem] truncate px-3 py-2" title={d.topicName ?? ''}>{d.topicName ?? '—'}</td>
              <td className="px-3 py-2">
                {d.file ? <span className={cx('inline-flex items-center gap-1 text-xs', d.file.exists ? '' : 'text-rose-600')}><FileIcon className="h-3.5 w-3.5" />
                  <span className="max-w-[10rem] truncate">{d.file.originalName}</span> <span className="text-slate-400">{d.file.exists ? formatBytes(d.file.sizeBytes) : '(mất tệp)'}</span></span> : <span className="text-slate-400">—</span>}
              </td>
              <td className="whitespace-nowrap px-3 py-2 text-slate-500">{formatDate(dateField === 'deletedAt' ? d.deletedAt : d.updatedAt)}</td>
              <td className="px-3 py-2 text-right">{actions?.(d)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
