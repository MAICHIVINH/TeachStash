import { useCallback, useEffect, useState } from 'react'
import { AppWindow, Download, Pencil, Star, Trash2 } from 'lucide-react'
import { api } from '../../services/api'
import { errText, useApp } from '../../stores/appStore'
import { Badge, Button, ErrorState, Modal, Spinner, TagChips } from '../../components/ui'
import { CodeBlock } from '../../components/CodeBlock'
import { PdfViewer } from '../../components/PdfViewer'
import { DocxViewer } from '../../components/viewers/DocxViewer'
import { ExcelViewer } from '../../components/viewers/ExcelViewer'
import { PptxViewer } from '../../components/viewers/PptxViewer'
import type { DocumentItem } from '../../types'
import { EXT_LANG, formatBytes, formatDate } from '../../utils/format'

function TextPreview({ id, ext }: { id: number; ext: string }) {
  const [data, setData] = useState<{ text: string; truncated: boolean } | null>(null)
  const [err, setErr] = useState('')
  useEffect(() => { api.fileText(id).then(setData).catch(e => setErr(errText(e))) }, [id])
  if (err) return <ErrorState message={err} />
  if (!data) return <Spinner />
  return <>{data.truncated && <p className="mb-1 text-xs text-amber-600">Chỉ hiển thị 1 MB đầu tiên. Hãy tải xuống để xem đầy đủ.</p>}<CodeBlock code={data.text} language={EXT_LANG[ext] ?? 'plaintext'} /></>
}

export default function DocumentDetail({ id, onClose, onEdit, onChanged, readOnly }: {
  id: number; onClose: () => void; onEdit?: (d: DocumentItem) => void; onChanged: () => void; readOnly?: boolean
}) {
  const { lookups, confirm, toast } = useApp()
  const [doc, setDoc] = useState<DocumentItem | null>(null)
  const [err, setErr] = useState('')
  const load = useCallback(() => { setErr(''); api.document(id).then(setDoc).catch(e => setErr(errText(e))) }, [id])
  useEffect(load, [load])

  const grade = lookups?.gradeLevels.find(g => g.id === doc?.gradeLevelId)?.name
  const toggleFav = async () => { if (!doc) return; await api.favorite(doc.id, !doc.isFavorite).catch(e => toast('error', errText(e))); load(); onChanged() }
  const del = async () => {
    if (!doc || !(await confirm(`Chuyển "${doc.title}" vào thùng rác?\nBạn có thể khôi phục sau.`, { confirmText: 'Chuyển vào thùng rác', danger: true }))) return
    try { await api.trashDocs([doc.id]); toast('success', 'Đã chuyển vào thùng rác.'); onChanged(); onClose() } catch (e) { toast('error', errText(e)) }
  }
  const open = async () => { try { await api.openFile(id); toast('info', 'Đang mở bản sao tạm của tệp bằng ứng dụng mặc định...') } catch (e) { toast('error', errText(e)) } }

  const f = doc?.file
  return (
    <Modal title={doc?.title ?? 'Chi tiết tài liệu'} wide="xl" onRequestClose={onClose}
      footer={doc && !readOnly ? <>
        <Button variant="danger" onClick={del}><Trash2 className="h-4 w-4" />Xóa</Button>
        <Button onClick={() => onEdit?.(doc)}><Pencil className="h-4 w-4" />Chỉnh sửa</Button>
        <Button onClick={toggleFav}><Star className={`h-4 w-4 ${doc.isFavorite ? 'fill-amber-400 text-amber-400' : ''}`} />{doc.isFavorite ? 'Bỏ yêu thích' : 'Yêu thích'}</Button>
      </> : <Button onClick={onClose}>Đóng</Button>}>
      {err ? <ErrorState message={err} onRetry={load} /> : !doc ? <Spinner /> : (
        <div className="selectable grid gap-5 lg:grid-cols-[18rem_1fr]">
          <div className="space-y-3 text-sm">
            <div className="flex flex-wrap gap-1.5"><Badge className="bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300">{doc.documentTypeName}</Badge>
              {grade && <Badge>{grade}</Badge>}{doc.programmingLanguage && <Badge>{doc.programmingLanguage}</Badge>}</div>
            <dl className="space-y-2">
              {([['Chủ đề', doc.topicName], ['Bài học', doc.lessonName], ['Ngày tạo', formatDate(doc.createdAt, true)], ['Cập nhật', formatDate(doc.updatedAt, true)]] as const).map(([k, v]) => (
                <div key={k}><dt className="text-xs font-semibold text-slate-500">{k}</dt><dd>{v || '—'}</dd></div>))}
            </dl>
            {doc.description && <div><div className="text-xs font-semibold text-slate-500">Mô tả</div><p className="whitespace-pre-wrap">{doc.description}</p></div>}
            {doc.tags.length > 0 && <div><div className="mb-1 text-xs font-semibold text-slate-500">Thẻ</div><TagChips tags={doc.tags} /></div>}
            {doc.contentText && <details><summary className="cursor-pointer text-xs font-semibold text-slate-500">Nội dung văn bản</summary><p className="mt-1 max-h-48 overflow-auto whitespace-pre-wrap text-xs">{doc.contentText}</p></details>}
          </div>
          <div className="min-w-0">
            {!f ? <p className="rounded-lg border border-dashed border-slate-300 p-6 text-center text-slate-500 dark:border-slate-700">Tài liệu này chưa có tệp đính kèm.</p> : (
              <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 dark:border-slate-700">
                  <span className="font-medium">{f.originalName}</span><Badge>{f.extension.toUpperCase()}</Badge><span className="text-xs text-slate-500">{formatBytes(f.sizeBytes)}</span>
                  <div className="ml-auto flex gap-2">
                    {f.exists && <a href={api.downloadUrl(doc.id)}><Button size="sm"><Download className="h-3.5 w-3.5" />Tải xuống</Button></a>}
                    {f.exists && f.previewKind !== 'image' && f.previewKind !== 'pdf' && <Button size="sm" onClick={open}><AppWindow className="h-3.5 w-3.5" />Mở bằng ứng dụng mặc định</Button>}
                  </div>
                </div>
                {!f.exists ? <ErrorState message="Tệp đính kèm không còn tồn tại trên ổ đĩa. Hãy thay thế hoặc gỡ tệp trong màn hình chỉnh sửa." /> :
                  f.previewKind === 'pdf' ? <PdfViewer url={api.contentUrl(doc.id)} /> :
                  f.previewKind === 'image' ? <div className="flex max-h-[65vh] justify-center overflow-auto rounded-lg bg-slate-100 p-3 dark:bg-slate-800"><img src={api.contentUrl(doc.id)} alt={f.originalName} className="max-w-full object-contain" /></div> :
                  f.previewKind === 'text' ? <TextPreview id={doc.id} ext={f.extension} /> :
                  f.previewKind === 'office' ? (
                    f.extension === 'docx' ? <DocxViewer url={api.contentUrl(doc.id)} fileName={f.originalName} onOpenExternal={open} /> :
                    ['xlsx', 'xls', 'csv'].includes(f.extension) ? <ExcelViewer url={api.contentUrl(doc.id)} fileName={f.originalName} /> :
                    f.extension === 'pptx' ? <PptxViewer url={api.contentUrl(doc.id)} fileName={f.originalName} onOpenExternal={open} /> :
                    <div className="rounded-lg bg-slate-50 p-6 text-center text-slate-500 dark:bg-slate-800">
                      <p className="mb-1 font-medium text-slate-700 dark:text-slate-200">Tệp định dạng cũ ({f.extension.toUpperCase()})</p>
                      <p className="mb-4 text-xs">Định dạng này cần mở bằng ứng dụng Microsoft Office hoặc WPS trên máy để xem chính xác.</p>
                      <Button size="sm" onClick={open}><AppWindow className="mr-1 h-3.5 w-3.5" />Mở bằng ứng dụng mặc định</Button>
                    </div>
                  ) :
                  <p className="rounded-lg bg-slate-50 p-6 text-center text-slate-500 dark:bg-slate-800">Tệp nén hoặc định dạng không xem trước được. Hãy tải xuống hoặc mở bằng ứng dụng bên ngoài.</p>}
              </div>
            )}
          </div>
        </div>
      )}
    </Modal>
  )
}
