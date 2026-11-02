import { useMemo, useRef, useState } from 'react'
import { File as FileIcon, Trash2, UploadCloud } from 'lucide-react'
import { api, ApiError } from '../../services/api'
import { errText, useApp } from '../../stores/appStore'
import { Button, CategoryPicker, Field, Modal, TagInput, cx, inputCls } from '../../components/ui'
import type { DocumentItem, DocumentSave } from '../../types'
import { formatBytes } from '../../utils/format'

const MAX = 500 * 1024 * 1024

export default function DocumentForm({ doc, defaultTypeId, onClose, onSaved }: {
  doc?: DocumentItem | null; defaultTypeId?: number | null; onClose: () => void; onSaved: (d: DocumentItem) => void
}) {
  const { lookups, confirm, toast } = useApp()
  const initial: DocumentSave = useMemo(() => ({
    title: doc?.title ?? '', documentTypeId: doc?.documentTypeId ?? defaultTypeId ?? 1, gradeLevelId: doc?.gradeLevelId ?? null,
    topicId: doc?.topicId ?? null, lessonId: doc?.lessonId ?? null, programmingLanguage: doc?.programmingLanguage ?? null,
    description: doc?.description ?? '', contentText: doc?.contentText ?? '', tags: doc?.tags ?? [], removeFile: false,
  }), [doc, defaultTypeId])
  const [f, setF] = useState<DocumentSave>(initial)
  const [file, setFile] = useState<File | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState(false)
  const [drag, setDrag] = useState(false)
  const input = useRef<HTMLInputElement>(null)
  const dirty = file !== null || JSON.stringify(f) !== JSON.stringify(initial)
  const set = <K extends keyof DocumentSave>(k: K, v: DocumentSave[K]) => setF(p => ({ ...p, [k]: v }))

  const tryClose = async () => {
    if (busy) return
    if (dirty && !(await confirm('Bạn đã nhập dữ liệu nhưng chưa lưu. Đóng và bỏ các thay đổi?', { title: 'Chưa lưu', confirmText: 'Bỏ thay đổi', danger: true }))) return
    onClose()
  }
  const pick = (picked: File | undefined | null) => {
    if (!picked) return
    if (picked.size > MAX) { setErrors(e => ({ ...e, file: 'Tệp vượt quá 500 MB.' })); return }
    if (picked.size === 0) { setErrors(e => ({ ...e, file: 'Tệp rỗng.' })); return }
    setErrors(e => { const { file: _f, ...rest } = e; return rest })
    setFile(picked)
  }
  const validate = () => {
    const e: Record<string, string> = {}
    if (!f.title.trim()) e.title = 'Vui lòng nhập tiêu đề.'
    if (f.title.length > 300) e.title = 'Tiêu đề tối đa 300 ký tự.'
    if (!f.documentTypeId) e.documentTypeId = 'Vui lòng chọn loại tài liệu.'
    if (f.description.length > 2000) e.description = 'Mô tả tối đa 2000 ký tự.'
    setErrors(e); return Object.keys(e).length === 0
  }
  const save = async () => {
    if (!validate()) return
    setBusy(true)
    try {
      const saved = doc ? await api.updateDocument(doc.id, f, file) : await api.createDocument(f, file)
      toast('success', doc ? 'Đã cập nhật tài liệu.' : 'Đã thêm tài liệu.')
      onSaved(saved)
    } catch (e) {
      if (e instanceof ApiError && e.errors) setErrors(Object.fromEntries(Object.entries(e.errors).map(([k, v]) => [k, v[0]])))
      toast('error', errText(e))
    } finally { setBusy(false) }
  }
  const existing = doc?.file && !f.removeFile && !file ? doc.file : null

  return (
    <Modal title={doc ? 'Chỉnh sửa tài liệu' : 'Thêm tài liệu'} wide onRequestClose={tryClose}
      footer={<><Button onClick={tryClose} disabled={busy}>Hủy</Button><Button variant="primary" loading={busy} onClick={save}>Lưu</Button></>}>
      <div className="space-y-4">
        <Field label="Tiêu đề" required error={errors.title}><input autoFocus className={inputCls} value={f.title} onChange={e => set('title', e.target.value)} /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Loại tài liệu" required error={errors.documentTypeId}>
            <select className={inputCls} value={f.documentTypeId} onChange={e => set('documentTypeId', Number(e.target.value))}>
              {lookups!.documentTypes.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </Field>
          <Field label="Ngôn ngữ lập trình (nếu có)">
            <select className={inputCls} value={f.programmingLanguage ?? ''} onChange={e => set('programmingLanguage', e.target.value || null)}>
              <option value="">— Không —</option>{lookups!.languages.map(l => <option key={l}>{l}</option>)}
            </select>
          </Field>
        </div>
        <CategoryPicker grade={f.gradeLevelId} topic={f.topicId} lesson={f.lessonId} errors={errors}
          onChange={v => setF(p => ({ ...p, ...v }))} />
        <Field label="Mô tả ngắn" error={errors.description}><textarea rows={2} className={inputCls} value={f.description} onChange={e => set('description', e.target.value)} /></Field>
        <Field label="Thẻ" hint="Nhập thẻ, nhấn Enter hoặc dấu phẩy để thêm."><TagInput value={f.tags} onChange={v => set('tags', v)} /></Field>
        <Field label="Nội dung văn bản (phục vụ tìm kiếm)"><textarea rows={4} className={inputCls} value={f.contentText} onChange={e => set('contentText', e.target.value)} placeholder="Dán nội dung chính của tài liệu để tìm kiếm toàn văn (tùy chọn)" /></Field>

        <div>
          <span className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-300">Tệp đính kèm (tối đa 1 tệp, 500 MB)</span>
          {existing && (
            <div className="mb-2 flex items-center gap-2 rounded-md border border-slate-200 px-3 py-2 dark:border-slate-700">
              <FileIcon className="h-4 w-4 text-indigo-500" /><span className="flex-1 truncate">{existing.originalName}</span>
              <span className="text-xs text-slate-500">{formatBytes(existing.sizeBytes)}</span>
              {!existing.exists && <span className="text-xs text-rose-600">Tệp bị mất</span>}
              <Button size="sm" variant="ghost" onClick={() => set('removeFile', true)}><Trash2 className="h-3.5 w-3.5" />Gỡ tệp</Button>
            </div>
          )}
          {doc?.file && f.removeFile && !file && <p className="mb-2 text-xs text-amber-600">Tệp hiện tại sẽ bị gỡ khi lưu. <button className="underline" onClick={() => set('removeFile', false)}>Hoàn tác</button></p>}
          <div onDragOver={e => { e.preventDefault(); setDrag(true) }} onDragLeave={() => setDrag(false)}
            onDrop={e => { e.preventDefault(); setDrag(false); pick(e.dataTransfer.files[0]) }} onClick={() => input.current?.click()}
            className={cx('flex cursor-pointer flex-col items-center gap-1 rounded-lg border-2 border-dashed px-4 py-6 text-center transition',
              drag ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/40' : 'border-slate-300 hover:border-indigo-400 dark:border-slate-600')}>
            <UploadCloud className="h-7 w-7 text-indigo-500" />
            {file ? (<><span className="font-medium">{file.name}</span><span className="text-xs text-slate-500">{formatBytes(file.size)} — {doc?.file ? 'sẽ thay thế tệp hiện tại' : 'sẽ được tải lên khi lưu'}</span></>)
              : <span className="text-slate-500">Kéo thả tệp vào đây hoặc bấm để chọn{doc?.file ? ' (thay thế tệp hiện tại)' : ''}</span>}
            <input ref={input} type="file" hidden onChange={e => { pick(e.target.files?.[0]); e.target.value = '' }} />
          </div>
          {file && <button className="mt-1 text-xs text-slate-500 underline" onClick={() => setFile(null)}>Bỏ tệp vừa chọn</button>}
          {errors.file && <p className="mt-1 text-xs text-rose-600">{errors.file}</p>}
        </div>
      </div>
    </Modal>
  )
}
