import { useMemo, useState } from 'react'
import { Check, CheckCircle2, Eye, EyeOff, Lightbulb } from 'lucide-react'
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

  const isMcq = ex.exerciseType === 1 || Boolean(ex.optionA || ex.optionB || ex.optionC || ex.optionD)

  return (
    <Modal title={ex.title} wide onRequestClose={onClose}
      footer={<>{onDelete && <Button variant="danger" onClick={onDelete}>Xóa</Button>}{onEdit && <Button onClick={onEdit}>Chỉnh sửa</Button>}<Button onClick={onClose}>Đóng</Button></>}>
      <div className="selectable space-y-4">
        <div className="flex flex-wrap items-center gap-1.5">
          <Badge className={isMcq ? 'bg-sky-100 text-sky-800 dark:bg-sky-950/60 dark:text-sky-300' : 'bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300'}>
            {isMcq ? 'Trắc nghiệm' : 'Tự luận / Lập trình'}
          </Badge>
          <Badge className={DIFFICULTY_STYLE[ex.difficulty]}>{DIFFICULTIES[ex.difficulty]}</Badge>
          {ex.language && <Badge>{ex.language}</Badge>}
          {ex.topicName && <Badge>{ex.topicName}</Badge>}
          {ex.lessonName && <Badge>{ex.lessonName}</Badge>}
        </div>

        <section>
          <h3 className="mb-1 text-sm font-semibold">Đề bài</h3>
          <div className="whitespace-pre-wrap rounded-lg bg-slate-50 p-3.5 text-slate-800 dark:bg-slate-800/80 dark:text-slate-100">
            {ex.statement}
          </div>
        </section>

        {isMcq && (
          <section className="space-y-2">
            <h3 className="text-sm font-semibold">Phương án lựa chọn</h3>
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              {[
                { key: 'A', text: ex.optionA },
                { key: 'B', text: ex.optionB },
                { key: 'C', text: ex.optionC },
                { key: 'D', text: ex.optionD },
              ].map(({ key, text }) => {
                const isCorrect = (ex.correctAnswer || '').toUpperCase() === key
                return (
                  <div
                    key={key}
                    className={`flex items-start gap-2.5 rounded-lg border p-3 text-sm transition-colors ${
                      isCorrect
                        ? 'border-emerald-500 bg-emerald-50 text-emerald-950 dark:border-emerald-500/80 dark:bg-emerald-950/40 dark:text-emerald-100'
                        : 'border-slate-200 bg-white text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200'
                    }`}
                  >
                    <span
                      className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                        isCorrect
                          ? 'bg-emerald-600 text-white'
                          : 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                      }`}
                    >
                      {key}
                    </span>
                    <span className="flex-1 whitespace-pre-wrap break-words">{text || <span className="italic text-slate-400 dark:text-slate-500">(chưa nhập)</span>}</span>
                    {isCorrect && (
                      <span className="inline-flex items-center gap-1 rounded bg-emerald-600/10 px-1.5 py-0.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                        <Check className="h-3 w-3" /> Đúng
                      </span>
                    )}
                  </div>
                )
              })}
            </div>
          </section>
        )}

        {ex.hint && (
          <section>
            <Button size="sm" onClick={() => setHint(h => !h)}>
              <Lightbulb className="h-3.5 w-3.5" />
              {hint ? 'Ẩn gợi ý' : 'Xem gợi ý'}
            </Button>
            {hint && (
              <div className="mt-2 whitespace-pre-wrap rounded-lg bg-amber-50 p-3 text-amber-900 dark:bg-amber-950/40 dark:text-amber-100">
                {ex.hint}
              </div>
            )}
          </section>
        )}

        {ex.solution && (
          <section>
            <Button size="sm" onClick={() => setSol(s => !s)}>
              {sol ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
              {sol ? 'Ẩn lời giải' : 'Xem lời giải'}
            </Button>
            {sol && (
              <div className="mt-2 whitespace-pre-wrap rounded-lg bg-emerald-50 p-3 text-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-100">
                {ex.solution}
              </div>
            )}
          </section>
        )}

        {ex.sampleCode && !isMcq && (
          <section>
            <Button size="sm" onClick={() => setCode(s => !s)}>
              {code ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
              {code ? 'Ẩn mã nguồn mẫu' : 'Xem mã nguồn mẫu'}
            </Button>
            {code && (
              <div className="mt-2">
                <CodeBlock code={ex.sampleCode} language={ex.language ?? undefined} />
              </div>
            )}
          </section>
        )}

        {ex.tags.length > 0 && <TagChips tags={ex.tags} />}
      </div>
    </Modal>
  )
}

export function ExerciseForm({ ex, onClose, onSaved }: { ex: Exercise | null; onClose: () => void; onSaved: () => void }) {
  const { lookups, toast, confirm } = useApp()
  const initial: ExerciseSave = useMemo(() => ({
    title: ex?.title ?? '',
    statement: ex?.statement ?? '',
    gradeLevelId: ex?.gradeLevelId ?? null,
    topicId: ex?.topicId ?? null,
    lessonId: ex?.lessonId ?? null,
    difficulty: ex?.difficulty ?? 2,
    exerciseType: ex?.exerciseType ?? (ex?.optionA || ex?.optionB ? 1 : 1),
    optionA: ex?.optionA ?? '',
    optionB: ex?.optionB ?? '',
    optionC: ex?.optionC ?? '',
    optionD: ex?.optionD ?? '',
    correctAnswer: ex?.correctAnswer ?? 'A',
    language: ex?.language ?? null,
    hint: ex?.hint ?? '',
    solution: ex?.solution ?? '',
    sampleCode: ex?.sampleCode ?? '',
    tags: ex?.tags ?? [],
  }), [ex])

  const [f, setF] = useState(initial)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState(false)
  const dirty = JSON.stringify(f) !== JSON.stringify(initial)
  const set = <K extends keyof ExerciseSave>(k: K, v: ExerciseSave[K]) => setF(p => ({ ...p, [k]: v }))

  const isMcq = (f.exerciseType ?? 1) === 1

  const tryClose = async () => {
    if (busy) return
    if (dirty && !(await confirm('Bạn đã nhập dữ liệu nhưng chưa lưu. Đóng và bỏ các thay đổi?', { title: 'Chưa lưu', confirmText: 'Bỏ thay đổi', danger: true }))) return
    onClose()
  }

  const save = async () => {
    const e: Record<string, string> = {}
    if (!f.title.trim()) e.title = 'Vui lòng nhập tiêu đề.'
    if (!f.statement.trim()) e.statement = 'Vui lòng nhập đề bài.'
    if (isMcq) {
      if (!f.optionA?.trim()) e.optionA = 'Vui lòng nhập phương án A.'
      if (!f.optionB?.trim()) e.optionB = 'Vui lòng nhập phương án B.'
      if (!f.correctAnswer) e.correctAnswer = 'Vui lòng chọn đáp án đúng.'
    }

    setErrors(e)
    if (Object.keys(e).length) return
    setBusy(true)

    try {
      await api.saveExercise(ex?.id ?? null, {
        ...f,
        // Nếu là trắc nghiệm thì không cần sampleCode
        sampleCode: isMcq ? '' : f.sampleCode,
      })
      toast('success', 'Đã lưu bài tập.')
      onSaved()
    } catch (er) {
      if (er instanceof ApiError && er.errors) {
        setErrors(Object.fromEntries(Object.entries(er.errors).map(([k, v]) => [k, v[0]])))
      }
      toast('error', errText(er))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal
      title={ex ? 'Chỉnh sửa bài tập' : 'Thêm bài tập'}
      wide
      onRequestClose={tryClose}
      footer={<><Button onClick={tryClose} disabled={busy}>Hủy</Button><Button variant="primary" loading={busy} onClick={save}>Lưu</Button></>}
    >
      <div className="space-y-4">
        {/* Chuyển loại bài tập */}
        <div className="flex items-center gap-2 rounded-xl bg-slate-100 p-1 dark:bg-slate-800">
          <button
            type="button"
            onClick={() => set('exerciseType', 1)}
            className={`flex-1 rounded-lg py-1.5 text-xs font-semibold transition-all ${
              isMcq
                ? 'bg-white text-indigo-600 shadow-sm dark:bg-slate-900 dark:text-indigo-400'
                : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
            }`}
          >
            Trắc nghiệm (4 lựa chọn A, B, C, D)
          </button>
          <button
            type="button"
            onClick={() => set('exerciseType', 2)}
            className={`flex-1 rounded-lg py-1.5 text-xs font-semibold transition-all ${
              !isMcq
                ? 'bg-white text-indigo-600 shadow-sm dark:bg-slate-900 dark:text-indigo-400'
                : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
            }`}
          >
            Tự luận / Viết mã nguồn
          </button>
        </div>

        <Field label="Tiêu đề" required error={errors.title}>
          <input autoFocus className={inputCls} placeholder="Ví dụ: Câu hỏi về thuật toán sắp xếp" value={f.title} onChange={e => set('title', e.target.value)} />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Mức độ nhận thức">
            <select className={inputCls} value={f.difficulty} onChange={e => set('difficulty', Number(e.target.value))}>
              {Object.entries(DIFFICULTIES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </Field>
          <Field label="Ngôn ngữ lập trình (nếu có)">
            <select className={inputCls} value={f.language ?? ''} onChange={e => set('language', e.target.value || null)}>
              <option value="">— Không —</option>
              {lookups!.languages.map(l => <option key={l}>{l}</option>)}
            </select>
          </Field>
        </div>

        <CategoryPicker grade={f.gradeLevelId} topic={f.topicId} lesson={f.lessonId} errors={errors} onChange={v => setF(p => ({ ...p, ...v }))} />

        <Field label="Đề bài câu hỏi" required error={errors.statement}>
          <textarea rows={4} className={inputCls} placeholder="Nhập nội dung câu hỏi hoặc đề bài..." value={f.statement} onChange={e => set('statement', e.target.value)} />
        </Field>

        {/* 4 Phương án Trắc nghiệm */}
        {isMcq ? (
          <div className="space-y-3 rounded-xl border border-indigo-100 bg-indigo-50/30 p-3.5 dark:border-indigo-900/40 dark:bg-indigo-950/20">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-indigo-700 dark:text-indigo-300">
                4 Phương án lựa chọn (Chọn tròn để đánh dấu Đáp án đúng)
              </span>
              {errors.correctAnswer && <span className="text-xs text-rose-500">{errors.correctAnswer}</span>}
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {(['A', 'B', 'C', 'D'] as const).map(key => {
                const optKey = `option${key}` as const
                const isCorrect = (f.correctAnswer || '').toUpperCase() === key
                const err = errors[optKey]

                return (
                  <div
                    key={key}
                    onClick={() => set('correctAnswer', key)}
                    className={`relative flex items-center gap-2.5 rounded-lg border p-2 transition-all cursor-pointer ${
                      isCorrect
                        ? 'border-emerald-500 bg-emerald-50/80 shadow-sm dark:border-emerald-500/80 dark:bg-emerald-950/40'
                        : 'border-slate-200 bg-white hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); set('correctAnswer', key) }}
                      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold transition-transform active:scale-90 ${
                        isCorrect
                          ? 'bg-emerald-600 text-white shadow'
                          : 'bg-slate-200 text-slate-700 hover:bg-slate-300 dark:bg-slate-800 dark:text-slate-300'
                      }`}
                      title={isCorrect ? 'Đáp án đúng' : 'Nhấn để chọn làm đáp án đúng'}
                    >
                      {isCorrect ? <CheckCircle2 className="h-4 w-4" /> : key}
                    </button>

                    <input
                      className="w-full bg-transparent text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none dark:text-slate-100 dark:placeholder:text-slate-600"
                      placeholder={`Nội dung phương án ${key}...`}
                      value={(f[optKey] as string) ?? ''}
                      onChange={e => set(optKey, e.target.value)}
                      onClick={e => e.stopPropagation()}
                    />
                    {err && <span className="absolute -bottom-4 left-2 text-[10px] text-rose-500">{err}</span>}
                  </div>
                )
              })}
            </div>
          </div>
        ) : (
          <Field label="Mã nguồn mẫu">
            <CodeEditor value={f.sampleCode} onChange={v => set('sampleCode', v)} rows={8} />
          </Field>
        )}

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Gợi ý">
            <textarea rows={2} className={inputCls} placeholder="Gợi ý phương pháp giải..." value={f.hint} onChange={e => set('hint', e.target.value)} />
          </Field>
          <Field label="Lời giải / Giải thích chi tiết">
            <textarea rows={2} className={inputCls} placeholder="Giải thích vì sao đáp án đúng..." value={f.solution} onChange={e => set('solution', e.target.value)} />
          </Field>
        </div>

        <Field label="Thẻ phân loại">
          <TagInput value={f.tags} onChange={v => set('tags', v)} />
        </Field>
      </div>
    </Modal>
  )
}
