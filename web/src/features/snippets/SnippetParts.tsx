import { useMemo, useState } from 'react'
import { api, ApiError } from '../../services/api'
import { errText, useApp } from '../../stores/appStore'
import { Badge, Button, CategoryPicker, Field, Modal, TagChips, TagInput, inputCls } from '../../components/ui'
import { CodeBlock, CodeEditor } from '../../components/CodeBlock'
import type { Snippet, SnippetSave } from '../../types'

export function SnippetDetail({ sn, onClose, onEdit, onDelete }: { sn: Snippet; onClose: () => void; onEdit?: () => void; onDelete?: () => void }) {
  const lookups = useApp(s => s.lookups)
  const gradeName = lookups?.gradeLevels.find(g => g.id === sn.gradeLevelId)?.name

  return (
    <Modal title={sn.title} wide="2xl" onRequestClose={onClose}
      footer={<>{onDelete && <Button variant="danger" size="sm" onClick={onDelete}>Xóa</Button>}{onEdit && <Button size="sm" onClick={onEdit}>Chỉnh sửa</Button>}<Button size="sm" onClick={onClose}>Đóng</Button></>}>
      <div className="selectable space-y-3">
        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          <Badge className="border border-indigo-200/60 bg-indigo-50 font-mono font-semibold text-indigo-700 dark:border-indigo-800/50 dark:bg-indigo-950/50 dark:text-indigo-300">{sn.language}</Badge>
          {gradeName && <Badge className="border border-emerald-200/60 bg-emerald-50 text-emerald-700 dark:border-emerald-800/50 dark:bg-emerald-950/50 dark:text-emerald-300">{gradeName}</Badge>}
          {sn.topicName && <Badge className="border border-sky-200/60 bg-sky-50 text-sky-700 dark:border-sky-800/50 dark:bg-sky-950/50 dark:text-sky-300">{sn.topicName}</Badge>}
          {sn.lessonName && <Badge className="bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">{sn.lessonName}</Badge>}
        </div>
        {sn.description && <p className="whitespace-pre-wrap text-xs text-slate-600 dark:text-slate-300">{sn.description}</p>}
        <CodeBlock code={sn.code} language={sn.language} maxHeight="22rem" />
        {sn.tags.length > 0 && <TagChips tags={sn.tags} />}
      </div>
    </Modal>
  )
}

export function SnippetForm({ sn, onClose, onSaved }: { sn: Snippet | null; onClose: () => void; onSaved: () => void }) {
  const { lookups, toast, confirm } = useApp()
  const initial: SnippetSave = useMemo(() => ({
    title: sn?.title ?? '', language: sn?.language ?? 'Python', gradeLevelId: sn?.gradeLevelId ?? null, topicId: sn?.topicId ?? null,
    lessonId: sn?.lessonId ?? null, description: sn?.description ?? '', code: sn?.code ?? '', tags: sn?.tags ?? [],
  }), [sn])
  const [f, setF] = useState(initial)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState(false)
  const dirty = JSON.stringify(f) !== JSON.stringify(initial)
  const set = <K extends keyof SnippetSave>(k: K, v: SnippetSave[K]) => setF(p => ({ ...p, [k]: v }))
  const tryClose = async () => {
    if (busy) return
    if (dirty && !(await confirm('Bạn đã nhập dữ liệu nhưng chưa lưu. Đóng và bỏ các thay đổi?', { title: 'Chưa lưu', confirmText: 'Bỏ thay đổi', danger: true }))) return
    onClose()
  }
  const save = async () => {
    const e: Record<string, string> = {}
    if (!f.title.trim()) e.title = 'Vui lòng nhập tiêu đề.'
    if (!f.code.trim()) e.code = 'Vui lòng nhập mã nguồn.'
    setErrors(e); if (Object.keys(e).length) return
    setBusy(true)
    try { await api.saveSnippet(sn?.id ?? null, f); toast('success', 'Đã lưu đoạn mã.'); onSaved() }
    catch (er) { if (er instanceof ApiError && er.errors) setErrors(Object.fromEntries(Object.entries(er.errors).map(([k, v]) => [k, v[0]]))); toast('error', errText(er)) }
    finally { setBusy(false) }
  }
  return (
    <Modal title={sn ? 'Chỉnh sửa đoạn mã' : 'Thêm đoạn mã'} wide="2xl" onRequestClose={tryClose}
      footer={<><Button size="sm" onClick={tryClose} disabled={busy}>Hủy</Button><Button size="sm" variant="primary" loading={busy} onClick={save}>Lưu</Button></>}>
      <div className="space-y-3">
        <div className="grid grid-cols-[1fr_8.5rem] gap-2.5">
          <Field label="Tiêu đề" required error={errors.title}><input autoFocus className={inputCls} value={f.title} onChange={e => set('title', e.target.value)} /></Field>
          <Field label="Ngôn ngữ" required error={errors.language}><select className={inputCls} value={f.language} onChange={e => set('language', e.target.value)}>{lookups!.languages.map(l => <option key={l}>{l}</option>)}</select></Field>
        </div>
        <CategoryPicker grade={f.gradeLevelId} topic={f.topicId} lesson={f.lessonId} errors={errors} onChange={v => setF(p => ({ ...p, ...v }))} />
        <Field label="Mô tả"><textarea rows={2} className={inputCls} value={f.description} onChange={e => set('description', e.target.value)} /></Field>
        <Field label="Mã nguồn" required error={errors.code}><CodeEditor value={f.code} onChange={v => set('code', v)} rows={10} /></Field>
        <Field label="Thẻ"><TagInput value={f.tags} onChange={v => set('tags', v)} /></Field>
      </div>
    </Modal>
  )
}
