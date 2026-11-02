import { useMemo, useState } from 'react'
import { Eye, EyeOff, Lightbulb } from 'lucide-react'
import { api, ApiError } from '../../services/api'
import { errText, useApp } from '../../stores/appStore'
import { Badge, Button, CategoryPicker, Field, Modal, TagChips, TagInput, inputCls } from '../../components/ui'
import { CodeBlock, CodeEditor } from '../../components/CodeBlock'
import type { Exercise, ExerciseSave } from '../../types'
import { DIFFICULTIES, DIFFICULTY_STYLE } from '../../utils/format'

export function ExerciseDetail({ ex, onClose, onEdit, onDelete }: { ex: Exercise; onClose: () => void; onEdit?: () => void; onDelete?: () => void }) {
  const [hint, setHint] = useState(false)
  const [sol, setSol] = useState(false)
  const [code, setCode] = useState(false)
  return (
    <Modal title={ex.title} wide onRequestClose={onClose}
      footer={<>{onDelete && <Button variant="danger" onClick={onDelete}>Xóa</Button>}{onEdit && <Button onClick={onEdit}>Chỉnh sửa</Button>}<Button onClick={onClose}>Đóng</Button></>}>
      <div className="selectable space-y-4">
        <div className="flex flex-wrap gap-1.5">
          <Badge className={DIFFICULTY_STYLE[ex.difficulty]}>{DIFFICULTIES[ex.difficulty]}</Badge>
          {ex.language && <Badge>{ex.language}</Badge>}{ex.topicName && <Badge>{ex.topicName}</Badge>}{ex.lessonName && <Badge>{ex.lessonName}</Badge>}
        </div>
        <section><h3 className="mb-1 text-sm font-semibold">Đề bài</h3><div className="whitespace-pre-wrap rounded-lg bg-slate-50 p-3 dark:bg-slate-800">{ex.statement}</div></section>
        {ex.hint && <section><Button size="sm" onClick={() => setHint(h => !h)}><Lightbulb className="h-3.5 w-3.5" />{hint ? 'Ẩn gợi ý' : 'Xem gợi ý'}</Button>
          {hint && <div className="mt-2 whitespace-pre-wrap rounded-lg bg-amber-50 p-3 text-amber-900 dark:bg-amber-950/40 dark:text-amber-100">{ex.hint}</div>}</section>}
        {ex.solution && <section><Button size="sm" onClick={() => setSol(s => !s)}>{sol ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}{sol ? 'Ẩn lời giải' : 'Xem lời giải'}</Button>
          {sol && <div className="mt-2 whitespace-pre-wrap rounded-lg bg-emerald-50 p-3 text-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-100">{ex.solution}</div>}</section>}
        {ex.sampleCode && <section><Button size="sm" onClick={() => setCode(s => !s)}>{code ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}{code ? 'Ẩn mã nguồn mẫu' : 'Xem mã nguồn mẫu'}</Button>
          {code && <div className="mt-2"><CodeBlock code={ex.sampleCode} language={ex.language ?? undefined} /></div>}</section>}
        {ex.tags.length > 0 && <TagChips tags={ex.tags} />}
      </div>
    </Modal>
  )
}

export function ExerciseForm({ ex, onClose, onSaved }: { ex: Exercise | null; onClose: () => void; onSaved: () => void }) {
  const { lookups, toast, confirm } = useApp()
  const initial: ExerciseSave = useMemo(() => ({
    title: ex?.title ?? '', statement: ex?.statement ?? '', gradeLevelId: ex?.gradeLevelId ?? null, topicId: ex?.topicId ?? null,
    lessonId: ex?.lessonId ?? null, difficulty: ex?.difficulty ?? 2, language: ex?.language ?? null, hint: ex?.hint ?? '',
    solution: ex?.solution ?? '', sampleCode: ex?.sampleCode ?? '', tags: ex?.tags ?? [],
  }), [ex])
  const [f, setF] = useState(initial)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState(false)
  const dirty = JSON.stringify(f) !== JSON.stringify(initial)
  const set = <K extends keyof ExerciseSave>(k: K, v: ExerciseSave[K]) => setF(p => ({ ...p, [k]: v }))
  const tryClose = async () => {
    if (busy) return
    if (dirty && !(await confirm('Bạn đã nhập dữ liệu nhưng chưa lưu. Đóng và bỏ các thay đổi?', { title: 'Chưa lưu', confirmText: 'Bỏ thay đổi', danger: true }))) return
    onClose()
  }
  const save = async () => {
    const e: Record<string, string> = {}
    if (!f.title.trim()) e.title = 'Vui lòng nhập tiêu đề.'
    if (!f.statement.trim()) e.statement = 'Vui lòng nhập đề bài.'
    setErrors(e); if (Object.keys(e).length) return
    setBusy(true)
    try { await api.saveExercise(ex?.id ?? null, f); toast('success', 'Đã lưu bài tập.'); onSaved() }
    catch (er) { if (er instanceof ApiError && er.errors) setErrors(Object.fromEntries(Object.entries(er.errors).map(([k, v]) => [k, v[0]]))); toast('error', errText(er)) }
    finally { setBusy(false) }
  }
  return (
    <Modal title={ex ? 'Chỉnh sửa bài tập' : 'Thêm bài tập'} wide onRequestClose={tryClose}
      footer={<><Button onClick={tryClose} disabled={busy}>Hủy</Button><Button variant="primary" loading={busy} onClick={save}>Lưu</Button></>}>
      <div className="space-y-4">
        <Field label="Tiêu đề" required error={errors.title}><input autoFocus className={inputCls} value={f.title} onChange={e => set('title', e.target.value)} /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Mức độ"><select className={inputCls} value={f.difficulty} onChange={e => set('difficulty', Number(e.target.value))}>{Object.entries(DIFFICULTIES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></Field>
          <Field label="Ngôn ngữ lập trình (nếu có)"><select className={inputCls} value={f.language ?? ''} onChange={e => set('language', e.target.value || null)}><option value="">— Không —</option>{lookups!.languages.map(l => <option key={l}>{l}</option>)}</select></Field>
        </div>
        <CategoryPicker grade={f.gradeLevelId} topic={f.topicId} lesson={f.lessonId} errors={errors} onChange={v => setF(p => ({ ...p, ...v }))} />
        <Field label="Đề bài" required error={errors.statement}><textarea rows={5} className={inputCls} value={f.statement} onChange={e => set('statement', e.target.value)} /></Field>
        <Field label="Gợi ý"><textarea rows={2} className={inputCls} value={f.hint} onChange={e => set('hint', e.target.value)} /></Field>
        <Field label="Lời giải"><textarea rows={4} className={inputCls} value={f.solution} onChange={e => set('solution', e.target.value)} /></Field>
        <Field label="Mã nguồn mẫu"><CodeEditor value={f.sampleCode} onChange={v => set('sampleCode', v)} rows={8} /></Field>
        <Field label="Thẻ"><TagInput value={f.tags} onChange={v => set('tags', v)} /></Field>
      </div>
    </Modal>
  )
}
